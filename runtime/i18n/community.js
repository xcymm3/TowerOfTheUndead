import { communityExact, communityTemplates } from "./locales/zh-CN-community";

const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const templates = communityTemplates
  .map(({ source, target }) => ({
    pattern: new RegExp("^" + source.map(escape).join("([\\s\\S]*?)") + "$", "i"),
    target,
    weight: source.reduce((total, part) => total + part.length, 0)
  }))
  .sort((left, right) => right.weight - left.weight);

const themedTerms = [
  ["黑暗物质维度", "灾厄化身"], ["反物质维度", "亡灵军团"], ["无限维度", "通灵者"], ["时间维度", "墓园祭坛"],
  ["维度提升", "筑塔"], ["维度转换", "筑塔开层"], ["维度献祭", "灵魂献祭"],
  ["复制星系", "疫巢"], ["膨胀星系", "幽夜墓域"], ["反物质星系", "墓域"],
  ["无限点数", "魂印"], ["永恒点数", "冥印"], ["现实机器", "命匣"], ["虚幻机器", "虚冥"],
  ["时间之理", "冥典页"], ["时间研究", "冥典研究"], ["空间之理", "誓约页"],
  ["时间膨胀", "永夜仪式"], ["快子粒子", "逆命烬"], ["膨胀时间", "幽夜流沙"],
  ["复制器", "疫种"], ["符文炼金", "冥器炼金"], ["符文", "冥器"], ["复兴点数", "遗赠点"],
  ["黑洞", "死寂钟"], ["黑暗物质", "灾厄精粹"], ["黑暗能量", "寂灭能量"],
  ["现实碎片", "终焉余烬"], ["遗迹碎片", "遗物碎片"], ["奇点", "死星"],
  ["自动购买器", "亡灵执役"], ["自动机", "塔灵敕令"], ["天神", "冥界主宰"],
  ["成就", "功业"], ["挑战", "试炼"], ["统计", "史册"], ["选项", "设置"],
  ["计数频率", "魂火节律"], ["时间碎片", "岁月回响"], ["无限能量", "冥威"],
  ["反物质", "游魂"], ["永恒", "轮回"], ["现实", "冥界创世"]
];

export function retargetCommunityTerms(text) {
  let result = text;
  for (const [source, target] of themedTerms) result = result.replaceAll(source, target);
  return result;
}

export function translateCommunity(text) {
  if (communityExact[text]) return retargetCommunityTerms(communityExact[text]);
  for (const { pattern, target } of templates) {
    const match = text.match(pattern);
    if (!match) continue;
    let result = target[0];
    for (let index = 1; index < target.length; index++) result += match[index] + target[index];
    return retargetCommunityTerms(result);
  }
  return text;
}
