package com.projectredstone.bridge;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.junit.jupiter.api.Test;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BridgeServerTest {

    @Test
    void answersEachLineAndPassesRequestsToHandler() throws Exception {
        List<ActionRequest> handled = new CopyOnWriteArrayList<>();
        try (BridgeServer server = BridgeServer.start(0, request -> {
            handled.add(request);
            if (request.type() == ActionRequest.Type.PING) {
                JsonObject status = new JsonObject();
                status.addProperty("players", 1);
                return status;
            }
            return null;
        });
             Socket socket = new Socket(InetAddress.getLoopbackAddress(), server.port())) {
            OutputStream out = socket.getOutputStream();
            BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));

            out.write("{\"id\":\"a\",\"type\":\"ping\"}\n{\"id\":\"b\",\"type\":\"tnt\",\"count\":2}\r\n\n{\"id\":\"c\",\"type\":\"mob\",\"mob\":\"ghast\"}\n"
                    .getBytes(StandardCharsets.UTF_8));
            out.flush();

            JsonObject ping = JsonParser.parseString(in.readLine()).getAsJsonObject();
            assertEquals("a", ping.get("id").getAsString());
            assertTrue(ping.get("ok").getAsBoolean());
            assertEquals(1, ping.get("players").getAsInt());

            JsonObject tnt = JsonParser.parseString(in.readLine()).getAsJsonObject();
            assertEquals("b", tnt.get("id").getAsString());
            assertTrue(tnt.get("ok").getAsBoolean());

            JsonObject invalid = JsonParser.parseString(in.readLine()).getAsJsonObject();
            assertFalse(invalid.get("ok").getAsBoolean());
            assertTrue(invalid.get("error").getAsString().contains("ghast"));

            assertEquals(2, handled.size());
            assertEquals(2, handled.get(1).count());
        }
    }

    @Test
    void reportsHandlerErrors() throws Exception {
        try (BridgeServer server = BridgeServer.start(0, request -> {
            throw new InvalidRequestException("ワールドにプレイヤーがいません");
        })) {
            JsonObject response = server.respond("{\"id\":\"x\",\"type\":\"tnt\"}");
            assertFalse(response.get("ok").getAsBoolean());
            assertEquals("ワールドにプレイヤーがいません", response.get("error").getAsString());
        }
    }

    @Test
    void closesConnectionOnOversizedLine() throws Exception {
        try (BridgeServer server = BridgeServer.start(0, request -> null);
             Socket socket = new Socket(InetAddress.getLoopbackAddress(), server.port())) {
            OutputStream out = socket.getOutputStream();
            out.write("x".repeat(BridgeServer.MAX_LINE_LENGTH + 10).getBytes(StandardCharsets.UTF_8));
            out.flush();
            BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
            assertNull(in.readLine());
        }
    }
}
