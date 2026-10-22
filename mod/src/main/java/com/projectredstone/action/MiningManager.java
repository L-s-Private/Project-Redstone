package com.projectredstone.action;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.projectredstone.bridge.ActionRequest;
import com.projectredstone.game.DropLedger;
import com.projectredstone.game.MiningChallenge;
import net.minecraft.ChatFormatting;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.network.chat.Component;
import net.minecraft.network.protocol.game.ClientboundSetSubtitleTextPacket;
import net.minecraft.network.protocol.game.ClientboundSetTitleTextPacket;
import net.minecraft.network.protocol.game.ClientboundSetTitlesAnimationPacket;
import net.minecraft.resources.Identifier;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerBossEvent;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.BossEvent;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.item.ItemEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.GameType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * 採掘・収集チャレンジを Minecraft の上で動かす（ルールは game/MiningChallenge、数えてよいアイテムの台帳は game/DropLedger）。
 *
 * 進み具合の数え方（ここがいちばん大事）:
 * - プレイヤーがブロックを掘って、Minecraft が実際に落としたアイテム（Block.dropResources の中で出たもの）だけを台帳に入れる（mixin/BlockDropsMixin）
 * - 台帳のアイテムを、挑戦しているプレイヤーが拾ったら、拾えた数だけ数える（mixin/ItemEntityMixin の playerTouch）
 * - かたまりどうしがくっついたら、数えてよい数も移す（ItemEntityMixin の merge）。消えたかたまりは数えない
 * - 始める前から持っていた分・チェスト・クラフト・自分で捨てたもの・モブが落としたものは台帳に入らないので数えない
 *
 * 時間はサーバーの tick で数える（ゲームが止まっている間は減らない）。進み具合と残り時間はボスバーにも出す。
 * 挑戦中に出した TNT・モブには印を付け、終わったら消す（自然に湧いたモブやペットは消さない）。
 * サーバースレッドから呼ぶこと（status() と playerInfo() はアプリとの通信スレッドから読む）。
 */
public final class MiningManager {

    private static final Logger LOGGER = LoggerFactory.getLogger("project-redstone");

    /** 挑戦中に出した TNT・モブの印（終わったら消す）。挑戦ごとの印も付ける（マイクラが落ちたあとに残ったものを見分けるため） */
    public static final String MINING_TAG = "project_redstone_mining";
    private static final String SESSION_TAG_PREFIX = "project_redstone_session_";

    /** 最後の挑戦（終わったものも結果として残す。ワールドを閉じたら中止にして残す） */
    private static MiningChallenge challenge;
    private static UUID playerId;
    private static Item targetItem;
    private static ServerBossEvent bar;
    private static final DropLedger<ItemEntity> ledger = new DropLedger<>();
    /** テスト用に出したアイテム（拾っても進み具合には入れず、拾った数だけ数える） */
    private static final Set<ItemEntity> testDrops = new HashSet<>();
    private static int testPickedUp;
    /** 挑戦中に浮遊を付けたか（終わったら外す。前から付いていたものは外さない） */
    private static boolean gaveLevitation;
    private static String lastError = "";
    private static int ticks;
    /** 今ブロックを掘ってアイテムを落としているプレイヤー（Block.dropResources の間だけ） */
    private static ServerPlayer breaking;
    /** くっつく前の数（ItemEntity.merge の間だけ） */
    private static int mergeSourceBefore;

    /** アプリへの知らせ（通信スレッドから読む。作ったら中身は変えない） */
    private static volatile JsonObject status;
    private static volatile JsonObject player;
    /** このマイクラに無い資源（ふつうは空） */
    private static volatile List<String> unavailable = List.of();

    private MiningManager() {
    }

    public static JsonObject status() {
        return status;
    }

    public static JsonObject playerInfo() {
        return player;
    }

    public static List<String> unavailable() {
        return unavailable;
    }

    /** 挑戦中（カウントダウン・一時停止も含む）。埋め立てと同時には動かさない */
    public static boolean active() {
        MiningChallenge current = challenge;
        return current != null && current.state().active();
    }

    // ---- ワールドを開いた・閉じた ----

