import { ESCUDOS, PRESET_PREFIX } from '../lib/escudos'

interface Props {
  value: string | null
  onChange: (value: string | null) => void
}

export default function LogoPicker({ value, onChange }: Props) {
  return (
    <div>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {ESCUDOS.map(({ id, Icon, color }) => {
          const val = `${PRESET_PREFIX}${id}`
          const selected = value === val
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(selected ? null : val)}
              aria-pressed={selected}
              aria-label={`Elegir escudo ${id}`}
              className={`aspect-square flex items-center justify-center border transition ${
                selected
                  ? 'border-lime bg-lime/10 ring-1 ring-lime'
                  : 'border-line bg-pitchdeep hover:border-chalk/40'
              }`}
            >
              <Icon size={22} color={color} strokeWidth={2} />
            </button>
          )
        })}
      </div>
      <p className="text-xs text-chalk/40 mt-2">
        {value ? 'Escudo seleccionado.' : 'Elegí un escudo para tu equipo (opcional).'}
      </p>
    </div>
  )
}
