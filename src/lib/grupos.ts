import { EquipoFixture, PartidoGrupo } from './types'

export const GRUPOS = ['A', 'B', 'C'] as const

export interface PartidoGrupoDerivado {
  numero: number
  localId: string
  visitanteId: string
}

export function equiposDelGrupo(equipos: EquipoFixture[], grupo: string): EquipoFixture[] {
  return equipos
    .filter((e) => e.grupo === grupo)
    .slice()
    .sort((a, b) => {
      const pa = a.posicion ?? Number.MAX_SAFE_INTEGER
      const pb = b.posicion ?? Number.MAX_SAFE_INTEGER
      return pa - pb
    })
}

/**
 * Round-robin de 3 equipos: partido 1 = 1° vs 2°, partido 2 = 1° vs 3°,
 * partido 3 = 2° vs 3°. El orden de los equipos dentro del grupo es por
 * posición de inscripción.
 */
export function armarPartidosDeGrupo(
  equipos: EquipoFixture[],
  grupo: string
): PartidoGrupoDerivado[] {
  const delGrupo = equiposDelGrupo(equipos, grupo)
  const [a, b, c] = delGrupo
  const partidos: PartidoGrupoDerivado[] = []
  if (a && b) partidos.push({ numero: 1, localId: a.id, visitanteId: b.id })
  if (a && c) partidos.push({ numero: 2, localId: a.id, visitanteId: c.id })
  if (b && c) partidos.push({ numero: 3, localId: b.id, visitanteId: c.id })
  return partidos
}

export function horarioDePartido(
  partidosGrupo: PartidoGrupo[],
  grupo: string,
  numero: number
): PartidoGrupo | undefined {
  return partidosGrupo.find((p) => p.grupo === grupo && p.numero === numero)
}
