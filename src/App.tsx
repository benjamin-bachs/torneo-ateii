import { useEffect, useState, useCallback } from 'react'
import { supabase, CUPO_MAX_EQUIPOS } from './lib/supabase'
import { Equipo } from './lib/types'
import Fixture from './components/Fixture'
import RegistrationForm from './components/RegistrationForm'
import ReglamentoTrigger from './components/ReglamentoModal'
import SorteoReveal from './components/SorteoReveal'

type Vista = 'fixture' | 'formulario' | 'sorteo' | 'cupo_completo'

export default function App() {
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [cargando, setCargando] = useState(true)
  const [vista, setVista] = useState<Vista>('fixture')
  const [posicionSorteada, setPosicionSorteada] = useState<number | null>(null)

  const cargarEquipos = useCallback(async () => {
    const { data, error } = await supabase
      .from('equipos')
      .select('id, nombre_equipo, logo_url, capitan_nombre, capitan_dni, capitan_telefono, posicion, created_at')
      .order('posicion', { ascending: true })

    if (!error && data) setEquipos(data as Equipo[])
    setCargando(false)
  }, [])

  useEffect(() => {
    cargarEquipos()
  }, [cargarEquipos])

  const cupoCompleto = equipos.length >= CUPO_MAX_EQUIPOS

  return (
    <div className="min-h-screen px-4 py-10 md:py-16">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 text-center">
          <p className="text-amber text-xs uppercase tracking-widest mb-2">
            25 de septiembre · Complejo Dickens · 10:00 a 17:00
          </p>
          <h1 className="title-stencil text-4xl md:text-6xl text-chalk leading-none">
            TORNEO DE FÚTBOL 6<br />RELÁMPAGO
          </h1>
          <p className="text-chalk/60 mt-3 text-sm max-w-md mx-auto">
            A beneficio del Bautismo de la carrera. Abierto solo a estudiantes de la FACET.
          </p>
          <div className="mt-3">
            <ReglamentoTrigger />
          </div>
        </header>

        {cargando ? (
          <p className="text-center text-chalk/50 text-sm">Cargando fixture…</p>
        ) : (
          <>
            <div className="mb-10 border-b border-line pb-6 flex flex-col items-center gap-4">
              <p className="title-stencil text-lg text-chalk">
                {equipos.length}/{CUPO_MAX_EQUIPOS} EQUIPOS INSCRIPTOS
              </p>

              {!cupoCompleto ? (
                <button
                  onClick={() => setVista('formulario')}
                  className="bg-lime text-pitchdeep font-bold px-8 py-3 title-stencil text-lg tracking-wide hover:brightness-110 transition"
                >
                  INSCRIBIRSE
                </button>
              ) : (
                <p className="text-amber font-semibold">
                  Cupo completo — ya se anotaron los 16 equipos.
                </p>
              )}
            </div>

            <Fixture equipos={equipos} />
          </>
        )}
      </div>

      {vista === 'formulario' && (
        <RegistrationForm
          onClose={() => setVista('fixture')}
          onSuccess={(posicion) => {
            setPosicionSorteada(posicion)
            setVista('sorteo')
            cargarEquipos()
          }}
          onCupoCompleto={() => {
            setVista('cupo_completo')
            cargarEquipos()
          }}
        />
      )}

      {vista === 'sorteo' && posicionSorteada !== null && (
        <SorteoReveal
          posicionFinal={posicionSorteada}
          onDone={() => setVista('fixture')}
        />
      )}

      {vista === 'cupo_completo' && (
        <div className="fixed inset-0 bg-pitchdeep flex items-center justify-center p-4 z-50">
          <div className="bg-pitch border border-line max-w-md w-full p-8 text-center">
            <h2 className="title-stencil text-2xl text-amber mb-3">CUPO COMPLETO</h2>
            <p className="text-chalk/80 text-sm mb-6">
              Justo se completaron los 16 equipos mientras cargabas el formulario.
              ¡Gracias por el interés!
            </p>
            <button
              onClick={() => setVista('fixture')}
              className="bg-lime text-pitchdeep font-bold px-6 py-2 title-stencil"
            >
              VER FIXTURE
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
