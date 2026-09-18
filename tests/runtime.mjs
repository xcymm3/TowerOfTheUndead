import { outputPath } from './output.mjs'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { chromium } from '@playwright/test'
import { isBuildCurrent } from '../scripts/runtime-fingerprint.mjs'
import { earlyInteractions } from './early-interactions.mjs'
import { midgameInteractions } from './midgame-interactions.mjs'
import { researchInteractions } from './research-interactions.mjs'
import { realityInteractions } from './reality-interactions.mjs'
import { automatorInteractions } from './automator-interactions.mjs'
import { storageInteractions } from './storage-interactions.mjs'
import { celestialInteractions } from './celestial-interactions.mjs'
import { endgameInteractions } from './endgame-interactions.mjs'
import { performanceInteractions } from './performance-interactions.mjs'

for (const kind of ['runtime', 'reference']) {
  assert.ok(isBuildCurrent(kind), '构建产物缺失或过期，请先运行 pnpm test：' + kind)
}

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:5180/TowerOfTheUndead/'
const server = process.env.TEST_BASE_URL ? null : spawn(process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5180', '--strictPort'],
  { stdio: 'ignore' })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
for (let i = 0; i < 100; i++) {
  try { if ((await fetch(base)).ok) break } catch {}
  if (i === 99) throw new Error('Test server did not start')
  await delay(100)
}
const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'chrome' } : {}) })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()
const errors = []
page.on('pageerror', error => errors.push(error.message))
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
const results = []
async function test(name, fn) {
  if (process.env.TEST_FILTER && !name.includes(process.env.TEST_FILTER) && name !== 'No browser runtime errors') return
  try { await fn(); results.push({ name, pass: true }); console.log('PASS', name) }
  catch (error) {
    results.push({ name, pass: false, error: error.stack })
    console.error('FAIL', name, error.message)
    await page.screenshot({ path: outputPath(`failure-${results.length}.png`), fullPage: true }).catch(() => {})
  }
}
let engine
let reference
async function reset(frame) {
  await frame.evaluate(() => {
    GameIntervals.stop()
    Date.now = () => 1800000000000
    GameStorage.loadPlayerObject(Player.defaultStart)
    GameIntervals.stop()
    player.auto.autobuyersOn = false
    player.reality.initialSeed = 123456
    player.reality.seed = 123456
    player.reality.secondGaussian = 1e6
    player.records.thisInfinity.time = 1000
    player.records.thisInfinity.realTime = 1000
    player.records.thisEternity.time = 1000
    player.records.thisEternity.realTime = 1000
    player.records.thisReality.time = 1000
    player.records.thisReality.realTime = 1000
    for (const key of Object.keys(player.options.confirmations)) player.options.confirmations[key] = false
    for (const key of Object.keys(player.options.animations)) player.options.animations[key] = false
    player.options.offlineProgress = false
    Modal.hideAll()
    ui.view.quotes.current = undefined
    Lazy.invalidateAll()
    GameUI.update()
  })
}
async function evaluateScenario(frame, action, resetFirst = true) {
  if (resetFirst) await reset(frame)
  return frame.evaluate(script => {
    // Only static test scenarios are evaluated; production has no command evaluation bridge.
    const extra = Function(script)()
    Lazy.invalidateAll()
    return {
      extra,
      souls: player.antimatter.toString(), seals: player.infinityPoints.toString(),
      underworldSeals: player.eternityPoints.toString(), infinityPower: player.infinityPower.toString(),
      timeShards: player.timeShards.toString(), boosts: player.dimensionBoosts, galaxies: player.galaxies,
      infinities: player.infinities.toString(), eternities: player.eternities.toString(), realities: player.realities,
      sacrificed: player.sacrificed.toString(), ticks: player.totalTickBought,
      army: AntimatterDimensions.all.map(d => [d.amount.toString(), d.bought, d.cost.toString(), d.multiplier.toString()]),
      council: InfinityDimensions.all.map(d => [d.amount.toString(), d.bought, d.cost.toString()]),
      altars: TimeDimensions.all.map(d => [d.amount.toString(), d.bought, d.cost.toString()]),
      replicanti: player.replicanti.amount.toString(), tachyons: player.dilation.tachyonParticles.toString(),
      dilatedTime: player.dilation.dilatedTime.toString(),
      upgradeState: [Array.from(player.infinityUpgrades).sort(), Array.from(player.eternityUpgrades).sort(), player.reality.upgradeBits],
      darkMatter: player.celestials.laitela.darkMatter.toString(), darkEnergy: player.celestials.laitela.darkEnergy,
      realityShards: player.celestials.pelle.realityShards.toString()
    }
  }, action)
}

