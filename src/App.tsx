import { useEffect, useRef, useState } from 'react'
import { isSnapshot, unitNames } from './game/bridge'
import type { TowerSnapshot } from './game/bridge'
import './App.css'

export default function App() {
  const frame = useRef<HTMLIFrameElement>(null)
  const [state, setState] = useState<TowerSnapshot | null>(null)
  const [error, setError] = useState('')
  const [paused, setPaused] = useState(() => localStorage.getItem('undead:paused') === 'true')
  const [wide, setWide] = useState(false)
  const [roster, setRoster] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 25000)
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return
      if (event.data?.type === 'undead:state' && isSnapshot(event.data.state)) {
        setState(event.data.state)
        setError('')
      }
      if (event.data?.type === 'undead:error') setError(String(event.data.message))
      if (event.data?.type === 'undead:saved') setSaved(true)
    }
    window.addEventListener('message', receive)
    return () => { window.clearTimeout(timer); window.removeEventListener('message', receive) }
  }, [])
  useEffect(() => {
    if (!saved) return
    const timer = window.setTimeout(() => setSaved(false), 2000)
    return () => window.clearTimeout(timer)
  }, [saved])

  function command(action: string) {
    frame.current?.contentWindow?.postMessage({ type: 'undead:command', action }, window.location.origin)
  }
  function togglePause() {
    setPaused(value => { localStorage.setItem('undead:paused', String(!value)); return !value })
  }
  const owned = state?.army.filter(unit => unit.present) ?? []
  const armyCount = owned.length
  const sceneUnits = owned.flatMap(unit => Array.from({ length: unit.representatives }, (_, index) => ({ ...unit, index })))
  return (
    <main className={`tower-app ${wide ? 'expanded' : ''} ${paused ? 'is-paused' : ''}`}>
      <header className="resource-header">
        <div className="wordmark"><span className="skull-mark" aria-hidden="true">♜</span><h1>亡灵之塔</h1><small>TOWER OF THE UNDEAD</small></div>
        <div className="resource souls"><span className="resource-symbol" aria-hidden="true">◆</span><div><span>游魂</span><strong>{state?.souls ?? '—'}</strong></div></div>
        <div className="resource income"><span className="resource-symbol" aria-hidden="true">✦</span><div><span>每秒产出</span><strong>+{state?.production ?? '—'}</strong></div></div>
        <div className="resource seals"><span className="resource-symbol" aria-hidden="true">◆</span><div><span>魂印</span><strong>{state?.soulSeals ?? '—'}</strong></div></div>
        <div className="resource floors"><span className="resource-symbol" aria-hidden="true">♜</span><div><span>筑塔次数</span><strong>{state?.floors ?? '—'}</strong></div></div>
        <button className="settings-button" onClick={() => command('settings')} title="存档与设置" aria-label="存档与设置">⚙</button>
      </header>

      <div className="game-layout">
        <section className="management-panel stone-frame" aria-label="高塔经营">
          <iframe ref={frame} title="亡灵之塔经营界面" src={`${import.meta.env.BASE_URL}engine/index.html`}
            onLoad={() => setLoaded(true)} allow="clipboard-read; clipboard-write" />
          {!state && !error && <div className="loading-screen" role="status">
            <span className="loading-sigil">♜</span><h2>唤醒高塔</h2>
            <p>{slow ? '载入时间较长，请检查网络后重试。' : loaded ? '正在恢复军团与离线进度…' : '正在载入高塔…'}</p>
            {slow && <button onClick={() => window.location.reload()}>重新载入</button>}
          </div>}
          {error && <div className="runtime-error" role="alert"><strong>高塔暂时无法运行</strong><p>{error}</p><button onClick={() => window.location.reload()}>重新载入</button></div>}
        </section>
        <aside className="battle-panel stone-frame" aria-label="当前拥有的亡灵军团">
          <div className="scene-title"><span aria-hidden="true">◆</span><h2>墓园前线</h2><span aria-hidden="true">◆</span></div>
          <div className="scene-chapter">{state?.chapter ?? '荒坟初醒'}<span>墓域 {state?.cemeteries ?? '—'}</span></div>
          <div className="graveyard-scene">
            <div className="scene-fog" aria-hidden="true" />
            <div className="army-on-field" aria-label={armyCount ? '已集结 ' + armyCount + ' 个族群' : '尚未召唤军团'}>
              {sceneUnits.map(unit => (
                <button key={unit.tier + '-' + unit.index}
                  className={`field-unit sprite sprite-${unit.tier} position-${unit.tier} copy-${unit.index}`}
                  title={unit.name + ' · ' + unit.amount} aria-label={unit.name + '，数量 ' + unit.amount}
                  onClick={() => { setRoster(true); command('army') }} />
              ))}
            </div>
            {!armyCount && state && <div className="empty-army"><span>墓土之下，亡者静候召唤</span><small>在军团面板召唤第一位骷髅兵</small></div>}
            {armyCount > 0 && <div className="army-caption"><span className="live-dot" />{armyCount} 个族群已集结 <small>按数量显示代表队列</small></div>}
          </div>
          {roster && <section className="roster" aria-label="军团名册">
            <div className="roster-heading"><h3>军团名册</h3><button onClick={() => setRoster(false)} aria-label="关闭名册">×</button></div>
            {unitNames.map((name, index) => <div key={name} className={state?.army[index]?.present ? '' : 'absent'}><span>{name}</span><b>{state?.army[index]?.amount ?? '0'}</b></div>)}
          </section>}
          <div className="scene-controls"><button onClick={togglePause} aria-pressed={paused}>{paused ? '▶ 继续动画' : 'Ⅱ 暂停动画'}</button><button onClick={() => setRoster(!roster)} aria-expanded={roster}>♟ 军团展示</button></div>
        </aside>

      </div>

      <footer className="game-footer">
        <span className="save-status"><i className={state ? 'connected' : ''} />{saved ? '进度已保存' : state ? '本地存档 · 自动保存' : '正在唤醒'}</span>
        <div><button onClick={() => command('save')} disabled={!state}>保存</button><button onClick={() => command('help')} disabled={!state}>玩法指南</button><button onClick={() => setWide(!wide)}>{wide ? '显示军团' : '展开经营'}</button></div>
        <span className="footer-motto">白骨无言，高塔永存</span>
      </footer>
    </main>
  )
}
