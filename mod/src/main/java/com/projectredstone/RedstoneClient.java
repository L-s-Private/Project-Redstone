package com.projectredstone;

import com.projectredstone.action.FillGameManager;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.minecraft.client.Minecraft;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.lang.reflect.Field;

/**
 * 埋め立て中は、右クリック押しっぱなしでブロックを置く間隔を短くする。
 * シングルプレイではワールド（サーバー）も同じ中で動くので、FillGameManager の状態をそのまま読める。
 */
public class RedstoneClient implements ClientModInitializer {

    private static final Logger LOGGER = LoggerFactory.getLogger("project-redstone");
    /** バニラの間隔（tick） */
    private static final int VANILLA_DELAY = 4;

    @Override
    public void onInitializeClient() {
        Field field;
        try {
            // 置いたあとの待ち時間。private なので reflection で触る（26.x は名前が難読化されていない）
            field = Minecraft.class.getDeclaredField("rightClickDelay");
            field.setAccessible(true);
        } catch (ReflectiveOperationException | RuntimeException e) {
            LOGGER.warn("ブロックを置く速さを変えられません（この版のマイクラに対応していません）", e);
            return;
        }
        ClientTickEvents.END_CLIENT_TICK.register(client -> {
            int delay = FillGameManager.placeDelayTicks();
            if (delay <= 0 || delay >= VANILLA_DELAY) {
                return;
            }
            try {
                if (field.getInt(client) > delay) {
                    field.setInt(client, delay);
                }
            } catch (IllegalAccessException e) {
                // setAccessible 済みなので起きない
            }
        });
    }
}
