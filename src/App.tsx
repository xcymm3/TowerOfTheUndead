import { useEffect, useRef, useState } from 'react'
import { isSnapshot, unitNames } from './game/bridge'
import type { TowerSnapshot } from './game/bridge'
import { t } from './i18n'
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
        <div className="wordmark"><span className="skull-mark" aria-hidden="true">♜</span><h1>{t('brand.title')}</h1><small>{t('brand.subtitle')}</small></div>
        <div className="resource souls"><span className="resource-symbol" aria-hidden="true">◆</span><div><span>{t('resource.souls')}</span><strong>{state?.souls ?? '—'}</strong></div></div>
        <div className="resource income"><span className="resource-symbol" aria-hidden="true">✦</span><div><span>{t('resource.production')}</span><strong>+{state?.production ?? '—'}</strong></div></div>
        <div className="resource seals"><span className="resource-symbol" aria-hidden="true">◆</span><div><span>{t('resource.seals')}</span><strong>{state?.soulSeals ?? '—'}</strong></div></div>
        <div className="resource floors"><span className="resource-symbol" aria-hidden="true">♜</span><div><span>{t('resource.floors')}</span><strong>{state?.floors ?? '—'}</strong></div></div>
        <button className="settings-button" onClick={() => command('settings')} title={t('action.settings')} aria-label={t('action.settings')}>⚙</button>
      </header>

      <div className="game-layout">
        <section className="management-panel stone-frame" aria-label={t('panel.management')}>
          <iframe ref={frame} title="亡灵之塔经营界面" src={`${import.meta.env.BASE_URL}engine/index.html`}
            onLoad={() => setLoaded(true)} allow="clipboard-read; clipboard-write" />
          {!state && !error && <div className="loading-screen" role="status">
            <span className="loading-sigil">♜</span><h2>{t('loading.title')}</h2>
            <p>{slow ? t('loading.slow') : loaded ? t('loading.restore') : t('loading.initial')}</p>
            {slow && <button onClick={() => window.location.reload()}>{t('loading.retry')}</button>}
          </div>}
          {error && <div className="runtime-error" role="alert"><strong>{t('error.runtime')}</strong><p>{error}</p><button onClick={() => window.location.reload()}>{t('loading.retry')}</button></div>}
        </section>
        <aside className="battle-panel stone-frame" aria-label={t('panel.army')}>
          <div className="scene-title"><span aria-hidden="true">◆</span><h2>{t('scene.title')}</h2><span aria-hidden="true">◆</span></div>
          <div className="scene-chapter">{state?.chapter ?? '荒坟初醒'}<span>{t('scene.domain', { count: state?.cemeteries ?? '—' })}</span></div>
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
            {!armyCount && state && <div className="empty-army"><span>{t('scene.empty')}</span><small>{t('scene.emptyHint')}</small></div>}
            {armyCount > 0 && <div className="army-caption"><span className="live-dot" />{t('scene.gathered', { count: armyCount })} <small>{t('scene.queue')}</small></div>}
          </div>
          {roster && <section className="roster" aria-label="军团名册">
            <div className="roster-heading"><h3>{t('roster.title')}</h3><button onClick={() => setRoster(false)} aria-label={t('roster.close')}>×</button></div>
            {unitNames.map((name, index) => <div key={name} className={state?.army[index]?.present ? '' : 'absent'}><span>{name}</span><b>{state?.army[index]?.amount ?? '0'}</b></div>)}
          </section>}
          <div className="scene-controls"><button onClick={togglePause} aria-pressed={paused}>{paused ? t('control.resume') : t('control.pause')}</button><button onClick={() => setRoster(!roster)} aria-expanded={roster}>{t('control.roster')}</button></div>
        </aside>

      </div>

      <footer className="game-footer">
        <span className="save-status"><i className={state ? 'connected' : ''} />{saved ? t('status.saved') : state ? t('status.local') : t('status.waking')}</span>
        <div><button onClick={() => command('save')} disabled={!state}>{t('action.save')}</button><button onClick={() => command('help')} disabled={!state}>{t('action.help')}</button><button onClick={() => setWide(!wide)}>{wide ? t('action.showArmy') : t('action.expand')}</button></div>
        <span className="footer-motto">{t('footer.motto')}</span>
      </footer>
    </main>
  )
}
