import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { EquipoCompleto, JugadorCompleto } from '../lib/types'
import { escudoDeId, PRESET_PREFIX } from '../lib/escudos'
import LogoPicker from './LogoPicker'

function esImagen(url: string) {
  return /\.(jpe?g|png|gif|webp|heic|heif)(\?.*)?$/i.test(url)
}

interface FormEquipo {
  nombre_equipo: string
  capitan_nombre: string
  capitan_dni: string
  capitan_telefono: string
  logo_url: string | null
  comentarios: string
}

function formVacioDesde(e: EquipoCompleto): FormEquipo {
  return {
    nombre_equipo: e.nombre_equipo,
    capitan_nombre: e.capitan_nombre,
    capitan_dni: e.capitan_dni,
    capitan_telefono: e.capitan_telefono,
    logo_url: e.logo_url,
    comentarios: e.comentarios ?? '',
  }
}

export default function EquiposAdmin() {
  const [equipos, setEquipos] = useState<EquipoCompleto[]>([])
  const [jugadores, setJugadores] = useState<JugadorCompleto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [abierto, setAbierto] = useState<string | null>(null)

  // Edición de equipo
  const [editandoEquipo, setEditandoEquipo] = useState<string | null>(null)
  const [formEquipo, setFormEquipo] = useState<FormEquipo | null>(null)
  const [guardandoEquipo, setGuardandoEquipo] = useState(false)
  const [borrandoEquipo, setBorrandoEquipo] = useState<string | null>(null)
  const [confirmarBorrarEquipo, setConfirmarBorrarEquipo] = useState<string | null>(null)

  // Edición de jugador
  const [editandoJugador, setEditandoJugador] = useState<string | null>(null)
  const [formJugador, setFormJugador] = useState<{ nombre_apellido: string; dni: string } | null>(null)
  const [borrandoJugador, setBorrandoJugador] = useState<string | null>(null)

  // Alta de jugador
  const [agregandoEnEquipo, setAgregandoEnEquipo] = useState<string | null>(null)
  const [nuevoJugador, setNuevoJugador] = useState({ nombre_apellido: '', dni: '' })
  const [guardandoNuevo, setGuardandoNuevo] = useState(false)

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

  // --- Equipo: editar / guardar / borrar ---

  function empezarEdicionEquipo(e: EquipoCompleto) {
    setError(null)
    setEditandoEquipo(e.id)
    setFormEquipo(formVacioDesde(e))
  }

  async function guardarEquipo(id: string) {
    if (!formEquipo) return
    setError(null)
    setGuardandoEquipo(true)
    const { error } = await supabase
      .from('equipos')
      .update({
        nombre_equipo: formEquipo.nombre_equipo.trim(),
        capitan_nombre: formEquipo.capitan_nombre.trim(),
        capitan_dni: formEquipo.capitan_dni.trim(),
        capitan_telefono: formEquipo.capitan_telefono.trim(),
        logo_url: formEquipo.logo_url,
        comentarios: formEquipo.comentarios.trim() || null,
      })
      .eq('id', id)

    if (error) {
      setError(
        error.message.includes('logo_url')
          ? 'Ese escudo ya lo tiene otro equipo.'
          : error.message
      )
    } else {
      setEditandoEquipo(null)
      setFormEquipo(null)
      await cargar()
    }
    setGuardandoEquipo(false)
  }

  async function borrarEquipo(id: string) {
    setError(null)
    setBorrandoEquipo(id)
    const { error } = await supabase.from('equipos').delete().eq('id', id)
    if (error) {
      setError(error.message)
    } else {
      setConfirmarBorrarEquipo(null)
      if (abierto === id) setAbierto(null)
      await cargar()
    }
    setBorrandoEquipo(null)
  }

  // --- Jugador: agregar / editar / borrar ---

  async function agregarJugador(equipoId: string) {
    if (!nuevoJugador.nombre_apellido.trim() || !nuevoJugador.dni.trim()) return
    setError(null)
    setGuardandoNuevo(true)
    const ordenMax = Math.max(0, ...(jugadoresPorEquipo.get(equipoId) ?? []).map((j) => j.orden))
    const { error } = await supabase.from('jugadores').insert({
      equipo_id: equipoId,
      nombre_apellido: nuevoJugador.nombre_apellido.trim(),
      dni: nuevoJugador.dni.trim(),
      orden: ordenMax + 1,
    })
    if (error) {
      setError(error.message)
    } else {
      setNuevoJugador({ nombre_apellido: '', dni: '' })
      setAgregandoEnEquipo(null)
      await cargar()
    }
    setGuardandoNuevo(false)
  }

  function empezarEdicionJugador(j: JugadorCompleto) {
    setError(null)
    setEditandoJugador(j.id)
    setFormJugador({ nombre_apellido: j.nombre_apellido, dni: j.dni })
  }

  async function guardarJugador(id: string) {
    if (!formJugador) return
    setError(null)
    const { error } = await supabase
      .from('jugadores')
      .update({
        nombre_apellido: formJugador.nombre_apellido.trim(),
        dni: formJugador.dni.trim(),
      })
      .eq('id', id)
    if (error) {
      setError(error.message)
    } else {
      setEditandoJugador(null)
      setFormJugador(null)
      await cargar()
    }
  }

  async function borrarJugador(id: string) {
    setError(null)
    setBorrandoJugador(id)
    const { error } = await supabase.from('jugadores').delete().eq('id', id)
    if (error) setError(error.message)
    else await cargar()
    setBorrandoJugador(null)
  }

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
          const editandoEsteEquipo = editandoEquipo === e.id

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
                  {editandoEsteEquipo && formEquipo ? (
                    <div className="space-y-3 bg-pitch border border-line p-4">
                      <div>
                        <label className="block text-xs text-chalk/50 mb-1">Nombre del equipo</label>
                        <input
                          type="text"
                          value={formEquipo.nombre_equipo}
                          onChange={(ev) => setFormEquipo({ ...formEquipo, nombre_equipo: ev.target.value })}
                          className="w-full bg-pitchdeep border border-line px-3 py-2 text-chalk text-sm"
                        />
                      </div>
                      <div className="grid sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-chalk/50 mb-1">Capitán</label>
                          <input
                            type="text"
                            value={formEquipo.capitan_nombre}
                            onChange={(ev) => setFormEquipo({ ...formEquipo, capitan_nombre: ev.target.value })}
                            className="w-full bg-pitchdeep border border-line px-3 py-2 text-chalk text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-chalk/50 mb-1">DNI capitán</label>
                          <input
                            type="text"
                            value={formEquipo.capitan_dni}
                            onChange={(ev) => setFormEquipo({ ...formEquipo, capitan_dni: ev.target.value })}
                            className="w-full bg-pitchdeep border border-line px-3 py-2 text-chalk text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-chalk/50 mb-1">Teléfono</label>
                          <input
                            type="text"
                            value={formEquipo.capitan_telefono}
                            onChange={(ev) => setFormEquipo({ ...formEquipo, capitan_telefono: ev.target.value })}
                            className="w-full bg-pitchdeep border border-line px-3 py-2 text-chalk text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-chalk/50 mb-1">Escudo</label>
                        <LogoPicker
                          value={formEquipo.logo_url}
                          onChange={(v) => setFormEquipo({ ...formEquipo, logo_url: v })}
                          ocupados={equipos
                            .filter((otro) => otro.id !== e.id)
                            .map((otro) => otro.logo_url)
                            .filter((v): v is string => !!v && v.startsWith(PRESET_PREFIX))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-chalk/50 mb-1">Comentarios</label>
                        <textarea
                          value={formEquipo.comentarios}
                          onChange={(ev) => setFormEquipo({ ...formEquipo, comentarios: ev.target.value })}
                          rows={2}
                          className="w-full bg-pitchdeep border border-line px-3 py-2 text-chalk text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => guardarEquipo(e.id)}
                          disabled={guardandoEquipo}
                          className="bg-lime text-pitchdeep font-bold px-4 py-2 text-sm disabled:opacity-50"
                        >
                          {guardandoEquipo ? 'Guardando…' : 'Guardar cambios'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditandoEquipo(null)
                            setFormEquipo(null)
                          }}
                          className="border border-line px-4 py-2 text-sm text-chalk/70"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => empezarEdicionEquipo(e)}
                        className="text-xs border border-line px-3 py-1.5 text-chalk/70 hover:border-chalk/40"
                      >
                        Editar equipo
                      </button>
                      {confirmarBorrarEquipo === e.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => borrarEquipo(e.id)}
                            disabled={borrandoEquipo === e.id}
                            className="text-xs border border-red-700 bg-red-900/30 text-red-200 px-3 py-1.5 disabled:opacity-50"
                          >
                            {borrandoEquipo === e.id ? 'Borrando…' : '¿Seguro? Confirmar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmarBorrarEquipo(null)}
                            className="text-xs border border-line px-3 py-1.5 text-chalk/70"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmarBorrarEquipo(e.id)}
                          className="text-xs border border-line px-3 py-1.5 text-chalk/50 hover:border-red-700 hover:text-red-300"
                        >
                          Eliminar equipo
                        </button>
                      )}
                    </div>
                  )}

                  <div>
                    <p className="text-chalk/40 text-xs uppercase tracking-wide mb-2">
                      Jugadores ({cantidad})
                    </p>
                    <ul className="space-y-1.5">
                      <li className="text-chalk flex items-center justify-between">
                        <span>
                          {e.capitan_nombre} <span className="text-lime text-xs">(Capitán)</span>
                        </span>
                      </li>
                      {jugadoresEquipo.map((j) => (
                        <li key={j.id}>
                          {editandoJugador === j.id && formJugador ? (
                            <div className="flex gap-2 items-center">
                              <input
                                type="text"
                                value={formJugador.nombre_apellido}
                                onChange={(ev) =>
                                  setFormJugador({ ...formJugador, nombre_apellido: ev.target.value })
                                }
                                className="flex-1 bg-pitchdeep border border-line px-2 py-1 text-chalk text-sm"
                              />
                              <input
                                type="text"
                                value={formJugador.dni}
                                onChange={(ev) => setFormJugador({ ...formJugador, dni: ev.target.value })}
                                className="w-28 bg-pitchdeep border border-line px-2 py-1 text-chalk text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => guardarJugador(j.id)}
                                className="text-lime text-xs px-2"
                              >
                                Guardar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditandoJugador(null)
                                  setFormJugador(null)
                                }}
                                className="text-chalk/50 text-xs px-2"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between text-chalk/80">
                              <span>{j.nombre_apellido}</span>
                              <span className="flex gap-3 text-xs shrink-0 ml-3">
                                <button
                                  type="button"
                                  onClick={() => empezarEdicionJugador(j)}
                                  className="text-chalk/50 hover:text-chalk"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => borrarJugador(j.id)}
                                  disabled={borrandoJugador === j.id}
                                  className="text-chalk/50 hover:text-red-300 disabled:opacity-50"
                                >
                                  {borrandoJugador === j.id ? 'Borrando…' : 'Borrar'}
                                </button>
                              </span>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>

                    {agregandoEnEquipo === e.id ? (
                      <div className="flex gap-2 items-center mt-3">
                        <input
                          type="text"
                          placeholder="Nombre y apellido"
                          value={nuevoJugador.nombre_apellido}
                          onChange={(ev) =>
                            setNuevoJugador({ ...nuevoJugador, nombre_apellido: ev.target.value })
                          }
                          className="flex-1 bg-pitchdeep border border-line px-2 py-1.5 text-chalk text-sm"
                        />
                        <input
                          type="text"
                          placeholder="DNI"
                          value={nuevoJugador.dni}
                          onChange={(ev) => setNuevoJugador({ ...nuevoJugador, dni: ev.target.value })}
                          className="w-28 bg-pitchdeep border border-line px-2 py-1.5 text-chalk text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => agregarJugador(e.id)}
                          disabled={guardandoNuevo}
                          className="text-lime text-xs px-2 disabled:opacity-50"
                        >
                          {guardandoNuevo ? 'Agregando…' : 'Agregar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAgregandoEnEquipo(null)
                            setNuevoJugador({ nombre_apellido: '', dni: '' })
                          }}
                          className="text-chalk/50 text-xs px-2"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAgregandoEnEquipo(e.id)}
                        className="mt-3 text-sm text-lime hover:underline"
                      >
                        + Agregar jugador
                      </button>
                    )}
                  </div>

                  {e.comentarios && !editandoEsteEquipo && (
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
