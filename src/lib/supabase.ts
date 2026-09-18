import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  // Esto se ve en la consola del navegador si faltan las variables de entorno
  console.error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Configuralas en .env (local) o en Vercel (producción).'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const CUPO_MAX_EQUIPOS = 16
export const JUGADORES_MAX = 9 // además del capitán, que ya cuenta como jugador #1
