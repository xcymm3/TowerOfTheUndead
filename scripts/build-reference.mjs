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
const storage = path.join(stage, 'src/core/storage/storage.js')
let storageSource = fs.readFileSync(storage, 'utf8').replace(/\r\n/g, '\n')
const storageModify = (from, to) => {
  if (!storageSource.includes(from)) throw new Error('Upstream storage acceptance anchor missing')
  storageSource = storageSource.replace(from, to)
}
storageModify('    const backupData = GameSaveSerializer.deserialize(importText);\n    localStorage.setItem(this.backupTimeKey(this.currentSlot), GameSaveSerializer.serialize(backupData.time));', `    const backupData = GameSaveSerializer.deserialize(importText);
    const backupKeys = backupData && typeof backupData === "object"
      ? Object.keys(backupData).filter(key => key !== "time")
      : [];
    const invalidBackup = !backupData || typeof backupData.time !== "object" ||
      backupKeys.some(key => !AutoBackupSlots.some(slot => slot.id === Number(key)) ||
        this.checkPlayerObject(backupData[key]) !== "");
    if (invalidBackup) {
      GameUI.notify.error("Could not import backup saves (format unrecognized or invalid).");
      return;
    }
    localStorage.setItem(this.backupTimeKey(this.currentSlot), GameSaveSerializer.serialize(backupData.time));`)
storageModify('      this.backupTimeData[id] = {', '      this.lastBackupTimes[id] = {')
fs.writeFileSync(storage, storageSource)
const game = path.join(stage, 'src/game.js')
let gameSource = fs.readFileSync(game, 'utf8').replace(/\r\n/g, '\n')
const gameModify = (from, to) => {
  if (!gameSource.includes(from)) throw new Error('Upstream offline acceptance anchor missing')
  gameSource = gameSource.replace(from, to)
}
gameModify('    ui.view.modal.progressBar = {};', `    ui.view.modal.progressBar = {
      label: "Preparing Offline Progress Simulation",
      info: () => "Preparing the bounded offline calculation…",
      progressName: "Ticks",
      current: 0,
      max: ticks,
      startTime: Date.now(),
      buttons: []
    };`)
gameModify('        then: () => {\n          afterSimulation(seconds, playerStart);\n        },', `        then: () => {
          // A small tick count can finish in the first synchronous batch, so asyncExit is never called.
          if (ui.$viewModel.modal.progressBar !== undefined) {
            ui.$viewModel.modal.progressBar = undefined;
            GameStorage.postLoadStuff();
          }
          afterSimulation(seconds, playerStart);
        },`)
fs.writeFileSync(game, gameSource)
fs.writeFileSync(path.join(stage, 'vue.config.js'), `module.exports = { publicPath: './', outputDir: ${JSON.stringify(path.join(root, 'public/reference'))}, lintOnSave: false, productionSourceMap: false, configureWebpack: { optimization: { minimize: false } } };`)
const result = spawnSync(process.execPath, [path.join(source, 'node_modules/@vue/cli-service/bin/vue-cli-service.js'), 'build'], { cwd: stage, stdio: 'inherit' })
process.exitCode = result.status ?? 1
if (result.status === 0) recordBuild('reference', input)
