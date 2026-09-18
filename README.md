# Torneo de Fútbol 6 Relámpago — FACET

App de inscripción: muestra el fixture (8 equipos, eliminación directa) y un
botón "Inscribirse" que desaparece al completarse el cupo.

## 1. Crear el proyecto en Supabase

1. Andá a [supabase.com](https://supabase.com) > tu organización > **New project**.
2. Cuando esté listo, andá a **SQL Editor** > **New query**, pegá todo el
   contenido de [`supabase/schema.sql`](./supabase/schema.sql) y ejecutalo
   (▶ Run). Esto crea las tablas `equipos` y `jugadores`, la función que
   controla el cupo de 8 equipos sin condiciones de carrera, y los permisos
   de Storage.
3. Andá a **Project Settings > API** y copiá:
   - **Project URL** → va en `VITE_SUPABASE_URL`
   - **anon public key** → va en `VITE_SUPABASE_ANON_KEY`

## 2. Correrlo localmente (opcional)

```bash
npm install
cp .env.example .env.local
# completá .env.local con tus valores de Supabase
npm run dev
```

## 3. Subir a GitHub

```bash
git init
git add .
git commit -m "Torneo FACET: inscripción con Supabase"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/torneo-facet.git
git push -u origin main
```

## 4. Deploy en Vercel

1. En [vercel.com](https://vercel.com) > **Add New > Project** > importá el
   repo de GitHub.
2. Vercel detecta Vite automáticamente (build: `npm run build`, output:
   `dist`). No hace falta tocar nada ahí.
3. En **Environment Variables** agregá:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. **Deploy**. Cada push a `main` vuelve a desplegar solo.

## Cómo funciona el control de cupo

Todo el guardado pasa por una única función de la base de datos
(`inscribir_equipo`, ver `schema.sql`) que:
1. Toma un lock corto para que no entren dos inscripciones a la vez.
2. Cuenta los equipos ya inscriptos.
3. Si ya hay 8, rechaza la inscripción (`CUPO_COMPLETO`) y el sitio le avisa
   al usuario y le muestra el fixture actualizado sin el botón.
4. Si hay lugar, guarda el equipo y sus jugadores en la misma transacción.

Así, aunque dos capitanes envíen el formulario en el mismo segundo, nunca
se pasa de 8 equipos.

## Ajustar valores

- Cupo de equipos: `CUPO_MAX_EQUIPOS` en `src/lib/supabase.ts` **y**
  `v_cupo_max` en la función `inscribir_equipo` de `schema.sql` (tienen que
  coincidir). Hoy está en 16 equipos (octavos, cuartos, semifinal y final).
- Mínimo/máximo de jugadores por equipo: `JUGADORES_MIN` (en
  `RegistrationForm.tsx`) y `JUGADORES_MAX` (en `supabase.ts`). Hoy es de 5
  a 9 jugadores además del capitán (6 a 10 personas por equipo en total).

## Pendientes según el documento del torneo

- Confirmar costo real de inscripción (el reglamento lo marca "a
  modificación") — hoy el formulario no cobra nada online, solo pide
  comprobante si ya transfirieron.
- Cargar el número de cuenta para transferencias en el texto del formulario
  o el reglamento.