    /** ワールドを開いたとき: 前のワールドの挑戦は持ち込まない。このマイクラにある資源を確かめておく */
    public static void onServerStarted() {
        clearSession();
        challenge = null;
        status = null;
        List<String> missing = new ArrayList<>();
        for (String id : MiningChallenge.TARGETS) {
            if (itemById(id) == null) {
                missing.add(id);
            }
        }
        unavailable = List.copyOf(missing);
    }

    /** ワールドを閉じるとき: 挑戦中なら中止にして、結果だけ残す */
    public static void onServerStopping(MinecraftServer server) {
        if (challenge != null && challenge.abort(MiningChallenge.REASON_WORLD_CLOSED)) {
            LOGGER.info("[mining] aborted: reason=world_closed session={}", challenge.sessionId());
            end(server);
        }
        clearSession();
        publish();
    }

    // ---- アプリからの操作 ----

    /**
     * 始める（3秒のカウントダウンから）。始める前に、遊べる状態かを全部確かめる
     * @return 始められなかった理由（始めたら null）
     */
    public static String start(MinecraftServer server, ServerPlayer target, ActionRequest request) {
        if (FillGameManager.running()) {
            return "別のゲームモード（埋め立て）が実行中です。先に埋め立てを終えてください";
        }
        if (active()) {
            return "すでに採掘チャレンジ中です。先に今のチャレンジを終えてください";
        }
        if (!target.isAlive()) {
            return "プレイヤーがやられています。生き返ってから始めてください";
        }
        if (target.gameMode() != GameType.SURVIVAL) {
            return "採掘チャレンジはサバイバルモードで開始できます。ゲームモードを変更してから再試行してください";
        }
        Item item = itemById(request.item());
        if (item == null) {
            return "選択中の対象アイテムは現在のMinecraft環境では使えません。別の対象を選んでください";
        }
        MiningChallenge created;
        try {
            created = MiningChallenge.create(UUID.randomUUID().toString(), request.item(), request.targetCount(), request.seconds());
        } catch (IllegalArgumentException e) {
            return e.getMessage();
        }
        // 前の挑戦の名残（台帳・テスト用のアイテム）は新しい挑戦に持ち込まない
        clearSession();
        challenge = created;
        playerId = target.getUUID();
        targetItem = item;
        lastError = "";
        bar = new ServerBossEvent(UUID.randomUUID(), Component.literal("採掘チャレンジ"), BossEvent.BossBarColor.YELLOW, BossEvent.BossBarOverlay.PROGRESS);
        bar.addPlayer(target);
        showTitle(server, String.valueOf(MiningChallenge.COUNTDOWN_SECONDS), "", ChatFormatting.YELLOW);
        Sounds.miningCountdown(server);
        LOGGER.info("[mining] session started: {} item={} target={} seconds={}", created.sessionId(), request.item(), request.targetCount(), request.seconds());
        publish();
        return null;
    }

    /** @return できなかった理由（できたら null） */
    public static String pause() {
        if (challenge == null || !challenge.pause()) {
            return "一時停止できるのはチャレンジ中だけです";
        }
        LOGGER.info("[mining] paused: {}", challenge.sessionId());
        publish();
        return null;
    }

    /** @return できなかった理由（できたら null） */
    public static String resume() {
        if (challenge == null || !challenge.resume()) {
            return "再開できるのは一時停止中だけです";
        }
        LOGGER.info("[mining] resumed: {}", challenge.sessionId());
        publish();
        return null;
    }

    /** 中止（カウントダウン中なら開始の取り消し）。@return できなかった理由（できたら null） */
    public static String abort(MinecraftServer server) {
        if (challenge == null || !challenge.abort(MiningChallenge.REASON_USER)) {
            return "中止できるチャレンジがありません";
        }
        LOGGER.info("[mining] aborted: reason={} progress={} target={}", challenge.failureReason(), challenge.progress(), challenge.targetCount());
        showTitle(server, "チャレンジを中止しました", "", ChatFormatting.GRAY);
        end(server);
        publish();
        return null;
    }

