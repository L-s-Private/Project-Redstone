package com.staticarc;

import com.staticarc.action.FillGameManager;
import com.staticarc.bridge.ActionRequest;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.minecraft.client.Minecraft;
import net.minecraft.client.multiplayer.MultiPlayerGameMode;
import net.minecraft.world.entity.ai.attributes.AttributeInstance;
import net.minecraft.world.entity.ai.attributes.Attributes;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.lang.reflect.Field;

/**
 * 埋め立て中は、右クリック押しっぱなしでブロックを置く間隔と、左クリック押しっぱなしで壊す間隔を短くする。
 * シングルプレイではワールド（サーバー）も同じ中で動くので、FillGameManager の状態をそのまま読める。
 */
public class StaticArcClient implements ClientModInitializer {

    private static final Logger LOGGER = LoggerFactory.getLogger("static-arc");
    /** バニラの間隔（tick） */
    private static final int VANILLA_DELAY = 4;
    /** 手元のプレイヤーの掘る速さを元に戻すため、変える前の値を覚えておく */
    private Double originalBreakSpeed;

    @Override
    public void onInitializeClient() {
        // どちらも private なので reflection で触る（26.x は名前が難読化されていない）
        // 置いたあとの待ち時間
        Field placeDelay = findField(Minecraft.class, "rightClickDelay", "ブロックを置く速さ");
        // 壊したあとの待ち時間（クリエイティブでは1個ごとに5tick待つ）
        Field breakDelay = findField(MultiPlayerGameMode.class, "destroyDelay", "ブロックを壊す速さ");
        ClientTickEvents.END_CLIENT_TICK.register(client -> {
            int place = FillGameManager.placeDelayTicks();
            if (placeDelay != null && place > 0 && place < VANILLA_DELAY) {
                capField(placeDelay, client, place);
            }
            int destroy = FillGameManager.breakDelayTicks();
            if (breakDelay != null && destroy >= 0 && client.gameMode != null) {
                capField(breakDelay, client.gameMode, destroy);
            }
            updateBreakSpeed(client, destroy >= 0);
        });
    }

    /**
     * 掘る速さをサーバー側と同じにする（手元で壊れるまでの時間はこちらで計算されるため）。
     * 埋め立てが終わったら元に戻す。
     */
    private void updateBreakSpeed(Minecraft client, boolean fast) {
        if (client.player == null) {
            originalBreakSpeed = null;
            return;
        }
        AttributeInstance attribute = client.player.getAttribute(Attributes.BLOCK_BREAK_SPEED);
        if (attribute == null) {
            return;
        }
        if (fast) {
            if (originalBreakSpeed == null) {
                originalBreakSpeed = attribute.getBaseValue();
            }
            attribute.setBaseValue(ActionRequest.INSTANT_BREAK_SPEED);
        } else if (originalBreakSpeed != null) {
            attribute.setBaseValue(originalBreakSpeed);
            originalBreakSpeed = null;
        }
    }

    private static Field findField(Class<?> owner, String name, String what) {
        try {
            Field field = owner.getDeclaredField(name);
            field.setAccessible(true);
            return field;
        } catch (ReflectiveOperationException | RuntimeException e) {
            LOGGER.warn("{}を変えられません（この版のマイクラに対応していません）", what, e);
            return null;
        }
    }

    /** 待ち時間が max より長ければ max にする */
    private static void capField(Field field, Object target, int max) {
        try {
            if (field.getInt(target) > max) {
                field.setInt(target, max);
            }
        } catch (IllegalAccessException e) {
            // setAccessible 済みなので起きない
        }
    }
}
