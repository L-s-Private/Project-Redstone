package com.staticarc;

import com.google.gson.JsonObject;
import com.staticarc.action.ActionExecutor;
import com.staticarc.action.FillGameManager;
import com.staticarc.action.MiningManager;
import com.staticarc.action.SafeBlasts;
import com.staticarc.action.Sounds;
import com.staticarc.game.FillGame;
import com.staticarc.bridge.ActionRequest;
import com.staticarc.bridge.BridgeServer;
import com.staticarc.bridge.InvalidRequestException;
import net.fabricmc.api.ModInitializer;
import net.fabricmc.loader.api.FabricLoader;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerEntityEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerLifecycleEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.fabricmc.fabric.api.entity.event.v1.ServerLivingEntityEvents;
import net.fabricmc.fabric.api.entity.event.v1.ServerPlayerEvents;
import net.fabricmc.fabric.api.event.player.AttackBlockCallback;
import net.fabricmc.fabric.api.event.player.PlayerBlockBreakEvents;
import net.fabricmc.fabric.api.event.player.UseBlockCallback;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.InteractionResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * ワールドが開いている間だけ、アプリ用の待ち受けを立てる。
 * シングルプレイでもワールド内部ではサーバーが動くので、同じ仕組みで動く。
 */
public class StaticArcMod implements ModInitializer {

    public static final int PORT = 25599;
    /** 妨害を出し終わるまで待つ秒数。これを過ぎたら出さずに「失敗」と答える（アプリの待ち時間 15 秒より短く） */
    private static final int EXECUTE_TIMEOUT_SECONDS = 5;
    /** この MOD の版（アプリが、入っている MOD が古くないか確かめるのに使う） */
    private static final String VERSION = FabricLoader.getInstance().getModContainer("static_arc")
            .map(mod -> mod.getMetadata().getVersion().getFriendlyString()).orElse("");

    private static final Logger LOGGER = LoggerFactory.getLogger("static-arc");

    /** これだけ続けて（1秒ぶん）失敗したら、埋め立てを終える */
    private static final int MAX_TICK_ERRORS = 20;

    private BridgeServer bridge;
    /** 続けて失敗している tick の数 */
    private static int tickErrors;
    /** 同じエラーでログがあふれないよう、続けて起きている間は5秒に1回だけ書く */
    private static long lastTickErrorLoggedAt;
    /** 採掘チャレンジの tick で続けて失敗している数 */
    private static int miningTickErrors;

    @Override
    public void onInitialize() {
        ServerLifecycleEvents.SERVER_STARTED.register(server -> {
            MiningManager.onServerStarted();
            startBridge(server);
        });
        ServerLifecycleEvents.SERVER_STOPPING.register(server -> {
            stopBridge();
            // 採掘チャレンジ中なら中止にする（次にワールドを開いても続きからは始めない）
            MiningManager.onServerStopping(server);
            SafeBlasts.reset();
            FillGameManager.stop(server);
            // 操作禁止・夜など、ワールドをまたいで残ってはいけないものも消す（別のワールドを開いたときに持ち越さない）
            FillGameManager.reset();
            Sounds.reset();
        });
        ServerTickEvents.END_SERVER_TICK.register(StaticArcMod::tick);
        // やられて生き返ったら、埋め立て中のステージに戻す
        ServerPlayerEvents.AFTER_RESPAWN.register((oldPlayer, newPlayer, alive) -> FillGameManager.onRespawn(newPlayer));
        // 埋め立て中にマイクラが閉じていたら、入ったときに元に戻す
        ServerPlayerEvents.JOIN.register(FillGameManager::onJoin);
        // 「モブに攻撃される」で始めたプレイヤーは、モブからの攻撃でだけダメージを受ける
        ServerLivingEntityEvents.ALLOW_DAMAGE.register((entity, source, amount) -> FillGameManager.allowDamage(entity, source));
        // 採掘チャレンジ中にやられたら失敗
        ServerLivingEntityEvents.AFTER_DEATH.register((entity, source) -> MiningManager.onDeath(entity));
        // 前の採掘チャレンジ（マイクラが落ちたなど）で出したまま残っている TNT・モブは、読み込まれたときに消す
        ServerEntityEvents.ENTITY_LOAD.register((entity, level) -> MiningManager.onEntityLoad(entity));
        // 埋め立て中は、枠より上にブロックを置かせない（クライアント側でも止めるので、置いた瞬間に消える見た目にならない）。
        // 置けるときは、手に持つブロックを置かれるブロックへ差し替えるために場所を覚えておく
        UseBlockCallback.EVENT.register((player, level, hand, hit) -> {
            // 埋め立て中は、枠の中にしか置けない（枠の外・枠より上は断る）
            if (!FillGameManager.canPlace(level, hit)) {
                return InteractionResult.FAIL;
            }
            FillGameManager.rememberPlacement(level, hit);
            return InteractionResult.PASS;
        });
        // 枠（壁と床）は手で壊させない。叩いた時点で止め、念のため壊す直前にも止める
        AttackBlockCallback.EVENT.register((player, level, hand, pos, direction) ->
                FillGameManager.isFrame(pos) ? InteractionResult.FAIL : InteractionResult.PASS);
        PlayerBlockBreakEvents.BEFORE.register((level, player, pos, state, blockEntity) -> !FillGameManager.isFrame(pos));
    }

