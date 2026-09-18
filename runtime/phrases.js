// Wording adapters only: captured values and mathematical expressions come from upstream.
import { midgamePhrases, translateMidgame } from './midgame-phrases';
import { realityPhrases, translateReality } from './reality-phrases';
import { celestialPhrases, translateCelestials } from './celestial-phrases';
import { endgamePhrases, translateEndgame } from './endgame-phrases';

const exact = {
  ...midgamePhrases,
  ...realityPhrases,
  ...celestialPhrases,
  ...endgamePhrases,
  "You are about to do a Dimension Boost Reset": "即将进行筑塔重置",
  "This will reset your Antimatter and Antimatter Dimensions. Are you sure you want to do this?": "这将重置游魂与亡灵军团。确认进行筑塔？",
  "You are about to purchase an Antimatter Galaxy": "即将开辟墓域",
  "Are you sure you want to purchase an Antimatter Galaxy?": "确认开辟墓域？",
  "you will receive a small boost to Tickspeed Upgrades.": "魂火节律升级的效果会得到增强。",
  "You are about to Infinity": "即将进行转生仪式",
  "This animation will occur after every manually-triggered Infinity. If you would like to disable it, there is a setting to do so in the Options tab. This can be done for any visual animation effect in the game after seeing it for the first time.": "每次手动转生都会播放这一动画。首次观看后，可在设置中关闭它；游戏中的其他视觉动画也可在首次观看后关闭。",
  "Okay": "知道了",
  "Since you performed an Infinity in under a minute, the UI changed on the screen. Instead of the Dimensions disappearing, they stay and the Big Crunch button appears on top of them. This is purely visual, and is there to prevent flickering.": "你在一分钟内完成了转生。此后军团面板将保持显示，转生仪式按钮出现在面板上方。这只是为避免画面闪烁而进行的界面调整，不影响游戏数值。",
  "Upon Infinity, all Dimensions, Dimension Boosts, and Antimatter Galaxies are reset.": "转生将重置全部生产者、筑塔和基础墓域。",
  "In return, you gain an Infinity Point (IP). This allows you to buy multiple upgrades that you can find in the Infinity tab. You will also gain one Infinity, which is the stat shown in the Statistics tab.": "作为回报，你会获得 1 魂印，可在魂界中购买升级；同时增加 1 次转生，记录于史册。",
  "unlock Sacrifice": "解锁灵魂献祭",
  "Purchased Upgrade": "次已购升级",
  "Dimensional Sacrifice will remove all of your 1st through 7th Antimatter Dimensions (with the cost and multiplier unchanged), for a boost to the 8th Antimatter Dimension based on the total amount of 1st Antimatter Dimensions sacrificed. It will take time to regain production.": "灵魂献祭将清空第一至第七阶亡灵军团的数量，费用和倍率保持不变；根据累计献祭的骷髅兵数量强化灾厄领主。恢复生产需要时间。",
  "Dimensional Sacrifice will give you a boost to the 8th Antimatter Dimension based on the amount of 1st Antimatter Dimensions you had at the time of Sacrificing.": "灵魂献祭将根据献祭时拥有的骷髅兵数量强化灾厄领主。",
  "This will reset your": "这将重置你的",
  "However,": "同时，",
  "Tickspeed affects 1st Time Dimension with reduced effect": "魂火节律以减弱的效果加成墓园祭坛",
  "You gain more Infinities based on Dimension Boosts": "根据筑塔次数增加获得的转生次数",
  "You keep half of your Replicanti Galaxies on Infinity": "转生时保留一半疫巢",
  "Dimensional Sacrifice affects all other Antimatter Dimensions with reduced effect": "灵魂献祭以减弱的效果加成其余亡灵军团",
  "Dimensional Sacrifice affects 4th Infinity Dimension with greatly reduced effect": "灵魂献祭以大幅减弱的效果加成亡灵术士",
  "Dimensional Sacrifice affects 3rd Time Dimension with greatly reduced effect": "灵魂献祭以大幅减弱的效果加成幽魂祭坛",
  "Dimension Boosts affect Infinity Dimensions": "筑塔加成通灵者",
  "Dimension Boost multiplier based on tick upgrades gained from TDs": "根据祭坛产生的免费魂火升级提高筑塔倍率",
  "Antimatter Dimension multiplier based on time spent in this Eternity": "根据本次轮回持续时间提高亡灵军团倍率",
  "Infinity Dimension multiplier based on fastest Eternity time": "根据最快轮回时间提高通灵者倍率",
  "Time Dimension multiplier based on tick upgrades gained": "根据魂火升级数量提高祭坛倍率",
  "Antimatter Dimension multiplier equal to Replicanti amount": "亡灵军团获得等于疫种数量的倍率",
  "Replicanti Galaxies boost Replicanti multiplier": "疫巢增强疫种倍率",
  "Time Dimension multiplier equal to Replicanti Galaxy amount": "祭坛获得等于疫巢数量的倍率",
  "You gain more Eternity Points based on time spent this Eternity": "根据本次轮回持续时间增加冥印收益",
  "Multiplier to Infinity Points, which decays over this Infinity": "魂印倍率随本次转生持续时间衰减",
  "Multiplier to Infinity Points, which increases over this Infinity": "魂印倍率随本次转生持续时间增长",
  "There is not enough space in this Reality": "当前领域没有足够空间",
  "Antimatter Dimension multiplier based on Eternities": "根据轮回次数提高亡灵军团倍率",
  "Pick a second path from the Dimension Split": "允许选择第二条生产研究分支",
  "All Galaxies are stronger based on your Time Shards": "根据岁月回响增强所有墓域",
  "Dimensional Sacrifice boosts the 8th Antimatter Dimension even more": "灵魂献祭进一步增强灾厄领主",
  "Time Dimension multiplier based on Dimension Boosts": "根据筑塔次数提高祭坛倍率",
  "You gain extra Replicanti Galaxies based on Replicanti amount": "根据疫种数量获得额外疫巢",
  "You gain extra Replicanti Galaxies based on their max": "根据疫巢上限获得额外疫巢",
  "Dimensional Sacrifice affects 4th Time Dimension with reduced effect": "灵魂献祭以减弱的效果加成鲜血祭坛",
  "Dimension Boosts are stronger based on their amount": "根据筑塔次数增强筑塔效果",
  "All Galaxies are stronger based on Antimatter Galaxies": "根据基础墓域数量增强所有墓域",
  "Max Replicanti Galaxy upgrade is cheaper based on current Replicanti": "根据当前疫种数量降低疫巢容量升级费用",
  "Dimensional Sacrifice applies to 1st Antimatter Dimension": "灵魂献祭加成骷髅兵",
  "Time Study 231 improves the effect of Time Study 221": "冥典研究 231 增强研究 221 的效果",
  "Dimensional Sacrifice multiplier is squared": "灵魂献祭倍率平方",
  "Antimatter Dimensions gain a multiplier based on time played": "根据游戏时长提高亡灵军团倍率",
  "Antimatter Dimensions gain a multiplier based on current antimatter": "根据当前游魂提高亡灵军团倍率",
  "Antimatter Dimensions gain a multiplier based on total antimatter produced": "根据累计游魂产量提高亡灵军团倍率",
  "You are currently in the Antimatter Universe (no active challenges)": "当前处于常规墓园，没有进行中的试炼",
  "The world has collapsed due to excess antimatter.": "游魂已达到魂界边界，可以进行转生仪式。",
  "Export tree": "导出研究树", "Import tree": "导入研究树", "Respec Time Studies on next Eternity": "下次轮回时重洗冥典研究",
  "Respec": "重洗", "Download": "下载", "Paste your save here": "在此粘贴存档",
  "Could not load the save (format unrecognized or invalid).": "无法载入存档：格式无法识别或内容无效。",
  "Game imported": "存档已导入", "Game saved": "存档已保存",
};
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const entries = Object.entries(exact).sort((a,b)=>b[0].length-a[0].length)
  .map(([source, target]) => [new RegExp(escape(source).replace(/\s+/g, "\\s+"), "gi"), target]);
