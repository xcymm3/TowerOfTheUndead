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
  const prepareDoomed = async () => {
    await prepare()
    await mutate(`Achievements.prePelleRows.flat().forEach(a => a.unlock());
      AlchemyResources.all.filter(r => r.isBaseResource).forEach(r => r.highestRefinementValue=25000);
      AlchemyResources.all.forEach(r => r.amount=25000); ui.view.quotes.current=undefined;`)
    await click('.pelle-doom-button')
    await click('.c-modal__confirm-btn')
    await check('return Pelle.isDoomed', true)
  }
  const triggerAllStrikes = async () => {
    trace.push({ fixture: 'Strike prerequisites are seeded as resources/history only; every strike is emitted by its original gameplay operation' })
    await mutate(`Currency.antimatter.value=new Decimal('1e309');
      player.records.thisInfinity.maxAM=new Decimal('1e309'); bigCrunchReset(false); ui.view.quotes.current=undefined;`)
    await check('return PelleStrikes.all.map(s => s.hasStrike)', [true, false, false, false, false])
    await parity('First strike triggered by an actual Infinity reset')
    await mutate(`player.break=true; Currency.infinityPoints.value=new Decimal(BreakInfinityUpgrade.galaxyBoost.cost);
      BreakInfinityUpgrade.galaxyBoost.purchase(); ui.view.quotes.current=undefined;`)
    await check('return PelleStrikes.all.map(s => s.hasStrike)', [true, true, false, false, false])
    await parity('Second strike triggered by purchasing the Galaxy power-up')
    await mutate(`Currency.infinityPoints.value=new Decimal('1e400');
      player.records.thisEternity.maxIP=new Decimal('1e400'); eternity(false,false); ui.view.quotes.current=undefined;`)
    await check('return PelleStrikes.all.map(s => s.hasStrike)', [true, true, true, false, false])
    await parity('Third strike triggered by an actual Eternity reset')
    await mutate(`player.eternities=new Decimal(1); player.timestudy.epBought=114;
      Currency.eternityPoints.value=new Decimal('1e100'); TimeTheorems.buyOne(false,'ep'); ui.view.quotes.current=undefined;`)
    await check('return [TimeTheorems.totalPurchased(),...PelleStrikes.all.map(s => s.hasStrike)]', [115, true, true, true, true, false])
    await parity('Fourth strike triggered by purchasing the 115th Time Theorem')
    await mutate(`player.dilation.studies=[1]; player.celestials.pelle.remnants=Pelle.remnantRequirementForDilation;
      startDilatedEternity(); ui.view.quotes.current=undefined;`)
    await check('return [player.dilation.active,...PelleStrikes.all.map(s => s.hasStrike)]', [true, true, true, true, true, true])
    await parity('Fifth strike triggered by entering Time Dilation')
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
    for (const key of ['antimatterDimensionMult', 'timeSpeedMult', 'glyphLevels', 'infConversion', 'galaxyPower']) {
      await mutate(`Currency.realityShards.value=new Decimal(0);`)
      const index = await engine.evaluate(key => PelleUpgrade.rebuyables.findIndex(u => u.config.id === key), key)
      for (const frame of frames) await frame.locator('.c-pelle-upgrade-container').first().locator('.c-pelle-upgrade').nth(index).click()
      await mutate('')
      await check(`return PelleUpgrade.${key}.boughtAmount`, 0)
      await mutate(`Currency.realityShards.value=new Decimal(PelleUpgrade.${key}.cost);`)
      for (const frame of frames) await frame.locator('.c-pelle-upgrade-container').first().locator('.c-pelle-upgrade').nth(index).click()
      await mutate('')
      await check(`return PelleUpgrade.${key}.boughtAmount`, 1)
      await mutate(`while(!PelleUpgrade.${key}.isCapped){Currency.realityShards.value=new Decimal(PelleUpgrade.${key}.cost);PelleUpgrade.${key}.purchase();}
        Currency.realityShards.value=new Decimal('1e100000'); PelleUpgrade.${key}.purchase();`)
      await check(`return [PelleUpgrade.${key}.boughtAmount,PelleUpgrade.${key}.config.cap,PelleUpgrade.${key}.isCapped]`,
        await engine.evaluate(key => [PelleUpgrade[key].config.cap, PelleUpgrade[key].config.cap, true], key))
      await parity(`Finite rebuyable ${key}: below-cost rejection, exact-cost purchase and cap boundary`)
    }
    // The first single was purchased above. Each successful click removes the current card, exposing the next one.
    while (await engine.evaluate(() => PelleUpgrade.singles.some(u => !u.isBought))) {
      const next = await engine.evaluate(() => {
        const u = PelleUpgrade.singles.find(x => !x.isBought)
        return { id: u.id, cost: u.cost }
      })
      await mutate(`Currency.realityShards.value=new Decimal(0);`)
      for (const frame of frames) await frame.locator('.c-pelle-upgrade-container').nth(1).locator('.c-pelle-upgrade').first().click()
      await mutate('')
      await check(`return PelleUpgrade.singles.find(u=>u.id===${next.id}).isBought`, false)
      await mutate(`Currency.realityShards.value=new Decimal(${next.cost});`)
      for (const frame of frames) await frame.locator('.c-pelle-upgrade-container').nth(1).locator('.c-pelle-upgrade').first().click()
      await mutate('')
      await check(`return PelleUpgrade.singles.find(u=>u.id===${next.id}).isBought`, true)
    }
    await check('return PelleUpgrade.singles.length', 23)
    await parity('All 23 single-purchase upgrades bought through the visible upgrade sequence')
    await mutate(`player.infinityUpgrades.add('timeMult'); player.eternityUpgrades.add(1);
      player.eternities=new Decimal(123); player.timestudy.studies=[11]; player.dilation.upgrades.add(4);
      Currency.tachyonParticles.value=new Decimal(99); Pelle.cel.records.totalAntimatter=new Decimal('1e180000');
      Pelle.cel.records.totalInfinityPoints=new Decimal('1e60000'); Pelle.cel.records.totalEternityPoints=new Decimal('1e1050');`)
    await click('.c-armageddon-button')
    await check(`return [player.infinityUpgrades.has('timeMult'),player.eternityUpgrades.has(1),player.eternities.toString(),
      player.timestudy.studies.includes(11),player.dilation.upgrades.has(4),Currency.tachyonParticles.value.toString(),
      PelleUpgrade.singles.every(u=>u.isBought)]`, [true, true, '123', true, true, '99', true])
    await parity('Armageddon preserves every purchased Pelle upgrade and the explicitly restored systems')
    await page.screenshot({ path: outputPath('endgame-doom.png') })
  })

  await test('Endgame UI · five rift drains, simultaneous limit and milestone crossings', async () => {
    await prepareDoomed()
    await triggerAllStrikes()
    await check('return document.querySelectorAll(".c-pelle-single-bar").length', 5)
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
    const riftText = await engine.locator('.l-pelle-celestial-tab').innerText()
    for (const name of ['空冢裂隙', '腐朽裂隙', '乱葬裂隙', '归骨裂隙', '逆命裂隙']) assert.match(riftText, new RegExp(name))
    assert.doesNotMatch(riftText, /EP formula|All Dimensions|Infinity Power Conversion|Current Amount|Total Filled|Drains/)
    await page.screenshot({ path: outputPath('endgame-rifts.png') })
  })

  await test('Endgame UI · generator unlock and five ordered sacrifices restore rifts', async () => {
    await prepareDoomed()
    await triggerAllStrikes()
    trace.push({ fixture: 'Full rift resources and generator currencies are seeded; phase, sacrifice, glyph return and ending flags are never assigned' })
    await mutate(`player.break=true;
      PelleRifts.all.forEach(r => {r.totalFill=r.config.percentageToFill(1);r.checkMilestoneStates();});
      Glyphs.refreshActive();`)
    await check('return Pelle.hasGalaxyGenerator', false)
    await click('.c-generator-unlock-button')
    await check('return Pelle.hasGalaxyGenerator', true)
    await parity('Generator unlocked by real button at recursion milestone')
    await mutate(`const glyph=Glyphs.inventory.find(g=>g && ['power','infinity','time','replication','dilation'].includes(g.type));
      Glyphs.equip(glyph,0);`)
    await check('return [Glyphs.activeSlotCount,Glyphs.active.filter(Boolean).length,Pelle.isDisabled("glyphs")]', [1, 1, false])
    await parity('Vacuum milestone restores one slot and a Doomed glyph can be equipped')
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
      if (phase === 0) {
        await check('return [Glyphs.activeSlotCount,Glyphs.active.filter(Boolean).length,Pelle.isDisabled("glyphs")]', [0, 0, true])
        await parity('First sacrifice removes the Vacuum milestone and force-unequips the active Glyph')
      }
      await parity(`Phase ${phase}: ${key} depleted, next cap reached in original order`)
    }
    await mutate('GalaxyGenerator.loop(70000); ui.view.quotes.current=undefined;')
    await check('return PelleRifts.all.map(r => r.reducedTo)', [2, 2, 2, 2, 2])
    await check('return GalaxyGenerator.generationCap===Infinity', true)
    await check('return [Glyphs.activeSlotCount,GalaxyGenerator.hasReturnedGlyphSlot,Pelle.isDisabled("glyphs")]', [1, true, false])
    await mutate(`const glyph=Glyphs.inventory.find(g=>g && ['power','infinity','time','replication','dilation'].includes(g.type));
      Glyphs.equip(glyph,0);`)
    await check('return Glyphs.active.filter(Boolean).length', 1)
    await parity('All five sacrifices completed; uncapped generator restores all rifts to 200%')
    await check('return player.isGameEnd', false)
    await mutate(`HTMLMediaElement.prototype.play=()=>Promise.resolve();
      Pelle.cel.records.totalAntimatter=new Decimal('1e1000000000000000');
      player.antimatter=new Decimal(100); AntimatterDimension(1).amount=Decimal.pow10(1e24);
      for(let i=0;i<20 && !player.isGameEnd;i++) gameLoop(50); ui.view.quotes.current=undefined;`)
    await check('return [player.isGameEnd,GameEnd.endState>=END_STATE_MARKERS.GAME_END]', [true, true])
    await parity('Actual Antimatter Dimension production crosses the original ending threshold')
    await mutate(`for(let i=0;i<150;i++) GameEnd.gameLoop(2000); GameUI.update();`)
    await page.waitForTimeout(250)
    for (const frame of frames) await frame.evaluate(() => GameIntervals.stop())
    await check('return GameEnd.endState>END_STATE_MARKERS.SPECTATE_GAME', true)
    for (const frame of frames) {
      assert.equal(await frame.locator('.c-credits-container').isVisible(), true)
      assert.equal(await frame.locator('.c-new-game-container').isVisible(), true)
      assert.equal(await frame.locator('.c-new-game-button').first().isVisible(), true)
    }
    assert.doesNotMatch(await engine.locator('.c-new-game-container').innerText(), /Start over|Reset the entire game|Choose Cosmetic Set/)
    for (const width of [320, 375, 414, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 })
      await page.waitForTimeout(80)
      assert.equal(await engine.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true,
        `Endgame overflow at ${width}`)
      const box = await engine.locator('.c-new-game-container').boundingBox()
      assert.ok(box && box.x >= -1 && box.x + box.width <= await engine.evaluate(() => innerWidth) + 1,
        `New game panel clipped at ${width}`)
      await page.screenshot({ path: outputPath(`endgame-ending-${width}.png`) })
    }
    await page.setViewportSize({ width: 1440, height: 1000 })
    for (const frame of frames) await frame.locator('.c-swap-button').evaluate(element => element.click())
    await check('return [GameEnd.creditsClosed,GameEnd.creditsEverClosed]', [true, true])
    for (const frame of frames) await frame.locator('.c-swap-button').evaluate(element => element.click())
    await check('return GameEnd.creditsClosed', false)
    trace.push({ label: 'Credits can be closed for spectating and reopened from the top-right control',
      actual: [false, true], expected: [false, true] })
    await mutate(`const cosmeticId=GlyphAppearanceHandler.lockedSets[0];
      GlyphAppearanceHandler.chosenFromModal=GameDatabase.reality.glyphCosmeticSets[cosmeticId];`)
    for (const frame of frames) await frame.locator('.c-new-game-button').first().evaluate(element => element.click())
    await page.waitForTimeout(250)
    await check('return [player.isGameEnd,Pelle.isDoomed,player.records.fullGameCompletions,GameEnd.removeAdditionalEnd]',
      [false, false, 1, true])
    await parity('New game entry performs the original carryover reset after the real ending')
    fs.writeFileSync(outputPath('endgame-operations.json'), JSON.stringify(trace, null, 2))
    await page.screenshot({ path: outputPath('endgame-generator.png') })
  })
}
