import type { GameState } from '../game/types'

interface TowerOverviewProps {
  state: GameState
}

export function TowerOverview({ state }: TowerOverviewProps) {
  return (
    <section className="tower-overview" aria-labelledby="overview-title">
      <h2 id="overview-title">高塔概况</h2>
      <dl className="resource-list">
        <div><dt>灵魂</dt><dd>{state.souls}</dd></div>
        <div><dt>骷髅</dt><dd>{state.skeletons}</dd></div>
        <div><dt>塔层</dt><dd>{state.towerFloor}</dd></div>
      </dl>
    </section>
  )
}
