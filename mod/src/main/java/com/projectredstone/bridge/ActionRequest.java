package com.projectredstone.bridge;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParseException;
import com.google.gson.JsonParser;

import java.util.Map;
import java.util.Set;

/**
 * アプリから届いた1件の要求。Minecraft に依存しないので単体テストできる。
 * 値の検証と上限の丸めはここで済ませ、実行側は信頼して使ってよい。
 */
public record ActionRequest(String id, Type type, int count, String from, String label, String mob, String block) {

    public enum Type { PING, TNT, MOB, BURY, MESSAGE, LIGHTNING, LAUNCH, HEAL }

    /** 1回の要求で出せる数の上限。配信中の事故とサーバー負荷を防ぐ。 */
    public static final Map<Type, Integer> MAX_COUNT = Map.of(
            Type.TNT, 20,
            Type.MOB, 10,
            Type.BURY, 5,
            Type.LIGHTNING, 5);

    public static final Set<String> ALLOWED_MOBS = Set.of("zombie", "skeleton", "creeper", "spider", "witch", "silverfish");
    public static final Set<String> ALLOWED_BURY_BLOCKS = Set.of("sand", "gravel");

    static final int MAX_FROM_LENGTH = 32;
    static final int MAX_LABEL_LENGTH = 100;

    public static ActionRequest parse(String line) throws InvalidRequestException {
        JsonObject json;
        try {
            JsonElement element = JsonParser.parseString(line);
            if (!element.isJsonObject()) {
                throw new InvalidRequestException("JSONオブジェクトではありません");
            }
            json = element.getAsJsonObject();
        } catch (JsonParseException e) {
            throw new InvalidRequestException("JSONとして読めません");
        }

        String id = optString(json, "id", "");
        Type type = parseType(optString(json, "type", null));
        String from = truncate(optString(json, "from", ""), MAX_FROM_LENGTH);
        String label = truncate(optString(json, "label", ""), MAX_LABEL_LENGTH);

        int count = 1;
        Integer max = MAX_COUNT.get(type);
        if (max != null) {
            count = Math.max(1, Math.min(max, optInt(json, "count", 1)));
        }

        String mob = null;
        if (type == Type.MOB) {
            mob = optString(json, "mob", "zombie");
            if (!ALLOWED_MOBS.contains(mob)) {
                throw new InvalidRequestException("未対応のモブです: " + mob);
            }
        }

        String block = null;
        if (type == Type.BURY) {
            block = optString(json, "block", "sand");
            if (!ALLOWED_BURY_BLOCKS.contains(block)) {
                throw new InvalidRequestException("未対応のブロックです: " + block);
            }
        }

        if (type == Type.MESSAGE && label.isEmpty()) {
            throw new InvalidRequestException("message には label が必要です");
        }

        return new ActionRequest(id, type, count, from, label, mob, block);
    }

    private static Type parseType(String raw) throws InvalidRequestException {
        if (raw == null) {
            throw new InvalidRequestException("type がありません");
        }
        return switch (raw) {
            case "ping" -> Type.PING;
            case "tnt" -> Type.TNT;
            case "mob" -> Type.MOB;
            case "bury" -> Type.BURY;
            case "message" -> Type.MESSAGE;
            case "lightning" -> Type.LIGHTNING;
            case "launch" -> Type.LAUNCH;
            case "heal" -> Type.HEAL;
            default -> throw new InvalidRequestException("未対応の type です: " + raw);
        };
    }

    private static String optString(JsonObject json, String key, String fallback) throws InvalidRequestException {
        JsonElement value = json.get(key);
        if (value == null || value.isJsonNull()) {
            return fallback;
        }
        if (!value.isJsonPrimitive() || !value.getAsJsonPrimitive().isString()) {
            throw new InvalidRequestException(key + " は文字列にしてください");
        }
        return value.getAsString();
    }

    private static int optInt(JsonObject json, String key, int fallback) throws InvalidRequestException {
        JsonElement value = json.get(key);
        if (value == null || value.isJsonNull()) {
            return fallback;
        }
        if (!value.isJsonPrimitive() || !value.getAsJsonPrimitive().isNumber()) {
            throw new InvalidRequestException(key + " は数値にしてください");
        }
        double number = value.getAsDouble();
        if (Double.isNaN(number)) {
            return fallback;
        }
        return (int) Math.max(Integer.MIN_VALUE, Math.min(Integer.MAX_VALUE, Math.floor(number)));
    }

    private static String truncate(String value, int maxLength) {
        return value.codePointCount(0, value.length()) <= maxLength
                ? value
                : value.substring(0, value.offsetByCodePoints(0, maxLength));
    }
}
