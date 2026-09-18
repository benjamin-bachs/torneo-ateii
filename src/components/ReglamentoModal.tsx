import { useState } from 'react'

const REGLAS = [
  'Máximo 10 personas por equipo.',
  'Se juega con 7 jugadores (contando el arquero).',
  'Tolerancia de 10 minutos para el equipo que llegue tarde; cumplido el tiempo, gana el equipo presente.',
  'Son 16 equipos. Se juega por eliminación directa: octavos, cuartos, semifinal y final.',
  'Son 2 tiempos de 15 minutos cada uno.',
  'La final se juega a 2 tiempos de 20 minutos.',
  'En caso de empate, se define por penales a 3 tiros.',
  'No hay límite de cambios.',
  'Para hacer un cambio hay que avisarle al árbitro, y el jugador debe salir de la cancha antes de que ingrese el suplente.',
  'Hay tarjeta amarilla y roja.',
  'La tarjeta amarilla saca al jugador 2 minutos; cumplido el tiempo, vuelve a ingresar.',
  'La tarjeta roja deja al equipo con un jugador menos el resto del partido.',
  'La roja directa deja afuera a ese jugador en la fase siguiente.',
  'Los laterales se sacan con el pie, desde el piso.',
  'Los laterales se cuentan 5 segundos; pasado ese tiempo, el lateral pasa al equipo contrario.',
  'Los saques de arco del arquero no pueden pasar la mitad de la cancha.',
  'Máximo 5 segundos de pelota en mano para los arqueros.',
]

function ReglamentoContenido() {
  return (
    <>
      <div className="bg-amber/15 border border-amber text-amber text-sm px-4 py-3 mb-6">
        Requisito excluyente: todos los jugadores de cada equipo deben ser
        estudiantes de la FACET.
      </div>

      <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1 text-chalk/70 text-sm mb-6">
        <p><span className="text-chalk/40">Fecha:</span> 25 de septiembre</p>
        <p><span className="text-chalk/40">Horario:</span> 10:00 a 17:00</p>
        <p><span className="text-chalk/40">Lugar:</span> Complejo Dickens</p>
        <p><span className="text-chalk/40">Modalidad:</span> Fútbol 6</p>
      </div>

      <ol className="space-y-2.5 text-sm text-chalk/85 list-decimal list-inside marker:text-lime">
        {REGLAS.map((regla, i) => (
          <li key={i} className="pl-1">{regla}</li>
        ))}
      </ol>

      <p className="text-xs text-chalk/40 mt-6">
        Lo recaudado en inscripciones y sponsors se destina íntegramente a
        solventar los gastos del Bautismo de la carrera.
      </p>
    </>
  )
}

export default function ReglamentoTrigger({
  label = 'Ver reglamento completo',
  className = 'text-sm text-lime hover:underline',
}: {
  label?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-pitchdeep/90 z-[60] overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div className="min-h-full flex justify-center px-4 py-10">
            <div className="bg-pitch border border-line w-full max-w-lg h-fit">
              <div className="sticky top-0 bg-pitch border-b border-line px-6 py-4 flex items-center justify-between">
                <h2 className="title-stencil text-xl text-chalk">REGLAMENTO</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar reglamento"
                  className="text-chalk/50 hover:text-chalk text-xl leading-none px-2 py-1"
                >
                  ✕
                </button>
              </div>
              <div className="px-6 py-6">
                <ReglamentoContenido />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
