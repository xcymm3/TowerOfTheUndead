import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'

const base = process.env.PLAYTHROUGH_URL || 'https://xcymm3.github.io/TowerOfTheUndead/'
const outputDir = path.resolve(process.env.PLAYTHROUGH_OUTPUT || '.agent/tasks/headless-playthrough/raw')
const storageFile = path.join(outputDir, 'storage-state.json')
const logFile = path.join(outputDir, 'playthrough-log.json')
const reset = process.env.PLAYTHROUGH_RESET === '1'
const maxCycles = Number(process.env.PLAYTHROUGH_CYCLES || 120)
fs.mkdirSync(outputDir, { recursive: true })

const startedAt = Date.now()
const errors = []
const failedRequests = []
const actions = []
const milestones = []
let simulatedOffset = 0
let context
let page
let engine

const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'chrome' } : {}) })

const record = (type, detail = {}) => {
  const entry = { atMs: Date.now() - startedAt, simulatedOffsetMs: simulatedOffset, type, ...detail }
  actions.push(entry)
  console.log(JSON.stringify(entry))
}

async function open(storageState) {
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, storageState })
  await context.addInitScript(() => {
    const nativeNow = Date.now.bind(Date)
    Date.now = () => nativeNow() + Number(localStorage.getItem('undead:playthrough-clock-offset') || 0)
  })
  page = await context.newPage()
  page.on('pageerror', error => errors.push({ atMs: Date.now() - startedAt, message: error.message }))
  page.on('console', message => {
    if (message.type() === 'error') errors.push({ atMs: Date.now() - startedAt, message: message.text() })
  })
  page.on('requestfailed', request => failedRequests.push({
    atMs: Date.now() - startedAt,
    url: request.url(),
    error: request.failure()?.errorText
  }))
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 })
  const handle = await page.locator('iframe').elementHandle({ timeout: 60000 })
  engine = await handle.contentFrame()
  await engine.waitForFunction(() => window.UndeadTower && window.ui?.view?.initialized, null, { timeout: 60000 })
  await page.waitForTimeout(1500)
  await settleOffline()
}

async function settleOffline() {
  let stablePolls = 0
  for (let attempt = 0; attempt < 240; attempt++) {
    const speed = engine.locator('.progress-bar-modal button:visible').filter({ hasText: 'up' }).first()
    if (await speed.count() && await speed.isVisible().catch(() => false)) {
      const clicked = await speed.click({ force: true, timeout: 2000 }).then(() => true).catch(() => false)
      if (clicked) record('offline-speed-up')
    }
    if (attempt === 80) {
      const skip = engine.locator('.progress-bar-modal button:visible').filter({ hasText: 'SKIP' }).first()
      if (await skip.count() && await skip.isVisible().catch(() => false)) {
        const clicked = await skip.click({ force: true, timeout: 2000 }).then(() => true).catch(() => false)
        if (clicked) record('offline-skip-after-timeout')
      }
    }
    const progress = engine.locator('.progress-bar-modal')
    if (await progress.count() && await progress.isVisible().catch(() => false)) stablePolls = 0
    else if (++stablePolls >= 8) return
    await page.waitForTimeout(125)
  }
  throw new Error('Offline progress did not settle')
}

async function saveState() {
  const save = page.getByRole('button', { name: '保存', exact: true })
  if (await save.isEnabled().catch(() => false)) await save.click()
  await page.waitForTimeout(100)
  await context.storageState({ path: storageFile })
}

async function closeModal() {
  for (const name of ['确认', '知道了', '继续', '接受']) {
    const buttons = engine.getByRole('button', { name, exact: true })
    for (let index = (await buttons.count()) - 1; index >= 0; index--) {
      const button = buttons.nth(index)
      if (await button.isVisible().catch(() => false) && await button.isEnabled().catch(() => false)) {
        // The engine keeps both desktop and classic layouts mounted; forcing the
        // visible confirmation avoids a sibling overlay intercepting the event.
        await button.click({ force: true })
        record('modal', { name, index })
        // Prestige confirmations may start the game's one-second full-screen
        // animation before applying the reset; allow that real handler to finish.
        await page.waitForTimeout(1300)
        return true
      }
    }
  }
  const confirm = engine.locator('.c-modal__confirm-btn:visible').last()
  if (await confirm.count() && await confirm.isEnabled().catch(() => false)) {
    const text = (await confirm.innerText()).trim()
    await confirm.click()
    record('modal', { name: text || 'confirm' })
    await page.waitForTimeout(50)
    return true
  }
  return false
}

