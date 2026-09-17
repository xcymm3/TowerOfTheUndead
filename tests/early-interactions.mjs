import assert from 'node:assert/strict'

// Fixtures provide resources and elapsed progress only. Purchases, unlocks and resets
// below are performed through visible controls, with the original engine as oracle.
export async function earlyInteractions({ page, engine, reference, reset, test, evaluateScenario }) {
  const prepare = async (script = '') => {
    await reset(engine)
    await engine.evaluate(script => {
      Function(script)()
      Lazy.invalidateAll()
      Tab.dimensions.antimatter.show(true)
      GameUI.update()
    }, script)
    await page.waitForTimeout(100)
  }
  const compare = async (setup, action) => {
    const expected = await evaluateScenario(reference, setup + action)
    const actual = await evaluateScenario(engine, '', false)
    assert.deepEqual(actual, expected)
  }
  const buy = tier => engine.locator(`[data-buy-tier="${tier}"]`)
  const action = name => engine.locator(`[data-action="${name}"]`)
  const confirm = () => engine.locator('.c-modal__confirm-btn').click()
  const cancel = () => engine.locator('.c-modal').getByRole('button', { name: '取消', exact: true }).click()

  await test('UI · Single, partial ten, next decade and maximum purchases match original', async () => {
    const setup = 'Currency.antimatter.value = new Decimal(35);'
    await prepare(setup)
    await engine.getByRole('button', { name: '最大', exact: true }).click()
    assert.equal(await buy(1).isDisabled(), true)
    await engine.getByRole('button', { name: '单次', exact: true }).click()
    await buy(1).click()
    await engine.getByRole('button', { name: '十次', exact: true }).click()
    await buy(1).click()
    assert.equal(await engine.evaluate(() => AntimatterDimension(1).bought), 3)
    assert.equal(await buy(1).isDisabled(), true)
    await compare(setup, 'buyOneDimension(1); buyAsManyAsYouCanBuy(1);')
    await engine.evaluate(() => { Currency.antimatter.value = new Decimal('1e12'); GameUI.update() })
    await buy(1).click()
    assert.equal(await engine.evaluate(() => AntimatterDimension(1).bought), 10)
    await engine.getByRole('button', { name: '最大', exact: true }).click()
    assert.match(await engine.locator('[data-tier="1"] .army-price').innerText(), /起价/)
    await buy(1).click()
    await compare(setup, 'buyOneDimension(1); buyAsManyAsYouCanBuy(1); Currency.antimatter.value=new Decimal("1e12"); buyAsManyAsYouCanBuy(1); buyMaxDimension(1);')
  })

  await test('UI · Eight tiers unlock through original boost requirements and actual clicks', async () => {
    await prepare('Currency.antimatter.value=new Decimal("1e100");')
    await engine.getByRole('button', { name: '单次', exact: true }).click()
    for (let tier = 1; tier <= 4; tier++) await buy(tier).click()
    assert.equal(await buy(5).isDisabled(), true)
    for (let boost = 0; boost < 4; boost++) {
      await engine.evaluate(() => {
        const req = DimBoost.requirement
        AntimatterDimension(req.tier).amount = new Decimal(req.amount - 1)
        GameUI.update()
      })
      assert.equal(await action('boost').isDisabled(), true)
      await engine.evaluate(() => {
        const req = DimBoost.requirement
        AntimatterDimension(req.tier).amount = new Decimal(req.amount)
        player.options.confirmations.dimensionBoost = true
        GameUI.update()
      })
      await action('boost').click()
      await cancel()
      assert.equal(await engine.evaluate(() => player.dimensionBoosts), boost)
      await action('boost').click()
      await confirm()
      assert.equal(await engine.evaluate(() => player.dimensionBoosts), boost + 1)
      assert.equal(await engine.evaluate(() => AntimatterDimension(1).amount.toString()), '0')
      await engine.evaluate(() => { Currency.antimatter.value=new Decimal('1e100'); GameUI.update() })
      for (let tier = 1; tier <= boost + 5; tier++) await buy(tier).click()
      if (boost < 3) assert.equal(await buy(boost + 6).isDisabled(), true)
    }
    assert.equal(await engine.evaluate(() => AntimatterDimension(8).bought), 1)
    await page.waitForTimeout(300)
    for (let tier = 1; tier <= 8; tier++) assert.ok(await page.locator(`.field-unit.sprite-${tier}`).count())
    await page.screenshot({ path: 'test-results/step2-eight-tiers.png', fullPage: true })
  })

  await test('UI · Tickspeed single and maximum clicks match original', async () => {
    const setup = 'Currency.antimatter.value=new Decimal("1e12"); buyOneDimension(1); buyOneDimension(2);'
    await prepare(setup)
    await engine.locator('.tickspeed-btn').click()
    await engine.locator('.tickspeed-max-btn').click()
    await compare(setup, 'buyTickSpeed(); buyMaxTickSpeed();')
  })

  await test('UI · Galaxy threshold, cancellation and confirmation match original', async () => {
    const setup = 'player.dimensionBoosts=4; AntimatterDimension(8).amount=new Decimal(80);'
    await prepare('player.dimensionBoosts=4; AntimatterDimension(8).amount=new Decimal(79);')
    assert.equal(await action('galaxy').isDisabled(), true)
    await engine.evaluate(() => { AntimatterDimension(8).amount=new Decimal(80); player.options.confirmations.antimatterGalaxy=true; GameUI.update() })
    await action('galaxy').click()
    await cancel()
    assert.equal(await engine.evaluate(() => player.galaxies), 0)
    await action('galaxy').click()
    await confirm()
    await compare(setup, 'manualRequestGalaxyReset(false);')
    await page.waitForTimeout(300)
    assert.equal(await page.locator('.field-unit').count(), 0)
  })

  await test('UI · Sacrifice cancellation, reward and retained eighth tier match original', async () => {
    const setup = 'player.dimensionBoosts=5; AntimatterDimensions.all.forEach(d=>d.amount=new Decimal(100)); AntimatterDimension(1).amount=new Decimal("1e12"); Achievement(18).unlock();'
    await prepare(setup)
    await engine.evaluate(() => { player.options.confirmations.sacrifice=true; GameUI.update() })
    await action('sacrifice').click()
    await cancel()
    assert.equal(await engine.evaluate(() => player.sacrificed.toString()), '0')
    await action('sacrifice').click()
    await confirm()
    await compare(setup, 'sacrificeReset();')
    await page.waitForTimeout(300)
    assert.equal(await page.locator('.field-unit.sprite-1').count(), 0)
    assert.ok(await page.locator('.field-unit.sprite-8').count())
  })

  await test('UI · First Infinity threshold and mandatory confirmation match original', async () => {
    await prepare('Currency.antimatter.value=new Decimal("1e307"); player.records.thisInfinity.maxAM=new Decimal("1e307");')
    assert.equal(await action('crunch').count(), 0)
    const setup = 'Currency.antimatter.value=new Decimal("1e309"); player.records.thisInfinity.maxAM=new Decimal("1e309"); player.records.thisInfinity.time=120000; player.records.thisInfinity.realTime=120000;'
    await prepare(setup)
    await action('crunch').click()
    await cancel()
    assert.equal(await engine.evaluate(() => player.infinities.toString()), '0')
    await action('crunch').click()
    await page.screenshot({ path: 'test-results/step2-first-infinity-confirm.png', fullPage: true })
    await confirm()
    await compare(setup, 'bigCrunchReset();')
    assert.equal(await engine.evaluate(() => PlayerProgress.infinityUnlocked()), true)
    // Use a normal first run so the shared upstream message modal is not overwritten
    // by the under-one-minute achievement while the delayed animation tip opens.
    const acknowledge = engine.getByRole('button', { name: '知道了', exact: true })
    await engine.getByText(/每次手动转生都会播放这一动画/).waitFor()
    await acknowledge.waitFor()
    await page.setViewportSize({ width: 320, height: 1000 })
    await page.waitForTimeout(300)
    assert.equal(await engine.locator('.c-modal').evaluate(e => {
      const r=e.getBoundingClientRect(); return r.left>=0 && r.right<=innerWidth && e.scrollWidth<=e.clientWidth
    }), true, 'First Infinity message must fit at 320px')
    await page.screenshot({ path: 'test-results/step2-animation-message-320.png', fullPage: true })
    await acknowledge.click()
    // Separately exercise the original fast-Infinity achievement's UI callback.
    await engine.evaluate(() => { Achievement(55).unlock(); GameUI.update() })
    await engine.getByText(/你在一分钟内完成了转生/).waitFor()
    assert.equal(await engine.locator('.c-modal').evaluate(e => {
      const r=e.getBoundingClientRect(); return r.left>=0 && r.right<=innerWidth && e.scrollWidth<=e.clientWidth
    }), true, 'Fast Infinity message must fit at 320px')
    await page.screenshot({ path: 'test-results/step2-first-infinity-message-320.png', fullPage: true })
    await acknowledge.click()
    await engine.waitForFunction(() => !ui.view.modal.current)
    await page.setViewportSize({ width: 1440, height: 1000 })
  })

  await test('UI · Army left, controls right; responsive reset buttons remain reachable', async () => {
    await prepare('player.dimensionBoosts=4; Currency.antimatter.value=new Decimal("1e100"); for(let t=1;t<=8;t++) buyOneDimension(t);')
    for (const width of [320, 375, 414, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 })
      await page.waitForTimeout(150)
      assert.equal(await engine.evaluate(() => Boolean(ui.view.modal.current)), false, 'Unexpected modal at ' + width)
      const scene = await page.locator('.battle-panel').boundingBox()
      const panel = await page.locator('.management-panel').boundingBox()
      if (width > 800) assert.ok(scene.x + scene.width <= panel.x)
      else assert.ok(scene.y + scene.height <= panel.y)
      assert.equal(await engine.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
      for (const name of ['boost', 'galaxy', 'sacrifice']) {
        await action(name).scrollIntoViewIfNeeded()
        assert.equal(await action(name).isVisible(), true)
        assert.equal(await action(name).evaluate(e => {
          const r=e.getBoundingClientRect()
          const hit=document.elementFromPoint(r.x+r.width/2, r.y+r.height/2)
          return r.left>=0 && r.right<=innerWidth && e.scrollWidth<=e.clientWidth && (hit===e || e.contains(hit))
        }), true, name + ' clipped at ' + width)
      }
      await engine.evaluate(() => { window.scrollTo(0, 0); document.body.scrollTop=0; document.documentElement.scrollTop=0 })
      await page.screenshot({ path: `test-results/step2-width-${width}.png`, fullPage: true })
    }
    await page.getByRole('button', { name: '展开经营', exact: true }).click()
    assert.equal(await page.locator('.battle-panel').isVisible(), false)
    await page.getByRole('button', { name: '显示军团', exact: true }).click()
    assert.equal(await page.locator('.battle-panel').isVisible(), true)
  })
}
