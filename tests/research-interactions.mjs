import assert from 'node:assert/strict'
import fs from 'node:fs'
import { outputPath } from './output.mjs'

// These are stage-resource fixtures, not claims of naturally reaching the stages.
// Every purchase, challenge entry/exit, and prestige below uses a browser click.
export async function researchInteractions({ page, engine, reference, reset, test: runTest }) {
  const frames = [engine, reference]
  const trace = []
  const test = async (name, fn) => {
    try { await runTest(name, fn) }
    finally {
      // Preserve failed cases too, without rewriting the growing trace on every click.
      fs.writeFileSync(outputPath('research-operations.json'), JSON.stringify(trace, null, 2))
    }
  }
  const mutate = async script => {
    for (const frame of frames) await frame.evaluate(script => {
      Function(script)()
      Lazy.invalidateAll()
      GameUI.update()
    }, script)
    await page.waitForTimeout(100)
  }
  const prepare = async (fixture, tab) => {
    for (const frame of frames) await reset(frame)
    trace.push({ fixture, tab, source: 'forced stage resources; unlock and completion history explicitly stated' })
    await mutate(`${fixture}; Tab.${tab}.show(true);`)
  }
  const click = async (selector, index = 0) => {
    for (const frame of frames) await frame.locator(selector).nth(index).click({ timeout: 5000 })
    await page.waitForTimeout(100)
  }
  const check = async (script, expected) => {
    for (const frame of frames) assert.deepEqual(await frame.evaluate(script => Function(script)(), script), expected)
  }
  const parity = async label => {
    // Query current computed multipliers after UI-only resets with simulation intervals stopped.
    // Without this, the reference may retain a previous tick's lazy multiplier cache.
    await mutate('')
    const read = frame => frame.evaluate(() => JSON.parse(JSON.stringify({
      am: player.antimatter, ip: player.infinityPoints, ep: player.eternityPoints,
      infinities: player.infinities, eternities: player.eternities, break: player.break,
      challenge: player.challenge, completions: player.eternityChalls,
      studies: player.timestudy, respec: player.respec, dilation: player.dilation,
      dimensions: player.dimensions, replicanti: player.replicanti, auto: player.auto,
      upgrades: [...player.infinityUpgrades].sort(),
      powers: [player.chall2Pow, player.chall3Pow, player.matter, player.ic2Count],
      multipliers: AntimatterDimensions.all.map(d => d.multiplier),
      milestones: Object.fromEntries(Object.entries(EternityMilestone).map(([key, value]) => [key, value.isReached])),
      ecRewards: EternityChallenges.all.map(ec => ({ id: ec.id, completions: ec.completions, reward: ec.reward.effectValue })),
    }, (_k, v) => v instanceof Set ? [...v].sort() : v)))
    const actual = await read(engine)
    const expected = await read(reference)
    trace.push({ label, actual, expected })
    assert.deepEqual(actual, expected, label)
  }
  const studyClick = async id => {
    for (const frame of frames) {
      await frame.locator('.l-time-study').filter({ has: frame.locator('.l-hint-text--time-study', { hasText: new RegExp(`^\\s*${id}(?:\\s|$)`) }) }).click({ timeout: 5000 })
    }
    await page.waitForTimeout(100)
  }

  await test('Research UI · Original study prerequisites, exact costs, path exclusivity and refund', async () => {
    await prepare('player.eternities=new Decimal(1); Currency.timeTheorems.value=new Decimal(100);', 'eternity.studies')
    await studyClick(21)
    await check('return TimeStudy(21).isBought', false)
    await parity('TS21 missing TS11 prerequisite')
    for (const id of [11, 21, 31, 41, 51, 61, 71]) {
      await mutate(`Currency.timeTheorems.value=new Decimal(TimeStudy(${id}).cost-1);`)
      await studyClick(id)
      await check(`return TimeStudy(${id}).isBought`, false)
      await mutate(`Currency.timeTheorems.value=new Decimal(TimeStudy(${id}).cost);`)
      await studyClick(id)
      await check(`return TimeStudy(${id}).isBought`, true)
      await parity(`TS${id}: insufficient and exact theorem cost`)
    }
    await mutate('Currency.timeTheorems.value=new Decimal(100);')
    for (const id of [72, 73]) {
      await studyClick(id)
      await check(`return TimeStudy(${id}).isBought`, false)
      await parity(`TS${id}: excluded by TS71 dimension path`)
    }
    await click('.l-time-studies-tab > .c-subtab-option-container button', 1)
    await check('return player.respec', true)
    await mutate(`Currency.infinityPoints.value=new Decimal('1e310'); player.records.thisEternity.maxIP=new Decimal('1e310');
      player.records.thisEternity.time=120000; player.records.thisEternity.realTime=120000;`)
    const refundable = await engine.evaluate(() => Currency.timeTheorems.value.plus(TimeStudy.boughtNormalTS().reduce((sum, s) => sum + s.cost, 0)).toString())
    await click('.o-eternity-button')
    await check('return player.timestudy.studies', [])
    await check('return Currency.timeTheorems.value.toString()', refundable)
    await parity('real Eternity applies requested study respec and exact refund')
  })

  await test('Research UI · Every pre-Reality study cost, prerequisite and exclusive partner', async () => {
    const ids = await engine.evaluate(() => NormalTimeStudyState.all.filter(s => s.id < 300).map(s => s.id))
    for (const id of ids) {
      await prepare(`player.eternities=new Decimal(1); Currency.timeTheorems.value=new Decimal(10000);`, 'eternity.studies')
      if (id !== 11) {
        await studyClick(id)
        await check(`return TimeStudy(${id}).isBought`, false)
        await parity(`TS${id}: missing prerequisites`)
      }
      // Seed only this study's prerequisite history. The target always requires an actual click.
      await mutate(`player.timestudy.studies=TimeStudy(${id}).config.requirement.filter(r=>typeof r==='number');
        for(const ec of [1,2,3,5,10]) player.eternityChalls['eterc'+ec]=1;
        Currency.timeTheorems.value=new Decimal(TimeStudy(${id}).cost-1);`)
      await studyClick(id)
      await check(`return TimeStudy(${id}).isBought`, false)
      await mutate(`Currency.timeTheorems.value=new Decimal(TimeStudy(${id}).cost);`)
      await studyClick(id)
      await check(`return TimeStudy(${id}).isBought`, true)
      await check('return Currency.timeTheorems.value.toNumber()', 0)
      await parity(`TS${id}: prerequisite history fixture and exact original cost`)
      const partners = await engine.evaluate(id => TimeStudy(id).config.requiresST ?? [], id)
      for (const partner of partners) {
        // Supply the partner's parents as well, leaving only the mutual exclusion unsatisfied.
        await mutate(`player.timestudy.studies=[...new Set([...player.timestudy.studies,
          ...TimeStudy(${partner}).config.requirement.filter(r=>typeof r==='number')])];
          Currency.timeTheorems.value=new Decimal(10000);`)
        await studyClick(partner)
        await check(`return TimeStudy(${partner}).isBought`, false)
        await parity(`TS${id} excludes TS${partner} without space theorems`)
      }
    }
    // TS181's EC completion gates are independent of its numeric study parent.
    for (const missing of [1, 2, 3]) {
      await prepare(`player.eternities=new Decimal(1); player.timestudy.studies=[171];
        Currency.timeTheorems.value=new Decimal(200);
        for(const ec of [1,2,3]) player.eternityChalls['eterc'+ec]=ec===${missing}?0:1;`, 'eternity.studies')
      await studyClick(181)
      await check('return TimeStudy(181).isBought', false)
      await parity(`TS181: missing EC${missing} completion`)
    }
  })

  await test('Research UI · All normal and infinity challenges enter, apply rules and exit through UI', async () => {
    for (const [kind, accessor, last] of [['normal', 'NormalChallenge', 12], ['infinity', 'InfinityChallenge', 8]]) {
      for (let id = kind === 'normal' ? 2 : 1; id <= last; id++) {
        const fixture = kind === 'normal'
          ? `player.infinities=GameDatabase.challenges.normal[${id - 1}].lockedAt.clampMin(1);`
          : `player.infinities=new Decimal(1); player.break=true; player.records.thisEternity.maxAM=InfinityChallenge(${id}).unlockAM;`
        await prepare(fixture, `challenges.${kind}`)
        await check(`return ${accessor}(${id}).isUnlocked`, true)
        await click(`.c-challenge-box--${kind} .o-challenge-btn`, id - 1)
        await check(`return player.challenge.${kind}.current`, id)
        await parity(`${kind} ${id}: enter at unlock boundary and reset`)
        await mutate(`Currency.antimatter.value=new Decimal('1e20'); player.dimensionBoosts=4;
          AntimatterDimensions.all.forEach((d,i)=>d.amount=new Decimal(i+1));`)
        // Click original purchase controls; tick the unchanged original simulation deterministically.
        await engine.locator('[data-buy-tier="1"]').click()
        await reference.locator('.l-dim-row-multi-button-container button').first().click()
        await mutate('gameLoop(50);')
        await parity(`${kind} ${id}: purchase and production under active rules`)
        await mutate(`Tab.challenges.${kind}.show(true);`)
        for (const frame of frames) await frame.locator('.l-challenges-tab__header .c-subtab-option-container button').last().click()
        await page.waitForTimeout(100)
        await check(`return player.challenge.${kind}.current`, 0)
        await parity(`${kind} ${id}: real exit resets without fabricated completion`)
        await mutate(`Tab.challenges.${kind}.show(true);`)
        await click(`.c-challenge-box--${kind} .o-challenge-btn`, id - 1)
        await mutate(`player.records.thisInfinity.time=120000; player.records.thisInfinity.realTime=120000;
          Currency.antimatter.value=${accessor}(${id}).goal.times(0.999999);
          player.records.thisInfinity.maxAM=Currency.antimatter.value;`)
        await check('return Player.canCrunch', false)
        await parity(`${kind} ${id}: below original goal cannot crunch`)
        await mutate(`Currency.antimatter.value=${accessor}(${id}).goal;
          player.records.thisInfinity.maxAM=Currency.antimatter.value;`)
        await engine.locator('[data-action="crunch"]:visible, .o-prestige-button.o-infinity-button:not(.o-infinity-button--unavailable):visible').last().click({ timeout: 5000 })
        await reference.locator('.o-prestige-button.o-infinity-button:not(.o-infinity-button--unavailable):visible, .btn-big-crunch:visible, .o-big-crunch-btn:visible').last().click({ timeout: 5000 })
        await page.waitForTimeout(100)
        await check(`return ${accessor}(${id}).isCompleted`, true)
        await parity(`${kind} ${id}: real crunch at original goal completes and grants autobuyer/reward`)
      }
    }
  })

  await test('Research UI · Twelve eternity trials complete all five tiers with original secondary and IP gates', async () => {
    const resources = [
      'player.eternities=new Decimal(20000);', 'player.totalTickGained=1300;',
      'AntimatterDimension(8).amount=new Decimal(17300);', 'player.infinities=new Decimal(1e8);',
      'player.galaxies=160;', 'player.replicanti.galaxies=40;',
      'Currency.antimatter.value=new Decimal("1e500000");', 'Currency.infinityPoints.value=new Decimal("1e4000");',
      'Currency.infinityPower.value=new Decimal("1e17500");', 'Currency.eternityPoints.value=new Decimal("1e100");', '', '',
    ]
    for (let id = 1; id <= 12; id++) {
      for (let completion = 0; completion < 5; completion++) {
      // Only prerequisite study history and secondary resources are seeded; the EC study is purchased.
      await prepare(`player.eternities=new Decimal(1); player.break=true; ${resources[id - 1]}
        player.eternityChalls.eterc${id}=${completion};
        player.timestudy.studies=[...TimeStudy.eternityChallenge(${id}).config.requirement];
        Currency.timeTheorems.value=new Decimal(TimeStudy.eternityChallenge(${id}).cost-1);
        ECTimeStudyState.invalidateCachedRequirements();`, 'eternity.studies')
      const ecStudy = frame => frame.locator('.l-time-study').filter({
        has: frame.locator('.l-hint-text--time-study', { hasText: new RegExp(`^\\s*EC${id}\\s*$`) }),
      })
      for (const frame of frames) await ecStudy(frame).click({ timeout: 5000 })
      await check('return player.challenge.eternity.unlocked', 0)
      await parity(`EC${id}: below study cost`)
      await mutate(`Currency.timeTheorems.value=new Decimal(TimeStudy.eternityChallenge(${id}).cost);`)
      const resourceTargets = [
        'player.eternities', 'player.totalTickGained', 'AntimatterDimension(8).amount', 'player.infinities',
        'player.galaxies', 'player.replicanti.galaxies', 'Currency.antimatter.value',
        'Currency.infinityPoints.value', 'Currency.infinityPower.value', 'Currency.eternityPoints.value',
      ]
      if (id <= 10) {
        const target = resourceTargets[id - 1]
        const decimal = ![2, 5, 6].includes(id)
        const requirement = `TimeStudy.eternityChallenge(${id}).requirementTotal`
        await mutate(`${target}=${decimal ? `new Decimal(${requirement}).times(0.999999)` : `${requirement}-1`}; ECTimeStudyState.invalidateCachedRequirements();`)
        for (const frame of frames) await ecStudy(frame).click({ timeout: 5000 })
        await check('return player.challenge.eternity.unlocked', 0)
        await parity(`EC${id} tier ${completion + 1}: insufficient secondary resource`)
        await mutate(`${target}=${requirement}; ECTimeStudyState.invalidateCachedRequirements();`)
      } else {
        await mutate(`player.timestudy.studies.push(${id === 11 ? 72 : 71});`)
        for (const frame of frames) await ecStudy(frame).click({ timeout: 5000 })
        await check('return player.challenge.eternity.unlocked', 0)
        await parity(`EC${id} tier ${completion + 1}: forbidden dimension path`)
        await mutate(`player.timestudy.studies=[...TimeStudy.eternityChallenge(${id}).config.requirement];`)
      }
      for (const frame of frames) await ecStudy(frame).click({ timeout: 5000 })
      await page.waitForTimeout(100)
      await check('return player.challenge.eternity.unlocked', id)
      await parity(`EC${id}: exact study cost, original prerequisite/secondary resource`)
      await mutate('Tab.challenges.eternity.show(true);')
      await click('.c-challenge-box--eternity .o-challenge-btn:visible')
      await check('return player.challenge.eternity.current', id)
      await parity(`EC${id}: real entry reset`)
      await mutate(`player.records.thisEternity.time=0; player.records.thisEternity.realTime=120000;
        Currency.infinityPoints.value=EternityChallenge(${id}).currentGoal.times(0.999999);
        player.records.thisEternity.maxIP=Currency.infinityPoints.value;`)
      await check('return Player.canEternity', false)
      for (const frame of frames) {
        const button = frame.locator('.o-eternity-button')
        if (await button.isVisible()) await button.click({ timeout: 5000 })
      }
      await check(`return EternityChallenge(${id}).completions`, completion)
      await parity(`EC${id}: goal below threshold cannot complete`)
      await mutate(`Currency.infinityPoints.value=EternityChallenge(${id}).currentGoal;
        player.records.thisEternity.maxIP=Currency.infinityPoints.value;`)
      await click('.o-eternity-button')
      await check(`return EternityChallenge(${id}).completions`, completion + 1)
      await check('return player.challenge.eternity.current', 0)
      await parity(`EC${id} tier ${completion + 1}: exact original goal completes, refunds study and resets`)
      }
    }
  })

  await test('Research UI · EC4 crunch limit and EC12 game-time failure boundaries at every tier', async () => {
    for (const id of [4, 12]) {
      for (let completion = 0; completion < 5; completion++) {
        await prepare(`player.eternities=new Decimal(100); player.break=true;
          player.challenge.eternity.unlocked=${id}; player.eternityChalls.eterc${id}=${completion};`, 'challenges.eternity')
        await click('.c-challenge-box--eternity .o-challenge-btn:visible')
        await check('return player.challenge.eternity.current', id)
        if (id === 4) {
          // EC4 permits exactly the configured number; one actual crunch crosses the limit.
          await mutate(`Currency.infinities.value=new Decimal(EternityChallenge(4).config.restriction(${completion}));
            player.records.thisInfinity.time=120000; player.records.thisInfinity.realTime=120000;
            Currency.antimatter.value=Player.infinityLimit; player.records.thisInfinity.maxAM=Currency.antimatter.value;
            Tab.dimensions.antimatter.show(true);`)
          await check('return EternityChallenge(4).isWithinRestriction', true)
          await parity(`EC4 tier ${completion + 1}: exact allowed Infinity count`)
          await engine.locator('[data-action="crunch"]:visible, .o-prestige-button.o-infinity-button:not(.o-infinity-button--unavailable):visible').last().click({ timeout: 5000 })
          await reference.locator('.o-prestige-button.o-infinity-button:not(.o-infinity-button--unavailable):visible, .btn-big-crunch:visible, .o-big-crunch-btn:visible').last().click({ timeout: 5000 })
          await page.waitForTimeout(100)
        } else {
          // EC12 uses strict < in game seconds, not real seconds. Original gameLoop causes failure.
          await mutate(`player.records.thisEternity.time=EternityChallenge(12).config.restriction(${completion})*1000-0.001;`)
          await check('return EternityChallenge(12).isWithinRestriction', true)
          await parity(`EC12 tier ${completion + 1}: below game-time limit`)
          await mutate('gameLoop(2);')
        }
        await check('return player.challenge.eternity.current', 0)
        await check(`return EternityChallenge(${id}).completions`, completion)
        for (const frame of frames) assert.ok(await frame.locator('.c-modal-message__text').isVisible())
        await parity(`EC${id} tier ${completion + 1}: original failure resets, retains completions and opens message`)
        await click('.c-modal-message__okay-btn')
      }
    }
  })

  await test('Research UI · Every eternity milestone crosses its threshold through an actual Eternity', async () => {
    const milestones = await engine.evaluate(() => Object.entries(GameDatabase.eternity.milestones)
      .map(([key, value]) => ({ key, threshold: value.eternities })).sort((a, b) => a.threshold - b.threshold))
    for (const { key, threshold } of milestones) {
      await prepare(`player.eternities=new Decimal(${threshold - 1}); player.infinities=new Decimal(100); player.break=true;
        Currency.infinityPoints.value=new Decimal('1e310'); player.records.thisEternity.maxIP=new Decimal('1e310');
        player.records.thisEternity.time=120000; player.records.thisEternity.realTime=120000;`, 'eternity.milestones')
      await check(`return EternityMilestone.${key}.isReached`, false)
      await parity(`${key}: below ${threshold} Eternities`)
      await click('.o-eternity-button')
      await check('return player.eternities.toNumber()', threshold)
      await check(`return EternityMilestone.${key}.isReached`, true)
      await mutate('Tab.eternity.milestones.show(true);')
      const reached = milestones.filter(m => m.threshold <= threshold).length
      for (const frame of frames) assert.equal(await frame.locator('.o-eternity-milestone__reward--reached').count(), reached)
      await parity(`${key}: real Eternity crosses ${threshold}, UI and reset retention`)
    }
    await page.screenshot({ path: outputPath('research-milestones.png'), fullPage: true })
  })

  await test('Research UI · Dilation original study gates, confirmation, production and exit retention', async () => {
    await prepare(`player.eternities=new Decimal(100); player.timestudy.studies=[231];
      player.eternityChalls.eterc11=5; player.eternityChalls.eterc12=4;
      Currency.timeTheorems.value=new Decimal(12900);`, 'eternity.studies')
    await click('[class*="o-time-study-dilation--"]', 0)
    await check('return TimeStudy.dilation.isBought', false)
    await parity('dilation: EC12 fourth completion insufficient')
    await mutate('player.eternityChalls.eterc12=5; Currency.timeTheorems.value=new Decimal(10000);')
    await click('[class*="o-time-study-dilation--"]', 0)
    await check('return TimeStudy.dilation.isBought', false)
    await parity('dilation: total theorem prerequisite insufficient')
    await mutate('Currency.timeTheorems.value=new Decimal(12900);')
    await click('[class*="o-time-study-dilation--"]', 0)
    await check('return TimeStudy.dilation.isBought', true)
    await parity('dilation: prerequisite fulfilled and original 5000 TT spent')
    await mutate('player.options.confirmations.dilation=true; Tab.eternity.dilation.show(true);')
    await click('.o-dilation-btn')
    await check('return player.dilation.active', false)
    await click('.c-modal__confirm-btn')
    await check('return player.dilation.active', true)
    await parity('dilation: confirmed entry reset')
    // Eternity milestones retain unlocked Replicanti. Use its original deterministic
    // continuous-growth branch so unrelated low-count random replication cannot flake parity.
    await mutate('Currency.tachyonParticles.value=new Decimal(100); AntimatterDimension(1).amount=new Decimal(100); player.replicanti.amount=new Decimal(100); player.replicanti.chance=1; gameLoop(1000);')
    await check('return Currency.dilatedTime.value.gt(0)', true)
    await parity('dilation: stage tachyon fixture, production penalty and dilated time generation')
    await mutate('Tab.eternity.dilation.show(true);')
    await click('.o-dilation-btn')
    await check('return player.dilation.active', true)
    await click('.c-modal__confirm-btn')
    await check('return player.dilation.active', false)
    await parity('dilation: confirmed exit and retained study/tachyons/time')
    await page.screenshot({ path: outputPath('research-dilation.png'), fullPage: true })
  })
}
