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

目前仅包含静态起始页面和状态结构。生产循环、购买、重置、存档及正式数值体系尚未实现。状态中的普通数字仅用于初始展示；接入《反物质维度》规模的数值前，需要引入大数方案。

依赖使用 pnpm 管理，提交 pnpm-lock.yaml 以固定安装结果。