async function clickIfEnabled(locator, label) {
  if (!await locator.count()) return false
  const target = locator.first()
  if (!await target.isVisible().catch(() => false) || !await target.isEnabled().catch(() => false)) return false
  const classes = await target.getAttribute('class') || ''
  if (/disabled|locked/.test(classes)) return false
  await target.click({ timeout: 5000 })
  record('click', { label })
  await page.waitForTimeout(35)
  await closeModal()
  return true
}

async function snapshot() {
  return engine.evaluate(() => ({
    antimatter: player.antimatter.toString(),
    infinityPoints: player.infinityPoints.toString(),
    eternityPoints: player.eternityPoints.toString(),
    realities: player.realities,
    infinities: player.infinities.toString(),
    eternities: player.eternities.toString(),
    dimensionBoosts: player.dimensionBoosts,
    galaxies: player.galaxies,
    breakInfinity: player.break,
    endState: GameEnd.endState,
    doomed: player.celestials.pelle.doomed,
    realTimePlayed: player.records.realTimePlayed,
    fullGameCompletions: player.records.fullGameCompletions,
    currentChallenge: player.challenge.normal.current,
    normalChallengeBits: player.challenge.normal.completedBits,
    currentInfinityChallenge: player.challenge.infinity.current,
    currentEternityChallenge: player.challenge.eternity.current,
    armyBought: AntimatterDimensions.all.map(dimension => dimension.bought)
  }))
}

async function capture(name) {
  await page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: true })
  const state = await snapshot()
  milestones.push({ name, atMs: Date.now() - startedAt, simulatedOffsetMs: simulatedOffset, state })
  record('milestone', { name, state })
  await saveState()
}

async function offlineJump(milliseconds) {
  await saveState()
  simulatedOffset += milliseconds
  await page.evaluate(offset => localStorage.setItem('undead:playthrough-clock-offset', String(offset)), simulatedOffset)
  const state = await context.storageState({ path: storageFile })
  await context.close()
  await open(state)
  record('offline-jump', { milliseconds })
}

async function earlyCycle(cycle) {
  await closeModal()
  for (let tier = 8; tier >= 1; tier--) {
    await clickIfEnabled(engine.locator(`[data-buy-tier="${tier}"]`), `召唤军团 ${tier}（当前模式）`)
  }
  await clickIfEnabled(engine.getByRole('button', { name: '最大', exact: true }), '购买模式：最大')
  await clickIfEnabled(engine.locator('.max-all'), '全部最大')
  await clickIfEnabled(engine.locator('.tickspeed-max-btn'), '刻速最大')
  for (let tier = 8; tier >= 1; tier--) {
    await clickIfEnabled(engine.locator(`[data-buy-tier="${tier}"]`), `召唤军团 ${tier}`)
  }
  await clickIfEnabled(engine.locator('.max-all'), '全部最大')
  await clickIfEnabled(engine.locator('.tickspeed-max-btn'), '刻速最大')

  const canCrunch = await engine.evaluate(() => Currency.antimatter.gte(Number.MAX_VALUE))
  if (canCrunch) {
    const crunch = engine.locator('[data-action="crunch"]')
    if (await clickIfEnabled(crunch, '转生')) return 'reset'
  }
  const state = await snapshot()
  if (state.galaxies < 2) {
    const galaxy = engine.locator('[data-action="galaxy"]')
    if (await clickIfEnabled(galaxy, '开辟墓域')) return 'reset'
  }
  // Four boosts and two galaxies are sufficient for a dependable first
  // Infinity; extra resets only make the continuous fresh-save run slower.
  const boostTarget = 4
  if (state.dimensionBoosts < boostTarget) {
    const boost = engine.locator('[data-action="boost"]')
    if (await clickIfEnabled(boost, '筑塔开层')) return 'reset'
  }
  if (cycle % 4 === 0) await clickIfEnabled(engine.locator('[data-action="sacrifice"]'), '献祭')
  return 'wait'
}

