package com.staticarc.action;

import com.staticarc.bridge.ActionRequest;
import net.minecraft.ChatFormatting;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntitySpawnReason;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.EntityTypes;
import net.minecraft.world.entity.LightningBolt;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.item.PrimedTnt;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** 妨害をワールドに出す。必ずサーバースレッドから呼ぶこと。 */
public final class ActionExecutor {

    // 26.2 以降、バニラのエンティティ種別は EntityType ではなく EntityTypes にある
    private static final Map<String, EntityType<?>> MOBS = Map.of(
            "zombie", EntityTypes.ZOMBIE,
            "skeleton", EntityTypes.SKELETON,
            "creeper", EntityTypes.CREEPER,
            "spider", EntityTypes.SPIDER,
            "witch", EntityTypes.WITCH,
            "silverfish", EntityTypes.SILVERFISH,
            "pig", EntityTypes.PIG);

    private static final Map<String, String> MOB_NAMES = Map.of(
            "zombie", "ゾンビ",
            "skeleton", "スケルトン",
            "creeper", "クリーパー",
            "spider", "クモ",
            "witch", "ウィッチ",
            "silverfish", "シルバーフィッシュ",
            "pig", "ブタ");

    /** 点火から爆発までの時間（tick）。配信で見せる間を取るため、既定の80より少し短くする。 */
    private static final int TNT_FUSE_TICKS = 60;
    private static final int SPREAD = 3;

    private ActionExecutor() {
    }

    /**
     * 妨害を出す。
     * @return ゲームの中に何も起きなかったときは、その理由（アプリに「失敗」として返す）。出せたら null
     */
    public static String execute(MinecraftServer server, ActionRequest request) {
        List<ServerPlayer> players = server.getPlayerList().getPlayers();
        if (players.isEmpty()) {
            return "ワールドにプレイヤーがいません";
        }
        // シングルプレイでは最初のプレイヤーが配信者本人
        ServerPlayer player = players.get(0);
        ServerLevel level = (ServerLevel) player.level();

        switch (request.type()) {
            case TNT -> {
                if (spawnTnt(level, player, request.count(), request.terrain()) == 0) {
                    return "枠の中の TNT が多すぎるので出しませんでした（爆発していない TNT は" + FillGameManager.MAX_TNT + "個まで）";
                }
            }
            case MOB -> {
                if (spawnMobs(level, player, MOBS.get(request.mob()), request.count(), request.terrain()) == 0) {
                    return "モブを出せませんでした";
                }
            }
            case FILL_START -> {
                if (MiningManager.active()) {
                    return "採掘チャレンジ中です。先にチャレンジを終えてください";
                }
                FillGameManager.start(player, request);
            }
            case FILL_STOP -> FillGameManager.stop(server);
            case FILL_EXPAND -> FillGameManager.resize(request.count());
            case FILL_SHRINK -> FillGameManager.resize(-request.count());
            case FILL_HELP -> FillGameManager.help(request.count());
            case FILL_SET -> FillGameManager.setFillPercent(request.percent());
            case WORLD -> WorldSettings.apply(server, request);
            case JAIL -> {
                if (!FillGameManager.jail(player, request.count())) {
                    return "枠と別のワールドにいるので、逮捕できませんでした";
                }
            }
            case FREEZE -> FillGameManager.freeze(player, request.count());
            case FILL_LAYER -> FillGameManager.fillLayers(request.count());
            case FILL_CLEAR -> FillGameManager.clearAll();
            case LIGHTNING -> strikeLightning(level, player, request.count());
            case LEVITATE -> {
                player.addEffect(new MobEffectInstance(MobEffects.LEVITATION, request.count() * 20, 0), null);
                MiningManager.noteLevitation();
            }
            case NIGHT -> FillGameManager.night(server, request.count());
            case FILL_RAISE -> FillGameManager.raise(request.count());
            case STOP_ALL -> {
                stopAll(server);
                return null;
            }
            // 採掘チャレンジの操作（音と画面の文字は MiningManager が出す）
            case MINING_START -> {
                return MiningManager.start(server, player, request);
            }
            case MINING_PAUSE -> {
                return MiningManager.pause();
            }
            case MINING_RESUME -> {
                return MiningManager.resume();
            }
            case MINING_ABORT -> {
                return MiningManager.abort(server);
            }
            case MINING_TEST -> {
                return MiningManager.test(player, request);
            }
            case MINING_BONUS_DROP -> {
                String problem = MiningManager.bonusDrop(player, request.count());
                if (problem != null) {
                    return problem;
                }
            }
            case MESSAGE, PING -> {
            }
        }
        Sounds.forAction(server, request.type());
        announce(player, request);
        return null;
    }

