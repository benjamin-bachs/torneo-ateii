// Lo único que puede leer cualquier visitante (para el fixture público).
// El resto de los datos del equipo (capitán, teléfono, comprobante...)
// solo los puede leer el admin logueado — ver schema.sql.
export interface EquipoFixture {
  id: string
  nombre_equipo: string
  logo_url: string | null
  posicion: number | null
  created_at: string
}

// Fila completa, solo accesible para el admin autenticado.
export interface EquipoCompleto extends EquipoFixture {
  capitan_nombre: string
  capitan_dni: string
  capitan_telefono: string
  comprobante_url: string | null
  comentarios: string | null
}

export interface JugadorCompleto {
  id: string
  equipo_id: string
  nombre_apellido: string
  dni: string
  orden: number
}

export interface JugadorInput {
  nombre_apellido: string
  dni: string
}
