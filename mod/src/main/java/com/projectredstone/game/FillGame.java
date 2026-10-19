package com.projectredstone.game;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

/**
 * 埋め立てモード。枠（ガラスなど）で囲ったの中を、配信者がブロックで埋めきるゲーム。
 * 全部埋まるとカウントダウンが始まり、崩されずに 0 になればそのラウンドはクリア。
 * 決めたラウンド数に届くまでは、枠を最初の大きさに戻して中を空にし、次のラウンドを始める。
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
    public static final int MAX_ROUNDS = 99;

    /** 床からこれだけ下に落ちたら、枠の上に戻す */
    static final int FALL_MARGIN = 3;

    /** tick() は 0.5 秒ごとに呼ぶ */
    public static final int CHECKS_PER_SECOND = 2;

    private final int centerX;
    private final int centerZ;
    private final int floorY;
    private final int height;
    private final int countdownSeconds;
    private final int rounds;
    /** 最初の枠の大きさ（ラウンドごとにここへ戻す） */
    private final int startRadius;
    private int radius;
    private Phase phase = Phase.FILLING;
    private int filled;
    private int countdownChecks;
    /** クリアしたラウンドの数 */
    private int clearedRounds;

    private FillGame(int centerX, int floorY, int centerZ, int radius, int height, int countdownSeconds, int rounds) {
        this.centerX = centerX;
        this.floorY = floorY;
        this.centerZ = centerZ;
        this.startRadius = radius;
        this.radius = radius;
        this.height = height;
        this.countdownSeconds = countdownSeconds;
        this.rounds = rounds;
    }

    /** 1ラウンドだけのゲーム */
    public static FillGame create(World world, int centerX, int floorY, int centerZ, int width, int height, int countdownSeconds) {
        return create(world, centerX, floorY, centerZ, width, height, countdownSeconds, 1);
    }

    /**
     * (centerX, floorY, centerZ) を床の中心にして枠を作る。中は空気にする。
     * 幅は奇数にそろえる（中心から左右対称にするため）。
     */
    public static FillGame create(World world, int centerX, int floorY, int centerZ, int width, int height, int countdownSeconds, int rounds) {
        int clampedWidth = clamp(width, MIN_WIDTH, MAX_WIDTH);
        FillGame game = new FillGame(centerX, floorY, centerZ, clampedWidth / 2,
                clamp(height, MIN_HEIGHT, MAX_HEIGHT), clamp(countdownSeconds, 0, MAX_COUNTDOWN_SECONDS), clamp(rounds, 1, MAX_ROUNDS));
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
     * ラウンドをクリアしたら、最後のラウンドなら CLEARED に、そうでなければ枠を戻して次のラウンドへ進む。
     * @return ラウンドをクリアした瞬間なら true（最後かどうかは phase() で見る）
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
            clearedRounds++;
            if (clearedRounds >= rounds) {
                phase = Phase.CLEARED;
            } else {
                nextRound(world);
            }
            return true;
        }
        return false;
    }

    /** 枠を最初の大きさに戻し、中を空にする */
    private void nextRound(World world) {
        resize(world, startRadius - radius);
        forEachInterior((x, y, z) -> world.setAir(x, y, z));
        buildFrame(world);
        recount(world);
        phase = Phase.FILLING;
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

    /**
     * デバッグ用: 中を下の段から percent% まで埋め、残りを空にする。クリア後でもやり直せるよう、埋めきらなければ埋め立て中に戻す。
     * @return 埋まっているマスの数
     */
    public int setFillPercent(World world, int percent) {
        int target = (int) Math.round(total() * clamp(percent, 0, 100) / 100.0);
        int[] index = {0};
        forEachInterior((x, y, z) -> {
            if (index[0]++ < target) {
                if (!world.isFilled(x, y, z)) {
                    world.setFiller(x, y, z);
                }
            } else {
                world.setAir(x, y, z);
            }
        });
        recount(world);
        if (filled < total()) {
            phase = Phase.FILLING;
        }
        return filled;
    }

    /**
     * TNT の爆発。(x, y, z) から radius 以内の、枠の中のマスだけを空にする（枠と床は壊さない）。
     * @return 空にしたマスの数
     */
    public int blast(World world, double x, double y, double z, double radius) {
        int[] removed = {0};
        forEachInterior((bx, by, bz) -> {
            double ddx = bx + 0.5 - x;
            double ddy = by + 0.5 - y;
            double ddz = bz + 0.5 - z;
            if (ddx * ddx + ddy * ddy + ddz * ddz <= radius * radius && world.isFilled(bx, by, bz)) {
                world.setAir(bx, by, bz);
                removed[0]++;
            }
        });
        recount(world);
        return removed[0];
    }

    /** 枠と、その上の TNT が落ちてくる空間を含む範囲 {minX, minY, minZ, maxX, maxY, maxZ}（両端を含む） */
    public int[] area() {
        int ring = radius + 1;
        return new int[] {centerX - ring, floorY - 1, centerZ - ring, centerX + ring, floorY + height + 3, centerZ + ring};
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

    /**
     * モブを出す位置（枠の中）。{x, y, z} を count 個返す。座標はブロックの中心。
     * 高さは、その列で下から見て最初に空いているマス（埋まっていれば枠の上）。
     */
    public List<double[]> spawnPositions(World world, int count, Random random) {
        List<double[]> positions = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            int x = centerX + random.nextInt(radius * 2 + 1) - radius;
            int z = centerZ + random.nextInt(radius * 2 + 1) - radius;
            int y = floorY;
            while (y < topY() && world.isFilled(x, y, z)) {
                y++;
            }
            positions.add(new double[] {x + 0.5, y, z + 0.5});
        }
        return positions;
    }

    /** 枠（壁と床）のブロックか。ここは壊させない */
    public boolean isFrame(int x, int y, int z) {
        int ring = radius + 1;
        int distance = Math.max(Math.abs(x - centerX), Math.abs(z - centerZ));
        if (distance > ring) {
            return false;
        }
        return y == floorY - 1 || (distance == ring && y >= floorY && y < topY());
    }

    /** 枠（壁を含む）の真上で、いちばん上の段より高いか。ここにはブロックを置かせない */
    public boolean isAboveFrame(int x, int y, int z) {
        int ring = radius + 1;
        return y >= topY() && Math.abs(x - centerX) <= ring && Math.abs(z - centerZ) <= ring;
    }

    public Status status() {
        int secondsLeft = phase == Phase.COUNTDOWN ? (countdownChecks + CHECKS_PER_SECOND - 1) / CHECKS_PER_SECOND : 0;
        return new Status(phase, filled, total(), radius * 2 + 1, height, secondsLeft, countdownSeconds, clearedRounds, rounds);
    }

    public Phase phase() {
        return phase;
    }

    public int centerX() {
        return centerX;
    }

    public int centerZ() {
        return centerZ;
    }

    public int floorY() {
        return floorY;
    }

    /** 枠のいちばん上の段の、1つ上の高さ */
    public int topY() {
        return floorY + height;
    }

    /** 枠から落ちたとみなす高さか（床より3マス以上下） */
    public boolean hasFallen(double y) {
        return y < floorY - FALL_MARGIN;
    }

    public int total() {
        int side = radius * 2 + 1;
        return side * side * height;
    }

    /** 進み具合。percent は 0〜100 の整数（埋めきるまで 100 にしない）。round はクリアしたラウンドの数 */
    public record Status(Phase phase, int filled, int total, int width, int height, int countdownSecondsLeft, int countdownSeconds,
                         int round, int rounds) {
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

    /** 中のマスを、下の段から順にたどる */
    private void forEachInterior(CellAction action) {
        for (int y = floorY; y < floorY + height; y++) {
            for (int dx = -radius; dx <= radius; dx++) {
                for (int dz = -radius; dz <= radius; dz++) {
                    action.apply(centerX + dx, y, centerZ + dz);
                }
            }
        }
    }

    private static int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }
}
