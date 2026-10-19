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
public record ActionRequest(String id, Type type, int count, String from, String label, String mob,
                            int width, int height, int countdown, String wall, String block, int skyY, int reach,
                            String placeSpeed, int percent) {

    public enum Type { PING, TNT, MOB, MESSAGE, FILL_START, FILL_STOP, FILL_EXPAND, FILL_SHRINK, FILL_HELP, FILL_SET }

    /** 1回の要求で出せる数の上限。配信中の事故とサーバー負荷を防ぐ。 */
    public static final Map<Type, Integer> MAX_COUNT = Map.of(
            Type.TNT, 20,
            Type.MOB, 10,
            Type.FILL_EXPAND, 5,
            Type.FILL_SHRINK, 5,
            Type.FILL_HELP, 64);

    public static final Set<String> ALLOWED_MOBS = Set.of("zombie", "skeleton", "creeper", "spider", "witch", "silverfish", "pig");

    /** 埋め立ての枠の既定値（「/bedrock create 11 9」の例に合わせる） */
    public static final int DEFAULT_WIDTH = 11;
    public static final int DEFAULT_HEIGHT = 9;
    public static final int DEFAULT_COUNTDOWN = 10;

    /** 枠の素材。配信でよく見るのはガラス */
    public static final Set<String> ALLOWED_WALLS = Set.of("glass", "white_stained_glass", "light_blue_stained_glass", "bedrock");
    /** 埋めるブロック。音や見た目のよいものを選べるようにする */
    public static final Set<String> ALLOWED_BLOCKS = Set.of("amethyst_block", "diamond_block", "emerald_block", "gold_block",
            "iron_block", "lapis_block", "redstone_block", "quartz_block");
    public static final String DEFAULT_WALL = "glass";
    public static final String DEFAULT_BLOCK = "amethyst_block";
    /** 枠を作る高さ（天空）。ワールドの高さに収まるよう、実行側で丸める */
    public static final int DEFAULT_SKY_Y = 150;
    /** ブロックを置ける距離。バニラは 4.5（クリエイティブは 5） */
    public static final int DEFAULT_REACH = 8;
    public static final int MAX_REACH = 64;
    /** ブロックを置く速さ。押しっぱなしで置ける間隔（tick）。バニラは 4（1秒に5個） */
    public static final Map<String, Integer> PLACE_DELAY_TICKS = Map.of("normal", 4, "fast", 2, "fastest", 1);
    public static final String DEFAULT_PLACE_SPEED = "fast";

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

        if (type == Type.MESSAGE && label.isEmpty()) {
            throw new InvalidRequestException("message には label が必要です");
        }

        // 枠の大きさの丸めは FillGame が行う
        int width = optInt(json, "width", DEFAULT_WIDTH);
        int height = optInt(json, "height", DEFAULT_HEIGHT);
        int countdown = optInt(json, "countdown", DEFAULT_COUNTDOWN);
        String wall = optString(json, "wall", DEFAULT_WALL);
        if (!ALLOWED_WALLS.contains(wall)) {
            throw new InvalidRequestException("未対応の枠の素材です: " + wall);
        }
        String block = optString(json, "block", DEFAULT_BLOCK);
        if (!ALLOWED_BLOCKS.contains(block)) {
            throw new InvalidRequestException("未対応のブロックです: " + block);
        }
        int skyY = optInt(json, "skyY", DEFAULT_SKY_Y);
        int reach = Math.max(1, Math.min(MAX_REACH, optInt(json, "reach", DEFAULT_REACH)));

        String placeSpeed = optString(json, "placeSpeed", DEFAULT_PLACE_SPEED);
        if (!PLACE_DELAY_TICKS.containsKey(placeSpeed)) {
            throw new InvalidRequestException("未対応の置く速さです: " + placeSpeed);
        }
        // fill_set（デバッグ用）: 埋める割合 0〜100
        int percent = Math.max(0, Math.min(100, optInt(json, "percent", 100)));

        return new ActionRequest(id, type, count, from, label, mob, width, height, countdown, wall, block, skyY, reach, placeSpeed, percent);
    }

    /** 押しっぱなしで次のブロックを置けるまでの tick 数 */
    public int placeDelayTicks() {
        return PLACE_DELAY_TICKS.get(placeSpeed);
    }

    private static Type parseType(String raw) throws InvalidRequestException {
        if (raw == null) {
            throw new InvalidRequestException("type がありません");
        }
        return switch (raw) {
            case "ping" -> Type.PING;
            case "tnt" -> Type.TNT;
            case "mob" -> Type.MOB;
            case "message" -> Type.MESSAGE;
            case "fill_start" -> Type.FILL_START;
            case "fill_stop" -> Type.FILL_STOP;
            case "fill_expand" -> Type.FILL_EXPAND;
            case "fill_shrink" -> Type.FILL_SHRINK;
            case "fill_help" -> Type.FILL_HELP;
            case "fill_set" -> Type.FILL_SET;
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
