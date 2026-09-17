# 亡灵之塔 · Tower of the Undead

以骷髅为主题的增量游戏基础工程，使用 React、TypeScript、Vite 和 pnpm。

## 本地开发

使用 Node.js 22.12+，pnpm 11.19.0。

```sh
pnpm install
pnpm dev
```

访问终端显示的本地地址。

- `pnpm lint`：代码检查
- `pnpm typecheck`：TypeScript 检查
- `pnpm build`：类型检查并构建到 dist
- `pnpm preview`：预览构建结果

## 目录

- `src/components/`：展示组件
- `src/game/config.ts`：游戏基础配置
- `src/game/state.ts`：初始状态工厂
- `src/game/types.ts`：状态类型
- `src/App.tsx`：页面组装
- `src/App.css`：页面布局
- `src/index.css`：全局样式
- `src/main.tsx`：React 入口
- `tokens.css`：颜色和字体变量

当前工作区已接入原作 Vue 运行时，使用 React 外壳展示资源与军团，并包含购买、生产、重置、存档及离线逻辑。中断前的实现尚未全部提交和验收，不能视为完整交付；上述目录中的初始状态文件也不代表现用模拟内核。

恢复开发前请阅读[开发进度与五步计划](./docs/亡灵之塔-开发进度与五步计划.md)，其中记录源码基线、已验证范围、现有架构与后续五步验收标准。

依赖使用 pnpm 管理，提交 pnpm-lock.yaml 以固定安装结果。
