import { useState } from 'react'
import { supabase, JUGADORES_MAX } from '../lib/supabase'
import { JugadorInput } from '../lib/types'

interface Props {
  onSuccess: () => void
  onCupoCompleto: () => void
  onClose: () => void
}

const JUGADORES_MIN = 6 // + capitán = 7, el mínimo para completar un equipo en cancha

function crearJugadorVacio(): JugadorInput {
  return { nombre_apellido: '', dni: '' }
}

export default function RegistrationForm({ onSuccess, onCupoCompleto, onClose }: Props) {
  const [nombreEquipo, setNombreEquipo] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [capitanNombre, setCapitanNombre] = useState('')
  const [capitanTelefono, setCapitanTelefono] = useState('')
  const [jugadores, setJugadores] = useState<JugadorInput[]>([
    crearJugadorVacio(),
    crearJugadorVacio(),
    crearJugadorVacio(),
    crearJugadorVacio(),
    crearJugadorVacio(),
    crearJugadorVacio(),
  ])
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null)
  const [aceptaReglamento, setAceptaReglamento] = useState(false)
  const [confirmaFacet, setConfirmaFacet] = useState(false)
  const [comentarios, setComentarios] = useState('')

  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function actualizarJugador(i: number, campo: keyof JugadorInput, valor: string) {
    setJugadores((prev) => {
      const copia = [...prev]
      copia[i] = { ...copia[i], [campo]: valor }
      return copia
    })
  }

  function agregarJugador() {
    if (jugadores.length >= JUGADORES_MAX) return
    setJugadores((prev) => [...prev, crearJugadorVacio()])
  }

  function quitarJugador(i: number) {
    if (jugadores.length <= JUGADORES_MIN) return
    setJugadores((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function subirArchivo(file: File, bucket: string): Promise<string> {
    const ext = file.name.split('.').pop()
    const path = `${crypto.randomUUID()}.${ext}`
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file)
    if (uploadError) throw new Error(`No se pudo subir el archivo a ${bucket}: ${uploadError.message}`)
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!nombreEquipo.trim() || !capitanNombre.trim() || !capitanTelefono.trim()) {
      setError('Completá los datos del equipo y del capitán.')
      return
    }
    const jugadoresValidos = jugadores.filter(
      (j) => j.nombre_apellido.trim() && j.dni.trim()
    )
    if (jugadoresValidos.length < JUGADORES_MIN) {
      setError(`Necesitás al menos ${JUGADORES_MIN} jugadores además del capitán.`)
      return
    }
    if (!aceptaReglamento) {
      setError('Tenés que aceptar el reglamento para inscribirte.')
      return
    }
    if (!confirmaFacet) {
      setError('Tenés que confirmar que todos los jugadores son estudiantes de la FACET.')
      return
    }

    setEnviando(true)
    try {
      let logoUrl: string | null = null
      if (logoFile) logoUrl = await subirArchivo(logoFile, 'logos')

      let comprobanteUrl: string | null = null
      if (comprobanteFile) comprobanteUrl = await subirArchivo(comprobanteFile, 'comprobantes')

      const { data, error: rpcError } = await supabase.rpc('inscribir_equipo', {
        p_nombre_equipo: nombreEquipo.trim(),
        p_logo_url: logoUrl,
        p_capitan_nombre: capitanNombre.trim(),
        p_capitan_telefono: capitanTelefono.trim(),
        p_comprobante_url: comprobanteUrl,
        p_comentarios: comentarios.trim() || null,
        p_jugadores: jugadoresValidos,
      })

      if (rpcError) {
        if (rpcError.message.includes('CUPO_COMPLETO')) {
          onCupoCompleto()
          return
        }
        throw rpcError
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al inscribir al equipo. Probá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-pitchdeep/90 flex items-start md:items-center justify-center p-4 overflow-y-auto z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-pitch border border-line w-full max-w-2xl p-6 md:p-8 my-8"
      >
        <div className="flex items-start justify-between mb-6">
          <h2 className="title-stencil text-2xl text-chalk">INSCRIBIR EQUIPO</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-chalk/50 hover:text-chalk text-sm"
          >
            Cerrar ✕
          </button>
        </div>

        <div className="bg-amber/15 border border-amber text-amber text-sm px-4 py-3 mb-6">
          Importante: todos los jugadores del equipo deben ser estudiantes de la
          FACET. Vas a tener que confirmarlo antes de enviar.
        </div>

        {/* Datos del equipo */}
        <fieldset className="mb-6">
          <legend className="text-amber text-xs uppercase tracking-wide mb-3">
            Datos del equipo
          </legend>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Nombre del equipo</label>
              <input
                type="text"
                value={nombreEquipo}
                onChange={(e) => setNombreEquipo(e.target.value)}
                className="w-full bg-pitchdeep border border-line px-3 py-2 text-chalk"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Escudo / logo del equipo (opcional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-chalk/80 file:mr-3 file:py-2 file:px-3 file:border file:border-line file:bg-pitchdeep file:text-chalk"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Capitán/a (nombre y apellido)</label>
                <input
                  type="text"
                  value={capitanNombre}
                  onChange={(e) => setCapitanNombre(e.target.value)}
                  className="w-full bg-pitchdeep border border-line px-3 py-2 text-chalk"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Teléfono de contacto</label>
                <input
                  type="tel"
                  value={capitanTelefono}
                  onChange={(e) => setCapitanTelefono(e.target.value)}
                  className="w-full bg-pitchdeep border border-line px-3 py-2 text-chalk"
                  required
                />
              </div>
            </div>
          </div>
        </fieldset>

        {/* Lista de buena fe */}
        <fieldset className="mb-6">
          <legend className="text-amber text-xs uppercase tracking-wide mb-3">
            Lista de jugadores ({jugadores.length}/{JUGADORES_MAX}, sin contar al capitán)
          </legend>
          <div className="space-y-2">
            {jugadores.map((j, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nombre y apellido"
                  value={j.nombre_apellido}
                  onChange={(e) => actualizarJugador(i, 'nombre_apellido', e.target.value)}
                  className="flex-1 bg-pitchdeep border border-line px-3 py-2 text-chalk text-sm"
                />
                <input
                  type="text"
                  placeholder="DNI"
                  value={j.dni}
                  onChange={(e) => actualizarJugador(i, 'dni', e.target.value)}
                  className="w-32 bg-pitchdeep border border-line px-3 py-2 text-chalk text-sm"
                />
                {jugadores.length > JUGADORES_MIN && (
                  <button
                    type="button"
                    onClick={() => quitarJugador(i)}
                    className="text-chalk/40 hover:text-amber px-2"
                    aria-label="Quitar jugador"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {jugadores.length < JUGADORES_MAX && (
            <button
              type="button"
              onClick={agregarJugador}
              className="mt-3 text-sm text-lime hover:underline"
            >
              + Agregar jugador
            </button>
          )}
        </fieldset>

        {/* Pago */}
        <fieldset className="mb-6">
          <legend className="text-amber text-xs uppercase tracking-wide mb-3">
            Inscripción / pago
          </legend>
          <label className="block text-sm mb-1">Comprobante de transferencia (si aplica)</label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setComprobanteFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-chalk/80 file:mr-3 file:py-2 file:px-3 file:border file:border-line file:bg-pitchdeep file:text-chalk"
          />
        </fieldset>

        {/* Otros */}
        <fieldset className="mb-6 space-y-3">
          <legend className="text-amber text-xs uppercase tracking-wide mb-3">Otros</legend>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={aceptaReglamento}
              onChange={(e) => setAceptaReglamento(e.target.checked)}
              className="mt-1"
            />
            Leí y acepto el reglamento del torneo.
          </label>
          <label className="flex items-start gap-2 text-sm bg-amber/10 border border-amber/40 px-3 py-2">
            <input
              type="checkbox"
              checked={confirmaFacet}
              onChange={(e) => setConfirmaFacet(e.target.checked)}
              className="mt-1"
            />
            Confirmo que todos los jugadores de este equipo son estudiantes de la FACET.
          </label>
          <div>
            <label className="block text-sm mb-1">Comentarios u observaciones (opcional)</label>
            <textarea
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              rows={3}
              className="w-full bg-pitchdeep border border-line px-3 py-2 text-chalk text-sm"
            />
          </div>
        </fieldset>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-200 text-sm px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="w-full bg-lime text-pitchdeep font-bold py-3 title-stencil tracking-wide disabled:opacity-50"
        >
          {enviando ? 'ENVIANDO...' : 'CONFIRMAR INSCRIPCIÓN'}
        </button>
      </form>
    </div>
  )
}
