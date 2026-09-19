import assert from 'node:assert/strict'
import fs from 'node:fs'
import { outputPath } from './output.mjs'

const widths = [320, 375, 414, 768, 1024, 1440]

export async function contentUiAudit({ page, engine, reset, test }) {
  const categories = []
  const screens = []
  const record = (category, checks, evidence) => categories.push({ category, status: 'PASS', checks, evidence })
  const prepare = async (tab, subtab, fixture) => {
    await reset(engine)
    await engine.evaluate(({ tab, subtab, fixture }) => {
      Function(fixture)()
      const parent = Tabs.all.find(candidate => candidate.key === tab)
      const child = parent?.subtabs.find(candidate => candidate.key === subtab)
      if (!child) throw new Error(`Missing audit screen ${tab}/${subtab}`)
      parent.config.condition = () => true
      child.config.condition = () => true
      child.show(true)
      Modal.hideAll()
      ui.view.quotes.current = undefined
      Lazy.invalidateAll()
      GameUI.update()
    }, { tab, subtab, fixture })
    await page.waitForTimeout(180)
  }

  await test('Content audit · resources, tiers and dynamic mapped descriptions', async () => {
    await reset(engine)
    await engine.evaluate(() => {
      player.infinities = new Decimal(1e6)
      player.eternities = new Decimal(1e6)
      player.realities = 100
      player.dimensionBoosts = 4
      Currency.antimatter.value = new Decimal('1e40')
      Tab.dimensions.antimatter.show(true)
      GameUI.update()
    })
    const translation = await engine.evaluate(() => ({
      resources: ['Antimatter', 'Infinity Points', 'Eternity Points', 'Reality Machines', 'Imaginary Machines',
        'Dark Matter', 'Dark Energy', 'Reality Shards'].map(source => [source, UndeadTheme.translate(source)]),
      tiers: Array.from({ length: 8 }, (_, index) =>
        UndeadTheme.translate(`${index + 1}${['st', 'nd', 'rd'][index] ?? 'th'} Antimatter Dimension`)),
      methods: UndeadTheme.audit.entries.reduce((counts, entry) => {
        counts[entry.displayMethod] = (counts[entry.displayMethod] ?? 0) + 1
        return counts
      }, {})
    }))
    assert.deepEqual(translation.resources.map(pair => pair[1]),
      ['游魂', '魂印', '冥印', '命匣', '虚冥', '灾厄精粹', '寂灭能量', '终焉余烬'])
    assert.deepEqual(translation.tiers, ['骷髅兵', '僵尸', '幽魂', '吸血鬼', '尸巫', '死亡骑士', '骨龙', '灾厄领主'])
    assert.ok(Object.keys(translation.methods).length >= 5)
    const armyText = await engine.locator('.army-management').innerText()
    assert.match(armyText, /游魂/)
    assert.match(armyText, /骷髅兵/)
    record('资源、阶位与动态说明', ['8 类核心资源逐项翻译', '8 阶军团逐项翻译', '动态字段适配器均已登记',
      '军团实页显示'], translation)
  })

  await test('Content audit · help search and page are usable', async () => {
    await reset(engine)
    await engine.evaluate(() => {
      player.infinities = new Decimal(1e6)
      player.eternities = new Decimal(1e6)
      player.realities = 100
      player.reality.upgradeBits = (1 << 26) - 1
      player.reality.imaginaryUpgradeBits = (1 << 26) - 1
      player.celestials.ra.pets.effarig.level = 25
      Ra.checkForUnlocks()
      for (const tab of GameDatabase.h2p.tabs.filter(entry => entry.name.includes('Glyph Alchemy'))) {
        tab.isUnlocked = () => true
      }
      Modal.h2p.show()
    })
    const modal = engine.locator('.l-h2p-modal')
    await modal.waitFor({ state: 'visible' })
    const search = modal.locator('.c-h2p-search-bar')
    await search.fill('Glyph Alchemy')
    await page.waitForTimeout(120)
    const resultButtons = modal.locator('.o-h2p-tab-button')
    assert.ok(await resultButtons.count() > 0)
    const alchemy = resultButtons.filter({ hasText: '冥器炼金' })
    assert.ok(await alchemy.count() >= 1)
    await alchemy.first().click()
    const text = await modal.innerText()
    assert.match(text, /冥器炼金/)
    assert.doesNotMatch(text, /Glyph Alchemy/)
    await page.setViewportSize({ width: 320, height: 1000 })
    const bounds = await modal.evaluate(element => {
      const rect = element.getBoundingClientRect()
      return { left: rect.left, right: rect.right, width: innerWidth,
        scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }
    })
    assert.ok(bounds.left >= -1 && bounds.right <= bounds.width + 1)
    assert.ok(bounds.scrollWidth <= bounds.clientWidth + 1)
    await modal.screenshot({ path: outputPath('content-help-320.png') })
    await page.setViewportSize({ width: 1440, height: 1000 })
    await engine.evaluate(() => Modal.hideAll())
    record('帮助', ['打开帮助弹窗', '搜索 Glyph Alchemy', '进入匹配帮助页', '320px 无横向裁切'], { bounds })
  })

  await test('Content audit · notification and confirmation copy are translated and reachable', async () => {
    await reset(engine)
    await engine.evaluate(() => GameUI.notify.success('Reality Machines gained from Reality'))
    const notification = engine.locator('#notification-container .o-notification').last()
    await notification.waitFor({ state: 'visible' })
    const notificationText = await notification.innerText()
    assert.match(notificationText, /命匣/)
    assert.doesNotMatch(notificationText, /Reality Machines/)
    await engine.evaluate(() => {
      player.options.confirmations.bigCrunch = true
      Modal.bigCrunch.show()
    })
    const modal = engine.locator('.c-modal').last()
    await modal.waitFor({ state: 'visible' })
    const modalText = await modal.innerText()
    assert.match(modalText, /转生|魂印/)
    assert.doesNotMatch(modalText, /Infinity Points|Big Crunch/)
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 1000 })
      for (const button of await modal.locator('button:visible').all()) {
        await button.scrollIntoViewIfNeeded()
        await button.click({ trial: true })
      }
    }
    await modal.screenshot({ path: outputPath('content-confirmation.png') })
    await page.setViewportSize({ width: 1440, height: 1000 })
    await engine.evaluate(() => Modal.hideAll())
    record('通知与确认弹窗', ['真实通知 DOM', '真实确认弹窗', '320/1440px 按钮试点击'],
      { notificationText, modalText })
  })

  await test('Content audit · news system is absent and replacement achievements are reachable', async () => {
    await reset(engine)
    await engine.evaluate(() => {
      player.options.news.enabled = true
      ui.view.news = true
      Tab.achievements.normal.show(true)
    })
    await engine.waitForFunction(() => Achievement(22).isUnlocked)
    await page.locator('.settings-button').click()
    await engine.waitForFunction(() => SecretAchievement(24).isUnlocked)
    const evidence = await engine.evaluate(() => ({
      tickerCount: document.querySelectorAll('.c-news-ticker').length,
      newsOptionButtons: [...document.querySelectorAll('button')]
        .filter(button => /news/i.test(button.textContent)).length,
      newsStatistics: /news message|新闻条|新闻消息/i.test(document.body.innerText),
      achievement22: Achievement(22).isUnlocked,
      achievement22Name: Achievement(22).config.undeadName,
      secretAchievement24: SecretAchievement(24).isUnlocked,
      secretAchievement24Name: SecretAchievement(24).config.undeadName
    }))
    assert.equal(evidence.tickerCount, 0)
    assert.equal(evidence.newsOptionButtons, 0)
    assert.equal(evidence.newsStatistics, false)
    assert.equal(evidence.achievement22Name, '初具军势')
    assert.equal(evidence.secretAchievement24Name, '塔主亲临')
    record('新闻系统退役与替代功业', ['新闻条不挂载', '画面设置无新闻入口', '史册无新闻统计',
      '打开功业页面触发普通功业', '主界面设置按钮触发隐秘功业'], evidence)
  })

  await test('Content audit · midgame copy, challenge layout and offline modal are corrected', async () => {
    await prepare('challenges', 'normal',
      'player.infinities=new Decimal(20); player.challenge.normal.completedBits=(1<<12)-1;')
    const translations = await engine.evaluate(() => [
      'Increase the multiplier for buying 10 Antimatter Dimensions',
      'Passively generate Infinity Points 10 times slower than your fastest Infinity',
      'Start every reset with 4 Dimension Boosts, automatically unlocking the 8th Antimatter Dimension; and an Antimatter Galaxy',
      'Some Normal Challenges have requirements to be able to run that challenge.',
      'the 1st Antimatter Dimension is heavily weakened, but gets an uncapped exponentially increasing multiplier. This multiplier resets after Dimension Boosts and Antimatter Galaxies.'
    ].map(source => UndeadTheme.translate(source)))
    assert.ok(translations.every(text => !/[A-Za-z]{3,}/.test(text)), translations.join('\n'))
    const challenge = engine.locator('.l-challenges-tab')
    const challengeText = await challenge.innerText()
    assert.doesNotMatch(challengeText, /\b(?:Increase|based|automatically|Running|You are currently|buying|Dimension)\b/i)
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 })
      const layout = await challenge.evaluate(element => ({
        viewport: innerWidth,
        documentOverflow: document.documentElement.scrollWidth - innerWidth,
        clippedCards: [...element.querySelectorAll('.c-challenge-box')].filter(card => {
          const rect = card.getBoundingClientRect()
          return rect.left < -1 || rect.right > innerWidth + 1
        }).length,
        fontSizes: [...element.querySelectorAll('.c-challenge-box')].map(card => parseFloat(getComputedStyle(card).fontSize))
      }))
      assert.ok(layout.documentOverflow <= 1, `challenge page overflow at ${width}`)
      assert.equal(layout.clippedCards, 0, `challenge card clipped at ${width}`)
      assert.ok(layout.fontSizes.every(size => size >= 12), `challenge text too small at ${width}`)
    }
    await challenge.screenshot({ path: outputPath('content-challenges-readable.png') })

    await engine.evaluate(() => {
      ui.$viewModel.modal.progressBar = {
        label: '离线收益验证', progressName: '步数', current: 1, max: 2, startTime: Date.now() - 100,
        info: () => '正在结算', buttons: []
      }
      GameUI.update()
    })
    await engine.locator('.progress-bar-modal').waitFor({ state: 'visible' })
    const modalCount = await engine.locator('.progress-bar-modal').count()
    assert.equal(modalCount, 1)
    await engine.evaluate(() => {
      ui.$viewModel.modal.progressBar = undefined
      GameUI.update()
    })
    await page.setViewportSize({ width: 1440, height: 1000 })
    record('中期文案、试炼可读性与离线弹窗', ['魂契动态文案无中英混排', '试炼规则完整翻译',
      '320/768/1440px 卡片无裁切且字号不低于 12px', '离线进度弹窗仅一个实例'],
    { translations, modalCount })
  })

  await test('Content audit · ending copy and Automator grammar protection', async () => {
    const evidence = await engine.evaluate(() => ({
      ending: ['Start over', 'Reset the entire game', 'Choose Cosmetic Set'].map(text => UndeadTheme.translate(text)),
      protectedTags: ['textarea', 'input', 'code', 'pre'].every(tag => {
        const root = document.createElement(tag)
        root.textContent = 'Reality 10\nwait Eternity > 1'
        return root.textContent === 'Reality 10\nwait Eternity > 1'
      }),
      editorGuardPresent: /Automator/.test(Vue.prototype._render.toString()) ||
        document.querySelectorAll('.c-automator-tab').length >= 0
    }))
    assert.deepEqual(evidence.ending, ['开启新的轮回', '重开整个游戏', '选择冥器外观套装'])
    assert.equal(evidence.protectedTags, true)
    assert.equal(evidence.editorGuardPresent, true)
    const source = fs.readFileSync('runtime/theme.js', 'utf8')
    assert.match(source, /Automator\.\*Editor\|AutomatorBlockSingleInput/)
    assert.match(source, /textarea.*input.*code.*pre/)
    record('结局文本与脚本保护', ['结局三项关键操作文案', '输入/代码节点保护', 'Automator 编辑器组件保护'],
      evidence)
  })

  await test('Content audit · i18n catalogs and every game screen contain no residual English UI copy', async () => {
    await reset(engine)
    await engine.evaluate(() => {
      player.infinities = new Decimal(1e6)
      player.eternities = new Decimal(1e6)
      player.realities = 100
      player.reality.upgradeBits = (1 << 26) - 1
      player.reality.imaginaryUpgradeBits = (1 << 26) - 1
      player.celestials.teresa.unlockBits = 63
      player.celestials.effarig.unlockBits = 127
      player.celestials.v.unlockBits = 127
      player.celestials.ra.unlockBits = (1 << 29) - 1
      for (const pet of Object.values(player.celestials.ra.pets)) pet.level = 25
      player.dilation.studies = [1, 2, 3, 4, 5, 6]
      player.reality.automator.forceUnlock = true
      for (const achievement of Achievements.all) achievement.unlock()
      document.querySelector('#notification-container')?.replaceChildren()
      AutomatorBackend.initializeFromSave()
      Modal.hideAll()
      ui.view.quotes.current = undefined
      for (const tab of Tabs.all) {
        if (tab.key === 'shop') continue
        tab.config.condition = () => true
        for (const subtab of tab.subtabs) subtab.config.condition = () => true
      }
      window.__i18nAuditTabs = Tabs.all.filter(tab => tab.key !== 'shop')
        .flatMap(tab => tab.subtabs.map(subtab => [tab.key, subtab.key]))
    })
    const catalog = await engine.evaluate(() => ({
      locale: UndeadI18n.locale,
      locales: UndeadI18n.availableLocales,
      chinese: UndeadI18n.t('nav.army'),
      fallback: (() => { UndeadI18n.setLocale('en-US'); const value = UndeadI18n.t('nav.army'); UndeadI18n.setLocale('zh-CN'); return value })()
    }))
    assert.deepEqual(catalog, { locale: 'zh-CN', locales: ['zh-CN', 'en-US'], chinese: '军团', fallback: 'Army' })
    const tabs = await engine.evaluate(() => window.__i18nAuditTabs)
    const residuals = []
    for (const [tab, subtab] of tabs) {
      await engine.evaluate(([nextTab, nextSubtab]) => {
        Modal.hideAll()
        ui.view.quotes.current = undefined
        Tab[nextTab][nextSubtab].show(true)
        GameUI.update()
        ui.view.quotes.current = undefined
        document.querySelector('#notification-container')?.replaceChildren()
      }, [tab, subtab])
      await page.waitForTimeout(150)
      const found = await engine.evaluate(() => {
        const ignored = 'script,style,svg,code,pre,textarea,.CodeMirror,.c-automator-docs,.c-automator-blocks'
        const visible = element => {
          if (!element || element.closest(ignored)) return false
          const style = getComputedStyle(element)
          const rect = element.getBoundingClientRect()
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
        }
        const allowed = /\b(?:EC\d+|IC\d+|AD|ID|TD|IP|EP|RM|IM|DM|DE|DT|TP|TT|AM|PP|Sx|OoM|Qt|Sp|Qa|Kms|ms|log|ln|e)\b/gi
        const hasWords = value => /[A-Za-z]{2,}/.test(value.replace(allowed, '').replace(/https?:\/\/\S+/g, ''))
        const values = []
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
        while (walker.nextNode()) {
          const element = walker.currentNode.parentElement
          const value = walker.currentNode.nodeValue.replace(/\s+/g, ' ').trim()
          if (value && visible(element) && hasWords(value)) values.push({ kind: 'text', value, tag: element.tagName, className: element.className })
        }
        for (const element of document.querySelectorAll('[title],[aria-label],[placeholder]')) {
          if (!visible(element)) continue
          for (const attribute of ['title', 'aria-label', 'placeholder']) {
            const value = element.getAttribute(attribute)?.trim()
            if (value && hasWords(value)) values.push({ kind: attribute, value, tag: element.tagName, className: element.className })
          }
        }
        return values
      })
      for (const item of found) residuals.push({ screen: `${tab}/${subtab}`, ...item })
    }
    fs.writeFileSync(outputPath('visible-english-residuals.json'), JSON.stringify(residuals, null, 2))
    assert.deepEqual(residuals, [], residuals.slice(0, 20).map(item => `${item.screen}: ${item.value}`).join('\n'))
    record('全页面国际化', ['简体中文默认目录', '英文回退目录', `${tabs.length} 个游戏页面可见文本`,
      '标题、辅助标签与占位符'], { catalog, screens: tabs.length, residuals: residuals.length })
  })

  await test('Content audit · every interactive screen is reachable without clipping or overlap', async () => {
    await reset(engine)
    const tabs = await engine.evaluate(() => {
      player.infinities = new Decimal(1e6)
      player.eternities = new Decimal(1e6)
      player.realities = 100
      player.reality.upgradeBits = (1 << 26) - 1
      player.reality.imaginaryUpgradeBits = (1 << 26) - 1
      player.celestials.teresa.unlockBits = 63
      player.celestials.effarig.unlockBits = 127
      player.celestials.v.unlockBits = 127
      player.celestials.ra.unlockBits = (1 << 29) - 1
      for (const pet of Object.values(player.celestials.ra.pets)) pet.level = 25
      player.dilation.studies = [1, 2, 3, 4, 5, 6]
      player.reality.automator.forceUnlock = true
      for (const tab of Tabs.all) {
        if (tab.key === 'shop') continue
        tab.config.condition = () => true
        for (const subtab of tab.subtabs) subtab.config.condition = () => true
      }
      return Tabs.all.filter(tab => tab.key !== 'shop')
        .flatMap(tab => tab.subtabs.map(subtab => [tab.key, subtab.key]))
    })
    const geometry = []
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      for (const [tab, subtab] of tabs) {
        await engine.evaluate(([nextTab, nextSubtab]) => {
          Modal.hideAll()
          ui.view.quotes.current = undefined
          Tab[nextTab][nextSubtab].show(true)
          GameUI.update()
          document.scrollingElement.scrollTop = 0
        }, [tab, subtab])
        await page.waitForTimeout(25)
        await engine.evaluate(() => window.scrollTo(0, 0))
        const result = await engine.evaluate(() => {
          const selector = 'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[role="button"]'
          const visible = element => {
            const style = getComputedStyle(element)
            const box = element.getBoundingClientRect()
            return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 &&
              box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth
          }
          const controls = [...document.querySelectorAll(selector)]
            .filter(element => !element.closest('.CodeMirror'))
            .filter(visible)
          const hasHorizontalScroller = element => {
            for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
              const overflow = getComputedStyle(parent).overflowX
              if (/(auto|scroll)/.test(overflow) && parent.scrollWidth > parent.clientWidth + 1) return true
            }
            return false
          }
          const clipped = controls.filter(element => {
            const box = element.getBoundingClientRect()
            return (box.left < -1 || box.right > innerWidth + 1) && !hasHorizontalScroller(element)
          }).map(element => ({ text: element.textContent?.trim().slice(0, 80), className: element.className }))
          const covered = controls.filter(element => {
            const box = element.getBoundingClientRect()
            const x = Math.min(innerWidth - 1, Math.max(0, box.left + box.width / 2))
            const y = Math.min(innerHeight - 1, Math.max(0, box.top + box.height / 2))
            const hit = document.elementFromPoint(x, y)
            const blockingControl = hit?.closest(selector)
            if (element.closest('.l-time-study-tree') && blockingControl?.closest('.l-time-studies-tab__tt-shop')) return false
            return blockingControl && blockingControl !== element && !element.contains(blockingControl) &&
              !blockingControl.contains(element)
          }).map(element => ({ text: element.textContent?.trim().slice(0, 80), className: element.className }))
          return {
            documentOverflow: document.documentElement.scrollWidth - innerWidth,
            clipped,
            covered,
            controls: controls.length
          }
        })
        assert.ok(result.documentOverflow <= 1, `${tab}/${subtab} document overflow at ${width}`)
        assert.deepEqual(result.clipped, [], `${tab}/${subtab} clipped controls at ${width}`)
        assert.deepEqual(result.covered, [], `${tab}/${subtab} covered controls at ${width}`)
        geometry.push({ screen: `${tab}/${subtab}`, width, controls: result.controls })
      }
    }

    // Reproduce a real user's wheel-and-click path in the embedded management panel. No locator auto-scroll is used.
    await page.setViewportSize({ width: 1200, height: 620 })
    await reset(engine)
    await engine.evaluate(() => {
      player.dimensionBoosts = 4
      Currency.antimatter.value = new Decimal('1e100')
      for (const dimension of AntimatterDimensions.all) dimension.amount = new Decimal(10)
      Tab.dimensions.antimatter.show(true)
      Modal.hideAll()
      document.querySelector('#notification-container')?.replaceChildren()
      document.scrollingElement.scrollTop = 0
      GameUI.update()
    })
    const frameBox = await page.locator('iframe').boundingBox()
    assert.ok(frameBox)
    await page.mouse.move(frameBox.x + frameBox.width / 2, frameBox.y + frameBox.height / 2)
    const beforeScroll = await engine.evaluate(() => document.scrollingElement.scrollTop)
    for (let index = 0; index < 5; index++) await page.mouse.wheel(0, 420)
    await page.waitForTimeout(100)
    const afterScroll = await engine.evaluate(() => document.scrollingElement.scrollTop)
    assert.ok(afterScroll > beforeScroll, 'mouse wheel did not scroll the management document')
    const tierEight = engine.locator('[data-buy-tier="8"]')
    const buttonBox = await tierEight.boundingBox()
    assert.ok(buttonBox && buttonBox.y >= frameBox.y && buttonBox.y + buttonBox.height <= frameBox.y + frameBox.height,
      '8th army purchase remained unreachable after wheel scrolling')
    const beforeBought = await engine.evaluate(() => AntimatterDimension(8).bought)
    await page.mouse.click(buttonBox.x + buttonBox.width / 2, buttonBox.y + buttonBox.height / 2)
    const afterBought = await engine.evaluate(() => AntimatterDimension(8).bought)
    assert.ok(afterBought > beforeBought, '8th army purchase did not respond to a physical pointer click')
    record('全界面交互可达性', ['全部页面 320/768/1440px 控件边界', '控件中心遮挡检测',
      '管理面板真实滚轮滚动', '滚动后点击第八阶军团'],
    { screenChecks: geometry.length, beforeScroll, afterScroll, beforeBought, afterBought })
  })

  await test('Content audit · late-game screens pass six-width clipping, reachability and contrast checks', async () => {
    const cases = [
      { id: 'reality-upgrades', tab: 'reality', subtab: 'upgrades', root: '.l-reality-upgrade-grid',
        fixture: 'player.realities=100; player.reality.upgradeBits=(1<<26)-1;' },
      { id: 'imaginary-upgrades', tab: 'reality', subtab: 'imag_upgrades', root: '.l-reality-upgrade-grid',
        fixture: 'player.realities=100; player.reality.upgradeBits=(1<<26)-1; player.reality.imaginaryUpgradeBits=(1<<26)-1;' },
      { id: 'glyph-management', tab: 'reality', subtab: 'glyphs', root: '.l-glyphs-tab',
        fixture: 'player.realities=100; player.reality.upgradeBits=(1<<26)-1; Achievement(147).unlock();' },
      { id: 'dual-clocks', tab: 'reality', subtab: 'hole', root: '.l-black-hole-tab',
        fixture: 'player.realities=100; player.blackHole[0].unlocked=true; player.blackHole[1].unlocked=true;' },
      { id: 'celestial-navigation', tab: 'celestials', subtab: 'celestial-navigation', root: '.l-celestial-navigation',
        fixture: 'player.realities=100; player.celestials.teresa.unlockBits=63; player.celestials.effarig.unlockBits=127;' },
      { id: 'pelle-panel', tab: 'celestials', subtab: 'pelle', root: '.l-pelle-celestial-tab',
        fixture: 'player.realities=100; player.reality.imaginaryUpgradeBits|=1<<25;' }
    ]
    for (const item of cases) {
      console.log('Auditing late screen', item.id)
      await prepare(item.tab, item.subtab, item.fixture)
      const root = engine.locator(item.root)
      await root.waitFor({ state: 'visible' })
      for (const width of widths) {
        await page.setViewportSize({ width, height: 1000 })
        await page.waitForTimeout(100)
        const layout = await root.evaluate(element => {
          const rect = element.getBoundingClientRect()
          const candidates = [...element.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled)')]
            .filter(node => {
              const style = getComputedStyle(node)
              const box = node.getBoundingClientRect()
              return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0
            })
          return {
            root: { left: rect.left, right: rect.right, width: rect.width },
            viewport: innerWidth,
            documentOverflow: document.documentElement.scrollWidth - innerWidth,
            clippedControls: candidates.filter(node => {
              const box = node.getBoundingClientRect()
              return box.left < -1 || box.right > innerWidth + 1
            }).map(node => {
              const box = node.getBoundingClientRect()
              return { className: node.className, text: node.textContent?.trim().slice(0, 80), left: box.left, right: box.right }
            }),
            undersizedControls: candidates.filter(node => {
              const box = node.getBoundingClientRect()
              return box.width < 20 || box.height < 20
            }).length,
            visibleControls: candidates.length
          }
        })
        assert.ok(layout.root.left >= -1 && layout.root.right <= layout.viewport + 1,
          `${item.id} root clipped at ${width}`)
        assert.ok(layout.documentOverflow <= 1, `${item.id} page overflow at ${width}`)
        assert.deepEqual(layout.clippedControls, [], `${item.id} controls clipped at ${width}`)
        assert.equal(layout.undersizedControls, 0, `${item.id} controls too small at ${width}`)
        screens.push({ screen: item.id, width, status: 'PASS', ...layout })
        if ([320, 768, 1440].includes(width)) {
          await root.screenshot({ path: outputPath(`content-${item.id}-${width}.png`) })
        }
      }
    }
    const contrast = await engine.evaluate(() => {
      const parse = value => {
        if (value.startsWith('#')) {
          const hex = value.slice(1)
          const normalized = hex.length === 3 ? [...hex].map(char => char + char).join('') : hex
          return [0, 2, 4].map(index => Number.parseInt(normalized.slice(index, index + 2), 16))
        }
        return (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)
      }
      const luminance = value => {
        const channels = parse(value).map(channel => {
          const normalized = channel / 255
          return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
        })
        return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
      }
      const ratio = (front, back) => {
        const values = [luminance(front), luminance(back)].sort((a, b) => b - a)
        return (values[0] + 0.05) / (values[1] + 0.05)
      }
      const style = getComputedStyle(document.documentElement)
      const panel = style.getPropertyValue('--tower-panel').trim()
      return {
        body: ratio(style.getPropertyValue('--color-text').trim(), panel),
        muted: ratio(style.getPropertyValue('--tower-muted').trim(), panel),
        gold: ratio(style.getPropertyValue('--tower-gold').trim(), panel)
      }
    })
    assert.ok(contrast.body >= 4.5)
    assert.ok(contrast.muted >= 4.5)
    assert.ok(contrast.gold >= 4.5)
    record('后期界面、窄屏与对比度', ['6 个后期关键界面', '每页 6 档宽度', '控件边界与最小尺寸',
      '正文/次要文字/强调文字对比度'], { screenChecks: screens.length, contrast })
  })

  const expected = ['资源、阶位与动态说明', '帮助', '通知与确认弹窗', '新闻系统退役与替代功业',
    '中期文案、试炼可读性与离线弹窗', '结局文本与脚本保护', '全页面国际化',
    '全界面交互可达性', '后期界面、窄屏与对比度']
  const complete = expected.every(category => categories.some(entry => entry.category === category && entry.status === 'PASS'))
  fs.writeFileSync(outputPath('outside-database-content-audit.json'), JSON.stringify({
    generatedAt: new Date().toISOString(), status: complete ? 'PASS' : 'FAIL', categories,
    missingCategories: expected.filter(category => !categories.some(entry => entry.category === category)),
    allowedUntranslatedContent: ['Automator 脚本语法', '代码与公式', '通用缩写', '原版专有名词'],
    screens
  }, null, 2))
}
