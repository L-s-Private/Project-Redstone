package com.projectredstone.action;

import com.projectredstone.bridge.ActionRequest;
import com.projectredstone.game.SoundCue;
import net.minecraft.core.Holder;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.entity.Entity;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * 効果音。妨害が届いたとき・埋め立ての山場（カウントダウン・クリアなど）で、マイクラにもともとある音を鳴らす。
 * 配信で目立つよう、1つの場面で何個かの音を重ねたり、少しずつずらして続けて鳴らしたりする（花火は「打ち上げ → 爆発 → キラキラ」）。
 * どのプレイヤーにも、その人の位置で鳴らす（配信者には必ず聞こえる）。雷はもともと音が出るので足さない。
 * サーバースレッドから呼ぶこと。ずらして鳴らす音は tick() で鳴らす。
 */
public final class Sounds {

    private Sounds() {
    }

    /** あとで鳴らす音（delay は tick。20 tick で1秒） */
    private record Pending(long due, Holder<SoundEvent> sound, float volume, float pitch) {
    }

    private static final List<Pending> pending = new ArrayList<>();
    private static long ticks;
    /** 予約しておける音の数（ギフトが一度に大量に来ても、音だらけで重くならないように） */
    private static final int MAX_PENDING = 64;
    /** 同じ妨害の音は、この tick 以上あけて鳴らす（連打で何十個も重ならないように） */
    private static final int SAME_ACTION_GAP_TICKS = 4;
    private static final Map<ActionRequest.Type, Long> lastActionSound = new EnumMap<>(ActionRequest.Type.class);

    /** ワールドを閉じたとき: 予約していた音を捨てる */
    public static void reset() {
        pending.clear();
        lastActionSound.clear();
    }

    /** 毎 tick 呼ぶ。ずらして鳴らす音のうち、時間が来たものを鳴らす */
    public static void tick(MinecraftServer server) {
        ticks++;
        if (pending.isEmpty()) {
            return;
        }
        for (var it = pending.iterator(); it.hasNext(); ) {
            Pending p = it.next();
            if (p.due() <= ticks) {
                toAll(server, p.sound(), p.volume(), p.pitch());
                it.remove();
            }
        }
    }

    /** 妨害・お助けが届いたときの音 */
    public static void forAction(MinecraftServer server, ActionRequest.Type type) {
        Long last = lastActionSound.get(type);
        if (last != null && ticks - last < SAME_ACTION_GAP_TICKS) {
            return;
        }
        lastActionSound.put(type, ticks);
        switch (type) {
            case TNT -> {
                // 「ピピピッ」と警報を鳴らしてから TNT（導火線と爆発はもともと鳴る）
                for (int i = 0; i < 3; i++) {
                    later(server, i * 3, SoundEvents.NOTE_BLOCK_BIT, 1.0f, 2.0f);
                }
            }
            case MOB -> {
                now(server, SoundEvents.TRIAL_SPAWNER_SPAWN_MOB, 1.0f, 1.0f);
                now(server, SoundEvents.EVOKER_PREPARE_SUMMON, 1.0f, 1.0f);
                later(server, 6, SoundEvents.EVOKER_CAST_SPELL, 1.0f, 0.8f);
            }
            case JAIL -> {
                // パトカーのような角笛 → 鉄格子が「ガシャン」
                now(server, SoundEvents.RAID_HORN, 1.0f, 1.2f);
                now(server, SoundEvents.IRON_DOOR_CLOSE, 1.0f, 0.7f);
                later(server, 8, SoundEvents.ANVIL_LAND, 0.8f, 0.7f);
                later(server, 10, SoundEvents.IRON_DOOR_CLOSE, 1.0f, 0.5f);
            }
            case FREEZE -> {
                now(server, SoundEvents.POWDER_SNOW_BREAK, 1.0f, 0.6f);
                now(server, SoundEvents.PLAYER_HURT_FREEZE, 1.0f, 0.8f);
                later(server, 4, SoundEvents.GLASS_BREAK, 1.0f, 0.6f);
            }
            case LEVITATE -> {
                now(server, SoundEvents.BREEZE_WIND_CHARGE_BURST, 1.0f, 1.0f);
                now(server, SoundEvents.SHULKER_SHOOT, 1.0f, 1.0f);
                later(server, 5, SoundEvents.SHULKER_BULLET_HIT, 1.0f, 1.2f);
            }
            case NIGHT -> {
                // 不気味な音 → 鐘が3回「ゴーン」
                now(server, SoundEvents.ELDER_GUARDIAN_CURSE, 0.8f, 0.8f);
                for (int i = 0; i < 3; i++) {
                    later(server, 6 + i * 12, SoundEvents.BELL_BLOCK, 1.0f, 0.6f);
                }
            }
            case FILL_EXPAND, FILL_RAISE -> {
                now(server, SoundEvents.MACE_SMASH_GROUND_HEAVY, 1.0f, 0.8f);
                now(server, SoundEvents.PISTON_EXTEND, 1.0f, 0.6f);
                later(server, 4, SoundEvents.PISTON_EXTEND, 1.0f, 0.8f);
            }
            case FILL_SHRINK -> {
                now(server, SoundEvents.PISTON_CONTRACT, 1.0f, 0.8f);
                arpeggio(server, SoundEvents.NOTE_BLOCK_CHIME, 2, 1.0f, 1.26f, 1.5f);
            }
            case FILL_CLEAR -> {
                // 全消しはいちばん派手に: ウィザーの出現音＋爆発＋ガラスが割れる
                now(server, SoundEvents.WITHER_SPAWN, 0.8f, 1.0f);
                now(server, SoundEvents.GENERIC_EXPLODE, 1.0f, 0.8f);
                later(server, 4, SoundEvents.GLASS_BREAK, 1.0f, 0.8f);
                later(server, 8, SoundEvents.GENERIC_EXPLODE, 0.8f, 0.6f);
            }
            case FILL_HELP, MINING_BONUS_DROP -> {
                now(server, SoundEvents.EXPERIENCE_ORB_PICKUP, 1.0f, 1.0f);
                arpeggio(server, SoundEvents.NOTE_BLOCK_CHIME, 2, 1.0f, 1.26f, 1.5f, 2.0f);
            }
            case FILL_LAYER -> {
                now(server, SoundEvents.TOTEM_USE, 0.8f, 1.2f);
                later(server, 4, SoundEvents.PLAYER_LEVELUP, 1.0f, 1.5f);
            }
            case MESSAGE -> arpeggio(server, SoundEvents.NOTE_BLOCK_PLING, 2, 1.0f, 1.26f, 1.5f, 2.0f);
            case FILL_START -> {
                now(server, SoundEvents.END_PORTAL_SPAWN, 0.7f, 1.0f);
                now(server, SoundEvents.BEACON_ACTIVATE, 1.0f, 1.0f);
            }
            case FILL_STOP -> now(server, SoundEvents.BEACON_DEACTIVATE, 1.0f, 1.0f);
            case LIGHTNING, FILL_SET, WORLD, PING, MINING_START, MINING_PAUSE, MINING_RESUME, MINING_ABORT, MINING_TEST -> {
            }
        }
    }

