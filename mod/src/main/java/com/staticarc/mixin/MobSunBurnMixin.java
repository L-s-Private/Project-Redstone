package com.staticarc.mixin;

import com.staticarc.action.ActionExecutor;
import net.minecraft.world.entity.Mob;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** ギフトで出したモブ（ゾンビ・スケルトンなど）は、昼でも燃えない */
@Mixin(Mob.class)
public abstract class MobSunBurnMixin {

    @Inject(method = "burnUndead", at = @At("HEAD"), cancellable = true)
    private void staticArc$noSunBurn(CallbackInfo ci) {
        if (((Mob) (Object) this).entityTags().contains(ActionExecutor.SPAWNED_TAG)) {
            ci.cancel();
        }
    }
}
