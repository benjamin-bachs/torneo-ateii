import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { EquipoFixture, PartidoGrupo } from '../lib/types'
import { GRUPOS, equiposDelGrupo, armarPartidosDeGrupo } from '../lib/grupos'
import { escudoDeId } from '../lib/escudos'

export default function GruposAdmin() {
  const [equipos, setEquipos] = useState<EquipoFixture[]>([])
  const [partidos, setPartidos] = useState<PartidoGrupo[]>([])
  const [horarios, setHorarios] = useState<Record<string, string>>({})
  const [cargando, setCargando] = useState(true)
  const [guardandoEquipo, setGuardandoEquipo] = useState<string | null>(null)
  const [guardandoGrupo, setGuardandoGrupo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const [{ data: eq, error: e1 }, { data: pg, error: e2 }] = await Promise.all([
      supabase
        .from('equipos')
        .select('id, nombre_equipo, logo_url, posicion, grupo, created_at')
        .order('posicion', { ascending: true }),
      supabase.from('partidos_grupo').select('grupo, numero, horario, cancha'),
    ])
    if (e1) setError(e1.message)
    if (e2) setError(e2.message)
    if (eq) setEquipos(eq as EquipoFixture[])
    if (pg) {
      const lista = pg as PartidoGrupo[]
      setPartidos(lista)
      const h: Record<string, string> = {}
      lista.forEach((p) => {
        h[`${p.grupo}-${p.numero}`] = p.horario ?? ''
      })
      setHorarios(h)
    }
    setCargando(false)
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function cambiarGrupo(equipoId: string, grupo: string) {
    setError(null)
    setOk(null)
    setGuardandoEquipo(equipoId)
    const { error } = await supabase
      .from('equipos')
      .update({ grupo: grupo || null })
      .eq('id', equipoId)
    if (error) setError(error.message)
    else await cargar()
    setGuardandoEquipo(null)
  }

  async function guardarHorarios(grupo: string) {
    setError(null)
    setOk(null)
    setGuardandoGrupo(grupo)
    const filas = [1, 2, 3].map((numero) => ({
      grupo,
      numero,
      horario: (horarios[`${grupo}-${numero}`] ?? '').trim() || null,
    }))
    const { error } = await supabase
      .from('partidos_grupo')
      .upsert(filas, { onConflict: 'grupo,numero' })
    if (error) setError(error.message)
    else {
      setOk(`Horarios del Grupo ${grupo} guardados.`)
      await cargar()
    }
    setGuardandoGrupo(null)
  }

  if (cargando) {
    return <p className="text-chalk/50 text-sm">Cargando equipos…</p>
  }

  return (
    <div className="space-y-8">
      <p className="text-chalk/60 text-sm">
        Asigná cada equipo a un grupo (A, B o C). Cada grupo debe tener 3
        equipos. Después cargá el horario de los 3 partidos de cada grupo.
      </p>

      {error && <p className="text-red-300 text-sm">{error}</p>}
      {ok && <p className="text-lime text-sm">{ok}</p>}

      {/* Asignación de grupos */}
      <div>
        <p className="text-amber text-xs uppercase tracking-wide mb-3">
          Equipos y grupo
        </p>
        <div className="space-y-2">
          {equipos.map((e) => {
            const escudo = escudoDeId(e.logo_url)
            return (
              <div
                key={e.id}
                className="border border-line bg-pitchdeep px-3 py-2 flex items-center gap-3"
              >
                <span className="title-stencil text-lime text-sm w-6 text-center shrink-0">
                  {e.posicion ?? '–'}
                </span>
                <div className="w-7 h-7 bg-pitch border border-line shrink-0 flex items-center justify-center">
                  {escudo && <escudo.Icon size={14} color={escudo.color} strokeWidth={2} />}
                </div>
                <span className="flex-1 min-w-0 truncate text-sm text-chalk">
                  {e.nombre_equipo}
                </span>
                <select
                  value={e.grupo ?? ''}
                  disabled={guardandoEquipo === e.id}
                  onChange={(ev) => cambiarGrupo(e.id, ev.target.value)}
                  className="bg-pitchdeep border border-line px-2 py-1.5 text-chalk text-sm disabled:opacity-50"
                >
                  <option value="">Sin grupo</option>
                  <option value="A">Grupo A</option>
                  <option value="B">Grupo B</option>
                  <option value="C">Grupo C</option>
                </select>
              </div>
            )
          })}
        </div>
      </div>

      {/* Horarios por grupo */}
      <div className="grid gap-4 md:grid-cols-3">
        {GRUPOS.map((grupo) => {
          const delGrupo = equiposDelGrupo(equipos, grupo)
          const partidosDerivados = armarPartidosDeGrupo(equipos, grupo)
          const nombres = new Map(equipos.map((e) => [e.id, e.nombre_equipo]))
          return (
            <div key={grupo} className="border border-line bg-pitch">
              <div className="border-b border-line px-4 py-3 flex items-center justify-between">
                <h3 className="title-stencil text-lg text-amber">Grupo {grupo}</h3>
                <span
                  className={`text-xs ${
                    delGrupo.length === 3 ? 'text-lime' : 'text-amber'
                  }`}
                >
                  {delGrupo.length}/3
                </span>
              </div>

              <div className="px-4 py-3 space-y-3">
                {delGrupo.length !== 3 && (
                  <p className="text-amber text-xs">
                    Asigná exactamente 3 equipos para armar los partidos.
                  </p>
                )}
                {partidosDerivados.map((p) => (
                  <div key={p.numero} className="space-y-1">
                    <p className="text-xs text-chalk/60 truncate">
                      {nombres.get(p.localId)} vs {nombres.get(p.visitanteId)}
                    </p>
                    <input
                      type="text"
                      placeholder="Horario (ej. 10:00)"
                      value={horarios[`${grupo}-${p.numero}`] ?? ''}
                      onChange={(ev) =>
                        setHorarios({ ...horarios, [`${grupo}-${p.numero}`]: ev.target.value })
                      }
                      className="w-full bg-pitchdeep border border-line px-2 py-1.5 text-chalk text-sm"
                    />
                  </div>
                ))}
                {partidosDerivados.length === 0 && (
                  <p className="text-chalk/40 italic text-sm">Sin partidos todavía.</p>
                )}

                <button
                  type="button"
                  onClick={() => guardarHorarios(grupo)}
                  disabled={guardandoGrupo === grupo || partidosDerivados.length === 0}
                  className="w-full bg-lime text-pitchdeep font-bold py-2 text-sm title-stencil disabled:opacity-50"
                >
                  {guardandoGrupo === grupo ? 'Guardando…' : `Guardar horarios ${grupo}`}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-chalk/40 text-xs">
        {partidos.length > 0
          ? 'Los horarios se muestran en el fixture público.'
          : 'Todavía no hay horarios cargados.'}
      </p>
    </div>
  )
}