    /** 埋め立ての進み具合が変わったときの音 */
    public static void forCue(MinecraftServer server, SoundCue cue) {
        switch (cue.kind()) {
            case COUNTDOWN_START -> {
                now(server, SoundEvents.BELL_BLOCK, 1.0f, 1.0f);
                arpeggio(server, SoundEvents.NOTE_BLOCK_CHIME, 2, 1.0f, 1.26f, 1.5f, 2.0f);
            }
            case COUNTDOWN_TICK -> countdownTick(server, cue.seconds());
            case COUNTDOWN_BROKEN -> {
                // 「ガシャーン」→「ブッブー」
                now(server, SoundEvents.ANVIL_DESTROY, 1.0f, 0.8f);
                now(server, SoundEvents.NOTE_BLOCK_BASS, 1.0f, 0.6f);
                later(server, 5, SoundEvents.NOTE_BLOCK_BASS, 1.0f, 0.5f);
            }
        }
    }

    /** カウントダウンの1秒ごとに「ドン」。残り5秒からは「ピッ」も重ね、だんだん高くする（カウントダウンもゆっくりになる） */
    private static void countdownTick(MinecraftServer server, int secondsLeft) {
        if (secondsLeft <= 0) {
            return;
        }
        now(server, SoundEvents.NOTE_BLOCK_BASEDRUM, 1.0f, 0.8f);
        if (secondsLeft <= 5) {
            float pitch = 0.8f + (5 - secondsLeft) * 0.2f;
            now(server, SoundEvents.NOTE_BLOCK_PLING, 1.0f, pitch);
            now(server, SoundEvents.NOTE_BLOCK_XYLOPHONE, 0.8f, pitch);
        } else {
            now(server, SoundEvents.NOTE_BLOCK_HAT, 0.8f, 1.0f);
        }
    }

    /** ラウンドクリア: ファンファーレと花火。最後のラウンドは花火を多く */
    public static void roundCleared(MinecraftServer server, boolean last) {
        now(server, SoundEvents.UI_TOAST_CHALLENGE_COMPLETE, 1.0f, 1.0f);
        now(server, SoundEvents.PLAYER_LEVELUP, 1.0f, 1.0f);
        int fireworks = last ? 6 : 2;
        for (int i = 0; i < fireworks; i++) {
            firework(server, i * 8);
        }
        if (last) {
            later(server, 10, SoundEvents.TOTEM_USE, 0.8f, 1.0f);
        }
    }

