import { completeReality } from './reality-completion.mjs'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { outputPath } from './output.mjs'

// Explicit stage fixtures; all purchases below use the original rendered buttons.
export async function realityInteractions({ page, engine, reference, reset, test }) {
  await completeReality({ page, engine, reference, reset, test })
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
  const prepare = async tab => {
    for (const frame of frames) await reset(frame)
    trace.push({ fixture: 'realities=1; no natural progression claimed', tab })
    await mutate(`player.realities=1; Tab.reality.${tab}.show(true);`)
  }
  const read = frame => frame.evaluate(() => JSON.parse(JSON.stringify({
    rm: player.reality.realityMachines, upgrades: player.reality.upgradeBits,
    requirements: player.reality.upgReqs, rebuyables: player.reality.rebuyables,
    blackHoles: player.blackHole, pause: player.blackHolePause,
    pauseMode: player.blackHoleAutoPauseMode,
    time: player.records.thisReality.time, realTime: player.records.thisReality.realTime,
    effects: RealityUpgrades.all.map(u => [u.id, u.config.effect === undefined ? null : u.effectValue]),
    clocks: BlackHoles.list.map(b => [b.interval, b.power, b.duration, b.isActive]),
    realities: player.realities, ep: player.eternityPoints, eternities: player.eternities,
    glyphs: player.reality.glyphs, seed: player.reality.seed,
    secondGaussian: player.reality.secondGaussian, perks: player.reality.perkPoints,
    perkIds: Array.from(player.reality.perks).sort((a, b) => a - b),
    relicShards: Currency.relicShards.value, effarigUnlocks: player.celestials.effarig.unlockBits,
    perkEffects: Perks.all.map(p => [p.id, p.canBeApplied,
      p.config.effect === undefined ? null : p.effectValue]),
    sacrificeEffects: Object.values(GlyphSacrifice).filter(s => s?.config).map(s => [s.id, s.effectValue]),
    filterScores: player.reality.glyphs.inventory.filter(g => generatedTypes.includes(g.type))
      .map(g => [g.id, String(AutoGlyphProcessor.filterValue(g)),
        String(AutoGlyphProcessor.thresholdValue(g)), AutoGlyphProcessor.wouldKeep(g)]),
    dimensionMultiplier: AntimatterDimension(1).multiplier,
  })))
  const parity = async label => {
    const actual = await read(engine)
    const expected = await read(reference)
    trace.push({ label, actual, expected })
    fs.writeFileSync(outputPath('reality-operations.json'), JSON.stringify(trace, null, 2))
    assert.deepEqual(actual, expected, label)
  }
  const check = async (script, expected) => {
    for (const frame of frames) assert.deepEqual(await frame.evaluate(s => Function(s)(), script), expected)
  }
  const click = async (selector, index = 0) => {
    for (const frame of frames) await frame.locator(selector).nth(index).click({ timeout: 5000 })
    await mutate('')
  }

  await test('Reality UI · Entire perk graph via canvas clicks and connected purchase boundaries', async () => {
    await prepare('perks')
    await mutate('player.options.perkPhysicsEnabled=false; PerkNetwork.setPhysics(false);')
    // Pan the original graph only. Purchases are real pointer events on its canvas.
    const clickPerk = async id => {
      for (const frame of frames) {
        await frame.evaluate(id => {
          const position = PerkNetwork.network.getPositions([id])[id]
          PerkNetwork.network.moveTo({ position, scale: 1, animation: false })
          PerkNetwork.network.redraw()
        }, id)
        const position = await frame.evaluate(id =>
          PerkNetwork.network.canvasToDOM(PerkNetwork.network.getPositions([id])[id]), id)
        await frame.locator('.c-perk-network canvas').last().click({ position, timeout: 5000 })
      }
      await mutate('')
    }
    await mutate('Currency.perkPoints.value=1;')
    const locked = await engine.evaluate(() => Perks.all.find(p => p.id !== 0).id)
    await clickPerk(locked)
    await check('return player.reality.perks.size', 0)
    await parity('perk graph: disconnected node rejects sufficient currency')
    const ids = await engine.evaluate(() => Perks.all.map(p => p.id))
    const bought = new Set()
    while (bought.size < ids.length) {
      const id = await engine.evaluate(() => Perks.all.find(p => !p.isBought && p.isAvailableForPurchase)?.id)
      assert.notEqual(id, undefined, 'Every perk must be reachable from START')
      await mutate('Currency.perkPoints.value=0;')
      await clickPerk(id)
      await check(`return Perks.find(${id}).isBought`, false)
      await parity(`perk ${id}: connected but no perk point`)
      await mutate('Currency.perkPoints.value=1;')
      await clickPerk(id)
      await check(`return [Perks.find(${id}).isBought, Currency.perkPoints.value]`, [true, 0])
      await parity(`perk ${id}: connected exact cost purchase and effects`)
      await mutate('Currency.perkPoints.value=1;')
      await clickPerk(id)
      await check('return Currency.perkPoints.value', 1)
      bought.add(id)
    }
    await engine.locator('.c-perk-tab').screenshot({ path: outputPath('reality-perks.png') })
  })

  await test('Reality UI · Glyph deletion, sacrifice confirmation and all five basic types', async () => {
    await prepare('glyphs')
    trace.push({ fixture: 'level 100 original seeded generator, forced type; RU19 requirement history is a fixture' })
    const generate = async type => mutate(`Glyphs.addToInventory(GlyphGenerator.randomGlyph(
      {actualLevel:100,rawLevel:100},new GlyphGenerator.RealGlyphRNG(),${JSON.stringify(type)}));`)
    const shiftGlyph = async () => {
      for (const frame of frames) await frame.locator('.l-glyph-inventory__slot > .l-glyph-component > div:last-child')
        .first().click({ modifiers: ['Shift'], timeout: 5000 })
      await mutate('')
    }
    await mutate('player.options.confirmations.glyphSacrifice=true;')
    await generate('power')
    await shiftGlyph()
    await check('return [Modal.glyphDelete.isOpen, Modal.glyphSacrifice.isOpen]', [true, false])
    await click('.l-modal-buttons button:not(.c-modal__confirm-btn)')
    await check('return player.reality.glyphs.inventory.length', 1)
    await parity('locked sacrifice: delete confirmation cancellation preserves glyph')
    await shiftGlyph()
    await click('.c-modal__confirm-btn')
    await check('return [player.reality.glyphs.inventory.length,player.reality.glyphs.sac.power]', [0, 0])
    await parity('locked sacrifice: confirmed deletion grants no power')
    await mutate('player.reality.upgReqs |= 1<<19; Currency.realityMachines.value=new Decimal(RealityUpgrade(19).cost); Tab.reality.upgrades.show(true);')
    await click('.l-reality-upgrade-grid .c-reality-upgrade-btn', 18)
    await check('return GlyphSacrificeHandler.canSacrifice', true)
    await mutate('Tab.reality.glyphs.show(true);')
    for (const type of ['power', 'infinity', 'replication', 'time', 'dilation']) {
      await generate(type)
      await parity(`${type}: seeded generation`)
      const gain = await engine.evaluate(() => GlyphSacrificeHandler.glyphSacrificeGain(player.reality.glyphs.inventory[0]))
      assert.ok(gain > 0)
      await shiftGlyph()
      await check('return Modal.glyphSacrifice.isOpen', true)
      await click('.l-modal-buttons button:not(.c-modal__confirm-btn)')
      await check(`return [player.reality.glyphs.inventory.length,player.reality.glyphs.sac.${type}]`, [1, 0])
      await parity(`${type}: cancelled sacrifice retains glyph and power`)
      await shiftGlyph()
      await click('.c-modal__confirm-btn')
      await check(`return [player.reality.glyphs.inventory.length,player.reality.glyphs.sac.${type}]`, [0, gain])
      await parity(`${type}: confirmed sacrifice removes glyph and applies original reward/effect`)
    }
    await engine.locator('.l-glyphs-tab').screenshot({ path: outputPath('reality-sacrifice.png') })
  })

  await test('Reality UI · Glyph filter unlock, five modes and original threshold decisions', async () => {
    await prepare('glyphs')
    for (const frame of frames) assert.equal(await frame.locator('.c-glyph-filter-mode-container').count(), 0)
    trace.push({ fixture: 'Achievement 147 and Teresa Effarig unlock history; level 100 glyphs use original fixed-seed generator' })
    await mutate(`Achievement(147).unlock(); player.celestials.teresa.unlockBits |= 1<<3;
      Tab.celestials.effarig.show(true); Modal.hideAll(); ui.view.quotes.current=undefined;
      Currency.relicShards.value=EffarigUnlock.glyphFilter.cost-1;`)
    await click('.c-effarig-shop-button', 1)
    await check('return EffarigUnlock.glyphFilter.isUnlocked', false)
    await parity('filter: insufficient shard purchase rejected')
    await mutate('Currency.relicShards.value=EffarigUnlock.glyphFilter.cost;')
    await click('.c-effarig-shop-button', 1)
    await check('return [EffarigUnlock.glyphFilter.isUnlocked,Currency.relicShards.value]', [true, 0])
    await mutate(`Modal.hideAll(); ui.view.quotes.current=undefined; Tab.reality.glyphs.show(true);
      player.reality.showSidebarPanel=GLYPH_SIDEBAR_MODE.INVENTORY_MANAGEMENT;
      for(const type of BASIC_GLYPH_TYPES) Glyphs.addToInventory(GlyphGenerator.randomGlyph(
        {actualLevel:100,rawLevel:100},new GlyphGenerator.RealGlyphRNG(),type));`)
    await click('.l-glyph-sidebar-tab-container button', 1)
    for (const frame of frames) assert.equal(await frame.locator('.c-glyph-sacrifice-options__option').count(), 5)
    const input = async (selector, value, index = 0) => {
      for (const frame of frames) {
        const element = frame.locator(selector).nth(index)
        await element.fill(String(value))
        await element.press('Tab')
      }
      await mutate('')
    }
    const modeSelector = '.c-glyph-sacrifice-options__option'
    // Upstream intentionally disables pointer events on the already-selected mode.
    await click(modeSelector, 1)
    await click(modeSelector, 0)
    await check('return player.reality.glyphs.inventory.every(g=>!AutoGlyphProcessor.wouldKeep(g))', true)
    await parity('lowest sacrifice mode: all basic glyphs rejected')
    await click(modeSelector, 1)
    for (const [value, clamped] of [[9, 8], [-1, 0], [2, 2]]) {
      await input('.c-auto-sac-effect-tab__input:visible', value)
      await check('return player.reality.glyphs.filter.simple', clamped)
      await parity(`effect count input ${value}: clamped threshold and original decisions`)
    }
    await click(modeSelector, 2)
    const types = await engine.evaluate(() => GlyphTypes.list.filter(t => !GlyphTypes.locked.includes(t)).map(t => t.id))
    for (let index = 0; index < types.length; index++) {
      await click('.l-glyph-sacrifice-options__rarity-slider-div > span', index)
      await check(`return AutoGlyphProcessor.types[${JSON.stringify(types[index])}].rarity>0`, true)
      await parity(`rarity ${types[index]}: real icon click advances original rarity threshold`)
    }
    await click(modeSelector, 3)
    await input('.c-auto-sac-effect-tab__input:visible', 2)
    await click('.l-specified-effect-tab__effect-desc:visible', 0)
    await parity('specified effect: count and effect-mask toggle affect original decisions')
    await click(modeSelector, 4)
    for (const [value, clamped] of [[1000, 999], [-1000, -999], [50, 50]]) {
      await input('.c-auto-sac-type-tab__input:visible', value)
      await check('return AutoGlyphProcessor.types[GLYPH_TYPES[0]].score', clamped)
      await parity(`score threshold ${value}: clamped to ${clamped}`)
    }
    await input('.c-auto-sac-type-tab__input:visible', 75, 1)
    await parity('weighted effect: configured weight contributes to original score')
    await click('.fa-recycle.l-top-right-btn')
    await check('return player.options.autoRealityForFilter', true)
    await click('.fa-recycle.l-top-right-btn')
    await check('return player.options.autoRealityForFilter', false)
    for (const width of [320, 375, 414, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 })
      const panel = engine.locator('.l-glyph-sidebar-option-container')
      await panel.scrollIntoViewIfNeeded()
      assert.equal(await panel.evaluate(e => {
        const rect = e.getBoundingClientRect()
        return rect.left >= 0 && rect.right <= innerWidth
      }), true, `Glyph filter stays within iframe at ${width}px`)
      await engine.locator(modeSelector).first().click({ trial: true })
      await engine.locator('.c-auto-sac-type-tab__input:visible').last().click({ trial: true })
      const inventory = engine.locator('.l-glyph-inventory')
      await inventory.scrollIntoViewIfNeeded()
      await inventory.evaluate(e => { e.scrollLeft = e.scrollWidth })
      const lastSlot = engine.locator('.l-glyph-inventory__row').first().locator('.l-glyph-inventory__slot').last()
      assert.equal(await lastSlot.evaluate(e => {
        const rect = e.getBoundingClientRect()
        return rect.left >= 0 && rect.right <= innerWidth
      }), true, `Last inventory column is reachable by local scrolling at ${width}px`)
      await inventory.evaluate(e => { e.scrollLeft = 0 })
      await page.screenshot({ path: outputPath(`reality-filter-width-${width}.png`), fullPage: true })
    }
    await engine.locator('.l-glyph-sidebar-option-container').screenshot({ path: outputPath('reality-filter.png') })
  })

  await test('Reality UI · First reset threshold, cancel, seeded rewards and glyph equip', async () => {
    for (const frame of frames) await reset(frame)
    trace.push({ fixture: '100 Eternities, dilation studies 1–6, EP near 1e4000; 120s avoids achievement 154; original seeds 123456' })
    await mutate(`player.eternities=new Decimal(100); player.dilation.studies=[1,2,3,4,5,6];
      player.records.thisReality.time=120000; player.records.thisReality.realTime=120000;
      player.options.confirmations.glyphSelection=true;
      Currency.eternityPoints.value=new Decimal('1e3999');
      player.records.thisReality.maxEP=new Decimal('1e3999'); Tab.reality.glyphs.show(true);`)
    await click('.c-reality-button:visible')
    await check('return player.realities', 0)
    await check('return Modal.reality.isOpen', false)
    await parity('first reality: below EP boundary rejects click')
    await mutate("Currency.eternityPoints.value=new Decimal('1e4000'); player.records.thisReality.maxEP=new Decimal('1e4000');")
    for (const width of [320, 375, 414, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 })
      const button = engine.locator('.c-reality-button:visible')
      await button.scrollIntoViewIfNeeded()
      assert.equal(await button.evaluate(e => {
        const rect = e.getBoundingClientRect()
        return rect.left >= 0 && rect.right <= innerWidth && rect.width > 0
      }), true, `Reality button fits iframe at ${width}px`)
      await button.click({ trial: true })
      await page.screenshot({ path: outputPath(`reality-width-${width}.png`), fullPage: true })
    }
    await click('.c-reality-button:visible')
    await check('return Modal.reality.isOpen', true)
    await engine.locator('.c-modal').screenshot({ path: outputPath('reality-first-confirm.png') })
    await click('.l-modal-buttons button:not(.c-modal__confirm-btn)')
    await check('return player.realities', 0)
    await parity('first reality: cancellation retains resources and random seed')
    await click('.c-reality-button:visible')
    await click('.c-modal__confirm-btn')
    await check('return player.realities', 1)
    await check('return player.reality.glyphs.inventory.length', 2)
    await parity('first reality: confirmed rewards, seed, glyphs and reset resources')
    await mutate('Modal.hideAll(); ui.view.quotes.current=undefined; Tab.reality.glyphs.show(true);')
    // The original transparent overlay owns clicks; the visible glyph underneath does not.
    for (const frame of frames) await frame.locator('.l-glyph-inventory__slot > .l-glyph-component > div:last-child').first().dblclick({ timeout: 5000 })
    await mutate('')
    await check('return player.reality.glyphs.active.length', 1)
    await parity('first generated glyph: double click equips and original dimension effect matches')
  })

  await test('Reality UI · All 25 upgrade purchase gates and five rebuyable second costs', async () => {
    await prepare('upgrades')
    const selector = '.l-reality-upgrade-grid .c-reality-upgrade-btn'
    for (let id = 1; id <= 25; id++) {
      if (id >= 6) {
        await mutate(`Currency.realityMachines.value=new Decimal(RealityUpgrade(${id}).cost);`)
        await click(selector, id - 1)
        await check(`return RealityUpgrade(${id}).isBought`, false)
        await parity(`upgrade ${id}: locked requirement rejects exact currency`)
        trace.push({ fixture: `upgReqs bit ${id}; purchase boundary only, requirement event not covered` })
        await mutate(`player.reality.upgReqs |= 1 << ${id};`)
      }
      for (let purchase = 0; purchase < (id <= 5 ? 2 : 1); purchase++) {
        await mutate(`Currency.realityMachines.value=new Decimal(RealityUpgrade(${id}).cost).minus(1);`)
        await click(selector, id - 1)
        await check(id <= 5 ? `return RealityUpgrade(${id}).boughtAmount` : `return RealityUpgrade(${id}).isBought`,
          id <= 5 ? purchase : false)
        await parity(`upgrade ${id}/${purchase}: insufficient currency`)
        await mutate(`Currency.realityMachines.value=new Decimal(RealityUpgrade(${id}).cost);`)
        await click(selector, id - 1)
        await check(id <= 5 ? `return RealityUpgrade(${id}).boughtAmount` : `return RealityUpgrade(${id}).isBought`,
          id <= 5 ? purchase + 1 : true)
        await check('return Currency.realityMachines.value.toString()', '0')
        await parity(`upgrade ${id}/${purchase}: exact currency purchase and effects`)
      }
    }
    await engine.locator('.l-reality-upgrade-grid').screenshot({ path: outputPath('reality-upgrades.png') })
  })

  await test('Reality UI · Black hole unlock, six tracks, pause and coupled clocks', async () => {
    await prepare('hole')
    const unlock = '.c-reality-upgrade-btn--black-hole-unlock'
    await mutate('Currency.realityMachines.value=new Decimal(99);')
    await click(unlock)
    await check('return BlackHoles.areUnlocked', false)
    await mutate('Currency.realityMachines.value=new Decimal(100);')
    await click(unlock)
    await check('return [BlackHoles.areUnlocked, Currency.realityMachines.value.toString()]', [true, '0'])
    await parity('first clock: 99 rejected; 100 unlocked')
    // Requirement history fixture; second clock unlock itself is a real upgrade click.
    await mutate('player.reality.upgReqs |= 1<<20; Currency.realityMachines.value=new Decimal(RealityUpgrade(20).cost); Tab.reality.upgrades.show(true);')
    await click('.l-reality-upgrade-grid .c-reality-upgrade-btn', 19)
    await check('return BlackHole(2).isUnlocked', true)
    await mutate('Tab.reality.hole.show(true);')
    for (let id = 1; id <= 2; id++) {
      for (const [index, track] of ['interval', 'power', 'duration'].entries()) {
        const expression = `BlackHole(${id}).${track}Upgrade`
        const field = `player.blackHole[${id - 1}].${track}Upgrades`
        await mutate(`Currency.realityMachines.value=new Decimal(${expression}.cost).minus(1);`)
        await click('.l-black-hole-upgrade-grid__row .c-reality-upgrade-btn', (id - 1) * 3 + index)
        await check(`return ${field}`, 0)
        await mutate(`Currency.realityMachines.value=new Decimal(${expression}.cost);`)
        await click('.l-black-hole-upgrade-grid__row .c-reality-upgrade-btn', (id - 1) * 3 + index)
        await check(`return ${field}`, 1)
        await check('return Currency.realityMachines.value.toString()', '0')
        await parity(`clock ${id} ${track}: below/exact cost, phase and effect`)
      }
    }
    await mutate('player.blackHole[0].phase=0; player.blackHole[1].phase=0; gameLoop(1000);')
    await check('return player.blackHole[1].phase', 0)
    await parity('inactive first clock: second clock remains stationary')
    await mutate('player.blackHole[0].active=true; player.blackHole[0].phase=0; gameLoop(1000);')
    await check('return player.blackHole[1].phase > 0', true)
    await parity('active first clock: real/game time and second clock advance')
    await click('.l-black-hole-tab .c-subtab-option-container button', 0)
    await check('return BlackHoles.arePaused', true)
    const before = await engine.evaluate(() => player.blackHole.map(b => b.phase))
    await mutate('gameLoop(1000);')
    await check('return player.blackHole.map(b=>b.phase)', before)
    await parity('paused clocks: phases frozen, simulation time continues')
    await click('.l-black-hole-tab .c-subtab-option-container button', 0)
    await check('return BlackHoles.arePaused', false)
    for (const mode of [1, 2, 0]) {
      await click('.l-auto-pause-button')
      await check('return player.blackHoleAutoPauseMode', mode)
    }
    await parity('unpause and all automatic pause modes')
    await engine.locator('.l-black-hole-tab').screenshot({ path: outputPath('reality-clocks.png') })
  })
}
