import { TowerOverview } from './components/TowerOverview'
import { gameConfig } from './game/config'
import { createInitialState } from './game/state'
import './App.css'

const initialState = createInitialState()

export default function App() {
  return (
    <main className="tower-shell">
      <header className="tower-header">
        <span className="wordmark">{gameConfig.englishTitle}</span>
        <span className="chapter">序章 · 沉眠</span>
      </header>
      <section className="tower-intro" aria-labelledby="game-title">
        <p className="eyebrow">自白骨之中，筑起高塔</p>
        <h1 id="game-title">{gameConfig.title}</h1>
        <p className="intro-copy">荒原之下，最后一座高塔仍在沉睡。<br />骷髅静候召唤，新的征程将从这里开始。</p>
      </section>
      <TowerOverview state={initialState} />
      <footer className="tower-footer">白骨无言，高塔永存。</footer>
    </main>
  )
}
