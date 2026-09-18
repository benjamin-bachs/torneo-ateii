import { Equipo } from '../lib/types'
import { CUPO_MAX_EQUIPOS } from '../lib/supabase'
import { escudoDeId } from '../lib/escudos'

interface Props {
  equipos: Equipo[]
}

function Slot({ equipo, numero }: { equipo?: Equipo; numero: number }) {
  const escudo = escudoDeId(equipo?.logo_url)
  return (
    <div className="flex items-center gap-2 bg-pitch border border-line px-3 py-3 min-w-0">
      <span className="title-stencil text-lime text-sm w-5 text-center shrink-0">
        {numero}
      </span>
      {equipo ? (
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-7 h-7 bg-pitchdeep border border-line shrink-0 flex items-center justify-center">
            {escudo && <escudo.Icon size={14} color={escudo.color} strokeWidth={2} />}
          </div>
          <span className="truncate font-semibold text-sm">{equipo.nombre_equipo}</span>
        </div>
      ) : (
        <span className="text-chalk/40 italic text-sm">Vacante</span>
      )}
    </div>
  )
}

function PartidoTBD({ label }: { label: string }) {
  return (
    <div className="border border-dashed border-line px-4 py-3 text-chalk/40 text-sm h-fit">
      {label}
    </div>
  )
}

function ColLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs uppercase tracking-wide text-amber mb-2">{children}</p>
}

export default function Fixture({ equipos }: Props) {
  const slots: (Equipo | undefined)[] = Array.from({ length: CUPO_MAX_EQUIPOS }, () => undefined)
  equipos.forEach((equipo) => {
    if (equipo.posicion && equipo.posicion >= 1 && equipo.posicion <= CUPO_MAX_EQUIPOS) {
      slots[equipo.posicion - 1] = equipo
    }
  })

  // 8 pares de octavos (16 equipos)
  const octavos = Array.from({ length: 8 }, (_, i) => [slots[i * 2], slots[i * 2 + 1]])
  const cuartosLabels = ['Ganador octavos 1 vs. 2', 'Ganador octavos 3 vs. 4', 'Ganador octavos 5 vs. 6', 'Ganador octavos 7 vs. 8']
  const semiLabels = ['Ganador cuartos 1 vs. 2', 'Ganador cuartos 3 vs. 4']

  return (
    <div className="w-full">
      <h2 className="title-stencil text-2xl md:text-3xl text-chalk mb-6">
        FIXTURE — ELIMINACIÓN DIRECTA
      </h2>

      {/* Mobile: todo apilado en orden de lectura */}
      <div className="lg:hidden space-y-8">
        <div>
          <ColLabel>Octavos de final</ColLabel>
          <div className="space-y-3">
            {octavos.map((par, i) => (
              <div key={i} className="space-y-px">
                <Slot equipo={par[0]} numero={i * 2 + 1} />
                <Slot equipo={par[1]} numero={i * 2 + 2} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <ColLabel>Cuartos de final</ColLabel>
          <div className="space-y-3">
            {cuartosLabels.map((label, i) => (
              <PartidoTBD key={i} label={label} />
            ))}
          </div>
        </div>
        <div>
          <ColLabel>Semifinal</ColLabel>
          <div className="space-y-3">
            {semiLabels.map((label, i) => (
              <PartidoTBD key={i} label={label} />
            ))}
          </div>
        </div>
        <div>
          <ColLabel>Final</ColLabel>
          <PartidoTBD label="Ganador semi 1 vs. Ganador semi 2" />
        </div>
      </div>

      {/* Desktop grande: grid tipo bracket con 4 rondas.
          8 filas de contenido (una por par de octavos), filas 2 a 9. */}
      <div
        className="hidden lg:grid lg:gap-x-6 lg:gap-y-3"
        style={{ gridTemplateColumns: '1.7fr 1fr 1fr 1fr' }}
      >
        <div className="col-start-1 row-start-1"><ColLabel>Octavos de final</ColLabel></div>
        <div className="col-start-2 row-start-1"><ColLabel>Cuartos de final</ColLabel></div>
        <div className="col-start-3 row-start-1"><ColLabel>Semifinal</ColLabel></div>
        <div className="col-start-4 row-start-1"><ColLabel>Final</ColLabel></div>

        {octavos.map((par, i) => (
          <div key={i} className="col-start-1 space-y-px" style={{ gridRow: i + 2 }}>
            <Slot equipo={par[0]} numero={i * 2 + 1} />
            <Slot equipo={par[1]} numero={i * 2 + 2} />
          </div>
        ))}

        {cuartosLabels.map((label, j) => {
          const rowStart = 2 + j * 2
          return (
            <div key={j} className="col-start-2 self-center" style={{ gridRow: `${rowStart} / ${rowStart + 2}` }}>
              <PartidoTBD label={label} />
            </div>
          )
        })}

        {semiLabels.map((label, k) => {
          const rowStart = 2 + k * 4
          return (
            <div key={k} className="col-start-3 self-center" style={{ gridRow: `${rowStart} / ${rowStart + 4}` }}>
              <PartidoTBD label={label} />
            </div>
          )
        })}

        <div className="col-start-4 self-center" style={{ gridRow: '2 / 10' }}>
          <PartidoTBD label="Ganador semi 1 vs. Ganador semi 2" />
        </div>
      </div>
    </div>
  )
}
