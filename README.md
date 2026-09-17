# 亡灵之塔 · Tower of the Undead

以亡灵军团与高塔为主题的放置增量游戏。玩法和数值沿用 Antimatter Dimensions 提交 `5409e320cecef96a917cca1dfb68f1f183e499ca`，玩家可见名称遵循 [逐项映射表](./docs/亡灵之塔-逐项内容映射表.md)。当前完成可运行基线接入，完整游戏仍按 [五步计划](./docs/亡灵之塔-开发进度与五步计划.md) 分阶段验收。

## 本地开发

使用 Node.js 22.12+、pnpm 11.19.0，并保留 Node.js 附带的 npm。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

访问终端显示的本地地址。首次启动会用 `npm ci` 安装 `vendor/antimatter/package-lock.json` 锁定的原作依赖，再构建 Vue 运行时，耗时长于后续启动。外壳依赖由根目录 `pnpm-lock.yaml` 锁定。无需相邻的原作仓库，也无需云账号。

每次启动检查运行时输入指纹；运行时源码、映射或相关素材改变后自动重新构建。开发服务器运行期间修改 `runtime/` 时，需执行 `pnpm build:runtime` 并刷新页面；React 外壳支持 Vite 热更新。

## 验证与构建

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:production
pnpm preview
```

- `pnpm test`：重新构建亡灵版与独立原版对照，检查源码与映射，然后执行浏览器回归。Windows 默认使用已安装的 Google Chrome；其他平台先执行 `pnpm exec playwright install chromium`。
- `pnpm test:runtime`：复用当前构建执行校验和回归；任一构建缺失或输入指纹过期时失败，需先运行 `pnpm test`。
- `pnpm build`：重新构建运行时、检查类型、生成完整 `dist/`。原版测试对照不进入交付目录。
- `pnpm test:production`：检查正式产物的许可、运行时指纹及测试目录隔离，并在预览服务中验证载入、购买和军团同步。
- `pnpm preview`：预览 `dist/`。部署时托管整个目录，包括 `engine/` 与 `art/`；通过 HTTP 访问。
- 测试报告与截图写入 `test-results/`，不提交生成产物。

## 当前架构

- `src/App.tsx`、`src/App.css`、`src/index.css`：React 资源栏、军团场景和布局。
- `src/game/bridge.ts`：运行时快照类型与接收校验；通过同源 iframe 消息展示原作状态，不另建数值循环。
- `vendor/antimatter/`：820 个上游文件的固定快照，包含原作大数、生产、购买、重置、自动化、存档与终局逻辑。
- `vendor/source-manifest.json`：源码提交号和逐文件 SHA-256；原作文件保持原样。
- `runtime/`：经营界面、军团页面、映射绑定、文字和样式适配。
- `scripts/`：构建、产物指纹、源码校验；只在忽略的 `.runtime-build/` 和 `.runtime-reference/` 中适配。
- `tests/runtime.mjs`：数值对照、真实交互、存档与离线、响应式和页面渲染测试。
- `docs/`：映射、原始参数索引、参考图和阶段验收记录。

构建适配边界为入口、分析统计关闭、存档键、浏览器支持标识和两个展示组件。购买价格、产出公式、重置收益、挑战条件及随机机制均继续调用原内核。主题适配只改显示名称和文案，不修改成本和效果函数。

本地存档使用 `undeadTowerSave`，备份使用 `undeadBackup-*` / `undeadBackupTimes-*`；测试开发模式有独立对应键。云配置为空，未接入原作账号服务。

## 许可与验收范围

原作 MIT 许可保存在 [vendor/antimatter/LICENSE](./vendor/antimatter/LICENSE) 和 [文档副本](./docs/AntimatterDimensions-MIT-LICENSE.txt)。

阶段回归含原版与亡灵版的固定场景比较，以及使用阶段夹具的页面检查；它们不等于自然推进到结局的完整验证。后期主题化、逐项映射审计和终局操作链仍按五步计划推进。
