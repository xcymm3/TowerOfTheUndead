<script>
import DimensionBoostRow from "@/undead/BoostRow";
import AntimatterGalaxyRow from "@/undead/GalaxyRow";
import TickspeedRow from "@/components/tabs/antimatter-dimensions/TickspeedRow";
import AntimatterDimensionProgressBar from "@/components/tabs/antimatter-dimensions/AntimatterDimensionProgressBar";
export default {
  name: "UndeadArmyTab",
  components: { DimensionBoostRow, AntimatterGalaxyRow, TickspeedRow, AntimatterDimensionProgressBar },
  data() {
    return { rows: [], mode: "ten", buyTen: "", sacrificeVisible: false, canSacrifice: false,
      sacrificeBoost: "", sacrificeTotal: "", sacrificeReason: "", continuum: false, hasContinuum: false, quickReset: false };
  },
  methods: {
    update() {
      this.continuum = Laitela.continuumActive;
      this.hasContinuum = Laitela.continuumUnlocked;
      if (this.mode !== "max") this.mode = player.buyUntil10 ? "ten" : "one";
      this.buyTen = formatX(AntimatterDimensions.buyTenMultiplier, 2, 2);
      this.sacrificeVisible = Sacrifice.isVisible;
      this.canSacrifice = Sacrifice.canSacrifice;
      this.sacrificeBoost = formatX(Sacrifice.nextBoost, 2, 2);
      this.sacrificeTotal = formatX(Sacrifice.totalBoost, 2, 2);
      this.sacrificeReason = window.UndeadTheme.translate(Sacrifice.disabledCondition);
      this.quickReset = Player.isInAntimatterChallenge && Player.antimatterChallenge.isQuickResettable;
      this.rows = AntimatterDimensions.all.map((dim, index) => {
        const capped = dim.tier === 8 && Enslaved.isRunning && dim.bought >= 1;
        const count = this.mode === "ten" ? Math.max(1, dim.howManyCanBuy) : 1;
        const cost = dim.cost.times(count);
        return { tier: dim.tier, name: window.UndeadTheme.armyNames[index],
          amount: format(dim.totalAmount, 2, 1), multiplier: formatX(dim.multiplier, 2, 1),
          cost: format(cost, 2, 0), available: dim.isAvailableForPurchase, capped,
          canBuy: dim.isAvailableForPurchase && (this.mode === "max" ? dim.isAffordableUntil10 : dim.isAffordable) && !capped && !this.continuum,
          count, bought: dim.bought, progress: dim.boughtBefore10,
          currency: NormalChallenge(6).isRunning && dim.tier > 2 ? window.UndeadTheme.armyNames[index - 2] : "游魂",
          continuum: this.continuum ? formatFloat(dim.continuumValue, 2) : "",
          unlock: dim.tier > DimBoost.totalBoosts + 4 ? "筑塔后解锁" : "需先召唤" + window.UndeadTheme.armyNames[index - 1]
        };
      });
    },
    choose(mode) {
      this.mode = mode;
      if (mode !== "max") player.buyUntil10 = mode === "ten";
      this.update();
    },
    buy(tier) {
      if (this.mode === "one") buyOneDimension(tier);
      else if (this.mode === "ten") buyAsManyAsYouCanBuy(tier);
      else buyMaxDimension(tier);
      GameUI.update();
    },
    maxAll() { maxAll(); GameUI.update(); },
    sacrifice() { sacrificeBtnClick(); },
    resetChallenge() { softReset(-1, true, true); },
    toggleContinuum() {
      if (ImaginaryUpgrade(21).isLockingMechanics && player.auto.disableContinuum) {
        ImaginaryUpgrade(21).tryShowWarningModal(); return;
      }
      Laitela.setContinuum(!this.continuum);
    }
  }
};
</script>
<template>
  <section class="army-management">
    <div class="army-toolbar">
      <span>亡者集结 <b>{{ buyTen }}</b></span>
      <div class="buy-modes" role="group" aria-label="召唤数量">
        <button :class="{ selected: mode === 'one' }" :aria-pressed="mode === 'one'" @click="choose('one')">单次</button>
        <button :class="{ selected: mode === 'ten' }" :aria-pressed="mode === 'ten'" @click="choose('ten')" title="补至下一个十次购买，资源不足时购买可负担数量">十次</button>
        <button :class="{ selected: mode === 'max' }" :aria-pressed="mode === 'max'" @click="choose('max')" title="至少补至下一个十次购买，再买入可负担的整组；列表显示单次起价">最大</button>
      </div>
      <button class="max-all" @click="maxAll">全部最大</button>
    </div>
    <p class="army-rule">高阶军团召来低阶军团，骷髅兵收集游魂。每购满十次，获得集结倍率。</p>
    <button v-if="hasContinuum" class="o-primary-btn" @click="toggleContinuum">永续召唤：{{ continuum ? "开启" : "关闭" }}</button>
    <div class="army-rows">
      <article v-for="row in rows" :key="row.tier" class="army-row" :class="{ 'is-locked': !row.available }" :data-tier="row.tier">
        <div class="army-portrait" :class="'unit-' + row.tier" aria-hidden="true" />
        <div class="army-identity">
          <h2>{{ row.name }}</h2>
          <span class="army-multiplier">{{ row.multiplier }}</span>
          <div class="recruit-progress" :aria-label="'本轮已购 ' + row.progress + ' / 10'"><i :style="{ width: row.progress * 10 + '%' }" /></div>
        </div>
        <div class="army-quantity"><b>{{ row.amount }}</b><small>已召唤 {{ formatInt(row.bought) }}</small></div>
        <div class="army-price"><b>{{ row.cost }}</b><small>{{ row.currency }}{{ mode === "max" ? " 起价" : "" }}</small></div>
        <button :disabled="!row.canBuy" :data-buy-tier="row.tier" @click="buy(row.tier)"
          :title="row.capped ? '缚时领域购买上限' : !row.available ? row.unlock : !row.canBuy ? '当前无法召唤：请检查资源或永续召唤状态' : '召唤' + row.name">
          {{ continuum ? "永续 " + row.continuum : row.capped ? "已达上限" : !row.available ? "未解锁" : "召唤" }}
          <small v-if="row.available && !continuum && !row.capped">{{ mode === "max" ? "最大" : "× " + (mode === "one" ? 1 : row.count) }}</small>
        </button>
      </article>
    </div>
    <TickspeedRow />
    <div class="army-resets"><DimensionBoostRow /><AntimatterGalaxyRow /></div>
    <div v-if="sacrificeVisible" class="sacrifice-panel">
      <div>灵魂献祭 <small>当前 {{ sacrificeTotal }} · 下一次 {{ sacrificeBoost }}</small></div>
      <button :disabled="!canSacrifice" :title="sacrificeReason" data-action="sacrifice" @click="sacrifice">献祭</button>
    </div>
    <button v-if="quickReset" class="o-primary-btn" @click="resetChallenge">试炼快速重置</button>
    <AntimatterDimensionProgressBar />
  </section>
</template>
