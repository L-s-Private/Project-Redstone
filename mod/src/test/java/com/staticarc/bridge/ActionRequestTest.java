package com.staticarc.bridge;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ActionRequestTest {

    @Test
    void parsesTnt() throws Exception {
        ActionRequest request = ActionRequest.parse("{\"id\":\"1\",\"type\":\"tnt\",\"count\":3,\"from\":\"たろう\"}");
        assertEquals("1", request.id());
        assertEquals(ActionRequest.Type.TNT, request.type());
        assertEquals(3, request.count());
        assertEquals("たろう", request.from());
        assertNull(request.mob());
    }

    @Test
    void clampsCountToLimits() throws Exception {
        assertEquals(20, ActionRequest.parse("{\"type\":\"tnt\",\"count\":9999}").count());
        assertEquals(1, ActionRequest.parse("{\"type\":\"tnt\",\"count\":-5}").count());
        assertEquals(64, ActionRequest.parse("{\"type\":\"fill_help\",\"count\":1e9}").count());
        assertEquals(1, ActionRequest.parse("{\"type\":\"message\",\"label\":\"hi\",\"count\":50}").count());
    }

    @Test
    void parsesFillActions() throws Exception {
        ActionRequest start = ActionRequest.parse("{\"type\":\"fill_start\",\"width\":15,\"height\":5,\"countdown\":30}");
        assertEquals(ActionRequest.Type.FILL_START, start.type());
        assertEquals(15, start.width());
        assertEquals(5, start.height());
        assertEquals(30, start.countdown());
        ActionRequest defaults = ActionRequest.parse("{\"type\":\"fill_start\"}");
        assertEquals(11, defaults.width());
        assertEquals(9, defaults.height());
        assertEquals("glass", defaults.wall());
        assertEquals("amethyst_block", defaults.block());
        assertEquals(150, defaults.skyY());
        assertEquals(8, defaults.reach());
        assertEquals(2, defaults.placeDelayTicks(), "既定は速い（バニラの2倍）");
        assertEquals(4, ActionRequest.parse("{\"type\":\"fill_start\",\"placeSpeed\":\"normal\"}").placeDelayTicks());
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"fill_start\",\"placeSpeed\":\"warp\"}"));
        assertEquals(1, defaults.breakDelayTicks(), "既定は壊すのも速い（1秒に10個）");
        assertEquals(-1, ActionRequest.parse("{\"type\":\"fill_start\",\"breakSpeed\":\"normal\"}").breakDelayTicks());
        assertEquals(0, ActionRequest.parse("{\"type\":\"fill_start\",\"breakSpeed\":\"fastest\"}").breakDelayTicks());
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"fill_start\",\"breakSpeed\":\"warp\"}"));
        assertEquals(10, defaults.rounds());
        assertEquals(1, ActionRequest.parse("{\"type\":\"fill_start\",\"rounds\":0}").rounds());
        assertEquals(99, ActionRequest.parse("{\"type\":\"fill_start\",\"rounds\":1000}").rounds());
        assertEquals(100, ActionRequest.parse("{\"type\":\"fill_set\"}").percent());
        assertEquals(0, ActionRequest.parse("{\"type\":\"fill_set\",\"percent\":-5}").percent());
        assertEquals(100, ActionRequest.parse("{\"type\":\"fill_set\",\"percent\":500}").percent());
        ActionRequest custom = ActionRequest.parse("{\"type\":\"fill_start\",\"wall\":\"bedrock\",\"block\":\"diamond_block\",\"skyY\":200,\"reach\":999}");
        assertEquals("bedrock", custom.wall());
        assertEquals("diamond_block", custom.block());
        assertEquals("diamond_block", custom.handBlock(), "手に持つブロックは、指定がなければ置かれるブロックと同じ");
        assertEquals("amethyst_block",
                ActionRequest.parse("{\"type\":\"fill_start\",\"handBlock\":\"amethyst_block\",\"block\":\"diamond_block\"}").handBlock());
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"fill_start\",\"handBlock\":\"tnt\"}"));
        assertEquals(200, custom.skyY());
        assertEquals(64, custom.reach());
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"fill_start\",\"wall\":\"obsidian\"}"));
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"fill_start\",\"block\":\"tnt\"}"));
        // 0.20 で足したブロックとモブ
        assertEquals("black_concrete", ActionRequest.parse("{\"type\":\"fill_start\",\"block\":\"black_concrete\"}").block());
        assertEquals("netherite_block", ActionRequest.parse("{\"type\":\"fill_start\",\"block\":\"netherite_block\"}").block());
        assertTrue(ActionRequest.ALLOWED_MOBS.containsAll(java.util.List.of("husk", "wither_skeleton", "breeze", "phantom", "chicken")));
        assertEquals(5, ActionRequest.parse("{\"type\":\"fill_expand\",\"count\":99}").count());
        assertEquals(ActionRequest.Type.FILL_SHRINK, ActionRequest.parse("{\"type\":\"fill_shrink\"}").type());
        assertEquals(ActionRequest.Type.FILL_STOP, ActionRequest.parse("{\"type\":\"fill_stop\"}").type());
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"fill_start\",\"width\":\"big\"}"));
    }

    @Test
    void parsesNewDisruptionsAndClampsTheirCounts() throws Exception {
        assertEquals(ActionRequest.Type.JAIL, ActionRequest.parse("{\"type\":\"jail\",\"count\":10}").type());
        assertEquals(60, ActionRequest.parse("{\"type\":\"jail\",\"count\":999}").count());
        assertEquals(30, ActionRequest.parse("{\"type\":\"freeze\",\"count\":999}").count());
        assertEquals(5, ActionRequest.parse("{\"type\":\"fill_layer\",\"count\":999}").count());
        assertEquals(1, ActionRequest.parse("{\"type\":\"fill_clear\",\"count\":999}").count(), "全消しは数がない");
        assertEquals(10, ActionRequest.parse("{\"type\":\"lightning\",\"count\":999}").count());
        assertEquals(15, ActionRequest.parse("{\"type\":\"levitate\",\"count\":999}").count());
        assertEquals(300, ActionRequest.parse("{\"type\":\"night\",\"count\":999}").count());
        assertEquals(5, ActionRequest.parse("{\"type\":\"fill_raise\",\"count\":999}").count());
        assertTrue(ActionRequest.NEEDS_FILL_GAME.contains(ActionRequest.Type.FILL_CLEAR));
        assertTrue(ActionRequest.NEEDS_FILL_GAME.contains(ActionRequest.Type.JAIL));
        assertFalse(ActionRequest.NEEDS_FILL_GAME.contains(ActionRequest.Type.FREEZE), "操作禁止は埋め立て中でなくても使える");
        assertFalse(ActionRequest.NEEDS_FILL_GAME.contains(ActionRequest.Type.LIGHTNING));
    }

    @Test
    void parsesStopAll() throws Exception {
        assertEquals(ActionRequest.Type.STOP_ALL, ActionRequest.parse("{\"type\":\"stop_all\"}").type());
        assertFalse(ActionRequest.NEEDS_FILL_GAME.contains(ActionRequest.Type.STOP_ALL), "埋め立て中でなくても止められる");
    }

    @Test
    void mobLifetimeDefaultsTo30SecondsAndIsClamped() throws Exception {
        assertEquals(30, ActionRequest.parse("{\"type\":\"fill_start\"}").mobLifetime());
        assertEquals(0, ActionRequest.parse("{\"type\":\"fill_start\",\"mobLifetime\":0}").mobLifetime(), "0 なら消えない");
        assertEquals(600, ActionRequest.parse("{\"type\":\"fill_start\",\"mobLifetime\":99999}").mobLifetime());
        assertEquals(0, ActionRequest.parse("{\"type\":\"fill_start\",\"mobLifetime\":-5}").mobLifetime());
    }

    @Test
    void defaultsMobAndBlock() throws Exception {
        assertEquals("zombie", ActionRequest.parse("{\"type\":\"mob\"}").mob());
        assertEquals("pig", ActionRequest.parse("{\"type\":\"mob\",\"mob\":\"pig\"}").mob());
    }

    @Test
    void rejectsUnknownValues() {
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"mob\",\"mob\":\"wither\"}"));
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"bury\"}"));
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"meteor\"}"));
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"op\"}"));
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"time_add\"}"), "制限時間はなくした");
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"count\":1}"));
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"message\"}"));
    }

    @Test
    void rejectsMalformedInput() {
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("not json"));
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("[1,2]"));
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"tnt\",\"count\":\"3\"}"));
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":5}"));
    }

    @Test
    void truncatesLongText() throws Exception {
        String longName = "あ".repeat(50);
        ActionRequest request = ActionRequest.parse("{\"type\":\"tnt\",\"from\":\"" + longName + "\"}");
        assertEquals(ActionRequest.MAX_FROM_LENGTH, request.from().length());
    }

    @Test
    void parsesMobsAttack() throws Exception {
        ActionRequest defaults = ActionRequest.parse("{\"type\":\"fill_start\"}");
        assertEquals(true, defaults.mobsAttack(), "既定はモブに攻撃される");
        assertEquals(false, ActionRequest.parse("{\"type\":\"fill_start\",\"mobsAttack\":false}").mobsAttack());
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"fill_start\",\"mobsAttack\":\"yes\"}"));
    }

    @Test
    void parsesWorldSettings() throws Exception {
        ActionRequest defaults = ActionRequest.parse("{\"type\":\"world\"}");
        assertEquals(ActionRequest.Type.WORLD, defaults.type());
        assertEquals("normal", defaults.time(), "既定はバニラと同じ");
        assertEquals("normal", defaults.weather());
        assertEquals(true, defaults.mobSpawning());
        assertEquals(false, defaults.keepInventory());
        ActionRequest custom = ActionRequest.parse(
                "{\"type\":\"world\",\"time\":\"day\",\"weather\":\"clear\",\"mobSpawning\":false,\"keepInventory\":true}");
        assertEquals("day", custom.time());
        assertEquals("clear", custom.weather());
        assertEquals(false, custom.mobSpawning());
        assertEquals(true, custom.keepInventory());
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"world\",\"time\":\"dusk\"}"));
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"world\",\"weather\":\"snow\"}"));
    }

    @Test
    void parsesMiningActions() throws Exception {
        ActionRequest start = ActionRequest.parse("{\"type\":\"mining_start\",\"item\":\"minecraft:diamond\",\"targetCount\":3,\"seconds\":300}");
        assertEquals(ActionRequest.Type.MINING_START, start.type());
        assertEquals("minecraft:diamond", start.item());
        assertEquals(3, start.targetCount());
        assertEquals(300, start.seconds());
        // 範囲の外・知らない資源は丸めずに断る
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"mining_start\",\"item\":\"minecraft:stone\"}"));
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"mining_start\",\"targetCount\":0}"));
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"mining_start\",\"targetCount\":513}"));
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"mining_start\",\"seconds\":10}"));
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"mining_start\",\"seconds\":\"180\"}"));
        // 支援は1回16個まで
        assertEquals(16, ActionRequest.parse("{\"type\":\"mining_bonus_drop\",\"count\":99}").count());
        assertEquals(ActionRequest.Type.MINING_ABORT, ActionRequest.parse("{\"type\":\"mining_abort\"}").type());
        assertEquals("time", ActionRequest.parse("{\"type\":\"mining_test\",\"op\":\"time\"}").op());
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"mining_test\",\"op\":\"give\"}"));
        // 地形を壊さない TNT（既定は今までどおり壊す）
        assertTrue(ActionRequest.parse("{\"type\":\"tnt\"}").terrain());
        assertFalse(ActionRequest.parse("{\"type\":\"tnt\",\"terrain\":false}").terrain());
    }

    @Test
    void parsesFillLayersFromTheBottom() throws Exception {
        ActionRequest request = ActionRequest.parse("{\"type\":\"fill_start\",\"layers\":[{\"block\":\"iron_block\",\"rows\":3},{\"block\":\"diamond_block\",\"rows\":99}]}");
        assertEquals(2, request.layers().size());
        assertEquals("iron_block", request.layers().get(0).block());
        assertEquals(3, request.layers().get(0).rows());
        assertEquals(30, request.layers().get(1).rows(), "段数は枠の高さの上限に丸める");
        assertTrue(ActionRequest.parse("{\"type\":\"fill_start\"}").layers().isEmpty(), "無ければ地層なし");
    }

    @Test
    void rejectsBadFillLayers() {
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"fill_start\",\"layers\":[{\"block\":\"dirt\",\"rows\":3}]}"));
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"fill_start\",\"layers\":\"iron_block\"}"));
        String seven = "{\"block\":\"iron_block\",\"rows\":1},".repeat(7);
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"fill_start\",\"layers\":[" + seven.substring(0, seven.length() - 1) + "]}"));
    }
}
