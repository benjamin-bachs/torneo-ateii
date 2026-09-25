import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { EquipoFixture, Cruce } from '../lib/types'
import {
  Resultado,
  armarCrucesMap,
  armarResultadosMap,
  resolverEquipoId,
} from '../lib/bracket'
import { escudoDeId } from '../lib/escudos'

function NombreEquipo({ equipo }: { equipo?: EquipoFixture }) {
  return <span className="truncate">{equipo ? equipo.nombre_equipo : 'Pendiente'}</span>
}

export default function EliminatoriaAdmin() {
  const [equipos, setEquipos] = useState<EquipoFixture[]>([])
  const [cruces, setCruces] = useState<Cruce[]>([])
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const [{ data: eq, error: e1 }, { data: cr, error: e2 }, { data: res, error: e3 }] =
      await Promise.all([
        supabase
          .from('equipos')
          .select('id, nombre_equipo, logo_url, posicion, grupo, created_at')
          .order('posicion', { ascending: true }),
        supabase.from('cruces').select('ronda, numero, lado, equipo_id'),
        supabase
          .from('resultados')
          .select('ronda, numero, equipo_ganador_id')
          .in('ronda', ['semifinal', 'final']),
      ])
    if (e1) setError(e1.message)
    if (e2) setError(e2.message)
    if (e3) setError(e3.message)
    if (eq) setEquipos(eq as EquipoFixture[])
    if (cr) setCruces(cr as Cruce[])
    if (res) setResultados(res as Resultado[])
    setCargando(false)
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function sembrar(numero: number, lado: 0 | 1, equipoId: string) {
    setError(null)
    setGuardando(`sembrar-${numero}-${lado}`)
    const { error } = await supabase
      .from('cruces')
      .upsert(
        { ronda: 'semifinal', numero, lado, equipo_id: equipoId || null },
        { onConflict: 'ronda,numero,lado' }
      )
    if (error) {
      setError(error.message)
    } else {
      // Al cambiar un semifinalista, los resultados que dependían de él
      // quedan obsoletos: se borran el de esa semi y el de la final.
      await supabase.from('resultados').delete().eq('ronda', 'semifinal').eq('numero', numero)
      await supabase.from('resultados').delete().eq('ronda', 'final')
      await cargar()
    }
    setGuardando(null)
  }

  async function elegirGanador(ronda: 'semifinal' | 'final', numero: number, equipoId: string) {
    setError(null)
    setGuardando(`ganador-${ronda}-${numero}`)
    if (ronda === 'semifinal') {
      await supabase.from('resultados').delete().eq('ronda', 'final')
    }
    const { error } = await supabase
      .from('resultados')
      .upsert({ ronda, numero, equipo_ganador_id: equipoId }, { onConflict: 'ronda,numero' })
    if (error) setError(error.message)
    else await cargar()
    setGuardando(null)
  }

  if (cargando) {
    return <p className="text-chalk/50 text-sm">Cargando eliminatoria…</p>
  }

  const equiposPorId = new Map(equipos.map((e) => [e.id, e]))
  const crucesMap = armarCrucesMap(cruces)
  const resultadosMap = armarResultadosMap(resultados)

  const equipoEn = (ronda: 'semifinal' | 'final', numero: number, lado: 0 | 1) => {
    const id = resolverEquipoId(ronda, numero, lado, crucesMap, resultadosMap)
    return id ? equiposPorId.get(id) : undefined
  }

  const equiposOrdenados = equipos
    .slice()
    .sort((a, b) => a.nombre_equipo.localeCompare(b.nombre_equipo))

  return (
    <div className="space-y-8">
      <p className="text-chalk/60 text-sm">
        Elegí a mano los 4 clasificados (los punteros de cada grupo y el mejor
        segundo) para armar las semifinales. Después tocá al ganador de cada
        semifinal y de la final.
      </p>

      {error && <p className="text-red-300 text-sm">{error}</p>}

      {/* Sembrado de semifinales */}
      <div className="space-y-4">
        <p className="text-amber text-xs uppercase tracking-wide">Semifinales</p>
        {[1, 2].map((numero) => (
          <div key={numero} className="border border-line bg-pitchdeep p-3 space-y-2">
            <p className="text-xs text-chalk/40">Semifinal {numero}</p>
            {[0, 1].map((lado) => {
              const valor = crucesMap[`semifinal-${numero}-${lado}`] ?? ''
              const equipo = valor ? equiposPorId.get(valor) : undefined
              const escudo = escudoDeId(equipo?.logo_url)
              return (
                <div key={lado} className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-pitch border border-line shrink-0 flex items-center justify-center">
                    {escudo && <escudo.Icon size={14} color={escudo.color} strokeWidth={2} />}
                  </div>
                  <select
                    value={valor}
                    disabled={guardando === `sembrar-${numero}-${lado}`}
                    onChange={(ev) => sembrar(numero, lado as 0 | 1, ev.target.value)}
                    className="flex-1 bg-pitchdeep border border-line px-2 py-1.5 text-chalk text-sm disabled:opacity-50"
                  >
                    <option value="">Elegir equipo…</option>
                    {equiposOrdenados.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nombre_equipo}
                        {e.grupo ? ` (Grupo ${e.grupo})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Ganadores */}
      <div className="space-y-6">
        {(['semifinal', 'final'] as const).map((ronda) => (
          <div key={ronda}>
            <p className="text-amber text-xs uppercase tracking-wide mb-3">
              {ronda === 'semifinal' ? 'Ganadores de semifinal' : 'Ganador de la final'}
            </p>
            <div className="space-y-2">
              {Array.from(
                { length: ronda === 'semifinal' ? 2 : 1 },
                (_, i) => i + 1
              ).map((numero) => {
                const local = equipoEn(ronda, numero, 0)
                const visitante = equipoEn(ronda, numero, 1)
                const ganadorId = resultadosMap[ronda][numero]
                const ambosListos = !!local && !!visitante
                const key = `${ronda}-${numero}`
                return (
                  <div
                    key={key}
                    className="border border-line bg-pitchdeep px-3 py-2 flex items-center gap-2 flex-wrap"
                  >
                    <span className="text-xs text-chalk/40 w-20 shrink-0">
                      {ronda === 'semifinal' ? `Semi ${numero}` : 'Final'}
                    </span>
                    {[local, visitante].map((eq, lado) => {
                      const esGanador = !!eq && ganadorId === eq.id
                      return (
                        <button
                          key={lado}
                          type="button"
                          disabled={!ambosListos || guardando === `ganador-${ronda}-${numero}`}
                          onClick={() => eq && elegirGanador(ronda, numero, eq.id)}
                          className={`text-sm px-3 py-1.5 border transition ${
                            esGanador
                              ? 'border-lime bg-lime/15 text-lime font-semibold'
                              : 'border-line text-chalk/70 hover:border-chalk/40'
                          } disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          <NombreEquipo equipo={eq} />
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {resultadosMap.final[1] && (
        <p className="title-stencil text-lime text-lg">
          🏆 {equiposPorId.get(resultadosMap.final[1])?.nombre_equipo}
        </p>
      )}
    </div>
  )
}
