import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { EquipoFixture } from '../lib/types'
import {
  RONDAS,
  RondaId,
  Resultado,
  armarResultadosMap,
  armarSlotsOctavos,
  resolverEquipo,
} from '../lib/bracket'

export default function BracketEditor() {
  const [equipos, setEquipos] = useState<EquipoFixture[]>([])
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const [{ data: eq, error: e1 }, { data: res, error: e2 }] = await Promise.all([
      supabase
        .from('equipos')
        .select('id, nombre_equipo, logo_url, posicion, created_at')
        .order('posicion', { ascending: true }),
      supabase.from('resultados').select('ronda, numero, equipo_ganador_id'),
    ])
    if (!e1 && eq) setEquipos(eq as EquipoFixture[])
    if (!e2 && res) setResultados(res as Resultado[])
    if (e1) setError(e1.message)
    if (e2) setError(e2.message)
    setCargando(false)
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function elegirGanador(ronda: RondaId, numero: number, equipoId: string) {
    setError(null)
    const key = `${ronda}-${numero}`
    setGuardando(key)
    try {
      // Si se cambia un resultado ya cargado, los de las rondas
      // siguientes quedan obsoletos: se borran para volver a cargarlos.
      const idxRonda = RONDAS.findIndex((r) => r.id === ronda)
      const rondasPosteriores = RONDAS.slice(idxRonda + 1).map((r) => r.id)
      if (rondasPosteriores.length > 0) {
        const { error: delError } = await supabase
          .from('resultados')
          .delete()
          .in('ronda', rondasPosteriores)
        if (delError) throw delError
      }

      const { error: upsertError } = await supabase
        .from('resultados')
        .upsert({ ronda, numero, equipo_ganador_id: equipoId }, { onConflict: 'ronda,numero' })
      if (upsertError) throw upsertError

      await cargar()
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar el resultado.')
    } finally {
      setGuardando(null)
    }
  }

  if (cargando) {
    return <p className="text-chalk/50 text-sm">Cargando fixture…</p>
  }

  const slotsOctavos = armarSlotsOctavos(equipos)
  const equiposPorId = new Map(equipos.map((e) => [e.id, e]))
  const resultadosMap = armarResultadosMap(resultados)

  return (
    <div className="space-y-8">
      <p className="text-chalk/60 text-sm">
        Tocá el equipo que ganó cada partido. Si cambiás un resultado ya
        cargado, los partidos de las rondas siguientes que dependían de él
        se borran automáticamente (hay que volver a cargarlos).
      </p>

      {error && <p className="text-red-300 text-sm">{error}</p>}

      {RONDAS.map((rondaDef) => (
        <div key={rondaDef.id}>
          <p className="text-amber text-xs uppercase tracking-wide mb-3">{rondaDef.label}</p>
          <div className="space-y-2">
            {Array.from({ length: rondaDef.partidos }, (_, i) => i + 1).map((numero) => {
              const equipoA = resolverEquipo(rondaDef.id, numero, 0, slotsOctavos, equiposPorId, resultadosMap)
              const equipoB = resolverEquipo(rondaDef.id, numero, 1, slotsOctavos, equiposPorId, resultadosMap)
              const ganadorId = resultadosMap[rondaDef.id][numero]
              const key = `${rondaDef.id}-${numero}`
              const ambosListos = !!equipoA && !!equipoB

              return (
                <div
                  key={key}
                  className="border border-line bg-pitchdeep px-3 py-2 flex items-center gap-2 flex-wrap"
                >
                  <span className="text-xs text-chalk/40 w-20 shrink-0">Partido {numero}</span>

                  {[equipoA, equipoB].map((eq, lado) => {
                    const esGanador = !!eq && ganadorId === eq.id
                    return (
                      <button
                        key={lado}
                        type="button"
                        disabled={!ambosListos || guardando === key}
                        onClick={() => eq && elegirGanador(rondaDef.id, numero, eq.id)}
                        className={`text-sm px-3 py-1.5 border transition ${
                          esGanador
                            ? 'border-lime bg-lime/15 text-lime font-semibold'
                            : 'border-line text-chalk/70 hover:border-chalk/40'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        {eq ? eq.nombre_equipo : 'Pendiente'}
                      </button>
                    )
                  })}

                  {guardando === key && (
                    <span className="text-xs text-chalk/40">Guardando…</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