    /**
     * 収集支援: 対象アイテムをプレイヤーの足元に出す（持ち物には直接入れない。拾ったら進み具合に入る）
     * @return 出せなかった理由（出せたら null）
     */
    public static String bonusDrop(ServerPlayer target, int count) {
        if (challenge == null || challenge.state() != MiningChallenge.State.RUNNING) {
            return "採掘チャレンジ中だけ使えます";
        }
        if (!target.getUUID().equals(playerId)) {
            return "挑戦しているプレイヤーがいません";
        }
        if (!safeToDrop(target)) {
            return "足元が危ないので出しませんでした（溶岩・奈落など）";
        }
        int allowed = challenge.reserveSupport(count);
        if (allowed <= 0) {
            return "支援で進められる上限（目標の4分の1）に届いているので出しませんでした";
        }
        if (allowed < count) {
            LOGGER.info("[mining] support capped: requested={} allowed={}", count, allowed);
        }
        ItemEntity drop = dropAt(target, new ItemStack(targetItem, allowed));
        if (drop == null) {
            return "アイテムを出せませんでした";
        }
        ledger.add(drop, MiningChallenge.Source.SUPPORT, allowed);
        publish();
        return null;
    }

    /**
     * テスト用。drop: 数えないテスト用の対象アイテムを1個出す（拾えるかの確認用）/ progress: 進み具合を percent% にする / time: 残り5秒にする
     * @return できなかった理由（できたら null）
     */
    public static String test(ServerPlayer target, ActionRequest request) {
        switch (request.op()) {
            case "drop" -> {
                Item item = targetItem != null ? targetItem : itemById("minecraft:raw_iron");
                ItemEntity drop = item == null ? null : dropAt(target, new ItemStack(item, 1));
                if (drop == null) {
                    return "アイテムを出せませんでした";
                }
                testDrops.add(drop);
            }
            case "progress" -> {
                if (challenge == null || challenge.state() != MiningChallenge.State.RUNNING) {
                    return "チャレンジ中だけ使えます";
                }
                challenge.testSetProgress(challenge.targetCount() * request.percent() / 100);
                afterProgress(target.level().getServer());
            }
            case "time" -> {
                if (challenge == null || (challenge.state() != MiningChallenge.State.RUNNING && challenge.state() != MiningChallenge.State.PAUSED)) {
                    return "チャレンジ中だけ使えます";
                }
                challenge.testSetRemaining(5);
            }
            default -> {
                return "未対応のテストです";
            }
        }
        publish();
        return null;
    }

    // ---- ゲームの中のできごと（mixin・イベントから） ----

    /** ブロックを掘ってアイテムを落とし始めた（Block.dropResources の始め）。挑戦しているプレイヤーが掘ったときだけ覚える */
    public static void beginBlockDrops(Entity breaker) {
        breaking = breaker instanceof ServerPlayer p && p.getUUID().equals(playerId) && running() ? p : null;
    }

    public static void endBlockDrops() {
        breaking = null;
    }

    /** ブロックからアイテムが落ちた。挑戦しているプレイヤーが掘った・対象のアイテムなら台帳に入れる */
    public static void onBlockDrop(Entity entity) {
        if (breaking == null || !running() || !(entity instanceof ItemEntity item)) {
            return;
        }
        ItemStack stack = item.getItem();
        if (stack.is(targetItem)) {
            ledger.add(item, MiningChallenge.Source.MINING, stack.getCount());
        }
    }

    public static void beforeMerge(int sourceCount) {
        mergeSourceBefore = sourceCount;
    }

    /** かたまりがくっついた（source から target へ動いた数だけ、数えてよい数も移す） */
    public static void afterMerge(ItemEntity target, ItemEntity source, int sourceCountAfter) {
        int moved = mergeSourceBefore - sourceCountAfter;
        if (moved > 0) {
            ledger.merge(target, source, moved);
            if (testDrops.contains(source) && source.isRemoved()) {
                testDrops.remove(source);
                testDrops.add(target);
            }
        }
    }

