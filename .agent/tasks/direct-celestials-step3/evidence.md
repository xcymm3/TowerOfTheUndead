# 第 3 步验收证据

验证日期：2026-09-18。验证对象为当前工作树，最终定向回归在最后一次实现和文案修改后重新运行。

| AC | 结论 | 证据 |
| --- | --- | --- |
| AC1 | PASS | `raw/verification-final/runtime-report.json`：Teresa 奖励、Effarig 三阶段、Enslaved/V/Ra 的进入与完成/退出、Laitela 完成链均通过；Pelle 仅验证未封界页面边界。 |
| AC2 | PASS | Enslaved 等价购买、双储时、提示、领域完成和折叠墓室；V 自然前置、六项功业、奖励、重试及退出均通过并与 reference 快照相等。 |
| AC3 | PASS | Ra 四位先祖依次解锁、两类升级、生产、追忆、炼金反应和特殊冥器全部通过；`Ra.petWithRemembrance` 保持原值 `The Nameless Ones`。 |
| AC4 | PASS | 四阶灾厄化身、三种升级、晋升、湮灭、八阶领域、死星凝聚/上限、全部 30 项里程碑阈值和 4 个自动化开关通过。 |
| AC5 | PASS | 七页在 320/375/414/768/1024/1440 六档宽度无根容器或可见控件越界；最终截图位于 `raw/verification-final/`。Laitela 对比度和 Pelle 固定宽度已修复，新增关键英文残留断言通过。 |
| AC6 | PASS | 上游 820 文件、767 映射及模拟基线校验通过；typecheck、lint、完整构建、主宰定向回归和正式产物冒烟均通过。 |

## 最终命令

- `node scripts/verify-source.mjs`：PASS，见 `raw/verify-source.txt`。
- `pnpm typecheck`：PASS，见 `raw/typecheck.txt`。
- `pnpm lint`：PASS，见 `raw/lint.txt`。
- `pnpm build`：PASS；只有既有 Browserslist 与包体积警告，见 `raw/build-verification.txt`。
- `TEST_FILTER="Celestial UI|Celestial completion" pnpm test:runtime`：11 项 PASS、0 个浏览器错误，见 `raw/verification-final/test.log` 与 `runtime-report.json`。
- `pnpm test:production`：PASS，正式目录完成站点载入、实际购买、军团同步、保存与刷新恢复，见 `raw/production-final.txt`。

第 6 步才执行计划中的集中全量跨阶段回归；本结论不把阶段夹具描述为新档自然长线通关，也不包含第 4 步的终焉闭环。
