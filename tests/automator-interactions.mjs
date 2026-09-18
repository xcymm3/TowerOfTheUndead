import assert from 'node:assert/strict'
import fs from 'node:fs'
import { outputPath } from './output.mjs'

export async function automatorInteractions({ page, engine, reference, reset, test }) {
  const frames = [engine, reference]
  const trace = [{ fixture: 'Stage count 49/50 realities, stopped game intervals; no forceUnlock and no natural progression claim. Scripts entered through keyboard; backend update advances deterministic time only.' }]
  const mutate = async script => {
    for (const frame of frames) await frame.evaluate(s => {
      Function(s)(); Lazy.invalidateAll(); GameUI.update()
    }, script)
    await page.waitForTimeout(100)
  }
  const snapshot = frame => frame.evaluate(() => JSON.parse(JSON.stringify({
    points: AutomatorPoints.totalPoints, unlocked: Player.automatorUnlocked,
    forced: player.reality.automator.forceUnlock,
    scripts: player.reality.automator.scripts, state: player.reality.automator.state,
    type: player.reality.automator.type, running: AutomatorBackend.isRunning,
    on: AutomatorBackend.isOn, line: AutomatorBackend.currentLineNumber,
    interval: AutomatorBackend.currentInterval, studies: player.timestudy.studies,
    theorem: player.timestudy.theorem, respec: player.respec,
    errors: AutomatorData.currentErrors(), events: AutomatorData.eventLog,
  })))
  const parity = async label => {
    const actual = await snapshot(engine)
    const expected = await snapshot(reference)
    trace.push({ label, actual, expected })
    fs.writeFileSync(outputPath('automator-operations.json'), JSON.stringify(trace, null, 2))
    assert.deepEqual(actual, expected, label)
  }
  const check = async (script, expected) => {
    for (const frame of frames) assert.deepEqual(await frame.evaluate(s => Function(s)(), script), expected)
  }
  const click = async selector => {
    for (const frame of frames) await frame.locator(selector).click({ timeout: 5000 })
    await mutate('')
  }
  const enter = async text => {
    for (const frame of frames) {
      await frame.locator('.CodeMirror').click()
      const input = frame.locator('.CodeMirror textarea')
      await input.press('ControlOrMeta+A')
      await input.press('Backspace')
      // CodeMirror handles line breaks through keyboard commands; insert explicit
      // Enter events instead of relying on a newline character in typed text.
      for (const [index, line] of text.split('\n').entries()) {
        if (index > 0) await input.press('Enter')
        await input.pressSequentially(line, { delay: 1 })
      }
      await input.press('Escape')
    }
    await page.waitForTimeout(700)
    await mutate('')
    await check('return AutomatorData.currentScriptText()', text)
  }
  const prepare = async () => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    for (const frame of frames) await reset(frame)
    await mutate('player.realities=50; Tab.automation.automator.show(true); AutomatorData.eventLog=[]; AutomatorData.lastEvent=Date.now();')
    await click('.c-automator__controls .fa-sync-alt')
    await check('return AutomatorBackend.state.repeat', false)
  }

  await test('Automator UI · Exact unlock points and original script execution controls', async () => {
    for (const frame of frames) await reset(frame)
    await mutate('player.realities=49; Tab.automation.automator.show(true); AutomatorData.eventLog=[]; AutomatorData.lastEvent=Date.now();')
    await check('return [AutomatorPoints.totalPoints,Player.automatorUnlocked,player.reality.automator.forceUnlock]', [98, false, false])
    for (const frame of frames) assert.equal(await frame.locator('.CodeMirror').count(), 0)
    await parity('98 points: editor remains locked')
    await mutate('player.realities=50;')
    await check('return [AutomatorPoints.totalPoints,Player.automatorUnlocked]', [100, true])
    for (const frame of frames) await frame.locator('.CodeMirror').waitFor()
    await click('.c-automator__controls .fa-sync-alt')
    await enter('studies purchase 11\npause 10 seconds\nstudies respec')
    await check('return AutomatorData.currentErrors().length', 0)
    await mutate('Currency.timeTheorems.value=new Decimal(1);')
    await click('.c-automator__controls .fa-play')
    await mutate('AutomatorBackend.update(AutomatorBackend.currentInterval);')
    await check('return [TimeStudy(11).isBought,Currency.timeTheorems.value.toNumber()]', [true, 0])
    await parity('original studies command spends exact theorem')
    await click('.c-automator__controls .fa-pause')
    await check('return [AutomatorBackend.isOn,AutomatorBackend.isRunning]', [true, false])
    const paused = await snapshot(engine)
    await mutate('AutomatorBackend.update(100000);')
    assert.deepEqual(await snapshot(engine), paused, 'Paused script cannot advance')
    await parity('paused state ignores elapsed execution time')
    await click('.c-automator__controls .fa-eject')
    await check('return AutomatorBackend.isRunning', true)
    await click('.c-automator__controls .fa-stop')
    await check('return AutomatorBackend.isOn', false)
    await parity('stop clears execution stack')
    for (const width of [320, 375, 414, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 })
      await page.waitForTimeout(150)
      const bounds = await engine.locator('.c-automator-tab').evaluate(el => {
        const r = el.getBoundingClientRect()
        return { left: r.left, right: r.right, viewport: innerWidth }
      })
      assert.ok(bounds.left >= -1 && bounds.right <= bounds.viewport + 1, JSON.stringify({ width, bounds }))
      for (const selector of ['.fa-play', '.fa-stop', '.fa-step-forward', '.fa-sync-alt']) {
        const button = engine.locator('.c-automator__controls ' + selector)
        await button.scrollIntoViewIfNeeded()
        assert.ok(await button.evaluate(el => {
          const r = el.getBoundingClientRect()
          const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
          return r.left >= 0 && r.right <= innerWidth && (el === hit || el.contains(hit))
        }), `${width}: ${selector} must be reachable without overlap`)
      }
      await engine.locator('.c-automator-tab').screenshot({ path: outputPath(`automator-width-${width}.png`) })
      trace.push({ width, bounds, controls: 'play/stop/step/repeat center hit passed' })
    }
    await page.setViewportSize({ width: 1440, height: 1000 })
    await parity('six-width layout and execution controls remain reachable')
    await engine.locator('.c-automator-tab').screenshot({ path: outputPath('automator-editor.png') })
  })

  await test('Automator UI · Invalid syntax rejection and study resource wait/resume', async () => {
    await prepare()
    await enter('summon skeleton')
    for (const frame of frames) assert.ok(await frame.evaluate(() => AutomatorData.currentErrors().length > 0))
    await click('.c-automator__controls .fa-play')
    await check('return AutomatorBackend.isRunning', false)
    await parity('unrecognized syntax cannot execute')
    await enter('studies purchase 11\nstudies respec')
    await check('return AutomatorData.currentErrors().length', 0)
    await click('.c-automator__controls .fa-play')
    await mutate('AutomatorBackend.update(AutomatorBackend.currentInterval);')
    await check('return [TimeStudy(11).isBought,AutomatorBackend.isRunning,player.respec]', [false, true, false])
    await parity('no theorem: script waits without advancing purchase')
    await mutate('Currency.timeTheorems.value=new Decimal(1); AutomatorBackend.update(AutomatorBackend.currentInterval); AutomatorBackend.update(AutomatorBackend.currentInterval);')
    await check('return [TimeStudy(11).isBought,player.respec,AutomatorBackend.isOn]', [true, true, false])
    await parity('resource supplied: study purchased, respec armed, script ends')
  })
}
