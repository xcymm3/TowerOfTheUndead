# GitHub Pages 发布与验收

仓库使用 `.github/workflows/deploy-pages.yml` 从 `main` 构建和发布 GitHub Pages。工作流安装锁定依赖、执行 `pnpm build`，然后只上传 `dist/` 作为 Pages 产物。

## 发布流程

1. 本地完整验收通过后，将相关提交推送至 `main`。
2. GitHub Actions 自动构建并部署；也可在 Actions 页面手动运行 `Deploy GitHub Pages`。
3. 等待部署任务成功，记录运行 ID、提交 SHA 和 Pages URL。
4. 对实际 HTTPS 页面执行与本地正式产物相同的无夹具冒烟：加载、资源状态、第一阶购买、军团同步、保存、刷新恢复。
5. 比较线上 `engine/build-fingerprint.json` 与当前源码正式构建指纹。

线上验收不得调用测试桥、直接修改玩家状态或设置结局标志。发布流程不运行 Deadline-Carl。

实际发布结果和证据记录在 `.agent/tasks/direct-pages-step7/`。

## 2026-09-18 正式发布

- 可玩地址：<https://xcymm3.github.io/TowerOfTheUndead/>
- 发布源码提交：`402c9cfc29487dac997fc5030485292d44c58ff3`
- Actions 运行：<https://github.com/xcymm3/TowerOfTheUndead/actions/runs/35323011362>
- Pages deployment：`6520287744`
- 运行时构建指纹：`227285cfe86200c978c3563ae5799d041e4fe9a383aa2bc3e9be072186575210`

构建与部署作业均成功。最终线上无夹具冒烟记录了 51 个成功响应、0 个请求失败和 0 个浏览器错误；第一阶购买后军团数量为 `1.0`，保存刷新后仍为 `1.0`。线上运行时指纹与本地当前源码正式构建完全一致。`reference/` 是本地差异对照产物，不包含在正式 `dist/` 中。

Actions 当前显示托管 action 使用 Node.js 20 运行时的弃用提示，并由 runner 自动切换到 Node.js 24；该提示未影响本次构建或部署结果。