    private void startBridge(MinecraftServer server) {
        try {
            bridge = BridgeServer.start(PORT, request -> handle(server, request));
            LOGGER.info("アプリの接続を待っています: 127.0.0.1:{}", PORT);
        } catch (IOException e) {
            LOGGER.error("ポート {} を開けませんでした。ほかのソフトが使っていないか確認してください", PORT, e);
        }
    }

    private void stopBridge() {
        if (bridge != null) {
            bridge.close();
            bridge = null;
        }
    }

    private static JsonObject handle(MinecraftServer server, ActionRequest request) throws InvalidRequestException {
        int players = server.getPlayerCount();
        if (request.type() == ActionRequest.Type.PING) {
            JsonObject status = new JsonObject();
            status.addProperty("players", players);
            status.addProperty("version", VERSION);
            status.add("fill", fillStatus());
            status.add("mining", MiningManager.status());
            status.add("player", MiningManager.playerInfo());
            if (!MiningManager.unavailable().isEmpty()) {
                status.add("miningUnavailable", MiningManager.unavailableJson());
            }
            return status;
        }
        if (players == 0) {
            throw new InvalidRequestException("ワールドにプレイヤーがいません");
        }
        if (ActionRequest.NEEDS_FILL_GAME.contains(request.type()) && !FillGameManager.running()) {
            throw new InvalidRequestException("埋め立てが始まっていません");
        }
        // ゲームの中で本当に出せたかを確かめてから答える（出なかったものを「出した」と数えないため）
        CompletableFuture<String> result = new CompletableFuture<>();
        // 時間切れで「出せなかった」と答えたあとに、遅れて出ないようにする（どちらか先に取った方だけが進む）
        AtomicBoolean claimed = new AtomicBoolean();
        server.execute(() -> {
            if (!claimed.compareAndSet(false, true)) {
                return;
            }
            // 妨害1つの失敗で、マイクラが止まらないようにする（ログに残して次へ）
            try {
                result.complete(ActionExecutor.execute(server, request));
            } catch (RuntimeException e) {
                LOGGER.error("妨害を出せませんでした: {}", request.type(), e);
                result.complete("マイクラの中でエラーが起きて、出せませんでした");
            }
        });
        String problem;
        try {
            problem = result.get(EXECUTE_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            if (claimed.compareAndSet(false, true)) {
                throw new InvalidRequestException("マイクラが応答しないので、出しませんでした");
            }
            // ちょうど始まったところなので、終わるのを待つ
            problem = result.join();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new InvalidRequestException("マイクラが終了中です");
        } catch (ExecutionException e) {
            throw new InvalidRequestException("マイクラの中でエラーが起きて、出せませんでした");
        }
        if (problem != null) {
            throw new InvalidRequestException(problem);
        }
        return null;
    }

    /**
     * 毎 tick の処理。ここで例外が出るとマイクラごと落ちるので、受け止めてログに残す。
     * 続けて失敗するなら、埋め立てを終えてプレイヤーを元に戻す（落ちるよりはよい）
     */
    private static void tick(MinecraftServer server) {
        try {
            FillGameManager.onServerTick(server);
            tickErrors = 0;
        } catch (RuntimeException e) {
            long now = System.currentTimeMillis();
            if (now - lastTickErrorLoggedAt > 5000) {
                lastTickErrorLoggedAt = now;
                LOGGER.error("埋め立ての処理でエラーが起きました", e);
            }
            if (++tickErrors >= MAX_TICK_ERRORS) {
                tickErrors = 0;
                LOGGER.error("エラーが続くので、埋め立てを終えます");
                try {
                    FillGameManager.stop(server);
                } catch (RuntimeException stopError) {
                    LOGGER.error("埋め立てを終えられませんでした", stopError);
                }
            }
        }
        // 採掘チャレンジは埋め立てと別に動かす（片方のエラーで、もう片方を止めない）
        try {
            SafeBlasts.tick();
            MiningManager.tick(server);
            miningTickErrors = 0;
        } catch (RuntimeException e) {
            if (++miningTickErrors == 1) {
                LOGGER.error("採掘チャレンジの処理でエラーが起きました", e);
            }
            if (miningTickErrors >= MAX_TICK_ERRORS) {
                miningTickErrors = 0;
                LOGGER.error("エラーが続くので、採掘チャレンジを中止します");
                try {
                    MiningManager.abortOnError(server, e);
                } catch (RuntimeException abortError) {
                    LOGGER.error("採掘チャレンジを中止できませんでした", abortError);
                }
            }
        }
    }

    private static JsonObject fillStatus() {
        FillGame.Status status = FillGameManager.status();
        if (status == null) {
            return null;
        }
        JsonObject json = new JsonObject();
        json.addProperty("phase", status.phase().name().toLowerCase());
        json.addProperty("filled", status.filled());
        json.addProperty("total", status.total());
        json.addProperty("percent", status.percent());
        json.addProperty("width", status.width());
        json.addProperty("height", status.height());
        json.addProperty("countdownSecondsLeft", status.countdownSecondsLeft());
        json.addProperty("countdownSeconds", status.countdownSeconds());
        json.addProperty("round", status.round());
        json.addProperty("rounds", status.rounds());
        return json;
    }
}
