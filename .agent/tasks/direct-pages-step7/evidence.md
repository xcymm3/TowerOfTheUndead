# 第七步验收证据

最终结论：`PASS`。本规格 AC-1 至 AC-5 全部通过，原发布标准 AC15 已完成。

## 发布与版本

- GitHub CLI 认证账号为 `xcymm3`，具备 `repo` 与 `workflow` 权限。
- Pages 使用 GitHub Actions 发布，HTTPS 强制开启；可玩地址为 <https://xcymm3.github.io/TowerOfTheUndead/>。
- 部署时的远端 `main` 与发布源码提交均为 `402c9cfc29487dac997fc5030485292d44c58ff3`；其后的纯文档证据提交由 `paths-ignore` 排除，不重复部署。
- Actions 运行 `35323011362` 成功：build 作业 `105529547076`、deploy 作业 `105529842136` 均通过。
- Pages deployment `6520287744` 指向同一源码提交。
- 线上与本地运行时构建指纹均为 `227285cfe86200c978c3563ae5799d041e4fe9a383aa2bc3e9be072186575210`。

## 线上真实操作

- 2026-09-18 对实际 HTTPS 地址运行 `tests/pages.mjs`，未使用测试桥或状态夹具。
- 根页面、正式入口、CSS、JavaScript、引擎、字体、图片和视频资源共记录 51 个成功响应；失败请求 0，浏览器错误 0。
- 从界面完成第一阶购买，右侧军团同步为 `1.0`。
- 执行在线保存并刷新，军团仍为 `1.0`，确认线上持久化有效。
- 报告见 `raw/online-final/pages-report.json`，截图见 `raw/online-final/pages.png`。

## 本次发布修复

首次部署发现 Windows 与 Linux 对同一文本源码计算的指纹不同。指纹输入现对非原版快照文本统一换行为 LF，同时仍按原始字节校验 `vendor/antimatter/` 与图片；源码校验增加文本规范化和二进制不变的防回归断言。重新构建、部署后线上与本地指纹完全一致，玩法、数值、767 条映射、存档和 Automator 语法均未改变。

本地发布链重新通过：正式构建、参考构建、源码校验（820 个原版文件、767 条映射）、类型检查、lint 和正式产物冒烟。未运行 Deadline-Carl。