    /** プレイヤーがアイテムを拾った（taken 個）。台帳にあれば、拾えた数だけ数える（挑戦しているプレイヤー・挑戦中だけ） */
    public static void onPickup(ItemEntity item, Player picker, int taken) {
        if (taken <= 0) {
            return;
        }
        if (testDrops.contains(item)) {
            testPickedUp += taken;
            if (item.isRemoved()) {
                testDrops.remove(item);
            }
        }
        if (!ledger.contains(item)) {
            return;
        }
        DropLedger.Credit credit = ledger.pickup(item, taken);
        if (challenge == null || !picker.getUUID().equals(playerId) || challenge.state() != MiningChallenge.State.RUNNING) {
            return;
        }
        int mined = challenge.credit(MiningChallenge.Source.MINING, credit.mined());
        int support = challenge.credit(MiningChallenge.Source.SUPPORT, credit.support());
        if (mined + support > 0) {
            LOGGER.info("[mining] progress credited: item={} mined={} support={} progress={}/{}", challenge.target(), mined, support,
                    challenge.progress(), challenge.targetCount());
            Sounds.miningCredit((ServerPlayer) picker);
            afterProgress(picker.level().getServer());
            publish();
        }
    }

    /** プレイヤーがやられた: 挑戦中なら失敗 */
    public static void onDeath(Entity entity) {
        if (challenge == null || !(entity instanceof ServerPlayer dead) || !dead.getUUID().equals(playerId)) {
            return;
        }
        if (challenge.fail(MiningChallenge.REASON_PLAYER_DIED)) {
            MinecraftServer server = dead.level().getServer();
            LOGGER.info("[mining] failed: reason=player_died progress={} target={}", challenge.progress(), challenge.targetCount());
            showTitle(server, "やられてしまった…", "チャレンジ失敗", ChatFormatting.RED);
            Sounds.miningFailed(server);
            end(server);
            publish();
        }
    }

    /** 浮遊を付けた（挑戦中なら、終わったときに外す） */
    public static void noteLevitation() {
        if (active()) {
            gaveLevitation = true;
        }
    }

    /** 挑戦中に出した TNT・モブに印を付ける（終わったら消す） */
    public static void tagSpawned(Entity entity) {
        if (active()) {
            entity.addTag(MINING_TAG);
            entity.addTag(sessionTag());
        }
    }

    /** エンティティが読み込まれた: 前の挑戦（マイクラが落ちたなど）で出したまま残っている TNT・モブなら消す */
    public static void onEntityLoad(Entity entity) {
        if (entity.entityTags().contains(MINING_TAG) && !(active() && entity.entityTags().contains(sessionTag()))) {
            entity.discard();
        }
    }

    // ---- 毎 tick ----

    public static void tick(MinecraftServer server) {
        // 念のため（dropResources の途中でエラーが起きても、次の tick に持ち越さない）
        breaking = null;
        ticks++;
        if (ticks % 10 == 0) {
            updatePlayerInfo(server);
        }
        if (challenge == null || !challenge.state().active()) {
            return;
        }
        ServerPlayer target = server.getPlayerList().getPlayer(playerId);
        if (target == null) {
            challenge.abort(MiningChallenge.REASON_PLAYER_LEFT);
            LOGGER.info("[mining] aborted: reason=player_left");
            end(server);
            publish();
            return;
        }
        switch (challenge.tick()) {
            case COUNTDOWN_SECOND -> {
                showTitle(server, String.valueOf(challenge.countdownSecondsLeft()), "", ChatFormatting.YELLOW);
                Sounds.miningCountdown(server);
            }
            case STARTED -> {
                LOGGER.info("[mining] countdown finished");
                showTitle(server, "スタート！", itemName().getString() + " を " + challenge.targetCount() + " 個集めよう", ChatFormatting.GREEN);
                Sounds.miningStarted(server);
            }
            case TIMED_OUT -> {
                LOGGER.info("[mining] failed: reason=timeout progress={} target={}", challenge.progress(), challenge.targetCount());
                showTitle(server, "時間切れ！", itemName().getString() + " " + Math.min(challenge.progress(), challenge.targetCount()) + " / "
                        + challenge.targetCount(), ChatFormatting.RED);
                Sounds.miningFailed(server);
                end(server);
            }
            case NONE -> {
                // 残り10秒からは1秒ごとに「ピッ」
                if (challenge.state() == MiningChallenge.State.RUNNING && challenge.remainingTicks() % 20 == 0
                        && challenge.remainingSeconds() <= 10) {
                    Sounds.miningLastSeconds(server, challenge.remainingSeconds());
                }
            }
        }
        // 1秒ごとに、消えたかたまりを台帳から外し、実際の数より多ければ減らす
        if (ticks % 20 == 0) {
            ledger.removeIf(Entity::isRemoved);
            testDrops.removeIf(Entity::isRemoved);
            for (ItemEntity item : ledger.keys()) {
                ledger.clamp(item, item.getItem().is(targetItem) ? item.getItem().getCount() : 0);
            }
        }
        if (ticks % 5 == 0 || !challenge.state().active()) {
            publish();
        }
    }

