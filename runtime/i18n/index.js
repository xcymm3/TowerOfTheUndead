import { armyNames, translate as translateSource, prepareTranslations } from "../glossary";
import zhCN from "./locales/zh-CN";
import enUS from "./locales/en-US";

const catalogs = { "zh-CN": zhCN, "en-US": enUS };
let locale = "zh-CN";

function interpolate(message, values = {}) {
  return message.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);
}

export const i18n = {
  get locale() { return locale; },
  get availableLocales() { return Object.keys(catalogs); },
  setLocale(nextLocale) {
    if (!catalogs[nextLocale]) throw new Error(`Unsupported locale: ${nextLocale}`);
    locale = nextLocale;
    document.documentElement.lang = nextLocale;
  },
  t(key, values) {
    const message = catalogs[locale][key] ?? catalogs["en-US"][key] ?? key;
    return interpolate(message, values);
  },
  translateSource(text) {
    return locale === "zh-CN" ? translateSource(text) : text;
  }
};

export { armyNames, prepareTranslations };
