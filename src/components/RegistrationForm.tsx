import { useState } from 'react'
import { supabase, JUGADORES_MAX } from '../lib/supabase'
import { JugadorInput } from '../lib/types'
import LogoPicker from './LogoPicker'
import ReglamentoTrigger from './ReglamentoModal'

interface Props {
  onSuccess: (posicion: number) => void
  onCupoCompleto: () => void
  onClose: () => void
  escudosOcupados: string[]
  onEscudoActualizado: () => void
}

const JUGADORES_MIN = 5 // + capitán = 6, el mínimo para completar un equipo en cancha

function crearJugadorVacio(): JugadorInput {
  return { nombre_apellido: '', dni: '' }
}

export default function RegistrationForm({
  onSuccess,
  onCupoCompleto,
  onClose,
  escudosOcupados,
  onEscudoActualizado,
}: Props) {
  const [nombreEquipo, setNombreEquipo] = useState('')
  const [logoPreset, setLogoPreset] = useState<string | null>(null)
  const [capitanNombre, setCapitanNombre] = useState('')
  const [capitanDni, setCapitanDni] = useState('')
  const [capitanTelefono, setCapitanTelefono] = useState('')
  const [jugadores, setJugadores] = useState<JugadorInput[]>([
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
    const extCruda = file.name.includes('.') ? file.name.split('.').pop() ?? '' : ''
    const ext = extCruda.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 10)
    const path = ext ? `${crypto.randomUUID()}.${ext}` : crypto.randomUUID()
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file)
    if (uploadError) throw new Error(`No se pudo subir el archivo a ${bucket}: ${uploadError.message}`)
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!nombreEquipo.trim() || !capitanNombre.trim() || !capitanDni.trim() || !capitanTelefono.trim()) {
      setError('Completá los datos del equipo y del capitán.')
      return
    }
    if (!logoPreset) {
      setError('Elegí un escudo para el equipo.')
      return
    }
    if (!comprobanteFile) {
      setError('Subí el comprobante de transferencia.')
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
      const comprobanteUrl = await subirArchivo(comprobanteFile, 'comprobantes')

      const { data, error: rpcError } = await supabase.rpc('inscribir_equipo', {
        p_nombre_equipo: nombreEquipo.trim(),
        p_logo_url: logoPreset,
        p_capitan_nombre: capitanNombre.trim(),
        p_capitan_dni: capitanDni.trim(),
        p_capitan_telefono: capitanTelefono.trim(),
        p_comprobante_url: comprobanteUrl,
        p_comentarios: comentarios.trim() || null,
        p_jugadores: jugadoresValidos,
        p_reglamento_aceptado: aceptaReglamento,
        p_estudiantes_facet_confirmado: confirmaFacet,
      })

      if (rpcError) {
        if (rpcError.message.includes('CUPO_COMPLETO')) {
          onCupoCompleto()
          return
        }
        if (rpcError.message.includes('ESCUDO_OCUPADO')) {
          setLogoPreset(null)
          onEscudoActualizado()
          setError('Justo se lo agarraron mientras completabas el formulario. Elegí otro escudo.')
          return
        }
        throw rpcError
      }

      onSuccess(data as number)
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al inscribir al equipo. Probá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-pitchdeep/90 overflow-y-auto z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="min-h-full flex justify-center px-4 py-10">
        <form
          onSubmit={handleSubmit}
          className="bg-pitch border border-line w-full max-w-2xl h-fit"
        >
          <div className="sticky top-0 bg-pitch border-b border-line px-6 md:px-8 py-4 flex items-center justify-between z-10">
            <h2 className="title-stencil text-2xl text-chalk">INSCRIBIR EQUIPO</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar formulario"
              className="text-chalk/50 hover:text-chalk text-xl leading-none px-2 py-1"
            >
              ✕
            </button>
          </div>

          <div className="p-6 md:p-8">
            <div className="bg-amber/15 border border-amber text-amber text-sm px-4 py-3 mb-6">
              Importante: todos los jugadores del equipo deben ser estudiantes de
              la FACET. Vas a tener que confirmarlo antes de enviar.
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
                  <label className="block text-sm mb-2">Escudo del equipo</label>
                  <LogoPicker value={logoPreset} onChange={setLogoPreset} ocupados={escudosOcupados} />
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm mb-1">Capitán (nombre y apellido)</label>
                    <input
                      type="text"
                      value={capitanNombre}
                      onChange={(e) => setCapitanNombre(e.target.value)}
                      className="w-full bg-pitchdeep border border-line px-3 py-2 text-chalk"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">DNI del capitán</label>
                    <input
                      type="text"
                      value={capitanDni}
                      onChange={(e) => setCapitanDni(e.target.value)}
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
              <div className="flex items-center justify-between mb-3">
                <legend className="text-amber text-xs uppercase tracking-wide">
                  Lista de jugadores
                </legend>
                <span className="text-xs text-chalk/50">
                  {jugadores.length + 1}/{JUGADORES_MAX + 1}
                </span>
              </div>
              <div className="space-y-2">
                {/* El capitán ya cuenta como jugador: fila fija, sin teléfono */}
                <div className="flex gap-2 items-center bg-pitchdeep/60 border border-line px-3 py-2">
                  <span className="text-xs text-lime uppercase tracking-wide shrink-0">
                    Capitán
                  </span>
                  <span className="flex-1 text-sm text-chalk truncate">
                    {capitanNombre || <span className="text-chalk/40">(nombre del capitán)</span>}
                  </span>
                  <span className="text-sm text-chalk/70">
                    {capitanDni || <span className="text-chalk/40">DNI</span>}
                  </span>
                </div>

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
                Inscripción
              </legend>
              <div className="bg-pitchdeep border border-line px-4 py-3 mb-4 text-sm space-y-2">
                <p>
                  Costo: <span className="font-semibold text-lime">$30.000</span> por equipo
                </p>
                <div>
                  <p className="text-chalk/50 text-xs uppercase tracking-wide mb-1">
                    Transferir a
                  </p>
                  <p className="text-chalk">
                    Alias: <span className="font-semibold text-lime">ateii.unt</span> — a nombre de Paula González
                  </p>
                </div>
              </div>
              <label className="block text-sm mb-1">Comprobante de transferencia</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setComprobanteFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-chalk/80 file:mr-3 file:py-2 file:px-3 file:border file:border-line file:bg-pitchdeep file:text-chalk"
                required
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
                <span>
                  Leí y acepto el reglamento del torneo.{' '}
                  <ReglamentoTrigger label="(leerlo acá)" className="text-lime hover:underline" />
                </span>
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
          </div>
        </form>
      </div>
    </div>
  )
}
