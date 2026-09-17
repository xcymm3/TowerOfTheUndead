import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { fingerprint, recordBuild } from './runtime-fingerprint.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const vendor = path.join(root, 'vendor/antimatter')
const stage = path.join(root, '.runtime-build')
const input = fingerprint('runtime')
const run = (command, args, cwd) => {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' && command === 'npm' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
if (!fs.existsSync(path.join(vendor, 'node_modules/@vue/cli-service/bin/vue-cli-service.js'))) {
  run('npm', ['ci', '--no-audit', '--no-fund'], vendor)
}
fs.mkdirSync(stage, { recursive: true })
for (const name of ['src', 'public', 'build', 'package.json', 'babel.config.js', '.browserslistrc']) {
  fs.cpSync(path.join(vendor, name), path.join(stage, name), { recursive: true })
}
if (!fs.existsSync(path.join(stage, 'node_modules'))) {
  fs.symlinkSync(path.join(vendor, 'node_modules'), path.join(stage, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir')
}
const modify = (name, from, to) => {
  const file = path.join(stage, name)
  const source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
  if (!source.includes(from)) throw new Error(`Upstream adaptation anchor missing: ${name}`)
  fs.writeFileSync(file, source.replace(from, to))
}
// The vendored simulation is immutable. Only these audited platform/presentation adapters
// are applied to an ignored build workspace. Nothing below changes a gameplay formula.
modify('src/main.js', 'if (browserCheck()) init();', 'installUndeadTheme();\nif (browserCheck()) init();\nstartUndeadBridge();')
modify('src/main.js', 'import "./merge-globals";', 'import "./merge-globals";\nimport { installUndeadTheme, startUndeadBridge } from "./undead/theme";')
modify('src/core/ui.js', 'Vue.use(VueGtag, {\n  config: { id: "UA-77268961-1" }\n});', '// Original analytics deliberately disabled in the standalone edition.')
modify('src/core/storage/storage.js', 'DEV ? "dimensionTestSave" : "dimensionSave"', 'DEV ? "undeadTowerTestSave" : "undeadTowerSave"')
modify('src/core/storage/storage.js', '`backupTestSave-${saveSlot}-${backupSlot}` : `backupSave-${saveSlot}-${backupSlot}`', '`undeadBackupTest-${saveSlot}-${backupSlot}` : `undeadBackup-${saveSlot}-${backupSlot}`')
modify('src/core/storage/storage.js', '`backupTestTimes-${saveSlot}` : `backupTimes-${saveSlot}`', '`undeadBackupTestTimes-${saveSlot}` : `undeadBackupTimes-${saveSlot}`')
fs.cpSync(path.join(root, 'runtime'), path.join(stage, 'src/undead'), { recursive: true })
fs.copyFileSync(path.join(root, 'public/art/army-atlas.png'), path.join(stage, 'src/undead/army-atlas.png'))
fs.copyFileSync(path.join(root, 'runtime/GameUIComponent.vue'), path.join(stage, 'src/components/GameUIComponent.vue'))
fs.copyFileSync(path.join(root, 'runtime/ArmyTab.vue'), path.join(stage, 'src/components/tabs/antimatter-dimensions/AntimatterDimensionsTab.vue'))
// Generate direct references to every original configuration; keys and IDs stay unchanged.
const mapping = JSON.parse(fs.readFileSync(path.join(root, 'docs/反物质维度-映射参数索引.json'), 'utf8'))
fs.writeFileSync(path.join(stage, 'src/undead/mapping.json'), JSON.stringify({
  sourceCommit: mapping.sourceCommit,
  entries: mapping.entries.map(({ group, key, id, undeadName, mappingKey }) => ({ group, key, id, undeadName, mappingKey }))
}))
const files = [...new Set(mapping.entries.map(e => e.file))]
const imports = files.map((file, i) => `import * as module${i} from ${JSON.stringify('@/' + file.slice(4))};`)
const bindings = mapping.entries.map(entry => {
  const parts = entry.group.split('.')
  let expression = `module${files.indexOf(entry.file)}[${JSON.stringify(parts.shift())}]`
  if (entry.group === 'infinityUpgrades.charged') expression += `[${JSON.stringify(entry.key)}].charged`
  else {
    for (const part of parts) expression += `[${JSON.stringify(part)}]`
    expression += `[${JSON.stringify(entry.key)}]`
  }
  return expression
})
fs.writeFileSync(path.join(stage, 'src/undead/bindings.js'), `${imports.join('\n')}\nexport const configurations = [\n${bindings.join(',\n')}\n];\n`)
// Avoid spawning a worker per CPU on memory-constrained development machines.
fs.writeFileSync(path.join(stage, 'vue.config.js'), `module.exports = { parallel: false, publicPath: './', outputDir: ${JSON.stringify(path.join(root, 'public/engine'))}, lintOnSave: false, productionSourceMap: false };`)
const html = fs.readFileSync(path.join(stage, 'public/index.html'), 'utf8')
fs.writeFileSync(path.join(stage, 'public/index.html'), html.replace('lang="en"', 'lang="zh-CN"').replace('<title>Antimatter Dimensions</title>', '<title>亡灵之塔 · 经营</title>').replace(/<link href="https:\/\/fonts.googleapis.com[^>]*>/g, ''))
// Normalize line endings only in the generated workspace before platform adapter checks.
const require = createRequire(path.join(vendor, 'package.json'))
const browserslist = require('browserslist-useragent-regexp')
fs.writeFileSync(path.join(stage, 'src/supported-browsers.js'), `export const supportedBrowsers = ${browserslist.getUserAgentRegExp({ allowHigherVersions: true })};`)
run(process.execPath, [path.join(vendor, 'node_modules/@vue/cli-service/bin/vue-cli-service.js'), 'build'], stage)
recordBuild('runtime', input)
