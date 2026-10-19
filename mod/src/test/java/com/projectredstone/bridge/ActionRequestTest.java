package com.projectredstone.bridge;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
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
        ActionRequest custom = ActionRequest.parse("{\"type\":\"fill_start\",\"wall\":\"bedrock\",\"block\":\"diamond_block\",\"skyY\":200,\"reach\":999}");
        assertEquals("bedrock", custom.wall());
        assertEquals("diamond_block", custom.block());
        assertEquals(200, custom.skyY());
        assertEquals(64, custom.reach());
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"fill_start\",\"wall\":\"obsidian\"}"));
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"fill_start\",\"block\":\"tnt\"}"));
        assertEquals(5, ActionRequest.parse("{\"type\":\"fill_expand\",\"count\":99}").count());
        assertEquals(ActionRequest.Type.FILL_SHRINK, ActionRequest.parse("{\"type\":\"fill_shrink\"}").type());
        assertEquals(ActionRequest.Type.FILL_STOP, ActionRequest.parse("{\"type\":\"fill_stop\"}").type());
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"fill_start\",\"width\":\"big\"}"));
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
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"lightning\"}"));
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"op\"}"));
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
}
