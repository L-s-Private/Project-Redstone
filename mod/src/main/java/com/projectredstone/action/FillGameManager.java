package com.projectredstone.action;

import com.projectredstone.bridge.ActionRequest;
import com.projectredstone.game.FillGame;
import com.projectredstone.game.SoundCue;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Holder;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.network.chat.Component;
import net.minecraft.ChatFormatting;
import net.minecraft.network.protocol.game.ClientboundClearTitlesPacket;
import net.minecraft.network.protocol.game.ClientboundSetSubtitleTextPacket;
import net.minecraft.network.protocol.game.ClientboundSetTitlesAnimationPacket;
import net.minecraft.network.protocol.game.ClientboundSetTitleTextPacket;
import net.minecraft.resources.Identifier;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerBossEvent;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.BossEvent;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.ai.attributes.Attribute;
import net.minecraft.world.entity.ai.attributes.AttributeInstance;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.item.ItemEntity;
import net.minecraft.world.entity.monster.Creeper;
import net.minecraft.world.entity.item.PrimedTnt;
import net.minecraft.world.entity.player.Inventory;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.GameType;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.Vec3;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.UUID;

/**
 * 埋め立てモードを Minecraft の上で動かす。
 * 枠は空中（天空）に作り、プレイヤーを中へ移す。落ちたら枠の上に戻す。進み具合はボスバーに出す。
 * 埋めるブロックは減らない（いつも64個にしておく）。TNT は枠を壊さず、中のブロックだけを消す（アイテムも落とさない）。
 * 枠より上にはブロックを置かせず、枠（壁と床）は壊させない。TNT もモブも枠の中に出し、クリーパーの爆発も枠を壊さない。ラウンドをクリアするたびに枠と中を最初に戻す。
 * モブは地上に出し、枠の外に出たり埋まったりしたら枠の中の地上に戻す。手に持つブロックと置かれるブロックは別にでき、置いた直後に差し替える。
 * モブに攻撃される設定なら、クリエイティブのプレイヤーを埋め立て中だけサバイバル（飛べる・おなかは減らない）にする。
 * 時間で解ける妨害（逮捕・操作禁止・夜）もここで数える。逮捕は枠の横の牢屋に入れ、操作禁止はその場から動けなくする（どちらもブロックに手が届かない）。
 * やられて生き返ったら、枠の上に戻す。
 * 「モブに攻撃される」で始めたプレイヤーは、埋め立て中だけサバイバルにして浮かせ、モブからの攻撃でだけダメージを受ける（TNT・落下などでは受けない。おなかも減らない）。
 * 秒数（カウントダウン・逮捕・操作禁止）は、ボスバーではなく画面の真ん中に出す。
 * status() と running() 以外はサーバースレッドから呼ぶこと。
 */
public final class FillGameManager {

    /** 0.5 秒（10 tick）ごとに数え直す */
    private static final int CHECK_INTERVAL_TICKS = 20 / FillGame.CHECKS_PER_SECOND;

    // ブロックは ID（minecraft:glass など）で探す。26.x では色付きブロックの定数名が変わっているため。
    // 選べる ID は ActionRequest.ALLOWED_WALLS / ALLOWED_BLOCKS で確認済み

    private static final Random RANDOM = new Random();

    /** TNT が中のブロックを消す半径（バニラの TNT とだいたい同じ） */
    private static final double BLAST_RADIUS = 3.0;
    /** 見た目と音、プレイヤーへのダメージ用の爆発の強さ（バニラの TNT と同じ） */
    private static final float BLAST_POWER = 4.0f;
    /** クリーパーの爆発（バニラの強さ3に合わせて、TNT より少し小さく） */
    private static final float CREEPER_POWER = 3.0f;
    private static final double CREEPER_BLAST_RADIUS = 2.5;
    /** 雷が落ちた所で壊す半径（TNT より小さく） */
    private static final double LIGHTNING_BLAST_RADIUS = 1.5;
    private static final int STACK = 64;

