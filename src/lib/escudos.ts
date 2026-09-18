import { Zap, Star, Flame, Shield, Trophy, Target, Swords, CircleDot, LucideIcon } from 'lucide-react'

export interface EscudoDef {
  id: string
  Icon: LucideIcon
  color: string
}

export const ESCUDOS: EscudoDef[] = [
  { id: 'escudo-1', Icon: Zap, color: '#D7FF3F' },
  { id: 'escudo-2', Icon: Star, color: '#F2A93B' },
  { id: 'escudo-3', Icon: Flame, color: '#D7FF3F' },
  { id: 'escudo-4', Icon: Shield, color: '#F4F2E8' },
  { id: 'escudo-5', Icon: Trophy, color: '#F2A93B' },
  { id: 'escudo-6', Icon: Target, color: '#F4F2E8' },
  { id: 'escudo-7', Icon: Swords, color: '#D7FF3F' },
  { id: 'escudo-8', Icon: CircleDot, color: '#F2A93B' },
]

export const PRESET_PREFIX = 'preset:'

export function escudoDeId(logoValue: string | null | undefined): EscudoDef | null {
  if (!logoValue || !logoValue.startsWith(PRESET_PREFIX)) return null
  const id = logoValue.slice(PRESET_PREFIX.length)
  return ESCUDOS.find((e) => e.id === id) ?? null
}