    // ---- 中のしくみ ----

    private static boolean running() {
        return challenge != null && challenge.state() == MiningChallenge.State.RUNNING;
    }

    /** 進み具合が変わったあと: 目標に届いていたら成功 */
    private static void afterProgress(MinecraftServer server) {
        if (challenge.state() == MiningChallenge.State.SUCCEEDED) {
            LOGGER.info("[mining] completed: progress={} target={}", challenge.progress(), challenge.targetCount());
            showTitle(server, "チャレンジクリア！", itemName().getString() + " " + challenge.targetCount() + " / " + challenge.targetCount(),
                    ChatFormatting.GOLD);
            Sounds.roundCleared(server, true);
            end(server);
        }
    }

    /**
     * 挑戦が終わったときの片付け。ボスバーを消し、台帳を捨て、挑戦中に出した TNT・モブだけを消し、
     * 操作禁止・夜・挑戦中に付けた浮遊を解く。掘ったブロック・拾ったアイテム・自然に湧いたモブはそのまま
     */
    private static void end(MinecraftServer server) {
        if (bar != null) {
            bar.removeAllPlayers();
            bar = null;
        }
        ledger.clear();
        if (server != null) {
            for (ServerLevel level : server.getAllLevels()) {
                List<Entity> spawned = new ArrayList<>();
                for (Entity entity : level.getAllEntities()) {
                    if (entity.entityTags().contains(MINING_TAG)) {
                        spawned.add(entity);
                    }
                }
                spawned.forEach(Entity::discard);
            }
            FillGameManager.stopEffects(server);
            ServerPlayer target = playerId == null ? null : server.getPlayerList().getPlayer(playerId);
            if (target != null && gaveLevitation) {
                target.removeEffect(MobEffects.LEVITATION);
            }
        }
        gaveLevitation = false;
    }

    /** 前の挑戦の名残を捨てる */
    private static void clearSession() {
        if (bar != null) {
            bar.removeAllPlayers();
            bar = null;
        }
        ledger.clear();
        testDrops.clear();
        testPickedUp = 0;
        breaking = null;
        gaveLevitation = false;
    }

    private static String sessionTag() {
        return challenge == null ? SESSION_TAG_PREFIX : SESSION_TAG_PREFIX + challenge.sessionId().substring(0, 8);
    }

    /** 溶岩の中・奈落・水の中では出さない */
    private static boolean safeToDrop(ServerPlayer target) {
        return !target.isInLava() && !target.isInWater() && target.getY() > target.level().getMinY();
    }

    /** プレイヤーの足元に、少しだけ遅れて拾えるアイテムを出す */
    private static ItemEntity dropAt(ServerPlayer target, ItemStack stack) {
        ServerLevel level = (ServerLevel) target.level();
        ItemEntity item = new ItemEntity(level, target.getX(), target.getY() + 0.5, target.getZ(), stack, 0, 0.1, 0);
        item.setPickUpDelay(10);
        return level.addFreshEntity(item) ? item : null;
    }

    private static Item itemById(String id) {
        Identifier key = Identifier.tryParse(id);
        if (key == null || !BuiltInRegistries.ITEM.containsKey(key)) {
            return null;
        }
        return BuiltInRegistries.ITEM.getValue(key);
    }

