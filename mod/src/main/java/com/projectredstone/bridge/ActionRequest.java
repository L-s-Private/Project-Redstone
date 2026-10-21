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
                            String placeSpeed, int percent, int rounds, String breakSpeed, String handBlock,
                            boolean mobsAttack, String time, String weather, boolean mobSpawning, boolean keepInventory,
                            int mobLifetime) {

    public enum Type {
        PING, TNT, MOB, MESSAGE, FILL_START, FILL_STOP, FILL_EXPAND, FILL_SHRINK, FILL_HELP, FILL_SET, WORLD,
        JAIL, FREEZE, FILL_LAYER, FILL_CLEAR, LIGHTNING, LEVITATE, NIGHT, FILL_RAISE, STOP_ALL
    }

    /**
     * 1回の要求で出せる数の上限。配信中の事故とサーバー負荷を防ぐ。
     * count の意味は種類による: 逮捕・操作禁止・浮遊・夜は秒、一段埋め・枠を高くするは段、ほかは個数
     */
    public static final Map<Type, Integer> MAX_COUNT = Map.ofEntries(
            Map.entry(Type.TNT, 20),
            Map.entry(Type.MOB, 10),
            Map.entry(Type.FILL_EXPAND, 5),
            Map.entry(Type.FILL_SHRINK, 5),
            Map.entry(Type.FILL_HELP, 64),
            Map.entry(Type.JAIL, 60),
            Map.entry(Type.FREEZE, 30),
            Map.entry(Type.FILL_LAYER, 5),
            Map.entry(Type.LIGHTNING, 10),
            Map.entry(Type.LEVITATE, 15),
            Map.entry(Type.NIGHT, 300),
            Map.entry(Type.FILL_RAISE, 5));

    /** 埋め立て中でないと使えない種類 */
    public static final Set<Type> NEEDS_FILL_GAME = Set.of(Type.FILL_EXPAND, Type.FILL_SHRINK, Type.FILL_HELP, Type.FILL_SET, Type.FILL_STOP,
            Type.JAIL, Type.FILL_LAYER, Type.FILL_CLEAR, Type.FILL_RAISE);

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
    /**
     * 手でブロックを壊す速さ。押しっぱなしで次のブロックを壊せるまでの間隔（tick）。-1 はバニラのまま（素手だとアメジストで約7秒）。
     * 置く速さと同じく、fast は1秒に10個、fastest は20個。1個ずつは一瞬で壊れるようにする
     */
    public static final Map<String, Integer> BREAK_DELAY_TICKS = Map.of("normal", -1, "fast", 1, "fastest", 0);
    public static final String DEFAULT_BREAK_SPEED = "fast";
    /** 一瞬で壊れる掘る速さの倍率（ダイヤモンドブロックを素手で掘っても1tickで壊れる） */
    public static final double INSTANT_BREAK_SPEED = 1000.0;
    /** 何ラウンドでおしまいにするか */
    public static final int DEFAULT_ROUNDS = 10;
    public static final int MAX_ROUNDS = 99;
    /** 枠に出したモブが消えるまでの秒数（0 なら消えない） */
    public static final int DEFAULT_MOB_LIFETIME = 30;
    public static final int MAX_MOB_LIFETIME = 600;

    /** world: 時間の進み方。normal は進む（バニラ）、day・night はその時間で止める */
    public static final Set<String> ALLOWED_TIMES = Set.of("normal", "day", "night");
    /** world: 天気。normal は変わる（バニラ）、clear・rain はその天気で止める */
    public static final Set<String> ALLOWED_WEATHERS = Set.of("normal", "clear", "rain");

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
        // block は枠の中に実際に置かれるブロック（お助けもこれ）。handBlock は手に持つブロックで、置くと block に変わる
        String block = optString(json, "block", DEFAULT_BLOCK);
        if (!ALLOWED_BLOCKS.contains(block)) {
            throw new InvalidRequestException("未対応のブロックです: " + block);
        }
        String handBlock = optString(json, "handBlock", block);
        if (!ALLOWED_BLOCKS.contains(handBlock)) {
            throw new InvalidRequestException("未対応の手に持つブロックです: " + handBlock);
        }
        int skyY = optInt(json, "skyY", DEFAULT_SKY_Y);
        int reach = Math.max(1, Math.min(MAX_REACH, optInt(json, "reach", DEFAULT_REACH)));

        String placeSpeed = optString(json, "placeSpeed", DEFAULT_PLACE_SPEED);
        if (!PLACE_DELAY_TICKS.containsKey(placeSpeed)) {
            throw new InvalidRequestException("未対応の置く速さです: " + placeSpeed);
        }
        String breakSpeed = optString(json, "breakSpeed", DEFAULT_BREAK_SPEED);
        if (!BREAK_DELAY_TICKS.containsKey(breakSpeed)) {
            throw new InvalidRequestException("未対応の壊す速さです: " + breakSpeed);
        }
        int rounds = Math.max(1, Math.min(MAX_ROUNDS, optInt(json, "rounds", DEFAULT_ROUNDS)));
        // fill_set（デバッグ用）: 埋める割合 0〜100
        int percent = Math.max(0, Math.min(100, optInt(json, "percent", 100)));
        // クリエイティブのままでもモブに攻撃されるよう、埋め立て中はサバイバル（飛べる）にする
        boolean mobsAttack = optBoolean(json, "mobsAttack", true);

        String time = optString(json, "time", "normal");
        if (!ALLOWED_TIMES.contains(time)) {
            throw new InvalidRequestException("未対応の時間の設定です: " + time);
        }
        String weather = optString(json, "weather", "normal");
        if (!ALLOWED_WEATHERS.contains(weather)) {
            throw new InvalidRequestException("未対応の天気の設定です: " + weather);
        }
        boolean mobSpawning = optBoolean(json, "mobSpawning", true);
        boolean keepInventory = optBoolean(json, "keepInventory", false);
        int mobLifetime = Math.max(0, Math.min(MAX_MOB_LIFETIME, optInt(json, "mobLifetime", DEFAULT_MOB_LIFETIME)));

        return new ActionRequest(id, type, count, from, label, mob, width, height, countdown, wall, block, skyY, reach, placeSpeed, percent,
                rounds, breakSpeed, handBlock, mobsAttack, time, weather, mobSpawning, keepInventory,
                mobLifetime);
    }

    /** 押しっぱなしで次のブロックを置けるまでの tick 数 */
    public int placeDelayTicks() {
        return PLACE_DELAY_TICKS.get(placeSpeed);
    }

    /** 押しっぱなしで次のブロックを壊せるまでの tick 数。-1 ならバニラのまま */
    public int breakDelayTicks() {
        return BREAK_DELAY_TICKS.get(breakSpeed);
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
            case "world" -> Type.WORLD;
            case "jail" -> Type.JAIL;
            case "freeze" -> Type.FREEZE;
            case "fill_layer" -> Type.FILL_LAYER;
            case "fill_clear" -> Type.FILL_CLEAR;
            case "lightning" -> Type.LIGHTNING;
            case "levitate" -> Type.LEVITATE;
            case "night" -> Type.NIGHT;
            case "fill_raise" -> Type.FILL_RAISE;
            case "stop_all" -> Type.STOP_ALL;
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

    private static boolean optBoolean(JsonObject json, String key, boolean fallback) throws InvalidRequestException {
        JsonElement value = json.get(key);
        if (value == null || value.isJsonNull()) {
            return fallback;
        }
        if (!value.isJsonPrimitive() || !value.getAsJsonPrimitive().isBoolean()) {
            throw new InvalidRequestException(key + " は true か false にしてください");
        }
        return value.getAsBoolean();
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
