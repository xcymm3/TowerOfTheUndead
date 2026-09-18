// Presentation-only terminology. Source identifiers and automator grammar remain stable.
import { translatePhrases } from "./phrases";
export const armyNames = ["骷髅兵", "僵尸", "幽魂", "吸血鬼", "尸巫", "死亡骑士", "骨龙", "灾厄领主"];
export const councilNames = ["守墓侍僧", "招魂师", "诅咒祭司", "亡灵术士", "灵魂编织者", "瘟疫使者", "死亡贤者", "永恒巫妖"];
export const altarNames = ["墓园祭坛", "腐朽祭坛", "幽魂祭坛", "鲜血祭坛", "尸巫祭坛", "黑骑祭坛", "龙墓祭坛", "终寂祭坛"];
export const glossary = {
  "Antimatter Dimensions": "亡灵军团", "Antimatter Dimension": "亡灵军团", "Infinity Dimensions": "通灵者", "Infinity Dimension": "通灵者",
  "Time Dimensions": "墓园祭坛", "Time Dimension": "墓园祭坛", "Dark Matter Dimensions": "灾厄化身", "Dark Matter Dimension": "灾厄化身",
  "Dimension Boosts": "筑塔", "Dimension Boost": "筑塔", "Dimension Shifts": "筑塔开层", "Dimension Shift": "筑塔开层",
  "Imaginary Dimension Boosts": "幻世尖塔", "Dimensional Sacrifice": "灵魂献祭",
  "Antimatter Galaxies": "墓域", "Antimatter Galaxy": "墓域", "Distant Antimatter Galaxies": "远疆墓域",
  "Remote Antimatter Galaxies": "极远墓域", "Replicanti Galaxies": "疫巢", "Replicanti Galaxy": "疫巢",
  "Tachyon Galaxies": "幽夜墓域", "Tachyon Galaxy": "幽夜墓域", "Galaxy Generator": "万墓织机",
  "Infinity Points": "魂印", "Infinity Point": "魂印", "Infinity Power": "冥威", "Banked Infinities": "归档转生",
  "Eternity Points": "冥印", "Eternity Point": "冥印", "Time Shards": "岁月回响",
  "Time Theorems": "冥典页", "Time Theorem": "冥典页", "Space Theorems": "誓约页", "Space Theorem": "誓约页",
  "Time Studies": "冥典研究", "Time Study": "冥典研究", "Triad Studies": "三誓研究", "Triad Study": "三誓研究",
  "Time Dilation": "永夜仪式", "Tachyon Particles": "逆命烬", "Tachyon Particle": "逆命烬", "Dilated Time": "幽夜流沙",
  "Reality Machines": "命匣", "Reality Machine": "命匣", "Imaginary Machines": "虚冥", "Imaginary Machine": "虚冥",
  "Reality Shards": "终焉余烬", "Doomed Reality": "终焉封界", "Doom your Reality": "进入终焉封界",
  "Relic Shards": "遗物碎片", "Relic Shard": "遗物碎片", "Perk Points": "遗赠点", "Perk Point": "遗赠点",
  "Black Holes": "死寂双钟", "Black Hole": "死寂钟", "Stored game time": "封存冥界时间", "Stored real time": "封存现实时间",
  "Memory Chunks": "追忆残片", "Memory Chunk": "追忆残片", "Memories": "先祖追忆",
  "Dark Matter": "灾厄精粹", "Dark Energy": "寂灭能量", "Remnants": "遗骸",
  "The Nameless Ones": "缚时幽魂", "Nameless Ones": "缚时幽魂", "Nameless": "缚时幽魂", "Enslaved": "缚时幽魂",
  "Teresa": "墓园摄政者·莫薇娅", "Effarig": "遗物典藏官·维萨尔", "Laitela": "灾厄君主·奈瑟", "Lai'tela": "灾厄君主·奈瑟", "Ra": "不朽巫妖·阿斯莫", "Pelle": "死亡化身·厄瑞斯", "V": "恐惧骑士长·瓦尔格",
  "Infinity Challenges": "破界试炼", "Infinity Challenge": "破界试炼", "Eternity Challenges": "轮回试炼", "Eternity Challenge": "轮回试炼",
  "Normal Challenges": "亡灵试炼", "Normal Challenge": "亡灵试炼", "Secret Achievements": "隐秘功业", "Secret Achievement": "隐秘功业",
  "Infinity Upgrades": "转生魂契", "Eternity Upgrades": "冥河赐福", "Reality Upgrades": "创世律令", "Imaginary Upgrades": "虚冥律令",
  "Break Infinity": "打破魂界", "Fix Infinity": "收束魂界", "Big Crunch": "转生仪式",
  "Infinities": "转生次数", "Eternities": "轮回次数", "Realities": "创世次数",
  "Antimatter": "游魂", "Tickspeed": "魂火节律", "Replicanti": "疫种", "Infinity": "转生", "Eternity": "轮回", "Reality": "冥界创世",
  "Glyphs": "冥器", "Glyph": "冥器", "Perks": "亡者遗赠", "Perk": "遗赠", "Automator": "塔灵敕令", "Autobuyers": "亡灵执役", "Autobuyer": "执役",
  "Celestials": "冥界主宰", "Celestial": "冥界主宰", "Alchemy": "冥器炼金", "Tesseracts": "折叠墓室", "Tesseract": "折叠墓室",
  "Continuum": "永续召唤", "Singularities": "死星", "Singularity": "死星", "Annihilation": "虚渊湮祭", "Ascension": "虚渊晋升",
  "Armageddon": "焚界重生", "Achievements": "功业", "Achievement": "功业", "Speedrun": "征程计时",
  "Dimensions": "生产", "Dimension": "生产者", "Galaxies": "墓域", "Galaxy": "墓域", "Dilation": "永夜", "Sacrifice": "献祭",
  "Challenges": "试炼", "Challenge": "试炼", "Statistics": "史册", "Options": "设置", "Saving": "存档", "Visual": "画面", "Gameplay": "游戏",
  "Production": "产出", "Normal": "普通", "Secret": "隐秘", "Automation": "执役", "Upgrades": "升级", "Upgrade": "升级", "Milestones": "里程碑",
  "Time Theorem Shop": "冥典购置", "Time Study Tree": "冥典树", "Study Tree": "冥典树", "Time Studies": "冥典研究",
  "Current": "当前", "Cost": "费用", "Costs": "费用", "Requires": "要求", "Requirement": "要求", "Reward": "奖励", "Effect": "效果",
  "Buy Max": "购买最大", "Buy max": "购买最大", "Max all": "全部最大", "Max All": "全部最大", "Buy 1": "单次", "Until 10": "补至十次",
  "Save Game": "保存存档", "Export save": "导出存档", "Import save": "导入存档", "Choose save": "选择存档", "Hard reset": "重置存档",
  "Save": "保存", "Export": "导出", "Import": "导入", "Load": "载入", "Reset": "重置", "Cancel": "取消", "Confirm": "确认", "Close": "关闭",
  "Locked": "未解锁", "Unlocked": "已解锁", "Completed": "已完成", "Purchased": "已购买", "Start": "开始", "Exit": "退出",
  "Enabled": "已启用", "Disabled": "已停用", "Enable": "启用", "Disable": "停用", "Buy": "购买",
  "Active": "征伐", "Passive": "守陵", "Idle": "沉眠", "Settings": "设置", "Records": "记录", "Progress": "进度",
  "Common": "残旧", "Uncommon": "附魔", "Rare": "精良", "Epic": "稀有", "Legendary": "传说", "Mythical": "神话", "Transcendent": "超凡",
  "Infinite": "∞", "Normal matter": "生机侵蚀", "Matter": "生机侵蚀",
  "Rarity": "品相", "Level": "等级", "Recollection": "追忆滋养", "Fragmentation": "残片凝聚", "Remembrance": "追忆凝视",
  "Memory": "先祖追忆", "DM": "灾厄精粹", "DE": "寂灭能量", "Ascend": "虚渊晋升",
  "Light Time Studies": "守墓誓约研究", "Dark Time Studies": "禁忌誓约研究",
  "Current interval": "当前间隔", "Current power": "当前强度", "Current duration": "当前持续时间",
  "Auto": "自动", "Toggle all": "切换全部", "Confirmation options": "确认提示", "Offline progress": "离线收益",
  "Automatically retry challenges": "自动重试试炼", "Automatic tab switching": "自动切换页面", "Update rate": "更新间隔",
  "Export to file": "导出到文件", "Import from file": "从文件导入", "Open Automatic Save Backup Menu": "打开自动备份",
  "Save backup": "存档备份", "Save slots": "存档槽", "Load backup": "载入备份", "Offline ticks": "离线模拟步数",
  "How To Play": "高塔指南", "Type to search...": "搜索规则与系统…",
  "Past Prestige Runs": "历次仪式记录", "Multiplier Breakdown": "倍率明细", "Glyph Set Records": "冥器套装记录", "Challenge records": "试炼记录",
  "Eternity Milestones": "轮回里程碑", "Celestial Navigation": "主宰星图", "Glyph Alchemy": "冥器炼金", "Currently": "当前",
  "Multiplier": "倍率", "Multipliers": "倍率", "Unspent": "未花费", "Total": "累计", "Amount": "数量", "Time": "时间",
  "seconds": "秒", "second": "秒", "minutes": "分钟", "minute": "分钟", "hours": "小时", "hour": "小时", "days": "天", "day": "天",
  "AM": "游魂", "IP": "魂印", "EP": "冥印", "TT": "冥典页", "RM": "命匣", "IM": "虚冥", "PP": "遗赠点",
};
const escaped = text => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
let matcher;
let dictionary;
const translationCache = new Map();
const ordinalMatchers = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"].map(ordinal => [
  new RegExp(ordinal + " (Antimatter Dimension(?:s)?|Antimatter D|AD)\\b", "gi"),
  new RegExp(ordinal + " Infinity Dimension(?:s)?\\b", "gi"),
  new RegExp(ordinal + " Time Dimension(?:s)?\\b", "gi"),
  new RegExp(ordinal + " Dark Matter Dimension(?:s)?\\b", "gi")
]);
export function prepareTranslations(extra = {}) {
  translationCache.clear();
  dictionary = Object.fromEntries(Object.entries({ ...extra, ...glossary }).map(([k, v]) => [k.toLowerCase(), v]));
  matcher = new RegExp("\\b(?:" + Object.keys(dictionary).sort((a, b) => b.length - a.length).map(escaped).join("|") + ")\\b", "gi");
}
export function translate(text) {
  if (typeof text !== "string" || !matcher) return text;
  if (!/[a-z]/i.test(text)) return text;
  if (translationCache.has(text)) return translationCache.get(text);
  let result = translatePhrases(text);
  const clockName = number => Number(number) === 2 ? "第二钟" : "第一钟";
  result = result.replace(/Reduce (?:the )?Black Hole(?: ([12]))?'s inactive time by ([\d.,]+%)/gi,
    (_, n, percent) => clockName(n) + "·缩短沉寂：沉寂时间减少 " + percent)
    .replace(/Make (?:the )?Black Hole(?: ([12]))? ([\d.,]+%) stronger/gi,
      (_, n, percent) => clockName(n) + "·钟鸣强度：强度增加 " + percent)
    .replace(/Extend (?:the )?Black Hole(?: ([12]))?'s duration by ([\d.,]+%)/gi,
      (_, n, percent) => clockName(n) + "·延长回响：持续时间增加 " + percent)
    .replace(/Celestial Glyph of /gi, "主宰 Glyph of ")
    .replace(/'s Recollection/gi, "·追忆滋养").replace(/'s Fragmentation/gi, "·残片凝聚")
    .replace(/Increase the softcap to Tickspeed upgrades from Time Dimensions by ([\d.,]+)/gi,
      "延展回响魂火：祭坛免费魂火软上限增加 $1")
    .replace(/Unlock The Nameless Ones' Reality/gi, "开启缚时领域")
    .replace(/You have ([\s\S]*?) (Infinity Points|Eternity Points|Reality Machines)\./gi, "持有 $1 $2。")
    .replace(/You are getting ([\s\S]*?) antimatter per second\./gi, "每秒获得 $1 游魂。");
  result = result.replace(/Reset your Dimensions and Dimension Boosts to increase the power of Tickspeed upgrades/gi,
    "重置亡灵军团与筑塔，增强魂火节律升级效果")
    .replace(/Increase the power of Tickspeed upgrades/gi, "增强魂火节律升级效果")
    .replace(/Reset your Dimensions to /gi, "重置亡灵军团，")
    .replace(/unlock the ([1-8])(?:st|nd|rd|th) Dimension/gi, (_, n) => "解锁" + armyNames[Number(n) - 1])
    .replace(/and give a (.*?) multiplier\s+to the 1st Dimension/gi, "，骷髅兵获得 $1 倍率")
    .replace(/(?:and )?give a (.*?) multiplier\s+to Dimensions 1-(\d)/gi, "，第 1–$2 阶军团获得 $1 倍率")
    .replace(/(?:and )?give a (.*?) multiplier\s+to all Dimensions/gi, "，全体军团获得 $1 倍率")
    .replace(/Time since last save:/gi, "距上次保存：");
  for (let i = 0; i < 8; i++) {
    result = result.replace(ordinalMatchers[i][0], armyNames[i])
      .replace(ordinalMatchers[i][1], councilNames[i])
      .replace(ordinalMatchers[i][2], altarNames[i]);
    if (i < 4) result = result.replace(ordinalMatchers[i][3], ["憎恶聚合体", "瘟疫巨像", "恐惧收割者", "终末使徒"][i]);
  }
  result = result.replace(matcher, match => dictionary[match.toLowerCase()]);
  if (translationCache.size >= 10000) translationCache.clear();
  translationCache.set(text, result);
  return result;
}
