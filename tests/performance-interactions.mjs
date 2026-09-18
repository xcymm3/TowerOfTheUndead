import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import { performance } from 'node:perf_hooks'
import { outputPath } from './output.mjs'

// A bounded display/response benchmark, not a natural late-game progression fixture.
export async function performanceInteractions({ page, engine, reset, test }) {
  await test('Performance · Large-number scene stays bounded and responds across six widths', async () => {
    const report = {
      environment: {
        platform: process.platform, release: os.release(), cpu: os.cpus()[0]?.model,
        logicalCpus: os.cpus().length, node: process.version,
        browser: page.context().browser().version(),
        userAgent: await page.evaluate(() => navigator.userAgent),
      },
      method: 'Same headless browser, 1440x1000; stopped simulation timers; synthetic resources and eight unit amounts. 60 requestAnimationFrame intervals in outer and engine documents; 20 explicit original 50ms simulation ticks. Timings are observations, not an FPS certification or natural progression proof.',
      samples: [], widths: [],
    }
    const write = () => fs.writeFileSync(outputPath('performance-operations.json'), JSON.stringify(report, null, 2))
    const frames = target => target.evaluate(() => new Promise(resolve => {
      const values = []
      let previous
      function frame(now) {
        if (previous !== undefined) values.push(now - previous)
        previous = now
        if (values.length < 60) requestAnimationFrame(frame)
        else {
          const sorted = [...values].sort((a, b) => a - b)
          resolve({ count: values.length, medianMs: sorted[30], p95Ms: sorted[56], maxMs: sorted[59] })
        }
      }
      requestAnimationFrame(frame)
    }))
    try {
      await page.setViewportSize({ width: 1440, height: 1000 })
      for (const [label, amount, souls] of [
        ['initial-scale', '1', '1e6'],
        ['large', '1e1000', '1e10000'],
        ['larger', '1e100000', '1e1000000'],
      ]) {
        await reset(engine)
        await engine.evaluate(({ amount, souls }) => {
          player.break = true
          player.infinities = new Decimal(1)
          player.dimensionBoosts = 4
          Currency.antimatter.value = new Decimal(souls)
          AntimatterDimensions.all.forEach(d => { d.amount = new Decimal(amount) })
          Tab.dimensions.antimatter.show(true)
          Lazy.invalidateAll()
          GameUI.update()
        }, { amount, souls })
        await page.waitForTimeout(500)
        const expected = await engine.evaluate(() => UndeadTower.snapshot())
        const sprites = await page.locator('.field-unit').count()
        assert.equal(sprites, expected.army.reduce((sum, unit) => sum + unit.representatives, 0))
        assert.ok(sprites <= 24, 'Unit counts must not allocate unbounded display nodes')
        assert.equal(await page.locator('.resource.souls strong').innerText(), expected.souls)
        assert.ok(!/Infinity|NaN|无穷/.test(expected.souls), 'Finite large currency should remain readable')
        const start = performance.now()
        await page.getByRole('button', { name: '♟ 军团展示' }).click()
        await page.locator('.roster').waitFor({ state: 'visible' })
        const rosterResponseMs = performance.now() - start
        assert.deepEqual(await page.locator('.roster > div:not(.roster-heading) b').allTextContents(), expected.army.map(u => u.amount))
        await page.getByRole('button', { name: '关闭名册' }).click()
        const tickTimes = await engine.evaluate(() => {
          const times = []
          for (let i = 0; i < 20; i++) {
            const start = performance.now()
            gameLoop(50)
            times.push(performance.now() - start)
          }
          return times
        })
        const sample = {
          label, fixture: { amount, souls }, displayedSouls: expected.souls,
          sprites, outerNodes: await page.locator('*').count(), engineNodes: await engine.locator('*').count(),
          rosterResponseMs, tickTimesMs: tickTimes,
          outerFrames: await frames(page), engineFrames: await frames(engine),
        }
        report.samples.push(sample)
        write()
      }
      assert.equal(report.samples[1].sprites, report.samples[2].sprites)
      // Synthetic ticks award many achievements at once. Preserve their actual lifecycle;
      // measure the settled layout only after the original notification timers finish.
      await engine.locator('#notification-container .o-notification').last().waitFor({ state: 'hidden', timeout: 15000 })
      // No timing threshold: shared-runner contention is recorded rather than hidden by a flaky FPS gate.
      for (const width of [320, 375, 414, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 1000 })
        await page.waitForTimeout(150)
        const outerFits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
        const engineFits = await engine.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
        const rowsReadable = await engine.locator('.army-row').evaluateAll(rows => rows.every(row => {
          const cells = [...row.children].map(node => node.getBoundingClientRect())
          const overlap = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
            Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
          return cells.every((cell, i) => cells.slice(i + 1).every(other => !overlap(cell, other))) &&
            [...row.querySelectorAll('h2, b, .army-multiplier')].every(node => {
              const range = document.createRange()
              range.selectNodeContents(node)
              const text = range.getBoundingClientRect()
              const cell = node.closest('.army-identity, .army-quantity, .army-price').getBoundingClientRect()
              return text.left >= cell.left - 1 && text.right <= cell.right + 1 &&
                text.top >= cell.top - 1 && text.bottom <= cell.bottom + 1
            })
        }))
        const boughtBefore = await engine.evaluate(() => AntimatterDimension(1).bought)
        await engine.locator('.army-row[data-tier="1"] button').click()
        const boughtAfter = await engine.evaluate(() => AntimatterDimension(1).bought)
        assert.ok(boughtAfter > boughtBefore, `Large-number purchase must work at ${width}`)
        const start = performance.now()
        await page.getByRole('button', { name: '♟ 军团展示' }).click()
        await page.locator('.roster').waitFor({ state: 'visible' })
        const responseMs = performance.now() - start
        const valuesFit = await page.locator('.roster b').evaluateAll(nodes => nodes.every(node => node.scrollWidth <= node.clientWidth + 1))
        report.widths.push({ width, outerFits, engineFits, valuesFit, rowsReadable, boughtBefore, boughtAfter, rosterResponseMs: responseMs })
        write()
        await page.screenshot({ path: outputPath(`performance-large-${width}.png`), fullPage: true })
        assert.ok(outerFits && engineFits && valuesFit && rowsReadable, `Large-number layout overflow or overlap at ${width}`)
        await page.getByRole('button', { name: '关闭名册' }).click()
      }
    } finally {
      write()
      await page.setViewportSize({ width: 1440, height: 1000 })
      await reset(engine)
      await engine.evaluate(() => Tab.dimensions.antimatter.show(true))
    }
  })
}
