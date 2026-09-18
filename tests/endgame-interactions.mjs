import assert from 'node:assert/strict'
import fs from 'node:fs'
import { outputPath } from './output.mjs'

// Resource/history fixtures are explicit. Clicks and timed subsystem transitions use upstream code.
export async function endgameInteractions({ page, engine, reference, reset, test }) {
  const frames = [engine, reference]
  const trace = []
  const mutate = async script => {
    for (const frame of frames) await frame.evaluate(script => {
      Function(script)()
      Lazy.invalidateAll()
      GameUI.update()
    }, script)
    await page.waitForTimeout(100)
  }
  const prepare = async () => {
    for (const frame of frames) await reset(frame)
    await mutate(`player.realities=100; Achievement(147).unlock();
      player.reality.imaginaryUpgradeBits |= 1<<25;
      Tab.celestials.pelle.show(true); Modal.hideAll(); ui.view.quotes.current=undefined;`)
    trace.push({ fixture: '100 realities, Achievement 147 and Imaginary Upgrade 25; no natural unlock claim' })
  }
  const read = frame => frame.evaluate(() => JSON.parse(JSON.stringify({
    pelle: player.celestials.pelle,
    pelleUpgrades: Array.from(player.celestials.pelle.upgrades).sort((a, b) => a - b),
    am: player.antimatter, ip: player.infinityPoints, ep: player.eternityPoints,
    replicanti: player.replicanti.amount, dt: player.dilation.dilatedTime,
    realities: player.realities, boosts: player.dimensionBoosts, galaxies: player.galaxies,
    studies: player.timestudy.studies, glyphs: player.reality.glyphs,
    alchemy: player.celestials.ra.alchemy,
    disabled: ['blackhole', 'alchemy', 'continuum', 'glyphs', 'antimatterDimAutobuyer1'].map(k => [k, Pelle.isDisabled(k)]),
    rifts: PelleRifts.all.map(r => ({ key: r.config.key, active: r.isActive, fill: r.totalFill,
      percentage: r.percentage, effect: r.effectValue, milestones: r.milestones.map(m => m.canBeApplied) })),
    generator: { gain: GalaxyGenerator.gainPerSecond, cap: GalaxyGenerator.generationCap,
      rift: GalaxyGenerator.capRift?.config.key ?? null, galaxies: GalaxyGenerator.galaxies },
  })))
  const parity = async label => {
    const actual = await read(engine)
    const expected = await read(reference)
    trace.push({ label, actual, expected })
    fs.writeFileSync(outputPath('endgame-operations.json'), JSON.stringify(trace, null, 2))
    assert.deepEqual(actual, expected, label)
  }
  const check = async (script, expected) => {
    for (const frame of frames) assert.deepEqual(await frame.evaluate(s => Function(s)(), script), expected)
  }
  const click = async (selector, index = 0) => {
    for (const frame of frames) await frame.locator(selector).nth(index).click({ timeout: 5000 })
    await mutate('ui.view.quotes.current=undefined;')
  }

  await test('Endgame UI · doom requirements, cancel and confirmed reset', async () => {
    await prepare()
    assert.equal(await engine.locator('.pelle-doom-button').count(), 0)
    trace.push({ fixture: 'All pre-Pelle achievements, base refinement history=25000 and all alchemy resources except one capped; threshold test only' })
    await mutate(`Achievements.prePelleRows.flat().forEach(a => a.unlock());
      AlchemyResources.all.filter(r => r.isBaseResource).forEach(r => r.highestRefinementValue=25000);
      AlchemyResources.all.forEach(r => r.amount=25000); AlchemyResources.all[0].amount=24999;
      ui.view.quotes.current=undefined;`)
    assert.equal(await engine.locator('.pelle-doom-button').count(), 0)
    await parity('Doom unavailable with one alchemy resource below cap')
    await mutate(`AlchemyResources.all[0].amount=25000; Currency.infinityPoints.value=new Decimal(12345);
      player.dimensionBoosts=7; player.galaxies=3; ui.view.quotes.current=undefined;`)
    const before = await read(engine)
    await click('.pelle-doom-button')
    await check('return Modal.armageddon.isOpen', true)
    await click('.l-modal-buttons button:not(.c-modal__confirm-btn)')
    assert.deepEqual(await read(engine), before)
    await parity('Doom cancel preserves resources, glyphs and alchemy')
    await click('.pelle-doom-button')
    await click('.c-modal__confirm-btn')
    await check('return [Pelle.isDoomed,player.dimensionBoosts,player.galaxies,Currency.infinityPoints.value.toString()]', [true, 0, 0, '0'])
    await check('return AlchemyResources.all.every(r => r.amount===0)', true)
    await check("return ['blackhole','alchemy','continuum'].every(k => Pelle.isDisabled(k))", true)
    await parity('Confirmed Doom resets lower layers, clears alchemy and disables mechanics')
    await mutate('Tab.celestials.pelle.show(true); Currency.realityShards.value=new Decimal(PelleUpgrade.antimatterDimAutobuyers1.cost-1);')
    // The singles panel follows the rebuyable panel; use its first actual purchase button.
    for (const frame of frames) {
      const panels = frame.locator('.c-pelle-upgrade-container')
      await panels.nth(1).locator('.c-pelle-upgrade').first().click({ timeout: 5000 })
    }
    await mutate('')
    await check("return Pelle.isDisabled('antimatterDimAutobuyer1')", true)
    await parity('Autobuyer restoration upgrade rejected one shard below cost')
    await mutate('Currency.realityShards.value=new Decimal(PelleUpgrade.antimatterDimAutobuyers1.cost);')
    for (const frame of frames) await frame.locator('.c-pelle-upgrade-container').nth(1).locator('.c-pelle-upgrade').first().click({ timeout: 5000 })
    await mutate('')
    await check("return [Pelle.isDisabled('antimatterDimAutobuyer1'),Currency.realityShards.value.toString()]", [false, '0'])
    await parity('Exact-cost upgrade restores first four autobuyers while other Doom restrictions remain')
    await page.screenshot({ path: outputPath('endgame-doom.png') })
  })

  await test('Endgame UI · five rift drains, simultaneous limit and milestone crossings', async () => {
    await prepare()
    trace.push({ fixture: 'Doomed state and all five strikes injected; strike achievement chain not covered' })
    await mutate('player.celestials.pelle.doomed=true; player.celestials.pelle.progressBits=62;')
    await click('.c-pelle-rift-bar', 0)
    await click('.c-pelle-rift-bar', 1)
    await click('.c-pelle-rift-bar', 2)
    await check('return PelleRifts.all.map(r => r.isActive)', [true, true, false, false, false])
    await parity('Third simultaneous drain is rejected')
    await click('.c-pelle-rift-bar', 0)
    await click('.c-pelle-rift-bar', 1)
    for (const [index, key] of ['vacuum', 'decay', 'chaos', 'recursion', 'paradox'].entries()) {
      const milestones = await engine.evaluate(key => PelleRifts[key].milestones.map(m => m.requirement), key)
      for (const [milestone, requirement] of milestones.entries()) {
        trace.push({ fixture: `${key} fill immediately below milestone ${milestone}; resources seeded to cross by original one-second drain` })
        await mutate(`PelleRifts.all.forEach(r => r.rift.active=false);
          PelleRifts.chaos.totalFill=0; PelleRifts.decay.rift.percentageSpent=0;
          PelleRifts.${key}.totalFill=PelleRifts.${key}.config.percentageToFill(${requirement}-0.00001);
          ${key === 'chaos'
            ? 'PelleRifts.decay.totalFill=PelleRifts.decay.config.percentageToFill(1);'
            : `PelleRifts.${key}.fillCurrency.value=PelleRifts.${key}.maxValue.times(100);`}`)
        await check(`return PelleRifts.${key}.milestones[${milestone}].canBeApplied`, false)
        await click('.c-pelle-rift-bar', index)
        await check(`return PelleRifts.${key}.isActive`, true)
        await mutate('Pelle.gameLoop(1000);')
        await check(`return PelleRifts.${key}.milestones[${milestone}].canBeApplied`, true)
        await parity(`${key} milestone ${milestone}: UI drain crosses threshold; currency, effects and milestone parity`)
        // A capped bar is intentionally no longer toggleable; the original next tick deactivates it.
        await mutate('Pelle.gameLoop(1);')
        if (await engine.evaluate(key => PelleRifts[key].isActive, key)) await click('.c-pelle-rift-bar', index)
        await check(`return PelleRifts.${key}.isActive`, false)
      }
    }
    await page.screenshot({ path: outputPath('endgame-rifts.png') })
  })

  await test('Endgame UI · generator unlock and five ordered sacrifices restore rifts', async () => {
    await prepare()
    trace.push({ fixture: 'Doomed/all strikes/full rifts/break Infinity injected; generator currency injected at each cap, never phase or sacrifice flag' })
    await mutate(`player.celestials.pelle.doomed=true; player.celestials.pelle.progressBits=62; player.break=true;
      PelleRifts.all.forEach(r => r.totalFill=r.config.percentageToFill(1));`)
    await check('return Pelle.hasGalaxyGenerator', false)
    await click('.c-generator-unlock-button')
    await check('return Pelle.hasGalaxyGenerator', true)
    await parity('Generator unlocked by real button at recursion milestone')
    for (const [index, key] of ['additive', 'multiplicative', 'antimatterMult', 'IPMult', 'EPMult'].entries()) {
      for (const [sufficient, fraction] of [[false, 0.5], [true, 1]]) {
        trace.push({ fixture: `${key} upgrade currency = ${fraction} times original cost` })
        await mutate(index < 2
          ? `player.celestials.pelle.galaxyGenerator.generatedGalaxies=GalaxyGenerator.spentGalaxies+GalaxyGeneratorUpgrades.${key}.cost*${fraction};`
          : `GalaxyGeneratorUpgrades.${key}.currency.value=Decimal.mul(GalaxyGeneratorUpgrades.${key}.cost,${fraction});`)
        await click('.c-pelle-upgrade--galaxyGenerator', index)
        await check(`return GalaxyGeneratorUpgrades.${key}.boughtAmount`, sufficient ? 1 : 0)
        await parity(`Generator ${key}: ${sufficient ? 'exact cost purchase and gain multiplier' : 'insufficient currency rejected'}`)
      }
    }
    const order = ['vacuum', 'paradox', 'decay', 'chaos', 'recursion']
    for (const [phase, key] of order.entries()) {
      await check('return [player.celestials.pelle.galaxyGenerator.phase,GalaxyGenerator.capRift.config.key]', [phase, key])
      await mutate('player.celestials.pelle.galaxyGenerator.generatedGalaxies=GalaxyGenerator.generationCap-1;')
      await click('.c-increase-cap')
      await check('return GalaxyGenerator.sacrificeActive', false)
      await parity(`Phase ${phase}: sacrifice rejected below ${key} cap`)
      await mutate('player.celestials.pelle.galaxyGenerator.generatedGalaxies=GalaxyGenerator.generationCap;')
      await click('.c-increase-cap')
      await check('return GalaxyGenerator.sacrificeActive', true)
      await mutate('GalaxyGenerator.loop(16000); ui.view.quotes.current=undefined;')
      await check('return player.celestials.pelle.galaxyGenerator.phase', phase)
      await parity(`Phase ${phase}: ${key} partially drained; milestone removal parity`)
      await mutate('GalaxyGenerator.loop(18000); ui.view.quotes.current=undefined;')
      await check('return [player.celestials.pelle.galaxyGenerator.phase,GalaxyGenerator.sacrificeActive]', [phase + 1, false])
      await parity(`Phase ${phase}: ${key} depleted, next cap reached in original order`)
    }
    await mutate('GalaxyGenerator.loop(70000); ui.view.quotes.current=undefined;')
    await check('return PelleRifts.all.map(r => r.reducedTo)', [2, 2, 2, 2, 2])
    await check('return GalaxyGenerator.generationCap===Infinity', true)
    await parity('All five sacrifices completed; uncapped generator restores all rifts to 200%')
    await check('return player.isGameEnd', false)
    trace.push({ limitation: 'Ending antimatter production/credits trigger not tested; generator loop calls simulate elapsed time, not wall-clock play' })
    fs.writeFileSync(outputPath('endgame-operations.json'), JSON.stringify(trace, null, 2))
    await page.screenshot({ path: outputPath('endgame-generator.png') })
  })
}