    /** クライアント側（置けるかどうかの判定）からも読むので volatile */
    private static volatile FillGame game;
    private static LevelWorld world;
    private static ServerBossEvent bar;
    private static int ticks;
    /** 手に持たせるブロック（減らない）。置かれるブロック（world.filler）と違えば、置いた直後に差し替える */
    private static ItemStack fillerStack = ItemStack.EMPTY;
    private static Block handBlock;
    /** 手に持つブロックを置いたかもしれない場所。tick の終わりに置かれるブロックへ差し替える */
    private static final List<BlockPos> placedPositions = new ArrayList<>();
    /** 枠に落とした TNT。爆発の直前に、枠を壊さない爆発へ差し替える */
    private static final List<PrimedTnt> trackedTnt = new ArrayList<>();
    /** 枠に出したモブ。次のラウンドに進むときに消す */
    private static final List<Entity> trackedMobs = new ArrayList<>();
    /** 効果音のために、前の確認のときの状態を覚えておく */
    private static FillGame.Status cueStatus;
    /** 枠に出したモブが消える tick */
    private static final Map<Entity, Long> mobExpiresAt = new HashMap<>();
    /** 枠に出したモブが消えるまでの tick（0 なら消えない） */
    private static long mobLifetimeTicks;
    /** 牢屋は枠のいちばん上から何マス上に作るか（TNT が落ちてくる所より上。ガラスの床から枠を見下ろせる） */
    private static final int JAIL_ABOVE_TOP = 8;
    /** ブロックを置く間隔（tick）。0 なら変えない。クライアント側（RedstoneClient）から読む */
    private static volatile int placeDelayTicks;
    /** ブロックを壊す間隔（tick）。-1 なら変えない。クライアント側（RedstoneClient）から読む */
    private static volatile int breakDelayTicks = -1;
    /** 届く距離・壊す速さを元に戻すため、変える前の値を覚えておく */
    private static final Map<UUID, Double> originalReach = new HashMap<>();
    private static final Map<UUID, Double> originalBreakSpeed = new HashMap<>();
    /** モブに攻撃されるよう、サバイバルにしたプレイヤーの元のゲームモード（終えたら戻す） */
    private static final Map<UUID, GameType> originalGameModes = new HashMap<>();
    /** 埋め立て中の届く距離（逮捕・操作禁止が終わったらこれに戻す） */
    private static double gameReach;
    /** サーバーの tick 数（時間で解ける妨害に使う） */
    private static long serverTicks;
    /** 逮捕中のプレイヤーと、解ける tick */
    private static final Map<UUID, Long> jailedUntil = new HashMap<>();
    /** 牢屋のブロック（解けたら消す） */
    private static final List<BlockPos> jailBlocks = new ArrayList<>();
    private static BlockPos jailCell;
    /** 操作禁止中のプレイヤー: 止める場所と、解ける tick */
    private record Frozen(Vec3 pos, long until) {
    }
    private static final Map<UUID, Frozen> frozen = new HashMap<>();
    /** 夜にしている間: 解ける tick（0 なら夜にしていない）と、戻す時刻 */
    private static long nightUntil;
    private static long timeBeforeNight;

    /** 画面の真ん中に出している秒数（プレイヤーごと）と、送った tick */
    private static final Map<UUID, String> centerShown = new HashMap<>();
    private static final Map<UUID, Long> centerSentAt = new HashMap<>();
    /** 「ラウンドクリア！」などを出している間は、秒数で上書きしない */
    private static long centerHoldUntil;

    /** アプリへの応答用（通信スレッドから読む） */
    private static volatile FillGame.Status lastStatus;

    private FillGameManager() {
    }

    public static boolean running() {
        return lastStatus != null;
    }

    public static FillGame.Status status() {
        return lastStatus;
    }

    public static int placeDelayTicks() {
        return placeDelayTicks;
    }

    public static int breakDelayTicks() {
        return breakDelayTicks;
    }

    /** 埋め立て中で、ここが枠（壁と床）なら true（壊させない）。クライアント側からも呼ぶ */
    public static boolean isFrame(BlockPos pos) {
        FillGame current = game;
        return current != null && current.isFrame(pos.getX(), pos.getY(), pos.getZ());
    }

    /** プレイヤーの真上の空中に枠を作り、中へ移す */
    public static void start(ServerPlayer player, ActionRequest request) {
        stop(player.level().getServer());
        ServerLevel level = (ServerLevel) player.level();
        Block filler = blockById(request.block(), Blocks.AMETHYST_BLOCK);
        handBlock = blockById(request.handBlock(), filler);
        world = new LevelWorld(level, blockById(request.wall(), Blocks.GLASS), filler);

        // 枠（床の下の1段と、高さぶん）がワールドの高さに収まるようにする
        int height = Math.max(FillGame.MIN_HEIGHT, Math.min(FillGame.MAX_HEIGHT, request.height()));
        int floorY = Math.max(level.getMinY() + 1, Math.min(level.getMaxY() - height - 1, request.skyY()));
        BlockPos feet = player.blockPosition();
        game = FillGame.create(world, feet.getX(), floorY, feet.getZ(), request.width(), height, request.countdown(), request.rounds());

        moveIntoFrame(player);
        cueStatus = game.status();
        fillerStack = new ItemStack(handBlock.asItem(), STACK);
        refillBlocks(player);
        gameReach = request.reach();
        mobLifetimeTicks = request.mobLifetime() * 20L;
        setAttribute(player, Attributes.BLOCK_INTERACTION_RANGE, request.reach(), originalReach);
        breakDelayTicks = request.breakDelayTicks();
        if (breakDelayTicks >= 0) {
            setAttribute(player, Attributes.BLOCK_BREAK_SPEED, ActionRequest.INSTANT_BREAK_SPEED, originalBreakSpeed);
        }
        placeDelayTicks = request.placeDelayTicks();
        // 埋め立て中の印をプレイヤーに付けておく（マイクラが急に閉じても、次に入ったときに元に戻せるように。印はセーブされる）
        player.addTag(PLAYING_TAG);
        if (request.mobsAttack() && player.gameMode() != GameType.SPECTATOR) {
            // クリエイティブでもサバイバルでも、モブの攻撃でだけダメージを受け、浮けるようにする
            originalGameModes.put(player.getUUID(), player.gameMode());
            player.addTag(MODE_TAG_PREFIX + player.gameMode().getName());
            player.setGameMode(GameType.SURVIVAL);
            keepSurvivalComfortable(player);
            startFlying(player);
        }

        bar = new ServerBossEvent(UUID.randomUUID(), Component.literal("埋め立て"), BossEvent.BossBarColor.YELLOW, BossEvent.BossBarOverlay.PROGRESS);
        bar.addPlayer(player);
        update();
    }

