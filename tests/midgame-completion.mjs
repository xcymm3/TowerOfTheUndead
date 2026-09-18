import assert from 'node:assert/strict'
import fs from 'node:fs'
import { outputPath } from './output.mjs'

// Fixtures supply stage history/resources only. Component tags identify original
// controls without invoking Vue methods, replacing handlers, or translating selectors.
export async function completeMidgame({ page, engine, reference, reset, test: runTest }) {
  const frames = [engine, reference]
  const trace = []
  const test = async (name, action) => {
    await runTest(`Midgame completion · ${name}`, action)
    fs.writeFileSync(outputPath('midgame-completion.json'), JSON.stringify(trace, null, 2))
  }
  const mutate = async script => {
    for (const frame of frames) await frame.evaluate(script => {
      Function(script)()
      Lazy.invalidateAll()
      GameUI.update()
    }, script)
    await page.waitForTimeout(60)
  }
  const prepare = async (fixture, tab = 'automation.autobuyers') => {
    for (const frame of frames) await reset(frame)
    trace.push({ fixture, tab, kind: 'stage resource/history fixture, not natural progression' })
    await mutate(`${fixture}; Tab.${tab}.show(true);`)
  }
  const check = async (script, expected) => {
    for (const frame of frames) assert.deepEqual(await frame.evaluate(s => Function(s)(), script), expected, script)
  }
  const parity = async label => {
    await mutate('')
    const states = []
    for (const frame of frames) states.push(await frame.evaluate(() => JSON.parse(JSON.stringify({
      am: player.antimatter, ip: player.infinityPoints, ep: player.eternityPoints,
      infinities: player.infinities, eternities: player.eternities,
      dimensions: player.dimensions, tickspeed: player.totalTickBought,
      boosts: player.dimensionBoosts, galaxies: player.galaxies, sacrifice: player.sacrificed,
      upgrades: player.infinityUpgrades, rebuyables: player.infinityRebuyables, ipMult: player.IPMultPurchases,
      auto: player.auto, replicanti: player.replicanti, dilation: player.dilation,
      studies: player.timestudy, STSpent: player.celestials.v.STSpent,
      challenges: player.challenge, completions: player.eternityChalls,
      effects: [AntimatterDimensions.all.map(d => d.multiplier), InfinityDimensions.all.map(d => d.multiplier),
        TimeDimensions.all.map(d => d.multiplier), Player.tickSpeedMultDecrease, Player.dimensionMultDecrease],
    }, (_key, v) => v instanceof Set ? [...v].sort() : v))))
    trace.push({ label, actual: states[0], expected: states[1] })
    assert.deepEqual(states[0], states[1], label)
    return states[0]
  }
  const click = async (selector, index = 0) => {
    for (const frame of frames) await frame.locator(selector).nth(index).click({ timeout: 5000 })
    // Intervals are stopped by the fixture; refresh ordinary Vue display data after user input.
    await mutate('')
  }
  const component = async (name, predicate = 'true') => {
    for (const frame of frames) await frame.evaluate(({ name, predicate }) => {
      document.querySelectorAll('[data-midgame-control]').forEach(el => el.removeAttribute('data-midgame-control'))
      const root = [...document.querySelectorAll('*')].find(el => el.__vue__)?.__vue__.$root
      const matches = []
      const visit = vm => {
        if (vm.$options.name === name && Function('vm', `return ${predicate}`)(vm) && vm.$el?.nodeType === 1) matches.push(vm)
        vm.$children.forEach(visit)
      }
      if (root) visit(root)
      if (matches.length !== 1) throw new Error(`${name}: expected one component, got ${matches.length}: ${predicate}`)
      matches[0].$el.setAttribute('data-midgame-control', '')
    }, { name, predicate })
    return '[data-midgame-control]'
  }
  const studyClick = async id => {
    for (const frame of frames) await frame.locator('.l-time-study').filter({
      has: frame.locator('.l-hint-text--time-study', { hasText: new RegExp(`^\\s*${id}(?:\\s|$)`) }),
    }).click({ timeout: 5000 })
    await page.waitForTimeout(60)
  }
  const input = async (buyer, property, value) => {
    const selector = await component('AutobuyerInput', `vm.autobuyer===Autobuyer.${buyer} && vm.property==='${property}'`)
    for (const frame of frames) {
      await frame.locator(selector).fill(String(value))
      await frame.locator(selector).press('Tab')
    }
    await mutate('')
  }

  await test('Crunch mode inputs and boost/galaxy limits control actual triggering', async () => {
    for (const mode of [0, 1, 2]) {
      await prepare('player.eternities=new Decimal(5); player.infinities=new Decimal(1); player.break=true; NormalChallenge(12).complete(); Autobuyer.bigCrunch.data.interval=100; Autobuyers.all.forEach(a=>a.isActive=false);')
      await click(`${await component('AutobuyerBox', 'vm.autobuyer===Autobuyer.bigCrunch')} .c-autobuyer-box__mode-select-header`)
      await click(`${await component('AutobuyerDropdownEntry', 'vm.autobuyer===Autobuyer.bigCrunch')} .l-autobuyer-choice`, mode)
      await check('return Autobuyer.bigCrunch.mode', mode)
      const property = ['amount', 'time', 'xHighest'][mode]
      await input('bigCrunch', property, mode === 1 ? 5 : 2)
      await check(`return Autobuyer.bigCrunch.${property} instanceof Decimal ? Autobuyer.bigCrunch.${property}.toNumber() : Autobuyer.bigCrunch.${property}`, mode === 1 ? 5 : 2)
      await mutate(`Currency.antimatter.value=new Decimal('1e400'); player.records.thisInfinity.maxAM=Currency.antimatter.value;
        player.records.thisInfinity.realTime=5000; player.records.thisInfinity.time=120000;
        player.records.realTimePlayed=10000;`)
      if (mode === 0) await input('bigCrunch', property, await engine.evaluate(() => gainedInfinityPoints().plus(1).toString()))
      if (mode === 2) await mutate('player.records.thisEternity.maxIP=gainedInfinityPoints();')
      await click(`${await component('AutobuyerBox', 'vm.autobuyer===Autobuyer.bigCrunch')} .l-autobuyer-box__footer label`)
      await click('.l-autobuyers-tab .c-subtab-option-container button')
      await mutate('Autobuyers.tick();')
      await check('return player.infinities.toNumber()', 1)
      if (mode === 0) await input('bigCrunch', property, await engine.evaluate(() => gainedInfinityPoints().toString()))
      if (mode === 1) await mutate('player.records.thisInfinity.realTime=5001;')
      if (mode === 2) await input('bigCrunch', property, 1)
      await mutate('player.records.realTimePlayed+=100; Autobuyers.tick();')
      await check('return player.infinities.toNumber()', 2)
      await parity(`crunch ${property}: actual UI input blocks below and triggers at source condition`)
    }
    for (const [buyer, property, challenge, fixture, result] of [
      ['dimboost', 'maxDimBoosts', 10, 'AntimatterDimension(4).amount=new Decimal(20);', 'player.dimensionBoosts'],
      ['galaxy', 'maxGalaxies', 11, 'player.dimensionBoosts=4; AntimatterDimension(8).amount=new Decimal(80);', 'player.galaxies'],
    ]) {
      await prepare(`player.infinities=new Decimal(1); NormalChallenge(${challenge}).complete(); ${fixture}
        Autobuyers.all.forEach(a=>a.isActive=false); player.records.realTimePlayed=100000;`)
      const slot = buyer === 'dimboost' ? 'checkboxSlot' : 'toggleSlot'
      await click(`${await component('AutobuyerBox', `vm.autobuyer===Autobuyer.${buyer}`)} .c-autobuyer-box-row__${slot} input[type=checkbox]`)
      await input(buyer, property, 0)
      await click(`${await component('AutobuyerBox', `vm.autobuyer===Autobuyer.${buyer}`)} .l-autobuyer-box__footer label`)
      await click('.l-autobuyers-tab .c-subtab-option-container button')
      await mutate('Autobuyers.tick();')
      await check(`return ${result}`, 0)
      await input(buyer, property, 1)
      await mutate('player.records.realTimePlayed+=30000; Autobuyers.tick();')
      await check(`return ${result}`, 1)
      await parity(`${buyer}: limit input 0 prevents reset, 1 permits it`)
    }
  })

  await test('Eight army and tickspeed slow unlocks, interval caps, bulk and real scheduling', async () => {
    const buyers = [...Array.from({ length: 8 }, (_, i) => `antimatterDimension(${i + 1})`), 'tickspeed']
    for (const [index, buyer] of buyers.entries()) {
      await prepare(`player.dimensionBoosts=4; AntimatterDimensions.all.forEach(d=>d.amount=new Decimal(1));`)
      const box = () => component('AutobuyerBox', `vm.autobuyer===Autobuyer.${buyer}`)
      await mutate(`player.records.thisEternity.maxAM=Autobuyer.${buyer}.antimatterCost.times(0.999999);`)
      await click(await box())
      await check(`return Autobuyer.${buyer}.isBought`, false)
      await mutate(`player.records.thisEternity.maxAM=Autobuyer.${buyer}.antimatterCost;`)
      await click(await box())
      await check(`return Autobuyer.${buyer}.isBought`, true)
      await mutate(`NormalChallenge(${index + 1}).complete();`)
      while (!await engine.evaluate(buyer => Function(`return Autobuyer.${buyer}.hasMaxedInterval`)(), buyer)) {
        const interval = () => component('AutobuyerIntervalButton', `vm.autobuyer===Autobuyer.${buyer}`)
        const before = await engine.evaluate(buyer => Function(`return Autobuyer.${buyer}.interval`)(), buyer)
        await mutate(`Currency.infinityPoints.value=new Decimal(Autobuyer.${buyer}.cost-1);`)
        await click(await interval())
        await check(`return Autobuyer.${buyer}.interval`, before)
        await mutate(`Currency.infinityPoints.value=new Decimal(Autobuyer.${buyer}.cost);`)
        await click(await interval())
        await check(`return Autobuyer.${buyer}.interval`, Math.max(before * 0.6, 100))
      }
      if (index < 8) {
        while (!await engine.evaluate(buyer => Function(`return Autobuyer.${buyer}.hasMaxedBulk`)(), buyer)) {
          await mutate(`Currency.infinityPoints.value=new Decimal(Autobuyer.${buyer}.cost);`)
          await click(await component('DimensionBulkButton', `vm.autobuyer===Autobuyer.${buyer}`))
        }
        await check(`return Autobuyer.${buyer}.bulk`, 512)
      }
      const output = index < 8 ? `AntimatterDimension(${index + 1}).bought` : 'player.totalTickBought'
      if (index === 8) await mutate('AntimatterDimension(2).bought=1;')
      if (!await engine.evaluate(buyer => Function(`return Autobuyer.${buyer}.mode===AUTOBUYER_MODE.BUY_SINGLE`)(), buyer)) {
        await click(`${await box()} .c-autobuyer-box-row__toggleSlot .o-autobuyer-btn`)
      }
      await mutate(`Autobuyers.all.forEach(a=>a.isActive=false); Currency.antimatter.value=new Decimal('1e200');
        player.records.realTimePlayed=10000; Autobuyer.${buyer}.data.lastTick=9901;`)
      await click(`${await box()} .l-autobuyer-box__footer label`)
      await click('.l-autobuyers-tab .c-subtab-option-container button')
      await check(`return Autobuyer.${buyer}.canTick`, false)
      await mutate('gameLoop(1);')
      await check(`return ${output}`, 0)
      await mutate('gameLoop(1);')
      await check(`return ${output}`, 1)
      await parity(`${buyer}: one purchase only after full real-time interval`)
      await click(`${await box()} .c-autobuyer-box-row__toggleSlot .o-autobuyer-btn`)
      await mutate(`player.records.realTimePlayed+=100; gameLoop(1);`)
      await check(`return ${output}>1`, true)
      await parity(`${buyer}: max mode executes original bulk purchase`)
      await click(`${await box()} .l-autobuyer-box__footer label`)
      const stopped = await engine.evaluate(s => Function(`return ${s}`)(), output)
      await mutate('player.records.realTimePlayed+=1000; gameLoop(1);')
      await check(`return ${output}`, stopped)
    }
  })

  await test('Every middle-stage simple autobuyer unlocks, toggles and actually spends currency', async () => {
    const cases = [
      ...Array.from({ length: 8 }, (_, i) => ({ buyer: `infinityDimension(${i + 1})`,
        threshold: 11 + i, fixture: `InfinityDimension(${i + 1}).isUnlocked=true; Currency.infinityPoints.value=InfinityDimension(${i + 1}).cost;`,
        output: `InfinityDimension(${i + 1}).baseAmount`, expected: 10 })),
      ...['chance', 'interval', 'galaxies'].map((key, i) => ({ buyer: `replicantiUpgrade(${i + 1})`,
        threshold: [50, 60, 80][i], fixture: `player.replicanti.unl=true; Currency.infinityPoints.value=ReplicantiUpgrade.${key}.cost;`,
        output: `ReplicantiUpgrade.${key}.value`, expected: [0.02, 900, 1][i] })),
      { buyer: 'ipMult', threshold: 1, fixture: 'player.achievementBits[3]|=1; Currency.infinityPoints.value=new Decimal(InfinityUpgrade.ipMult.cost);', output: 'player.IPMultPurchases', expected: 1 },
      { buyer: 'replicantiGalaxy', threshold: 3, fixture: 'player.replicanti.unl=true; player.replicanti.amount=Decimal.NUMBER_MAX_VALUE; player.replicanti.boughtGalaxyCap=1;', output: 'player.replicanti.galaxies', expected: 1 },
      { buyer: 'sacrifice', threshold: 7, fixture: 'player.dimensionBoosts=5; AntimatterDimension(8).amount=new Decimal(1); AntimatterDimension(1).amount=new Decimal(1e100); Autobuyer.sacrifice.multiplier=new Decimal(1.01);', output: 'player.sacrificed.gt(0)', expected: true },
    ]
    for (const { buyer, threshold, fixture, output, expected } of cases) {
      await prepare(`player.infinities=new Decimal(1); player.break=true; player.eternities=new Decimal(${threshold - 1});`)
      await check(`return Autobuyer.${buyer}.isUnlocked`, false)
      await mutate(`player.eternities=new Decimal(${threshold}); ${fixture}; Autobuyers.all.forEach(a=>a.isActive=false); player.records.realTimePlayed=10000;`)
      await check(`return Autobuyer.${buyer}.isUnlocked`, true)
      await click(`${await component('AutobuyerSingleToggleLabel', `vm.autobuyer===Autobuyer.${buyer}`)} label`)
      await check(`return Autobuyer.${buyer}.isActive`, true)
      const before = await engine.evaluate(s => Function(`return ${s}`)(), output)
      await mutate('Autobuyers.tick();')
      await check(`return ${output}`, before)
      await click('.l-autobuyers-tab .c-subtab-option-container button')
      await mutate('Autobuyers.tick();')
      await check(`return ${output}`, expected)
      await parity(`${buyer}: exact milestone unlock, real UI activation and automatic result`)
    }
  })

  await test('Boost, galaxy, crunch and Eternity autobuyers execute original resets', async () => {
    const cases = [
      { buyer: 'dimboost', fixture: 'NormalChallenge(10).complete(); AntimatterDimension(4).amount=new Decimal(20);', output: 'player.dimensionBoosts', expected: 1 },
      { buyer: 'galaxy', fixture: 'NormalChallenge(11).complete(); player.dimensionBoosts=4; AntimatterDimension(8).amount=new Decimal(80);', output: 'player.galaxies', expected: 1 },
      { buyer: 'bigCrunch', fixture: 'NormalChallenge(12).complete(); player.break=true; Currency.antimatter.value=Player.infinityLimit; player.records.thisInfinity.maxAM=Currency.antimatter.value;', output: 'player.infinities.toNumber()', expected: 2 },
      { buyer: 'eternity', fixture: 'player.eternities=new Decimal(100); player.break=true; Currency.infinityPoints.value=new Decimal("1e310"); player.records.thisEternity.maxIP=Currency.infinityPoints.value;', output: 'player.eternities.toNumber()', expected: 101 },
    ]
    for (const { buyer, fixture, output, expected } of cases) {
      await prepare(`player.infinities=new Decimal(1);`)
      await check(`return Autobuyer.${buyer}.isUnlocked`, false)
      await mutate(`${fixture}; Autobuyers.all.forEach(a=>a.isActive=false); player.records.realTimePlayed=1000000;
        player.records.thisInfinity.time=120000; player.records.thisInfinity.realTime=120000;
        player.records.thisEternity.time=120000; player.records.thisEternity.realTime=120000;`)
      await check(`return Autobuyer.${buyer}.isUnlocked`, true)
      await click(`${await component('AutobuyerBox', `vm.autobuyer===Autobuyer.${buyer}`)} .l-autobuyer-box__footer label`)
      await click('.l-autobuyers-tab .c-subtab-option-container button')
      await mutate('Autobuyers.tick();')
      await check(`return ${output}`, expected)
      await parity(`${buyer}: automatic reset changes state and preserves original fields`)
    }
  })

  await test('All break upgrades, repeatable cost chains and caps', async () => {
    await prepare('player.infinities=new Decimal(1); NormalChallenge(12).complete(); player.auto.bigCrunch.interval=100; player.break=true;', 'infinity.break')
    const keys = await engine.evaluate(() => Object.keys(GameDatabase.infinity.breakUpgrades))
    for (const key of keys) {
      const cap = await engine.evaluate(key => BreakInfinityUpgrade[key].config.maxUpgrades ?? 1, key)
      for (let count = 0; count < cap; count++) {
        await mutate(`Currency.infinityPoints.value=new Decimal(BreakInfinityUpgrade.${key}.cost).times(0.999999);`)
        await click(await component('InfinityUpgradeButton', `vm.upgrade===BreakInfinityUpgrade.${key}`))
        await check(`return BreakInfinityUpgrade.${key}.config.rebuyable ? player.infinityRebuyables[BreakInfinityUpgrade.${key}.id] : Number(BreakInfinityUpgrade.${key}.isBought)`, count)
        await mutate(`Currency.infinityPoints.value=new Decimal(BreakInfinityUpgrade.${key}.cost);`)
        await click(await component('InfinityUpgradeButton', `vm.upgrade===BreakInfinityUpgrade.${key}`))
        await check(`return BreakInfinityUpgrade.${key}.config.rebuyable ? player.infinityRebuyables[BreakInfinityUpgrade.${key}.id] : Number(BreakInfinityUpgrade.${key}.isBought)`, count + 1)
        await check('return Currency.infinityPoints.value.toNumber()', 0)
        await parity(`${key}: purchase ${count + 1}, below/exact cost and resulting multipliers`)
      }
      await mutate('Currency.infinityPoints.value=new Decimal(1e100);')
      await click(await component('InfinityUpgradeButton', `vm.upgrade===BreakInfinityUpgrade.${key}`))
      await check('return Currency.infinityPoints.value.toString()', '1e+100')
      await parity(`${key}: no spending after cap/one-time purchase`)
    }
  })

  await test('Every pre-Reality dilation upgrade, galaxy reset and finite cap', async () => {
    await prepare('player.eternities=new Decimal(100); player.dilation.studies=[1]; Currency.tachyonParticles.value=new Decimal(20000);', 'eternity.dilation')
    const keys = await engine.evaluate(() => Object.entries(GameDatabase.eternity.dilation)
      .filter(([, config]) => !config.pelleOnly).map(([key]) => key))
    for (const key of keys) {
      const rebuyable = await engine.evaluate(key => Boolean(DilationUpgrade[key].config.rebuyable), key)
      const count = key === 'galaxyThreshold' ? 38 : rebuyable ? 3 : 1
      for (let i = 0; i < count; i++) {
        const state = `DilationUpgrade.${key}.config.rebuyable ? DilationUpgrade.${key}.boughtAmount : Number(DilationUpgrade.${key}.isBought)`
        await mutate(`Currency.dilatedTime.value=new Decimal(DilationUpgrade.${key}.cost).times(0.999999);`)
        const target = async () => `${await component('DilationUpgradeButton', `vm.upgrade===DilationUpgrade.${key}`)} > button`
        await click(await target())
        await check(`return ${state}`, i)
        await mutate(`Currency.dilatedTime.value=new Decimal(DilationUpgrade.${key}.cost); player.dilation.totalTachyonGalaxies=5;`)
        await click(await target())
        await check(`return ${state}`, i + 1)
        await check('return Currency.dilatedTime.value.toNumber()', 0)
        if (key === 'galaxyThreshold') await check('return player.dilation.totalTachyonGalaxies', 0)
        await parity(`dilation ${key} ${i + 1}: original cost/effect/reset`)
      }
      if (!rebuyable || key === 'galaxyThreshold') {
        await mutate('Currency.dilatedTime.value=new Decimal(1e100);')
        await click(`${await component('DilationUpgradeButton', `vm.upgrade===DilationUpgrade.${key}`)} > button`)
        await check('return Currency.dilatedTime.value.toString()', '1e+100')
      }
    }
    await mutate('Currency.timeTheorems.value=new Decimal(0); gameLoop(1000);')
    await check('return Currency.timeTheorems.value.gt(0)', true)
    await parity('purchased generator actually generates theorems through gameLoop')
  })

  await test('Replicanti growth, cap, confirmation and galaxy retention milestones', async () => {
    for (const eternity of [39, 40]) {
      await prepare(`player.eternities=new Decimal(${eternity}); player.break=true; player.replicanti.unl=true;
        player.replicanti.chance=1; player.replicanti.interval=1000; player.replicanti.amount=new Decimal(100);
        player.replicanti.boughtGalaxyCap=2; player.options.confirmations.replicantiGalaxy=true;`, 'infinity.replicanti')
      await mutate('replicantiLoop(1000);')
      await check('return Replicanti.amount.gt(1)', true)
      await parity('replicanti: original growth at 100% chance')
      await mutate('Replicanti.amount=replicantiCap().times(0.99); replicantiLoop(100000);')
      await check('return Replicanti.amount.eq(replicantiCap())', true)
      await mutate('player.dimensionBoosts=5; AntimatterDimension(1).amount=new Decimal(100);')
      await click('.o-primary-btn--replicanti-galaxy')
      await check('return player.replicanti.galaxies', 0)
      await click('.l-modal-buttons button:not(.c-modal__confirm-btn)')
      await check('return Replicanti.amount.eq(replicantiCap())', true)
      await click('.o-primary-btn--replicanti-galaxy')
      await click('.c-modal__confirm-btn')
      await check('return player.replicanti.galaxies', 1)
      await check('return Replicanti.amount.toNumber()', 1)
      await check('return player.dimensionBoosts', eternity === 40 ? 5 : 0)
      await check('return AntimatterDimension(1).amount.toNumber()', eternity === 40 ? 100 : 0)
      await parity(`replicanti galaxy: confirmed reset at ${eternity} Eternities`)
      await click('.o-primary-btn--replicanti-galaxy')
      await check('return player.replicanti.galaxies', 1)
    }
    await prepare('player.eternities=new Decimal(40); player.replicanti.unl=true; player.replicanti.boughtGalaxyCap=2; player.replicanti.amount=new Decimal("1e310"); player.achievementBits[11]|=1<<5;', 'infinity.replicanti')
    await check('return Achievement(126).isUnlocked', true)
    await click('.o-primary-btn--replicanti-galaxy')
    await check('return player.replicanti.galaxies', 1)
    await check('return Replicanti.amount.gt(1)', true)
    await parity('achievement126 history fixture: galaxy divides amount instead of resetting to one')
  })

  await test('Second dimension path and dilation three-path unlock', async () => {
    await prepare('player.eternities=new Decimal(100); player.timestudy.studies=[11,21,31,41,51,61,71,81,91,101,111,121,131,141,151,161,171,181,192]; for(const id of [1,2,3,10]) player.eternityChalls["eterc"+id]=1; Currency.timeTheorems.value=new Decimal(1000);', 'eternity.studies')
    await studyClick(72)
    await check('return TimeStudy(72).isBought', false)
    await studyClick(201)
    await check('return TimeStudy(201).isBought', true)
    await studyClick(72)
    await check('return TimeStudy(72).isBought', true)
    await studyClick(73)
    await check('return TimeStudy(73).isBought', false)
    await parity('TS201 real purchase opens second path but not third')
    await mutate('player.dilation.studies=[1]; Currency.dilatedTime.value=new Decimal(DilationUpgrade.timeStudySplit.cost); Tab.eternity.dilation.show(true);')
    await click(`${await component('DilationUpgradeButton', 'vm.upgrade===DilationUpgrade.timeStudySplit')} > button`)
    await mutate('Tab.eternity.studies.show(true);')
    await studyClick(73)
    await check('return [71,72,73].every(id=>TimeStudy(id).isBought)', true)
    await parity('purchased dilation upgrade permits all three paths')
  })

  await test('Space theorem exception spends exact cost and refunds on study respec', async () => {
    // V completion history grants ST; no claim of completing V in this middle-stage test.
    await prepare('player.eternities=new Decimal(100); player.break=true; player.timestudy.studies=[111,121]; Currency.timeTheorems.value=new Decimal(1000); V.updateTotalRunUnlocks();', 'eternity.studies')
    await studyClick(122)
    await check('return TimeStudy(122).isBought', false)
    await mutate('player.celestials.v.runUnlocks[0]=TimeStudy(122).STCost; V.updateTotalRunUnlocks();')
    await studyClick(122)
    await check('return TimeStudy(122).isBought', true)
    await check('return V.availableST', 0)
    await parity('pace exclusivity: V history provides exact ST, original purchase consumes it')
    await click('.l-time-studies-tab > .c-subtab-option-container button', 1)
    await mutate('Currency.infinityPoints.value=new Decimal("1e310"); player.records.thisEternity.maxIP=Currency.infinityPoints.value; player.records.thisEternity.time=120000; player.records.thisEternity.realTime=120000;')
    await click('.o-eternity-button')
    await check('return player.celestials.v.STSpent', 0)
    await check('return player.timestudy.studies', [])
    await parity('real study respec refunds space theorem spending')
  })

  await test('All eternity trials cancel entry, restart, apply rules and exit on completion', async () => {
    for (let id = 1; id <= 12; id++) {
      await prepare(`player.eternities=new Decimal(100); player.break=true; player.challenge.eternity.unlocked=${id};
        player.options.confirmations.challenges=true;`, 'challenges.eternity')
      await click('.c-challenge-box--eternity .o-challenge-btn:visible')
      await check('return player.challenge.eternity.current', 0)
      await click('.l-modal-buttons button:not(.c-modal__confirm-btn)')
      await check('return player.challenge.eternity.current', 0)
      await click('.c-challenge-box--eternity .o-challenge-btn:visible')
      await click('.c-modal__confirm-btn')
      await check('return player.challenge.eternity.current', id)
      await mutate(`player.dimensionBoosts=5; AntimatterDimensions.all.forEach(d=>d.amount=new Decimal(100));
        InfinityDimensions.all.forEach(d=>{d.isUnlocked=true; d.amount=new Decimal(100);});
        TimeDimensions.all.forEach(d=>d.amount=new Decimal(100));
        Currency.infinityPower.value=new Decimal(1e10); Currency.antimatter.value=new Decimal(1e100);`)
      if ([1, 10].includes(id)) await check('return TimeDimension(1).productionPerSecond.toNumber()', 0)
      if ([2, 10].includes(id)) await check('return InfinityDimension(1).productionPerSecond.toNumber()', 0)
      if (id === 3) {
        await check('return AntimatterDimension(5).isProducing', false)
        await check('return Sacrifice.canSacrifice', false)
        await mutate('gameLoop(1);')
        await check('return AntimatterDimension(4).amount.toNumber()', 100)
      }
      if (id === 5) await check('return Galaxy.type===GALAXY_TYPE.DISTANT', true)
      if (id === 6) await check('return Galaxy.canBeBought', false)
      if (id === 7) {
        await mutate('gameLoop(1);')
        await check('return InfinityDimension(8).amount.gt(100)', true)
        await check('return AntimatterDimension(7).amount.gt(100)', true)
      }
      if (id === 9) await check('return Tickspeed.isAvailableForPurchase', false)
      if (id === 11) await check('return [InfinityDimension(1).multiplier.toNumber(),TimeDimension(1).multiplier.toNumber()]', [1, 1])
      if (id === 12) await check('return getGameSpeedupFactor()', 0.001)
      await parity(`EC${id}: confirmed entry and explicit active rule`)
      await mutate('Tab.challenges.eternity.show(true);')
      // Header: retry toggle, show-all toggle, restart, exit.
      await click('.l-challenges-tab__header .c-subtab-option-container button', 2)
      await check('return player.challenge.eternity.current', id)
      await check('return player.records.thisEternity.time', 0)
      await parity(`EC${id}: restart through original header resets timer and resources`)
      await click('.l-challenges-tab__header .c-subtab-option-container button', 0)
      await check('return player.options.retryChallenge', true)
      await mutate(`Currency.infinityPoints.value=EternityChallenge(${id}).currentGoal;
        player.records.thisEternity.maxIP=Currency.infinityPoints.value;
        player.records.thisEternity.time=0; player.records.thisEternity.realTime=120000;`)
      await click('.o-eternity-button')
      await check(`return EternityChallenge(${id}).completions`, 1)
      await check('return player.challenge.eternity.current', 0)
      await parity(`EC${id}: original completion exits even with normal-challenge retry enabled`)
    }
  })

  await test('Normal and infinity challenge automatic retry keeps the active trial', async () => {
    for (const kind of ['normal', 'infinity']) {
      const accessor = kind === 'normal' ? 'NormalChallenge' : 'InfinityChallenge'
      await prepare(`player.infinities=new Decimal(10); player.break=true; player.records.thisEternity.maxAM=InfinityChallenge(2).unlockAM;`, `challenges.${kind}`)
      await click('.l-challenges-tab__header .c-subtab-option-container button', 0)
      await check('return player.options.retryChallenge', true)
      await click(`.c-challenge-box--${kind} .o-challenge-btn`, 1)
      await mutate(`Currency.antimatter.value=${accessor}(2).goal; player.records.thisInfinity.maxAM=Currency.antimatter.value;
        player.records.thisInfinity.time=120000; player.records.thisInfinity.realTime=120000;`)
      await engine.locator('[data-action="crunch"]:visible, .o-prestige-button.o-infinity-button:not(.o-infinity-button--unavailable):visible').last().click()
      await reference.locator('.o-prestige-button.o-infinity-button:not(.o-infinity-button--unavailable):visible, .btn-big-crunch:visible, .o-big-crunch-btn:visible').last().click()
      await page.waitForTimeout(60)
      await check(`return ${accessor}(2).isCompleted`, true)
      await check(`return player.challenge.${kind}.current`, 2)
      await parity(`${kind}: original automatic retry after actual crunch`)
    }
  })

  await test('EC8 enforces fifty council and forty replicanti purchases and disables autos', async () => {
    await prepare('player.eternities=new Decimal(100); player.break=true; player.challenge.eternity.unlocked=8;', 'challenges.eternity')
    await click('.c-challenge-box--eternity .o-challenge-btn:visible')
    await mutate('InfinityDimension(1).isUnlocked=true; player.replicanti.unl=true; Tab.dimensions.infinity.show(true);')
    for (let i = 0; i < 51; i++) {
      await mutate('Currency.infinityPoints.value=InfinityDimension(1).cost;')
      await click('.o-primary-btn--buy-id', 0)
      await check('return InfinityDimension(1).baseAmount', Math.min(i + 1, 50) * 10)
    }
    await parity('EC8 council: all fifty purchases allowed, fifty-first rejected')
    await mutate('Tab.infinity.replicanti.show(true);')
    for (let i = 0; i < 41; i++) {
      await mutate('Currency.infinityPoints.value=ReplicantiUpgrade.galaxies.cost;')
      await click('.o-primary-btn--replicanti-upgrade', 2)
      await check('return player.replicanti.boughtGalaxyCap', Math.min(i + 1, 40))
    }
    await parity('EC8 replicanti: all forty purchases allowed, forty-first rejected')
    await mutate('Autobuyers.all.forEach(a=>a.isActive=false); Autobuyer.infinityDimension(1).isActive=true; Autobuyer.replicantiUpgrade(1).isActive=true; player.auto.autobuyersOn=true; player.records.realTimePlayed=10000; Currency.infinityPoints.value=new Decimal("1e10000");')
    const before = await engine.evaluate(() => [InfinityDimension(1).baseAmount, player.replicanti.chance])
    await mutate('Autobuyers.tick();')
    await check('return [InfinityDimension(1).baseAmount,player.replicanti.chance]', before)
    await parity('EC8 auto purchases disabled despite funds, milestone and enabled settings')
  })

  await test('Offline milestone credits and mutually exclusive eligibility', async () => {
    const configs = [
      { threshold: 6, output: 'player.eternityPoints', amount: 30,
        setup: 'player.records.bestEternity.bestEPminReality=new Decimal(120);', },
      { threshold: 200, output: 'player.eternities', amount: 60,
        setup: 'player.records.thisReality.bestEternitiesPerMs=new Decimal(0.002); player.auto.autobuyersOn=true; Autobuyer.eternity.isActive=true; Autobuyer.eternity.amount=new Decimal(0);', },
      { threshold: 1000, output: 'player.infinities', amount: 120,
        setup: 'player.records.thisEternity.bestInfinitiesPerMs=new Decimal(0.004); player.auto.autobuyersOn=true; Autobuyer.bigCrunch.isActive=true; Autobuyer.bigCrunch.mode=AUTO_CRUNCH_MODE.TIME; Autobuyer.bigCrunch.time=5; Autobuyer.eternity.isActive=false;', },
    ]
    for (const { threshold, output, amount, setup } of configs) {
      for (const reached of [false, true]) {
        await prepare(`player.eternities=new Decimal(${threshold - (reached ? 0 : 1)}); player.options.offlineProgress=true; Autobuyers.all.forEach(a=>a.isActive=false); ${setup}`, 'eternity.milestones')
        const before = await engine.evaluate(s => Function(`return ${s}.toNumber()`)(), output)
        // Original fast offline simulator applies its normal 50 ticks and actual currency credits.
        // Stop intervals immediately after its post-load hook; clocks do not run between assertions.
        await mutate('simulateTime(60, false, true); GameIntervals.stop(); Modal.hideAll();')
        await check(`return ${output}.toNumber()`, before + (reached ? amount : 0))
        await parity(`offline ${threshold}: ${reached ? 'reached' : 'below'} threshold, actual 60-second credit`)
      }
    }
    await prepare(`player.eternities=new Decimal(1000); player.options.offlineProgress=true;
      player.records.bestEternity.bestEPminReality=new Decimal(120);
      player.records.thisEternity.bestInfinitiesPerMs=new Decimal(0.004);
      player.records.thisReality.bestEternitiesPerMs=new Decimal(0.002);
      player.auto.autobuyersOn=true; Autobuyer.bigCrunch.isActive=true;
      Autobuyer.bigCrunch.mode=AUTO_CRUNCH_MODE.TIME; Autobuyer.bigCrunch.time=5;
      Autobuyer.eternity.isActive=true; Autobuyer.eternity.amount=new Decimal(0);`, 'eternity.milestones')
    await check('return [getOfflineEPGain(60000).toNumber(), getInfinitiedMilestoneReward(60000).toNumber(), getEternitiedMilestoneReward(60000).toNumber()]', [0, 0, 60])
    await mutate('player.dilation.active=true;')
    await check('return getEternitiedMilestoneReward(60000).toNumber()', 0)
    await mutate('player.dilation.active=false; Autobuyer.eternity.isActive=false;')
    await check('return getInfinitiedMilestoneReward(60000).toNumber()', 120)
    for (const id of [4, 12]) {
      await mutate(`player.challenge.eternity.current=${id};`)
      await check('return getInfinitiedMilestoneReward(60000).toNumber()', 0)
    }
    await mutate('player.challenge.eternity.current=0; Autobuyer.bigCrunch.time=5.001;')
    await check('return getInfinitiedMilestoneReward(60000).toNumber()', 0)
    await mutate('player.options.offlineProgress=false;')
    await check('return getOfflineEPGain(60000).toNumber()', 0)
    await parity('offline reward eligibility: priority, dilation/EC exclusions, 5-second limit and disabled EP')
  })

  await test('Middle-stage descriptions use mapped Chinese and original numeric effects', async () => {
    await prepare('player.eternities=new Decimal(100); player.break=true; player.dilation.studies=[1];', 'infinity.break')
    const descriptions = await engine.evaluate(() => [...Object.values(GameDatabase.infinity.breakUpgrades),
      ...Object.values(GameDatabase.eternity.dilation).filter(c => !c.pelleOnly)]
      .map(c => ({ id: c.id, text: UndeadTheme.translate(typeof c.description === 'function' ? c.description() : c.description) })))
    trace.push({ label: 'current generated descriptions', descriptions })
    for (const { text } of descriptions) assert.doesNotMatch(text, /[a-z]{3,}/i, text)
    for (const [tab, selector] of [
      ['infinity.break', '.l-break-infinity-upgrade-grid'],
      ['eternity.dilation', '.l-dilation-upgrades-grid'],
      ['infinity.replicanti', '.l-replicanti-tab'],
      ['automation.autobuyers', '.l-autobuyers-tab'],
    ]) {
      await mutate(`player.challenge.normal.completedBits=8190; Autobuyer.bigCrunch.data.interval=100; player.replicanti.unl=true; Tab.${tab}.show(true);`)
      if (tab === 'infinity.break') await page.waitForTimeout(10000)
      if (tab === 'eternity.dilation') assert.equal((await engine.locator('.o-dilation-btn').innerText()).trim(), '开启永夜仪式')
      if (tab === 'infinity.replicanti') {
        const labels = await engine.locator('.o-primary-btn--replicanti-upgrade').allTextContents()
        for (const label of labels) assert.doesNotMatch(label, /Replicate|Interval|Max Replicanti/i)
      }
      for (const width of [320, 1440]) {
        await page.setViewportSize({ width, height: 1000 })
        await page.waitForTimeout(100)
        await engine.evaluate(() => window.scrollTo(0, 0))
        const bounds = await engine.evaluate(() => [...document.querySelectorAll(
          '.l-break-infinity-upgrade-grid button, .l-dilation-upgrades-grid button, .o-primary-btn--replicanti-upgrade, .l-autobuyers-tab .c-autobuyer-box-row')]
          .filter(el => el.getClientRects().length).map(el => ({ text: el.textContent.trim().slice(0, 50),
            left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right, viewport: innerWidth })))
        for (const box of bounds) assert.ok(box.left >= -1 && box.right <= box.viewport + 1, `${tab} ${width}: ${JSON.stringify(box)}`)
        assert.ok(bounds.length > 0, `${tab}: no visible controls checked`)
        await page.screenshot({ path: outputPath(`midgame-${tab.replace('.', '-')}-${width}.png`), fullPage: true })
      }
      trace.push({ tab, selector, rendered: await engine.locator(selector).count() })
    }
    await page.setViewportSize({ width: 1440, height: 1000 })
  })
}
