package com.projectredstone;

import com.google.gson.JsonObject;
import com.projectredstone.action.ActionExecutor;
import com.projectredstone.action.FillGameManager;
import com.projectredstone.game.FillGame;
import com.projectredstone.bridge.ActionRequest;
import com.projectredstone.bridge.BridgeServer;
import com.projectredstone.bridge.InvalidRequestException;
import net.fabricmc.api.ModInitializer;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerLifecycleEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.minecraft.server.MinecraftServer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;

/**
 * ワールドが開いている間だけ、アプリ用の待ち受けを立てる。
 * シングルプレイでもワールド内部ではサーバーが動くので、同じ仕組みで動く。
 */
public class RedstoneMod implements ModInitializer {

    public static final int PORT = 25599;

    private static final Logger LOGGER = LoggerFactory.getLogger("project-redstone");

    private BridgeServer bridge;

    @Override
    public void onInitialize() {
        ServerLifecycleEvents.SERVER_STARTED.register(this::startBridge);
        ServerLifecycleEvents.SERVER_STOPPING.register(server -> {
            stopBridge();
            FillGameManager.stop();
        });
        ServerTickEvents.END_SERVER_TICK.register(FillGameManager::onServerTick);
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
            status.add("fill", fillStatus());
            return status;
        }
        if (players == 0) {
            throw new InvalidRequestException("ワールドにプレイヤーがいません");
        }
        boolean needsGame = switch (request.type()) {
            case FILL_EXPAND, FILL_SHRINK, FILL_HELP, FILL_STOP -> true;
            default -> false;
        };
        if (needsGame && !FillGameManager.running()) {
            throw new InvalidRequestException("埋め立てが始まっていません");
        }
        server.execute(() -> ActionExecutor.execute(server, request));
        return null;
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
        return json;
    }
}
