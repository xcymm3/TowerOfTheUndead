import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { root } from './runtime-fingerprint.mjs'
process.chdir(root)
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
  'src/main.js', 'src/supported-browsers.js', 'src/components/GameUIComponent.vue',
  'src/components/tabs/antimatter-dimensions/AntimatterDimensionsTab.vue'])
if (fs.existsSync('.runtime-build/src')) {
  for (const [file, expected] of Object.entries(manifest.files)) {
    if (!file.startsWith('src/') || allowed.has(file)) continue
    assert.equal(hash(fs.readFileSync(path.join('.runtime-build', file))), expected, 'Simulation changed during build: ' + file)
  }
  // The storage adapter may change only the six local key names, never reset/serialization logic.
  const original = fs.readFileSync('vendor/antimatter/src/core/storage/storage.js', 'utf8').replace(/\r\n/g, '\n')
  const adapted = original.replace('DEV ? "dimensionTestSave" : "dimensionSave"', 'DEV ? "undeadTowerTestSave" : "undeadTowerSave"')
    .replace('`backupTestSave-${saveSlot}-${backupSlot}` : `backupSave-${saveSlot}-${backupSlot}`', '`undeadBackupTest-${saveSlot}-${backupSlot}` : `undeadBackup-${saveSlot}-${backupSlot}`')
    .replace('`backupTestTimes-${saveSlot}` : `backupTimes-${saveSlot}`', '`undeadBackupTestTimes-${saveSlot}` : `undeadBackupTimes-${saveSlot}`')
  assert.equal(fs.readFileSync('.runtime-build/src/core/storage/storage.js', 'utf8'), adapted, 'Unexpected storage adapter change')
}
if (fs.existsSync('.runtime-reference/src')) {
  for (const [file, expected] of Object.entries(manifest.files)) {
    if (!file.startsWith('src/') || file === 'src/core/ui.js') continue
    assert.equal(hash(fs.readFileSync(path.join('.runtime-reference', file))), expected, 'Reference simulation changed: ' + file)
  }
}
for (const entry of mapping.entries) {
  assert.ok(entry.undeadName && entry.fields && manifest.files[entry.file], 'Incomplete mapping: ' + entry.mappingKey)
}
console.log('PASS: ' + Object.keys(manifest.files).length + ' upstream files unchanged; 767 unique mappings; simulation build matches baseline.')
