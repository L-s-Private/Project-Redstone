package com.projectredstone.game;

import java.util.List;

/**
 * 採掘・収集チャレンジ。制限時間内に、決めた資源（鉄の原石など）を決めた数だけ集める。
 * 時間はサーバーの tick で数える（ゲームが止まっている間は減らない）。進み具合は、採掘で落ちて拾った数（DropLedger が数える）。
 * Minecraft に依存しないので単体テストできる。
 *
 * 状態の移り変わり:
 *   COUNTDOWN（3秒） → RUNNING → SUCCEEDED（目標に届いた）/ FAILED（時間切れ・やられた）
 *   RUNNING ⇄ PAUSED（配信者が一時停止）
 *   COUNTDOWN / RUNNING / PAUSED → ABORTED（配信者が中止・ワールドを閉じた など）
 * 終わった挑戦（SUCCEEDED / FAILED / ABORTED）は二度と動かない。次の挑戦は新しく作る（別の sessionId）。
 */
public final class MiningChallenge {

    public enum State {
        COUNTDOWN, RUNNING, PAUSED, SUCCEEDED, FAILED, ABORTED;

        /** まだ終わっていない */
        public boolean active() {
            return this == COUNTDOWN || this == RUNNING || this == PAUSED;
        }
    }

    /** 進み具合のもと: 採掘で落ちたもの / ギフトの支援で出したもの */
    public enum Source { MINING, SUPPORT }

    /** tick() の結果（音や画面の真ん中の文字を出すため） */
    public enum TickResult { NONE, COUNTDOWN_SECOND, STARTED, TIMED_OUT }

    public static final int TICKS_PER_SECOND = 20;
    public static final int COUNTDOWN_SECONDS = 3;
    public static final int MIN_TARGET = 1;
    public static final int MAX_TARGET = 512;
    public static final int MIN_SECONDS = 30;
    public static final int MAX_SECONDS = 1800;
    /** ギフトの支援で1回に出せる数 */
    public static final int MAX_SUPPORT_PER_EVENT = 16;
    /** 支援で進められるのは目標数の4分の1まで（最低1個） */
    public static final int SUPPORT_SHARE_DIVISOR = 4;

    /** 集められる資源（バニラのアイテム ID）。Minecraft の中にあるかは、MOD が始めるときに確かめる */
    public static final List<String> TARGETS = List.of(
            "minecraft:coal", "minecraft:raw_iron", "minecraft:raw_copper", "minecraft:raw_gold", "minecraft:diamond",
            "minecraft:emerald", "minecraft:lapis_lazuli", "minecraft:redstone", "minecraft:quartz", "minecraft:ancient_debris",
            "minecraft:amethyst_shard", "minecraft:flint");

    /** 終わった理由 */
    public static final String REASON_TIMEOUT = "timeout";
    public static final String REASON_PLAYER_DIED = "player_died";
    public static final String REASON_USER = "user_abort";
    public static final String REASON_COUNTDOWN_CANCELLED = "countdown_cancelled";
    public static final String REASON_WORLD_CLOSED = "world_closed";
    public static final String REASON_PLAYER_LEFT = "player_left";
    public static final String REASON_ERROR = "error";

    private final String sessionId;
    private final String target;
    private final int targetCount;
    private final int durationSeconds;
    private State state = State.COUNTDOWN;
    private int countdownTicks = COUNTDOWN_SECONDS * TICKS_PER_SECOND;
    private int remainingTicks;
    /** RUNNING だった tick の数（結果に出す「かかった時間」） */
    private int elapsedTicks;
    private int mined;
    private int support;
    /** 支援で出した数（拾う前のものも含む。上限はこれで決める） */
    private int supportSpawned;
    private String failureReason;
    /** テスト用の操作（進み具合・残り時間を直接変えた）を使った挑戦 */
    private boolean test;
    /** 変わるたびに増える番号（アプリが古い知らせを見分けるため） */
    private long seq;

    private MiningChallenge(String sessionId, String target, int targetCount, int durationSeconds) {
        this.sessionId = sessionId;
        this.target = target;
        this.targetCount = targetCount;
        this.durationSeconds = durationSeconds;
        this.remainingTicks = durationSeconds * TICKS_PER_SECOND;
    }

    /**
     * 新しい挑戦を作る（3秒のカウントダウンから）。範囲の外の値は丸めずに断る
     * @throws IllegalArgumentException 資源・目標数・制限時間がおかしいとき（画面に出せる文）
     */
    public static MiningChallenge create(String sessionId, String target, int targetCount, int durationSeconds) {
        if (!TARGETS.contains(target)) {
            throw new IllegalArgumentException("選択中の対象アイテムは使えません。別の対象を選んでください");
        }
        if (targetCount < MIN_TARGET || targetCount > MAX_TARGET) {
            throw new IllegalArgumentException("目標数は" + MIN_TARGET + "〜" + MAX_TARGET + "の整数にしてください");
        }
        if (durationSeconds < MIN_SECONDS || durationSeconds > MAX_SECONDS) {
            throw new IllegalArgumentException("制限時間は" + MIN_SECONDS + "〜" + MAX_SECONDS + "秒にしてください");
        }
        return new MiningChallenge(sessionId, target, targetCount, durationSeconds);
    }

