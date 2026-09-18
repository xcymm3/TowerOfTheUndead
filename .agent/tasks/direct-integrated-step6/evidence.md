# 第六步验收证据

最终结论：`PASS`。本规格 AC-1 至 AC-7 全部通过；原发布标准 AC1–AC14 的本地部分全部通过，AC15 按计划延期至第七步。

## 新鲜验证

- 完整运行时回归：119/119 通过，浏览器错误 0；见 `raw/full-runtime-final2/runtime-report.json`。
- 源码隔离：820 个上游文件哈希不变，767 条映射唯一，主题与原版模拟构建通过精确适配校验。
- 存档：旧 Base64/单根迁移、五阶段往返、损坏根恢复、三手动槽、8 个自动备份槽、归档导入导出、24 小时与 7 天离线全部通过；见 `storage-operations.json`。
- 跨阶段：新存档至首次转生、中期至创世、七主宰至真实结局三条链通过；见 `cross-stage-operations.json`。
- 持续运行：真实计时器运行 30 秒，7 次采样持续推进，DOM 与代表精灵有界；终焉超大数无 `NaN`、`undefined` 或横向溢出；见 `sustained-run.json`。
- 正式产物：`/TowerOfTheUndead/` 本地子路径加载、购买、军团、保存刷新通过，请求失败和浏览器错误均为 0；见 `production-report.json`。
- 产物审计：143 个正式文件生成 SHA-256；无 reference、test、vendor、`.agent` 或 source map 泄漏；见 `dist-manifest.json`。
- 原 15 项复核：AC1–AC14 为 `PASS`，AC15 为 `DEFERRED_TO_STEP7`；见 `local-ac-review.json`。

## 本次修复

- 修复有效备份归档导入把时间数据写入不存在字段的问题，并拒绝损坏归档而不覆盖有效备份。
- 修复长离线在首批同步完成时残留空进度对象、界面报错且不收尾的问题。
- 补齐两条创世律令动态说明的中文翻译。

以上修复只存在于受校验的构建适配与展示层；原版玩法公式、数值、767 条映射和 Automator 语法未改变。未运行 Deadline-Carl，未部署 GitHub Pages。
