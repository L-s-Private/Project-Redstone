package com.projectredstone.action;

import com.projectredstone.bridge.ActionRequest;
import net.minecraft.ChatFormatting;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.EntitySpawnReason;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.EntityTypes;
import net.minecraft.world.entity.item.PrimedTnt;

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

    public static void execute(MinecraftServer server, ActionRequest request) {
        List<ServerPlayer> players = server.getPlayerList().getPlayers();
        if (players.isEmpty()) {
            return;
        }
        // シングルプレイでは最初のプレイヤーが配信者本人
        ServerPlayer player = players.get(0);
        ServerLevel level = (ServerLevel) player.level();

        switch (request.type()) {
            case TNT -> spawnTnt(level, player, request.count());
            case MOB -> spawnMobs(level, player, MOBS.get(request.mob()), request.count());
            case FILL_START -> FillGameManager.start(player, request);
            case FILL_STOP -> FillGameManager.stop(server);
            case FILL_EXPAND -> FillGameManager.resize(request.count());
            case FILL_SHRINK -> FillGameManager.resize(-request.count());
            case FILL_HELP -> FillGameManager.help(request.count());
            case FILL_SET -> FillGameManager.setFillPercent(request.percent());
            case MESSAGE, PING -> {
            }
        }
        announce(player, request);
    }

    /** 埋め立て中は枠の真上から落とし、枠の中のブロックだけを壊す。そうでなければプレイヤーの周りに出す。 */
    private static void spawnTnt(ServerLevel level, ServerPlayer player, int count) {
        RandomSource random = level.getRandom();
        List<double[]> inFrame = FillGameManager.tntPositions(count);
        for (int i = 0; i < count; i++) {
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
            level.addFreshEntity(tnt);
            if (inFrame != null) {
                FillGameManager.trackTnt(tnt);
            }
        }
    }

    private static void spawnMobs(ServerLevel level, ServerPlayer player, EntityType<?> type, int count) {
        RandomSource random = level.getRandom();
        for (int i = 0; i < count; i++) {
            BlockPos pos = player.blockPosition().offset(random.nextInt(SPREAD * 2 + 1) - SPREAD, 0, random.nextInt(SPREAD * 2 + 1) - SPREAD);
            type.spawn(level, pos, EntitySpawnReason.EVENT);
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
            case FILL_START, FILL_STOP, MESSAGE, PING -> "";
        };
    }
}
