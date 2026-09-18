export interface Equipo {
  id: string
  nombre_equipo: string
  logo_url: string | null
  capitan_nombre: string
  capitan_dni: string
  capitan_telefono: string
  posicion: number | null
  created_at: string
}

export interface JugadorInput {
  nombre_apellido: string
  dni: string
}