    /** ゲームを終える。置いたブロックはそのまま。届く距離と壊す速さは元に戻す。逮捕中なら牢屋から出す */
    public static void stop(MinecraftServer server) {
        if (bar != null) {
            bar.removeAllPlayers();
        }
        removeJail();
        jailedUntil.clear();
        if (server != null) {
            for (ServerPlayer player : server.getPlayerList().getPlayers()) {
                if (centerShown.containsKey(player.getUUID())) {
                    player.connection.send(new ClientboundClearTitlesPacket(true));
                }
            }
        }
        centerShown.clear();
        centerSentAt.clear();
        if (server != null) {
            for (ServerPlayer player : server.getPlayerList().getPlayers()) {
                restoreAttribute(player, Attributes.BLOCK_INTERACTION_RANGE, originalReach);
                restoreAttribute(player, Attributes.BLOCK_BREAK_SPEED, originalBreakSpeed);
                GameType original = originalGameModes.get(player.getUUID());
                if (original != null) {
                    restoreGameMode(player, original);
                }
                removeGameTags(player);
            }
        }
        originalGameModes.clear();
        originalReach.clear();
        originalBreakSpeed.clear();
        trackedTnt.clear();
        trackedMobs.clear();
        mobExpiresAt.clear();
        fillerStack = ItemStack.EMPTY;
        handBlock = null;
        placedPositions.clear();
        placeDelayTicks = 0;
        breakDelayTicks = -1;
        game = null;
        world = null;
        bar = null;
        lastStatus = null;
    }

    /** ワールドを閉じたとき（stop のあと）: 埋め立て中でなくても使える妨害（操作禁止・夜）の状態も消す */
    public static void reset() {
        frozen.clear();
        nightUntil = 0;
        centerHoldUntil = 0;
        cueStatus = null;
    }

    /**
     * 全妨害ストップ（TNT とモブは ActionExecutor が消したあと）: 逮捕・操作禁止を解き、夜を元の時刻に戻す。
     * 埋め立ては続け、逮捕していたプレイヤーは枠に戻す
     */
    public static void stopEffects(MinecraftServer server) {
        trackedTnt.clear();
        trackedMobs.clear();
        mobExpiresAt.clear();
        if (nightUntil > 0) {
            nightUntil = 0;
            WorldSettings.run(server, "time set " + Math.floorMod(timeBeforeNight, 24000L));
        }
        Set<UUID> jailed = new HashSet<>(jailedUntil.keySet());
        jailedUntil.clear();
        frozen.clear();
        removeJail();
        for (ServerPlayer player : server.getPlayerList().getPlayers()) {
            applyReach(player);
            if (jailed.contains(player.getUUID()) && game != null && player.level() == world.level()) {
                moveIntoFrame(player);
            }
        }
    }

    public static void resize(int delta) {
        if (game == null) {
            return;
        }
        game.resize(world, delta);
        update();
    }

    public static int help(int count) {
        if (game == null) {
            return 0;
        }
        int placed = game.help(world, count, RANDOM);
        update();
        return placed;
    }

    /** デバッグ用: 中を percent% まで一気に埋める（0 なら空にする） */
    public static void setFillPercent(int percent) {
        if (game == null) {
            return;
        }
        game.setFillPercent(world, percent);
        update();
    }

    /** 枠に落とした TNT を覚えておく（爆発を枠を壊さないものに差し替えるため） */
    public static void trackTnt(PrimedTnt tnt) {
        trackedTnt.add(tnt);
    }

    /**
     * 枠に出しておけるモブの数。ギフトが続いて増えすぎるとマイクラが重くなるので、超えたら古いものから消す
     */
    private static final int MAX_MOBS = 60;
    /** 枠に落としておける（まだ爆発していない）TNT の数。超えた分は出さない */
    public static final int MAX_TNT = 80;

    /** まだ TNT を落とせるか（多すぎると重くなるため） */
    public static boolean canDropTnt() {
        trackedTnt.removeIf(Entity::isRemoved);
        return trackedTnt.size() < MAX_TNT;
    }

    /** 枠に出したモブを覚えておく（次のラウンドで消すため） */
    public static void trackMob(Entity mob) {
        trackedMobs.removeIf(Entity::isRemoved);
        while (trackedMobs.size() >= MAX_MOBS) {
            Entity oldest = trackedMobs.remove(0);
            mobExpiresAt.remove(oldest);
            world.level().sendParticles(ParticleTypes.POOF, oldest.getX(), oldest.getY() + oldest.getBbHeight() / 2, oldest.getZ(), 12, 0.3, 0.4, 0.3, 0.02);
            oldest.discard();
        }
        trackedMobs.add(mob);
        if (mobLifetimeTicks > 0) {
            mobExpiresAt.put(mob, serverTicks + mobLifetimeTicks);
        }
    }

    /** 決めた時間がたったモブを、煙を出して消す（ずっと残ると倒しきるまで埋められないため） */
    private static void removeExpiredMobs() {
        for (var it = mobExpiresAt.entrySet().iterator(); it.hasNext(); ) {
            var entry = it.next();
            Entity mob = entry.getKey();
            if (mob.isRemoved()) {
                it.remove();
            } else if (serverTicks >= entry.getValue()) {
                Sounds.mobVanished(mob);
                world.level().sendParticles(ParticleTypes.POOF, mob.getX(), mob.getY() + mob.getBbHeight() / 2, mob.getZ(), 12, 0.3, 0.4, 0.3, 0.02);
                mob.discard();
                it.remove();
            }
        }
    }

