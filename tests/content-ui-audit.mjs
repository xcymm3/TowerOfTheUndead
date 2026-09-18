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

  await test('Content audit · news ticker and both news achievements are reachable', async () => {
    await reset(engine)
    await engine.evaluate(() => {
      const target = GameDatabase.news[50]
      for (const news of GameDatabase.news.filter(news => news.id !== target.id).slice(0, 49)) {
        NewsHandler.addSeenNews(news.id)
      }
      nextNewsMessageId = target.id
      player.options.news.speed = 10
      ui.view.news = true
      GameUI.update()
      const ticker = document.querySelector('.c-news-ticker').__vue__
      ticker.recentTickers = []
      ticker.restart()
    })
    const ticker = engine.locator('.c-news-ticker')
    await ticker.waitFor({ state: 'visible' })
    assert.equal(await ticker.count(), 1)
    await engine.evaluate(() => document.querySelector('.c-news-ticker').__vue__.scrollMessage())
    await engine.waitForFunction(() => Achievement(22).isUnlocked)

    await engine.evaluate(() => {
      nextNewsMessageId = 'a130'
      document.querySelector('.c-news-ticker').__vue__.restart()
    })
    const line = ticker.locator('.c-news-line')
    await engine.waitForFunction(() => document.querySelector('.c-news-line')?.textContent.includes('Click this'))
    await line.evaluate(element => {
      element.style.paddingLeft = '0'
      element.style.transform = 'translateX(0)'
      element.style.transitionDuration = '0ms'
    })
    await line.click({ position: { x: 8, y: 8 } })
    await engine.waitForFunction(() => SecretAchievement(24).isUnlocked)
    assert.equal(await engine.evaluate(() => SecretAchievement(24).isUnlocked), true,
      'clicking visible interactive news must unlock Secret Achievement 24')
    const evidence = await engine.evaluate(() => ({
      tickerCount: document.querySelectorAll('.c-news-ticker').length,
      uniqueNews: NewsHandler.uniqueTickersSeen,
      achievement22: Achievement(22).isUnlocked,
      secretAchievement24: SecretAchievement(24).isUnlocked
    }))
    await ticker.screenshot({ path: outputPath('content-news-ticker.png') })
    record('新闻条与关联功业', ['新闻条唯一挂载', '展示新闻计入唯一已读', '50 条功业触发',
      '真实点击互动新闻触发隐秘功业'], evidence)
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
            }).length,
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
        assert.equal(layout.clippedControls, 0, `${item.id} controls clipped at ${width}`)
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

  const expected = ['资源、阶位与动态说明', '帮助', '通知与确认弹窗', '新闻条与关联功业',
    '中期文案、试炼可读性与离线弹窗', '结局文本与脚本保护', '后期界面、窄屏与对比度']
  const complete = expected.every(category => categories.some(entry => entry.category === category && entry.status === 'PASS'))
  fs.writeFileSync(outputPath('outside-database-content-audit.json'), JSON.stringify({
    generatedAt: new Date().toISOString(), status: complete ? 'PASS' : 'FAIL', categories,
    missingCategories: expected.filter(category => !categories.some(entry => entry.category === category)),
    allowedUntranslatedContent: ['Automator 脚本语法', '代码与公式', '通用缩写', '原版专有名词'],
    screens
  }, null, 2))
}
