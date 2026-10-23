package com.staticarc.game;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

/**
 * 埋め立てモード。枠（ガラスなど）で囲ったの中を、配信者がブロックで埋めきるゲーム。
 * 全部埋まるとカウントダウンが始まり、崩されずに 0 になればそのラウンドはクリア。
 * 決めたラウンド数に届くまでは、枠を最初の大きさに戻して中を空にし、次のラウンドを始める。
 * クリアまでのカウントダウンは、最後の5秒ほど1秒が長くなる（盛り上げるため、だんだん遅くする）。
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

    /** tick() の結果 */
    public enum TickResult { NONE, ROUND_CLEARED }

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
    /** 枠の高さ。妨害で高くなることがあり、ラウンドごとに startHeight へ戻す */
    private int height;
    private final int startHeight;
    private final int countdownSeconds;
    private final int rounds;
    /** 最初の枠の大きさ（ラウンドごとにここへ戻す） */
    private final int startRadius;
    private int radius;
    private Phase phase = Phase.FILLING;
    private int filled;
    /** カウントダウンの残り秒数と、いまの1秒の残り（チェックの回数） */
    private int countdownLeft;
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
        this.startHeight = height;
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
        // 古い壁と、新しい枠の外に出た部分を消す。縮めたときは、新しい枠の外に残る床も消す
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
                if (distance > newRing) {
                    world.setAir(centerX + dx, floorY - 1, centerZ + dz);
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
     * @return ラウンドをクリアした瞬間なら ROUND_CLEARED（最後かどうかは phase() で見る）
     */
    public TickResult tick(World world) {
        if (phase == Phase.CLEARED) {
            return TickResult.NONE;
        }
        buildFrame(world);
        recount(world);
        if (filled < total()) {
            phase = Phase.FILLING;
            return TickResult.NONE;
        }
        if (phase == Phase.FILLING) {
            phase = Phase.COUNTDOWN;
            countdownLeft = countdownSeconds;
            countdownChecks = checksForSecond(countdownLeft);
        } else if (--countdownChecks <= 0) {
            countdownLeft--;
            countdownChecks = checksForSecond(countdownLeft);
        }
        if (countdownLeft <= 0) {
            clearedRounds++;
            if (clearedRounds >= rounds) {
                phase = Phase.CLEARED;
            } else {
                resetRound(world);
            }
            return TickResult.ROUND_CLEARED;
        }
        return TickResult.NONE;
    }

    /**
     * カウントダウンの「残り secondsLeft 秒」の1秒が、何回のチェック（0.5秒）か。
     * 残り5秒からだんだん長くする: 5・4 は1.5秒、3 は2秒、2 は2.5秒、1 は3秒
     */
    static int checksForSecond(int secondsLeft) {
        return switch (secondsLeft) {
            case 1 -> 6;
            case 2 -> 5;
            case 3 -> 4;
            case 4, 5 -> 3;
            default -> CHECKS_PER_SECOND;
        };
    }

    /** 枠を最初の大きさ・高さに戻し、中を空にする（次のラウンド） */
    private void resetRound(World world) {
        resize(world, startRadius - radius);
        forEachInterior((x, y, z) -> world.setAir(x, y, z));
        lowerTo(world, startHeight);
        buildFrame(world);
        recount(world);
        phase = Phase.FILLING;
    }

    /** 枠を rows 段高くする（埋める所が増える）。@return 実際に高くした段数 */
    public int raise(World world, int rows) {
        int newHeight = clamp(height + rows, MIN_HEIGHT, MAX_HEIGHT);
        int raised = newHeight - height;
        height = newHeight;
        buildFrame(world);
        recount(world);
        if (phase == Phase.COUNTDOWN && filled < total()) {
            phase = Phase.FILLING;
        }
        return raised;
    }

    /** 高くした枠を newHeight に戻す。上の段は壁も中も消す */
    private void lowerTo(World world, int newHeight) {
        int ring = radius + 1;
        for (int y = floorY + newHeight; y < floorY + height; y++) {
            for (int dx = -ring; dx <= ring; dx++) {
                for (int dz = -ring; dz <= ring; dz++) {
                    world.setAir(centerX + dx, y, centerZ + dz);
                }
            }
        }
        height = newHeight;
    }

    /** 一段埋め: 空いているマスがあるいちばん下の段を、layers 段ぶん全部埋める。@return 埋めたマスの数 */
    public int fillLayers(World world, int layers) {
        int placed = 0;
        int done = 0;
        for (int y = floorY; y < floorY + height && done < layers; y++) {
            boolean any = false;
            for (int dx = -radius; dx <= radius; dx++) {
                for (int dz = -radius; dz <= radius; dz++) {
                    if (!world.isFilled(centerX + dx, y, centerZ + dz)) {
                        world.setFiller(centerX + dx, y, centerZ + dz);
                        placed++;
                        any = true;
                    }
                }
            }
            if (any) {
                done++;
            }
        }
        recount(world);
        return placed;
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
     * 高さはその列の地上（いちばん上に積まれたブロックの上）なので、生き埋めにならない。
     */
    public List<double[]> spawnPositions(World world, int count, Random random) {
        List<double[]> positions = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            int x = centerX + random.nextInt(radius * 2 + 1) - radius;
            int z = centerZ + random.nextInt(radius * 2 + 1) - radius;
            positions.add(new double[] {x + 0.5, surfaceY(world, x, z), z + 0.5});
        }
        return positions;
    }

    /**
     * 列 (x, z) の地上の高さ: いちばん上に積まれたブロックの1つ上（何もなければ床）。
     * 下から見て最初の隙間ではなく上から見るので、張り出したブロックの下（生き埋め）にはならない。
     */
    public int surfaceY(World world, int x, int z) {
        for (int y = topY() - 1; y >= floorY; y--) {
            if (world.isFilled(x, y, z)) {
                return y + 1;
            }
        }
        return floorY;
    }

    /** (x, z) が枠の中（壁より内側）の列か */
    public boolean isInsideColumn(double x, double z) {
        int bx = (int) Math.floor(x);
        int bz = (int) Math.floor(z);
        return Math.abs(bx - centerX) <= radius && Math.abs(bz - centerZ) <= radius;
    }

    /** 高さ entityHeight のものが (x, y, z) にいて、体がブロックに埋まっているか */
    public boolean isBuried(World world, double x, double y, double z, double entityHeight) {
        int bx = (int) Math.floor(x);
        int bz = (int) Math.floor(z);
        int top = (int) Math.floor(y + Math.max(0.1, entityHeight) - 0.01);
        for (int by = (int) Math.floor(y); by <= top; by++) {
            if (world.isFilled(bx, by, bz)) {
                return true;
            }
        }
        return false;
    }

    /** 枠の外に出た・埋まったモブを戻す位置。列を枠の中に収め、その列の地上。座標はブロックの中心 */
    public double[] returnPosition(World world, double x, double z) {
        int bx = clamp((int) Math.floor(x), centerX - radius, centerX + radius);
        int bz = clamp((int) Math.floor(z), centerZ - radius, centerZ + radius);
        return new double[] {bx + 0.5, surfaceY(world, bx, bz), bz + 0.5};
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
    /** 枠の中（壁と床の内側で、いちばん上の段まで）なら true。ブロックを置けるのはここだけ */
    public boolean isInterior(int x, int y, int z) {
        return Math.abs(x - centerX) <= radius && Math.abs(z - centerZ) <= radius && y >= floorY && y < floorY + height;
    }

    /**
     * 画面の真ん中に出す秒数。{大きい文字, 小さい文字}。出すものがなければ null。
     * カウントダウンは大きく数字を出す。
     */
    public static String[] centerText(Status status) {
        if (status.phase() == Phase.COUNTDOWN) {
            return new String[] {String.valueOf(status.countdownSecondsLeft()), "崩されなければクリア"};
        }
        return null;
    }

    public boolean isAboveFrame(int x, int y, int z) {
        int ring = radius + 1;
        return y >= topY() && Math.abs(x - centerX) <= ring && Math.abs(z - centerZ) <= ring;
    }

    public Status status() {
        int secondsLeft = phase == Phase.COUNTDOWN ? countdownLeft : 0;
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