    /** 花火1発: 打ち上げ → 爆発 → キラキラ */
    private static void firework(MinecraftServer server, int delay) {
        later(server, delay, SoundEvents.FIREWORK_ROCKET_LAUNCH, 1.0f, 1.0f);
        later(server, delay + 14, SoundEvents.FIREWORK_ROCKET_LARGE_BLAST, 1.0f, 1.0f);
        later(server, delay + 20, SoundEvents.FIREWORK_ROCKET_TWINKLE_FAR, 1.0f, 1.0f);
    }

    // ---- 採掘チャレンジ ----

    /** 開始のカウントダウン「3・2・1」 */
    public static void miningCountdown(MinecraftServer server) {
        now(server, SoundEvents.NOTE_BLOCK_BASEDRUM, 1.0f, 0.8f);
        now(server, SoundEvents.NOTE_BLOCK_PLING, 1.0f, 1.0f);
    }

    /** スタート！ */
    public static void miningStarted(MinecraftServer server) {
        now(server, SoundEvents.NOTE_BLOCK_PLING, 1.0f, 2.0f);
        now(server, SoundEvents.BEACON_ACTIVATE, 1.0f, 1.2f);
    }

    /** 対象のアイテムを拾って進んだ（拾った本人にだけ、小さく） */
    public static void miningCredit(ServerPlayer player) {
        play(player, SoundEvents.NOTE_BLOCK_CHIME, 0.6f, 1.6f);
    }

    /** 残り10秒からの1秒ごと。だんだん高くする */
    public static void miningLastSeconds(MinecraftServer server, int secondsLeft) {
        now(server, SoundEvents.NOTE_BLOCK_HAT, 1.0f, 1.0f + (10 - secondsLeft) * 0.1f);
    }

    /** 時間切れ・やられた: 「ガシャーン」→「ブッブー」 */
    public static void miningFailed(MinecraftServer server) {
        now(server, SoundEvents.ANVIL_DESTROY, 1.0f, 0.8f);
        now(server, SoundEvents.NOTE_BLOCK_BASS, 1.0f, 0.6f);
        later(server, 5, SoundEvents.NOTE_BLOCK_BASS, 1.0f, 0.5f);
    }

    /** 逮捕・操作禁止が解けたとき */
    public static void released(ServerPlayer player, boolean fromJail) {
        if (fromJail) {
            play(player, SoundEvents.IRON_DOOR_OPEN, 1.0f, 1.0f);
            play(player, SoundEvents.NOTE_BLOCK_CHIME, 1.0f, 1.5f);
        } else {
            play(player, SoundEvents.GLASS_BREAK, 1.0f, 1.2f);
        }
    }

    /** 枠の上に戻されたとき（落ちたとき・やられたとき） */
    public static void returned(ServerPlayer player) {
        play(player, SoundEvents.ENDERMAN_TELEPORT, 1.0f, 1.0f);
    }

    /** モブが時間で消えたとき（モブの位置で小さく） */
    public static void mobVanished(Entity mob) {
        mob.level().playSound(null, mob.getX(), mob.getY(), mob.getZ(), SoundEvents.FIRE_EXTINGUISH, SoundSource.HOSTILE, 0.5f, 1.6f);
    }

    /** 音を少しずつ上げながら続けて鳴らす（「ポロロン」） */
    private static void arpeggio(MinecraftServer server, Holder<SoundEvent> sound, int step, float... pitches) {
        for (int i = 0; i < pitches.length; i++) {
            later(server, i * step, sound, 1.0f, pitches[i]);
        }
    }

    private static void now(MinecraftServer server, SoundEvent sound, float volume, float pitch) {
        toAll(server, holder(sound), volume, pitch);
    }

    private static void now(MinecraftServer server, Holder<SoundEvent> sound, float volume, float pitch) {
        toAll(server, sound, volume, pitch);
    }

    private static void later(MinecraftServer server, int delay, SoundEvent sound, float volume, float pitch) {
        later(server, delay, holder(sound), volume, pitch);
    }

    private static void later(MinecraftServer server, int delay, Holder<SoundEvent> sound, float volume, float pitch) {
        if (delay <= 0) {
            toAll(server, sound, volume, pitch);
        } else {
            if (pending.size() < MAX_PENDING) {
                pending.add(new Pending(ticks + delay, sound, volume, pitch));
            }
        }
    }

    private static Holder<SoundEvent> holder(SoundEvent sound) {
        return BuiltInRegistries.SOUND_EVENT.wrapAsHolder(sound);
    }

    private static void toAll(MinecraftServer server, Holder<SoundEvent> sound, float volume, float pitch) {
        for (ServerPlayer player : server.getPlayerList().getPlayers()) {
            play(player, sound, volume, pitch);
        }
    }

    private static void play(ServerPlayer player, SoundEvent sound, float volume, float pitch) {
        play(player, holder(sound), volume, pitch);
    }

    private static void play(ServerPlayer player, Holder<SoundEvent> sound, float volume, float pitch) {
        player.level().playSound(null, player.getX(), player.getY(), player.getZ(), sound, SoundSource.MASTER, volume, pitch);
    }
}
