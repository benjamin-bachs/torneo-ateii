import { Equipo } from '../lib/types'
import { CUPO_MAX_EQUIPOS } from '../lib/supabase'

interface Props {
  equipos: Equipo[]
}

function Slot({ equipo, numero }: { equipo?: Equipo; numero: number }) {
  return (
    <div className="flex items-center gap-3 bg-pitch border border-line px-4 py-3">
      <span className="title-stencil text-lime text-sm w-5 text-center shrink-0">
        {numero}
      </span>
      {equipo ? (
        <div className="flex items-center gap-3 min-w-0">
          {equipo.logo_url ? (
            <img
              src={equipo.logo_url}
              alt={`Escudo de ${equipo.nombre_equipo}`}
              className="w-8 h-8 object-cover border border-line shrink-0"
            />
          ) : (
            <div className="w-8 h-8 bg-line shrink-0" />
          )}
          <span className="truncate font-semibold">{equipo.nombre_equipo}</span>
        </div>
      ) : (
        <span className="text-chalk/40 italic">Vacante</span>
      )}
    </div>
  )
}

function PartidoTBD({ label }: { label: string }) {
  return (
    <div className="border border-dashed border-line px-4 py-3 text-chalk/40 text-sm">
      {label}
    </div>
  )
}

export default function Fixture({ equipos }: Props) {
  const slots: (Equipo | undefined)[] = Array.from(
    { length: CUPO_MAX_EQUIPOS },
    (_, i) => equipos[i]
  )

  const cuartos = [
    [slots[0], slots[1]],
    [slots[2], slots[3]],
    [slots[4], slots[5]],
    [slots[6], slots[7]],
  ]

  return (
    <div className="w-full">
      <h2 className="title-stencil text-2xl md:text-3xl text-chalk mb-1">
        FIXTURE — ELIMINACIÓN DIRECTA
      </h2>
      <p className="text-chalk/60 text-sm mb-6">
        8 equipos. Cuartos de final, semifinal y final. Los cruces se sortean
        el día del torneo.
      </p>

      <div className="grid md:grid-cols-3 gap-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-amber mb-2">
            Cuartos de final
          </p>
          <div className="space-y-3">
            {cuartos.map((par, i) => (
              <div key={i} className="space-y-px">
                <Slot equipo={par[0]} numero={i * 2 + 1} />
                <Slot equipo={par[1]} numero={i * 2 + 2} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-around">
          <p className="text-xs uppercase tracking-wide text-amber mb-2">
            Semifinal
          </p>
          <div className="space-y-6">
            <PartidoTBD label="Ganador cuartos 1 vs. Ganador cuartos 2" />
            <PartidoTBD label="Ganador cuartos 3 vs. Ganador cuartos 4" />
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <p className="text-xs uppercase tracking-wide text-amber mb-2">
            Final
          </p>
          <PartidoTBD label="Ganador semi 1 vs. Ganador semi 2" />
        </div>
      </div>
    </div>
  )
}
