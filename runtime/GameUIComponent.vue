<script>
import TabComponents from "@/components/tabs";
import GameUiComponentFixed from "@/undead/GameUiComponentFixed";
import HeaderPrestigeGroup from "@/components/ui-modes/HeaderPrestigeGroup";
import HeaderChallengeDisplay from "@/components/ui-modes/HeaderChallengeDisplay";
import HeaderChallengeEffects from "@/components/ui-modes/HeaderChallengeEffects";
import HeaderBlackHole from "@/components/ui-modes/HeaderBlackHole";
import NewsTicker from "@/components/ui-modes/NewsTicker";
import BigCrunchButton from "@/undead/CrunchButton";
import GameSpeedDisplay from "@/components/GameSpeedDisplay";
export default {
  name: "UndeadGameUI",
  components: { ...TabComponents, GameUiComponentFixed, HeaderPrestigeGroup, HeaderChallengeDisplay,
    HeaderChallengeEffects, HeaderBlackHole, NewsTicker, BigCrunchButton, GameSpeedDisplay },
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
    update() {
      this.tabs = Tabs.all.filter(t => t.isAvailable && !["shop", "dimensions"].includes(t.key));
      this.shortcuts = [
        { name: "军团", target: Tab.dimensions.antimatter },
        { name: "议会", target: Tab.dimensions.infinity },
        { name: "祭坛", target: Tab.dimensions.time },
        { name: "研究", target: Tab.eternity.studies }
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
      <button :class="{ selected: catalog }" @click="catalog = !catalog">典籍</button>
    </nav>
    <NewsTicker v-if="view.news" class="tower-news" aria-label="冥界传闻" />
    <nav v-if="view.tab !== 'dimensions' && subtabs.length > 1 && !catalog" class="tower-subtabs" aria-label="系统分页">
      <button v-for="tab in subtabs" :key="tab.key" :class="{ selected: view.subtab === tab.key }" @click="showSub(tab)">{{ sublabel(tab) }}</button>
    </nav>
    <section v-if="catalog" class="tower-catalog">
      <h2>亡灵典籍</h2>
      <p>军团、研究、遗赠与主宰的完整记录。解锁条件见对应系统。</p>
      <input v-model="query" aria-label="搜索典籍" placeholder="搜索名称或编号">
      <p>{{ entries.length }} / 767 条记录</p>
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
