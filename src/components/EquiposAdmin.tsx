import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { EquipoCompleto, JugadorCompleto } from '../lib/types'
import { escudoDeId } from '../lib/escudos'

function esImagen(url: string) {
  return /\.(jpe?g|png|gif|webp|heic|heif)(\?.*)?$/i.test(url)
}

export default function EquiposAdmin() {
  const [equipos, setEquipos] = useState<EquipoCompleto[]>([])
  const [jugadores, setJugadores] = useState<JugadorCompleto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [abierto, setAbierto] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const [{ data: eq, error: e1 }, { data: jug, error: e2 }] = await Promise.all([
      supabase.from('equipos').select('*').order('posicion', { ascending: true }),
      supabase.from('jugadores').select('*').order('orden', { ascending: true }),
    ])
    if (!e1 && eq) setEquipos(eq as EquipoCompleto[])
    if (!e2 && jug) setJugadores(jug as JugadorCompleto[])
    if (e1) setError(e1.message)
    if (e2) setError(e2.message)
    setCargando(false)
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  if (cargando) {
    return <p className="text-chalk/50 text-sm">Cargando equipos…</p>
  }

  const jugadoresPorEquipo = new Map<string, JugadorCompleto[]>()
  jugadores.forEach((j) => {
    const lista = jugadoresPorEquipo.get(j.equipo_id) ?? []
    lista.push(j)
    jugadoresPorEquipo.set(j.equipo_id, lista)
  })

  const totalJugadores = equipos.reduce(
    (acc, e) => acc + 1 + (jugadoresPorEquipo.get(e.id)?.length ?? 0),
    0
  )

  return (
    <div>
      {error && <p className="text-red-300 text-sm mb-4">{error}</p>}

      <p className="text-chalk/60 text-sm mb-4">
        {equipos.length} equipos inscriptos ·{' '}
        <span className="text-lime font-semibold">{totalJugadores}</span> jugadores en total
      </p>

      <div className="space-y-2">
        {equipos.map((e) => {
          const jugadoresEquipo = jugadoresPorEquipo.get(e.id) ?? []
          const cantidad = jugadoresEquipo.length + 1
          const escudo = escudoDeId(e.logo_url)
          const abiertoAqui = abierto === e.id

          return (
            <div key={e.id} className="border border-line bg-pitchdeep">
              <button
                type="button"
                onClick={() => setAbierto(abiertoAqui ? null : e.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
              >
                <span className="title-stencil text-lime text-sm w-6 text-center shrink-0">
                  {e.posicion ?? '–'}
                </span>
                <div className="w-7 h-7 bg-pitch border border-line shrink-0 flex items-center justify-center">
                  {escudo && <escudo.Icon size={14} color={escudo.color} strokeWidth={2} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-chalk truncate">{e.nombre_equipo}</p>
                  <p className="text-xs text-chalk/50 truncate">
                    {e.capitan_nombre} · {e.capitan_telefono}
                  </p>
                </div>
                <span className="text-xs text-chalk/50 shrink-0">{cantidad} jug.</span>
                <span className="text-chalk/40 shrink-0 text-xs">{abiertoAqui ? '▲' : '▼'}</span>
              </button>

              {abiertoAqui && (
                <div className="border-t border-line px-4 py-4 text-sm space-y-4">
                  <div>
                    <p className="text-chalk/40 text-xs uppercase tracking-wide mb-1">
                      Jugadores ({cantidad})
                    </p>
                    <ul className="space-y-1">
                      <li className="text-chalk">
                        {e.capitan_nombre} <span className="text-lime text-xs">(Capitán)</span>
                      </li>
                      {jugadoresEquipo.map((j) => (
                        <li key={j.id} className="text-chalk/80">
                          {j.nombre_apellido}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {e.comentarios && (
                    <div>
                      <p className="text-chalk/40 text-xs uppercase tracking-wide mb-1">
                        Comentarios
                      </p>
                      <p className="text-chalk/80">{e.comentarios}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-chalk/40 text-xs uppercase tracking-wide mb-1">
                      Comprobante
                    </p>
                    {e.comprobante_url ? (
                      esImagen(e.comprobante_url) ? (
                        <a href={e.comprobante_url} target="_blank" rel="noreferrer">
                          <img
                            src={e.comprobante_url}
                            alt={`Comprobante de ${e.nombre_equipo}`}
                            className="max-w-[220px] border border-line"
                          />
                        </a>
                      ) : (
                        <a
                          href={e.comprobante_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-lime hover:underline"
                        >
                          Ver comprobante ↗
                        </a>
                      )
                    ) : (
                      <p className="text-chalk/40 italic">Sin comprobante</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
