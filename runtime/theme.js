import Vue from "vue";
import { notify } from "@/core/notify";
import wordShift from "@/core/word-shift";
import mapping from "./mapping.json";
import { configurations } from "./bindings";
import { armyNames, translate, prepareTranslations } from "./glossary";
import "./theme.css";
import "./midgame.css";
import "./reality.css";
import "./celestial.css";
import "./endgame.css";

export function installUndeadTheme() {
  const extra = {};
  const registry = new Map();
  const cycleNames = new Map();
  mapping.entries.forEach((entry, index) => {
    const config = configurations[index];
    if (!config || typeof config !== "object") throw new Error("映射配置缺失：" + entry.mappingKey);
    registry.set(entry.mappingKey, config);
    // Keep identifiers, requirement/effect/cost functions and all simulation data intact.
    config.undeadName = entry.undeadName;
    if (entry.group === "glyphTypes" || entry.group === "cosmeticGlyphs") {
      extra[entry.key + " Glyph"] = entry.undeadName;
      extra["Glyph of " + entry.key] = entry.undeadName;
    }
    if (typeof config.name === "string") {
      // Names can be logic keys or persisted values (Ra's Remembrance is one example). Translate only at render time.
      extra[config.name] = entry.undeadName;
    } else if (Array.isArray(config.name)) {
      for (const name of config.name) if (typeof name === "string") extra[name] = entry.undeadName;
      if (entry.group === "pelleRifts") cycleNames.set(config.name.join("\u0000"), entry.undeadName);
    }
    // Configurations without a source title still get their exact mapped name on the card.
    for (const field of ["description", "reward", "requirementDescription", "singleDesc", "totalDesc"]) {
      if (config.name !== undefined) continue;
      const descriptor = Object.getOwnPropertyDescriptor(config, field);
      if (descriptor && descriptor.get) {
        Object.defineProperty(config, field, { ...descriptor, get() {
          return entry.undeadName + " · " + descriptor.get.call(this);
        } });
        continue;
      }
      const original = config[field];
      if (typeof original === "function") {
        config[field] = function(...args) {
          return entry.undeadName + " · " + original.apply(this, args);
        };
      } else if (typeof original === "string") config[field] = entry.undeadName + " · " + original;
    }
  });
  // Pelle deliberately scrambles its English rift synonyms. Scrambling CJK produces unreadable Latin-1 symbols,
  // so use each audited themed rift name while leaving the source arrays and timing logic untouched.
  const originalWordCycle = wordShift.wordCycle.bind(wordShift);
  wordShift.wordCycle = (list, noBuffer = false) => cycleNames.get(list?.join?.("\u0000")) ??
    originalWordCycle(list, noBuffer);
  prepareTranslations(extra);
  // Notifications are plain DOM, outside Vue's render hook; preserve their timing and handlers.
  for (const key of Object.keys(notify)) {
    if (typeof notify[key] !== "function") continue;
    const original = notify[key];
    notify[key] = (text, ...args) => original(translate(text), ...args);
  }
  const render = Vue.prototype._render;
  function translateVNode(node, componentName) {
    if (!node || typeof node !== "object") return;
    // Script editor content must remain valid original automator grammar.
    if (node.tag === "textarea" || node.tag === "input" || node.tag === "code" || node.tag === "pre") return;
    if (node.text) node.text = translate(node.text);
    if (node.data && node.data.attrs) {
      for (const key of ["title", "aria-label", "placeholder"]) {
        if (node.data.attrs[key]) node.data.attrs[key] = translate(node.data.attrs[key]);
      }
    }
    if (node.data && node.data.domProps && node.data.domProps.innerHTML) {
      if (componentName === "DarkMatterDimensionRow") {
        const html = node.data.domProps.innerHTML;
        const label = /^\s*(?:<b>)?DM\b/.test(html) ? "灾厄精粹威能" :
          /^\s*(?:<b>)?DE\b/.test(html) ? "寂灭威能" : /Cost:.*DM/.test(html) ? "虚渊节律" : null;
        if (label) node.data.domProps.innerHTML = label + "<br>" + html;
      }
      node.data.domProps.innerHTML = node.data.domProps.innerHTML.split(/(<[^>]*>)/g)
        .map((part, i) => i % 2 ? part : translate(part)).join("");
    }
    if (node.children) node.children.forEach(child => translateVNode(child, componentName));
  }
  Vue.prototype._render = function() {
    const vnode = render.call(this);
    if (!this.$options.name || !/Automator.*Editor|AutomatorBlockSingleInput/.test(this.$options.name)) translateVNode(vnode, this.$options.name);
    return vnode;
  };
  window.UndeadTheme = { armyNames, translate, registry, mapping, configurations };
  document.documentElement.lang = "zh-CN";
}

function snapshot() {
  const army = AntimatterDimensions.all.map((dimension, index) => ({
    tier: index + 1,
    name: armyNames[index],
    amount: format(dimension.totalAmount, 2, 1),
    present: dimension.totalAmount.gte(1),
    representatives: dimension.totalAmount.lt(1) ? 0 : Math.min(3, 1 + Math.floor(Math.max(0, dimension.totalAmount.log10()) / 2))
  }));
  return {
    souls: translate(format(Currency.antimatter.value, 2, 1)),
    production: format(Currency.antimatter.productionPerSecond, 2, 1),
    soulSeals: format(Currency.infinityPoints.value, 2, 0),
    floors: formatInt(DimBoost.purchasedBoosts),
    cemeteries: formatInt(player.galaxies),
    chapter: Pelle.isDoomed ? "终焉封界" : PlayerProgress.realityUnlocked() ? "冥界创世" :
      PlayerProgress.eternityUnlocked() ? "无尽轮回" : PlayerProgress.infinityUnlocked() ? "魂界初开" : "荒坟初醒",
    army,
    lastSaved: GameStorage.lastSaveTime,
    tab: ui.view.tab,
    subtab: ui.view.subtab,
    modal: Boolean(ui.view.modal.current || ui.view.modal.progressBar || ui.view.quotes.current),
    ended: GameEnd.endState > 0,
    error: null
  };
}

export function startUndeadBridge() {
  const publish = () => {
    if (!ui.view.initialized) return;
    const state = snapshot();
    window.parent.postMessage({ type: "undead:state", state }, window.location.origin);
  };
  window.addEventListener("message", event => {
    if (event.source !== window.parent || event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || data.type !== "undead:command") return;
    if (data.action === "save") {
      if (GameStorage.canSave()) {
        GameStorage.save(true, true);
        GameUI.notify.success("高塔进度已保存");
        window.parent.postMessage({ type: "undead:saved" }, window.location.origin);
      }
      else GameUI.notify.info("当前正在结算，请稍后保存");
    }
    if (data.action === "settings") Tab.options.saving.show(true);
    if (data.action === "army") Tab.dimensions.antimatter.show(true);
    if (data.action === "help") Modal.h2p.show();
    publish();
  });
  window.addEventListener("pagehide", () => { if (ui.view.initialized) GameStorage.save(true); });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && ui.view.initialized) GameStorage.save(true);
  });
  window.addEventListener("error", event => {
    window.parent.postMessage({ type: "undead:error", message: event.message }, window.location.origin);
  });
  window.UndeadTower = { snapshot, sourceCommit: mapping.sourceCommit, mappingCount: mapping.entries.length };
  setInterval(publish, 250);
  publish();
}
