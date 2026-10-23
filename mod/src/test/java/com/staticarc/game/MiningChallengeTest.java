package com.staticarc.game;

import org.junit.jupiter.api.Test;

import static com.staticarc.game.MiningChallenge.Source.MINING;
import static com.staticarc.game.MiningChallenge.Source.SUPPORT;
import static com.staticarc.game.MiningChallenge.State;
import static com.staticarc.game.MiningChallenge.TickResult;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MiningChallengeTest {

    /** カウントダウンを終えて RUNNING にした挑戦 */
    static MiningChallenge running(int target, int seconds) {
        MiningChallenge c = MiningChallenge.create("s1", "minecraft:raw_iron", target, seconds);
        for (int i = 0; i < MiningChallenge.COUNTDOWN_SECONDS * 20; i++) {
            c.tick();
        }
        assertEquals(State.RUNNING, c.state());
        return c;
    }

    @Test
    void 範囲の外の値は丸めずに断る() {
        assertThrows(IllegalArgumentException.class, () -> MiningChallenge.create("s", "minecraft:stone", 16, 180));
        assertThrows(IllegalArgumentException.class, () -> MiningChallenge.create("s", "minecraft:raw_iron", 0, 180));
        assertThrows(IllegalArgumentException.class, () -> MiningChallenge.create("s", "minecraft:raw_iron", 513, 180));
        assertThrows(IllegalArgumentException.class, () -> MiningChallenge.create("s", "minecraft:raw_iron", 16, 29));
        assertThrows(IllegalArgumentException.class, () -> MiningChallenge.create("s", "minecraft:raw_iron", 16, 1801));
        MiningChallenge.create("s", "minecraft:flint", 512, 1800);
        MiningChallenge.create("s", "minecraft:coal", 1, 30);
    }

    @Test
    void 三秒のカウントダウンのあと始まり_その間は数えない() {
        MiningChallenge c = MiningChallenge.create("s1", "minecraft:raw_iron", 16, 180);
        assertEquals(State.COUNTDOWN, c.state());
        assertEquals(3, c.countdownSecondsLeft());
        assertEquals(0, c.credit(MINING, 5), "カウントダウン中に拾ったものは数えない");
        int seconds = 0;
        TickResult last = TickResult.NONE;
        for (int i = 0; i < 60; i++) {
            last = c.tick();
            if (last == TickResult.COUNTDOWN_SECOND) {
                seconds++;
            }
        }
        assertEquals(2, seconds, "「2」「1」で知らせる（「3」は始めたとき）");
        assertEquals(TickResult.STARTED, last);
        assertEquals(State.RUNNING, c.state());
        assertEquals(180, c.remainingSeconds(), "カウントダウンの分は残り時間から引かない");
    }

    @Test
    void 時間切れで失敗する() {
        MiningChallenge c = running(16, 30);
        for (int i = 0; i < 30 * 20 - 1; i++) {
            assertEquals(TickResult.NONE, c.tick());
        }
        assertEquals(1, c.remainingSeconds());
        assertEquals(TickResult.TIMED_OUT, c.tick());
        assertEquals(State.FAILED, c.state());
        assertEquals(MiningChallenge.REASON_TIMEOUT, c.failureReason());
        assertEquals(0, c.remainingSeconds());
        assertEquals(30, c.elapsedSeconds());
        // 終わったあとは何も変わらない
        assertEquals(TickResult.NONE, c.tick());
        assertEquals(0, c.credit(MINING, 1));
    }

    @Test
    void 目標に届いた瞬間に一度だけ成功する() {
        MiningChallenge c = running(16, 180);
        assertEquals(10, c.credit(MINING, 10));
        assertEquals(State.RUNNING, c.state());
        long seq = c.seq();
        assertEquals(7, c.credit(MINING, 7), "目標を超えて拾ってもそのまま数える");
        assertEquals(State.SUCCEEDED, c.state());
        assertNull(c.failureReason());
        assertEquals(17, c.progress());
        assertTrue(c.seq() > seq);
        // 重ねて届いても、もう変わらない
        long after = c.seq();
        assertEquals(0, c.credit(MINING, 1));
        assertFalse(c.fail(MiningChallenge.REASON_PLAYER_DIED));
        assertFalse(c.abort(MiningChallenge.REASON_USER));
        assertEquals(State.SUCCEEDED, c.state());
        assertEquals(after, c.seq());
    }

    @Test
    void 一時停止中は時間も進み具合も止まり_再開すると続きから() {
        MiningChallenge c = running(16, 60);
        for (int i = 0; i < 200; i++) {
            c.tick();
        }
        assertEquals(50, c.remainingSeconds());
        assertTrue(c.pause());
        assertFalse(c.pause(), "連打しても1回だけ");
        for (int i = 0; i < 2000; i++) {
            c.tick();
        }
        assertEquals(50, c.remainingSeconds());
        assertEquals(0, c.credit(MINING, 3));
        assertEquals(0, c.reserveSupport(3));
        assertTrue(c.resume());
        assertFalse(c.resume());
        assertEquals(State.RUNNING, c.state());
        c.tick();
        assertEquals(50, c.remainingSeconds(), "カウントダウンし直さない");
    }

    @Test
    void 中止とやられたとき() {
        MiningChallenge countdown = MiningChallenge.create("s", "minecraft:coal", 16, 180);
        assertTrue(countdown.abort(MiningChallenge.REASON_USER));
        assertEquals(State.ABORTED, countdown.state());
        assertEquals(MiningChallenge.REASON_COUNTDOWN_CANCELLED, countdown.failureReason());
        assertFalse(countdown.fail(MiningChallenge.REASON_PLAYER_DIED));

        MiningChallenge c = running(16, 180);
        c.credit(MINING, 4);
        assertTrue(c.abort(MiningChallenge.REASON_USER));
        assertEquals(State.ABORTED, c.state());
        assertEquals(MiningChallenge.REASON_USER, c.failureReason());
        assertEquals(4, c.progress(), "進み具合は結果として残す");

        MiningChallenge died = running(16, 180);
        died.pause();
        assertTrue(died.fail(MiningChallenge.REASON_PLAYER_DIED));
        assertEquals(State.FAILED, died.state());
        assertEquals(MiningChallenge.REASON_PLAYER_DIED, died.failureReason());

        MiningChallenge closed = running(16, 180);
        assertTrue(closed.abort(MiningChallenge.REASON_WORLD_CLOSED));
        assertEquals(MiningChallenge.REASON_WORLD_CLOSED, closed.failureReason());
    }

    @Test
    void 支援は一回16個まで_挑戦全体で目標の4分の1まで() {
        MiningChallenge c = running(200, 180);
        assertEquals(50, c.supportLimit());
        assertEquals(16, c.reserveSupport(64));
        assertEquals(16, c.reserveSupport(16));
        assertEquals(16, c.reserveSupport(16));
        assertEquals(2, c.reserveSupport(16), "上限までで切る");
        assertEquals(0, c.reserveSupport(16));
        // 拾った分も上限まで
        assertEquals(50, c.credit(SUPPORT, 60));
        assertEquals(0, c.credit(SUPPORT, 1));
        assertEquals(50, c.support());
        assertEquals(0, c.mined());

        assertEquals(1, running(3, 180).supportLimit(), "目標が小さくても1個は支援できる");
    }

    @Test
    void 支援だけでは目標に届かず_採掘と合わせて届けば成功() {
        MiningChallenge c = running(8, 180);
        assertEquals(2, c.credit(SUPPORT, 2));
        assertEquals(6, c.credit(MINING, 6));
        assertEquals(State.SUCCEEDED, c.state());
        assertEquals(6, c.mined());
        assertEquals(2, c.support());
    }

    @Test
    void テスト用の操作をしたら印が付く() {
        MiningChallenge c = running(16, 180);
        assertFalse(c.test());
        c.testSetRemaining(5);
        assertTrue(c.test());
        assertEquals(5, c.remainingSeconds());
        c.testSetProgress(16);
        assertEquals(State.SUCCEEDED, c.state());
    }
}
