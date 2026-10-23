package com.staticarc.action;

import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.item.PrimedTnt;
import net.minecraft.world.entity.monster.Creeper;
import net.minecraft.world.level.Level;

import java.util.ArrayList;
import java.util.List;

/**
 * 地形を壊さない爆発（採掘チャレンジ用）。ギフトで出した TNT とクリーパーを、爆発する直前に消して、
 * 見た目・音・ダメージだけの爆発（ブロックを壊さない）に差し替える。ふつうの TNT にはしない。
 * サーバースレッドから呼ぶこと。
 */
public final class SafeBlasts {

    /** バニラの TNT・クリーパーと同じ強さ（見た目と音、プレイヤーへのダメージ） */
    private static final float TNT_POWER = 4.0f;
    private static final float CREEPER_POWER = 3.0f;

    private static final List<Entity> tracked = new ArrayList<>();

    private SafeBlasts() {
    }

    public static void track(Entity entity) {
        tracked.add(entity);
    }

    /** 毎 tick 呼ぶ */
    public static void tick() {
        if (tracked.isEmpty()) {
            return;
        }
        for (var it = tracked.iterator(); it.hasNext(); ) {
            Entity entity = it.next();
            if (entity.isRemoved()) {
                it.remove();
                continue;
            }
            float power;
            if (entity instanceof PrimedTnt tnt && tnt.getFuse() <= 1) {
                power = TNT_POWER;
            } else if (entity instanceof Creeper creeper && creeper.getSwelling(1f) >= 1f) {
                power = CREEPER_POWER;
            } else {
                continue;
            }
            it.remove();
            double x = entity.getX();
            double y = entity.getY();
            double z = entity.getZ();
            Level level = entity.level();
            entity.discard();
            level.explode(null, x, y, z, power, Level.ExplosionInteraction.NONE);
        }
    }

    /** ワールドを閉じたとき・全妨害ストップのあと */
    public static void reset() {
        tracked.clear();
    }
}
