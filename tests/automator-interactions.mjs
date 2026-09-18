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
    realities: player.realities, infinities: player.infinities, eternities: player.eternities,
    auto: player.auto, dilation: player.dilation, challenge: player.challenge,
    blackHolePause: player.blackHolePause,
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
      // Browser text insertion is a real editor input event; inserting the full
      // script avoids auto-paired braces being duplicated by sequential keystrokes.
      await (frame === engine ? page : reference).keyboard.insertText(text)
      await input.press('Escape')
    }
    await page.waitForTimeout(700)
    await mutate('')
    // CodeMirror may add indentation after braces; whitespace is not script semantics.
    await check("return AutomatorData.currentScriptText().split('\\n').map(s=>s.trim()).join('\\n')", text.split('\n').map(s=>s.trim()).join('\n'))
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

  await test('Automator completion · Conditional and loop blocks wait for real resources then stop', async () => {
    await prepare()
    await mutate('Currency.timeTheorems.value=new Decimal(1);')
    await enter('if am < 100 {\nstudies purchase 11\n}\nwhile am < 100 {\npause 0.1 seconds\n}\nuntil am >= 200 {\npause 0.1 seconds\n}\nwait am >= 300\nstudies respec\nstop')
    await check('return AutomatorData.currentErrors()',[])
    await click('.c-automator__controls .fa-play')
    const advance = 'for(let i=0;i<30;i++) AutomatorBackend.update(AutomatorBackend.currentInterval);'
    await mutate(advance)
    await check('return [TimeStudy(11).isBought,player.respec,AutomatorBackend.isRunning]',[true,false,true])
    await parity('IF buys study; WHILE remains until AM threshold')
    await mutate(`Currency.antimatter.value=new Decimal(100); ${advance}`)
    await check('return [player.respec,AutomatorBackend.isRunning]',[false,true])
    await parity('WHILE exits and UNTIL waits')
    await mutate(`Currency.antimatter.value=new Decimal(200); ${advance}`)
    await check('return [player.respec,AutomatorBackend.isRunning]',[false,true])
    await parity('UNTIL exits and WAIT blocks on exact next threshold')
    await mutate(`Currency.antimatter.value=new Decimal(300); ${advance}`)
    await check('return [player.respec,AutomatorBackend.isOn]',[true,false])
    await parity('WAIT releases and STOP terminates original script')
  })

  await test('Automator completion · Automation settings, clock commands and block conversion', async () => {
    await prepare()
    await mutate('player.eternities=new Decimal(100); NormalChallenge(12).complete(); player.reality.upgradeBits|=(1<<13)|(1<<25); player.blackHole[0].unlocked=true;')
    await enter('auto infinity 2 seconds\nauto eternity 3 x highest\nauto reality 1 rm\nblack hole off\nwait am >= 100\nblack hole on\nstop')
    await check('return AutomatorData.currentErrors()',[])
    const original = await engine.evaluate(()=>AutomatorData.currentScriptText().toLowerCase().replace(/\s+/g,' ').trim())
    await click('.c-automator__controls .c-slider-toggle-button')
    await check('return player.reality.automator.type===AUTOMATOR_TYPE.BLOCK',true)
    for (const frame of frames) assert.ok(await frame.locator('.c-automator-block-editor').count()>0)
    await click('.c-automator__controls .c-slider-toggle-button')
    await check("return AutomatorData.currentScriptText().toLowerCase().replace(/\\s+/g,' ').trim()",original)
    await check('return player.reality.automator.type===AUTOMATOR_TYPE.TEXT',true)
    await click('.c-automator__controls .fa-play')
    await mutate('for(let i=0;i<15;i++) AutomatorBackend.update(AutomatorBackend.currentInterval);')
    await check('return [Autobuyer.bigCrunch.time,Autobuyer.eternity.xHighest.toNumber(),Autobuyer.reality.rm.toNumber(),BlackHoles.arePaused]',[2,3,1,true])
    await parity('converted script configures three prestige autobuyers and pauses clock')
    await mutate('Currency.antimatter.value=new Decimal(100); for(let i=0;i<10;i++) AutomatorBackend.update(AutomatorBackend.currentInterval);')
    await check('return [BlackHoles.arePaused,AutomatorBackend.isOn]',[false,false])
    await parity('resource gate releases clock ON and STOP')
  })

  await test('Automator completion · Prestige commands and script retention across Reality restart', async () => {
    await prepare()
    await mutate('player.eternities=new Decimal(100); player.reality.upgradeBits|=1<<25;')
    await enter('infinity nowait\nwait am >= 1e400\ninfinity\neternity nowait\nwait ep >= 1e4000\nreality\nstop')
    await check('return AutomatorData.currentErrors()',[])
    const original = await engine.evaluate(()=>AutomatorData.currentScriptText())
    await click('.c-automator__controls .fa-play')
    await mutate('for(let i=0;i<5;i++) AutomatorBackend.update(AutomatorBackend.currentInterval);')
    await check('return player.infinities.toNumber()',0)
    await mutate("player.break=true; Currency.antimatter.value=new Decimal('1e400'); player.records.thisInfinity.maxAM=Currency.antimatter.value; for(let i=0;i<10;i++) AutomatorBackend.update(AutomatorBackend.currentInterval);")
    await check('return player.infinities.gt(0)',true)
    await parity('NOWAIT skips unavailable prestige; resource then triggers real crunch')
    await mutate("player.dilation.studies=[1,2,3,4,5,6]; Currency.eternityPoints.value=new Decimal('1e4000'); player.records.thisReality.maxEP=Currency.eternityPoints.value; player.records.thisReality.time=120000; player.records.thisReality.realTime=120000; for(let i=0;i<10;i++) AutomatorBackend.update(AutomatorBackend.currentInterval);")
    await check('return player.realities',51)
    await check('return AutomatorData.currentScriptText()',original)
    await parity('REALITY command resets game and preserves editor script')
    await mutate('Modal.hideAll(); ui.view.quotes.current=undefined; Tab.automation.automator.show(true);')
    // Explicit UI rewind + force restart, then real manual Reality checks restart policy.
    if (await engine.evaluate(()=>AutomatorBackend.state.forceRestart)) await click('.c-automator__controls .fa-reply')
    await check('return AutomatorBackend.state.forceRestart',false)
    await click('.c-automator__controls .fa-reply')
    await check('return AutomatorBackend.state.forceRestart',true)
    await click('.c-automator__controls .fa-fast-backward')
    await mutate("player.dilation.studies=[1,2,3,4,5,6]; Currency.eternityPoints.value=new Decimal('1e4000'); player.records.thisReality.maxEP=Currency.eternityPoints.value; player.records.thisReality.time=120000; player.records.thisReality.realTime=120000; Tab.reality.glyphs.show(true);")
    await click('.c-reality-button:visible')
    await check('return player.realities',52)
    await check('return [AutomatorBackend.currentLineNumber,AutomatorBackend.isRunning]',[1,true])
    await check('return AutomatorData.currentScriptText()',original)
    await parity('manual Reality obeys force restart and retains exact script')
  })

  await test('Automator completion · Saved study presets, trial and dilation commands perform purchases', async () => {
    await prepare()
    await mutate("player.eternities=new Decimal(100); player.timestudy.presets[0]={name:'Stage path',studies:'11,21|0'}; Currency.timeTheorems.value=new Decimal(1);")
    await enter('studies load id 1\nstudies load name Stage path\nstop')
    await check('return AutomatorData.currentErrors()',[])
    await click('.c-automator__controls .fa-play')
    await mutate('for(let i=0;i<5;i++) AutomatorBackend.update(AutomatorBackend.currentInterval);')
    await check('return [TimeStudy(11).isBought,TimeStudy(21).isBought,AutomatorBackend.isRunning]',[true,false,true])
    await mutate('Currency.timeTheorems.value=new Decimal(3); for(let i=0;i<5;i++) AutomatorBackend.update(AutomatorBackend.currentInterval);')
    await check('return [TimeStudy(21).isBought,AutomatorBackend.isOn]',[true,false])
    await parity('preset commands resolve ID/name and wait for actual missing theorem cost')
    await prepare()
    await mutate('player.eternities=new Decimal(20000); player.timestudy.studies=[171]; Currency.timeTheorems.value=new Decimal(30);')
    await enter('unlock ec 1\nstart ec 1\nstop')
    await check('return AutomatorData.currentErrors()',[])
    await click('.c-automator__controls .fa-play')
    await mutate('for(let i=0;i<6;i++) AutomatorBackend.update(AutomatorBackend.currentInterval);')
    await check('return [player.challenge.eternity.current,Currency.timeTheorems.value.toNumber(),AutomatorBackend.isOn]',[1,0,false])
    await parity('EC unlock spends original cost then START enters original challenge')
    await prepare()
    await mutate('player.eternities=new Decimal(100); player.timestudy.studies=[231]; player.eternityChalls.eterc11=5; player.eternityChalls.eterc12=5; Currency.timeTheorems.value=new Decimal(12900);')
    await enter('unlock dilation\nstart dilation\nstop')
    await check('return AutomatorData.currentErrors()',[])
    await click('.c-automator__controls .fa-play')
    await mutate('for(let i=0;i<6;i++) AutomatorBackend.update(AutomatorBackend.currentInterval);')
    await check('return [TimeStudy.dilation.isBought,player.dilation.active,AutomatorBackend.isOn]',[true,true,false])
    await parity('UNLOCK DILATION spends original TT and START DILATION performs reset')
  })
}
