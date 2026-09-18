import assert from 'node:assert/strict'
import fs from 'node:fs'
import { chromium } from '@playwright/test'
import { outputPath } from './output.mjs'

// No fixture or simulation calls: this same smoke path runs on the public site.
export async function siteSmoke(base, reportName = 'pages') {
  const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'chrome' } : {}) })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  const report = { url: base, time: new Date().toISOString(), errors: [], failedRequests: [], responses: [], pass: false }
  page.on('pageerror', e => report.errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error') report.errors.push(m.text()) })
  page.on('requestfailed', r => report.failedRequests.push({ url: r.url(), error: r.failure()?.errorText }))
  page.on('response', r => { report.responses.push({ url: r.url(), status: r.status() }) })
  try {
    assert.ok((await page.goto(base)).ok())
    let engine = await page.locator('iframe').elementHandle().then(e => e.contentFrame())
    await page.getByText('本地存档 · 自动保存', { exact: true }).waitFor({ timeout: 60000 })
    await engine.locator('[data-buy-tier="1"]').click()
    await page.locator('.field-unit.sprite-1').first().waitFor()
    await page.getByRole('button', { name: '军团展示' }).click()
    const row = page.locator('.roster > div').filter({ hasText: '骷髅兵' })
    report.armyBefore = await row.locator('b').innerText()
    assert.equal(Number(report.armyBefore), 1)
    await page.getByRole('button', { name: '保存', exact: true }).click()
    await page.getByText('进度已保存', { exact: true }).waitFor()
    await page.reload()
    engine = await page.locator('iframe').elementHandle().then(e => e.contentFrame())
    await page.getByText('本地存档 · 自动保存', { exact: true }).waitFor({ timeout: 60000 })
    await page.locator('.field-unit.sprite-1').first().waitFor()
    await page.getByRole('button', { name: '军团展示' }).click()
    report.armyAfter = await page.locator('.roster > div').filter({ hasText: '骷髅兵' }).locator('b').innerText()
    assert.equal(report.armyAfter, report.armyBefore)
    assert.ok(await engine.locator('[data-buy-tier="1"]').isVisible())
    assert.equal(await page.locator('.game-layout > :first-child').getAttribute('aria-label'), '高塔经营')
    assert.deepEqual(report.responses.filter(r => r.status >= 400), [])
    assert.deepEqual(report.failedRequests, [])
    assert.deepEqual(report.errors, [])
    await page.screenshot({ path: outputPath(reportName + '.png'), fullPage: true })
    report.pass = true
    console.log('PASS: site load, real purchase, army, save and reload:', base)
  } catch (error) {
    report.failure = error.stack
    await page.screenshot({ path: outputPath(reportName + '-failure.png'), fullPage: true }).catch(() => {})
    throw error
  } finally {
    fs.writeFileSync(outputPath(reportName + '-report.json'), JSON.stringify(report, null, 2))
    await browser.close()
  }
}
