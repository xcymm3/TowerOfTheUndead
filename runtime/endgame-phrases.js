// Presentation-only wording for the final Pelle loop. Mechanics and persisted identifiers stay upstream.
export const endgamePhrases = {
  "Show effects in Doomed Reality": "查看终焉封界规则",
  "Pelle Upgrades": "终焉余烬升级",
  "Pelle Strikes and Rifts": "终焉封印与裂隙",
  "Rifts can be activated by clicking on their bars.": "点击裂隙进度条即可开始或停止填充。",
  "You cannot activate more than two Rifts at once.": "同时最多只能填充两条裂隙。",
  "Rift effects apply even when not activated, and are based on the total amount drained.":
    "裂隙即使停止填充仍会生效，效果取决于累计投入量。",
  "Pelle Strike penalties are permanent and remain active even after Armageddon!":
    "终焉封印的惩罚永久生效，焚界重生也不会移除！",
  "Bought upgrades hidden": "隐藏已购升级",
  "Showing bought upgrades": "显示已购升级",
  "No upgrades to show!": "没有可显示的升级。",
  "Armageddon for": "焚界重生，获得",
  "Unlock the Galaxy Generator": "启动万墓织机",
  "Start over?": "开启新的轮回？",
  "Choose Cosmetic Set": "选择冥器外观套装",
  "You have unlocked all Glyph cosmetic sets!": "所有冥器外观套装均已解锁！",
  "Selected Set:": "已选套装：",
  "None (will choose randomly)": "未选择（将随机抽取）",
  "Reach Infinity": "完成一次转生仪式",
  "Power-up Galaxies": "购得墓域强化",
  "Reach Eternity": "完成一次轮回",
  "Dilate Time": "举行永夜仪式",
  "Time Dilation is permanently active": "永夜仪式永久生效",
  "Penalty:": "惩罚：",
  "Drains": "填充消耗",
  "to fill.": "。",
  "Total Filled:": "累计填充：",
  "Current Amount:": "当前持有：",
  "Sacrifice your": "牺牲",
  "Getting rid of all that": "正在献祭",
  "Galaxies generated": "已生成墓域",
  "Increase base Galaxy generation by 2": "万墓织机基础产出每秒增加 2",
  "Multiply Galaxy generation": "提高万墓织机产出倍率",
  "Gain a multiplier to Antimatter Dimensions": "提高亡灵军团倍率",
  "Gain a multiplier to game speed": "提高游戏速度倍率",
  "Increase the Glyph level allowed in Pelle": "提高终焉封界允许装备的冥器等级",
  "Increase Infinity Power conversion rate": "提高冥威转化率",
  "Multiply Galaxy power": "提高墓域强度倍率",
  "Get permanent Autobuyers for Antimatter Dimensions 1-4": "永久恢复第 1–4 阶亡灵军团执役",
  "Get a permanent Autobuyer for Dimension Boosts": "永久恢复筑塔执役",
  "Autobuyer upgrades no longer reset on Armageddon": "执役升级不再被焚界重生重置",
  "Get permanent Autobuyers for Antimatter Dimensions 5-8": "永久恢复第 5–8 阶亡灵军团执役",
  "Get a permanent Autobuyer for Antimatter Galaxies": "永久恢复墓域执役",
  "Get a permanent Autobuyer for Tickspeed upgrades": "永久恢复魂火节律执役",
  "Infinity Upgrades no longer reset on Armageddon": "转生魂契不再被焚界重生重置",
  "Dimension Boosts no longer reset anything": "筑塔不再重置任何内容",
  "Break Infinity Upgrades no longer reset on Armageddon": "破界升级不再被焚界重生重置",
  "Get permanent Autobuyers for Infinity Dimensions": "永久恢复通灵者执役",
  "Infinity Challenge unlocks and completions no longer reset on Armageddon": "破界试炼的解锁与完成记录不再被焚界重生重置",
  "Galaxies no longer reset Dimension Boosts": "开辟墓域不再重置筑塔",
  "Get permanent Autobuyers for Replicanti Upgrades": "永久恢复疫种升级执役",
  "Replicanti Galaxies no longer reset on Infinity": "转生时不再重置疫巢",
  "Eternities no longer reset on Armageddon": "轮回次数不再被焚界重生重置",
  "Time Studies and Theorems no longer reset on Armageddon": "冥典研究与冥典页不再被焚界重生重置",
  "Replicanti is permanently unlocked": "永久解锁疫种",
  "Eternity Upgrades no longer reset on Armageddon": "冥河赐福不再被焚界重生重置",
  "Get permanent Autobuyers for Time Dimensions": "永久恢复墓园祭坛执役",
  "Eternity Challenge completions no longer reset on Armageddon": "轮回试炼完成记录不再被焚界重生重置",
  "Dilation Upgrades no longer reset on Armageddon": "永夜升级不再被焚界重生重置",
  "Tachyon Particles no longer reset on Armageddon": "逆命烬不再被焚界重生重置",
  "Replicanti Galaxies no longer reset anything they normally reset": "疫巢不再重置其通常会重置的内容",
  "Reset the entire game, but keep Automator Scripts, Study Presets, Secret Themes, Secret Achievements, Options, and Companion Glyph.":
    "重开整个游戏，但保留塔灵敕令脚本、研究预设、隐秘主题、隐秘功业、设置与伴生冥器。",
  "You can use the button in the top-right to view the game as it is right now.":
    "可使用右上角按钮在终幕与当前游戏状态之间切换。",
  "You can also import \"speedrun\" to start the game again with additional tracking for speedrunning purposes.":
    "也可导入“speedrun”开启带有征程计时记录的新游戏。"
};

