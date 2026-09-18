import assert from 'node:assert/strict'
import fs from 'node:fs'
import { outputPath } from './output.mjs'

export async function storageInteractions({ page, engine, reference, reset, test }) {
  const frames = [engine, reference]
  const trace = [{ fixture: 'Stopped intervals and fixed clock; synthetic stage resources are explicitly assigned. Save import/export, slot selection and backup restore use real UI. Legacy encoding/root migration, five representative current-stage round trips, damaged storage recovery, all eight automatic slots, backup archives and bounded long-offline loads are covered; fixtures are not claimed as natural progression.' }]
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
    doomed: player.celestials.pelle.doomed, teresaUnlocks: player.celestials.teresa.unlockBits,
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

  await test('Storage compatibility · Legacy encoding, five stages and damaged-root recovery', async () => {
    await prepare()
    const stageFixtures = [
      ['early', 'Currency.antimatter.value=new Decimal(321); AntimatterDimension(1).bought=3;'],
      ['midgame', 'player.infinities=new Decimal(12); player.eternities=new Decimal(2); Currency.infinityPoints.value=new Decimal("1e90"); player.timestudy.studies=[11,21,31];'],
      ['reality', 'player.infinities=new Decimal(100); player.eternities=new Decimal(200); player.realities=4; Currency.realityMachines.value=new Decimal(456);'],
      ['celestial', 'player.realities=100; player.celestials.teresa.unlockBits=7; Currency.realityMachines.value=new Decimal("1e20");'],
      ['endgame', 'player.realities=100; player.celestials.pelle.doomed=true; player.celestials.pelle.remnants=9; player.celestials.pelle.realityShards=new Decimal(1234);'],
    ]
    for (const [stage, fixture] of stageFixtures) {
      for (const frame of frames) {
        await reset(frame)
        await frame.evaluate(script => {
          Function(script)()
          player.options.offlineProgress = false
          const encoded = GameStorage.exportModifiedSave()
          GameStorage.loadPlayerObject(GameSaveSerializer.deserialize(encoded))
          GameIntervals.stop(); Modal.hideAll()
        }, fixture)
      }
      await parity(`current serializer round trip: ${stage}`)
    }

    // The pre-Reality serializer was plain base64 and single-slot saves stored the player as the root object.
    for (const frame of frames) {
      await reset(frame)
      await frame.evaluate(() => {
        Currency.antimatter.value = new Decimal(7654)
        player.infinities = new Decimal(7)
        player.options.offlineProgress = false
        const oldEncoded = btoa(JSON.stringify(player, GameSaveSerializer.jsonConverter))
        localStorage.setItem(GameStorage.localStorageKey, oldEncoded)
        GameStorage.load()
        GameIntervals.stop(); Modal.hideAll()
      })
    }
    const legacy = await parity('plain-base64 single-root save migrates to current three-slot root')
    assert.equal(legacy.souls, '7654')
    for (const frame of frames) assert.equal(await frame.evaluate(() => {
      const root = GameSaveSerializer.deserialize(localStorage.getItem(GameStorage.localStorageKey))
      return root.current === 0 && root.saves[0].antimatter === '7654'
    }), true)

    // Keep a valid recovery point, corrupt the main root, load the safe default, then recover using the real backup UI.
    for (const frame of frames) await frame.evaluate(() => {
      Currency.antimatter.value = new Decimal(4242)
      player.options.loadBackupWithoutOffline = true
      GameStorage.loadBackupTimes()
      GameStorage.saveToBackup(1, 60000)
      localStorage.setItem(GameStorage.localStorageKey, 'damaged-root-save')
      GameStorage.load()
      GameIntervals.stop(); Modal.hideAll(); Tab.options.saving.show(true); GameUI.update()
    })
    assert.equal((await parity('damaged main root falls back to a safe new player')).souls, '10')
    await click('[onclick="Modal.backupWindows.show()"]')
    for (const frame of frames) await frame.locator('.l-backup-entry').nth(0).locator('button').click()
    await settle()
    assert.equal((await parity('valid automatic backup recovers the damaged main root')).souls, '4242')

    for (const frame of frames) await frame.evaluate(() => {
      localStorage.setItem(GameStorage.backupDataKey(GameStorage.currentSlot, 2), 'damaged-backup')
      Tab.options.saving.show(true); Modal.backupWindows.show(); GameUI.update()
    })
    await settle()
    for (const frame of frames) assert.match(await frame.locator('.l-backup-entry').nth(1).locator('button').getAttribute('class'), /disabled/)
    assert.equal((await parity('damaged backup slot is disabled without changing the recovered state')).souls, '4242')
    await mutate('Modal.hideAll();')
  })

  await test('Storage backups · All eight slots and archive export/import', async () => {
    await prepare()
    for (const frame of frames) await frame.evaluate(() => GameStorage.loadBackupTimes())
    for (let id = 1; id <= 8; id++) {
      await mutate(`Currency.antimatter.value=new Decimal(${1000 + id}); player.backupTimer=${id * 60000}; GameStorage.saveToBackup(${id}, player.backupTimer);`)
    }
    for (const frame of frames) {
      const contents = await frame.evaluate(() => Array.from({ length: 8 }, (_, index) => ({
        id: index + 1,
        souls: GameStorage.loadFromBackup(index + 1)?.antimatter,
        timer: GameStorage.lastBackupTimes[index + 1]?.backupTimer,
      })))
      assert.deepEqual(contents, Array.from({ length: 8 }, (_, index) => ({
        id: index + 1, souls: String(1001 + index), timer: (index + 1) * 60000,
      })))
    }
    await mutate('Currency.antimatter.value=new Decimal(9999); player.options.loadBackupWithoutOffline=true;')

    const archives = []
    await mutate('Tab.options.saving.show(true);')
    await click('[onclick="Modal.backupWindows.show()"]')
    for (const [index, frame] of frames.entries()) {
      const host = index === 0 ? page : reference
      const pending = host.waitForEvent('download')
      await frame.locator('[onclick="GameStorage.exportBackupsAsFile()"] ').click()
      const download = await pending
      const target = outputPath(`backup-archive-${index}.txt`)
      await download.saveAs(target)
      archives.push(fs.readFileSync(target, 'utf8'))
    }
    await settle()
    await mutate('Modal.hideAll();')

    // Slot 8 must be restored first because every later recovery intentionally overwrites it as the reserve undo slot.
    for (const id of [8, 1, 2, 3, 4, 5, 6, 7]) {
      await mutate('Tab.options.saving.show(true);')
      await click('[onclick="Modal.backupWindows.show()"]')
      for (const frame of frames) await frame.locator('.l-backup-entry').nth(id - 1).locator('button').click()
      await settle()
      assert.equal((await parity(`real backup UI restores slot ${id}`)).souls, String(1000 + id))
    }

    for (const frame of frames) await frame.evaluate(() => {
      for (let id = 1; id <= 8; id++) localStorage.removeItem(GameStorage.backupDataKey(GameStorage.currentSlot, id))
      localStorage.removeItem(GameStorage.backupTimeKey(GameStorage.currentSlot))
      GameStorage.loadBackupTimes(); Tab.options.saving.show(true); Modal.backupWindows.show(); GameUI.update()
    })
    await settle()
    for (const [index, frame] of frames.entries()) await frame.locator('.c-modal input.c-file-import').setInputFiles({
      name: 'backup-archive.txt', mimeType: 'text/plain', buffer: Buffer.from(archives[index])
    })
    await settle()
    for (const frame of frames) assert.deepEqual(await frame.evaluate(() => Array.from({ length: 8 }, (_, index) =>
      GameStorage.loadFromBackup(index + 1)?.antimatter)), Array.from({ length: 8 }, (_, index) => String(1001 + index)))
    await parity('backup archive restores all eight slots and their timers')

    const beforeInvalid = await engine.evaluate(() => Array.from({ length: 8 }, (_, index) =>
      localStorage.getItem(GameStorage.backupDataKey(GameStorage.currentSlot, index + 1))))
    for (const frame of frames) await frame.locator('.c-modal input.c-file-import').setInputFiles({
      name: 'damaged-backups.txt', mimeType: 'text/plain', buffer: Buffer.from('not-a-backup-archive')
    })
    await settle()
    assert.deepEqual(await engine.evaluate(() => Array.from({ length: 8 }, (_, index) =>
      localStorage.getItem(GameStorage.backupDataKey(GameStorage.currentSlot, index + 1)))), beforeInvalid)
    await parity('damaged backup archive is rejected without overwriting valid backups')
    await mutate('Modal.hideAll();')
  })

  await test('Storage offline · 24-hour and seven-day bounded simulations with controls', async () => {
    await prepare()
    const runLongOffline = async ({ seconds, lateGame, control }) => {
      for (const frame of frames) await reset(frame)
      await Promise.all(frames.map(frame => frame.evaluate(({ seconds, lateGame, control }) => {
        AntimatterDimension(1).amount = new Decimal(1)
        AntimatterDimension(1).bought = 1
        if (lateGame) {
          player.infinities = new Decimal(1000)
          player.eternities = new Decimal(100)
          player.realities = 25
          player.celestials.teresa.unlockBits = 7
        }
        player.options.offlineProgress = true
        player.options.offlineTicks = 2000
        player.lastUpdate = Date.now() - seconds * 1000
        const saved = GameSaveSerializer.deserialize(GameStorage.exportModifiedSave())
        GameStorage.offlineTicks = 2000
        // Force the same one-tick first batch in both independent pages. This makes the original asynchronous
        // Speed up/SKIP callbacks fire at an identical progress boundary instead of depending on host CPU timing.
        const originalRun = Async.run
        const originalRunForTime = Async.runForTime
        let firstBatch = true
        Async.runForTime = function(fun, maxIter, config) {
          if (!firstBatch) return originalRunForTime.call(this, fun, maxIter, config)
          firstBatch = false
          fun(maxIter)
          return maxIter - 1
        }
        Async.run = function(fun, maxIter, config) {
          const originalEntry = config.asyncEntry
          config.asyncEntry = doneSoFar => {
            originalEntry(doneSoFar)
            const progress = ui.view.modal.progressBar
            if (control === 'speed-and-skip') progress.buttons[0].click()
            progress.buttons.at(-1).click()
          }
          return originalRun.call(this, fun, maxIter, config)
        }
        GameStorage.loadRoot({ current: 0, saves: { 0: saved, 1: undefined, 2: undefined } })
        Async.run = originalRun
        Async.runForTime = originalRunForTime
      }, { seconds, lateGame, control })))
      for (const frame of frames) await frame.waitForFunction(() => ui.view.modal.progressBar === undefined, null, { timeout: 30000 })
      for (const frame of frames) await frame.evaluate(() => {
        GameIntervals.stop(); Modal.hideAll(); Date.now = () => 1800000000000
      })
      const actual = await snapshot(engine)
      const expected = await snapshot(reference)
      const label = `${seconds / 3600}-hour offline load (${lateGame ? 'late-stage' : 'early-stage'}, ${control})`
      trace.push({ label, actual, expected, comparison: 'Both pages enter the asynchronous branch after one deterministic test batch, then invoke the original Speed up/SKIP callbacks at the same progress point; all discrete state is exact and continuously produced souls allow 0.1% tolerance.' })
      fs.writeFileSync(outputPath('storage-operations.json'), JSON.stringify(trace, null, 2))
      const actualSouls = Number(actual.souls)
      const expectedSouls = Number(expected.souls)
      assert.ok(actualSouls > 10 && expectedSouls > 10)
      assert.ok(Math.abs(actualSouls - expectedSouls) / Math.max(actualSouls, expectedSouls) < 1e-3, label)
      const actualDiscrete = { ...actual }
      const expectedDiscrete = { ...expected }
      delete actualDiscrete.souls
      delete expectedDiscrete.souls
      assert.deepEqual(actualDiscrete, expectedDiscrete, label)
      for (const frame of frames) assert.equal(await frame.evaluate(() => Boolean(GameStorage.loadFromBackup(7))), true,
        'five-hour offline backup must be populated')
      return actual
    }
    await runLongOffline({ seconds: 24 * 3600, lateGame: false, control: 'speed-and-skip' })
    await runLongOffline({ seconds: 7 * 24 * 3600, lateGame: true, control: 'skip' })

    for (const frame of frames) {
      await reset(frame)
      await frame.evaluate(() => {
        AntimatterDimension(1).amount = new Decimal(1)
        AntimatterDimension(1).bought = 1
        player.options.offlineProgress = false
        player.lastUpdate = Date.now() - 7 * 86400 * 1000
        GameStorage.loadPlayerObject(GameSaveSerializer.deserialize(GameStorage.exportModifiedSave()))
        GameIntervals.stop(); Modal.hideAll()
      })
    }
    const disabled = await parity('seven-day offline load disabled')
    assert.equal(disabled.souls, '10')
    assert.equal(disabled.army[0][1], 1)
  })
}