    private static Component itemName() {
        return targetItem == null ? Component.literal("") : new ItemStack(targetItem).getHoverName();
    }

    private static void showTitle(MinecraftServer server, String title, String subtitle, ChatFormatting color) {
        for (ServerPlayer p : server.getPlayerList().getPlayers()) {
            p.connection.send(new ClientboundSetTitlesAnimationPacket(0, 30, 10));
            p.connection.send(new ClientboundSetSubtitleTextPacket(Component.literal(subtitle)));
            p.connection.send(new ClientboundSetTitleTextPacket(Component.literal(title).withStyle(color, ChatFormatting.BOLD)));
        }
    }

    /** ボスバーとアプリへの知らせを作り直す */
    private static void publish() {
        MiningChallenge c = challenge;
        if (c == null) {
            status = null;
            return;
        }
        if (bar != null) {
            int shown = Math.min(c.progress(), c.targetCount());
            String time = String.format("%02d:%02d", c.remainingSeconds() / 60, c.remainingSeconds() % 60);
            String phase = switch (c.state()) {
                case COUNTDOWN -> "まもなく開始";
                case PAUSED -> "一時停止中";
                default -> "残り " + time;
            };
            bar.setName(Component.literal("採掘チャレンジ　").append(itemName()).append(" " + shown + " / " + c.targetCount() + "　" + phase));
            bar.setProgress(Math.min(1f, shown / (float) c.targetCount()));
            bar.setColor(c.state() == MiningChallenge.State.RUNNING
                    ? (c.remainingSeconds() <= 10 ? BossEvent.BossBarColor.RED : BossEvent.BossBarColor.GREEN)
                    : BossEvent.BossBarColor.YELLOW);
        }
        JsonObject json = new JsonObject();
        json.addProperty("sessionId", c.sessionId());
        json.addProperty("state", c.state().name().toLowerCase());
        json.addProperty("item", c.target());
        json.addProperty("targetCount", c.targetCount());
        json.addProperty("progress", c.progress());
        json.addProperty("mined", c.mined());
        json.addProperty("support", c.support());
        json.addProperty("supportLimit", c.supportLimit());
        json.addProperty("remainingSeconds", c.remainingSeconds());
        json.addProperty("durationSeconds", c.durationSeconds());
        json.addProperty("countdownSecondsLeft", c.countdownSecondsLeft());
        json.addProperty("elapsedSeconds", c.elapsedSeconds());
        if (c.failureReason() != null) {
            json.addProperty("failureReason", c.failureReason());
        }
        json.addProperty("test", c.test());
        json.addProperty("seq", c.seq());
        JsonObject debug = new JsonObject();
        debug.addProperty("eligibleDropEntities", ledger.size());
        debug.addProperty("pendingEligibleItems", ledger.pending());
        debug.addProperty("testPickedUp", testPickedUp);
        debug.addProperty("lastError", lastError);
        json.add("debug", debug);
        status = json;
    }

    /** 始める前の確かめ用: プレイヤーのゲームモードと、生きているか */
    private static void updatePlayerInfo(MinecraftServer server) {
        List<ServerPlayer> players = server.getPlayerList().getPlayers();
        if (players.isEmpty()) {
            player = null;
            return;
        }
        ServerPlayer first = players.get(0);
        JsonObject json = new JsonObject();
        json.addProperty("gameMode", first.gameMode().getName());
        json.addProperty("alive", first.isAlive());
        player = json;
    }

    /** tick の処理でエラーが続いたとき: 挑戦を中止にする（マイクラは止めない） */
    public static void abortOnError(MinecraftServer server, RuntimeException e) {
        lastError = e.getClass().getSimpleName();
        if (challenge != null && challenge.abort(MiningChallenge.REASON_ERROR)) {
            LOGGER.error("[mining] aborted: reason=error", e);
            end(server);
            publish();
        }
    }

    /** 知らせに入れる、このマイクラに無い資源の一覧 */
    public static JsonArray unavailableJson() {
        JsonArray array = new JsonArray();
        unavailable.forEach(array::add);
        return array;
    }
}
