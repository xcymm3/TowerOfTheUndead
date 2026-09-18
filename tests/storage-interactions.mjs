import assert from 'node:assert/strict'
import fs from 'node:fs'
import { outputPath } from './output.mjs'

export async function storageInteractions({ page, engine, reference, reset, test }) {
  const frames = [engine, reference]
  const trace = [{ fixture: 'Stopped intervals and fixed clock; synthetic stage resources are explicitly assigned. Save import/export, slot selection and backup restore use real UI. No legacy-save corpus or natural full progression claim.' }]
  const settle = async () => {
    for (const frame of frames) await frame.evaluate(() => {
      GameIntervals.stop(); Lazy.invalidateAll(); GameUI.update()
    })
    await page.waitForTimeout(120)
  }
  const mutate = async script => {
    for (const frame of frames) await frame.evaluate(s => Function(s)(), script)
    await settle()
  }
  const snapshot = frame => frame.evaluate(() => ({
    slot: GameStorage.currentSlot, souls: player.antimatter.toString(),
    army: AntimatterDimensions.all.map(d => [d.amount.toString(), d.bought]),
    infinities: player.infinities.toString(), eternities: player.eternities.toString(), realities: player.realities,
    ip: player.infinityPoints.toString(), ep: player.eternityPoints.toString(),
    rm: player.reality.realityMachines.toString(), studies: player.timestudy.studies,
    seed: player.reality.seed, glyphs: JSON.parse(JSON.stringify(player.reality.glyphs)),
  }))
  const parity = async label => {
    const actual = await snapshot(engine)
    const expected = await snapshot(reference)
    trace.push({ label, actual, expected })
    fs.writeFileSync(outputPath('storage-operations.json'), JSON.stringify(trace, null, 2))
    assert.deepEqual(actual, expected, label)
    return actual
  }
  const click = async selector => {
    for (const frame of frames) await frame.locator(selector).click({ timeout: 5000 })
    await settle()
  }
  const prepare = async () => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    for (const frame of frames) {
      await frame.evaluate(() => { GameStorage.currentSlot = 0; GameStorage.saves = { 0: undefined, 1: undefined, 2: undefined } })
      await reset(frame)
    }
    await mutate('Tab.options.saving.show(true);')
  }
  const openImport = () => click('[onclick="Modal.import.show()"]')

  await test('Storage UI · File export, stage import and invalid input preservation', async () => {
    await prepare()
    await mutate('player.infinities=new Decimal(12); player.eternities=new Decimal(34); player.realities=5; Currency.infinityPoints.value=new Decimal("1e400"); Currency.eternityPoints.value=new Decimal("1e5000"); Currency.realityMachines.value=new Decimal(123); player.timestudy.studies=[11,21]; Currency.antimatter.value=new Decimal(12345); AntimatterDimension(1).amount=new Decimal(0); AntimatterDimension(1).bought=7;')
    const initial = await parity('synthetic reality-stage save before export')
    const exports = []
    for (const [index, frame] of frames.entries()) {
      const host = index === 0 ? page : reference
      const pending = host.waitForEvent('download')
      await frame.locator('[onclick="GameStorage.exportAsFile()"]').click()
      const download = await pending
      const target = outputPath(`storage-export-${index}.txt`)
      await download.saveAs(target)
      exports.push(fs.readFileSync(target, 'utf8'))
    }
    await settle()
    await mutate('Currency.antimatter.value=new Decimal(99);')
    await openImport()
    for (const [index, frame] of frames.entries()) {
      await frame.locator('.c-modal-import__input').fill(exports[index])
      await frame.locator('.c-modal__confirm-btn').click()
    }
    await settle()
    assert.deepEqual(await parity('downloaded file imported through text modal'), initial)
    const malformed = await engine.evaluate(() => [
      GameSaveSerializer.serialize({ unrelated: true }),
      GameSaveSerializer.serialize({ antimatter: 'NaN' }),
    ])
    for (const invalid of ['not-a-save', exports[0].slice(0, 40), ...malformed]) {
      const before = await snapshot(engine)
      const savedBefore = await engine.evaluate(() => localStorage.getItem(GameStorage.localStorageKey))
      await openImport()
      for (const frame of frames) {
        await frame.locator('.c-modal-import__input').fill(invalid)
        assert.equal(await frame.locator('.c-modal__confirm-btn').count(), 0)
        await frame.locator('.c-modal-import__input').press('Enter')
      }
      await settle()
      assert.deepEqual(await parity('invalid import blocked: ' + invalid.slice(0, 20)), before)
      assert.equal(await engine.evaluate(() => localStorage.getItem(GameStorage.localStorageKey)), savedBefore)
      for (const frame of frames) await frame.locator('.c-modal-import__input').press('Escape')
      await settle()
    }
    // Exercise the file-input route too: invalid file must leave the current save intact.
    for (const frame of frames) await frame.locator('input.c-file-import').setInputFiles({ name: 'damaged.txt', mimeType: 'text/plain', buffer: Buffer.from('invalid-save-file') })
    await settle()
    assert.deepEqual(await parity('invalid file import preserves stage state'), initial)
    await mutate('Modal.hideAll();')
    for (const [index, frame] of frames.entries()) await frame.locator('input.c-file-import').setInputFiles({ name: 'stage.txt', mimeType: 'text/plain', buffer: Buffer.from(exports[index]) })
    await settle()
    assert.deepEqual(await parity('valid file import restores stage state'), initial)
    await page.screenshot({ path: outputPath('storage-import.png'), fullPage: true })
  })

  await test('Storage UI · Three isolated slots and backup recovery with reserve undo', async () => {
    await prepare()
    const select = async index => {
      await mutate('Tab.options.saving.show(true);')
      await click('[onclick="Modal.loadGame.show()"]')
      for (const frame of frames) await frame.locator('.l-modal-options__save-record').nth(index).locator('button').click()
      await mutate('Tab.options.saving.show(true);')
    }
    for (let index = 0; index < 3; index++) {
      await select(index)
      await mutate(`player.options.offlineProgress=false; Currency.antimatter.value=new Decimal(${100 + index}); AntimatterDimension(1).bought=${index + 1};`)
      await click('[onclick="GameStorage.save(false, true)"]')
      await parity(`save slot ${index + 1}`)
    }
    for (const index of [0, 2, 1, 0]) {
      await select(index)
      const state = await parity(`reload isolated slot ${index + 1}`)
      assert.equal(state.souls, String(100 + index))
      assert.equal(state.army[0][1], index + 1)
    }
    // Drive the original automatic backup timer; recovery itself is a real button click.
    await mutate('player.backupTimer=60000; GameStorage.loadBackupTimes(); GameStorage.tryOnlineBackups(); Currency.antimatter.value=new Decimal(777); player.options.loadBackupWithoutOffline=true;')
    const restore = async index => {
      await mutate('Tab.options.saving.show(true);')
      await click('[onclick="Modal.backupWindows.show()"]')
      for (const frame of frames) await frame.locator('.l-backup-entry').nth(index).locator('button').click()
      await settle()
    }
    await restore(0)
    assert.equal((await parity('automatic one-minute backup restores earlier balance')).souls, '100')
    await restore(7)
    assert.equal((await parity('reserve backup undoes recovery')).souls, '777')
    const namespaces = []
    for (const frame of frames) {
      const keys = await frame.evaluate(() => ({ main: GameStorage.localStorageKey, backup: GameStorage.backupDataKey(0, 1), times: GameStorage.backupTimeKey(0) }))
      namespaces.push(keys)
      trace.push({ storageKeys: keys })
    }
    for (const field of ['main', 'backup', 'times']) assert.notEqual(namespaces[0][field], namespaces[1][field])
    assert.equal(await engine.evaluate(() => localStorage.getItem('dimensionSave')), null)
    await parity('final slot and backup namespace record')
  })

  await test('Storage load · Original offline calculation and disabled offline control', async () => {
    await prepare()
    // This is a core load comparison, separate from the UI import coverage above.
    // Stop immediately in the same JS task after synchronous 20-second fast simulation,
    // so real-time online ticks cannot contaminate the deterministic comparison.
    for (const enabled of [false, true]) {
      for (const frame of frames) {
        await reset(frame)
        await frame.evaluate(offline => {
          AntimatterDimension(1).amount = new Decimal(1)
          AntimatterDimension(1).bought = 1
          player.options.offlineProgress = offline
          player.lastUpdate = Date.now() - 20000
          const serialized = GameStorage.exportModifiedSave()
          GameStorage.offlineEnabled = undefined
          GameStorage.offlineTicks = undefined
          GameStorage.loadPlayerObject(GameSaveSerializer.deserialize(serialized))
          GameIntervals.stop()
          Modal.hideAll()
        }, enabled)
      }
      const state = await parity(`20-second actual load simulation: offline=${enabled}`)
      if (enabled) assert.ok(Number(state.souls) > 29, 'offline load must produce resources')
      else assert.equal(state.souls, '10', 'disabled offline must not produce resources')
      assert.equal(state.army[0][1], 1)
    }
  })
}
