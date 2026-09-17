import type { GameState } from './types'

export function createInitialState(): GameState {
  return { souls: 0, skeletons: 0, towerFloor: 1 }
}
