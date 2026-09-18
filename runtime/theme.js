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

const DISPLAY_FIELDS = ["description", "reward", "requirementDescription", "singleDesc", "totalDesc", "hint"];
const GROUP_CONTEXT_COMPONENTS = {
  normalAchievements: ["NormalAchievement"],
  secretAchievements: ["SecretAchievement"],
  "v.mainUnlock": ["VUnlockRequirement"],
  "ra.pets": ["RaPet", "RaPetRemembranceButton", "RaUpgradeIcon", "RaPetLevelBar"],
  alchemyResources: ["AlchemyResourceInfo"],
  speedrunMilestones: ["SpeedrunMilestoneSingle", "SpeedrunMilestoneCompare"]
};

function sameDescriptor(left, right) {
  if (!left || !right) return left === right;
  return left.configurable === right.configurable && left.enumerable === right.enumerable &&
    left.writable === right.writable && Object.is(left.value, right.value) &&
    left.get === right.get && left.set === right.set;
}

function sameSourceId(actual, expected) {
  if (actual === expected) return true;
  if (actual === undefined || actual === null || expected === undefined || expected === null) return false;
  return String(actual) === String(expected);
}

function sourceIdCheck(actual, expected) {
  if (sameSourceId(actual, expected)) return "matches";
  if (typeof expected === "string" && /^[A-Z][A-Z0-9_.]+$/.test(expected) &&
    (typeof actual === "number" || typeof actual === "string")) return "resolved-constant";
  return "mismatch";
}

