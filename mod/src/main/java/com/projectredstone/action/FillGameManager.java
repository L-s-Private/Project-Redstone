package com.projectredstone.action;

import com.projectredstone.game.FillGame;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.network.protocol.game.ClientboundSetTitleTextPacket;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerBossEvent;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.BossEvent;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;

import java.util.List;
import java.util.Random;

/**
 * 埋め立てモードを Minecraft の上で動かす。ボスバーに進み具合を出す。
 * status() 以外はサーバースレッドから呼ぶこと。
 */
public final class FillGameManager {

    /** 0.5 秒（10 tick）ごとに数え直す */
    private static final int CHECK_INTERVAL_TICKS = 20 / FillGame.CHECKS_PER_SECOND;

    private static final Random RANDOM = new Random();

    private static FillGame game;
    private static LevelWorld world;
    private static ServerBossEvent bar;
    private static int ticks;
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

    /** プレイヤーの足元を床の中心にして枠を作る */
    public static void start(ServerPlayer player, int width, int height, int countdown) {
        stop();
        world = new LevelWorld((ServerLevel) player.level());
        BlockPos feet = player.blockPosition();
        game = FillGame.create(world, feet.getX(), feet.getY(), feet.getZ(), width, height, countdown);
        bar = new ServerBossEvent(Component.literal("埋め立て"), BossEvent.BossBarColor.YELLOW, BossEvent.BossBarOverlay.PROGRESS);
        bar.addPlayer(player);
        update();
    }

    public static void stop() {
        if (bar != null) {
            bar.removeAllPlayers();
        }
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
        // 途中で入り直したプレイヤーにもボスバーを見せる
        for (ServerPlayer player : server.getPlayerList().getPlayers()) {
            bar.addPlayer(player);
        }
        if (game.tick(world)) {
            for (ServerPlayer player : server.getPlayerList().getPlayers()) {
                player.connection.send(new ClientboundSetTitleTextPacket(Component.literal("埋め立てクリア！")));
            }
        }
        update();
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

    private record LevelWorld(ServerLevel level) implements FillGame.World {
        @Override
        public boolean isFilled(int x, int y, int z) {
            BlockState state = level.getBlockState(new BlockPos(x, y, z));
            return !state.isAir() && state.getFluidState().isEmpty();
        }

        @Override
        public void setWall(int x, int y, int z) {
            BlockPos pos = new BlockPos(x, y, z);
            if (!level.getBlockState(pos).is(Blocks.BEDROCK)) {
                level.setBlockAndUpdate(pos, Blocks.BEDROCK.defaultBlockState());
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
            level.setBlockAndUpdate(new BlockPos(x, y, z), Blocks.DIRT.defaultBlockState());
        }
    }
}