    /** 1 tick 進める。RUNNING の間だけ残り時間が減る（PAUSED や終わったあとは何もしない） */
    public TickResult tick() {
        if (state == State.COUNTDOWN) {
            countdownTicks--;
            seq++;
            if (countdownTicks <= 0) {
                state = State.RUNNING;
                return TickResult.STARTED;
            }
            return countdownTicks % TICKS_PER_SECOND == 0 ? TickResult.COUNTDOWN_SECOND : TickResult.NONE;
        }
        if (state != State.RUNNING) {
            return TickResult.NONE;
        }
        remainingTicks--;
        elapsedTicks++;
        seq++;
        if (remainingTicks <= 0) {
            remainingTicks = 0;
            finish(State.FAILED, REASON_TIMEOUT);
            return TickResult.TIMED_OUT;
        }
        return TickResult.NONE;
    }

    /**
     * 拾った分を進み具合に足す。RUNNING のときだけ。支援の分は上限まで。目標に届いたら SUCCEEDED にする（1回だけ）
     * @return 実際に足した数
     */
    public int credit(Source source, int amount) {
        if (state != State.RUNNING || amount <= 0) {
            return 0;
        }
        int added = amount;
        if (source == Source.SUPPORT) {
            added = Math.min(added, supportLimit() - support);
            if (added <= 0) {
                return 0;
            }
            support += added;
        } else {
            mined += added;
        }
        seq++;
        if (progress() >= targetCount) {
            finish(State.SUCCEEDED, null);
        }
        return added;
    }

    /**
     * ギフトの支援で、いくつ出してよいか（1回 16 個まで・挑戦全体で目標数の4分の1まで）。出す分を数えておく
     * @return 出してよい数（0 なら出さない）
     */
    public int reserveSupport(int requested) {
        if (state != State.RUNNING) {
            return 0;
        }
        int allowed = Math.max(0, Math.min(Math.min(requested, MAX_SUPPORT_PER_EVENT), supportLimit() - supportSpawned));
        supportSpawned += allowed;
        return allowed;
    }

    /** 支援で進められる上限 */
    public int supportLimit() {
        return Math.max(1, targetCount / SUPPORT_SHARE_DIVISOR);
    }

    /** @return 一時停止できたか（RUNNING のときだけ） */
    public boolean pause() {
        if (state != State.RUNNING) {
            return false;
        }
        state = State.PAUSED;
        seq++;
        return true;
    }

    /** @return 再開できたか（PAUSED のときだけ。カウントダウンはせず、残り時間から続ける） */
    public boolean resume() {
        if (state != State.PAUSED) {
            return false;
        }
        state = State.RUNNING;
        seq++;
        return true;
    }

    /** 中止する（カウントダウン中なら開始の取り消し）。@return 中止できたか（もう終わっていれば false） */
    public boolean abort(String reason) {
        if (!state.active()) {
            return false;
        }
        finish(State.ABORTED, state == State.COUNTDOWN && REASON_USER.equals(reason) ? REASON_COUNTDOWN_CANCELLED : reason);
        return true;
    }

    /** 失敗にする（やられたなど）。@return 失敗にできたか（RUNNING / PAUSED のときだけ） */
    public boolean fail(String reason) {
        if (state != State.RUNNING && state != State.PAUSED) {
            return false;
        }
        finish(State.FAILED, reason);
        return true;
    }

    /** テスト用: 進み具合を n にする（採掘の分として）。目標に届けば成功 */
    public void testSetProgress(int n) {
        if (state != State.RUNNING) {
            return;
        }
        test = true;
        mined = Math.max(0, n - support);
        seq++;
        if (progress() >= targetCount) {
            finish(State.SUCCEEDED, null);
        }
    }

    /** テスト用: 残り時間を seconds 秒にする（時間切れを試す） */
    public void testSetRemaining(int seconds) {
        if (state != State.RUNNING && state != State.PAUSED) {
            return;
        }
        test = true;
        remainingTicks = Math.max(1, seconds * TICKS_PER_SECOND);
        seq++;
    }

    private void finish(State end, String reason) {
        state = end;
        failureReason = reason;
        seq++;
    }

    public String sessionId() {
        return sessionId;
    }

    public String target() {
        return target;
    }

    public int targetCount() {
        return targetCount;
    }

    public State state() {
        return state;
    }

    /** 進み具合（採掘＋支援）。目標を超えて拾っても、そのまま数える（表示では目標で止める） */
    public int progress() {
        return mined + support;
    }

    public int mined() {
        return mined;
    }

    public int support() {
        return support;
    }

    public int durationSeconds() {
        return durationSeconds;
    }

    /** 残り秒数（切り上げ。表示用） */
    public int remainingSeconds() {
        return (remainingTicks + TICKS_PER_SECOND - 1) / TICKS_PER_SECOND;
    }

    public int remainingTicks() {
        return remainingTicks;
    }

    /** カウントダウンの残り秒数（切り上げ） */
    public int countdownSecondsLeft() {
        return state == State.COUNTDOWN ? (countdownTicks + TICKS_PER_SECOND - 1) / TICKS_PER_SECOND : 0;
    }

    public int elapsedSeconds() {
        return elapsedTicks / TICKS_PER_SECOND;
    }

    public String failureReason() {
        return failureReason;
    }

    public boolean test() {
        return test;
    }

    public long seq() {
        return seq;
    }
}