    /** 埋め立て中なら、TNT を落とす位置（枠の真上）を返す。そうでなければ null */
    public static List<double[]> tntPositions(int count) {
        if (game == null) {
            return null;
        }
        return game.dropPositions(count, RANDOM);
    }

    /** 埋め立て中なら、モブを出す位置（枠の中）を返す。そうでなければ null */
    public static List<double[]> mobPositions(int count) {
        if (game == null) {
            return null;
        }
        return game.spawnPositions(world, count, RANDOM);
    }

    /**
     * ブロックを置こうとしたとき（サーバー側）。手に持つブロックと置かれるブロックが違えば、置かれる場所を覚えておく。
     * 置かれるのはクリックした場所（草などの置き換えられるもの）か、その隣のどちらか
     */
    public static void rememberPlacement(Level level, BlockHitResult hit) {
        if (game == null || level.isClientSide() || level != world.level() || handBlock == world.filler()) {
            return;
        }
        placedPositions.add(hit.getBlockPos());
        placedPositions.add(hit.getBlockPos().relative(hit.getDirection()));
    }

    // ---- 時間で解ける妨害 ----

    /** 逮捕: 枠の真上の空中に牢屋（床はガラス）を作って入れ、seconds 秒たったら枠に戻す。続けて来たら時間を延ばす。入れられなかったら false */
    public static boolean jail(ServerPlayer player, int seconds) {
        if (game == null || player.level() != world.level()) {
            return false;
        }
        long base = Math.max(serverTicks, jailedUntil.getOrDefault(player.getUUID(), 0L));
        jailedUntil.put(player.getUUID(), base + seconds * 20L);
        if (jailCell == null) {
            jailCell = new BlockPos(game.centerX(), game.topY() + JAIL_ABOVE_TOP, game.centerZ());
            buildJail(jailCell);
        }
        player.teleportTo(jailCell.getX() + 0.5, jailCell.getY(), jailCell.getZ() + 0.5);
        player.resetFallDistance();
        applyReach(player);
        return true;
    }

    /** 操作禁止: seconds 秒、その場から動けず、ブロックにも手が届かない。埋め立て中でなくても使える */
    public static void freeze(ServerPlayer player, int seconds) {
        Frozen current = frozen.get(player.getUUID());
        long base = current == null ? serverTicks : Math.max(serverTicks, current.until());
        Vec3 pos = current == null ? player.position() : current.pos();
        frozen.put(player.getUUID(), new Frozen(pos, base + seconds * 20L));
        applyReach(player);
    }

    /** 夜にする: seconds 秒たったら、夜にする前の時刻に戻す。夜の間にまた来たら延ばす */
    public static void night(MinecraftServer server, int seconds) {
        if (nightUntil == 0) {
            timeBeforeNight = server.overworld().getOverworldClockTime();
            WorldSettings.run(server, "time set midnight");
            nightUntil = serverTicks;
        }
        nightUntil += seconds * 20L;
    }

    /**
     * ダメージを受けるか。「モブに攻撃される」で始めたプレイヤーは、埋め立て中はモブからの攻撃でだけ受ける。
     * ほかのプレイヤー・ほかのモブはそのまま
     */
    public static boolean allowDamage(LivingEntity entity, DamageSource source) {
        if (game == null || !(entity instanceof ServerPlayer player) || !originalGameModes.containsKey(player.getUUID())) {
            return true;
        }
        return source.getEntity() instanceof Mob;
    }

    /** 埋め立て中、枠と同じワールドでは、枠の中にしかブロックを置けない。クライアント側からも呼ぶ */
    public static boolean canPlace(Level level, BlockHitResult hit) {
        FillGame current = game;
        if (current == null || world == null || level.dimension() != world.level().dimension()) {
            return true;
        }
        BlockPos clicked = hit.getBlockPos();
        BlockPos target = level.getBlockState(clicked).canBeReplaced() ? clicked : clicked.relative(hit.getDirection());
        return current.isInterior(target.getX(), target.getY(), target.getZ());
    }

