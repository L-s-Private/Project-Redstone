package com.projectredstone.action;

import com.projectredstone.bridge.ActionRequest;
import net.minecraft.block.Block;
import net.minecraft.block.Blocks;
import net.minecraft.entity.EntityType;
import net.minecraft.entity.SpawnReason;
import net.minecraft.entity.TntEntity;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.text.Text;
import net.minecraft.util.Formatting;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.random.Random;

import java.util.List;
import java.util.Map;

/** 妨害をワールドに出す。必ずサーバースレッドから呼ぶこと。 */
public final class ActionExecutor {

    private static final Map<String, EntityType<?>> MOBS = Map.of(
            "zombie", EntityType.ZOMBIE,
            "skeleton", EntityType.SKELETON,
            "creeper", EntityType.CREEPER,
            "spider", EntityType.SPIDER,
            "witch", EntityType.WITCH,
            "silverfish", EntityType.SILVERFISH);

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

    private ActionExecutor() {
    }

    public static void execute(MinecraftServer server, ActionRequest request) {
        List<ServerPlayerEntity> players = server.getPlayerManager().getPlayerList();
        if (players.isEmpty()) {
            return;
        }
        // シングルプレイでは最初のプレイヤーが配信者本人
        ServerPlayerEntity player = players.get(0);
        ServerWorld world = player.getServerWorld();

        switch (request.type()) {
            case TNT -> spawnTnt(world, player, request.count());
            case MOB -> spawnMobs(world, player, MOBS.get(request.mob()), request.count());
            case BURY -> bury(world, player, BURY_BLOCKS.get(request.block()), request.count());
            case MESSAGE, PING -> {
            }
        }
        announce(player, request);
    }

    private static void spawnTnt(ServerWorld world, ServerPlayerEntity player, int count) {
        Random random = world.getRandom();
        for (int i = 0; i < count; i++) {
            double x = player.getX() + (random.nextDouble() * 2 - 1) * SPREAD;
            double z = player.getZ() + (random.nextDouble() * 2 - 1) * SPREAD;
            TntEntity tnt = new TntEntity(world, x, player.getY() + 1, z, null);
            tnt.setFuse(TNT_FUSE_TICKS + random.nextInt(20));
            world.spawnEntity(tnt);
        }
    }

    private static void spawnMobs(ServerWorld world, ServerPlayerEntity player, EntityType<?> type, int count) {
        Random random = world.getRandom();
        for (int i = 0; i < count; i++) {
            BlockPos pos = player.getBlockPos().add(random.nextInt(SPREAD * 2 + 1) - SPREAD, 0, random.nextInt(SPREAD * 2 + 1) - SPREAD);
            type.spawn(world, pos, SpawnReason.EVENT);
        }
    }

    /** 頭上の3x3に砂などを layers 段置く。重力で落ちてプレイヤーが埋まる。空気のマスにだけ置く。 */
    private static void bury(ServerWorld world, ServerPlayerEntity player, Block block, int layers) {
        BlockPos base = player.getBlockPos().up(3);
        for (int dy = 0; dy < layers; dy++) {
            for (int dx = -1; dx <= 1; dx++) {
                for (int dz = -1; dz <= 1; dz++) {
                    BlockPos pos = base.add(dx, dy, dz);
                    if (world.getBlockState(pos).isAir()) {
                        world.setBlockState(pos, block.getDefaultState());
                    }
                }
            }
        }
    }

    private static void announce(ServerPlayerEntity player, ActionRequest request) {
        if (request.type() == ActionRequest.Type.PING) {
            return;
        }
        String body = request.label().isEmpty() ? defaultLabel(request) : request.label();
        String text = request.from().isEmpty() ? body : request.from() + "さん: " + body;
        player.sendMessage(Text.literal(text).formatted(Formatting.GOLD), true);
    }

    private static String defaultLabel(ActionRequest request) {
        return switch (request.type()) {
            case TNT -> "TNT ×" + request.count();
            case MOB -> MOB_NAMES.get(request.mob()) + " ×" + request.count();
            case BURY -> "埋め立て ×" + request.count();
            case MESSAGE, PING -> "";
        };
    }
}