async function openMainTab(label) {
  const button = engine.locator('.tower-tabs button, .tower-utility button').filter({ hasText: label }).first()
  return clickIfEnabled(button, `打开${label}`)
}

async function buyInfinityProgression() {
  await openMainTab('魂界')
  for (let attempt = 0; attempt < 20; attempt++) {
    const available = engine.locator('.l-infinity-upgrade-grid__cell.o-infinity-upgrade-btn--available').first()
    if (!await clickIfEnabled(available, '购买转生魂契')) break
  }

  await openMainTab('执役')
  for (const buyBox of await engine.locator('.c-autobuyer-buy-box:visible').all()) {
    await clickIfEnabled(buyBox, '解锁执役')
  }
  // The Big Crunch interval is the gate for Break Infinity, so spend spare IP
  // here before upgrading the other buyers.
  for (let attempt = 0; attempt < 80; attempt++) {
    const interval = engine.locator('.c-infinity-pos .l-autobuyer-box__button:visible').first()
    if (!await clickIfEnabled(interval, '缩短自动转生间隔')) break
  }
  const globalOn = await engine.evaluate(() => player.auto.autobuyersOn)
  if (!globalOn) {
    await clickIfEnabled(engine.locator('.l-autobuyers-tab .c-subtab-option-container button').first(), '开启全部执役')
  }
}

async function tryEnterNormalChallenge() {
  const state = await snapshot()
  if (state.currentChallenge !== 0) return false
  await openMainTab('试炼')
  const challenge = engine.locator('.c-challenge-box--normal .o-challenge-btn--unlocked:visible').first()
  if (!await challenge.count()) return false
  await challenge.click()
  record('click', { label: '进入下一项普通试炼' })
  await page.waitForTimeout(300)
  await closeModal()
  return true
}

async function tryBreakInfinity() {
  const state = await snapshot()
  if (state.breakInfinity) return false
  await openMainTab('魂界')
  const subtab = engine.locator('.tower-subtabs button').filter({ hasText: '打破魂界' }).first()
  if (!await clickIfEnabled(subtab, '打开打破魂界')) return false
  const button = engine.locator('.c-game-tab .o-infinity-upgrade-btn:visible').first()
  if (!await button.count()) return false
  const classes = await button.getAttribute('class') || ''
  if (/disabled|locked|unavailable/.test(classes)) return false
  await button.click()
  record('click', { label: '打破魂界' })
  await page.waitForTimeout(300)
  await closeModal()
  return (await snapshot()).breakInfinity
}

async function infinityCycle(cycle) {
  await closeModal()
  if (cycle % 5 === 0) {
    await buyInfinityProgression()
    await tryBreakInfinity()
    await tryEnterNormalChallenge()
  }
  await openMainTab('军团')
  for (let tier = 8; tier >= 1; tier--) {
    await clickIfEnabled(engine.locator(`[data-buy-tier="${tier}"]`), `召唤军团 ${tier}`)
  }
  await clickIfEnabled(engine.getByRole('button', { name: '最大', exact: true }), '购买模式：最大')
  await clickIfEnabled(engine.locator('.max-all'), '全部最大')
  await clickIfEnabled(engine.locator('.tickspeed-max-btn'), '刻速最大')

  const canCrunch = await engine.evaluate(() => Player.canCrunch)
  if (canCrunch) {
    const before = await snapshot()
    await clickIfEnabled(engine.locator('[data-action="crunch"]'), '转生')
    // Later Crunches may skip the confirmation modal but still defer the reset
    // until the one-second animation finishes.
    await page.waitForTimeout(1300)
    const after = await snapshot()
    if (after.infinities !== before.infinities || after.currentChallenge !== before.currentChallenge) return 'reset'
  }
  const state = await snapshot()
  if (state.galaxies < 1 && await clickIfEnabled(engine.locator('[data-action="galaxy"]'), '开辟墓域')) return 'reset'
  if (state.dimensionBoosts < 4 && await clickIfEnabled(engine.locator('[data-action="boost"]'), '筑塔开层')) return 'reset'
  if (cycle % 3 === 0) await clickIfEnabled(engine.locator('[data-action="sacrifice"]'), '献祭')
  return 'wait'
}

