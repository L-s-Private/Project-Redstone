package com.projectredstone.game;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

/**
 * 埋め立てモード。岩盤で囲った枠の中を、配信者がブロックで埋めきるゲーム。
 * 全部埋まるとカウントダウンが始まり、崩されずに 0 になればクリア。
 * Minecraft に依存しないので単体テストできる（ワールドの読み書きは World に任せる）。
 */
public final class FillGame {

    /** ワールドの読み書き。座標はブロック単位。 */
    public interface World {
        /** 空気や水でない、何かのブロックが置かれているか */
        boolean isFilled(int x, int y, int z);

        /** 枠（岩盤）にする。すでに岩盤なら何もしない */
        void setWall(int x, int y, int z);

        void setAir(int x, int y, int z);

        /** お助けで足すブロックを置く */
        void setFiller(int x, int y, int z);
    }

    public enum Phase { FILLING, COUNTDOWN, CLEARED }

    public static final int MIN_WIDTH = 3;
    public static final int MAX_WIDTH = 41;
    public static final int MIN_HEIGHT = 1;
    public static final int MAX_HEIGHT = 30;
    public static final int MAX_COUNTDOWN_SECONDS = 600;

    /** tick() は 0.5 秒ごとに呼ぶ */
    public static final int CHECKS_PER_SECOND = 2;

    private final int centerX;
    private final int centerZ;
    private final int floorY;
    private final int height;
    private final int countdownSeconds;
    private int radius;
    private Phase phase = Phase.FILLING;
    private int filled;
    private int countdownChecks;

    private FillGame(int centerX, int floorY, int centerZ, int radius, int height, int countdownSeconds) {
        this.centerX = centerX;
        this.floorY = floorY;
        this.centerZ = centerZ;
        this.radius = radius;
        this.height = height;
        this.countdownSeconds = countdownSeconds;
    }

    /**
     * (centerX, floorY, centerZ) を床の中心にして枠を作る。中は空気にする。
     * 幅は奇数にそろえる（中心から左右対称にするため）。
     */
    public static FillGame create(World world, int centerX, int floorY, int centerZ, int width, int height, int countdownSeconds) {
        int clampedWidth = clamp(width, MIN_WIDTH, MAX_WIDTH);
        FillGame game = new FillGame(centerX, floorY, centerZ, clampedWidth / 2,
                clamp(height, MIN_HEIGHT, MAX_HEIGHT), clamp(countdownSeconds, 0, MAX_COUNTDOWN_SECONDS));
        game.forEachInterior((x, y, z) -> world.setAir(x, y, z));
        game.buildFrame(world);
        game.recount(world);
        return game;
    }

    /** 枠を広げる（delta > 0）・縮める（delta < 0）。中に置いたブロックは、縮めて外に出た分だけ消える。 */
    public void resize(World world, int delta) {
        int newRadius = clamp(radius + delta, MIN_WIDTH / 2, MAX_WIDTH / 2);
        if (newRadius == radius) {
            return;
        }
        int oldRing = radius + 1;
        int newRing = newRadius + 1;
        // 古い壁と、新しい枠の外に出た部分を消す
        for (int dx = -oldRing; dx <= oldRing; dx++) {
            for (int dz = -oldRing; dz <= oldRing; dz++) {
                int distance = Math.max(Math.abs(dx), Math.abs(dz));
                boolean oldWall = distance == oldRing;
                boolean outsideNew = distance >= newRing;
                if (oldWall || outsideNew) {
                    for (int y = floorY; y < floorY + height; y++) {
                        world.setAir(centerX + dx, y, centerZ + dz);
                    }
                }
            }
        }
        radius = newRadius;
        buildFrame(world);
        recount(world);
        if (phase == Phase.COUNTDOWN && filled < total()) {
            phase = Phase.FILLING;
        }
    }

