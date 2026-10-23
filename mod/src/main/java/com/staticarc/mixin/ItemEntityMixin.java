package com.staticarc.mixin;

import com.staticarc.action.MiningManager;
import net.minecraft.world.entity.item.ItemEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * 採掘チャレンジで、落ちているアイテムを拾った数と、かたまりどうしがくっついた数を知るため。
 * - playerTouch: 拾う前と後の数の差が、実際に持ち物に入った数（持ち物がいっぱいなら一部だけ）
 * - merge: くっつく前と後の数の差が、動いた数
 */
@Mixin(ItemEntity.class)
public abstract class ItemEntityMixin {

    @Unique
    private int staticArc$countBeforePickup;

    @Inject(method = "playerTouch", at = @At("HEAD"))
    private void staticArc$beforePickup(Player player, CallbackInfo ci) {
        staticArc$countBeforePickup = ((ItemEntity) (Object) this).getItem().getCount();
    }

    @Inject(method = "playerTouch", at = @At("RETURN"))
    private void staticArc$afterPickup(Player player, CallbackInfo ci) {
        ItemEntity self = (ItemEntity) (Object) this;
        if (self.level().isClientSide()) {
            return;
        }
        // 全部拾われたら消える（そのとき数は元に戻されるので、拾う前の数がそのまま拾った数）
        int taken = self.isRemoved() ? staticArc$countBeforePickup : staticArc$countBeforePickup - self.getItem().getCount();
        MiningManager.onPickup(self, player, taken);
    }

    private static final String MERGE = "merge(Lnet/minecraft/world/entity/item/ItemEntity;Lnet/minecraft/world/item/ItemStack;"
            + "Lnet/minecraft/world/entity/item/ItemEntity;Lnet/minecraft/world/item/ItemStack;)V";

    @Inject(method = MERGE, at = @At("HEAD"))
    private static void staticArc$beforeMerge(ItemEntity target, ItemStack targetStack, ItemEntity source, ItemStack sourceStack,
                                                    CallbackInfo ci) {
        if (!target.level().isClientSide()) {
            MiningManager.beforeMerge(sourceStack.getCount());
        }
    }

    @Inject(method = MERGE, at = @At("RETURN"))
    private static void staticArc$afterMerge(ItemEntity target, ItemStack targetStack, ItemEntity source, ItemStack sourceStack,
                                                   CallbackInfo ci) {
        if (!target.level().isClientSide()) {
            MiningManager.afterMerge(target, source, sourceStack.getCount());
        }
    }
}
