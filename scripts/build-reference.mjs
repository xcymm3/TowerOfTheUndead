// Test-only independent upstream build, never shipped as part of the game.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { root, fingerprint, recordBuild } from './runtime-fingerprint.mjs'
const input = fingerprint('reference')
const source = path.join(root, 'vendor/antimatter')
const stage = path.join(root, '.runtime-reference')
if (!fs.existsSync(path.join(source, 'node_modules/@vue/cli-service/bin/vue-cli-service.js'))) {
  const install = spawnSync('npm', ['ci', '--no-audit', '--no-fund'], {
    cwd: source, stdio: 'inherit', shell: process.platform === 'win32'
  })
  if (install.status !== 0) process.exit(install.status ?? 1)
}
fs.mkdirSync(stage, { recursive: true })
for (const name of ['src', 'public', 'package.json', 'babel.config.js', '.browserslistrc']) {
  fs.cpSync(path.join(source, name), path.join(stage, name), { recursive: true })
}
if (!fs.existsSync(path.join(stage, 'node_modules'))) fs.symlinkSync(path.join(source, 'node_modules'), path.join(stage, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir')
const ui = path.join(stage, 'src/core/ui.js')
fs.writeFileSync(ui, fs.readFileSync(ui, 'utf8').replace(/Vue.use\(VueGtag, \{\s*config: \{ id: "UA-77268961-1" \}\s*\}\);/, '// Test baseline: analytics disabled.'))
fs.writeFileSync(path.join(stage, 'vue.config.js'), `module.exports = { publicPath: './', outputDir: ${JSON.stringify(path.join(root, 'public/reference'))}, lintOnSave: false, productionSourceMap: false, configureWebpack: { optimization: { minimize: false } } };`)
const result = spawnSync(process.execPath, [path.join(source, 'node_modules/@vue/cli-service/bin/vue-cli-service.js'), 'build'], { cwd: stage, stdio: 'inherit' })
process.exitCode = result.status ?? 1
if (result.status === 0) recordBuild('reference', input)
