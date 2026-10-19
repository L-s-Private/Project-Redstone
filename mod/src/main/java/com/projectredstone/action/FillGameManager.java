package com.projectredstone.action;

import com.projectredstone.bridge.ActionRequest;
import com.projectredstone.game.FillGame;
import net.minecraft.core.BlockPos;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.network.chat.Component;
import net.minecraft.network.protocol.game.ClientboundSetTitleTextPacket;
import net.minecraft.resources.Identifier;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerBossEvent;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.BossEvent;
import net.minecraft.world.entity.ai.attributes.AttributeInstance;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.item.ItemEntity;
import net.minecraft.world.entity.item.PrimedTnt;
import net.minecraft.world.entity.player.Inventory;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.AABB;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

/**
 * 埋め立てモードを Minecraft の上で動かす。
 * 枠は空中（天空）に作り、プレイヤーを中へ移す。落ちたら枠の上に戻す。進み具合はボスバーに出す。
 * 埋めるブロックは減らない（いつも64個にしておく）。TNT は枠を壊さず、中のブロックだけを消す（アイテムも落とさない）。
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
    private static final int STACK = 64;

    private static FillGame game;
    private static LevelWorld world;
    private static ServerBossEvent bar;
    private static int ticks;
    private static ItemStack fillerStack = ItemStack.EMPTY;
    /** 枠に落とした TNT。爆発の直前に、枠を壊さない爆発へ差し替える */
    private static final List<PrimedTnt> trackedTnt = new ArrayList<>();
    /** ブロックを置く間隔（tick）。0 なら変えない。クライアント側（RedstoneClient）から読む */
    private static volatile int placeDelayTicks;
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

    public static int placeDelayTicks() {
        return placeDelayTicks;
    }

    /** プレイヤーの真上の空中に枠を作り、中へ移す */
    public static void start(ServerPlayer player, ActionRequest request) {
        stop(player.level().getServer());
        ServerLevel level = (ServerLevel) player.level();
        Block filler = blockById(request.block(), Blocks.AMETHYST_BLOCK);
        world = new LevelWorld(level, blockById(request.wall(), Blocks.GLASS), filler);

        // 枠（床の下の1段と、高さぶん）がワールドの高さに収まるようにする
        int height = Math.max(FillGame.MIN_HEIGHT, Math.min(FillGame.MAX_HEIGHT, request.height()));
        int floorY = Math.max(level.getMinY() + 1, Math.min(level.getMaxY() - height - 1, request.skyY()));
        BlockPos feet = player.blockPosition();
        game = FillGame.create(world, feet.getX(), floorY, feet.getZ(), request.width(), height, request.countdown());

        moveIntoFrame(player);
        fillerStack = new ItemStack(filler.asItem(), STACK);
        refillBlocks(player);
        setReach(player, request.reach());
        placeDelayTicks = request.placeDelayTicks();

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
        trackedTnt.clear();
        fillerStack = ItemStack.EMPTY;
        placeDelayTicks = 0;
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

    /** 埋め立て中なら、TNT を落とす位置（枠の真上）を返す。そうでなければ null */
    public static List<double[]> tntPositions(int count) {
        if (game == null || game.phase() == FillGame.Phase.CLEARED) {
            return null;
        }
        return game.dropPositions(count, RANDOM);
    }

    public static void onServerTick(MinecraftServer server) {
        if (game == null) {
            return;
        }
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
        if (changed) {
            update();
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
