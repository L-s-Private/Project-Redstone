package com.staticarc.mixin;

import com.staticarc.action.MiningManager;
import net.minecraft.core.BlockPos;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.state.BlockState;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * 採掘チャレンジで、プレイヤーがブロックを掘って Minecraft が実際に落としたアイテムだけを数えるため。
 * プレイヤーが掘ると Block.playerDestroy → dropResources（掘った人と道具つき）→ popResource → addFreshEntity の順に呼ばれる。
 * dropResources の間に出たアイテムだけを「掘って落ちたもの」とする（チェストの中身が散らばるのは別の所なので入らない）。
 * 幸運・シルクタッチなどの数は Minecraft が決めたものをそのまま使う。
 */
@Mixin(Block.class)
public abstract class BlockDropsMixin {

    private static final String DROP_RESOURCES = "dropResources(Lnet/minecraft/world/level/block/state/BlockState;Lnet/minecraft/world/level/Level;"
            + "Lnet/minecraft/core/BlockPos;Lnet/minecraft/world/level/block/entity/BlockEntity;Lnet/minecraft/world/entity/Entity;"
            + "Lnet/minecraft/world/item/ItemStack;)V";

    @Inject(method = DROP_RESOURCES, at = @At("HEAD"))
    private static void staticArc$beginDrops(BlockState state, Level level, BlockPos pos, BlockEntity blockEntity, Entity breaker,
                                                   ItemStack tool, CallbackInfo ci) {
        if (!level.isClientSide()) {
            MiningManager.beginBlockDrops(breaker);
        }
    }

    @Inject(method = DROP_RESOURCES, at = @At("RETURN"))
    private static void staticArc$endDrops(BlockState state, Level level, BlockPos pos, BlockEntity blockEntity, Entity breaker,
                                                 ItemStack tool, CallbackInfo ci) {
        if (!level.isClientSide()) {
            MiningManager.endBlockDrops();
        }
    }

    @Redirect(method = "popResource(Lnet/minecraft/world/level/Level;Ljava/util/function/Supplier;Lnet/minecraft/world/item/ItemStack;)V",
            at = @At(value = "INVOKE", target = "Lnet/minecraft/world/level/Level;addFreshEntity(Lnet/minecraft/world/entity/Entity;)Z"))
    private static boolean staticArc$trackDrop(Level level, Entity entity) {
        boolean added = level.addFreshEntity(entity);
        if (added && !level.isClientSide()) {
            MiningManager.onBlockDrop(entity);
        }
        return added;
    }
}
