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
        assertEquals(5, ActionRequest.parse("{\"type\":\"bury\",\"count\":1e9}").count());
        assertEquals(1, ActionRequest.parse("{\"type\":\"message\",\"label\":\"hi\",\"count\":50}").count());
    }

    @Test
    void defaultsMobAndBlock() throws Exception {
        assertEquals("zombie", ActionRequest.parse("{\"type\":\"mob\"}").mob());
        assertEquals("sand", ActionRequest.parse("{\"type\":\"bury\"}").block());
    }

    @Test
    void rejectsUnknownValues() {
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"mob\",\"mob\":\"wither\"}"));
        assertThrows(InvalidRequestException.class, () -> ActionRequest.parse("{\"type\":\"bury\",\"block\":\"lava\"}"));
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
