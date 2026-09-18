import { EquipoFixture } from './types'

export type RondaId = 'octavos' | 'cuartos' | 'semifinal' | 'final'

export interface RondaDef {
  id: RondaId
  label: string
  partidos: number
}

export const RONDAS: RondaDef[] = [
  { id: 'octavos', label: 'Octavos de final', partidos: 8 },
  { id: 'cuartos', label: 'Cuartos de final', partidos: 4 },
  { id: 'semifinal', label: 'Semifinal', partidos: 2 },
  { id: 'final', label: 'Final', partidos: 1 },
]

export interface Resultado {
  ronda: RondaId
  numero: number
  equipo_ganador_id: string
}

export type ResultadosMap = Record<RondaId, Record<number, string>>

export function armarResultadosMap(resultados: Resultado[]): ResultadosMap {
  const mapa: ResultadosMap = { octavos: {}, cuartos: {}, semifinal: {}, final: {} }
  resultados.forEach((r) => {
    mapa[r.ronda][r.numero] = r.equipo_ganador_id
  })
  return mapa
}

export function armarSlotsOctavos(
  equipos: EquipoFixture[],
  cupo = 16
): (EquipoFixture | undefined)[] {
  const slots: (EquipoFixture | undefined)[] = Array.from({ length: cupo }, () => undefined)
  equipos.forEach((e) => {
    if (e.posicion && e.posicion >= 1 && e.posicion <= cupo) slots[e.posicion - 1] = e
  })
  return slots
}

function rondaAnterior(ronda: RondaId): RondaId | null {
  const idx = RONDAS.findIndex((r) => r.id === ronda)
  return idx > 0 ? RONDAS[idx - 1].id : null
}

/**
 * Resuelve qué equipo ocupa un lado (0 o 1) de un partido dado,
 * siguiendo la cadena de ganadores hacia atrás hasta los 16 equipos
 * base. Devuelve undefined si esa rama todavía no se definió.
 */
export function resolverEquipo(
  ronda: RondaId,
  numero: number,
  lado: 0 | 1,
  slotsOctavos: (EquipoFixture | undefined)[],
  equiposPorId: Map<string, EquipoFixture>,
  resultadosMap: ResultadosMap
): EquipoFixture | undefined {
  if (ronda === 'octavos') {
    return slotsOctavos[(numero - 1) * 2 + lado]
  }
  const anterior = rondaAnterior(ronda)
  if (!anterior) return undefined
  const numeroAnterior = (numero - 1) * 2 + lado + 1
  const ganadorId = resultadosMap[anterior][numeroAnterior]
  if (!ganadorId) return undefined
  return equiposPorId.get(ganadorId)
}
