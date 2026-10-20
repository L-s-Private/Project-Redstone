package com.projectredstone.game;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FillGameTest {

    /** メモリ上のワールド。何も置かれていなければ空気 */
    static final class FakeWorld implements FillGame.World {
        final Map<String, String> blocks = new HashMap<>();

        static String key(int x, int y, int z) {
            return x + "," + y + "," + z;
        }

        String at(int x, int y, int z) {
            return blocks.get(key(x, y, z));
        }

        void put(int x, int y, int z, String block) {
            blocks.put(key(x, y, z), block);
        }

        @Override
        public boolean isFilled(int x, int y, int z) {
            return at(x, y, z) != null;
        }

        @Override
        public void setWall(int x, int y, int z) {
            put(x, y, z, "bedrock");
        }

        @Override
        public void setAir(int x, int y, int z) {
            blocks.remove(key(x, y, z));
        }

        @Override
        public void setFiller(int x, int y, int z) {
            put(x, y, z, "dirt");
        }

        void fillInterior(int radius, int floorY, int height) {
            for (int x = -radius; x <= radius; x++) {
                for (int z = -radius; z <= radius; z++) {
                    for (int y = floorY; y < floorY + height; y++) {
                        put(x, y, z, "stone");
                    }
                }
            }
        }
    }

    @Test
    void createsFrameAndClearsInside() {
        FakeWorld world = new FakeWorld();
        world.put(0, 64, 0, "grass");
        FillGame game = FillGame.create(world, 0, 64, 0, 11, 9, 10);

        assertEquals(11 * 11 * 9, game.total());
        assertEquals(0, game.status().filled());
        assertEquals(null, world.at(0, 64, 0), "中は空気にする");
        assertEquals("bedrock", world.at(6, 64, 0), "壁は中心から6マス目");
        assertEquals("bedrock", world.at(6, 72, 6), "壁は高さ9（64〜72）");
        assertEquals(null, world.at(6, 73, 0), "壁は高さを超えない");
        assertEquals("bedrock", world.at(3, 63, -3), "床も岩盤");
    }

    @Test
    void evenWidthIsRoundedAndLimited() {
        FakeWorld world = new FakeWorld();
        assertEquals(11, FillGame.create(world, 0, 0, 0, 10, 1, 0).status().width());
        assertEquals(FillGame.MAX_WIDTH, FillGame.create(world, 0, 0, 0, 999, 1, 0).status().width());
        assertEquals(FillGame.MIN_WIDTH, FillGame.create(world, 0, 0, 0, 1, 1, 0).status().width());
    }

    @Test
    void countsDownWhenFullAndClearsAtZero() {
        FakeWorld world = new FakeWorld();
        FillGame game = FillGame.create(world, 0, 0, 0, 3, 2, 2);
        world.fillInterior(1, 0, 2);

        assertEquals(FillGame.TickResult.NONE, game.tick(world));
        assertEquals(FillGame.Phase.COUNTDOWN, game.phase());
        assertEquals(2, game.status().countdownSecondsLeft());
        assertEquals(100, game.status().percent());
        // 残り2秒は2.5秒（5回）、残り1秒は3秒（6回）かかる
        for (int i = 0; i < 5; i++) {
            assertEquals(FillGame.TickResult.NONE, game.tick(world));
        }
        assertEquals(1, game.status().countdownSecondsLeft());
        for (int i = 0; i < 5; i++) {
            assertEquals(FillGame.TickResult.NONE, game.tick(world));
        }
        assertEquals(FillGame.TickResult.ROUND_CLEARED, game.tick(world), "最後の2秒は5.5秒かけてクリア");
        assertEquals(FillGame.Phase.CLEARED, game.phase());
        assertEquals(FillGame.TickResult.NONE, game.tick(world), "クリア後は何もしない");
    }

    @Test
    void clearingARoundResetsTheFrameUntilTheLastRound() {
        FakeWorld world = new FakeWorld();
        FillGame game = FillGame.create(world, 0, 0, 0, 3, 1, 0, 2);
        game.resize(world, 1);
        world.fillInterior(2, 0, 1);

        assertEquals(FillGame.TickResult.ROUND_CLEARED, game.tick(world), "1ラウンド目クリア");
        assertEquals(FillGame.Phase.FILLING, game.phase(), "次のラウンドへ");
        assertEquals(1, game.status().round());
        assertEquals(2, game.status().rounds());
        assertEquals(3, game.status().width(), "枠は最初の大きさに戻る");
        assertEquals(0, game.status().filled(), "中は空になる");
        assertEquals(null, world.at(0, 0, 0));
        assertEquals("bedrock", world.at(2, 0, 0), "枠は作り直す");
        assertEquals(null, world.at(3, 0, 0), "広げた分の壁は消える");
        assertEquals(null, world.at(3, -1, 3), "広げた分の床も消える（前のラウンドの枠が残らない）");
        assertEquals("bedrock", world.at(2, -1, 2), "今の枠の床は残る");

        world.fillInterior(1, 0, 1);
        assertEquals(FillGame.TickResult.ROUND_CLEARED, game.tick(world), "2ラウンド目クリア");
        assertEquals(FillGame.Phase.CLEARED, game.phase(), "最後のラウンドで終わり");
        assertEquals(2, game.status().round());
        assertEquals("stone", world.at(0, 0, 0), "最後は空にしない");
    }

    @Test
    void onlyTheInsideOfTheFrameIsInterior() {
        FakeWorld world = new FakeWorld();
        FillGame game = FillGame.create(world, 0, 0, 0, 3, 2, 0);
        assertTrue(game.isInterior(0, 0, 0));
        assertTrue(game.isInterior(1, 1, -1));
        assertFalse(game.isInterior(2, 0, 0), "壁");
        assertFalse(game.isInterior(5, 0, 0), "枠の外");
        assertFalse(game.isInterior(0, -1, 0), "床");
        assertFalse(game.isInterior(0, 2, 0), "いちばん上の段より上");
        game.raise(world, 1);
        assertTrue(game.isInterior(0, 2, 0), "高くしたら置ける");
    }

    @Test
    void centerTextShowsOnlyTheCountdown() {
        FakeWorld world = new FakeWorld();
        FillGame game = FillGame.create(world, 0, 0, 0, 3, 1, 5);
        assertNull(FillGame.centerText(game.status()), "埋め立て中は出さない");

        world.fillInterior(1, 0, 1);
        game.tick(world);
        assertArrayEquals(new String[] {"5", "崩されなければクリア"}, FillGame.centerText(game.status()));
    }

    @Test
    void countdownSlowsDownNearTheEnd() {
        FakeWorld world = new FakeWorld();
        FillGame game = FillGame.create(world, 0, 0, 0, 3, 1, 10);
        world.fillInterior(1, 0, 1);
        game.tick(world);
        List<Integer> shown = new java.util.ArrayList<>();
        int ticks = 1;
        while (game.tick(world) == FillGame.TickResult.NONE) {
            shown.add(game.status().countdownSecondsLeft());
            ticks++;
        }
        ticks++;
        // 10〜6 は1秒（2回）ずつ、5・4 は1.5秒、3 は2秒、2 は2.5秒、1 は3秒
        assertEquals(1 + 10 + 3 + 3 + 4 + 5 + 6, ticks, "10秒のカウントダウンは実際には16秒");
        assertEquals(2, java.util.Collections.frequency(shown, 6), "残り6秒は1秒（2回）");
        assertEquals(6, java.util.Collections.frequency(shown, 1), "残り1秒は3秒（6回）");
    }

    @Test
    void raisingTheFrameAddsRowsAndTheNextRoundLowersItAgain() {
        FakeWorld world = new FakeWorld();
        FillGame game = FillGame.create(world, 0, 0, 0, 3, 2, 0, 2);
        assertEquals(2, game.raise(world, 2));
        assertEquals(4, game.status().height());
        assertEquals(36, game.status().total());
        assertEquals("bedrock", world.at(2, 3, 0), "壁も高くなる");
        assertTrue(game.isAboveFrame(0, 4, 0));
        assertFalse(game.isAboveFrame(0, 3, 0));

        world.fillInterior(1, 0, 4);
        assertEquals(FillGame.TickResult.ROUND_CLEARED, game.tick(world));
        assertEquals(2, game.status().height(), "次のラウンドは元の高さ");
        assertEquals(null, world.at(2, 3, 0), "高くした壁は消える");
        assertEquals(null, world.at(0, 2, 0), "高くした段の中も消える");
        assertEquals(30, game.raise(world, 99) + 2, "上限は30段");
    }

    @Test
    void fillLayersFillsTheLowestRowsThatHaveGaps() {
        FakeWorld world = new FakeWorld();
        FillGame game = FillGame.create(world, 0, 0, 0, 3, 3, 0);
        world.fillInterior(1, 0, 1);
        world.put(0, 1, 0, "stone");
        assertEquals(8, game.fillLayers(world, 1), "2段目の空いている8マスを埋める");
        assertEquals(18, game.status().filled());
        assertEquals(9, game.fillLayers(world, 5), "残りは1段だけ");
        assertEquals(27, game.status().filled());
    }

    @Test
    void shrinkingRemovesTheFloorOutsideTheNewFrame() {
        FakeWorld world = new FakeWorld();
        FillGame game = FillGame.create(world, 0, 5, 0, 7, 2, 0);
        game.resize(world, -2);
        assertEquals(null, world.at(4, 4, 0), "外の床は消える");
        assertEquals(null, world.at(3, 4, 3));
        assertEquals("bedrock", world.at(2, 4, 2), "新しい枠の床は残る");
    }

    @Test
    void cannotPlaceAboveTheFrame() {
        FakeWorld world = new FakeWorld();
        FillGame game = FillGame.create(world, 0, 10, 0, 3, 2, 0);
        assertFalse(game.isAboveFrame(0, 11, 0), "いちばん上の段は置ける");
        assertTrue(game.isAboveFrame(0, 12, 0), "枠より上は置けない");
        assertTrue(game.isAboveFrame(2, 12, -2), "壁の上も置けない");
        assertTrue(game.isAboveFrame(0, 40, 0), "ずっと上も置けない");
        assertFalse(game.isAboveFrame(3, 12, 0), "枠の外は関係ない");
    }

    @Test
    void knowsWhichBlocksAreTheFrame() {
        FakeWorld world = new FakeWorld();
        FillGame game = FillGame.create(world, 0, 10, 0, 3, 2, 0);
        assertTrue(game.isFrame(2, 10, 0), "壁");
        assertTrue(game.isFrame(-2, 11, 2), "壁の角のいちばん上");
        assertTrue(game.isFrame(0, 9, 0), "床");
        assertTrue(game.isFrame(2, 9, -2), "床の角");
        assertFalse(game.isFrame(0, 10, 0), "中は壊せる");
        assertFalse(game.isFrame(2, 12, 0), "壁より上は枠ではない");
        assertFalse(game.isFrame(3, 10, 0), "枠の外");
    }

    @Test
    void spawnPositionsAreInsideOnTopOfTheBlocks() {
        FakeWorld world = new FakeWorld();
        FillGame game = FillGame.create(world, 0, 10, 0, 3, 3, 0);
        world.fillInterior(1, 10, 1);
        for (double[] p : game.spawnPositions(world, 30, new Random(3))) {
            assertTrue(p[0] >= -1 && p[0] <= 2 && p[2] >= -1 && p[2] <= 2, "枠の中");
            assertEquals(11, p[1], "埋めたブロックのすぐ上");
        }
        world.fillInterior(1, 10, 3);
        assertEquals(13, game.spawnPositions(world, 1, new Random(3)).get(0)[1], "埋まっていれば枠の上");
    }

    @Test
    void mobsSpawnOnTheSurfaceNotUnderAnOverhang() {
        FakeWorld world = new FakeWorld();
        FillGame game = FillGame.create(world, 0, 10, 0, 3, 5, 0);
        // 床から1段目は空いていて、2〜3段目に張り出したブロックがある（下から探すと生き埋めになる形）
        world.put(0, 12, 0, "stone");
        world.put(0, 11, 0, "stone");
        assertEquals(13, game.surfaceY(world, 0, 0), "いちばん上のブロックの上");
        assertEquals(10, game.surfaceY(world, 1, 1), "何もなければ床");
        for (double[] p : game.spawnPositions(world, 50, new Random(1))) {
            assertFalse(game.isBuried(world, p[0], p[1], p[2], 1.95), "出した直後に埋まっていない");
        }
    }

    @Test
    void findsMobsOutsideTheStageOrBuriedAndReturnsThemInside() {
        FakeWorld world = new FakeWorld();
        FillGame game = FillGame.create(world, 0, 10, 0, 5, 5, 0);
        assertTrue(game.isInsideColumn(2.9, -1.5));
        assertFalse(game.isInsideColumn(3.1, 0), "壁の上・外は枠の外");
        assertFalse(game.isInsideColumn(0, -3.5));

        world.put(2, 10, 2, "stone");
        world.put(2, 11, 2, "stone");
        double[] back = game.returnPosition(world, 7.2, 9.9);
        assertEquals(2.5, back[0], "いちばん近い枠の中の列");
        assertEquals(2.5, back[2]);
        assertEquals(12, back[1], "その列の地上");

        assertTrue(game.isBuried(world, 2.5, 11, 2.5, 1.95), "足元がブロックの中");
        assertTrue(game.isBuried(world, 2.5, 9.5, 2.5, 1.95), "頭がブロックの中");
        assertFalse(game.isBuried(world, 2.5, 12, 2.5, 1.95), "ブロックの上に立っている");
    }

    @Test
    void countdownStopsWhenBlocksAreBroken() {
        FakeWorld world = new FakeWorld();
        FillGame game = FillGame.create(world, 0, 0, 0, 3, 1, 5);
        world.fillInterior(1, 0, 1);
        game.tick(world);
        assertEquals(FillGame.Phase.COUNTDOWN, game.phase());

        world.setAir(0, 0, 0); // TNT で壊された
        game.tick(world);
        assertEquals(FillGame.Phase.FILLING, game.phase());
        assertEquals(8, game.status().filled());
        assertEquals(88, game.status().percent());
    }

    @Test
    void repairsBrokenWalls() {
        FakeWorld world = new FakeWorld();
        FillGame game = FillGame.create(world, 0, 0, 0, 3, 3, 0);
        world.setAir(2, 1, 0);
        game.tick(world);
        assertEquals("bedrock", world.at(2, 1, 0));
    }

    @Test
    void expandingMovesWallsOutAndKeepsBlocks() {
        FakeWorld world = new FakeWorld();
        FillGame game = FillGame.create(world, 0, 0, 0, 3, 1, 0);
        world.fillInterior(1, 0, 1);
        game.resize(world, 1);

        assertEquals(5, game.status().width());
        assertEquals(null, world.at(2, 0, 0), "古い壁は消えて中になる");
        assertEquals("bedrock", world.at(3, 0, 0), "新しい壁");
        assertEquals("bedrock", world.at(2, -1, 2), "床も広がる");
        assertEquals("stone", world.at(1, 0, 1), "置いたブロックは残る");
        assertEquals(9, game.status().filled());
        assertEquals(25, game.total());
    }

    @Test
    void shrinkingDropsOutsideBlocksAndStopsCountdown() {
        FakeWorld world = new FakeWorld();
        FillGame game = FillGame.create(world, 0, 0, 0, 5, 1, 10);
        world.fillInterior(2, 0, 1);
        game.resize(world, -1);

        assertEquals(3, game.status().width());
        assertEquals("bedrock", world.at(2, 0, 0), "新しい壁は内側に");
        assertEquals(null, world.at(3, 0, 0), "古い壁は消える");
        assertEquals(9, game.status().filled());
        assertEquals(100, game.status().percent());

        game.resize(world, -5);
        assertEquals(FillGame.MIN_WIDTH, game.status().width(), "最小より小さくしない");
    }

    @Test
    void helpFillsFromTheBottom() {
        FakeWorld world = new FakeWorld();
        FillGame game = FillGame.create(world, 0, 0, 0, 3, 2, 0);
        int placed = game.help(world, 10, new Random(1));
        assertEquals(10, placed);
        for (int x = -1; x <= 1; x++) {
            for (int z = -1; z <= 1; z++) {
                assertEquals("dirt", world.at(x, 0, z), "下の段から埋める");
            }
        }
        assertEquals(10, game.status().filled());
        assertEquals(8, game.help(world, 100, new Random(1)), "空きの数までしか置かない");
    }

    @Test
    void dropPositionsAreAboveTheFrame() {
        FakeWorld world = new FakeWorld();
        FillGame game = FillGame.create(world, 10, 64, -5, 5, 4, 0);
        List<double[]> positions = game.dropPositions(50, new Random(2));
        assertEquals(50, positions.size());
        for (double[] p : positions) {
            assertTrue(p[0] >= 8 && p[0] <= 13, "x は枠の中");
            assertTrue(p[2] >= -7 && p[2] <= -2, "z は枠の中");
            assertEquals(69, p[1], "枠の上");
        }
    }

    @Test
    void detectsFallingOutOfTheFrame() {
        FakeWorld world = new FakeWorld();
        FillGame game = FillGame.create(world, 0, 150, 0, 5, 2, 0);
        assertFalse(game.hasFallen(150), "床の上");
        assertFalse(game.hasFallen(148.5), "床のすぐ下（床が壊れて少し落ちた）");
        assertTrue(game.hasFallen(146.9), "3マス以上落ちた");
        assertEquals(152, game.topY());
    }

    @Test
    void setFillPercentFillsFromTheBottomAndCanRestartAfterClear() {
        FakeWorld world = new FakeWorld();
        FillGame game = FillGame.create(world, 0, 0, 0, 3, 2, 0);
        assertEquals(18, game.setFillPercent(world, 100));
        assertEquals(FillGame.TickResult.ROUND_CLEARED, game.tick(world), "カウントダウン0秒なのですぐクリア");
        assertEquals(FillGame.Phase.CLEARED, game.phase());

        assertEquals(9, game.setFillPercent(world, 50));
        assertEquals(FillGame.Phase.FILLING, game.phase(), "やり直せる");
        assertEquals("dirt", world.at(1, 0, 1), "下の段は埋まる");
        assertEquals(null, world.at(1, 1, 1), "上の段は空");
        assertEquals("bedrock", world.at(2, 0, 0), "枠はそのまま");

        assertEquals(0, game.setFillPercent(world, 0));
        assertEquals(null, world.at(0, 0, 0));
    }

    @Test
    void blastRemovesOnlyBlocksInsideTheFrame() {
        FakeWorld world = new FakeWorld();
        FillGame game = FillGame.create(world, 0, 0, 0, 5, 3, 0);
        world.fillInterior(2, 0, 3);
        int removed = game.blast(world, 2.5, 0.5, 0.5, 3);

        assertTrue(removed > 0);
        assertEquals(75 - removed, game.status().filled());
        assertEquals(null, world.at(2, 0, 0), "爆心のブロックは消える");
        assertEquals("bedrock", world.at(3, 0, 0), "壁は壊れない");
        assertEquals("bedrock", world.at(2, -1, 0), "床も壊れない");
        assertEquals("stone", world.at(-2, 2, -2), "遠いブロックは残る");
    }
}
