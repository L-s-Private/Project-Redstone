package com.projectredstone.action;

import com.projectredstone.bridge.ActionRequest;
import com.projectredstone.game.FillGame;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.network.protocol.game.ClientboundSetTitleTextPacket;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerBossEvent;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.BossEvent;
import net.minecraft.world.entity.ai.attributes.AttributeInstance;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

/**
 * 埋め立てモードを Minecraft の上で動かす。
 * 枠は空中（天空）に作り、プレイヤーを中へ移す。落ちたら枠の上に戻す。進み具合はボスバーに出す。
 * status() と running() 以外はサーバースレッドから呼ぶこと。
 */
public final class FillGameManager {

    /** 0.5 秒（10 tick）ごとに数え直す */
    private static final int CHECK_INTERVAL_TICKS = 20 / FillGame.CHECKS_PER_SECOND;

    private static final Map<String, Block> WALLS = Map.of(
            "glass", Blocks.GLASS,
            "white_stained_glass", Blocks.WHITE_STAINED_GLASS,
            "light_blue_stained_glass", Blocks.LIGHT_BLUE_STAINED_GLASS,
            "bedrock", Blocks.BEDROCK);

    private static final Map<String, Block> FILL_BLOCKS = Map.of(
            "amethyst_block", Blocks.AMETHYST_BLOCK,
            "diamond_block", Blocks.DIAMOND_BLOCK,
            "emerald_block", Blocks.EMERALD_BLOCK,
            "gold_block", Blocks.GOLD_BLOCK,
            "iron_block", Blocks.IRON_BLOCK,
            "lapis_block", Blocks.LAPIS_BLOCK,
            "redstone_block", Blocks.REDSTONE_BLOCK,
            "quartz_block", Blocks.QUARTZ_BLOCK);

    private static final Random RANDOM = new Random();

    private static FillGame game;
    private static LevelWorld world;
    private static ServerBossEvent bar;
    private static int ticks;
    /** 届く距離を元に戻すため、変える前の値を覚えておく */
    private static final Map<UUID, Double> originalReach = new HashMap<>();
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

    /** プレイヤーの真上の空中に枠を作り、中へ移す */
    public static void start(ServerPlayer player, ActionRequest request) {
        stop(player.level().getServer());
        ServerLevel level = (ServerLevel) player.level();
        Block filler = FILL_BLOCKS.get(request.block());
        world = new LevelWorld(level, WALLS.get(request.wall()), filler);

        // 枠（床の下の1段と、高さぶん）がワールドの高さに収まるようにする
        int height = Math.max(FillGame.MIN_HEIGHT, Math.min(FillGame.MAX_HEIGHT, request.height()));
        int floorY = Math.max(level.getMinY() + 1, Math.min(level.getMaxY() - height - 1, request.skyY()));
        BlockPos feet = player.blockPosition();
        game = FillGame.create(world, feet.getX(), floorY, feet.getZ(), request.width(), height, request.countdown());

        moveIntoFrame(player);
        player.getInventory().add(new ItemStack(filler.asItem(), 64));
        setReach(player, request.reach());

        bar = new ServerBossEvent(UUID.randomUUID(), Component.literal("埋め立て"), BossEvent.BossBarColor.YELLOW, BossEvent.BossBarOverlay.PROGRESS);
        bar.addPlayer(player);
        update();
    }