    /**
     * 埋め立て中は枠の真上から落とし、枠の中のブロックだけを壊す。そうでなければプレイヤーの周りに出す。
     * @return 実際に出した数
     */
    private static int spawnTnt(ServerLevel level, ServerPlayer player, int count, boolean terrain) {
        RandomSource random = level.getRandom();
        List<double[]> inFrame = FillGameManager.tntPositions(count);
        int spawned = 0;
        for (int i = 0; i < count; i++) {
            // 枠にまだ爆発していない TNT が多すぎるときは、それ以上落とさない（重くなるため）
            if (inFrame != null && !FillGameManager.canDropTnt()) {
                break;
            }
            double x;
            double y;
            double z;
            if (inFrame != null) {
                x = inFrame.get(i)[0];
                y = inFrame.get(i)[1];
                z = inFrame.get(i)[2];
            } else {
                x = player.getX() + (random.nextDouble() * 2 - 1) * SPREAD;
                y = player.getY() + 1;
                z = player.getZ() + (random.nextDouble() * 2 - 1) * SPREAD;
            }
            PrimedTnt tnt = new PrimedTnt(level, x, y, z, null);
            tnt.setFuse(TNT_FUSE_TICKS + random.nextInt(20));
            tnt.addTag(SPAWNED_TAG);
            MiningManager.tagSpawned(tnt);
            level.addFreshEntity(tnt);
            spawned++;
            if (inFrame != null) {
                FillGameManager.trackTnt(tnt);
            } else if (!terrain) {
                // 採掘チャレンジ: 地形を壊さない爆発にする
                SafeBlasts.track(tnt);
            }
        }
        return spawned;
    }

    /**
     * 全妨害ストップ: 起きている妨害をすべて止める。ギフトで出した TNT とモブを消し、逮捕・操作禁止・浮遊を解き、夜を元の時刻に戻す。
     * 埋め立てそのものは続ける
     */
    private static void stopAll(MinecraftServer server) {
        for (ServerLevel level : server.getAllLevels()) {
            List<Entity> spawned = new ArrayList<>();
            for (Entity entity : level.getAllEntities()) {
                if (entity.entityTags().contains(SPAWNED_TAG)) {
                    spawned.add(entity);
                }
            }
            spawned.forEach(Entity::discard);
        }
        for (ServerPlayer player : server.getPlayerList().getPlayers()) {
            player.removeEffect(MobEffects.LEVITATION);
        }
        FillGameManager.stopEffects(server);
        Sounds.reset();
        SafeBlasts.reset();
    }

    /** ギフトで出したモブと TNT に付ける印（モブは昼でも燃えないようにする。mixin/MobSunBurnMixin。全妨害ストップで消す目印にもする） */
    public static final String SPAWNED_TAG = "static_arc";

