import assert from 'node:assert/strict'
import fs from 'node:fs'
import { outputPath } from './output.mjs'

// Resource/history fixtures accelerate the original game. Actual unlock events,
// purchases and resets use original UI controls or the original time driver.
export async function completeReality({ page, engine, reference, reset, test: runTest }) {
  const frames = [engine, reference]
  const trace = []
  const test = async (name, fn) => {
    await runTest(`Reality completion · ${name}`, fn)
    fs.writeFileSync(outputPath('reality-completion.json'), JSON.stringify(trace, null, 2))
  }
  const mutate = async script => {
    for (const frame of frames) await frame.evaluate(s => {
      Function(s)(); Lazy.invalidateAll(); GameUI.update()
    }, script)
    await page.waitForTimeout(80)
  }
  const prepare = async (fixture = '', tab = 'reality.upgrades') => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    for (const frame of frames) await reset(frame)
    trace.push({ fixture, tab, kind: 'explicit stage resources/history, not natural progression' })
    await mutate(`player.realities=1; player.eternities=new Decimal(100);
      player.records.thisReality.time=120000; player.records.thisReality.realTime=120000;
      ${fixture}; Tab.${tab}.show(true);`)
  }
  const check = async (script, expected) => {
    for (const frame of frames) assert.deepEqual(await frame.evaluate(s => Function(s)(), script), expected, script)
  }
  const parity = async label => {
    await mutate('')
    const states = []
    for (const frame of frames) states.push(await frame.evaluate(() => JSON.parse(JSON.stringify({
      am: player.antimatter, ip: player.infinityPoints, ep: player.eternityPoints,
      realities: player.realities, eternities: player.eternities, infinities: player.infinities,
      rm: player.reality.realityMachines, requirements: player.reality.upgReqs,
      upgrades: player.reality.upgradeBits, rebuyables: player.reality.rebuyables,
      checks: player.requirementChecks, dims: player.dimensions, auto: player.auto,
      epMult: player.epmultUpgrades, studies: player.timestudy, dilation: player.dilation,
      glyphs: player.reality.glyphs, seed: player.reality.seed, gaussian: player.reality.secondGaussian,
      perks: [...player.reality.perks].sort((a,b) => a-b), perkPoints: player.reality.perkPoints,
      blackHoles: player.blackHole, paused: player.blackHolePause,
      times: [player.records.thisReality.time, player.records.thisReality.realTime],
      effects: [AntimatterDimensions.all.map(d => d.multiplier),
        TimeDimensions.all.map(d => d.multiplier), getGameSpeedupFactor()],
      glyphEffects: getActiveGlyphEffects(),
    }, (_key, v) => v instanceof Set ? [...v].sort() : v))))
    trace.push({ label, actual: states[0], expected: states[1] })
    assert.deepEqual(states[0], states[1], label)
  }
  const click = async (selector, index = 0) => {
    for (const frame of frames) await frame.locator(selector).nth(index).click({ timeout: 5000 })
    await mutate('')
  }
  const component = async (name, predicate = 'true') => {
    for (const frame of frames) await frame.evaluate(({ name, predicate }) => {
      document.querySelectorAll('[data-reality-control]').forEach(el => el.removeAttribute('data-reality-control'))
      const root = [...document.querySelectorAll('*')].find(el => el.__vue__)?.__vue__.$root
      const matches = []
      const visit = vm => {
        if (vm.$options.name === name && Function('vm', `return ${predicate}`)(vm) && vm.$el?.nodeType === 1) matches.push(vm)
        vm.$children.forEach(visit)
      }
      if (root) visit(root)
      if (matches.length !== 1) throw new Error(`${name}: expected one component; found ${matches.length}: ${predicate}`)
      matches[0].$el.setAttribute('data-reality-control', '')
    }, { name, predicate })
    return '[data-reality-control]'
  }
  const input = async (buyer, property, value) => {
    const selector = await component('AutobuyerInput', `vm.autobuyer===Autobuyer.${buyer} && vm.property==='${property}'`)
    for (const frame of frames) { await frame.locator(selector).fill(String(value)); await frame.locator(selector).press('Tab') }
    await mutate('')
  }
  const resetReady = `player.dilation.studies=[1,2,3,4,5,6];
    Currency.eternityPoints.value=new Decimal('1e4000'); player.records.thisReality.maxEP=new Decimal('1e4000');`
  const eternityReady = `Currency.infinityPoints.value=new Decimal('1e400'); player.records.thisEternity.maxIP=new Decimal('1e400');`

  const unlockGroups = [
    ['crunch', [
      { id: 7, bad: 'player.galaxies=2;', good: 'player.galaxies=1;' },
    ]],
    ['eternity', [
      { id: 6, bad: 'player.requirementChecks.eternity.noRG=false;', good: 'player.requirementChecks.eternity.noRG=true;' },
      { id: 8, bad: 'player.reality.gainedAutoAchievements=true;', good: 'player.reality.gainedAutoAchievements=false;' },
      { id: 9, common: "const g=GlyphGenerator.randomGlyph({actualLevel:3,rawLevel:3},undefined,'power'); g.idx=0; player.reality.glyphs.active=[g]; Glyphs.refreshActive(); Currency.eternityPoints.value=new Decimal('1e4000');", bad: 'player.reality.glyphs.active[0].level=2;', good: '' },
      { id: 10, bad: "Currency.infinityPoints.value=new Decimal('1e399');", good: '' },
      { id: 11, bad: "Currency.infinitiesBanked.value=new Decimal('1e12').minus(1);", good: "Currency.infinitiesBanked.value=new Decimal('1e12');" },
      { id: 12, common: "Currency.eternityPoints.value=new Decimal('1e70');", bad: 'player.eternityChalls.eterc1=1;', good: 'player.eternityChalls.eterc1=0;' },
      { id: 13, common: "Currency.eternityPoints.value=new Decimal('1e4000');", bad: 'TimeDimension(5).amount=new Decimal(1); TimeDimension(5).bought=1;', good: '' },
      { id: 14, bad: 'player.eternities=new Decimal(1e7-2);', good: 'player.eternities=new Decimal(1e7-1);' },
      { id: 15, common: "Currency.eternityPoints.value=new Decimal('1e10');", bad: 'player.epmultUpgrades=1;', good: '' },
      { id: 25, bad: "Currency.eternityPoints.value=new Decimal('1e11110');", good: "Currency.eternityPoints.value=new Decimal('1e11111');" },
    ]],
    ['tick', [
      { id: 20, common: 'player.blackHole[0].unlocked=true; player.records.timePlayedAtBHUnlock=0;', bad: 'player.records.totalTimePlayed=100*86400000-2;', good: 'player.records.totalTimePlayed=100*86400000;' },
      { id: 21, bad: 'player.galaxies=2799;', good: 'player.galaxies=2800;' },
      { id: 22, bad: "Currency.timeShards.value=new Decimal('1e27999');", good: "Currency.timeShards.value=new Decimal('1e28000');" },
    ]],
    ['reality', [
      { id: 16, common: 'fixtureGlyphs(4,10,1.5);', bad: 'player.reality.glyphs.active[0].strength=1.49;', good: '' },
      { id: 17, common: 'fixtureGlyphs(4,10,1.5);', bad: 'player.reality.glyphs.active[0].effects=1;', good: '' },
      { id: 18, common: 'fixtureGlyphs(4,10,1.5);', bad: 'player.reality.glyphs.active[0].level=9;', good: '' },
      { id: 19, common: "for(let i=0;i<28;i++) Glyphs.addToInventory(GlyphGenerator.randomGlyph({actualLevel:10,rawLevel:10},undefined,'power'));", bad: '', good: "Glyphs.addToInventory(GlyphGenerator.randomGlyph({actualLevel:10,rawLevel:10},undefined,'power'));" },
      { id: 23, bad: 'player.records.thisReality.time=900000;', good: 'player.records.thisReality.time=899999;' },
      { id: 24, common: "player.records.thisReality.maxEP=new Decimal('1e10000');", bad: 'fixtureGlyphs(1,10,1.5);', good: '' },
    ]],
  ]
  for (const [event, cases] of unlockGroups) await test(`All ${event} upgrade requirements unlock through original events`, async () => {
    for (const cfg of cases) for (const success of [false, true]) {
      const fixtureGlyphs = `const fixtureGlyphs=(n,level,strength)=>{
        player.reality.upgradeBits|=1<<9; Glyphs.refreshActive();
        player.reality.glyphs.active=Array.from({length:n},(_,i)=>{
          const g=GlyphGenerator.randomGlyph({actualLevel:level,rawLevel:level},undefined,'power');
          g.idx=i; g.strength=strength; g.effects=(1<<16)|(1<<17); return g;
        }); Glyphs.refreshActive(); };`
      await prepare(`${event === 'reality' ? resetReady : ''} ${event === 'eternity' ? eternityReady : ''}
        ${fixtureGlyphs} ${cfg.common || ''} ${success ? cfg.good : cfg.bad}`, 'reality.glyphs')
      await check(`return RealityUpgrade(${cfg.id}).isAvailableForPurchase`, false)
      if (event === 'crunch') {
        await mutate("player.break=true; Currency.antimatter.value=new Decimal('1e400'); player.records.thisInfinity.maxAM=Currency.antimatter.value;")
        await click('.o-infinity-button:visible')
      } else if (event === 'eternity') await click('.o-eternity-button:visible')
      else if (event === 'reality') await click('.c-reality-button:visible')
      else await mutate('gameLoop(1);')
      await check(`return RealityUpgrade(${cfg.id}).isAvailableForPurchase`, success)
      await parity(`upgrade ${cfg.id}: ${success ? 'fulfilled' : 'failed'} ${event} event requirement`)
      if (success) {
        await mutate(`Modal.hideAll(); ui.view.quotes.current=undefined; Currency.realityMachines.value=new Decimal(RealityUpgrade(${cfg.id}).cost); Tab.reality.upgrades.show(true);`)
        await click('.l-reality-upgrade-grid .c-reality-upgrade-btn', cfg.id - 1)
        await check(`return RealityUpgrade(${cfg.id}).isBought`, true)
        await parity(`upgrade ${cfg.id}: earned unlock then real exact-cost purchase`)
      }
    }
  })

  await test('Post-Reality dimension, multiplier, theorem and dilation autobuyers actually purchase', async () => {
    const cases = [
      ...Array.from({length:8}, (_,i) => ({buyer:`timeDimension(${i+1})`, unlock:'player.reality.upgradeBits|=1<<13;',
        resources:`player.dilation.studies=[1,2,3,4,5,6]; Currency.eternityPoints.value=TimeDimension(${i+1}).cost;`,
        output:`TimeDimension(${i+1}).bought`, expected:1})),
      {buyer:'epMult',unlock:'player.reality.upgradeBits|=1<<13;',resources:'Currency.eternityPoints.value=EternityUpgrade.epMult.cost;',output:'player.epmultUpgrades',expected:1},
      ...['dtGain','galaxyThreshold','tachyonGain'].map((key,i)=>({buyer:`dilationUpgrade(${i+1})`,unlock:'player.reality.perks.add(100);',
        resources:`player.dilation.studies=[1]; Currency.dilatedTime.value=new Decimal(DilationUpgrade.${key}.cost);`,output:`player.dilation.rebuyables[${i+1}]`,expected:1})),
      {buyer:'timeTheorem',unlock:'player.reality.perks.add(104);',resources:"player.break=true; Currency.antimatter.value=new Decimal('1e20000'); Currency.infinityPoints.value=new Decimal('1e100'); Currency.eternityPoints.value=new Decimal(1); TimeDimension(1).bought=1;",output:'Currency.timeTheorems.value.toNumber()',expected:3},
    ]
    for (const cfg of cases) {
      await prepare('', 'automation.autobuyers')
      await check(`return Autobuyer.${cfg.buyer}.isUnlocked`,false)
      await mutate(`${cfg.unlock} ${cfg.resources} Autobuyers.all.forEach(a=>a.isActive=false); player.records.realTimePlayed=10000;`)
      await check(`return Autobuyer.${cfg.buyer}.isUnlocked`,true)
      await click(`${await component('AutobuyerSingleToggleLabel',`vm.autobuyer===Autobuyer.${cfg.buyer}`)} label`)
      await check(`return Autobuyer.${cfg.buyer}.isActive`,true)
      await mutate('Autobuyers.tick();')
      await check(`return ${cfg.output}`,0)
      await click('.l-autobuyers-tab .c-subtab-option-container button')
      await mutate('Autobuyers.tick();')
      await check(`return ${cfg.output}`,cfg.expected)
      await parity(`${cfg.buyer}: unlocked, real toggle, global pause then actual purchase`)
    }
    await mutate("player.reality.perks.add(106); Currency.eternityPoints.value=new Decimal(8); Autobuyers.tick();")
    await check('return [Autobuyer.timeTheorem.hasUnlimitedBulk, Currency.timeTheorems.value.gt(3)]',[true,true])
    await parity('theorem perk changes single purchases to bulk purchases')
  })

  await test('Reality autobuyer modes honor original thresholds and perform real resets', async () => {
    for (let mode=0; mode<5; mode++) {
      await prepare(`${resetReady} player.reality.upgradeBits|=1<<25; Autobuyers.all.forEach(a=>a.isActive=false);`, 'automation.autobuyers')
      await click(`${await component('AutobuyerBox','vm.autobuyer===Autobuyer.reality')} .c-autobuyer-box__mode-select-header`)
      await click(`${await component('AutobuyerDropdownEntry','vm.autobuyer===Autobuyer.reality')} .l-autobuyer-choice`,mode)
      await check('return Autobuyer.reality.mode',mode)
      const rm=await engine.evaluate(()=>MachineHandler.gainedRealityMachines.toString())
      const level=await engine.evaluate(()=>gainedGlyphLevel().actualLevel)
      if(mode<4) { await input('reality','rm',Number(rm)+1); await input('reality','glyph',level+1) }
      else await input('reality','time',120)
      await click(`${await component('AutobuyerBox','vm.autobuyer===Autobuyer.reality')} .l-autobuyer-box__footer label`)
      await click('.l-autobuyers-tab .c-subtab-option-container button')
      await mutate('Autobuyers.tick();')
      await check('return player.realities',1)
      if(mode===0 || mode===2 || mode===3) await input('reality','rm',rm)
      if(mode===1 || mode===3) await input('reality','glyph',level)
      if(mode===4) await input('reality','time',119)
      await mutate('Autobuyers.tick();')
      await check('return [player.realities,player.reality.glyphs.inventory.length]',[2,1])
      await parity(`reality mode ${mode}: fails below conditions, meets original boundary and resets`)
    }
  })

  await test('Glyph choice, five equipment effects, respec and progression persist across Reality', async () => {
    await prepare(`${resetReady} player.reality.perks.add(0); player.reality.perks.add(10);
      player.reality.upgradeBits|=1<<10; player.reality.rebuyables[1]=2;
      player.options.confirmations.glyphSelection=true;`, 'reality.glyphs')
    await click('.c-reality-button:visible')
    await check('return GlyphSelection.upcomingGlyphs.length',4)
    const chosen=await engine.evaluate(()=>{ const g=GlyphSelection.upcomingGlyphs[2]; return [g.type,g.level,g.strength,g.effects] })
    await click('.l-modal-glyph-selection__glyph',2)
    await click('.c-modal__confirm-btn')
    await check('return player.reality.glyphs.inventory.map(g=>[g.type,g.level,g.strength,g.effects])',[chosen])
    await parity('manual selection preserves the chosen seeded glyph')
    for (const type of ['power','infinity','time','replication','dilation']) {
      await mutate(`Modal.hideAll(); ui.view.quotes.current=undefined; Tab.reality.glyphs.show(true);
        player.reality.glyphs.inventory=[]; player.reality.glyphs.active=[]; Glyphs.refresh();
        Glyphs.addToInventory(GlyphGenerator.randomGlyph({actualLevel:100,rawLevel:100},undefined,'${type}'));`)
      for (const frame of frames) await frame.locator('.l-glyph-inventory__slot > .l-glyph-component > div:last-child').first().dblclick({timeout:5000})
      await mutate('')
      await check('return Glyphs.activeWithoutCompanion.map(g=>g.type)',[type])
      await check('return getActiveGlyphEffects().length>0',true)
      await parity(`${type}: original equip action and computed effects`)
      await click('.l-equipped-glyphs__buttons > button',0)
      await check('return player.reality.respec',true)
      await mutate(`${resetReady} player.records.thisReality.time=120000; player.records.thisReality.realTime=120000; player.options.confirmations.glyphSelection=true;`)
      await click('.c-reality-button:visible')
      await click('.l-modal-glyph-selection__glyph',0)
      await click('.c-modal__confirm-btn')
      await check('return [player.reality.glyphs.active.length,player.reality.glyphs.inventory.some(g=>g.type===\''+type+'\'),RealityUpgrade(10).isBought,player.reality.rebuyables[1],[...player.reality.perks].sort((a,b)=>a-b)]',[0,true,true,2,[0,10]])
      await parity(`${type}: respec returns equipment and retains perks/upgrades across Reality`)
    }
  })

  await test('Automatic glyph filtering really keeps or sacrifices the generated reward', async () => {
    for (const keep of [true,false]) {
      await prepare(`${resetReady} player.reality.upgradeBits|=(1<<25)|(1<<19); player.reality.perks.add(0);
        player.celestials.effarig.unlockBits|=1<<EffarigUnlock.glyphFilter.id;
        player.reality.glyphs.filter.select=AUTO_GLYPH_SCORE.RARITY_THRESHOLD;
        Object.values(player.reality.glyphs.filter.types).forEach(t=>t.rarity=${keep?0:100});
        Autobuyers.all.forEach(a=>a.isActive=false);`, 'automation.autobuyers')
      await input('reality','rm',1)
      await click(`${await component('AutobuyerBox','vm.autobuyer===Autobuyer.reality')} .l-autobuyer-box__footer label`)
      await click('.l-autobuyers-tab .c-subtab-option-container button')
      await mutate('Autobuyers.tick();')
      await check('return player.realities',2)
      await check('return player.reality.glyphs.inventory.length',keep?1:0)
      await check('return Object.values(player.reality.glyphs.sac).some(n=>n>0)',!keep)
      await parity(`automatic Reality: ${keep?'keep generated glyph':'reject and actually gain sacrifice power'}`)
    }
  })

  await test('Improved Eternity modes and filter-rejection priority use original settings', async () => {
    for (const mode of [1,2]) {
      await prepare(`${eternityReady} player.reality.upgradeBits|=1<<13;
        player.records.thisEternity.realTime=5000; Autobuyers.all.forEach(a=>a.isActive=false);`, 'automation.autobuyers')
      await click(`${await component('AutobuyerBox','vm.autobuyer===Autobuyer.eternity')} .c-autobuyer-box__mode-select-header`)
      await click(`${await component('AutobuyerDropdownEntry','vm.autobuyer===Autobuyer.eternity')} .l-autobuyer-choice`,mode)
      await check('return Autobuyer.eternity.mode',mode)
      if(mode===1) await input('eternity','time',5)
      else { await mutate('player.records.thisReality.maxEP=gainedEternityPoints();'); await input('eternity','xHighest',2) }
      await click(`${await component('AutobuyerBox','vm.autobuyer===Autobuyer.eternity')} .l-autobuyer-box__footer label`)
      await click('.l-autobuyers-tab .c-subtab-option-container button')
      await mutate('Autobuyers.tick();')
      await check('return player.eternities.toNumber()',100)
      await input('eternity',mode===1?'time':'xHighest',mode===1?4:1)
      await mutate('Autobuyers.tick();')
      await check('return player.eternities.toNumber()',101)
      await parity(`improved Eternity mode ${mode}: real input blocks then triggers`)
    }
    await prepare(`${resetReady} player.reality.upgradeBits|=(1<<25)|(1<<19); player.reality.perks.add(0);
      player.celestials.effarig.unlockBits|=1<<EffarigUnlock.glyphFilter.id;
      player.reality.glyphs.filter.select=AUTO_GLYPH_SCORE.RARITY_THRESHOLD;
      Object.values(player.reality.glyphs.filter.types).forEach(t=>t.rarity=100);
      player.options.autoRealityForFilter=true; Autobuyers.all.forEach(a=>a.isActive=false);`, 'automation.autobuyers')
    await input('reality','rm','1e100')
    await click(`${await component('AutobuyerBox','vm.autobuyer===Autobuyer.reality')} .l-autobuyer-box__footer label`)
    await click('.l-autobuyers-tab .c-subtab-option-container button')
    await mutate('Autobuyers.tick();')
    await check('return [player.realities,player.reality.glyphs.inventory.length]',[2,0])
    await check('return Object.values(player.reality.glyphs.sac).some(n=>n>0)',true)
    await parity('filter rejection preempts unreachable RM target and sacrifices the generated reward')
  })

  await test('Both black holes complete full cycles and pause freezes phases', async () => {
    await prepare('Currency.realityMachines.value=new Decimal(100);', 'reality.hole')
    await click('.c-reality-upgrade-btn--black-hole-unlock')
    await mutate('player.reality.upgReqs|=1<<20; Currency.realityMachines.value=new Decimal(1500); Tab.reality.upgrades.show(true);')
    await click('.l-reality-upgrade-grid .c-reality-upgrade-btn', 19)
    await mutate('Tab.reality.hole.show(true);')
    // Original phase driver accepts elapsed real time and integrates both clocks.
    await mutate('BlackHoles.updatePhases((BlackHole(1).interval+0.01)*1000);')
    await check('return [BlackHole(1).isActive,player.blackHole[0].activations]', [true, 1])
    await mutate('BlackHoles.updatePhases(BlackHole(1).duration*1000);')
    await check('return BlackHole(1).isActive', false)
    await parity('first clock completed sleep and active segments')
    await mutate('BlackHoles.updatePhases((BlackHole(1).interval+BlackHole(1).duration)*100000);')
    await check('return player.blackHole.every(b=>b.activations>0)', true)
    await parity('both clocks complete original nested cycles')
    await click('.l-black-hole-tab .c-subtab-option-container button', 0)
    const phases = await engine.evaluate(() => player.blackHole.map(b=>b.phase))
    await mutate('gameLoop(1000);')
    await check('return player.blackHole.map(b=>b.phase)', phases)
    await parity('real pause holds both phases through game time')
  })

  await test('Mapped upgrade descriptions and six-width Reality controls remain usable', async () => {
    await prepare('player.realities=50; player.break=true; player.reality.upgradeBits|=(1<<13)|(1<<25); player.blackHole[0].unlocked=true; player.blackHole[1].unlocked=true;')
    await page.waitForTimeout(10000)
    const descriptions = await engine.evaluate(()=>RealityUpgrades.all.map(u=>({id:u.id,
      text:UndeadTheme.translate(typeof u.config.description==='function'?u.config.description():u.config.description),
      requirement:UndeadTheme.translate(u.requirement||'')})))
    trace.push({descriptions})
    assert.match(await engine.evaluate(()=>UndeadTheme.translate('Reactive effects remain active.')), /^Reactive /, 'Short status words must not rewrite parts of longer words')
    const entryText=await engine.locator('.c-reality-button:visible').innerText()
    assert.doesNotMatch(entryText,/Purchase|unlock|new Reality/i)

    for(const {text} of descriptions) assert.doesNotMatch(text.replace(/Shift/g,''),/[a-z]{3,}/i,text)
    for(const {requirement} of descriptions) assert.doesNotMatch(requirement,/equipped|having at least|Shards|years/i,requirement)
    const layoutProblems=[]
    for (const [tab,selector] of [['reality.upgrades','.l-reality-upgrade-grid .c-reality-upgrade-btn'],
      ['reality.hole','.l-black-hole-upgrade-grid__row .c-reality-upgrade-btn'],
      ['reality.glyphs','.l-equipped-glyphs__buttons > button'],
      ['automation.autobuyers','.l-autobuyers-tab .c-autobuyer-box-row']]) {
      await mutate(`Modal.hideAll(); ui.view.quotes.current=undefined; Tab.${tab}.show(true);`)
      for(const width of [320,375,414,768,1024,1440]) {
        await page.setViewportSize({width,height:1000}); await page.waitForTimeout(100)
        const controls=engine.locator(selector)
        assert.ok(await controls.count()>0,tab)
        for(const control of await controls.all()) {
          await control.evaluate(el=>el.scrollIntoView({block:'center'}))
          await page.waitForTimeout(25)
          const bounds=await control.evaluate(el=>{const r=el.getBoundingClientRect(); const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {left:r.left,right:r.right,viewport:innerWidth,top:r.top,text:el.textContent.slice(0,80),hitTag:hit?.className,hit:el===hit||el.contains(hit)}})
          if (!(bounds.left>=-1 && bounds.right<=bounds.viewport+1 && bounds.hit)) layoutProblems.push({tab,width,...bounds})
        }
        await engine.evaluate(()=>{ document.querySelectorAll('*').forEach(el=>{if(el.scrollTop) el.scrollTop=0}); window.scrollTo(0,0) })
        if(tab==='reality.upgrades') {
          const colors=await engine.locator('.c-reality-upgrade-btn--possible').evaluateAll(els=>els.map(el=>getComputedStyle(el).color))
          assert.ok(colors.every(color=>color!=='rgb(0, 0, 0)'), 'Locked-state text must remain readable on dark background')
        }
        if(width===320 || width===1440) await page.screenshot({path:outputPath(`reality-${tab.replace('.','-')}-${width}.png`),fullPage:true})
        trace.push({tab,width,controls:await controls.count(),problems:layoutProblems.filter(p=>p.tab===tab&&p.width===width)})
      }
    }
    await page.setViewportSize({width:1440,height:1000})
    assert.deepEqual(layoutProblems,[],'control bounds and center hit problems')
  })
}
