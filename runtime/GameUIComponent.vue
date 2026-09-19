<script>
import TabComponents from "@/components/tabs";
import GameUiComponentFixed from "@/undead/GameUiComponentFixed";
import HeaderPrestigeGroup from "@/components/ui-modes/HeaderPrestigeGroup";
import HeaderChallengeDisplay from "@/components/ui-modes/HeaderChallengeDisplay";
import HeaderChallengeEffects from "@/components/ui-modes/HeaderChallengeEffects";
import HeaderBlackHole from "@/components/ui-modes/HeaderBlackHole";
import BigCrunchButton from "@/undead/CrunchButton";
import GameSpeedDisplay from "@/components/GameSpeedDisplay";
export default {
  name: "UndeadGameUI",
  components: { ...TabComponents, GameUiComponentFixed, HeaderPrestigeGroup, HeaderChallengeDisplay,
    HeaderChallengeEffects, HeaderBlackHole, BigCrunchButton, GameSpeedDisplay },
  data() { return { tabs: [], subtabs: [], shortcuts: [], progress: false, catalog: false, query: "" }; },
  computed: {
    view() { return this.$viewModel; },
    page() { return Tabs.current[this.view.subtab].config.component; },
    entries() {
      const needle = this.query.trim().toLowerCase();
      return window.UndeadTheme.mapping.entries.filter(e => !needle ||
        e.undeadName.includes(needle) || e.mappingKey.toLowerCase().includes(needle));
    }
  },
  methods: {
    t(key, values) { return window.UndeadI18n.t(key, values); },
    update() {
      this.tabs = Tabs.all.filter(t => t.isAvailable && !["shop", "dimensions"].includes(t.key));
      this.shortcuts = [
        { name: this.t("nav.army"), target: Tab.dimensions.antimatter },
        { name: this.t("nav.council"), target: Tab.dimensions.infinity },
        { name: this.t("nav.altars"), target: Tab.dimensions.time },
        { name: this.t("nav.research"), target: Tab.eternity.studies }
      ].map(s => ({ ...s, unlocked: s.target._parent.isUnlocked && s.target.isUnlocked, selected: s.target.isOpen }));
      this.subtabs = Tabs.current.subtabs.filter(t => t.isAvailable);
      this.progress = PlayerProgress.infinityUnlocked() || Player.canCrunch || PlayerProgress.eternityUnlocked();
    },
    label(tab) {
      const names = { dimensions: "军团", infinity: "魂界", eternity: "轮回", reality: "创世",
        celestials: "主宰", achievements: "功业", statistics: "史册", options: "设置", automation: "执役",
        challenges: "试炼", shop: "商店" };
      return names[tab.key] || window.UndeadTheme.translate(tab.name);
    },
    sublabel(tab) {
      if (this.view.tab === "dimensions") return { antimatter: "亡灵军团", infinity: "通灵议会", time: "墓园祭坛" }[tab.key];
      return window.UndeadTheme.translate(tab.name);
    },
    show(tab) { this.catalog = false; tab.show(true); },
    showSub(tab) { this.catalog = false; tab.show(true); }
  }
};
</script>
<template>
  <div v-if="view.initialized" id="ui-container" class="undead-runtime old-ui">
    <nav class="tower-tabs" aria-label="高塔系统">
      <button v-for="shortcut in shortcuts" :key="shortcut.name" :disabled="!shortcut.unlocked"
        :class="{ selected: shortcut.selected && !catalog }" @click="showSub(shortcut.target)">{{ shortcut.name }}</button>
    </nav>
    <nav class="tower-utility" aria-label="其他系统">
      <button v-for="tab in tabs" :key="tab.key" :class="{ selected: view.tab === tab.key && !catalog }" @click="show(tab)">
        {{ label(tab) }}<span v-if="tab.hasNotification" class="notice-dot">◆</span>
      </button>
      <button :class="{ selected: catalog }" @click="catalog = !catalog">{{ t("nav.codex") }}</button>
    </nav>
    <nav v-if="view.tab !== 'dimensions' && subtabs.length > 1 && !catalog" class="tower-subtabs" aria-label="系统分页">
      <button v-for="tab in subtabs" :key="tab.key" :class="{ selected: view.subtab === tab.key }" @click="showSub(tab)">{{ sublabel(tab) }}</button>
    </nav>
    <section v-if="catalog" class="tower-catalog">
      <h2>{{ t("codex.title") }}</h2>
      <p>{{ t("codex.description") }}</p>
      <input v-model="query" :aria-label="t('codex.searchLabel')" :placeholder="t('codex.searchPlaceholder')">
      <p>{{ t("codex.recordCount", { count: entries.length }) }}</p>
      <article v-for="entry in entries" :key="entry.mappingKey">
        <strong>{{ entry.undeadName }}</strong><code>{{ entry.mappingKey }}</code>
      </article>
    </section>
    <main v-else id="ui" class="tower-content">
      <template v-if="progress">
        <BigCrunchButton />
        <HeaderPrestigeGroup />
      </template>
      <HeaderChallengeDisplay v-if="progress" />
      <HeaderChallengeEffects v-if="progress" />
      <HeaderBlackHole v-if="progress" />
      <GameSpeedDisplay v-if="progress" />
      <component :is="page" :key="page" class="c-game-tab" />
    </main>
    <GameUiComponentFixed />
  </div>
</template>
