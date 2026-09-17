<script>
import Original from "@/components/tabs/antimatter-dimensions/ModernDimensionBoostRow";
export default {
  name: "UndeadBoostRow",
  extends: Original,
  data() { return { actionLabel: "筑塔开层", unitName: "" }; },
  methods: {
    update() {
      Original.methods.update.call(this);
      this.unitName = window.UndeadTheme.armyNames[this.requirement.tier - 1];
      this.actionLabel = DimBoost.canUnlockNewDimension ? "筑塔开层" : "强化军势";
    }
  }
};
</script>
<template>
  <div class="reset-container dimboost">
    <h4>筑塔 <small>{{ boostCountText }}</small></h4>
    <span>需要 {{ formatInt(requirement.amount) }} {{ unitName }}</span>
    <p class="reset-effect">{{ unlockedByBoost }}</p>
    <button :class="classObject" :disabled="!isBuyable || creditsClosed" data-action="boost"
      @click.exact="dimensionBoost(true)" @click.shift.exact="dimensionBoost(false)">{{ actionLabel }}</button>
  </div>
</template>