    /** 画面の真ん中に秒数を出す（0.5秒ごと）。逮捕・操作禁止中ならその残り秒数が先 */
    private static void showCenter(MinecraftServer server) {
        String[] gameText = game != null && serverTicks >= centerHoldUntil ? FillGame.centerText(game.status()) : null;
        for (ServerPlayer player : server.getPlayerList().getPlayers()) {
            UUID id = player.getUUID();
            String[] text = null;
            ChatFormatting color = ChatFormatting.WHITE;
            Long jailEnd = jailedUntil.get(id);
            Frozen lock = frozen.get(id);
            if (jailEnd != null) {
                text = new String[] {"", "逮捕中　あと " + secondsUntil(jailEnd) + " 秒"};
                color = ChatFormatting.GOLD;
            } else if (lock != null) {
                text = new String[] {"", "操作禁止　あと " + secondsUntil(lock.until()) + " 秒"};
                color = ChatFormatting.GOLD;
            } else if (gameText != null && player.level() == world.level()) {
                text = gameText;
                color = game.phase() == FillGame.Phase.COUNTDOWN ? ChatFormatting.GREEN
                        : gameText[0].isEmpty() ? ChatFormatting.WHITE : ChatFormatting.RED;
            }
            String key = text == null ? "" : text[0] + "\n" + text[1];
            String shown = centerShown.getOrDefault(id, "");
            if (key.isEmpty()) {
                if (!shown.isEmpty() && serverTicks >= centerHoldUntil) {
                    player.connection.send(new ClientboundClearTitlesPacket(true));
                    centerShown.remove(id);
                }
                continue;
            }
            // 変わったときと、消えないよう1秒ごとに送り直す
            if (key.equals(shown) && serverTicks - centerSentAt.getOrDefault(id, 0L) < 20) {
                continue;
            }
            player.connection.send(new ClientboundSetTitlesAnimationPacket(0, 40, 5));
            player.connection.send(new ClientboundSetSubtitleTextPacket(Component.literal(text[1]).withStyle(color)));
            player.connection.send(new ClientboundSetTitleTextPacket(Component.literal(text[0]).withStyle(color, ChatFormatting.BOLD)));
            centerShown.put(id, key);
            centerSentAt.put(id, serverTicks);
        }
    }

    private static long secondsUntil(long tick) {
        return Math.max(0, (tick - serverTicks + 19) / 20);
    }

    /** 「ラウンドクリア！」などを、3秒間ふつうの出方で出す */
    private static void showEventTitle(MinecraftServer server, String title, String subtitle) {
        centerHoldUntil = serverTicks + 60;
        centerShown.clear();
        for (ServerPlayer player : server.getPlayerList().getPlayers()) {
            player.connection.send(new ClientboundSetTitlesAnimationPacket(10, 40, 10));
            player.connection.send(new ClientboundSetSubtitleTextPacket(Component.literal(subtitle)));
            player.connection.send(new ClientboundSetTitleTextPacket(Component.literal(title)));
        }
    }

    private static void tickTimedEffects(MinecraftServer server) {
        if (nightUntil > 0 && serverTicks >= nightUntil) {
            nightUntil = 0;
            WorldSettings.run(server, "time set " + Math.floorMod(timeBeforeNight, 24000L));
        }
        for (ServerPlayer player : server.getPlayerList().getPlayers()) {
            UUID id = player.getUUID();
            Frozen lock = frozen.get(id);
            if (lock != null) {
                if (serverTicks >= lock.until()) {
                    frozen.remove(id);
                    applyReach(player);
                    Sounds.released(player, false);
                } else if (player.position().distanceToSqr(lock.pos()) > 0.0025) {
                    player.teleportTo(lock.pos().x, lock.pos().y, lock.pos().z);
                    player.resetFallDistance();
                }
            }
            Long until = jailedUntil.get(id);
            if (until != null && serverTicks >= until) {
                jailedUntil.remove(id);
                applyReach(player);
                Sounds.released(player, true);
                if (game != null && player.level() == world.level()) {
                    moveIntoFrame(player);
                }
            }
        }
        if (jailedUntil.isEmpty() && jailCell != null) {
            removeJail();
        }
        if (serverTicks % 10 == 0) {
            showCenter(server);
        }
    }

    /** 逮捕・操作禁止の間は手が届かない（0）。解けたら埋め立ての届く距離に戻す（埋め立て中でなければ変えない） */
    private static void applyReach(ServerPlayer player) {
        AttributeInstance reach = player.getAttribute(Attributes.BLOCK_INTERACTION_RANGE);
        if (reach == null) {
            return;
        }
        boolean locked = jailedUntil.containsKey(player.getUUID()) || frozen.containsKey(player.getUUID());
        if (game != null) {
            reach.setBaseValue(locked ? 0 : gameReach);
        } else if (locked) {
            originalReach.putIfAbsent(player.getUUID(), reach.getBaseValue());
            reach.setBaseValue(0);
        } else {
            restoreAttribute(player, Attributes.BLOCK_INTERACTION_RANGE, originalReach);
            originalReach.remove(player.getUUID());
        }
    }

    /** 1マスの牢屋: 床はガラス（下の枠が見える）、天井は石レンガ、まわりは鉄格子 */
    private static void buildJail(BlockPos cell) {
        ServerLevel level = world.level();
        for (int dx = -1; dx <= 1; dx++) {
            for (int dz = -1; dz <= 1; dz++) {
                setJailBlock(level, cell.offset(dx, -1, dz), Blocks.GLASS);
                setJailBlock(level, cell.offset(dx, 2, dz), Blocks.STONE_BRICKS);
                if (dx != 0 || dz != 0) {
                    setJailBlock(level, cell.offset(dx, 0, dz), Blocks.IRON_BARS);
                    setJailBlock(level, cell.offset(dx, 1, dz), Blocks.IRON_BARS);
                }
            }
        }
    }

    private static void setJailBlock(ServerLevel level, BlockPos pos, Block block) {
        level.setBlockAndUpdate(pos, block.defaultBlockState());
        jailBlocks.add(pos);
    }

    private static void removeJail() {
        if (world != null) {
            for (BlockPos pos : jailBlocks) {
                world.level().setBlockAndUpdate(pos, Blocks.AIR.defaultBlockState());
            }
        }
        jailBlocks.clear();
        jailCell = null;
    }

