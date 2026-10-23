package com.staticarc.action;

import com.staticarc.bridge.ActionRequest;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.level.gamerules.GameRules;

/**
 * ワールドの設定（昼に固定・天気・モブが自然に湧くか・死んでも持ち物が消えないか）。
 * 配信者がコマンドを打たなくて済むよう、アプリの画面から変える。必ずサーバースレッドから呼ぶこと。
 * 26.x のゲームルールは advance_time などの新しい名前（GameRules.ADVANCE_TIME）。
 */
public final class WorldSettings {

    private WorldSettings() {
    }

    public static void apply(MinecraftServer server, ActionRequest request) {
        GameRules rules = server.getGameRules();

        boolean timeRuns = request.time().equals("normal");
        rules.set(GameRules.ADVANCE_TIME, timeRuns, server);
        if (!timeRuns) {
            run(server, request.time().equals("day") ? "time set noon" : "time set midnight");
        }

        boolean weatherChanges = request.weather().equals("normal");
        rules.set(GameRules.ADVANCE_WEATHER, weatherChanges, server);
        if (!weatherChanges) {
            run(server, request.weather().equals("clear") ? "weather clear" : "weather rain");
        }

        rules.set(GameRules.SPAWN_MOBS, request.mobSpawning(), server);
        rules.set(GameRules.KEEP_INVENTORY, request.keepInventory(), server);
    }

    static void run(MinecraftServer server, String command) {
        server.getCommands().performPrefixedCommand(server.createCommandSourceStack().withSuppressedOutput(), command);
    }
}
