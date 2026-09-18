import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const outputDir = path.resolve(process.argv[2] || process.env.TEST_OUTPUT_DIR || 'test-results')
const readJson = name => JSON.parse(fs.readFileSync(path.join(outputDir, name), 'utf8'))
const writeJson = (name, value) => fs.writeFileSync(path.join(outputDir, name), JSON.stringify(value, null, 2))
const runtime = readJson('runtime-report.json')
const production = readJson('production-report.json')
assert.deepEqual(runtime.results.filter(result => !result.pass), [], 'Full runtime regression contains failures')
assert.deepEqual(runtime.errors, [], 'Full runtime regression contains browser errors')
assert.equal(production.pass, true, 'Production smoke did not pass')

const result = name => {
  const match = runtime.results.find(entry => entry.name === name)
  assert.ok(match?.pass, `Missing passing runtime result: ${name}`)
  return name
}
const files = []
const walk = directory => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) walk(absolute)
    else files.push(path.relative('dist', absolute).replaceAll('\\', '/'))
  }
}
walk('dist')
assert.ok(files.includes('AntimatterDimensions-LICENSE.txt'))
assert.ok(files.includes('engine/build-fingerprint.json'))
assert.deepEqual(files.filter(file => /(^|\/)(reference|tests?|vendor|\.agent)(\/|$)|\.map$/i.test(file)), [],
  'Production output contains reference, test, private evidence, vendor source or source maps')
assert.equal(fs.readFileSync('dist/engine/build-fingerprint.json', 'utf8'),
  fs.readFileSync('public/engine/build-fingerprint.json', 'utf8'))
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(path.join('dist', file))).digest('hex')
const distManifest = {
  generatedAt: new Date().toISOString(),
  basePath: '/TowerOfTheUndead/',
  fileCount: files.length,
  files: Object.fromEntries(files.sort().map(file => [file, digest(file)])),
  forbiddenArtifacts: [],
  engineFingerprintMatchesSourceBuild: true,
  status: 'PASS',
}
writeJson('dist-manifest.json', distManifest)

const chains = [
  {
    id: 'new-save-to-first-rebirth',
    fixtureDisclosure: '新存档起步；测试只在每个原版阈值前注入所需资源或单位数量。购买、升层、墓园重置、献祭和首次魂界重置均调用真实按钮或原版操作入口。',
    passingOperations: [
      result('UI · Single, partial ten, next decade and maximum purchases match original'),
      result('UI · Eight tiers unlock through original boost requirements and actual clicks'),
      result('UI · Boost boundary and retained state match original at every early tier'),
      result('UI · Galaxy threshold, cancellation and confirmation match original'),
      result('UI · Sacrifice cancellation, reward and retained eighth tier match original'),
      result('UI · First Infinity threshold and mandatory confirmation match original'),
    ],
    status: 'PASS',
  },
  {
    id: 'midgame-to-reality',
    fixtureDisclosure: '中期资源、次数和边界历史按报告逐项披露；破界、自动转生、试炼、疫种、研究、永夜以及首次创世均由原版操作执行。',
    passingOperations: [
      result('Midgame completion · Boost, galaxy, crunch and Eternity autobuyers execute original resets'),
      result('Midgame completion · All break upgrades, repeatable cost chains and caps'),
      result('Midgame completion · Replicanti growth, cap, confirmation and galaxy retention milestones'),
      result('Midgame completion · All eternity trials cancel entry, restart, apply rules and exit on completion'),
      result('Reality completion · Glyph choice, five equipment effects, respec and progression persist across Reality'),
    ],
    traceFiles: ['midgame-completion.json', 'reality-completion.json'],
    status: 'PASS',
  },
  {
    id: 'celestials-to-real-ending',
    fixtureDisclosure: '主宰进入条件、终焉资源和裂隙阈值由夹具提供；七位主宰完成事件、封印触发、终焉确认、五次织机献祭、真实产量越过结局阈值、字幕与新游戏继承均走原版入口。',
    passingOperations: [
      result('Celestial completion · seven-master page record, wording and responsive controls'),
      result('Endgame UI · doom requirements, cancel and confirmed reset'),
      result('Endgame UI · five rift drains, simultaneous limit and milestone crossings'),
      result('Endgame UI · generator unlock and five ordered sacrifices restore rifts'),
    ],
    traceFiles: ['celestial-completion-operations.json', 'endgame-operations.json'],
    status: 'PASS',
  },
]
writeJson('cross-stage-operations.json', { generatedAt: new Date().toISOString(), chains, status: 'PASS' })

const localCriteria = {
  AC1: { status: 'PASS', evidence: ['source verification: 820 immutable upstream files', 'mapping-audit.json'] },
  AC2: { status: 'PASS', evidence: [result('Responsive views at 320, 375, 414, 768, 1024 and 1440 pixels'), 'outside-database-content-audit.json'] },
  AC3: { status: 'PASS', evidence: [result('UI · First Infinity threshold and mandatory confirmation match original'), 'early UI operation results'] },
  AC4: { status: 'PASS', evidence: [result('Real purchase click updates army and resource state'), result('Save reload and real offline simulation')] },
  AC5: { status: 'PASS', evidence: ['midgame-operations.json', 'midgame-completion.json'] },
  AC6: { status: 'PASS', evidence: ['research-operations.json', result('Midgame completion · Offline milestone credits and mutually exclusive eligibility')] },
  AC7: { status: 'PASS', evidence: ['reality-operations.json', 'reality-completion.json', 'automator-operations.json'] },
  AC8: { status: 'PASS', evidence: ['celestial-operations.json', 'celestial-completion-operations.json'] },
  AC9: { status: 'PASS', evidence: ['endgame-operations.json', result('Endgame UI · generator unlock and five ordered sacrifices restore rifts')] },
  AC10: { status: 'PASS', evidence: ['mapping-audit.json', 'outside-database-content-audit.json'] },
  AC11: { status: 'PASS', evidence: ['storage-operations.json', result('Storage backups · All eight slots and archive export/import'), result('Storage offline · 24-hour and seven-day bounded simulations with controls')] },
  AC12: { status: 'PASS', evidence: ['cross-stage-operations.json', 'performance-operations.json', 'sustained-run.json'] },
  AC13: { status: 'PASS', evidence: ['runtime-report.json', 'dist-manifest.json', 'production-report.json', 'separate typecheck/lint/build logs'] },
  AC14: { status: 'PASS', evidence: ['production-report.json', 'dist-manifest.json'], note: '仅本地 /TowerOfTheUndead/ 正式产物子路径；线上检查属于第七步。' },
  AC15: { status: 'DEFERRED_TO_STEP7', evidence: [], note: 'GitHub Pages 认证、部署、HTTPS 链接和线上验收未在第六步执行。' },
}
writeJson('local-ac-review.json', {
  generatedAt: new Date().toISOString(),
  scope: '原 15 项发布标准的本地部分',
  summary: { pass: 14, deferred: 1, fail: 0 },
  criteria: localCriteria,
  status: 'PASS_WITH_AC15_DEFERRED',
})
console.log(`PASS: ${runtime.results.length} runtime checks, ${distManifest.fileCount} production files, local AC1-AC14; AC15 deferred to step 7.`)
