import { ESCUDOS, PRESET_PREFIX } from '../lib/escudos'

interface Props {
  value: string | null
  onChange: (value: string | null) => void
  ocupados: string[]
}

export default function LogoPicker({ value, onChange, ocupados }: Props) {
  return (
    <div>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {ESCUDOS.map(({ id, Icon, color }) => {
          const val = `${PRESET_PREFIX}${id}`
          const selected = value === val
          const ocupado = ocupados.includes(val) && !selected
          return (
            <button
              key={id}
              type="button"
              disabled={ocupado}
              onClick={() => !ocupado && onChange(selected ? null : val)}
              aria-pressed={selected}
              aria-label={ocupado ? `Escudo ${id}, ya elegido por otro equipo` : `Elegir escudo ${id}`}
              title={ocupado ? 'Ya lo eligió otro equipo' : undefined}
              className={`relative aspect-square flex items-center justify-center border transition ${
                selected
                  ? 'border-lime bg-lime/10 ring-1 ring-lime'
                  : ocupado
                  ? 'border-line bg-pitchdeep/40 opacity-30 cursor-not-allowed'
                  : 'border-line bg-pitchdeep hover:border-chalk/40'
              }`}
            >
              <Icon size={22} color={color} strokeWidth={2} />
              {ocupado && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="w-full h-px bg-chalk/50 rotate-45" />
                </span>
              )}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-chalk/40 mt-2">
        {value
          ? 'Escudo seleccionado.'
          : 'Elegí un escudo para tu equipo (los tachados ya los eligió otro equipo).'}
      </p>
    </div>
  )
}
