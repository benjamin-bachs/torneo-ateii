import { EquipoFixture } from '../lib/types'
import {
  RONDAS,
  RondaId,
  Resultado,
  armarResultadosMap,
  armarSlotsOctavos,
  resolverEquipo,
} from '../lib/bracket'
import { escudoDeId } from '../lib/escudos'
import { CUPO_MAX_EQUIPOS } from '../lib/supabase'

interface Props {
  equipos: EquipoFixture[]
  resultados: Resultado[]
}

function SlotOctavos({ equipo, numero, esGanador }: { equipo?: EquipoFixture; numero: number; esGanador: boolean }) {
  const escudo = escudoDeId(equipo?.logo_url)
  return (
    <div
      className={`flex items-center gap-2 bg-pitch border px-3 py-3 min-w-0 ${
        esGanador ? 'border-lime' : 'border-line'
      }`}
    >
      <span className="title-stencil text-lime text-sm w-5 text-center shrink-0">{numero}</span>
      {equipo ? (
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-7 h-7 bg-pitchdeep border border-line shrink-0 flex items-center justify-center">
            {escudo && <escudo.Icon size={14} color={escudo.color} strokeWidth={2} />}
          </div>
          <span className={`truncate text-sm ${esGanador ? 'text-lime font-semibold' : 'font-semibold'}`}>
            {equipo.nombre_equipo}
          </span>
        </div>
      ) : (
        <span className="text-chalk/40 italic text-sm">Vacante</span>
      )}
    </div>
  )
}

function PartidoPosterior({
  equipoA,
  equipoB,
  ganadorId,
}: {
  equipoA?: EquipoFixture
  equipoB?: EquipoFixture
  ganadorId?: string
}) {
  const linea = (eq?: EquipoFixture) => {
    const esGanador = !!eq && eq.id === ganadorId
    return (
      <p className={`truncate ${esGanador ? 'text-lime font-semibold' : eq ? 'text-chalk/80' : 'text-chalk/30 italic'}`}>
        {eq ? eq.nombre_equipo : 'Pendiente'}
      </p>
    )
  }
  return (
    <div className="border border-line px-3 py-2 text-sm space-y-1 h-fit">
      {linea(equipoA)}
      {linea(equipoB)}
    </div>
  )
}

function ColLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs uppercase tracking-wide text-amber mb-2">{children}</p>
}

export default function Fixture({ equipos, resultados }: Props) {
  const slotsOctavos = armarSlotsOctavos(equipos, CUPO_MAX_EQUIPOS)
  const equiposPorId = new Map(equipos.map((e) => [e.id, e]))
  const resultadosMap = armarResultadosMap(resultados)

  const octavos = Array.from({ length: 8 }, (_, i) => [slotsOctavos[i * 2], slotsOctavos[i * 2 + 1]])

  const resolver = (ronda: RondaId, numero: number, lado: 0 | 1) =>
    resolverEquipo(ronda, numero, lado, slotsOctavos, equiposPorId, resultadosMap)

  return (
    <div className="w-full">
      <h2 className="title-stencil text-2xl md:text-3xl text-chalk mb-6">
        FIXTURE — ELIMINACIÓN DIRECTA
      </h2>

      {/* Mobile/tablet: todo apilado en orden de lectura */}
      <div className="lg:hidden space-y-8">
        <div>
          <ColLabel>Octavos de final</ColLabel>
          <div className="space-y-3">
            {octavos.map((par, i) => (
              <div key={i} className="space-y-px">
                <SlotOctavos
                  equipo={par[0]}
                  numero={i * 2 + 1}
                  esGanador={!!par[0] && resultadosMap.octavos[i + 1] === par[0]?.id}
                />
                <SlotOctavos
                  equipo={par[1]}
                  numero={i * 2 + 2}
                  esGanador={!!par[1] && resultadosMap.octavos[i + 1] === par[1]?.id}
                />
              </div>
            ))}
          </div>
        </div>

        {RONDAS.filter((r) => r.id !== 'octavos').map((rondaDef) => (
          <div key={rondaDef.id}>
            <ColLabel>{rondaDef.label}</ColLabel>
            <div className="space-y-3">
              {Array.from({ length: rondaDef.partidos }, (_, i) => i + 1).map((numero) => (
                <PartidoPosterior
                  key={numero}
                  equipoA={resolver(rondaDef.id, numero, 0)}
                  equipoB={resolver(rondaDef.id, numero, 1)}
                  ganadorId={resultadosMap[rondaDef.id][numero]}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop grande: grid tipo bracket con 4 rondas */}
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
            <SlotOctavos
              equipo={par[0]}
              numero={i * 2 + 1}
              esGanador={!!par[0] && resultadosMap.octavos[i + 1] === par[0]?.id}
            />
            <SlotOctavos
              equipo={par[1]}
              numero={i * 2 + 2}
              esGanador={!!par[1] && resultadosMap.octavos[i + 1] === par[1]?.id}
            />
          </div>
        ))}

        {Array.from({ length: 4 }, (_, i) => i + 1).map((numero) => {
          const rowStart = 2 + (numero - 1) * 2
          return (
            <div key={numero} className="col-start-2 self-center" style={{ gridRow: `${rowStart} / ${rowStart + 2}` }}>
              <PartidoPosterior
                equipoA={resolver('cuartos', numero, 0)}
                equipoB={resolver('cuartos', numero, 1)}
                ganadorId={resultadosMap.cuartos[numero]}
              />
            </div>
          )
        })}

        {Array.from({ length: 2 }, (_, i) => i + 1).map((numero) => {
          const rowStart = 2 + (numero - 1) * 4
          return (
            <div key={numero} className="col-start-3 self-center" style={{ gridRow: `${rowStart} / ${rowStart + 4}` }}>
              <PartidoPosterior
                equipoA={resolver('semifinal', numero, 0)}
                equipoB={resolver('semifinal', numero, 1)}
                ganadorId={resultadosMap.semifinal[numero]}
              />
            </div>
          )
        })}

        <div className="col-start-4 self-center" style={{ gridRow: '2 / 10' }}>
          <PartidoPosterior
            equipoA={resolver('final', 1, 0)}
            equipoB={resolver('final', 1, 1)}
            ganadorId={resultadosMap.final[1]}
          />
          {resultadosMap.final[1] && (
            <p className="title-stencil text-lime text-sm mt-3">
              🏆 {equiposPorId.get(resultadosMap.final[1])?.nombre_equipo}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
