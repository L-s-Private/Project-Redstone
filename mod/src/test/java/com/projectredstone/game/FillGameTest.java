package com.projectredstone.game;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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

        assertFalse(game.tick(world));
        assertEquals(FillGame.Phase.COUNTDOWN, game.phase());
        assertEquals(2, game.status().countdownSecondsLeft());
        assertEquals(100, game.status().percent());
        assertFalse(game.tick(world));
        assertFalse(game.tick(world));
        assertFalse(game.tick(world));
        assertTrue(game.tick(world), "2秒（4回）でクリア");
        assertEquals(FillGame.Phase.CLEARED, game.phase());
        assertFalse(game.tick(world), "クリア後は何もしない");
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
}
