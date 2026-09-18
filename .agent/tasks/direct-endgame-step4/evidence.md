# 第 4 步验证证据

验证日期：2026-09-18。结论：PASS。

## 验收标准

- AC1 PASS：界面进入封界后，五道封印分别由转生、墓域强化、轮回、第 115 页冥典和永夜原事件触发；测试不写入 `progressBits`。
- AC2 PASS：5 项有限重复升级均覆盖零资源、恰好费用及上限，23 项一次性升级全部通过界面序列购买；焚界后的显式恢复/保留项与 reference 一致。
- AC3 PASS：五裂隙同时填充上限、15 个里程碑、资源消耗、效果和满额停机全部通过原按钮及循环。
- AC4 PASS：万墓织机由界面解锁，五项升级和五次献祭按原顺序完成；槽位 1 → 0 → 1，裂隙恢复到 200%；亡灵军团生产触发原结局检查。
- AC5 PASS：未直接设置 `player.isGameEnd` 或 `GameEnd.endState`；字幕、新游戏入口、字幕关闭/重开与保留式重置均完成。
- AC6 PASS：终焉关键文案、中文裂隙名、低对比和响应式布局已修复；320、375、414、768、1024、1440 六档无水平溢出或入口裁切。
- AC7 PASS：源码、映射、类型、lint、完整构建和正式产物冒烟均通过。

## 主要产物

- `raw/final/runtime-report.json`：4 项定向结果全部通过，浏览器错误为 0。
- `raw/final/endgame-operations.json`：阶段夹具说明及主题/reference 逐操作快照。
- `raw/final/endgame-rifts.png`、`endgame-generator.png`：裂隙与织机页面。
- `raw/final/endgame-ending-*.png`：六档终幕与新游戏入口。
- `raw/production/production-report.json`：正式产物加载、购买、军团同步、保存和刷新恢复通过，无失败请求。
- `raw/verification-summary.txt`：源码、类型、lint、构建及冒烟命令摘要。

## 范围边界

资源与历史值用于缩短长线等待；封印位、织机阶段、献祭状态、槽位恢复和结局标志不作为夹具写入。第 5 步的 767 条逐项显示/语义审计、第 6 步集中全量回归和第 7 步 GitHub Pages 发布仍按原计划保留。
