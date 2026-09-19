import { residualTranslations } from "./locales/zh-CN-residual";
import { residualSegments } from "./locales/zh-CN-segments";
import { retargetCommunityTerms } from "./community";

const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exactTranslations = new Map(residualTranslations
  .filter(({ source }) => !/<x\d+>/.test(source))
  .map(({ source, target }) => [source, target]));
const translations = residualTranslations.filter(({ source }) => /<x\d+>/.test(source)).map(({ source, target }) => {
  const parts = source.split(/<x\d+>/g);
  return {
    pattern: new RegExp("^" + parts.map(escape).join("([\\s\\S]*?)") + "$"),
    target,
    weight: parts.reduce((total, part) => total + part.length, 0)
  };
}).sort((left, right) => right.weight - left.weight);
const segments = residualSegments.map(({ source, target }) => ({
  pattern: new RegExp(`(?<![A-Za-z])${escape(source)}(?![A-Za-z])`, "g"),
  target
}));

export function translateResidualSegments(text) {
  let result = text;
  for (const { pattern, target } of segments) result = result.replace(pattern, target);
  return result;
}

export function translateResidual(text) {
  const exact = exactTranslations.get(text);
  if (exact !== undefined) return retargetCommunityTerms(exact);
  for (const { pattern, target } of translations) {
    const match = text.match(pattern);
    if (!match) continue;
    return retargetCommunityTerms(target.replace(/<x(\d+)>/g, (_, index) => match[Number(index) + 1] ?? ""));
  }
  return text;
}
