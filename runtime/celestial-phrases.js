// Presentation-only wording for the seven master pages. Mechanics, IDs, formulas, and script grammar stay upstream.
export const celestialPhrases = {
  "Start The Nameless Ones' Reality": "进入缚时幽魂领域",
  "You are inside The Nameless Ones' Reality": "当前位于缚时幽魂领域",
  "Charge Black Hole": "封存死寂钟时间",
  "Charging Black Hole": "正在封存死寂钟时间",
  "Discharge Black Hole": "释放封存冥界时间",
  "Store real time": "封存现实时间",
  "Storing real time": "正在封存现实时间",
  "Offline Progress is disabled": "离线收益已停用",
  "Offline time stored": "离线时间将被封存",
  "Offline time used for production": "离线时间用于正常产出",
  "Glyph levels are boosted to a minimum of": "冥器等级最低提升至",
  "Infinity, Time, and 8th Antimatter Dimension purchases are limited to 1 each.": "通灵者、墓园祭坛和灾厄领主均只能购买 1 次。",
  "The Black Hole is disabled.": "死寂双钟已停用。",
  "Tachyon Particle production and Dilated Time production are severely reduced.": "逆命烬与幽夜流沙产出大幅降低。",
  "Time Theorem generation from Dilation Glyphs is disabled.": "永夜冥器不再生成冥典页。",
  "Certain challenge goals are increased.": "部分试炼目标提高。",
  "Reward: Unlock Tesseracts, which let you increase Infinity Dimension caps (see Infinity Dimension tab)": "奖励：解锁折叠墓室，用于提高通灵者持有上限（见通灵者页面）。",
  "Your maximum Dark Matter ever is": "历史最高灾厄精粹为",
  "Dark Matter Dimensions are unaffected by storing real time.": "封存现实时间不会影响灾厄化身。",
  "Total time to condense:": "凝聚死星总耗时：",
  "Singularity gain rate:": "死星获取速率：",
  "Manual Singularity gain rate:": "手动死星获取速率：",
  "Automatic Singularity gain rate:": "自动死星获取速率：",
  "Each step increases the required Dark Energy by": "每提高一档，所需寂灭能量变为",
  "but also increases gained Singularities by": "同时死星收益变为",
  "Mouse-over the icons below the bar to see descriptions of upgrades,": "将指针移至进度条下方图标可查看升级说明，",
  "and mouse-over icons for specific resource information.": "将指针移至问号图标可查看资源详情。",
  "and mouse-over ": "并将指针移至",
  " icons for specific resource information.": "图标可查看资源详情。",
  "Storing real time prevents Memory Chunk generation, but Memories will still be gained normally.": "封存现实时间时不会生成追忆残片，但仍会正常获得先祖追忆。",
  "You must have 17 rows of Achievements and all of your Glyph Alchemy Resources capped to unlock Pelle, Celestial of Antimatter.": "需要完成 17 行功业，并使全部冥器炼金资源达到上限，才能解锁死亡化身·厄瑞斯。",
  "0 / 17 Achievement rows completed": "已完成 0 / 17 行功业",
  "0 / 21 capped Alchemy Resources": "已有 0 / 21 项炼金资源达到上限",
  "Examine the Reality more closely...": "仔细检视缚时领域……",
  "Start V's Reality.": "进入恐惧骑士长领域",
  "You are in V's Reality.": "当前位于恐惧骑士长领域",
  "Create a Cursed Glyph": "锻造诅咒冥器",
  "Hard V": "高阶誓约",
  "V-Achievements can only be completed within V's Reality, but are permanent and do not reset upon leaving and re-entering the Reality.":
    "誓约功业只能在恐惧骑士长领域内完成；完成记录永久保留，退出或重入领域不会重置。",
  "Start Ra's Reality": "进入不朽巫妖领域",
  "All Memories have been returned.": "四位先祖的追忆均已归还。",
  "Click for alchemy info": "查看冥器炼金说明",
  "Enable all reactions": "启用全部炼金反应",
  "Disable all reactions": "停用全部炼金反应",
  "View Reality Glyph creation": "查看特殊冥器锻造",
  "Reality Glyph Creation": "特殊冥器锻造",
  "Available Effects:": "可用效果：",
  "Create a Reality Glyph!": "锻造特殊冥器",
  "Reality Glyph level must be higher than 0": "特殊冥器等级必须高于 0",
  "You cannot create Reality Glyphs while Doomed": "终焉封界中无法锻造特殊冥器",
  "Click for Lai'tela info": "查看灾厄君主说明",
  "Max all Dark Matter Dimensions": "全部升级灾厄化身",
  "Start Lai'tela's Reality": "进入灾厄君主领域",
  "Not completed at this tier": "当前阶位尚未完成",
  "Show all milestones": "查看全部死星里程碑",
  "Decrease Singularity cap.": "降低死星凝聚上限",
  "Increase Singularity cap.": "提高死星凝聚上限",
  "Annihilate your Dark Matter Dimensions": "湮祭全部灾厄化身",
  "Continuum percentage multiplier": "永续召唤比例倍率",
  "Dark Matter production multiplier": "灾厄精粹产出倍率",
  "Dark Energy production multiplier": "寂灭能量产出倍率",
  "Dark Matter Dimension upgrades are cheaper": "降低灾厄化身升级费用",
  "Singularity gain multiplier": "死星凝聚收益倍率",
  "Dark Matter Dimension interval decrease": "缩短灾厄化身产出间隔",
  "Auto-buy DMD:": "自动升级灾厄化身：",
  "Auto-Ascend:": "自动虚渊晋升：",
  "Auto-Singularity:": "自动凝聚死星：",
  "Auto-Annihilation:": "自动虚渊湮祭：",
  "Show Hard V": "显示高阶誓约",
  "Hide Hard V": "隐藏高阶誓约"
};

