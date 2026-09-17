export interface ArmyUnit {
  tier: number
  name: string
  amount: string
  present: boolean
  representatives: number
}
export interface TowerSnapshot {
  souls: string
  production: string
  soulSeals: string
  floors: string
  cemeteries: string
  chapter: string
  army: ArmyUnit[]
  lastSaved: number
  tab: string
  subtab: string
  modal: boolean
  ended: boolean
}
export const unitNames = ['骷髅兵', '僵尸', '幽魂', '吸血鬼', '尸巫', '死亡骑士', '骨龙', '灾厄领主']
export function isSnapshot(value: unknown): value is TowerSnapshot {
  if (!value || typeof value !== 'object') return false
  const s = value as Partial<TowerSnapshot>
  return typeof s.souls === 'string' && typeof s.production === 'string' && typeof s.soulSeals === 'string'
    && typeof s.floors === 'string' && typeof s.chapter === 'string' && typeof s.lastSaved === 'number'
    && Array.isArray(s.army) && s.army.length === 8 && s.army.every(u => Number.isInteger(u.tier)
      && u.tier >= 1 && u.tier <= 8 && typeof u.amount === 'string' && typeof u.present === 'boolean')
}
