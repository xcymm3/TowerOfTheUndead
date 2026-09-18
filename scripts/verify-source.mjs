import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { canonicalFingerprintContent, root } from './runtime-fingerprint.mjs'
process.chdir(root)
assert.deepEqual(canonicalFingerprintContent('runtime/example.js', Buffer.from('a\r\nb\r\n')), Buffer.from('a\nb\n'))
assert.deepEqual(canonicalFingerprintContent('public/art/army-atlas.png', Buffer.from([0x0d, 0x0a])),
  Buffer.from([0x0d, 0x0a]))
const manifest = JSON.parse(fs.readFileSync('vendor/source-manifest.json', 'utf8'))
const mapping = JSON.parse(fs.readFileSync('docs/反物质维度-映射参数索引.json', 'utf8'))
assert.equal(manifest.sourceCommit, '5409e320cecef96a917cca1dfb68f1f183e499ca')
assert.equal(mapping.sourceCommit, manifest.sourceCommit)
assert.equal(mapping.entries.length, 767)
assert.equal(new Set(mapping.entries.map(e => e.mappingKey)).size, 767)
const hash = data => crypto.createHash('sha256').update(data).digest('hex')
for (const [file, expected] of Object.entries(manifest.files)) {
  assert.equal(hash(fs.readFileSync(path.join('vendor/antimatter', file))), expected, 'Upstream modified: ' + file)
}
const allowed = new Set(['src/core/ui.js', 'src/core/storage/storage.js',
  'src/game.js', 'src/main.js', 'src/supported-browsers.js', 'src/components/GameUIComponent.vue',
  'src/components/tabs/antimatter-dimensions/AntimatterDimensionsTab.vue'])
if (fs.existsSync('.runtime-build/src')) {
  for (const [file, expected] of Object.entries(manifest.files)) {
    if (!file.startsWith('src/') || allowed.has(file)) continue
    assert.equal(hash(fs.readFileSync(path.join('.runtime-build', file))), expected, 'Simulation changed during build: ' + file)
  }
  // The storage adapter may change only the six local key names, never reset/serialization logic.
  const original = fs.readFileSync('vendor/antimatter/src/core/storage/storage.js', 'utf8').replace(/\r\n/g, '\n')
  const backupImportGuard = `    const backupData = GameSaveSerializer.deserialize(importText);
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
    localStorage.setItem(this.backupTimeKey(this.currentSlot), GameSaveSerializer.serialize(backupData.time));`;
  const adapted = original.replace('DEV ? "dimensionTestSave" : "dimensionSave"', 'DEV ? "undeadTowerTestSave" : "undeadTowerSave"')
    .replace('`backupTestSave-${saveSlot}-${backupSlot}` : `backupSave-${saveSlot}-${backupSlot}`', '`undeadBackupTest-${saveSlot}-${backupSlot}` : `undeadBackup-${saveSlot}-${backupSlot}`')
    .replace('`backupTestTimes-${saveSlot}` : `backupTimes-${saveSlot}`', '`undeadBackupTestTimes-${saveSlot}` : `undeadBackupTimes-${saveSlot}`')
    .replace('    const backupData = GameSaveSerializer.deserialize(importText);\n    localStorage.setItem(this.backupTimeKey(this.currentSlot), GameSaveSerializer.serialize(backupData.time));', backupImportGuard)
    .replace('      this.backupTimeData[id] = {', '      this.lastBackupTimes[id] = {')
  assert.equal(fs.readFileSync('.runtime-build/src/core/storage/storage.js', 'utf8'), adapted, 'Unexpected storage adapter change')
  const gameOriginal = fs.readFileSync('vendor/antimatter/src/game.js', 'utf8').replace(/\r\n/g, '\n')
  const gameAdapted = gameOriginal.replace('    ui.view.modal.progressBar = {};', `    ui.view.modal.progressBar = {
      label: "Preparing Offline Progress Simulation",
      info: () => "Preparing the bounded offline calculation…",
      progressName: "Ticks",
      current: 0,
      max: ticks,
      startTime: Date.now(),
      buttons: []
    };`).replace('        then: () => {\n          afterSimulation(seconds, playerStart);\n        },', `        then: () => {
          // A small tick count can finish in the first synchronous batch, so asyncExit is never called.
          if (ui.$viewModel.modal.progressBar !== undefined) {
            ui.$viewModel.modal.progressBar = undefined;
            GameStorage.postLoadStuff();
          }
          afterSimulation(seconds, playerStart);
        },`)
  assert.equal(fs.readFileSync('.runtime-build/src/game.js', 'utf8'), gameAdapted,
    'Unexpected offline progress adapter change')
}
if (fs.existsSync('.runtime-reference/src')) {
  for (const [file, expected] of Object.entries(manifest.files)) {
    if (!file.startsWith('src/') || file === 'src/core/ui.js' || file === 'src/core/storage/storage.js' ||
      file === 'src/game.js') continue
    assert.equal(hash(fs.readFileSync(path.join('.runtime-reference', file))), expected, 'Reference simulation changed: ' + file)
  }
  const original = fs.readFileSync('vendor/antimatter/src/core/storage/storage.js', 'utf8').replace(/\r\n/g, '\n')
  const backupImportGuard = `    const backupData = GameSaveSerializer.deserialize(importText);
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
    localStorage.setItem(this.backupTimeKey(this.currentSlot), GameSaveSerializer.serialize(backupData.time));`;
  const adapted = original
    .replace('    const backupData = GameSaveSerializer.deserialize(importText);\n    localStorage.setItem(this.backupTimeKey(this.currentSlot), GameSaveSerializer.serialize(backupData.time));', backupImportGuard)
    .replace('      this.backupTimeData[id] = {', '      this.lastBackupTimes[id] = {')
  assert.equal(fs.readFileSync('.runtime-reference/src/core/storage/storage.js', 'utf8'), adapted,
    'Unexpected reference storage acceptance fix')
  const gameOriginal = fs.readFileSync('vendor/antimatter/src/game.js', 'utf8').replace(/\r\n/g, '\n')
  const gameAdapted = gameOriginal.replace('    ui.view.modal.progressBar = {};', `    ui.view.modal.progressBar = {
      label: "Preparing Offline Progress Simulation",
      info: () => "Preparing the bounded offline calculation…",
      progressName: "Ticks",
      current: 0,
      max: ticks,
      startTime: Date.now(),
      buttons: []
    };`).replace('        then: () => {\n          afterSimulation(seconds, playerStart);\n        },', `        then: () => {
          // A small tick count can finish in the first synchronous batch, so asyncExit is never called.
          if (ui.$viewModel.modal.progressBar !== undefined) {
            ui.$viewModel.modal.progressBar = undefined;
            GameStorage.postLoadStuff();
          }
          afterSimulation(seconds, playerStart);
        },`)
  assert.equal(fs.readFileSync('.runtime-reference/src/game.js', 'utf8'), gameAdapted,
    'Unexpected reference offline progress acceptance fix')
}
for (const entry of mapping.entries) {
  assert.ok(entry.undeadName && entry.fields && manifest.files[entry.file], 'Incomplete mapping: ' + entry.mappingKey)
}
console.log('PASS: ' + Object.keys(manifest.files).length + ' upstream files unchanged; 767 unique mappings; simulation build matches baseline.')