export function translateEndgame(text) {
  return text
    .replace(/Reach\s+([\d.,]+)\s+TT/gi, "持有 $1 冥典页")
    .replace(/When active, Rifts consume\s+([\d.,]+%)\s+of another resource per second\./gi,
      "裂隙启用后，每秒消耗另一项资源的 $1。")
    .replace(/You encountered a Pelle Strike:\s*/gi, "触发终焉封印：")
    .replace(/You can only have\s+([\d.,]+)\s+rifts active at the same time!/gi,
      "同时最多只能填充 $1 条裂隙！")
    .replace(/You have a total of\s*([\s\S]*?)\s*Galaxies\./gi, "万墓织机当前共有 $1 墓域。")
    .replace(/IP gain\s*/gi, "魂印收益 ")
    .replace(/EP gain\s*/gi, "冥印收益 ")
    .replace(/Replicanti speed\s*/gi, "疫种繁衍速度 ")
    .replace(/Time Dimensions\s*/gi, "墓园祭坛 ")
    .replace(/EP formula:/gi, "冥印公式：")
    .replace(/All Dimensions\s*/gi, "全体生产 ")
    .replace(/Infinity Power Conversion\s*/gi, "冥威转化率 ")
    .replace(/It should be possible to create more, but Pelle has restricted you\. Disregard the\s*/gi,
      "本可继续生成，但死亡化身施加了限制。献祭")
    .replace(/Reset the entire game, but keep Automator Scripts, Study Presets, Secret Themes, Secret Achievements, Options,\s*and Companion Glyph\./gi,
      "重开整个游戏，但保留塔灵敕令脚本、研究预设、隐秘主题、隐秘功业、设置与伴生冥器。")
    .replace(/For completing the game, you also unlock a new cosmetic set of your choice for Glyphs\. These are freely\s*modifiable once you reach Reality again, but are purely visual and offer no gameplay bonuses\./gi,
      "通关后可自选一套新的冥器外观。再次抵达冥界创世后可自由修改；外观不提供任何数值加成。")
    .replace(/You can also import "speedrun" to start the game again with additional tracking for speedrunning purposes\./gi,
      "也可导入“speedrun”开启带有征程计时记录的新游戏。")
    .replace(/You can use the button in the top-right to view the game as it is right now\./gi,
      "可使用右上角按钮在终幕与当前游戏状态之间切换。")
    .replace(/Reset the entire game/gi, "重开整个游戏")
    .replace(/Start over\?/gi, "开启新的轮回？");
}
