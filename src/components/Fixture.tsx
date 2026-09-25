import { EquipoFixture, PartidoGrupo, Cruce } from '../lib/types'
import { Resultado, RONDAS, armarResultadosMap, armarCrucesMap, resolverEquipoId } from '../lib/bracket'
import { GRUPOS, equiposDelGrupo, armarPartidosDeGrupo, horarioDePartido } from '../lib/grupos'
import { escudoDeId } from '../lib/escudos'

interface Props {
  equipos: EquipoFixture[]
  resultados: Resultado[]
  cruces: Cruce[]
  partidosGrupo: PartidoGrupo[]
}

function Escudo({ equipo, size = 16 }: { equipo?: EquipoFixture; size?: number }) {
  const escudo = escudoDeId(equipo?.logo_url)
  if (!escudo) {
    return <div className="w-7 h-7 bg-pitchdeep border border-line shrink-0" />
  }
  return (
    <div className="w-7 h-7 bg-pitchdeep border border-line shrink-0 flex items-center justify-center">
      <escudo.Icon size={size} color={escudo.color} strokeWidth={2} />
    </div>
  )
}

function LineaEquipo({ equipo, ganadorId }: { equipo?: EquipoFixture; ganadorId?: string }) {
  const esGanador = !!equipo && equipo.id === ganadorId
  return (
    <p
      className={`truncate text-sm ${
        equipo
          ? esGanador
            ? 'text-lime font-semibold'
            : 'text-chalk/80'
          : 'text-chalk/30 italic'
      }`}
    >
      {equipo ? equipo.nombre_equipo : 'Pendiente'}
    </p>
  )
}

function PartidoEliminatoria({
  titulo,
  local,
  visitante,
  ganadorId,
}: {
  titulo: string
  local?: EquipoFixture
  visitante?: EquipoFixture
  ganadorId?: string
}) {
  return (
    <div className="border border-line bg-pitch px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-amber mb-2">{titulo}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2 min-w-0">
          <Escudo equipo={local} />
          <LineaEquipo equipo={local} ganadorId={ganadorId} />
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <Escudo equipo={visitante} />
          <LineaEquipo equipo={visitante} ganadorId={ganadorId} />
        </div>
      </div>
    </div>
  )
}

export default function Fixture({ equipos, resultados, cruces, partidosGrupo }: Props) {
  const equiposPorId = new Map(equipos.map((e) => [e.id, e]))
  const resultadosMap = armarResultadosMap(resultados)
  const crucesMap = armarCrucesMap(cruces)

  const resolver = (ronda: 'semifinal' | 'final', numero: number, lado: 0 | 1) => {
    const id = resolverEquipoId(ronda, numero, lado, crucesMap, resultadosMap)
    return id ? equiposPorId.get(id) : undefined
  }

  return (
    <div className="w-full space-y-12">
      {/* FASE DE GRUPOS */}
      <section>
        <h2 className="title-stencil text-2xl md:text-3xl text-chalk mb-2">
          FASE DE GRUPOS
        </h2>
        <p className="text-chalk/50 text-sm mb-6">
          3 grupos de 3 equipos, 3 partidos por grupo. Clasifican los punteros
          de cada grupo y el mejor segundo.
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          {GRUPOS.map((grupo) => {
            const delGrupo = equiposDelGrupo(equipos, grupo)
            const partidos = armarPartidosDeGrupo(equipos, grupo)
            return (
              <div key={grupo} className="border border-line bg-pitch">
                <div className="border-b border-line px-4 py-3 flex items-center justify-between">
                  <h3 className="title-stencil text-lg text-amber">Grupo {grupo}</h3>
                  <span className="text-xs text-chalk/50">{delGrupo.length}/3</span>
                </div>

                <ul className="px-4 py-3 space-y-2">
                  {delGrupo.length === 0 && (
                    <li className="text-chalk/40 italic text-sm">Sin equipos asignados</li>
                  )}
                  {delGrupo.map((eq) => (
                    <li key={eq.id} className="flex items-center gap-2 min-w-0">
                      <Escudo equipo={eq} />
                      <span className="truncate text-sm font-semibold text-chalk">
                        {eq.nombre_equipo}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="border-t border-line px-4 py-3 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-amber mb-1">Partidos</p>
                  {partidos.length === 0 && (
                    <p className="text-chalk/40 italic text-sm">A confirmar</p>
                  )}
                  {partidos.map((p) => {
                    const local = equiposPorId.get(p.localId)
                    const visitante = equiposPorId.get(p.visitanteId)
                    const horario = horarioDePartido(partidosGrupo, grupo, p.numero)?.horario
                    return (
                      <div
                        key={p.numero}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="truncate text-chalk/80">
                          {local?.nombre_equipo ?? '?'}{' '}
                          <span className="text-chalk/40">vs</span>{' '}
                          {visitante?.nombre_equipo ?? '?'}
                        </span>
                        <span className="shrink-0 text-lime">
                          {horario || 'A confirmar'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ELIMINATORIA */}
      <section>
        <h2 className="title-stencil text-2xl md:text-3xl text-chalk mb-2">
          ELIMINATORIA
        </h2>
        <p className="text-chalk/50 text-sm mb-6">
          Los 3 punteros y el mejor segundo juegan semifinales y final.
        </p>

        <div className="grid gap-6 lg:grid-cols-3 lg:items-center">
          <div className="space-y-3">
            {RONDAS.filter((r) => r.id === 'semifinal').map((ronda) =>
              Array.from({ length: ronda.partidos }, (_, i) => i + 1).map((numero) => (
                <PartidoEliminatoria
                  key={numero}
                  titulo={`Semifinal ${numero}`}
                  local={resolver('semifinal', numero, 0)}
                  visitante={resolver('semifinal', numero, 1)}
                  ganadorId={resultadosMap.semifinal[numero]}
                />
              ))
            )}
          </div>

          <div>
            <PartidoEliminatoria
              titulo="Final"
              local={resolver('final', 1, 0)}
              visitante={resolver('final', 1, 1)}
              ganadorId={resultadosMap.final[1]}
            />
          </div>

          <div>
            {resultadosMap.final[1] ? (
              <div className="border border-lime bg-lime/10 px-4 py-6 text-center">
                <p className="text-xs uppercase tracking-widest text-amber mb-3">Campeón</p>
                <div className="flex items-center justify-center gap-2">
                  <Escudo equipo={equiposPorId.get(resultadosMap.final[1])} size={20} />
                  <p className="title-stencil text-xl text-lime">
                    🏆 {equiposPorId.get(resultadosMap.final[1])?.nombre_equipo}
                  </p>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-line px-4 py-6 text-center">
                <p className="text-chalk/40 text-sm italic">Campeón a definir</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