    /** ゲームを終える。置いたブロックはそのまま。届く距離は元に戻す */
    public static void stop(MinecraftServer server) {
        if (bar != null) {
            bar.removeAllPlayers();
        }
        if (server != null) {
            for (ServerPlayer player : server.getPlayerList().getPlayers()) {
                restoreReach(player);
            }
        }
        originalReach.clear();
        game = null;
        world = null;
        bar = null;
        lastStatus = null;
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

    /** 埋め立て中なら、TNT を落とす位置（枠の真上）を返す。そうでなければ null */
    public static List<double[]> tntPositions(int count) {
        if (game == null || game.phase() == FillGame.Phase.CLEARED) {
            return null;
        }
        return game.dropPositions(count, RANDOM);
    }

    public static void onServerTick(MinecraftServer server) {
        if (game == null || ++ticks % CHECK_INTERVAL_TICKS != 0) {
            return;
        }
        for (ServerPlayer player : server.getPlayerList().getPlayers()) {
            // 途中で入り直したプレイヤーにもボスバーを見せる
            bar.addPlayer(player);
            // 枠から落ちたら、枠の上に戻す
            if (player.level() == world.level() && game.hasFallen(player.getY())) {
                moveIntoFrame(player);
            }
        }
        if (game.tick(world)) {
            for (ServerPlayer player : server.getPlayerList().getPlayers()) {
                player.connection.send(new ClientboundSetTitleTextPacket(Component.literal("埋め立てクリア！")));
            }
        }
        update();
    }

    /** 枠の真ん中の、いちばん上に立たせる（埋めたブロックの上に乗る） */
    private static void moveIntoFrame(ServerPlayer player) {
        player.teleportTo(game.centerX() + 0.5, game.topY() + 0.5, game.centerZ() + 0.5);
        player.resetFallDistance();
    }

    private static void setReach(ServerPlayer player, double reach) {
        AttributeInstance attribute = player.getAttribute(Attributes.BLOCK_INTERACTION_RANGE);
        if (attribute == null) {
            return;
        }
        originalReach.putIfAbsent(player.getUUID(), attribute.getBaseValue());
        attribute.setBaseValue(reach);
    }

    private static void restoreReach(ServerPlayer player) {
        Double original = originalReach.get(player.getUUID());
        AttributeInstance attribute = player.getAttribute(Attributes.BLOCK_INTERACTION_RANGE);
        if (original != null && attribute != null) {
            attribute.setBaseValue(original);
        }
    }

    private static void update() {
        FillGame.Status status = game.status();
        lastStatus = status;
        switch (status.phase()) {
            case FILLING -> {
                bar.setName(Component.literal("埋め立て " + status.percent() + "%（" + status.filled() + " / " + status.total() + "）"));
                bar.setColor(BossEvent.BossBarColor.YELLOW);
                bar.setProgress(status.filled() / (float) status.total());
            }
            case COUNTDOWN -> {
                bar.setName(Component.literal("完成！ あと " + status.countdownSecondsLeft() + " 秒守りきればクリア"));
                bar.setColor(BossEvent.BossBarColor.GREEN);
                bar.setProgress(status.countdownSeconds() == 0 ? 1f : status.countdownSecondsLeft() / (float) status.countdownSeconds());
            }
            case CLEARED -> {
                bar.setName(Component.literal("埋め立てクリア！"));
                bar.setColor(BossEvent.BossBarColor.GREEN);
                bar.setProgress(1f);
            }
        }
    }

    private record LevelWorld(ServerLevel level, Block wall, Block filler) implements FillGame.World {
        @Override
        public boolean isFilled(int x, int y, int z) {
            BlockState state = level.getBlockState(new BlockPos(x, y, z));
            return !state.isAir() && state.getFluidState().isEmpty();
        }

        @Override
        public void setWall(int x, int y, int z) {
            BlockPos pos = new BlockPos(x, y, z);
            if (!level.getBlockState(pos).is(wall)) {
                level.setBlockAndUpdate(pos, wall.defaultBlockState());
            }
        }

        @Override
        public void setAir(int x, int y, int z) {
            BlockPos pos = new BlockPos(x, y, z);
            if (!level.getBlockState(pos).isAir()) {
                level.setBlockAndUpdate(pos, Blocks.AIR.defaultBlockState());
            }
        }

        @Override
        public void setFiller(int x, int y, int z) {
            level.setBlockAndUpdate(new BlockPos(x, y, z), filler.defaultBlockState());
        }
    }
}