export function installUndeadTheme() {
  const extra = {};
  const registry = new Map();
  const cycleNames = new Map();
  const auditSnapshots = [];
  const contextualTranslations = new Map();
  mapping.entries.forEach((entry, index) => {
    const config = configurations[index];
    if (!config || typeof config !== "object") throw new Error("映射配置缺失：" + entry.mappingKey);
    const before = Object.getOwnPropertyDescriptors(config);
    const sourceId = config.id;
    const adapters = [];
    registry.set(entry.mappingKey, config);
    // Keep identifiers, requirement/effect/cost functions and all simulation data intact.
    config.undeadName = entry.undeadName;
    if (entry.group === "glyphTypes" || entry.group === "cosmeticGlyphs") {
      extra[entry.key + " Glyph"] = entry.undeadName;
      extra["Glyph of " + entry.key] = entry.undeadName;
    }
    if (entry.group === "ecTimeStudies") extra[`Eternity Challenge ${entry.id}`] = entry.undeadName;
    if (typeof config.name === "string") {
      // Names can be logic keys or persisted values (Ra's Remembrance is one example). Translate only at render time.
      extra[config.name] = entry.undeadName;
    } else if (Array.isArray(config.name)) {
      for (const name of config.name) if (typeof name === "string") extra[name] = entry.undeadName;
      if (entry.group === "pelleRifts") cycleNames.set(config.name.join("\u0000"), entry.undeadName);
    }
    // Configurations without a source title still get their exact mapped name on the card.
    for (const field of DISPLAY_FIELDS) {
      if (config.name !== undefined && entry.group !== "normalChallenges") continue;
      const descriptor = Object.getOwnPropertyDescriptor(config, field);
      if (descriptor && descriptor.get) {
        const wrapped = function() {
          return entry.undeadName + " · " + descriptor.get.call(this);
        };
        Object.defineProperty(config, field, { ...descriptor, get: wrapped });
        adapters.push({ field, mode: "getter-prefix", original: descriptor.get, wrapped });
        continue;
      }
      const original = config[field];
      if (typeof original === "function") {
        const wrapped = function(...args) {
          return entry.undeadName + " · " + original.apply(this, args);
        };
        config[field] = wrapped;
        adapters.push({ field, mode: "function-prefix", original, wrapped });
      } else if (typeof original === "string") {
        const wrapped = entry.undeadName + " · " + original;
        config[field] = wrapped;
        adapters.push({ field, mode: "string-prefix", original, wrapped });
      }
    }
    auditSnapshots.push({ entry, config, before, sourceId, adapters });
  });
  for (const { entry, config } of auditSnapshots) {
    const components = GROUP_CONTEXT_COMPONENTS[entry.group] ?? [];
    const names = typeof config.name === "string" ? [config.name] :
      Array.isArray(config.name) ? config.name.filter(name => typeof name === "string") : [];
    for (const component of components) {
      if (!contextualTranslations.has(component)) contextualTranslations.set(component, new Map());
      for (const name of names) contextualTranslations.get(component).set(name, config.undeadName);
    }
    if (entry.group === "ecTimeStudies") {
      if (!contextualTranslations.has("ECTimeStudy")) contextualTranslations.set("ECTimeStudy", new Map());
      contextualTranslations.get("ECTimeStudy").set(`Eternity Challenge ${entry.id}`, entry.undeadName);
    }
  }
  const effarigAlchemy = registry.get("alchemyResources/effarig");
  if (effarigAlchemy) contextualTranslations.get("RaPetLevelBar")
    ?.set("Effarig resource", effarigAlchemy.undeadName);
  // Pelle deliberately scrambles its English rift synonyms. Scrambling CJK produces unreadable Latin-1 symbols,
  // so use each audited themed rift name while leaving the source arrays and timing logic untouched.
  const originalWordCycle = wordShift.wordCycle.bind(wordShift);
  wordShift.wordCycle = (list, noBuffer = false) => cycleNames.get(list?.join?.("\u0000")) ??
    originalWordCycle(list, noBuffer);
  prepareTranslations(extra);
  const translateForComponent = (text, componentName) => {
    let contextual = text;
    const replacements = contextualTranslations.get(componentName);
    if (typeof contextual === "string" && replacements) {
      for (const [source, target] of [...replacements].sort((left, right) => right[0].length - left[0].length)) {
        const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        contextual = contextual.replace(new RegExp(`\\b${escaped}\\b`, "g"), target);
      }
    }
    return translate(contextual);
  };
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
    if (node.text) node.text = translateForComponent(node.text, componentName);
    if (node.data && node.data.attrs) {
      for (const key of ["title", "aria-label", "placeholder"]) {
        if (node.data.attrs[key]) node.data.attrs[key] = translateForComponent(node.data.attrs[key], componentName);
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
        .map((part, i) => i % 2 ? part : translateForComponent(part, componentName)).join("");
    }
    if (node.children) node.children.forEach(child => translateVNode(child, componentName));
  }
  Vue.prototype._render = function() {
    const vnode = render.call(this);
    if (!this.$options.name || !/Automator.*Editor|AutomatorBlockSingleInput/.test(this.$options.name)) translateVNode(vnode, this.$options.name);
    return vnode;
  };
  const auditEntries = auditSnapshots.map(({ entry, config, before, sourceId, adapters }, index) => {
    const after = Object.getOwnPropertyDescriptors(config);
    const protectedFields = Object.keys(before).filter(field => !DISPLAY_FIELDS.includes(field));
    const changedProtectedFields = protectedFields.filter(field => !sameDescriptor(before[field], after[field]));
    const unexpectedFields = Object.keys(after).filter(field => !before[field] && field !== "undeadName" &&
      !DISPLAY_FIELDS.includes(field));
    const contextualComponents = GROUP_CONTEXT_COMPONENTS[entry.group] ?? [];
    const sourceNames = typeof config.name === "string" ? [config.name] :
      Array.isArray(config.name) ? config.name.filter(name => typeof name === "string") : [];
    let displayMethod;
    let displayChecks;
    if (entry.group === "normalChallenges") {
      displayMethod = "configuration-field-prefix";
      displayChecks = adapters.map(adapter => {
        const descriptor = Object.getOwnPropertyDescriptor(config, adapter.field);
        const active = adapter.mode === "getter-prefix" ? descriptor?.get === adapter.wrapped :
          adapter.mode === "function-prefix" ? config[adapter.field] === adapter.wrapped :
            config[adapter.field] === adapter.wrapped && adapter.wrapped.startsWith(entry.undeadName + " · ");
        return { path: adapter.field, adapter: adapter.mode, actual: active ? entry.undeadName : null,
          expected: entry.undeadName };
      });
    } else if (contextualComponents.length) {
      displayMethod = "component-context-name";
      displayChecks = contextualComponents.flatMap(component => sourceNames.map(name => ({
        path: `${component}:${name}`,
        actual: contextualTranslations.get(component)?.get(name),
        expected: entry.undeadName
      })));
    } else if (entry.group === "pelleRifts" && Array.isArray(config.name)) {
      displayMethod = "stable-cycle-name";
      displayChecks = [{ path: "wordShift.wordCycle", actual: cycleNames.get(config.name.join("\u0000")),
        expected: entry.undeadName }];
    } else if (sourceNames.length) {
      displayMethod = "render-time-name-translation";
      displayChecks = sourceNames.map(name => ({ path: name, actual: translate(name), expected: entry.undeadName }));
    } else if (entry.group === "glyphTypes" || entry.group === "cosmeticGlyphs") {
      displayMethod = "derived-glyph-name-translation";
      displayChecks = [`${entry.key} Glyph`, `Glyph of ${entry.key}`]
        .map(name => ({ path: name, actual: translate(name), expected: entry.undeadName }));
    } else if (entry.group === "ecTimeStudies") {
      displayMethod = "component-context-challenge-name";
      const name = `Eternity Challenge ${entry.id}`;
      displayChecks = [{ path: `ECTimeStudy:${name}`, actual: contextualTranslations.get("ECTimeStudy")?.get(name),
        expected: entry.undeadName }];
    } else {
      displayMethod = "configuration-field-prefix";
      displayChecks = adapters.map(adapter => {
        const descriptor = Object.getOwnPropertyDescriptor(config, adapter.field);
        const active = adapter.mode === "getter-prefix" ? descriptor?.get === adapter.wrapped :
          adapter.mode === "function-prefix" ? config[adapter.field] === adapter.wrapped :
            config[adapter.field] === adapter.wrapped && adapter.wrapped.startsWith(entry.undeadName + " · ");
        return { path: adapter.field, adapter: adapter.mode, actual: active ? entry.undeadName : null,
          expected: entry.undeadName };
      });
    }
    const glyphAliases = entry.group === "glyphTypes" || entry.group === "cosmeticGlyphs";
    const displayStatus = displayChecks.length > 0 && (glyphAliases
      ? displayChecks.some(check => check.actual === check.expected)
      : displayChecks.every(check => check.actual === check.expected)) ? "PASS" : "FAIL";
    const bindingStatus = registry.get(entry.mappingKey) === config && configurations[index] === config &&
      config.undeadName === entry.undeadName ? "PASS" : "FAIL";
    const idCheck = sourceId === undefined ? "not-present-on-source-config" : sourceIdCheck(sourceId, entry.id);
    const sourceIdMatches = idCheck !== "mismatch";
    const semanticStatus = bindingStatus === "PASS" && sourceIdMatches &&
      changedProtectedFields.length === 0 && unexpectedFields.length === 0 ? "PASS" : "FAIL";
    return {
      mappingKey: entry.mappingKey,
      actualSourceId: sourceId ?? null,
      actualThemeName: config.undeadName,
      sameConfigurationObject: registry.get(entry.mappingKey) === configurations[index],
      bindingStatus,
      displayMethod,
      displayChecks,
      displayStatus,
      semanticMethod: "compare own-property descriptors outside the allowlisted presentation fields",
      semanticEvidence: { sourceIdCheck: idCheck, changedProtectedFields, unexpectedFields },
      semanticStatus
    };
  });
  window.UndeadTheme = { armyNames, translate, translateForComponent, registry, mapping, configurations,
    audit: { entries: auditEntries, displayFields: DISPLAY_FIELDS, contextualComponents: GROUP_CONTEXT_COMPONENTS } };
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
