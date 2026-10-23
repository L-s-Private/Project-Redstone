package com.staticarc.game;

import com.staticarc.game.FillGameTest.FakeWorld;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class SoundCueTest {

    @Test
    void countdownStartsTicksAndBreaks() {
        FakeWorld world = new FakeWorld();
        FillGame game = FillGame.create(world, 0, 0, 0, 3, 1, 3);
        FillGame.Status filling = game.status();
        world.fillInterior(1, 0, 1);
        game.tick(world);
        FillGame.Status started = game.status();
        assertEquals(new SoundCue(SoundCue.Kind.COUNTDOWN_START, 3), SoundCue.between(filling, started));

        // 残り3秒は2秒（4回）かかる
        FillGame.Status before = started;
        for (int i = 0; i < 3; i++) {
            game.tick(world);
            assertNull(SoundCue.between(before, game.status()), "1秒たつまでは鳴らさない");
            before = game.status();
        }
        game.tick(world);
        assertEquals(new SoundCue(SoundCue.Kind.COUNTDOWN_TICK, 2), SoundCue.between(before, game.status()));

        FillGame.Status counting = game.status();
        world.put(0, 0, 0, null);
        game.tick(world);
        assertEquals(new SoundCue(SoundCue.Kind.COUNTDOWN_BROKEN, 0), SoundCue.between(counting, game.status()));
    }

    @Test
    void nothingWhenTheRoundChanges() {
        FakeWorld world = new FakeWorld();
        FillGame game = FillGame.create(world, 0, 0, 0, 3, 1, 0, 2);
        FillGame.Status before = game.status();
        world.fillInterior(1, 0, 1);
        game.tick(world);
        assertNull(SoundCue.between(before, game.status()), "クリアの音は別に鳴らす");
        assertNull(SoundCue.between(null, game.status()));
    }
}