const dynamic = [
  [/Multiplier is currently (.*?) and will increase to\s*(.*?) on Dimensional Sacrifice\./gi, "当前倍率为 $1，灵魂献祭后将变为 $2。"],
  [/Improve Replicanti multiplier formula to\s*(.*)/gi, "改善疫种倍率公式：$1"],
  [/Base Replicanti interval limit\s*(.*?)ms\s*➜\s*(.*?)ms/gi, "疫种基础繁衍间隔下限：$1ms ➜ $2ms"],
  [/Powers up multipliers that are based on your Infinities\s*\(Bonuses(.*?)\)/gi, "基于转生次数的倍率变为原倍率的 $1 次幂"],
  [/All Galaxies give a (.*?) multiplier to Infinity Points gained/gi, "所有墓域使魂印收益获得 $1 倍率"],
  [/Antimatter Galaxy requirement increases by (.*?)\s*8th Dimensions instead of (.*)/gi, "基础墓域的灾厄领主需求增量由 $2 降至 $1"],
  [/You gain (.*?) more (Infinity Points|Eternity Points)/gi, "$2 收益获得 $1 倍率"],
  [/You gain Replicanti (.*?) times faster/gi, "疫种繁衍速度变为 $1 倍"],
  [/Base Dimension Boost power becomes (.*)/gi, "筑塔基础强度变为 $1"],
  [/Make the Infinity Point formula better (.*)/gi, "改善魂印收益公式：$1"],
  [/You gain more EP based on how fast your last ten Eternities\s*were(.*)/gi, "根据最近十次轮回的速度提高冥印收益$1"],
  [/You can get (.*?) more Replicanti Galaxies/gi, "疫巢数量上限增加 $1"],
  [/Automatic Replicanti Galaxies are disabled, but you can get (.*?) more/gi, "停用自动疫巢，但疫巢数量上限增加 $1"],
  [/Replicanti Galaxies are (.*?) stronger and Replicanti are\s*(.*?) faster/gi, "疫巢强度增加 $1，疫种繁衍速度变为 $2"],
  [/Replicanti Galaxies are (.*?) stronger/gi, "疫巢强度增加 $1"],
  [/Replicanti are (.*?) slower until (.*?), but /gi, "达到 $2 前，疫种繁衍速度除以 $1；"],
  [/(×[\d.,\w +\-]+) multiplier on all (Time Dimensions|Antimatter Dimensions|Infinity Dimensions)/gi, "所有$2获得 $1 倍率"],
  [/Time Shard requirement for the next Tickspeed upgrade goes up slower\s*(.*)/gi, "免费魂火升级所需岁月回响的需求增长减缓：$1"],
  [/You gain (.*?) of your Infinity Points gained on crunch each second/gi, "每秒获得本次转生预期魂印收益的 $1"],
  [/After Eternity you permanently keep (.*?)\s*of your Infinities as Banked Infinities/gi, "轮回后将转生次数的 $1 永久保留为归档转生"],
  [/Replicanti can go beyond (.*?), but growth slows down at higher amounts/gi, "疫种可超过 $1；数量越高，增长越慢"],
  [/Dimension Boost requirement scaling is reduced by (.*)/gi, "筑塔需求增量减少 $1"],
  [/Dimension Boost costs scale by another (.*?) less/gi, "筑塔需求增量进一步减少 $1"],
  [/Distant Galaxy cost scaling starts (.*?) Galaxies later/gi, "远疆墓域的费用增长推迟 $1 个墓域"],
  [/Distant Galaxy scaling threshold starts another (.*?) Antimatter Galaxies later/gi, "远疆墓域费用增长再推迟 $1 个基础墓域"],
  [/Dimensional Sacrifice formula scales better\s*(.*)/gi, "改善灵魂献祭公式：$1"],
];
export function translatePhrases(text) {
  let value = translateEndgame(translateCelestials(translateMidgame(translateReality(text))));
  for (const [pattern, replacement] of entries) value = value.replace(pattern, replacement);
  for (const [pattern, replacement] of dynamic) value = value.replace(pattern, replacement);
  return value.replace(/\bON\b/g, "开启").replace(/\bOFF\b/g, "关闭")
    .replace(/\bInactive\b/gi, '沉寂').replace(/\bActive\b/gi, '鸣响')
    .replace(/\bremaining\b/gi, '剩余').replace(/\bspeed\b/gi, '速度');
}
