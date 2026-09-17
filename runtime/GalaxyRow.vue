<script>
import Original from "@/components/tabs/antimatter-dimensions/ModernAntimatterGalaxyRow";
export default {
  name: "UndeadGalaxyRow",
  extends: Original,
  data() { return { unitName: "" }; },
  methods: {
    update() {
      Original.methods.update.call(this);
      this.unitName = window.UndeadTheme.armyNames[this.requirement.tier - 1];
    }
  }
};
</script>
<template>
  <div class="reset-container galaxy">
    <h4>{{ typeName }} <small>{{ sumText }}</small></h4>
    <span>需要 {{ formatInt(requirement.amount) }} {{ unitName }}</span>
    <span v-if="hasIncreasedScaling">{{ costScalingText }}</span>
    <p class="reset-effect">{{ buttonText }}</p>
    <button :class="classObject" :disabled="!canBeBought || creditsClosed" data-action="galaxy"
      @click.exact="buyGalaxy(true)" @click.shift.exact="buyGalaxy(false)">开辟墓域</button>
  </div>
</template>
