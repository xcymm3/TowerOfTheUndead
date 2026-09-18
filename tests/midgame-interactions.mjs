import assert from 'node:assert/strict'
import fs from 'node:fs'
import { outputPath } from './output.mjs'

// Resource/progression fixtures skip waiting, never replace purchase handlers or gates.
// Both isolated engines receive the same fixture and real browser clicks.
export async function midgameInteractions({ page, engine, reference, reset, test }) {
  const frames = [engine, reference]
  const trace = []
  const mutate = async script => {
    for (const frame of frames) await frame.evaluate(script => {
      Function(script)()
      Lazy.invalidateAll()
      GameUI.update()
    }, script)
    await page.waitForTimeout(80)
  }
  const prepare = async (fixture, tab) => {
    for (const frame of frames) await reset(frame)
    trace.push({ fixture, source: 'forced resource/progression fixture; not natural progression', tab })
    await mutate(`${fixture}; Tab.${tab}.show(true);`)
  }
  const read = frame => frame.evaluate(() => {
    const normalize = value => JSON.parse(JSON.stringify(value, (_key, v) => v instanceof Set ? [...v].sort() : v))
    return normalize({
      ip: player.infinityPoints, ep: player.eternityPoints, am: player.antimatter,
      infinities: player.infinities, eternities: player.eternities, break: player.break,
      upgrades: player.infinityUpgrades, dimensions: player.dimensions,
      replicanti: player.replicanti, auto: player.auto,
      studies: player.timestudy, dilation: player.dilation,
      challenges: player.challenge, infinityPower: player.infinityPower, timeShards: player.timeShards,
      multipliers: [AntimatterDimensions.all.map(d => d.multiplier),
        InfinityDimensions.all.map(d => d.multiplier), TimeDimensions.all.map(d => d.multiplier)],
    })
  })
  const parity = async label => {
    const actual = await read(engine)
    const expected = await read(reference)
    trace.push({ label, actual, expected })
    fs.writeFileSync(outputPath('midgame-operations.json'), JSON.stringify(trace, null, 2))
    assert.deepEqual(actual, expected, label)
  }
  const click = async (selector, index = 0) => {
    for (const frame of frames) await frame.locator(selector).nth(index).click({ timeout: 5000 })
    await page.waitForTimeout(80)
  }
  const check = async (script, expected) => {
    for (const frame of frames) assert.deepEqual(await frame.evaluate(script => Function(script)(), script), expected)
  }
  const infinity = 'player.infinities=new Decimal(1);'

  await test('Midgame UI · Soul contracts reject missing prerequisite/funds and buy at exact cost', async () => {
    await prepare(infinity, 'infinity.upgrades')
    await engine.locator('.tower-utility button').filter({ hasText: '魂界' }).click()
    await engine.locator('.tower-subtabs button').first().click()
    const button = '.l-infinity-upgrade-grid__cell'
    await mutate('Currency.infinityPoints.value=new Decimal(100);')
    await click(button, 1)
    await check('return InfinityUpgrade.dim18mult.isBought', false)
    await mutate('Currency.infinityPoints.value=new Decimal(0);')
    await click(button, 0)
    await check('return player.infinityUpgrades.size', 0)
    await parity('contracts: blocked prerequisite and insufficient currency')
    await mutate('Currency.infinityPoints.value=new Decimal(InfinityUpgrade.totalTimeMult.cost);')
    await click(button, 0)
    await check('return InfinityUpgrade.totalTimeMult.isBought', true)
    await parity('contracts: exact first cost')
    await mutate('Currency.infinityPoints.value=new Decimal(InfinityUpgrade.dim18mult.cost);')
    await click(button, 1)
    await check('return InfinityUpgrade.dim18mult.isBought', true)
    await parity('contracts: prerequisite acquired and exact second cost')
    const ids = ['totalTimeMult', 'dim18mult', 'dim36mult', 'resetBoost',
      'buy10Mult', 'dim27mult', 'dim45mult', 'galaxyBoost',
      'thisInfinityTimeMult', 'unspentIPMult', 'dimboostMult', 'ipGen',
      'skipReset1', 'skipReset2', 'skipReset3', 'skipResetGalaxy']
    for (let index = 2; index < ids.length; index++) {
      const id = ids[index]
      await mutate(`Currency.infinityPoints.value=new Decimal(InfinityUpgrade.${id}.cost).minus(1);`)
      await click(button, index)
      await check(`return InfinityUpgrade.${id}.isBought`, false)
      await mutate(`Currency.infinityPoints.value=new Decimal(InfinityUpgrade.${id}.cost);`)
      await click(button, index)
      await check(`return InfinityUpgrade.${id}.isBought`, true)
      await parity(`contract ${id}: below and exact cost, original effect`)
    }
  })

  await test('Midgame UI · Break gate requires max crunch interval and modal confirmation', async () => {
    await prepare(infinity + 'NormalChallenge(12).complete(); player.auto.bigCrunch.interval=101;', 'infinity.break')
    const button = '.c-game-tab .o-infinity-upgrade-btn'
    await click(button)
    await check('return player.break', false)
    await mutate('player.auto.bigCrunch.interval=100;')
    await click(button)
    await check('return player.break', false)
    await click('.c-modal__confirm-btn')
    await check('return player.break', true)
    await parity('break: confirmed at 100ms gate, original autobuyer rewards')
  })

  await test('Midgame UI · Eight council tiers unlock and buy with exact original thresholds', async () => {
    await prepare(infinity + 'player.break=true;', 'dimensions.antimatter')
    assert.equal(await engine.locator('.tower-tabs button').filter({ hasText: '议会' }).isDisabled(), true)
    for (let tier = 1; tier <= 8; tier++) {
      await mutate(`player.records.thisEternity.maxAM=InfinityDimension(${tier}).amRequirement.times(0.999999); Currency.infinityPoints.value=InfinityDimension(${tier}).cost;`)
      const unlock = '.l-game-header__eternity .o-infinity-button'
      await click(unlock)
      await check(`return InfinityDimension(${tier}).isUnlocked`, false)
      await parity(`council ${tier}: below AM threshold`)
      await mutate(`player.records.thisEternity.maxAM=InfinityDimension(${tier}).amRequirement;`)
      if (tier === 1) {
        await mutate('Currency.infinityPoints.value=new Decimal(InfinityDimension(1).ipRequirement).minus(1);')
        await click(unlock)
        await check('return InfinityDimension(1).isUnlocked', false)
        await parity('council 1: AM satisfied, below IP unlock threshold')
        await mutate('Currency.infinityPoints.value=new Decimal(InfinityDimension(1).ipRequirement);')
      }
      await click(unlock)
      await check(`return InfinityDimension(${tier}).isUnlocked`, true)
      if (tier === 1) await engine.locator('.tower-tabs button').filter({ hasText: '议会' }).click()
      await mutate(`Currency.infinityPoints.value=InfinityDimension(${tier}).cost.times(0.999999);`)
      await click('.o-primary-btn--buy-id', tier - 1)
      await check(`return InfinityDimension(${tier}).baseAmount`, 0)
      await mutate(`Currency.infinityPoints.value=InfinityDimension(${tier}).cost;`)
      await click('.o-primary-btn--buy-id', tier - 1)
      await check(`return InfinityDimension(${tier}).baseAmount`, 10)
      await parity(`council ${tier}: unlocked and exact purchase, cost/amount retained`)
    }
    await page.screenshot({ path: outputPath('midgame-council.png'), fullPage: true })
  })

  await test('Midgame UI · Plague seed unlock plus all three upgrade currency boundaries', async () => {
    await prepare(infinity + 'player.break=true; Currency.infinityPoints.value=new Decimal("9.99999e139");', 'infinity.replicanti')
    await click('.o-primary-btn--replicanti-unlock')
    await check('return Replicanti.areUnlocked', false)
    await mutate('Currency.infinityPoints.value=new Decimal("1e140");')
    await click('.o-primary-btn--replicanti-unlock')
    await check('return Replicanti.areUnlocked', true)
    await parity('replicanti: exact unlock threshold')
    for (const [index, name] of ['chance', 'interval', 'galaxies'].entries()) {
      await mutate(`Currency.infinityPoints.value=ReplicantiUpgrade.${name}.cost.times(0.999999);`)
      const before = await engine.evaluate(name => ReplicantiUpgrade[name].value, name)
      await click('.o-primary-btn--replicanti-upgrade', index)
      await check(`return ReplicantiUpgrade.${name}.value`, before)
      await parity(`replicanti ${name}: below cost`)
      await mutate(`Currency.infinityPoints.value=ReplicantiUpgrade.${name}.cost;`)
      await click('.o-primary-btn--replicanti-upgrade', index)
      assert.notDeepEqual(await engine.evaluate(name => ReplicantiUpgrade[name].value, name), before)
      await parity(`replicanti ${name}: exact cost`)
    }
  })

  await test('Midgame UI · Duty autobuyer unlock, interval, mode and activation use original controls', async () => {
    await prepare('player.records.totalAntimatter=new Decimal("1e40"); player.records.thisEternity.maxAM=new Decimal("9.999e39");', 'automation.autobuyers')
    await engine.locator('.tower-utility button').filter({ hasText: '执役' }).click()
    await click('.c-autobuyer-buy-box', 1)
    await check('return Autobuyer.antimatterDimension(1).isUnlocked', false)
    await mutate('player.records.thisEternity.maxAM=new Decimal("1e40");')
    await click('.c-autobuyer-buy-box', 1)
    await check('return Autobuyer.antimatterDimension(1).isUnlocked', true)
    await parity('autobuyer: slow version exact unlock')
    await mutate('NormalChallenge(1).complete(); Currency.infinityPoints.value=new Decimal(0);')
    const interval = '.c-autobuyer-box-row__intervalSlot .l-autobuyer-box__button'
    await click(interval)
    await parity('autobuyer: insufficient interval currency')
    await mutate('Currency.infinityPoints.value=new Decimal(Autobuyer.antimatterDimension(1).cost);')
    await click(interval)
    await parity('autobuyer: exact interval upgrade')
    await click('.c-autobuyer-box-row__toggleSlot .o-autobuyer-btn')
    await click('.l-autobuyers-tab .c-subtab-option-container button')
    await check('return player.auto.autobuyersOn', true)
    await parity('autobuyer: mode and global activation')
  })

  await test('Midgame UI · Four early altars reject insufficient EP and buy at exact cost', async () => {
    await prepare('player.eternities=new Decimal(1);', 'dimensions.time')
    await engine.locator('.tower-tabs button').filter({ hasText: '祭坛' }).click()
    for (let tier = 1; tier <= 4; tier++) {
      await mutate(`Currency.eternityPoints.value=TimeDimension(${tier}).cost.times(0.999999);`)
      await click('.o-primary-btn--buy-td', tier - 1)
      await check(`return TimeDimension(${tier}).bought`, 0)
      await mutate(`Currency.eternityPoints.value=TimeDimension(${tier}).cost;`)
      await click('.o-primary-btn--buy-td', tier - 1)
      await check(`return TimeDimension(${tier}).bought`, 1)
      await parity(`altar ${tier}: exact cost and multiplier`)
    }
    await page.screenshot({ path: outputPath('midgame-altars.png'), fullPage: true })
  })

  await test('Midgame UI · Late altars require prior study and exact theorem unlock then EP purchase', async () => {
    await prepare('player.eternities=new Decimal(1); player.dilation.studies=[1];', 'dimensions.time')
    for (let tier = 5; tier <= 8; tier++) {
      await mutate(`Currency.timeTheorems.value=new Decimal(TimeStudy.timeDimension(${tier}).cost-1);`)
      assert.equal(await engine.locator('.o-primary-btn--buy-td').nth(tier - 1).isVisible(), false)
      await check(`return TimeDimension(${tier}).isUnlocked`, false)
      await mutate(`Currency.timeTheorems.value=new Decimal(TimeStudy.timeDimension(${tier}).cost);`)
      await click('.o-primary-btn--buy-td', tier - 1)
      await check(`return TimeDimension(${tier}).isUnlocked`, true)
      await parity(`altar ${tier}: study prerequisite and exact TT unlock`)
      await mutate(`Currency.eternityPoints.value=TimeDimension(${tier}).cost.times(0.999999);`)
      await click('.o-primary-btn--buy-td', tier - 1)
      await check(`return TimeDimension(${tier}).bought`, 0)
      await mutate(`Currency.eternityPoints.value=TimeDimension(${tier}).cost;`)
      await click('.o-primary-btn--buy-td', tier - 1)
      await check(`return TimeDimension(${tier}).bought`, 1)
      await parity(`altar ${tier}: exact EP purchase`)
    }
  })

  await test('Midgame UI · Eternity resets contracts, council, plague and automation at retention milestones', async () => {
    // Stage fixture initializes bought systems; the reset itself is always a real click.
    for (const eternities of [0, 1, 2, 3, 19, 20]) {
      await prepare(`player.infinities=new Decimal(10); player.eternities=new Decimal(${eternities});
        player.break=true; Currency.infinityPoints.value=new Decimal('1e310');
        player.records.thisEternity.maxIP=new Decimal('1e310');
        player.records.thisEternity.time=120000; player.records.thisEternity.realTime=120000;
        player.infinityUpgrades.add('totalTimeMult'); player.infinityUpgrades.add('postGalaxy');
        for (const d of InfinityDimensions.all) { d.isUnlocked=true; d.amount=new Decimal(20); d.baseAmount=20; }
        player.replicanti.unl=true; player.replicanti.amount=new Decimal(100); player.replicanti.chance=0.1;
        player.auto.antimatterDims.all[0].isBought=true; player.auto.antimatterDims.all[0].interval=100;
        player.auto.bigCrunch.interval=100; TimeDimension(1).amount=new Decimal(10); TimeDimension(1).bought=10;
        player.options.confirmations.eternity=true;`, 'dimensions.time')
      // First Eternity's time tab is normally locked; the common header remains reachable.
      await click('.o-eternity-button')
      await check('return player.eternities.toNumber()', eternities)
      for (const frame of frames) await frame.locator('.c-modal__confirm-btn').click()
      await page.waitForTimeout(100)
      await check('return player.eternities.toNumber()', eternities + 1)
      await parity(`eternity ${eternities} -> ${eternities + 1}: all midgame retained/reset fields`)
    }
  })
}