try {
  const previous = !reset && fs.existsSync(storageFile) ? JSON.parse(fs.readFileSync(storageFile, 'utf8')) : undefined
  await open(previous)
  if (reset || !previous) {
    await page.evaluate(() => localStorage.clear())
    await page.reload({ waitUntil: 'domcontentloaded' })
    const handle = await page.locator('iframe').elementHandle({ timeout: 60000 })
    engine = await handle.contentFrame()
    await engine.waitForFunction(() => window.UndeadTower && window.ui?.view?.initialized, null, { timeout: 60000 })
  } else {
    simulatedOffset = Number(await page.evaluate(() => localStorage.getItem('undead:playthrough-clock-offset') || 0))
  }
  await capture('start')

  let noReset = 0
  const jumps = [10_000, 60_000, 15 * 60_000, 4 * 60 * 60_000]
  for (let cycle = 0; cycle < maxCycles; cycle++) {
    const before = await snapshot()
    if (Number(before.infinities) > 0 || before.eternities !== '0' || before.realities > 0) break
    const result = await earlyCycle(cycle)
    if (result === 'reset') noReset = 0
    else noReset++
    const after = await snapshot()
    record('cycle-state', { cycle, result, state: after })
    if (after.infinities !== before.infinities && Number(after.infinities) > 0) {
      await capture('first-infinity')
      break
    }
    if (cycle % 10 === 9) await capture(`early-cycle-${cycle + 1}`)
    const jump = jumps[Math.min(Math.max(noReset - 1, 0), jumps.length - 1)]
    await offlineJump(jump)
  }

  let infinityNoReset = 0
  const infinityJumps = [60_000, 60 * 60_000, 24 * 60 * 60_000, 30 * 24 * 60 * 60_000,
    365 * 24 * 60 * 60_000]
  for (let cycle = 0; cycle < maxCycles; cycle++) {
    const before = await snapshot()
    if (before.infinities === '0' || before.eternities !== '0' || before.realities > 0) break
    const result = await infinityCycle(cycle)
    if (result === 'reset') infinityNoReset = 0
    else infinityNoReset++
    const after = await snapshot()
    record('infinity-cycle-state', { cycle, result, state: after })
    if (cycle % 10 === 9) await capture(`infinity-cycle-${cycle + 1}`)
    if (after.eternities !== '0' || after.realities > 0) break
    const jump = infinityJumps[Math.min(Math.max(infinityNoReset - 1, 0), infinityJumps.length - 1)]
    await offlineJump(jump)
  }

  const finalState = await snapshot()
  await capture(Number(finalState.infinities) > 0 ? 'early-complete' : 'early-paused')
  const report = {
    url: base,
    method: 'Chromium headless; visible Playwright clicks for all gameplay actions; read-only engine telemetry; saved reloads with browser clock offsets for built-in offline progress; no player-state or resource writes.',
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date().toISOString(),
    wallTimeMs: Date.now() - startedAt,
    simulatedOffsetMs: simulatedOffset,
    finalState,
    errors,
    failedRequests,
    milestones,
    actions
  }
  fs.writeFileSync(logFile, JSON.stringify(report, null, 2))
  console.log('REPORT ' + logFile)
  console.log(JSON.stringify({ wallTimeMs: report.wallTimeMs, simulatedOffsetMs: simulatedOffset, finalState, errors: errors.length,
    failedRequests: failedRequests.length }, null, 2))
} finally {
  await context?.close().catch(() => {})
  await browser.close()
}
