import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { EquipoCompleto, JugadorCompleto } from '../lib/types'
import BracketEditor from './BracketEditor'

export default function AdminPanel() {
  const [session, setSession] = useState<Session | null>(null)
  const [cargandoSesion, setCargandoSesion] = useState(true)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorLogin, setErrorLogin] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)

  const [exportando, setExportando] = useState(false)
  const [errorExport, setErrorExport] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCargandoSesion(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSession(nuevaSesion)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErrorLogin(null)
    setEntrando(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setErrorLogin('Usuario o contraseña incorrectos.')
    setEntrando(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  async function exportarExcel() {
    setExportando(true)
    setErrorExport(null)
    try {
      const { data: equipos, error: errorEquipos } = await supabase
        .from('equipos')
        .select('*')
        .order('posicion', { ascending: true })
      if (errorEquipos) throw errorEquipos

      const { data: jugadores, error: errorJugadores } = await supabase
        .from('jugadores')
        .select('*')
        .order('orden', { ascending: true })
      if (errorJugadores) throw errorJugadores

      const equiposTyped = (equipos ?? []) as EquipoCompleto[]
      const jugadoresTyped = (jugadores ?? []) as JugadorCompleto[]

      const jugadoresPorEquipo = new Map<string, JugadorCompleto[]>()
      jugadoresTyped.forEach((j) => {
        const lista = jugadoresPorEquipo.get(j.equipo_id) ?? []
        lista.push(j)
        jugadoresPorEquipo.set(j.equipo_id, lista)
      })

      // Hoja 1: un renglón por equipo (resumen)
      const filasEquipos = equiposTyped.map((e) => ({
        Posición: e.posicion ?? '',
        Equipo: e.nombre_equipo,
        Capitán: e.capitan_nombre,
        'DNI capitán': e.capitan_dni,
        Teléfono: e.capitan_telefono,
        'Jugadores (sin capitán)': (jugadoresPorEquipo.get(e.id) ?? []).length,
        Comprobante: e.comprobante_url ?? '',
        Comentarios: e.comentarios ?? '',
        'Inscripto el': new Date(e.created_at).toLocaleString('es-AR'),
      }))

      // Hoja 2: un renglón por jugador (incluye al capitán primero en cada equipo)
      const filasJugadores: Record<string, string | number>[] = []
      equiposTyped.forEach((e) => {
        filasJugadores.push({
          Equipo: e.nombre_equipo,
          Posición: e.posicion ?? '',
          Jugador: `${e.capitan_nombre} (Capitán)`,
          DNI: e.capitan_dni,
        })
        ;(jugadoresPorEquipo.get(e.id) ?? []).forEach((j) => {
          filasJugadores.push({
            Equipo: e.nombre_equipo,
            Posición: e.posicion ?? '',
            Jugador: j.nombre_apellido,
            DNI: j.dni,
          })
        })
      })

      const libro = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filasEquipos), 'Equipos')
      XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filasJugadores), 'Jugadores')

      const fecha = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(libro, `torneo-facet-${fecha}.xlsx`)
    } catch (err: any) {
      setErrorExport(err.message || 'No se pudo generar la planilla.')
    } finally {
      setExportando(false)
    }
  }

  if (cargandoSesion) {
    return (
      <div className="min-h-screen flex items-center justify-center text-chalk/50 text-sm">
        Cargando…
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-pitch border border-line p-8 w-full max-w-sm">
          <h1 className="title-stencil text-2xl text-chalk mb-1">ADMIN</h1>
          <p className="text-chalk/50 text-sm mb-6">Acceso solo para la organización.</p>

          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-pitchdeep border border-line px-3 py-2 text-chalk mb-4"
            required
          />

          <label className="block text-sm mb-1">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-pitchdeep border border-line px-3 py-2 text-chalk mb-4"
            required
          />

          {errorLogin && (
            <p className="text-red-300 text-sm mb-4">{errorLogin}</p>
          )}

          <button
            type="submit"
            disabled={entrando}
            className="w-full bg-lime text-pitchdeep font-bold py-2 title-stencil disabled:opacity-50"
          >
            {entrando ? 'INGRESANDO...' : 'INGRESAR'}
          </button>

          <a href="/" className="block mt-6 text-center text-xs text-chalk/40 hover:text-chalk">
            ← Volver al sitio
          </a>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="title-stencil text-2xl text-chalk">PANEL ADMIN</h1>
          <button onClick={handleLogout} className="text-sm text-chalk/50 hover:text-chalk">
            Cerrar sesión
          </button>
        </div>

        <div className="bg-pitch border border-line p-6">
          <p className="text-chalk/70 text-sm mb-6">
            Descarga un Excel con dos hojas: un resumen por equipo (capitán,
            teléfono, comprobante) y el listado completo de jugadores con DNI.
          </p>

          <button
            onClick={exportarExcel}
            disabled={exportando}
            className="bg-lime text-pitchdeep font-bold px-8 py-3 title-stencil tracking-wide disabled:opacity-50"
          >
            {exportando ? 'GENERANDO...' : 'DESCARGAR PLANILLA (.XLSX)'}
          </button>

          {errorExport && (
            <p className="text-red-300 text-sm mt-4">{errorExport}</p>
          )}
        </div>

        <div className="bg-pitch border border-line p-6 mt-6">
          <h2 className="title-stencil text-xl text-chalk mb-4">FIXTURE</h2>
          <BracketEditor />
        </div>

        <a href="/" className="block mt-8 text-sm text-chalk/40 hover:text-chalk">
          ← Volver al sitio
        </a>
      </div>
    </div>
  )
}