    /**
     * 埋め立て中は枠の中（埋めたブロックの上）に出す。そうでなければプレイヤーの周りに出す。
     * @return 実際に出した数
     */
    private static int spawnMobs(ServerLevel level, ServerPlayer player, EntityType<?> type, int count, boolean terrain) {
        RandomSource random = level.getRandom();
        List<double[]> inFrame = FillGameManager.mobPositions(count);
        int spawned = 0;
        for (int i = 0; i < count; i++) {
            BlockPos pos = inFrame != null
                    ? BlockPos.containing(inFrame.get(i)[0], inFrame.get(i)[1], inFrame.get(i)[2])
                    : player.blockPosition().offset(random.nextInt(SPREAD * 2 + 1) - SPREAD, 0, random.nextInt(SPREAD * 2 + 1) - SPREAD);
            Entity mob = type.spawn(level, pos, EntitySpawnReason.EVENT);
            if (mob != null) {
                mob.addTag(SPAWNED_TAG);
                MiningManager.tagSpawned(mob);
                spawned++;
                if (inFrame == null && !terrain) {
                    // 採掘チャレンジ: クリーパーの爆発も地形を壊さないようにする
                    SafeBlasts.track(mob);
                }
            }
            if (mob != null && inFrame != null) {
                FillGameManager.trackMob(mob);
            }
        }
        return spawned;
    }

    /** 雷。埋め立て中は枠の中の地上に落とし、落ちた所のブロックを少し壊す。見た目だけの雷なので火事にはならない */
    private static void strikeLightning(ServerLevel level, ServerPlayer player, int count) {
        RandomSource random = level.getRandom();
        List<double[]> inFrame = FillGameManager.lightningPositions(count);
        for (int i = 0; i < count; i++) {
            double x = inFrame != null ? inFrame.get(i)[0] : player.getX() + (random.nextDouble() * 2 - 1) * SPREAD;
            double y = inFrame != null ? inFrame.get(i)[1] : player.getY();
            double z = inFrame != null ? inFrame.get(i)[2] : player.getZ() + (random.nextDouble() * 2 - 1) * SPREAD;
            LightningBolt bolt = new LightningBolt(EntityTypes.LIGHTNING_BOLT, level);
            bolt.setVisualOnly(true);
            bolt.snapTo(x, y, z);
            level.addFreshEntity(bolt);
            if (inFrame != null) {
                FillGameManager.lightningBlast(x, y, z);
            }
        }
    }

    private static void announce(ServerPlayer player, ActionRequest request) {
        String body = request.label().isEmpty() ? defaultLabel(request) : request.label();
        if (body.isEmpty()) {
            return;
        }
        String text = request.from().isEmpty() ? body : request.from() + "さん: " + body;
        player.sendSystemMessage(Component.literal(text).withStyle(ChatFormatting.GOLD), true);
    }

    private static String defaultLabel(ActionRequest request) {
        return switch (request.type()) {
            case TNT -> "TNT ×" + request.count();
            case MOB -> MOB_NAMES.get(request.mob()) + " ×" + request.count();
            case FILL_EXPAND -> "枠が " + request.count() + " マス広がった！";
            case FILL_SHRINK -> "枠が " + request.count() + " マス縮んだ！";
            case FILL_HELP -> "お助けブロック ×" + request.count();
            case FILL_SET -> "（テスト）" + request.percent() + "% まで埋めました";
            case JAIL -> "逮捕！ " + request.count() + "秒";
            case FREEZE -> "操作禁止 " + request.count() + "秒";
            case FILL_LAYER -> "一段埋め ×" + request.count();
            case FILL_CLEAR -> "全消し！";
            case LIGHTNING -> "雷 ×" + request.count();
            case LEVITATE -> "浮遊 " + request.count() + "秒";
            case NIGHT -> "夜になった！ " + request.count() + "秒";
            case FILL_RAISE -> "枠が " + request.count() + " 段高くなった！";
            case MINING_BONUS_DROP -> "収集支援 ×" + request.count();
            case FILL_START, FILL_STOP, MESSAGE, PING, WORLD, STOP_ALL, MINING_START, MINING_PAUSE, MINING_RESUME, MINING_ABORT,
                 MINING_TEST -> "";
        };
    }
}
