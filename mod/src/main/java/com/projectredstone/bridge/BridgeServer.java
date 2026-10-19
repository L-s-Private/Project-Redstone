package com.projectredstone.bridge;

import com.google.gson.JsonObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketException;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * アプリからの接続を受ける TCP サーバー。1行1JSONで要求を受け、1行で応答する（docs/protocol.md）。
 * ループバックにだけ待ち受けるので、同じPCのアプリからしか繋がらない。
 * Minecraft に依存しないので単体テストできる。
 */
public final class BridgeServer implements AutoCloseable {

    /** 要求を処理する。返した JSON の中身は応答にそのまま足される（null なら何も足さない）。 */
    @FunctionalInterface
    public interface Handler {
        JsonObject handle(ActionRequest request) throws InvalidRequestException;
    }

    static final int MAX_LINE_LENGTH = 8 * 1024;

    private static final Logger LOGGER = LoggerFactory.getLogger("project-redstone");

    private final ServerSocket serverSocket;
    private final Handler handler;
    private final Set<Socket> clients = ConcurrentHashMap.newKeySet();
    private volatile boolean closed;

    private BridgeServer(ServerSocket serverSocket, Handler handler) {
        this.serverSocket = serverSocket;
        this.handler = handler;
    }

    /** port に 0 を渡すと空いているポートを使う（テスト用）。 */
    public static BridgeServer start(int port, Handler handler) throws IOException {
        ServerSocket socket = new ServerSocket();
        socket.setReuseAddress(true);
        socket.bind(new InetSocketAddress(InetAddress.getLoopbackAddress(), port));
        BridgeServer server = new BridgeServer(socket, handler);
        Thread acceptThread = new Thread(server::acceptLoop, "project-redstone-bridge");
        acceptThread.setDaemon(true);
        acceptThread.start();
        return server;
    }

    public int port() {
        return serverSocket.getLocalPort();
    }

    private void acceptLoop() {
        while (!closed) {
            try {
                Socket client = serverSocket.accept();
                clients.add(client);
                Thread clientThread = new Thread(() -> serve(client), "project-redstone-client");
                clientThread.setDaemon(true);
                clientThread.start();
            } catch (IOException e) {
                if (!closed) {
                    LOGGER.warn("アプリからの接続を受けられませんでした", e);
                }
            }
        }
    }

    private void serve(Socket client) {
        LOGGER.info("アプリが接続しました");
        try (client;
             BufferedReader reader = new BufferedReader(new InputStreamReader(client.getInputStream(), StandardCharsets.UTF_8));
             Writer writer = new BufferedWriter(new OutputStreamWriter(client.getOutputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = readLine(reader)) != null) {
                if (line.isBlank()) {
                    continue;
                }
                writer.write(respond(line).toString());
                writer.write('\n');
                writer.flush();
            }
        } catch (LineTooLongException e) {
            LOGGER.warn("長すぎる要求が届いたので接続を切りました");
        } catch (SocketException e) {
            // close() で切ったとき、またはアプリ側が切ったとき
        } catch (IOException e) {
            LOGGER.warn("アプリとの通信でエラーが起きました", e);
        } finally {
            clients.remove(client);
            LOGGER.info("アプリとの接続が切れました");
        }
    }

    JsonObject respond(String line) {
        JsonObject response = new JsonObject();
        ActionRequest request;
        try {
            request = ActionRequest.parse(line);
        } catch (InvalidRequestException e) {
            response.addProperty("ok", false);
            response.addProperty("error", e.getMessage());
            return response;
        }
        response.addProperty("id", request.id());
        try {
            JsonObject extra = handler.handle(request);
            response.addProperty("ok", true);
            if (extra != null) {
                extra.entrySet().forEach(entry -> response.add(entry.getKey(), entry.getValue()));
            }
        } catch (InvalidRequestException e) {
            response.addProperty("ok", false);
            response.addProperty("error", e.getMessage());
        } catch (RuntimeException e) {
            LOGGER.error("要求の処理中にエラーが起きました: {}", line, e);
            response.addProperty("ok", false);
            response.addProperty("error", "MOD内部のエラー");
        }
        return response;
    }

    private static String readLine(BufferedReader reader) throws IOException {
        StringBuilder line = new StringBuilder();
        int c;
        while ((c = reader.read()) != -1) {
            if (c == '\n') {
                return line.toString();
            }
            if (c != '\r') {
                line.append((char) c);
            }
            if (line.length() > MAX_LINE_LENGTH) {
                throw new LineTooLongException();
            }
        }
        return line.length() > 0 ? line.toString() : null;
    }

    @Override
    public void close() {
        closed = true;
        try {
            serverSocket.close();
        } catch (IOException ignored) {
            // 終了処理なので無視する
        }
        for (Socket client : clients) {
            try {
                client.close();
            } catch (IOException ignored) {
                // 終了処理なので無視する
            }
        }
    }

    private static final class LineTooLongException extends IOException {
    }
}