export function translateCelestials(text) {
  return text
    .replace(/Start (?:The )?Nameless(?: Ones)?' Reality/gi, "进入缚时幽魂领域")
    .replace(/Start V's Reality\.?/gi, "进入恐惧骑士长领域")
    .replace(/Start Ra's Reality/gi, "进入不朽巫妖领域")
    .replace(/Start Lai'tela's Reality/gi, "进入灾厄君主领域")
    .replace(/You have unlocked V, The Celestial Of Achievements!/gi, "已解锁恐惧骑士长·瓦尔格")
    .replace(/V-Achievement/gi, "誓约功业")
    .replace(/(?:Each\s+)?Memory Chunks? generate(?:s)? a base of one Memory per second/gi, "每个追忆残片每秒生成 1 点先祖追忆")
    .replace(/Gain ([\d.,]+%) more Memories/gi, "先祖追忆产出提高 $1")
    .replace(/Gain ([\d.,]+%) more Memory Chunks/gi, "追忆残片产出提高 $1")
    .replace(/Stored game time is discharged at a reduced effectiveness\s*\(exponent\^([\d.,]+)\)\./gi,
      "封存冥界时间的释放效率降低（指数为 $1）。")
    .replace(/While charging,\s+game speed multipliers are disabled,\s+and the lost speed is converted into stored game time\.\s+Discharging the Black Hole allows you to skip\s+forward in time\.\s+Stored game time is also used to unlock certain upgrades\./gi,
      "封存冥界时间时，其他速度倍率全部停用，损失的速度会转化为封存时间。释放死寂钟可让进度向前推进；封存时间也用于解锁特定能力。")
    .replace(/You only have\s+([\d.,]+)\s+Dimension Boosts and can not gain any more\./gi, "你最多只能筑塔 $1 次，且无法继续筑塔。")
    .replace(/The Tickspeed purchase multiplier is fixed at\s+(×?[\d.,]+)\./gi, "魂火节律的购买倍率固定为 $1。")
    .replace(/Within Ra's Reality,\s+Memory Chunks for Celestial Memories\s+will be generated based on certain resource amounts\./gi,
      "在不朽巫妖领域中，四位先祖会依据各自资源生成追忆残片。")
    .replace(/giving\s+([\d.,]+%)\s+more purchases from Continuum/gi, "使永续召唤额外购买 $1")
    .replace(/Each step increases the required Dark Energy by\s+(×?[\d.,]+),\s+but also increases gained Singularities by\s+(×?[\d.,]+)\./gi,
      "每提高一档，上限所需寂灭能量变为 $1，同时死星收益变为 $2。")
    .replace(/Reach\s+([\d.,]+)\s+Singularities\s+to unlock Bulk Singularities\./gi, "达到 $1 颗死星后解锁批量凝聚。")
    .replace(/You must have ([\d.,]+) rows of Achievements\s+and all of your Glyph Alchemy Resources capped to unlock Pelle, Celestial of Antimatter\./gi,
      "需要完成 $1 行功业，并使全部冥器炼金资源达到上限，才能解锁死亡化身·厄瑞斯。")
    .replace(/([\d.,]+) \/ ([\d.,]+) Achievement rows completed/gi, "已完成 $1 / $2 行功业")
    .replace(/([\d.,]+) \/ ([\d.,]+) capped Alchemy Resources/gi, "已有 $1 / $2 项炼金资源达到上限")
    .replace(/Give Remembrance to /gi, "将追忆凝视赐予")
    .replace(/Remembrance given to /gi, "追忆凝视已赐予")
    .replace(/Create a level ([\d.,]+) Reality Glyph/gi, "锻造等级 $1 的特殊冥器")
    .replace(/Reality Glyphs/gi, "特殊冥器")
    .replace(/Reality Glyph/gi, "特殊冥器")
    .replace(/Condense all Dark Energy into (?:a )?Singularit(?:y|ies)/gi, "将全部寂灭能量凝聚为死星")
    .replace(/Reach (.*?) Dark Energy to condense/gi, "达到 $1 寂灭能量后凝聚")
    .replace(/Unlock Singularities in (.*?)\./gi, "将在 $1 后解锁死星。")
    .replace(/Annihilation requires (.*?) Dark Matter/gi, "虚渊湮祭需要 $1 灾厄精粹")
    .replace(/Average gain:/gi, "平均产出：")
    .replace(/Fastest Completion:/gi, "最快完成：")
    .replace(/Highest active dimension:/gi, "最高可用化身：")
    .replace(/Glyph Set:/gi, "冥器套装：")
    .replace(/You have ([\s\S]*?) Singularit(?:y|ies)/gi, "持有 $1 死星")
    .replace(/You have ([\s\S]*?) Dark Energy/gi, "持有 $1 寂灭能量")
    .replace(/You have ([\s\S]*?) Dark Matter/gi, "持有 $1 灾厄精粹");
}