    /** やられて生き返ったとき: 埋め立て中なら、枠の上に戻す（逮捕中なら牢屋へ） */
    public static void onRespawn(ServerPlayer player) {
        if (game == null) {
            return;
        }
        if (jailedUntil.containsKey(player.getUUID()) && jailCell != null) {
            player.teleportTo(world.level(), jailCell.getX() + 0.5, jailCell.getY(), jailCell.getZ() + 0.5, Set.of(), player.getYRot(),
                    player.getXRot(), false);
        } else {
            moveIntoFrame(player);
            Sounds.returned(player);
        }
        refillBlocks(player);
        applyReach(player);
    }

    // ---- 埋め立ての妨害・お助け ----

    /** 一段埋め: 空いているいちばん下の段から layers 段を埋める */
    public static void fillLayers(int layers) {
        if (game != null) {
            game.fillLayers(world, layers);
            update();
        }
    }

    /** 全消し: 枠の中を全部空にする */
    public static void clearAll() {
        if (game != null) {
            game.setFillPercent(world, 0);
            update();
        }
    }

    /** 枠を rows 段高くする */
    public static void raise(int rows) {
        if (game != null) {
            // 牢屋があれば、枠が伸びてぶつからないよう、いったん消して上に作り直す（先に消さないと、伸びた壁まで消してしまう）
            boolean hadJail = jailCell != null;
            removeJail();
            game.raise(world, rows);
            if (hadJail) {
                jailCell = new BlockPos(game.centerX(), game.topY() + JAIL_ABOVE_TOP, game.centerZ());
                buildJail(jailCell);
                for (UUID id : jailedUntil.keySet()) {
                    ServerPlayer player = world.level().getServer().getPlayerList().getPlayer(id);
                    if (player != null) {
                        player.teleportTo(jailCell.getX() + 0.5, jailCell.getY(), jailCell.getZ() + 0.5);
                    }
                }
            }
            update();
        }
    }

    /** 埋め立て中なら、雷を落とす位置（枠の中の地上）を返す。そうでなければ null */
    public static List<double[]> lightningPositions(int count) {
        return game == null ? null : game.spawnPositions(world, count, RANDOM);
    }

    /** 雷が落ちた所のブロックを少し壊す（枠の中だけ） */
    public static void lightningBlast(double x, double y, double z) {
        if (game != null) {
            game.blast(world, x, y - 0.5, z, LIGHTNING_BLAST_RADIUS);
            update();
        }
    }

    public static void onServerTick(MinecraftServer server) {
        serverTicks++;
        Sounds.tick(server);
        tickTimedEffects(server);
        if (game == null) {
            return;
        }
        replacePlacedBlocks();
        explodeTrackedTnt();
        for (ServerPlayer player : server.getPlayerList().getPlayers()) {
            if (player.level() == world.level()) {
                refillBlocks(player);
            }
        }
        if (++ticks % CHECK_INTERVAL_TICKS != 0) {
            return;
        }
        removeDroppedItems();
        removeExpiredMobs();
        trackedMobs.removeIf(Entity::isRemoved);
        keepMobsInside();
        for (ServerPlayer player : server.getPlayerList().getPlayers()) {
            // 途中で入り直したプレイヤーにもボスバーを見せる
            bar.addPlayer(player);
            // 枠から落ちたら（やられて別の場所に戻ったときも）、枠の上に戻す
            if (player.level() == world.level() && game.hasFallen(player.getY())) {
                moveIntoFrame(player);
                Sounds.returned(player);
            }
            if (originalGameModes.containsKey(player.getUUID())) {
                keepSurvivalComfortable(player);
            }
        }
        switch (game.tick(world)) {
            case ROUND_CLEARED -> onRoundCleared(server);
            case NONE -> {
                SoundCue cue = SoundCue.between(cueStatus, game.status());
                if (cue != null) {
                    Sounds.forCue(server, cue);
                }
            }
        }
        cueStatus = game.status();
        update();
    }

    /** ラウンドをクリアしたとき。最後でなければ、残っている TNT とモブを消して、プレイヤーを枠に戻す（枠と中は FillGame が戻す） */
    private static void onRoundCleared(MinecraftServer server) {
        FillGame.Status status = game.status();
        boolean last = game.phase() == FillGame.Phase.CLEARED;
        Sounds.roundCleared(server, last);
        showEventTitle(server, last ? "全ラウンドクリア！" : "ラウンドクリア！", status.round() + " / " + status.rounds());
        if (last) {
            return;
        }
        resetEntities(server);
    }

    /** 残っている TNT とモブを消して、プレイヤーを枠に戻す */
    private static void resetEntities(MinecraftServer server) {
        for (PrimedTnt tnt : trackedTnt) {
            tnt.discard();
        }
        trackedTnt.clear();
        for (Entity mob : trackedMobs) {
            mob.discard();
        }
        trackedMobs.clear();
        for (ServerPlayer player : server.getPlayerList().getPlayers()) {
            if (player.level() == world.level()) {
                moveIntoFrame(player);
            }
        }
    }

