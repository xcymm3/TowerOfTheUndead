import assert from 'node:assert/strict'
import fs from 'node:fs'
import { outputPath } from './output.mjs'

// Long progression is staged explicitly; every purchase, toggle, entry, reset, and completion below uses
// the original game object or its rendered control in both the themed and untouched reference builds.
export async function celestialCompletion({ page, engine, reference, reset, test }) {
  const frames = [engine, reference]
  const trace = []
  const mutate = async script => {
    for (const frame of frames) await frame.evaluate(source => {
      Function(source)()
      Lazy.invalidateAll()
      GameUI.update()
    }, script)
    await page.waitForTimeout(120)
  }
  const prepare = async (tab, fixture) => {
    for (const frame of frames) await reset(frame)
    await mutate(`player.realities=10000; Achievement(147).unlock(); ${fixture}
      player.options.retryCelestial=false; player.options.confirmations.exitChallenge=true;
      Tab.${tab}.show(true); Modal.hideAll(); ui.view.quotes.current=undefined;`)
    trace.push({ tab, fixture })
  }
  const read = frame => frame.evaluate(() => JSON.parse(JSON.stringify({
    teresa: player.celestials.teresa,
    effarig: player.celestials.effarig,
    enslaved: player.celestials.enslaved,
    v: player.celestials.v,
    ra: player.celestials.ra,
    laitela: player.celestials.laitela,
    pelle: player.celestials.pelle,
    singularities: Currency.singularities.value,
    darkMatter: Currency.darkMatter.value,
    darkEnergy: Currency.darkEnergy.value,
    activeRuns: Object.fromEntries(Object.entries(player.celestials).map(([key, value]) => [key, value.run ?? null])),
    computed: {
      effarigStage: Effarig.currentStage,
      enslavedCompleted: Enslaved.isCompleted,
      vTheorems: V.spaceTheorems,
      raLevels: Ra.pets.all.map(pet => [pet.id, pet.level, pet.isUnlocked]),
      raUnlocked: Ra.isUnlocked,
      remembrance: Ra.petWithRemembrance,
      alchemy: AlchemyResources.all.map(resource => [resource.id, resource.amount, resource.reaction?.isActive ?? null]),
      darkDimensions: DarkMatterDimensions.all.map(dim => [dim.tier, dim.isUnlocked, dim.ascensions,
        dim.intervalUpgrades, dim.powerDMUpgrades, dim.powerDEUpgrades]),
      singularityCap: Singularity.cap,
      singularityGain: Singularity.singularitiesGained,
      milestones: SingularityMilestones.all.map(milestone => [milestone.id, milestone.isUnlocked,
        milestone.completions, milestone.isMaxed]),
      glyphTypes: player.reality.glyphs.inventory.map(glyph => glyph.type)
    }
  })))
  const parity = async label => {
    const actual = await read(engine)
    const expected = await read(reference)
    trace.push({ label, actual, expected })
    fs.writeFileSync(outputPath('celestial-completion-operations.json'), JSON.stringify(trace, null, 2))
    assert.deepEqual(actual, expected, label)
  }
  const both = async (script, expected) => {
    for (const frame of frames) assert.deepEqual(await frame.evaluate(source => Function(source)(), script), expected)
  }
  const click = async (selector, index = 0, force = false) => {
    for (const frame of frames) await frame.locator(selector).nth(index).click({ timeout: 7000, force })
    await mutate('')
  }
  const dismiss = () => mutate('Modal.hideAll(); ui.view.quotes.current=undefined;')
  const enter = async (key, selector) => {
    await click(selector, 0, true)
    await both('return Modal.celestials.isOpen', true)
    for (const frame of frames) await frame.locator('.c-modal__confirm-btn:visible').click({ timeout: 7000 })
    await mutate('')
    await dismiss()
    await both(`return player.celestials.${key}.run`, true)
    await parity(`${key}: entered through the rendered confirmation flow`)
  }

  await test('Celestial completion · Teresa reward and Effarig three-stage completion events', async () => {
    await prepare('celestials.teresa', `Teresa.pouredAmount=1e24; Teresa.checkForUnlocks();`)
    await mutate(`Teresa.initializeRun(); Currency.antimatter.value=new Decimal('1e160000000');
      player.dilation.studies=[1,2,3,4,5,6]; player.records.thisReality.maxEP=new Decimal('1e4000');
      processManualReality(false); Modal.hideAll(); ui.view.quotes.current=undefined;`)
    await both('return [Teresa.isRunning,Teresa.runCompleted,Teresa.runRewardMultiplier>1]', [false, true, true])
    await parity('Teresa: original Reality reset records best run and reward multiplier')

    await prepare('celestials.effarig', `player.celestials.teresa.unlockBits=63;
      player.celestials.effarig.unlockBits|=1<<EffarigUnlock.run.id; Effarig.initializeRun();`)
    await mutate(`Currency.antimatter.value=new Decimal('1e309'); player.records.thisInfinity.maxAM=new Decimal('1e309');
      bigCrunchReset(); Modal.hideAll(); ui.view.quotes.current=undefined;`)
    await both('return [EffarigUnlock.infinity.isUnlocked,Effarig.currentStage]', [true, 2])
    await parity('Effarig: Infinity event advances the first seal')
    await mutate(`player.celestials.effarig.run=true; Currency.infinityPoints.value=new Decimal('1e310');
      player.records.thisEternity.maxIP=new Decimal('1e310'); eternity(false,false);
      Modal.hideAll(); ui.view.quotes.current=undefined;`)
    await both('return [EffarigUnlock.eternity.isUnlocked,Effarig.currentStage]', [true, 3])
    await parity('Effarig: Eternity event advances the second seal')
    await mutate(`player.celestials.effarig.run=true; player.dilation.studies=[1,2,3,4,5,6];
      player.records.thisReality.maxEP=new Decimal('1e4000'); processManualReality(false);
      Modal.hideAll(); ui.view.quotes.current=undefined;`)
    await both('return [EffarigUnlock.reality.isUnlocked,Effarig.currentStage,Effarig.isRunning]', [true, 4, false])
    await parity('Effarig: Reality event advances the final seal and keeps the reward')
  })

  await test('Celestial completion · Enslaved storage, two unlocks, hints, completion and Tesseract', async () => {
    await prepare('celestials.enslaved', `player.celestials.effarig.unlockBits|=1<<EffarigUnlock.eternity.id;
      player.records.bestReality.glyphLevel=5000; player.records.bestReality.glyphStrength=4;`)
    await mutate('player.celestials.enslaved.stored=ENSLAVED_UNLOCKS.FREE_TICKSPEED_SOFTCAP.price*0.5;')
    await click('.o-enslaved-shop-button', 0)
    await both('return Enslaved.has(ENSLAVED_UNLOCKS.FREE_TICKSPEED_SOFTCAP)', false)
    await mutate('player.celestials.enslaved.stored=ENSLAVED_UNLOCKS.FREE_TICKSPEED_SOFTCAP.price;')
    await click('.o-enslaved-shop-button', 0)
    await both('return Enslaved.has(ENSLAVED_UNLOCKS.FREE_TICKSPEED_SOFTCAP)', true)
    await mutate('player.celestials.enslaved.stored=ENSLAVED_UNLOCKS.RUN.price;')
    await both('return Enslaved.canBuy(ENSLAVED_UNLOCKS.RUN)', true)
    await mutate('document.querySelectorAll(".o-enslaved-shop-button")[1].click();')
    await dismiss()
    await both('return Enslaved.has(ENSLAVED_UNLOCKS.RUN)', true)
    await click('.o-enslaved-mechanic-button', 0)
    await both('return player.celestials.enslaved.isStoring', true)
    await click('.o-enslaved-mechanic-button', 0)
    await mutate('document.querySelector(".l-enslaved-top-container__half:nth-child(2) .o-enslaved-mechanic-button").click();')
    await both('return player.celestials.enslaved.isStoringReal', true)
    await parity('Enslaved: exact-cost unlocks and both mutually exclusive storage controls')
    await mutate('player.celestials.enslaved.isStoringReal=false; EnslavedProgress.hintsUnlocked.giveProgress();')
    await enter('enslaved', '.c-enslaved-run-button__icon')
    await mutate(`player.dilation.studies=[1,2,3,4,5,6]; player.records.thisReality.maxEP=new Decimal('1e4000');
      processManualReality(false); Modal.hideAll(); ui.view.quotes.current=undefined;
      Currency.infinityPoints.value=Tesseracts.nextCost;`)
    await both('return [Enslaved.isCompleted,Tesseracts.canBuyTesseract]', [true, true])
    await mutate('Tesseracts.buyTesseract();')
    await both('return player.celestials.enslaved.tesseracts', 1)
    await parity('Enslaved: Reality completion reward permits an exact-cost Tesseract purchase')
  })

  await test('Celestial completion · V natural unlock, six feats, rewards, retry and exit', async () => {
    await prepare('celestials.v', `Achievement(151).unlock(); Currency.realities.value=10000; Currency.eternities.value=new Decimal('1e70');
      Currency.infinities.value=new Decimal('1e160'); player.records.thisReality.maxDT=new Decimal('1e320');
      player.records.thisReality.maxReplicanti=new Decimal('1e320000'); Currency.realityMachines.value=new Decimal('1e60');`)
    await click('.c-v-unlock-button--enabled')
    await dismiss()
    await both('return VUnlocks.vAchievementUnlock.isUnlocked', true)
    await enter('v', '.c-v-run-button')
    await mutate(`player.dilation.studies=[1,2,3,4,5,6]; V.checkForUnlocks();
      player.galaxies=4000; V.checkForUnlocks();
      player.challenge.eternity.current=7; Currency.infinityPoints.value=new Decimal('1e600000'); V.checkForUnlocks();
      player.challenge.eternity.current=12; player.dilation.studies=[];
      Currency.antimatter.value=new Decimal('1e400000000'); V.checkForUnlocks();
      player.challenge.eternity.current=0; Currency.eternityPoints.value=new Decimal('1e7000'); V.checkForUnlocks();
      player.challenge.eternity.current=5; player.dilation.active=true; player.dimensionBoosts=51; V.checkForUnlocks();
      Modal.hideAll(); ui.view.quotes.current=undefined;`)
    await both('return VRunUnlocks.all.slice(0,6).map(unlock=>unlock.completions)', [6, 1, 1, 1, 1, 1])
    await both('return [V.spaceTheorems,VUnlocks.shardReduction.isUnlocked,VUnlocks.adPow.isUnlocked]', [11, true, true])
    await parity('V: all six normal feats complete through their original condition checks')
    await mutate('player.options.retryCelestial=true; player.dilation.studies=[1,2,3,4,5,6]; player.records.thisReality.maxEP=new Decimal("1e4000"); processManualReality(false); Modal.hideAll(); ui.view.quotes.current=undefined;')
    await both('return V.isRunning', true)
    await mutate('player.options.retryCelestial=false; Tab.reality.glyphs.show(true);')
    await click('.c-reset-reality-button')
    await click('.c-modal__confirm-btn:visible')
    await dismiss()
    await both('return V.isRunning', false)
    await parity('V: retry preserves the run and confirmed early exit ends it without erasing feats')
  })

  await test('Celestial completion · Ra four ancestors, Memories, Remembrance, Alchemy and Reality Glyph', async () => {
    await prepare('celestials.ra', `player.celestials.v.unlockBits|=1<<VUnlocks.vAchievementUnlock.id;
      player.celestials.v.runUnlocks=[6,6,6,6,6,6,0,0,0]; V.updateTotalRunUnlocks(); V.checkForUnlocks(); Ra.checkForUnlocks();`)
    await enter('ra', '.c-ra-run-button__icon')
    await mutate('Tab.celestials.ra.show(true);')
    await mutate('Ra.pets.teresa.memories=Ra.pets.teresa.memoryUpgradeCost-1;')
    await click('.c-ra-pet-upgrade-memory', 0)
    await both('return player.celestials.ra.pets.teresa.memoryUpgrades', 0)
    await mutate('Ra.pets.teresa.memories=Ra.pets.teresa.memoryUpgradeCost;')
    await click('.c-ra-pet-upgrade-memory', 0)
    await both('return player.celestials.ra.pets.teresa.memoryUpgrades', 1)
    await mutate('Ra.pets.teresa.memories=Ra.pets.teresa.chunkUpgradeCost;')
    await click('.c-ra-pet-upgrade-chunk', 0)
    await both('return player.celestials.ra.pets.teresa.chunkUpgrades', 1)
    for (const pet of ['teresa', 'effarig', 'enslaved']) {
      await mutate(`Ra.pets.${pet}.level=7; Ra.pets.${pet}.memories=Ra.pets.${pet}.requiredMemories;`)
      await both(`return Ra.pets.${pet}.memories>=Ra.pets.${pet}.requiredMemories`, true)
      await mutate(`document.querySelector(".c-ra-level-up-btn.c-ra-pet-btn--${pet}").click();`)
      await dismiss()
      await mutate('Tab.celestials.ra.show(true);')
      await both(`return Ra.pets.${pet}.level`, 8)
    }
    await both('return Ra.pets.all.map(pet=>[pet.level,pet.isUnlocked])', [[8, true], [8, true], [8, true], [1, true]])
    await mutate(`Ra.pets.v.level=4; Ra.checkForUnlocks(); player.celestials.teresa.unlockBits=63;
      Currency.eternityPoints.value=new Decimal('1e20000');
      Currency.timeShards.value=new Decimal('1e600000'); Currency.infinityPower.value=new Decimal('1e20000000');
      Ra.memoryTick(1000,true);`)
    await both('return Ra.pets.all.every(pet=>pet.memoryChunks>0)', true)
    await dismiss()
    await mutate('Tab.celestials.ra.show(true);')
    assert.equal(await engine.locator('.c-ra-pet-remembrance-button').count(), 4)
    await click('.c-ra-pet-remembrance-button', 2)
    await both('return Ra.petWithRemembrance', 'The Nameless Ones')
    await parity('Ra: exact memory upgrades, sequential ancestor unlocks, production and Remembrance')

    await mutate(`Ra.pets.effarig.level=25; Ra.checkForUnlocks(); Modal.hideAll(); ui.view.quotes.current=undefined;
      Tab.reality.alchemy.show(true);
      for(const resource of AlchemyResources.base){ resource.highestRefinementValue=25000; resource.amount=10000; }
    `)
    await both('return [VUnlocks.raUnlock.canBeApplied,Ra.unlocks.unlockGlyphAlchemy.isUnlocked,Ra.pets.effarig.level,Tab.reality.alchemy.isAvailable]',
      [true, true, 25, true])
    await both('return AlchemyResources.all.some(resource=>!resource.isBaseResource&&resource.isUnlocked)', true)
    for (const frame of frames) {
      await frame.locator('.o-alchemy-node.o-clickable').first().waitFor({ state: 'visible', timeout: 7000 })
    }
    await click('.o-alchemy-node.o-clickable', 0)
    await both('return AlchemyReactions.all.compact().some(reaction=>reaction.isActive)', true)
    await mutate('Ra.applyAlchemyReactions(1000); AlchemyResource.reality.amount=100;')
    await click('.c-subtab-option-container button', 2)
    await both('return Modal.realityGlyph.isOpen', true)
    await click('.c-reality-glyph-creation .o-primary-btn')
    await both('return [AlchemyResource.reality.amount,player.reality.glyphs.createdRealityGlyph,player.reality.glyphs.inventory.some(g=>g.type==="reality")]', [0, true, true])
    await parity('Ra: enabled reaction consumes reagents and special Reality Glyph consumes its resource')
  })

  await test('Celestial completion · four dark avatars, ascension, annihilation and eight-tier domain reward', async () => {
    await prepare('celestials.laitela', `for(const id of [15,16,17,18,19]) player.reality.imaginaryUpgradeBits|=1<<id;`)
    await both('return DarkMatterDimensions.all.map(dim=>dim.isUnlocked)', [true, true, true, true])
    for (let tier = 0; tier < 4; tier++) {
      await mutate(`Currency.darkMatter.value=DarkMatterDimension(${tier + 1}).powerDMCost;`)
      await both(`return DarkMatterDimension(${tier + 1}).canBuyPowerDM`, true)
      await mutate(`document.querySelectorAll(".c-dark-matter-dimension-container")[${tier}]
        .querySelector(".c-dark-matter-dimension-buttons button:nth-child(2)").click();`)
    }
    await both('return player.celestials.laitela.dimensions.map(dim=>dim.powerDMUpgrades)', [1, 1, 1, 1])
    await mutate(`const dim=DarkMatterDimension(1); player.celestials.laitela.dimensions[0].intervalUpgrades=dim.maxIntervalPurchases;
      Currency.darkMatter.value=new Decimal('1e100');`)
    await click('.c-dark-matter-dimension-container .c-dark-matter-dimension-buttons button:first-child', 0)
    await both('return DarkMatterDimension(1).ascensions', 1)
    await mutate(`Currency.darkMatter.value=new Decimal('1e60');`)
    await click('.c-laitela-annihilation-button')
    await dismiss()
    await both('return [Laitela.darkMatterMult>1,Currency.darkMatter.value.toString(),DarkMatterDimension(1).amount.toString()]', [true, '0', '1'])
    await parity('Laitela: all avatars purchase, first ascension and exact-threshold annihilation')

    for (let tier = 1; tier <= 8; tier++) {
      await mutate(`Laitela.initializeRun(); player.celestials.laitela.entropy=0.999;
        player.records.thisReality.realTime=1000; Currency.antimatter.value=new Decimal('1e1000000000000'); gameLoop(50);
        Modal.hideAll(); ui.view.quotes.current=undefined;`)
      await both('return [Laitela.isRunning,Laitela.difficultyTier]', [false, tier])
    }
    await both('return [Laitela.maxAllowedDimension,Laitela.isFullyDestabilized,Laitela.realityReward>1]', [0, true, true])
    await parity('Laitela: eight original entropy completions reach full destabilization and final reward')
  })

  await test('Celestial completion · Singularity bulk, automation and every milestone threshold', async () => {
    await prepare('celestials.laitela', `for(const id of [15,16,17,18,19]) player.reality.imaginaryUpgradeBits|=1<<id;
      Currency.singularities.value=10; Currency.darkEnergy.value=Singularity.cap;`)
    await click('.c-laitela-singularity')
    await dismiss()
    await both('return Currency.singularities.value', 11)
    await mutate('document.querySelectorAll(".c-laitela-singularity__cap-control")[1].click();')
    await both('return player.celestials.laitela.singularityCapIncreases', 1)
    await mutate('document.querySelectorAll(".c-laitela-singularity__cap-control")[0].click();')
    await both('return player.celestials.laitela.singularityCapIncreases', 0)
    await parity('Singularity: condense and both bulk-cap controls')

    const thresholds = await engine.evaluate(() => SingularityMilestones.all.map(milestone => milestone.start))
    for (const start of thresholds) {
      await mutate(`Currency.singularities.value=${JSON.stringify(start)}*(1-1e-10);`)
      await both(`return SingularityMilestones.all.find(m=>m.start===${JSON.stringify(start)}).isUnlocked`, false)
      await mutate(`Currency.singularities.value=${JSON.stringify(start)};`)
      await both(`return SingularityMilestones.all.find(m=>m.start===${JSON.stringify(start)}).isUnlocked`, true)
    }
    await mutate(`Currency.singularities.value=Math.max(...SingularityMilestones.all.map(m=>m.start)); Tab.celestials.laitela.show(true);`)
    const toggles = await engine.locator('.c-laitela-automation-toggle').count()
    assert.equal(toggles, 4)
    for (let index = 0; index < toggles; index++) await click('.c-laitela-automation-toggle', index)
    await both('return [player.auto.darkMatterDims.isActive,player.auto.ascension.isActive,player.auto.singularity.isActive,player.auto.annihilation.isActive]', [true, true, true, true])
    await parity('Singularity: every milestone unlock boundary and all four automation toggles')
  })

  await test('Celestial completion · seven-master page record, wording and responsive controls', async () => {
    const pages = [
      ['celestials.teresa', 'player.celestials.teresa.unlockBits=63;', '.l-teresa-celestial-tab'],
      ['celestials.effarig', 'player.celestials.teresa.unlockBits=63; player.celestials.effarig.unlockBits=127;', '.l-teresa-celestial-tab'],
      ['celestials.enslaved', 'player.celestials.effarig.unlockBits=127; player.celestials.enslaved.unlocks=[0,1];', '.l-enslaved-celestial-tab'],
      ['celestials.v', 'Achievement(151).unlock(); player.celestials.v.unlockBits=127;', '.l-v-celestial-tab'],
      ['celestials.ra', 'player.celestials.v.runUnlocks=[6,6,6,6,6,6,0,0,0]; V.updateTotalRunUnlocks(); V.checkForUnlocks(); Ra.checkForUnlocks();', '.l-ra-celestial-tab'],
      ['celestials.laitela', 'player.reality.imaginaryUpgradeBits|=(1<<15)|(1<<16)|(1<<17)|(1<<18)|(1<<19); Currency.singularities.value=1e6;', '.l-laitela-celestial-tab'],
      ['celestials.pelle', 'player.reality.imaginaryUpgradeBits|=1<<25;', '.l-pelle-celestial-tab']
    ]
    for (const [tab, fixture, root] of pages) {
      await prepare(tab, fixture)
      assert.equal(await engine.evaluate(() => Pelle.isDoomed), false)
      assert.equal(await engine.locator(root).count(), 1, `${tab} page must render`)
      for (const width of [320, 375, 414, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 1000 })
        await page.mouse.move(width - 1, 1)
        await page.waitForTimeout(400)
        const layout = await engine.locator(root).evaluate(element => {
          const rect = element.getBoundingClientRect()
          const interactive = [...element.querySelectorAll('button, input, [class*=button]')].filter(node => {
            const style = getComputedStyle(node)
            const box = node.getBoundingClientRect()
            return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0
          })
          return { left: rect.left, right: rect.right, width: innerWidth,
            badControls: interactive.filter(node => {
              const box = node.getBoundingClientRect()
              return box.left < -1 || box.right > innerWidth + 1
            }).length }
        })
        assert.ok(layout.left >= -1 && layout.right <= layout.width + 1, `${tab} root clipped at ${width}`)
        assert.equal(layout.badControls, 0, `${tab} controls clipped at ${width}`)
        await engine.locator(root).screenshot({ path: outputPath(`celestial-${tab.replace('.', '-')}-${width}.png`) })
      }
      const text = await engine.locator(root).innerText()
      fs.writeFileSync(outputPath(`celestial-${tab.replace('.', '-')}.txt`), text)
      for (const source of ['Dark Matter', 'Dark Energy', 'Singularity', 'Memory Chunk', 'Reality Glyph',
        'You only have', 'Tickspeed purchase multiplier', 'Each step increases', 'While charging']) {
        assert.equal(text.includes(source), false, `${tab} retains untranslated key term: ${source}`)
      }
      trace.push({ tab, result: 'rendered at six widths; visible controls inside viewport; key terminology translated' })
    }
    await page.setViewportSize({ width: 1440, height: 1000 })
    fs.writeFileSync(outputPath('celestial-completion-operations.json'), JSON.stringify(trace, null, 2))
  })
}
