import { spawnSync } from 'node:child_process'
import { root, isBuildCurrent } from './runtime-fingerprint.mjs'
if (!isBuildCurrent('runtime')) {
  console.log('运行时缺失或源码已改变，正在重新构建。')
  const result = spawnSync(process.execPath, ['scripts/build-runtime.mjs'], { cwd: root, stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