try {
  await page.goto(base)
  engine = await page.locator('iframe').elementHandle().then(e => e.contentFrame())
  await engine.waitForFunction(() => window.UndeadTower && ui.view.initialized)
  await page.getByText('本地存档 · 自动保存').waitFor()
  // Keep upstream autosaves out of the game's storage even on slow test machines.
  const referenceContext = await browser.newContext()
  const referencePage = await referenceContext.newPage()
  referencePage.on('pageerror', error => errors.push('reference: ' + error.message))
  referencePage.on('console', message => { if (message.type() === 'error') errors.push('reference: ' + message.text()) })
  reference = referencePage
  await referencePage.goto(base.replace(/\/$/, '') + '/reference/index.html')
  await referencePage.waitForFunction(() => window.GameStorage && window.ui?.view.initialized)
  await referencePage.evaluate(() => GameIntervals.stop())

  await test('767 mappings bind to their original config objects', async () => {
    const bindings = await engine.evaluate(() => {
      const { mapping, registry, configurations } = UndeadTheme
      return mapping.entries.map((entry, index) => {
        const config = registry.get(entry.mappingKey)
        return {
          mappingKey: entry.mappingKey,
          actualSourceId: config?.id ?? null,
          actualThemeName: config?.undeadName ?? null,
          sameConfigurationObject: config === configurations[index],
          bindingStatus: config && config === configurations[index] &&
            config.undeadName === entry.undeadName ? 'PASS' : 'FAIL'
        }
      })
    })
    const source = JSON.parse(fs.readFileSync('docs/反物质维度-映射参数索引.json', 'utf8'))
    const byKey = new Map(bindings.map(binding => [binding.mappingKey, binding]))
    const entries = source.entries.map(entry => ({
      ...entry,
      sourceLocation: `vendor/antimatter/${entry.file}:${entry.line}`,
      runtime: byKey.get(entry.mappingKey) ?? { bindingStatus: 'FAIL' },
      displayStatus: 'UNKNOWN',
      semanticStatus: 'UNKNOWN',
      gaps: ['尚未逐项核对实际可见文本和语义；原始 fields 表达式仅保留追溯，未逐条复核']
    }))
    fs.writeFileSync(outputPath('mapping-audit.json'), JSON.stringify({
      sourceCommit: source.sourceCommit,
      scope: 'AC10 逐项审计底稿；运行时对象绑定检查不能代替显示、表达式及语义验收',
      entries,
      outsideDatabase: {
        status: 'UNKNOWN',
        categories: ['资源', '阶位', '动态说明', '帮助', '通知', '确认框', '成就与奖励', '结局'],
        gaps: ['分类待逐条盘点，非完整文本清单；已知中英混排见阶段验收方法文档']
      }
    }, null, 2))
    assert.equal(bindings.length, 767)
    assert.equal(byKey.size, 767)
    assert.equal(entries.length, 767)
    assert.deepEqual(entries.filter(entry => entry.runtime.bindingStatus !== 'PASS').map(entry => entry.mappingKey), [])
  })
  await test('Early unlocks respect original parent and subtab gates', async () => {
    await reset(engine)
    await page.waitForTimeout(100)
    assert.equal(await engine.locator('.tower-tabs button:disabled').count(), 3)
    assert.equal(await engine.locator('[data-buy-tier="1"]').isEnabled(), true)
    assert.equal(await engine.locator('[data-buy-tier="2"]').isDisabled(), true)
    assert.equal(await engine.evaluate(() => player.antimatter.toString()), '10')
  })

  const scenarios = [
    ['Initial purchase', 'buyOneDimension(1);'],
    ['Ten-purchase multiplier and cost scaling', 'Currency.antimatter.value = new Decimal(1e12); buyOneDimension(1); buyAsManyAsYouCanBuy(1); buyAsManyAsYouCanBuy(1);'],
    ['Maximum purchases', 'Currency.antimatter.value = new Decimal("1e100"); player.dimensionBoosts = 4; for(let t=1;t<=8;t++) buyOneDimension(t); maxAll();'],
    ['Eight-tier production and tick ordering', 'player.dimensionBoosts = 4; AntimatterDimensions.all.forEach((d,i)=>d.amount=new Decimal((i+1)*10)); for(let i=0;i<100;i++) gameLoop(50);'],
    ['Tickspeed purchase and bulk scaling', 'Currency.antimatter.value=new Decimal(1e12); AntimatterDimension(2).amount=new Decimal(1); buyTickSpeed(); buyMaxTickSpeed();'],
    ['Dimension boost reset', 'AntimatterDimension(4).amount=new Decimal(20); manualRequestDimensionBoost(false);'],
    ['Galaxy reset', 'player.dimensionBoosts=4; AntimatterDimension(8).amount=new Decimal(80); manualRequestGalaxyReset(false);'],
    ['Sacrifice reset', 'player.dimensionBoosts=5; AntimatterDimensions.all.forEach(d=>d.amount=new Decimal(100)); AntimatterDimension(1).amount=new Decimal(1e12); sacrificeReset();'],
    ['NC6 alternate currency', 'player.challenge.normal.current=6; player.dimensionBoosts=4; AntimatterDimension(1).amount=new Decimal(1e20); AntimatterDimension(2).amount=new Decimal(1); buyOneDimension(3);'],
    ['NC9 coupled cost scaling', 'player.challenge.normal.current=9; Currency.antimatter.value=new Decimal(1e30); buyMaxDimension(1); buyAsManyAsYouCanBuy(2);'],
    ['Infinity reset', 'Currency.antimatter.value=new Decimal("1e309"); player.records.thisInfinity.maxAM=new Decimal("1e309"); bigCrunchReset();'],
    ['Infinity upgrade economics', 'player.infinities=new Decimal(1); Currency.infinityPoints.value=new Decimal(100); InfinityUpgrade.totalTimeMult.purchase(); InfinityUpgrade.dim18mult.purchase();'],
    ['Infinity dimension production chain', 'player.eternities=new Decimal(1); player.break=true; InfinityDimensions.all.forEach((d,i)=>{ d.amount=new Decimal(i+1); d.baseAmount=10; }); for(let i=0;i<40;i++) gameLoop(50);'],
    ['Eternity reset and retained milestones', 'player.infinities=new Decimal(10); Currency.infinityPoints.value=new Decimal("1e310"); player.records.thisEternity.maxIP=new Decimal("1e310"); eternity(false, false);'],
    ['Time altar production', 'player.eternities=new Decimal(1); player.dimensions.time[0].amount=new Decimal(50); player.dimensions.time[0].bought=10; for(let i=0;i<100;i++) gameLoop(50);'],
    ['Research prerequisites and costs', 'player.eternities=new Decimal(1); player.timestudy.theorem=new Decimal(1000); TimeStudy(11).purchase(); TimeStudy(21).purchase(); TimeStudy(31).purchase(); return player.timestudy.studies;'],
    ['Dilation penalty and generation', 'player.eternities=new Decimal(100); player.dilation.studies=[1]; player.dilation.active=true; player.dilation.tachyonParticles=new Decimal(100); AntimatterDimension(1).amount=new Decimal(1e20); for(let i=0;i<40;i++) gameLoop(50);'],
    // Avoid achievement 154's 10% bonus in this deterministic reset case; glyph RNG retains the original seed.
    ['First Reality rewards and reset', 'player.records.thisReality.time=120000; player.records.thisReality.realTime=120000; player.eternities=new Decimal(100); player.dilation.studies=[1,2,3,4,5,6]; Currency.eternityPoints.value=new Decimal("1e4000"); player.records.thisReality.maxEP=new Decimal("1e4000"); processManualReality(false); return {rm:player.reality.realityMachines.toString(),glyphs:player.reality.glyphs.inventory.map(g=>({type:g.type,level:g.level,strength:g.strength,effects:g.effects})),pp:player.reality.perkPoints};'],
    ['Seeded glyph generation', 'player.realities=5; return GlyphGenerator.randomGlyph({actualLevel:100,rawLevel:100},new GlyphGenerator.RealGlyphRNG());'],
    ['Black hole three upgrade tracks', 'player.realities=1; player.blackHole[0].unlocked=true; Currency.realityMachines.value=new Decimal(1e8); BlackHole(1).intervalUpgrade.purchase(); BlackHole(1).powerUpgrade.purchase(); BlackHole(1).durationUpgrade.purchase(); return player.blackHole;'],
    ['Continuum and dark matter production', 'player.realities=100; player.reality.imaginaryUpgradeBits|=1<<15; player.celestials.laitela.dimensions[0].amount=new Decimal(1); Currency.antimatter.value=new Decimal("1e100"); for(let i=0;i<100;i++) gameLoop(50);'],
    ['Pelle rifts and terminal resource loop', 'player.realities=100; player.celestials.pelle.doomed=true; player.celestials.pelle.remnants=10; for(let i=0;i<100;i++) gameLoop(50);']
  ]
  for (const [name, action] of scenarios) {
    await test('Parity · ' + name, async () => {
      const expected = await evaluateScenario(reference, action)
      const actual = await evaluateScenario(engine, action)
      assert.deepEqual(actual, expected)
    })
  }

  await earlyInteractions({ page, engine, reference, reset, test, evaluateScenario })
  await midgameInteractions({ page, engine, reference, reset, test })
  await researchInteractions({ page, engine, reference, reset, test })
  await realityInteractions({ page, engine, reference, reset, test })
  await automatorInteractions({ page, engine, reference, reset, test })
  await storageInteractions({ page, engine, reference, reset, test })
  await celestialInteractions({ page, engine, reference, reset, test })
  await endgameInteractions({ page, engine, reference, reset, test })
  await performanceInteractions({ page, engine, reset, test })

  await test('Real purchase click updates army and resource state', async () => {
    await reset(engine)
    await engine.evaluate(() => Tab.dimensions.antimatter.show(true))
    await engine.locator('[data-buy-tier="1"]').click()
    await page.waitForTimeout(400)
    assert.equal(await engine.evaluate(() => AntimatterDimension(1).bought), 1)
    assert.equal(await page.locator('.field-unit.sprite-1').count(), 1)
    assert.equal(await page.locator('.field-unit.sprite-2').count(), 0)
    assert.equal(await engine.evaluate(() => player.antimatter.toString()), '0')
    await page.screenshot({ path: outputPath('desktop-first-recruit.png'), fullPage: true })
  })
  await test('Scene pause never pauses simulation', async () => {
    const before = await engine.evaluate(() => player.antimatter.toNumber())
    await page.getByRole('button', { name: 'Ⅱ 暂停动画' }).click()
    await engine.evaluate(() => gameLoop(1000))
    assert.ok(await engine.evaluate(() => player.antimatter.toNumber()) > before)
    await page.getByRole('button', { name: '▶ 继续动画' }).click()
  })
  await test('Local save isolation and serialization round trip', async () => {
    const result = await engine.evaluate(() => {
      GameStorage.save()
      const save = GameStorage.exportModifiedSave()
      const decoded = GameSaveSerializer.deserialize(save)
      return { key: GameStorage.localStorageKey, bought: decoded.dimensions.antimatter[0].bought,
        originalUntouched: localStorage.getItem('dimensionSave') === null,
        saved: Boolean(localStorage.getItem('undeadTowerSave')) }
    })
    assert.equal(result.key, 'undeadTowerSave')
    assert.equal(result.bought, 1)
    assert.equal(result.saved, true)
    // The reference has an isolated context; this checks writes from the game itself.
    assert.equal(result.originalUntouched, true)
  })
  await test('Save reload and real offline simulation', async () => {
    await engine.evaluate(() => {
      player.options.offlineProgress = true
      player.lastUpdate = Date.now() - 20000
      GameStorage.save()
    })
    // Reload restores real Date.now; pin it to the same test epoch before loading.
    await context.addInitScript(() => { Date.now = () => 1800000000000 })
    await page.reload()
    engine = await page.locator('iframe').elementHandle().then(e => e.contentFrame())
    await engine.waitForFunction(() => window.UndeadTower && ui.view.initialized)
    await engine.waitForFunction(() => !ui.view.modal.progressBar)
    assert.equal(await engine.evaluate(() => AntimatterDimension(1).bought), 1)
    assert.ok(await engine.evaluate(() => player.antimatter.gt(10)))
    await engine.evaluate(() => { GameIntervals.stop(); Modal.hideAll() })
  })
  await test('Responsive views at 320, 375, 414, 768, 1024 and 1440 pixels', async () => {
    for (const width of [320, 375, 414, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 })
      await page.waitForTimeout(100)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Outer overflow at ' + width)
      assert.equal(await engine.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Engine overflow at ' + width)
      assert.equal(await engine.locator('[data-buy-tier="1"]').isVisible(), true)
      await page.screenshot({ path: outputPath('width-' + width + '.png'), fullPage: true })
    }
  })
  await test('All game screens render with progression fixtures', async () => {
    await reset(engine)
    await engine.evaluate(() => {
      player.infinities = new Decimal(1e6)
      player.eternities = new Decimal(1e6)
      player.realities = 100
      player.reality.upgradeBits = (1 << 26) - 1
      player.reality.imaginaryUpgradeBits = (1 << 26) - 1
      player.celestials.teresa.unlockBits = 63
      player.celestials.effarig.unlockBits = 127
      player.celestials.v.unlockBits = 127
      player.celestials.ra.unlockBits = (1 << 29) - 1
      for (const pet of Object.values(player.celestials.ra.pets)) pet.level = 25
      player.dilation.studies = [1,2,3,4,5,6]
      player.reality.automator.forceUnlock = true
      for (const achievement of Achievements.all) achievement.unlock()
      player.celestials.pelle.doomed = false
      AutomatorBackend.initializeFromSave()
      Modal.hideAll()
      ui.view.quotes.current = undefined
      Lazy.invalidateAll()
      // View-only fixture opens every component; this is never installed in production.
      for (const tab of Tabs.all) {
        if (tab.key === 'shop') continue
        tab.config.condition = () => true
        for (const sub of tab.subtabs) sub.config.condition = () => true
      }
      window.__testTabs = Tabs.all.filter(t => t.key !== 'shop').flatMap(t => t.subtabs.map(s => [t.key, s.key]))
    })
    const tabs = await engine.evaluate(() => window.__testTabs)
    for (const [tab, sub] of tabs) {
      await engine.evaluate(([tab, sub]) => {
        Modal.hideAll()
        ui.view.quotes.current = undefined
        Tab[tab][sub].show(true)
        GameUI.update()
      }, [tab, sub])
      await page.waitForTimeout(120)
      assert.ok(await engine.locator('.c-game-tab').count(), 'Missing screen: ' + tab + '/' + sub)
      const fits = await engine.locator('.c-game-tab').evaluate(e => {
        const rect = e.getBoundingClientRect(); return rect.left >= -1 && rect.right <= innerWidth + 1
      })
      assert.equal(fits, true, 'Screen outside management panel: ' + tab + '/' + sub)
      if (['studies', 'glyphs', 'pelle', 'upgrades', 'autobuyers'].includes(sub)) {
        await page.screenshot({ path: outputPath('screen-' + tab + '-' + sub + '.png'), fullPage: true })
      }
    }
    console.log('Rendered', tabs.length, 'game screens')
    await reset(engine)
    await engine.evaluate(() => {
      Tab.dimensions.antimatter.show(true)
      player.dimensionBoosts = 4
      Currency.antimatter.value = new Decimal('1e24')
      AntimatterDimensions.all.forEach((d,i) => d.amount = new Decimal(Math.max(1, 100 - 14*i)))
      Modal.hideAll()
      GameUI.update()
    })
    await page.waitForTimeout(400)
    await page.screenshot({ path: outputPath('desktop-full-army.png'), fullPage: true })
  })
  await test('No browser runtime errors', async () => assert.deepEqual(errors, []))
} finally {
  fs.writeFileSync(outputPath('runtime-report.json'), JSON.stringify({ filter: process.env.TEST_FILTER || null, results, errors }, null, 2))
  await browser.close()
  server?.kill()
}
if (results.some(result => !result.pass)) process.exitCode = 1
