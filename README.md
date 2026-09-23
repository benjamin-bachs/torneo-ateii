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

## Cómo funciona el sorteo de posición

Cuando un equipo termina de inscribirse, la misma función `inscribir_equipo`
sortea al azar un casillero libre (1 a 16) y lo guarda en la columna
`posicion` de ese equipo — no se puede repetir (columna `unique`) y queda
fijo para siempre. El sitio muestra una animación de números girando y
después revela el casillero asignado. El fixture ubica a cada equipo según
ese número, no según el orden en que se inscribió.

## Panel admin: exportar, equipos, fixture y mostrar/ocultar

Hay una URL oculta, `/#admin` (ej. `https://tu-sitio.vercel.app/#admin`),
con login y cuatro secciones:

- **Configuración**: un interruptor para mostrar u ocultar el fixture al
  público. Mientras está apagado, el sitio muestra un aviso de
  "próximamente" en su lugar (útil al principio, cuando hay pocos
  equipos anotados y el fixture se ve muy vacío). El resto del sitio
  —inscribirse, ver el reglamento— sigue funcionando igual.
- **Descargar planilla (.xlsx)**: dos hojas, resumen por equipo y
  listado completo de jugadores con sus DNI.
- **Equipos**: lista de equipos con capitán y teléfono, cantidad de
  jugadores, y el total general. Tocando un equipo se despliega el
  resto de los jugadores (sin DNI) y la captura del comprobante.
- **Fixture**: una lista de todos los partidos (octavos, cuartos,
  semifinal, final). Tocás el equipo que ganó cada partido y el fixture
  público se actualiza solo, mostrando quién pasó de ronda. Un partido
  queda bloqueado ("Pendiente") hasta que los dos equipos que lo
  juegan estén definidos. Si cambiás un resultado ya cargado, los
  partidos posteriores que dependían de él se borran automáticamente
  para que los vuelvas a cargar.

**Para habilitarlo, una sola vez:**
1. En Supabase, andá a **Authentication > Users > Add user**. Cargá tu
   email y una contraseña, y tildá **"Auto Confirm User"**.
2. Ese es el único usuario que va a poder entrar — no hay registro
   público en el sitio.

**Por qué es seguro** aunque cualquiera encuentre la URL `/#admin`: los
datos sensibles (teléfono y DNI del capitán, DNIs de jugadores,
comprobantes) están protegidos a nivel de base de datos — sin loguearte
con ese usuario, Supabase directamente no te devuelve esa información,
sin importar qué URL visites. El público en general solo puede leer el
nombre, escudo y posición de cada equipo (lo necesario para el fixture)
y quién ganó cada partido (para poder seguirlo en vivo).

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

## Nota si ya habías corrido una versión anterior del schema

Esta versión, además de las tablas y la función, **revoca el acceso
público a las columnas sensibles de `equipos`** (teléfono/DNI del
capitán), agrega la tabla `resultados` (para que el admin pueda ir
cargando quién gana cada partido), la tabla `configuracion` (para
mostrar/ocultar el fixture) y sus políticas de acceso. Es importante
volver a correr el `schema.sql` completo en el SQL Editor aunque ya lo
hayas corrido antes, para que todo esto quede aplicado.
