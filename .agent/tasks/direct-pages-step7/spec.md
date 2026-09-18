# 第七步：GitHub Pages 发布验收规格

任务 ID：`direct-pages-step7`

状态：已冻结（2026-09-18）

## 范围

将第六步已通过本地完整验收的当前源码发布到仓库 `xcymm3/TowerOfTheUndead` 的 GitHub Pages。发布使用 GitHub Actions 构建当前源码，不提交 `dist/`，不运行 Deadline-Carl，不改变玩法、数值、767 条映射、存档格式或 Automator 语法。

## 验收条件

### AC-1：认证与发布配置

- GitHub CLI 认证有效，当前账号对目标仓库具有仓库与工作流权限。
- Pages 站点启用并以 GitHub Actions 为构建来源。
- 工作流只在 `main` 推送或手动触发时构建、上传和部署 `dist/`。

### AC-2：正式产物部署

- Actions 从当前提交安装锁定依赖并执行正式构建。
- 部署任务成功，Pages API 返回 HTTPS 地址和最新成功构建状态。
- 线上正式产物与本地最终源码的引擎构建指纹一致。

### AC-3：线上资源与基本操作

- HTTPS 根地址和关键 CSS、JavaScript、引擎、图片资源无 404 或请求失败。
- 在线完成第一阶购买，右侧军团同步显示对应单位。
- 在线保存、刷新后购买与军团状态保持一致。

### AC-4：版本与文档一致性

- 发布提交、`main`、Pages 工作流运行和线上构建指纹可互相追溯。
- 发布方法、实际 URL、运行 ID、提交 SHA 和验收结果写入文档与机器可读证据。
- 所有本次相关改动按 Conventional Commits 提交并推送，不包含用户已有的无关文件。

### AC-5：最终发布结论

- 原发布标准 AC15 的认证、部署、HTTPS 链接与线上验收全部通过。
- 第一步至第七步形成闭环；第六步 AC1–AC14 本地结论继续有效。
- `evidence.md`、`evidence.json`、`verdict.json` 与 `problems.md` 对应本规格全部 AC。

## 通过定义

只有 AC-1 至 AC-5 均有实际 GitHub Pages 运行和线上浏览器操作证据，且线上版本与本次发布提交一致时，才可判定第七步完成。
