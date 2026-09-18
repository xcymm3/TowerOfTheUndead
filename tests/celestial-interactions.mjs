import assert from 'node:assert/strict'
import fs from 'node:fs'
import { outputPath } from './output.mjs'

// Stage fixtures bypass long resource accumulation, never the tested purchase or run entry.
export async function celestialInteractions({ page, engine, reference, reset, test }) {
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
  const prepare = async tab => {
    for (const frame of frames) await reset(frame)
    trace.push({ fixture: 'realities=5 and Achievement 147; accumulated resources/unlocks explicitly seeded below', tab })
    await mutate(`player.realities=5; Achievement(147).unlock();
      player.options.retryCelestial=false; player.options.confirmations.exitChallenge=true;
      Tab.celestials.${tab}.show(true); Modal.hideAll(); ui.view.quotes.current=undefined;`)
  }
  const read = frame => frame.evaluate(() => JSON.parse(JSON.stringify({
    teresa: player.celestials.teresa, effarig: player.celestials.effarig,
    laitela: player.celestials.laitela,
    rm: Currency.realityMachines.value, pp: Currency.perkPoints.value,
    realities: player.realities, am: player.antimatter, ip: player.infinityPoints,
    ep: player.eternityPoints, boosts: player.dimensionBoosts, galaxies: player.galaxies,
    infinityUpgrades: Array.from(player.infinityUpgrades).sort(),
    eternityUpgrades: Array.from(player.eternityUpgrades).sort(),
    studies: player.timestudy.studies, dilation: player.dilation.studies,
    glyphs: player.reality.glyphs, seed: player.reality.seed,
    activeRuns: Object.fromEntries(Object.entries(player.celestials).map(([key, value]) => [key, value.run ?? null])),
    effects: { teresaRM: Teresa.rmMultiplier, teresaReward: Teresa.runRewardMultiplier,
      effarigStage: Effarig.currentStage, glyphCap: Effarig.glyphLevelCap,
      effarigMult: Effarig.multiplier(new Decimal('1e100')),
      dimension: AntimatterDimension(1).multiplier, tickspeed: Tickspeed.current,
      darkDimensions: [1, 2, 3, 4].map(t => { const d = DarkMatterDimension(t);
        return [d.isUnlocked, d.interval, d.powerDM, d.powerDE, d.intervalCost, d.powerDMCost, d.powerDECost] }),
      singularityCap: Singularity.cap, singularityGain: Singularity.singularitiesGained,
      singularityMilestones: SingularityMilestones.all.map(m => [m.id, m.isUnlocked, m.completions]),
      shop: [PerkShopUpgrade.glyphLevel.effectValue, PerkShopUpgrade.rmMult.effectValue,
        PerkShopUpgrade.bulkDilation.effectValue, PerkShopUpgrade.autoSpeed.effectValue] },
  })))
  const parity = async label => {
    const actual = await read(engine)
    const expected = await read(reference)
    trace.push({ label, actual, expected })
    fs.writeFileSync(outputPath('celestial-operations.json'), JSON.stringify(trace, null, 2))
    assert.deepEqual(actual, expected, label)
  }
  const check = async (script, expected) => {
    for (const frame of frames) assert.deepEqual(await frame.evaluate(s => Function(s)(), script), expected)
  }
  const click = async (selector, index = 0) => {
    for (const frame of frames) await frame.locator(selector).nth(index).click({ timeout: 5000 })
    await mutate('')
  }
  const dismissQuotes = () => mutate('ui.view.quotes.current=undefined;')
  const cancel = '.l-modal-buttons button:not(.c-modal__confirm-btn)'

  const runEntryAndExit = async (key, selector) => {
    await mutate(`Tab.celestials.${key}.show(true); Currency.antimatter.value=new Decimal('1e100');
      Currency.infinityPoints.value=new Decimal(12345); player.dimensionBoosts=7; player.galaxies=3;
      ui.view.quotes.current=undefined;`)
    await parity(`${key}: before entering, stage resources and persistent unlocks`)
    const before = await read(engine)
    await click(selector)
    await check('return Modal.celestials.isOpen', true)
    await click(cancel)
    assert.deepEqual(await read(engine), before, 'Cancel must preserve all recorded state')
    await check(`return player.celestials.${key}.run`, false)
    await parity(`${key}: cancelled entry preserves state`)
    await click(selector)
    await click('.c-modal__confirm-btn')
    await dismissQuotes()
    await check(`return player.celestials.${key}.run`, true)
    await check('return [player.dimensionBoosts, player.galaxies, player.realities]', [0, 0, 5])
    await parity(`${key}: confirmed entry resets lower layers without rewards and applies run rules`)
    await mutate('Tab.reality.glyphs.show(true); ui.view.quotes.current=undefined;')
    await click('.c-reset-reality-button')
    await check('return Modal.exitChallenge.isOpen', true)
    await click(cancel)
    await check(`return player.celestials.${key}.run`, true)
    await parity(`${key}: cancelled exit retains run`)
    await click('.c-reset-reality-button')
    await click('.c-modal__confirm-btn')
    await dismissQuotes()
    await check(`return player.celestials.${key}.run`, false)
    await check('return player.realities', 5)
    await parity(`${key}: confirmed early exit clears run without completion reward`)
  }

  await test('Celestial UI · Teresa shop purchase boundaries, effects and run entry/exit', async () => {
    await prepare('teresa')
    assert.equal(await engine.locator('.c-teresa-run-button__icon').count(), 0)
    assert.equal(await engine.locator('.c-teresa-shop').count(), 0)
    trace.push({ fixture: 'pouredAmount=1e21 then original threshold check; pour accumulation itself is not tested' })
    await mutate('Teresa.pouredAmount=1e21; Teresa.checkForUnlocks(); ui.view.quotes.current=undefined;')
    await check('return [TeresaUnlocks.run.isUnlocked,TeresaUnlocks.shop.isUnlocked,TeresaUnlocks.effarig.isUnlocked]', [true, true, false])
    for (const [index, key] of ['glyphLevel', 'rmMult', 'bulkDilation', 'autoSpeed'].entries()) {
      await mutate(`Currency.perkPoints.value=PerkShopUpgrade.${key}.cost-1;`)
      await click('.c-teresa-shop .o-teresa-shop-button', index)
      await check(`return PerkShopUpgrade.${key}.boughtAmount`, 0)
      await parity(`Teresa ${key}: insufficient cost rejects purchase`)
      await mutate(`Currency.perkPoints.value=PerkShopUpgrade.${key}.cost;`)
      await click('.c-teresa-shop .o-teresa-shop-button', index)
      await check(`return [PerkShopUpgrade.${key}.boughtAmount,Currency.perkPoints.value]`, [1, 0])
      await parity(`Teresa ${key}: exact cost purchase, effects and next price`)
    }
    for (const width of [320, 375, 414, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 })
      await page.waitForTimeout(150)
      for (const selector of ['.c-teresa-run-button__icon', '.c-teresa-pour', '.c-teresa-shop .o-teresa-shop-button']) {
        const controls = engine.locator(selector)
        for (const control of await controls.all()) {
          await control.scrollIntoViewIfNeeded()
          assert.ok(await control.evaluate(el => {
            const r = el.getBoundingClientRect()
            const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
            return r.left >= 0 && r.right <= innerWidth && (hit === el || el.contains(hit))
          }), `Teresa ${width}: ${selector} must stay visible and reachable`)
        }
      }
      trace.push({ width, page: 'teresa', controls: 'run, pour and five shop buttons within viewport; center hit passed' })
      await engine.locator('.l-teresa-celestial-tab').screenshot({ path: outputPath(`celestial-teresa-${width}.png`) })
    }
    await page.setViewportSize({ width: 1440, height: 1000 })
    await runEntryAndExit('teresa', '.c-teresa-run-button__icon')
  })

  await test('Celestial UI · Effarig all four unlock purchases and run entry/exit', async () => {
    await prepare('teresa')
    trace.push({ fixture: 'pouredAmount=1e24 then original threshold check; relic shards injected at each price boundary' })
    await mutate('Teresa.pouredAmount=1e24; Teresa.checkForUnlocks(); Tab.celestials.effarig.show(true); ui.view.quotes.current=undefined;')
    await check('return TeresaUnlocks.effarig.isUnlocked', true)
    assert.equal(await engine.locator('.c-effarig-run-button').count(), 0)
    for (const [index, key] of ['adjuster', 'glyphFilter', 'setSaves', 'run'].entries()) {
      await mutate(`Tab.celestials.effarig.show(true); Currency.relicShards.value=EffarigUnlock.${key}.cost-1;
        ui.view.quotes.current=undefined;`)
      await click('.c-effarig-shop-button', index)
      await check(`return EffarigUnlock.${key}.isUnlocked`, false)
      await parity(`Effarig ${key}: one below price rejects purchase`)
      await mutate(`Currency.relicShards.value=EffarigUnlock.${key}.cost;`)
      await click('.c-effarig-shop-button', index)
      await dismissQuotes()
      await check(`return [EffarigUnlock.${key}.isUnlocked,Currency.relicShards.value]`, [true, 0])
      await parity(`Effarig ${key}: exact cost purchase and unlock effect`)
    }
    await engine.locator('.l-effarig-shop-and-run').screenshot({ path: outputPath('celestial-effarig.png') })
    await runEntryAndExit('effarig', '.c-effarig-run-button')
  })

  await test('Celestial UI · Laitela dark upgrades, singularity threshold and run entry/exit', async () => {
    await prepare('teresa')
    trace.push({ fixture: 'Imaginary Upgrade 15 bit set; first dark dimension only; resources injected at exact boundaries' })
    await mutate(`player.reality.imaginaryUpgradeBits |= 1<<15;
      Tab.celestials.laitela.show(true); ui.view.quotes.current=undefined;`)
    await check('return [Laitela.isUnlocked,DarkMatterDimension(1).isUnlocked,DarkMatterDimension(2).isUnlocked]', [true, true, false])
    for (const [index, key] of ['interval', 'powerDM', 'powerDE'].entries()) {
      const field = `${key}Upgrades`
      await mutate(`Currency.darkMatter.value=DarkMatterDimension(1).${key}Cost.minus(1);`)
      await click('.c-dark-matter-dimension-buttons button', index)
      await check(`return player.celestials.laitela.dimensions[0].${field}`, 0)
      await parity(`Laitela first dark dimension ${key}: one below cost rejected`)
      await mutate(`Currency.darkMatter.value=DarkMatterDimension(1).${key}Cost;`)
      await click('.c-dark-matter-dimension-buttons button', index)
      await check(`return [player.celestials.laitela.dimensions[0].${field},Currency.darkMatter.value.toString()]`, [1, '0'])
      await parity(`Laitela first dark dimension ${key}: exact purchase and production effect`)
    }
    await mutate('Currency.darkEnergy.value=Singularity.cap-1;')
    assert.equal(await engine.locator('button.c-laitela-singularity').count(), 0)
    await parity('First singularity entry hidden below cap')
    await mutate('Currency.darkEnergy.value=Singularity.cap;')
    await click('button.c-laitela-singularity')
    await dismissQuotes()
    await check('return [Currency.singularities.value,Currency.darkEnergy.value]', [1, 0])
    await parity('First singularity exact cap: condenses all energy and awards milestone')
    await mutate('Currency.darkEnergy.value=Singularity.cap-1;')
    await click('button.c-laitela-singularity')
    await check('return Currency.singularities.value', 1)
    await parity('Existing singularity panel rejects condense below cap')
    await mutate('Currency.darkEnergy.value=Singularity.cap;')
    await click('button.c-laitela-singularity')
    await dismissQuotes()
    await check('return [Currency.singularities.value,Currency.darkEnergy.value]', [2, 0])
    await parity('Second singularity condense and retained dark upgrades')
    await engine.locator('.l-laitela-celestial-tab').screenshot({ path: outputPath('celestial-laitela.png') })
    await runEntryAndExit('laitela', '.o-laitela-run-button__icon')
  })
}
