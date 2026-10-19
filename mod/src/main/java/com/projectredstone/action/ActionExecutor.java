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
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;

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
            "silverfish", EntityTypes.SILVERFISH);

    private static final Map<String, String> MOB_NAMES = Map.of(
            "zombie", "ゾンビ",
            "skeleton", "スケルトン",
            "creeper", "クリーパー",
            "spider", "クモ",
            "witch", "ウィッチ",
            "silverfish", "シルバーフィッシュ");

    private static final Map<String, Block> BURY_BLOCKS = Map.of(
            "sand", Blocks.SAND,
            "gravel", Blocks.GRAVEL);

    /** 点火から爆発までの時間（tick）。配信で見せる間を取るため、既定の80より少し短くする。 */
    private static final int TNT_FUSE_TICKS = 60;
    private static final int SPREAD = 3;
    /** 打ち上げの初速。約20ブロック上がる。 */
    private static final double LAUNCH_SPEED = 2.0;

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
            case BURY -> bury(level, player, BURY_BLOCKS.get(request.block()), request.count());
            case LIGHTNING -> strikeLightning(level, player, request.count());
            case LAUNCH -> launch(player);
            case HEAL -> heal(player);
            case MESSAGE, PING -> {
            }
        }
        announce(player, request);
    }

    private static void spawnTnt(ServerLevel level, ServerPlayer player, int count) {
        RandomSource random = level.getRandom();
        for (int i = 0; i < count; i++) {
            double x = player.getX() + (random.nextDouble() * 2 - 1) * SPREAD;
            double z = player.getZ() + (random.nextDouble() * 2 - 1) * SPREAD;
            PrimedTnt tnt = new PrimedTnt(level, x, player.getY() + 1, z, null);
            tnt.setFuse(TNT_FUSE_TICKS + random.nextInt(20));
            level.addFreshEntity(tnt);
        }
    }

    private static void spawnMobs(ServerLevel level, ServerPlayer player, EntityType<?> type, int count) {
        RandomSource random = level.getRandom();
        for (int i = 0; i < count; i++) {
            BlockPos pos = player.blockPosition().offset(random.nextInt(SPREAD * 2 + 1) - SPREAD, 0, random.nextInt(SPREAD * 2 + 1) - SPREAD);
            type.spawn(level, pos, EntitySpawnReason.EVENT);
        }
    }

    /** 近くに雷を落とす。プレイヤーの真上には落とさない（即死を避ける）。 */
    private static void strikeLightning(ServerLevel level, ServerPlayer player, int count) {
        RandomSource random = level.getRandom();
        for (int i = 0; i < count; i++) {
            int dx = (random.nextBoolean() ? 1 : -1) * (2 + random.nextInt(SPREAD));
            int dz = random.nextInt(SPREAD * 2 + 1) - SPREAD;
            EntityTypes.LIGHTNING_BOLT.spawn(level, player.blockPosition().offset(dx, 0, dz), EntitySpawnReason.EVENT);
        }
    }

    /** 真上に打ち上げる。落下ダメージは受ける。 */
    private static void launch(ServerPlayer player) {
        player.setDeltaMovement(player.getDeltaMovement().add(0, LAUNCH_SPEED, 0));
        // 速度の変更をクライアントに送らせる
        player.hurtMarked = true;
    }

    /** 体力と満腹度を全回復する（視聴者が助けるための妨害）。 */
    private static void heal(ServerPlayer player) {
        player.setHealth(player.getMaxHealth());
        player.getFoodData().setFoodLevel(20);
    }

    /** 頭上の3x3に砂などを layers 段置く。重力で落ちてプレイヤーが埋まる。空気のマスにだけ置く。 */
    private static void bury(ServerLevel level, ServerPlayer player, Block block, int layers) {
        BlockPos base = player.blockPosition().above(3);
        for (int dy = 0; dy < layers; dy++) {
            for (int dx = -1; dx <= 1; dx++) {
                for (int dz = -1; dz <= 1; dz++) {
                    BlockPos pos = base.offset(dx, dy, dz);
                    if (level.getBlockState(pos).isAir()) {
                        level.setBlockAndUpdate(pos, block.defaultBlockState());
                    }
                }
            }
        }
    }

    private static void announce(ServerPlayer player, ActionRequest request) {
        if (request.type() == ActionRequest.Type.PING) {
            return;
        }
        String body = request.label().isEmpty() ? defaultLabel(request) : request.label();
        String text = request.from().isEmpty() ? body : request.from() + "さん: " + body;
        player.sendSystemMessage(Component.literal(text).withStyle(ChatFormatting.GOLD), true);
    }

    private static String defaultLabel(ActionRequest request) {
        return switch (request.type()) {
            case TNT -> "TNT ×" + request.count();
            case MOB -> MOB_NAMES.get(request.mob()) + " ×" + request.count();
            case BURY -> "埋め立て ×" + request.count();
            case LIGHTNING -> "雷 ×" + request.count();
            case LAUNCH -> "打ち上げ！";
            case HEAL -> "全回復！";
            case MESSAGE, PING -> "";
        };
    }
}
