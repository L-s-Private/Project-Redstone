package com.projectredstone.game;

/**
 * 埋め立ての進み具合が変わったときに鳴らす音の合図。Minecraft に依存しない（どの音を鳴らすかは action/Sounds）。
 * 0.5秒ごとの確認の前後の状態を比べて決める。ラウンドが変わったとき（クリア）は別に鳴らすので、ここでは何もしない。
 */
public record SoundCue(Kind kind, int seconds) {

    public enum Kind {
        /** 埋めきって、カウントダウンが始まった */
        COUNTDOWN_START,
        /** カウントダウンが1秒進んだ（seconds は残り秒数） */
        COUNTDOWN_TICK,
        /** カウントダウン中に崩されて、埋め立てに戻った */
        COUNTDOWN_BROKEN
    }

    /** @return 鳴らす合図。なければ null */
    public static SoundCue between(FillGame.Status before, FillGame.Status after) {
        if (before == null || after == null || before.round() != after.round()) {
            return null;
        }
        FillGame.Phase from = before.phase();
        FillGame.Phase to = after.phase();
        if (from == FillGame.Phase.FILLING && to == FillGame.Phase.COUNTDOWN) {
            return new SoundCue(Kind.COUNTDOWN_START, after.countdownSecondsLeft());
        }
        if (from == FillGame.Phase.COUNTDOWN && to == FillGame.Phase.COUNTDOWN
                && after.countdownSecondsLeft() < before.countdownSecondsLeft()) {
            return new SoundCue(Kind.COUNTDOWN_TICK, after.countdownSecondsLeft());
        }
        if (from == FillGame.Phase.COUNTDOWN && to == FillGame.Phase.FILLING) {
            return new SoundCue(Kind.COUNTDOWN_BROKEN, 0);
        }
        return null;
    }
}