    /**
     * 爆発する直前（残り1tick）の TNT を消して、ブロックを壊さない爆発（見た目・音・ダメージだけ）に差し替える。
     * ブロックは FillGame.blast で枠の中のものだけを消す。setBlock で消すのでアイテムは落ちない。
     */
    private static void explodeTrackedTnt() {
        boolean changed = false;
        for (var it = trackedTnt.iterator(); it.hasNext(); ) {
            PrimedTnt tnt = it.next();
            if (tnt.isRemoved()) {
                it.remove();
            } else if (tnt.getFuse() <= 1) {
                it.remove();
                double x = tnt.getX();
                double y = tnt.getY();
                double z = tnt.getZ();
                tnt.discard();
                world.level().explode(null, x, y, z, BLAST_POWER, Level.ExplosionInteraction.NONE);
                game.blast(world, x, y, z, BLAST_RADIUS);
                changed = true;
            }
        }
        // 枠に出したクリーパーも、爆発の直前に枠を壊さない爆発へ差し替える
        for (var it = trackedMobs.iterator(); it.hasNext(); ) {
            if (it.next() instanceof Creeper creeper && !creeper.isRemoved() && creeper.getSwelling(1f) >= 1f) {
                it.remove();
                double x = creeper.getX();
                double y = creeper.getY();
                double z = creeper.getZ();
                creeper.discard();
                world.level().explode(null, x, y, z, CREEPER_POWER, Level.ExplosionInteraction.NONE);
                game.blast(world, x, y, z, CREEPER_BLAST_RADIUS);
                changed = true;
            }
        }
        if (changed) {
            update();
        }
    }

    /** サバイバルにしたプレイヤー: 飛べるようにし、おなかは減らないようにする */
    private static void keepSurvivalComfortable(ServerPlayer player) {
        if (player.gameMode() != GameType.SURVIVAL) {
            return;
        }
        if (!player.getAbilities().mayfly || !player.getAbilities().instabuild) {
            player.getAbilities().mayfly = true;
            // 置いてもブロックが減らない・一瞬で壊せる（クリエイティブと同じ）。手元のマイクラも減らさないので、持ち物の表示がずれない
            player.getAbilities().instabuild = true;
            player.onUpdateAbilities();
        }
        player.getFoodData().setFoodLevel(20);
        player.getFoodData().setSaturation(5f);
    }

    /** 置いた手に持つブロックを、置かれるブロックに差し替える（同じ tick のうちなので、ほとんど見えない） */
    private static void replacePlacedBlocks() {
        if (placedPositions.isEmpty()) {
            return;
        }
        for (BlockPos pos : placedPositions) {
            if (world.level().getBlockState(pos).is(handBlock)) {
                world.level().setBlockAndUpdate(pos, world.filler().defaultBlockState());
            }
        }
        placedPositions.clear();
    }

    /** 枠に出したモブが、枠の外に出た・落ちた・ブロックに埋まったら、枠の中の地上に戻す */
    private static void keepMobsInside() {
        for (Entity mob : trackedMobs) {
            if (mob.level() != world.level()) {
                continue;
            }
            boolean outside = !game.isInsideColumn(mob.getX(), mob.getZ()) || game.hasFallen(mob.getY());
            if (outside || game.isBuried(world, mob.getX(), mob.getY(), mob.getZ(), mob.getBbHeight())) {
                double[] back = game.returnPosition(world, mob.getX(), mob.getZ());
                mob.teleportTo(back[0], back[1], back[2]);
                mob.resetFallDistance();
            }
        }
    }

    /** 埋めるブロックを減らさない: 手に持っていれば64個に戻し、持ち物になければ64個渡す */
    private static void refillBlocks(ServerPlayer player) {
        if (fillerStack.isEmpty()) {
            return;
        }
        Inventory inventory = player.getInventory();
        ItemStack held = inventory.getSelectedItem();
        if (ItemStack.isSameItem(held, fillerStack)) {
            if (held.getCount() < STACK) {
                held.setCount(STACK);
            }
        } else if (!inventory.contains(fillerStack)) {
            inventory.add(fillerStack.copy());
        }
    }

    /** 枠のまわりに落ちたアイテム（クリーパーの爆発や、手で壊したブロック）を消す */
    private static void removeDroppedItems() {
        int[] a = game.area();
        AABB box = new AABB(a[0] - 2, a[1] - 2, a[2] - 2, a[3] + 3, a[4] + 1, a[5] + 3);
        for (ItemEntity item : world.level().getEntitiesOfClass(ItemEntity.class, box)) {
            item.discard();
        }
    }

    private static Block blockById(String id, Block fallback) {
        Block block = BuiltInRegistries.BLOCK.getValue(Identifier.fromNamespaceAndPath("minecraft", id));
        return block == null || block == Blocks.AIR ? fallback : block;
    }

    /** 枠の真ん中の、いちばん上に立たせる（埋めたブロックの上に乗る）。別のディメンションにいても連れてくる */
    private static void moveIntoFrame(ServerPlayer player) {
        double x = game.centerX() + 0.5;
        double y = game.topY() + 0.5;
        double z = game.centerZ() + 0.5;
        if (player.level() == world.level()) {
            player.teleportTo(x, y, z);
        } else {
            player.teleportTo(world.level(), x, y, z, Set.of(), player.getYRot(), player.getXRot(), false);
        }
        player.resetFallDistance();
        startFlying(player);
    }

    /** 埋め立て中のプレイヤーに付ける印。MODE_TAG_PREFIX + 元のゲームモード名（creative など）も付ける */
    private static final String PLAYING_TAG = "project_redstone_playing";
    private static final String MODE_TAG_PREFIX = "project_redstone_mode_";

