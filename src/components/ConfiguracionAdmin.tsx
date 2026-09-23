import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export default function ConfiguracionAdmin() {
  const [mostrarFixture, setMostrarFixture] = useState(true)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from('configuracion')
      .select('mostrar_fixture')
      .eq('id', 1)
      .maybeSingle()
    if (!error && data) setMostrarFixture(data.mostrar_fixture)
    if (error) setError(error.message)
    setCargando(false)
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function alternar() {
    setError(null)
    setGuardando(true)
    const nuevoValor = !mostrarFixture
    const { error } = await supabase
      .from('configuracion')
      .update({ mostrar_fixture: nuevoValor })
      .eq('id', 1)
    if (error) {
      setError(error.message)
    } else {
      setMostrarFixture(nuevoValor)
    }
    setGuardando(false)
  }

  if (cargando) {
    return <p className="text-chalk/50 text-sm">Cargando…</p>
  }

  return (
    <div>
      {error && <p className="text-red-300 text-sm mb-3">{error}</p>}

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-chalk text-sm font-semibold">Fixture visible al público</p>
          <p className="text-chalk/50 text-xs mt-0.5">
            {mostrarFixture
              ? 'Cualquiera que entre al sitio ve el fixture con los equipos inscriptos.'
              : 'El sitio muestra un aviso de "próximamente" en vez del fixture.'}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={mostrarFixture}
          onClick={alternar}
          disabled={guardando}
          className={`relative w-14 h-8 shrink-0 border transition disabled:opacity-50 ${
            mostrarFixture ? 'bg-lime/20 border-lime' : 'bg-pitchdeep border-line'
          }`}
        >
          <span
            className={`absolute top-1 w-5 h-5 transition-all ${
              mostrarFixture ? 'left-8 bg-lime' : 'left-1 bg-chalk/40'
            }`}
          />
        </button>
      </div>
    </div>
  )
}
