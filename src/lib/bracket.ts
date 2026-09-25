import { Cruce } from './types'

export type RondaId = 'semifinal' | 'final'

export interface RondaDef {
  id: RondaId
  label: string
  partidos: number
}

export const RONDAS: RondaDef[] = [
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
  const mapa: ResultadosMap = { semifinal: {}, final: {} }
  resultados.forEach((r) => {
    mapa[r.ronda][r.numero] = r.equipo_ganador_id
  })
  return mapa
}

// Clave: `${ronda}-${numero}-${lado}` -> equipo_id (o null si está vacío).
export type CrucesMap = Record<string, string | null>

export function armarCrucesMap(cruces: Cruce[]): CrucesMap {
  const mapa: CrucesMap = {}
  cruces.forEach((c) => {
    mapa[`${c.ronda}-${c.numero}-${c.lado}`] = c.equipo_id
  })
  return mapa
}

/**
 * Devuelve el id del equipo que ocupa un lado de un partido de la
 * eliminatoria. En semifinal sale del sembrado (tabla cruces); en la
 * final, de los ganadores de las dos semifinales.
 */
export function resolverEquipoId(
  ronda: RondaId,
  numero: number,
  lado: 0 | 1,
  crucesMap: CrucesMap,
  resultadosMap: ResultadosMap
): string | undefined {
  if (ronda === 'semifinal') {
    return crucesMap[`semifinal-${numero}-${lado}`] ?? undefined
  }
  const numeroSemi = (numero - 1) * 2 + lado + 1
  return resultadosMap.semifinal[numeroSemi]
}
