import assert from 'node:assert/strict'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { siteSmoke } from './site-smoke.mjs'
import { isBuildCurrent } from '../scripts/runtime-fingerprint.mjs'

assert.ok(isBuildCurrent('runtime'), '请先运行 pnpm build')
assert.equal(fs.existsSync('dist/reference'), false, '正式产物不得包含原版测试页面')
assert.equal(fs.readFileSync('dist/AntimatterDimensions-LICENSE.txt', 'utf8'),
  fs.readFileSync('vendor/antimatter/LICENSE', 'utf8'))
assert.equal(fs.readFileSync('dist/engine/build-fingerprint.json', 'utf8'),
  fs.readFileSync('public/engine/build-fingerprint.json', 'utf8'), '正式产物必须包含最新运行时')
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview',
  '--host', '127.0.0.1', '--port', '5181', '--strictPort'], { stdio: 'ignore' })
try {
  let ready = false
  for (let i = 0; i < 100; i++) {
    assert.equal(server.exitCode, null, '预览服务器启动失败，请检查 5181 端口')
    try { ready = (await fetch('http://127.0.0.1:5181/TowerOfTheUndead/')).ok } catch { /* Startup pending. */ }
    if (ready) break
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  assert.ok(ready, '预览服务器未就绪')
  await siteSmoke('http://127.0.0.1:5181/TowerOfTheUndead/', 'production')
} finally {
  server.kill()
}
