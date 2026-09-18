import { useEffect, useRef, useState } from 'react'
import { CUPO_MAX_EQUIPOS } from '../lib/supabase'

interface Props {
  posicionFinal: number
  onDone: () => void
}

const DURACION_MS = 2200
const INTERVALO_MS = 70

export default function SorteoReveal({ posicionFinal, onDone }: Props) {
  const [numero, setNumero] = useState(1)
  const [revelado, setRevelado] = useState(false)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      setNumero(1 + Math.floor(Math.random() * CUPO_MAX_EQUIPOS))
    }, INTERVALO_MS)

    const timeout = window.setTimeout(() => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
      setNumero(posicionFinal)
      setRevelado(true)
    }, DURACION_MS)

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
      window.clearTimeout(timeout)
    }
  }, [posicionFinal])

  return (
    <div className="fixed inset-0 bg-pitchdeep flex items-center justify-center p-4 z-50">
      <div className="text-center max-w-sm w-full">
        <p className="text-amber text-xs uppercase tracking-widest mb-4">
          {revelado ? 'Posición sorteada' : 'Sorteando tu lugar en el fixture…'}
        </p>

        <div
          className={`title-stencil border-2 mx-auto w-40 h-40 flex items-center justify-center text-7xl transition-all duration-300 ${
            revelado
              ? 'border-lime text-lime scale-110'
              : 'border-line text-chalk/70'
          }`}
        >
          {numero}
        </div>

        {revelado && (
          <>
            <p className="text-chalk mt-6 text-sm">
              Tu equipo quedó en el <span className="text-lime font-semibold">casillero {posicionFinal}</span> del
              fixture.
            </p>
            <button
              onClick={onDone}
              className="mt-6 bg-lime text-pitchdeep font-bold px-8 py-3 title-stencil tracking-wide"
            >
              VER FIXTURE
            </button>
          </>
        )}
      </div>
    </div>
  )
}