    /**
     * 0.5 秒ごとに呼ぶ。数え直し、壊れた枠を直し、カウントダウンを進める。
     * @return クリアした瞬間なら true
     */
    public boolean tick(World world) {
        if (phase == Phase.CLEARED) {
            return false;
        }
        buildFrame(world);
        recount(world);
        if (filled < total()) {
            phase = Phase.FILLING;
            return false;
        }
        if (phase == Phase.FILLING) {
            phase = Phase.COUNTDOWN;
            countdownChecks = countdownSeconds * CHECKS_PER_SECOND;
        } else {
            countdownChecks--;
        }
        if (countdownChecks <= 0) {
            phase = Phase.CLEARED;
            return true;
        }
        return false;
    }

    /** お助け: 空いているマスを下の段から count 個埋める。@return 実際に埋めた数 */
    public int help(World world, int count, Random random) {
        int placed = 0;
        for (int y = floorY; y < floorY + height && placed < count; y++) {
            List<int[]> empty = new ArrayList<>();
            for (int dx = -radius; dx <= radius; dx++) {
                for (int dz = -radius; dz <= radius; dz++) {
                    if (!world.isFilled(centerX + dx, y, centerZ + dz)) {
                        empty.add(new int[] {centerX + dx, centerZ + dz});
                    }
                }
            }
            Collections.shuffle(empty, random);
            for (int[] cell : empty) {
                if (placed >= count) {
                    break;
                }
                world.setFiller(cell[0], y, cell[1]);
                placed++;
            }
        }
        recount(world);
        return placed;
    }

    /** TNT を落とす位置（枠の真上）。{x, y, z} を count 個返す。座標はブロックの中心。 */
    public List<double[]> dropPositions(int count, Random random) {
        List<double[]> positions = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            double x = centerX + random.nextInt(radius * 2 + 1) - radius + 0.5;
            double z = centerZ + random.nextInt(radius * 2 + 1) - radius + 0.5;
            positions.add(new double[] {x, floorY + height + 1, z});
        }
        return positions;
    }

    public Status status() {
        int secondsLeft = phase == Phase.COUNTDOWN ? (countdownChecks + CHECKS_PER_SECOND - 1) / CHECKS_PER_SECOND : 0;
        return new Status(phase, filled, total(), radius * 2 + 1, height, secondsLeft, countdownSeconds);
    }

    public Phase phase() {
        return phase;
    }

    public int total() {
        int side = radius * 2 + 1;
        return side * side * height;
    }

    /** 進み具合。percent は 0〜100 の整数（埋めきるまで 100 にしない） */
    public record Status(Phase phase, int filled, int total, int width, int height, int countdownSecondsLeft, int countdownSeconds) {
        public int percent() {
            if (total == 0 || filled >= total) {
                return 100;
            }
            return Math.min(99, (int) Math.floor(filled * 100.0 / total));
        }
    }

    private void buildFrame(World world) {
        int ring = radius + 1;
        for (int dx = -ring; dx <= ring; dx++) {
            for (int dz = -ring; dz <= ring; dz++) {
                // 床
                world.setWall(centerX + dx, floorY - 1, centerZ + dz);
                if (Math.max(Math.abs(dx), Math.abs(dz)) == ring) {
                    for (int y = floorY; y < floorY + height; y++) {
                        world.setWall(centerX + dx, y, centerZ + dz);
                    }
                }
            }
        }
    }

    private void recount(World world) {
        int count = 0;
        for (int dx = -radius; dx <= radius; dx++) {
            for (int dz = -radius; dz <= radius; dz++) {
                for (int y = floorY; y < floorY + height; y++) {
                    if (world.isFilled(centerX + dx, y, centerZ + dz)) {
                        count++;
                    }
                }
            }
        }
        filled = count;
    }

    private interface CellAction {
        void apply(int x, int y, int z);
    }

    private void forEachInterior(CellAction action) {
        for (int dx = -radius; dx <= radius; dx++) {
            for (int dz = -radius; dz <= radius; dz++) {
                for (int y = floorY; y < floorY + height; y++) {
                    action.apply(centerX + dx, y, centerZ + dz);
                }
            }
        }
    }

    private static int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }
}