    /** 元のゲームモードに戻す。サバイバルに戻すときは、飛べるのも止める（同じモードだと setGameMode では戻らないため） */
    private static void restoreGameMode(ServerPlayer player, GameType original) {
        player.setGameMode(original);
        original.updatePlayerAbilities(player.getAbilities());
        player.onUpdateAbilities();
    }

    private static void removeGameTags(ServerPlayer player) {
        for (String tag : List.copyOf(player.entityTags())) {
            if (tag.equals(PLAYING_TAG) || tag.startsWith(MODE_TAG_PREFIX)) {
                player.removeTag(tag);
            }
        }
    }

    /**
     * ワールドに入ったとき: 埋め立て中にマイクラが閉じていたら（印が残っていたら）、ゲームモード・届く距離・壊す速さを元に戻す
     */
    public static void onJoin(ServerPlayer player) {
        if (game != null || !player.entityTags().contains(PLAYING_TAG)) {
            return;
        }
        for (String tag : player.entityTags()) {
            if (tag.startsWith(MODE_TAG_PREFIX)) {
                restoreGameMode(player, GameType.byName(tag.substring(MODE_TAG_PREFIX.length()), GameType.SURVIVAL));
            }
        }
        for (Holder<Attribute> type : List.of(Attributes.BLOCK_INTERACTION_RANGE, Attributes.BLOCK_BREAK_SPEED)) {
            AttributeInstance attribute = player.getAttribute(type);
            if (attribute != null) {
                attribute.setBaseValue(type.value().getDefaultValue());
            }
        }
        removeGameTags(player);
    }

    /** モブの攻撃でだけダメージを受けるプレイヤーは、クリエイティブのように浮かせておく（ゲームモードを変えると飛ぶのが止まるため） */
    private static void startFlying(ServerPlayer player) {
        if (!originalGameModes.containsKey(player.getUUID()) || player.gameMode() != GameType.SURVIVAL) {
            return;
        }
        player.getAbilities().mayfly = true;
        player.getAbilities().instabuild = true;
        player.getAbilities().flying = true;
        player.onUpdateAbilities();
    }

    private static void setAttribute(ServerPlayer player, Holder<Attribute> type, double value, Map<UUID, Double> originals) {
        AttributeInstance attribute = player.getAttribute(type);
        if (attribute == null) {
            return;
        }
        originals.putIfAbsent(player.getUUID(), attribute.getBaseValue());
        attribute.setBaseValue(value);
    }

    private static void restoreAttribute(ServerPlayer player, Holder<Attribute> type, Map<UUID, Double> originals) {
        Double original = originals.get(player.getUUID());
        AttributeInstance attribute = player.getAttribute(type);
        if (original != null && attribute != null) {
            attribute.setBaseValue(original);
        }
    }

    private static void update() {
        FillGame.Status status = game.status();
        lastStatus = status;
        String round = "【" + status.round() + " / " + status.rounds() + "】 ";
        switch (status.phase()) {
            case FILLING -> {
                bar.setName(Component.literal(round + "埋め立て " + status.percent() + "%（" + status.filled() + " / " + status.total() + "）"));
                bar.setColor(BossEvent.BossBarColor.YELLOW);
                bar.setProgress(status.filled() / (float) status.total());
            }
            case COUNTDOWN -> {
                bar.setName(Component.literal(round + "完成！ 守りきればクリア"));
                bar.setColor(BossEvent.BossBarColor.GREEN);
                bar.setProgress(status.countdownSeconds() == 0 ? 1f : status.countdownSecondsLeft() / (float) status.countdownSeconds());
            }
            case CLEARED -> {
                bar.setName(Component.literal(round + "全ラウンドクリア！"));
                bar.setColor(BossEvent.BossBarColor.GREEN);
                bar.setProgress(1f);
            }
        }
    }

    /**
     * 枠の中は 0.5 秒ごとに全部（最大 41×41×30 マス）調べ直すので、調べるときは位置を使い回す（毎回作らない）。
     * 書き換えるときは、マイクラが位置を覚えておけるよう新しく作る。サーバースレッドからだけ使う
     */
    private record LevelWorld(ServerLevel level, Block wall, Block filler, BlockPos.MutableBlockPos cursor) implements FillGame.World {
        LevelWorld(ServerLevel level, Block wall, Block filler) {
            this(level, wall, filler, new BlockPos.MutableBlockPos());
        }

        private BlockState stateAt(int x, int y, int z) {
            return level.getBlockState(cursor.set(x, y, z));
        }

        @Override
        public boolean isFilled(int x, int y, int z) {
            BlockState state = stateAt(x, y, z);
            return !state.isAir() && state.getFluidState().isEmpty();
        }

        @Override
        public void setWall(int x, int y, int z) {
            if (!stateAt(x, y, z).is(wall)) {
                level.setBlockAndUpdate(new BlockPos(x, y, z), wall.defaultBlockState());
            }
        }

        @Override
        public void setAir(int x, int y, int z) {
            if (!stateAt(x, y, z).isAir()) {
                level.setBlockAndUpdate(new BlockPos(x, y, z), Blocks.AIR.defaultBlockState());
            }
        }

        @Override
        public void setFiller(int x, int y, int z) {
            level.setBlockAndUpdate(new BlockPos(x, y, z), filler.defaultBlockState());
        }
    }
}
