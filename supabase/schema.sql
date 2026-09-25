-- ==========================================================
-- ESQUEMA: Torneo de Fútbol 6 Relámpago — FACET
-- Pegar y ejecutar en Supabase > SQL Editor > New query > Run
--
-- Este script es seguro de correr más de una vez (usa IF NOT EXISTS
-- y DROP ... IF EXISTS antes de crear cada cosa), así que si ya lo
-- habías corrido antes, simplemente corré esta versión completa de
-- nuevo sin miedo a errores de "ya existe".
-- ==========================================================

-- 1) TABLAS ------------------------------------------------

create table if not exists equipos (
  id uuid primary key default gen_random_uuid(),
  nombre_equipo text not null,
  logo_url text,
  capitan_nombre text not null,
  capitan_dni text not null,
  capitan_telefono text not null,
  comprobante_url text,
  comentarios text,
  reglamento_aceptado boolean not null default true,
  estudiantes_facet_confirmado boolean not null default true,
  posicion int unique,
  created_at timestamptz not null default now()
);

-- Por si ya habías corrido una versión anterior de este schema sin estas columnas:
alter table equipos add column if not exists capitan_dni text;
alter table equipos add column if not exists posicion int unique;

-- Grupo de la fase de grupos ('A', 'B' o 'C'). Lo asigna el admin desde
-- /#admin; queda null hasta que se sortee/arme la fase de grupos.
alter table equipos add column if not exists grupo text;
alter table equipos drop constraint if exists equipos_grupo_check;
alter table equipos add constraint equipos_grupo_check
  check (grupo is null or grupo in ('A', 'B', 'C'));

-- Respaldo a nivel de base: aunque algo pase por alto la función,
-- esto impide que dos equipos queden con el mismo escudo.
create unique index if not exists equipos_logo_url_unique_idx
  on equipos (logo_url)
  where logo_url is not null;

create table if not exists jugadores (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid not null references equipos(id) on delete cascade,
  nombre_apellido text not null,
  dni text not null,
  orden int not null
);

-- Un renglón por partido jugado (uno por ronda+número), con el equipo
-- ganador. El admin la va completando desde /#admin a medida que
-- avanza el torneo; el fixture público la lee para mostrar quién pasó.
create table if not exists resultados (
  id uuid primary key default gen_random_uuid(),
  ronda text not null check (ronda in ('octavos', 'cuartos', 'semifinal', 'final')),
  numero int not null,
  equipo_ganador_id uuid not null references equipos(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (ronda, numero)
);

-- 2) SEGURIDAD (RLS) ----------------------------------------
-- El público NO inserta directo en las tablas: todo pasa por la
-- función inscribir_equipo() de abajo, que controla el cupo.
-- Sí puede LEER equipos (para mostrar el fixture), pero no jugadores
-- (para no exponer DNIs de otros equipos).

alter table equipos enable row level security;
alter table jugadores enable row level security;

drop policy if exists "Cualquiera puede ver los equipos (fixture)" on equipos;
create policy "Cualquiera puede ver los equipos (fixture)"
  on equipos for select
  using (true);

-- Antes, cualquiera con la anon key podía pedir TODAS las columnas de
-- equipos (incluido teléfono y DNI del capitán) aunque el sitio no las
-- mostrara. Acá se restringe: el público solo puede leer las columnas
-- necesarias para el fixture; el resto queda reservado al admin logueado.
revoke select on equipos from anon;
grant select (id, nombre_equipo, logo_url, posicion, grupo, created_at) on equipos to anon;
grant select on equipos to authenticated;

-- jugadores: nadie público puede leer nada (ni con policy ni con grant).
-- Solo el admin autenticado (vos, una vez logueado) puede verlos.
drop policy if exists "Admin autenticado puede ver jugadores" on jugadores;
create policy "Admin autenticado puede ver jugadores"
  on jugadores for select
  using (auth.role() = 'authenticated');

-- El admin, desde /#admin, puede editar y borrar equipos, y agregar,
-- editar y borrar jugadores directamente (fuera del alta normal por
-- inscribir_equipo). El público nunca puede hacer estas operaciones.
drop policy if exists "Admin autenticado puede editar equipos" on equipos;
create policy "Admin autenticado puede editar equipos"
  on equipos for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Admin autenticado puede borrar equipos" on equipos;
create policy "Admin autenticado puede borrar equipos"
  on equipos for delete
  using (auth.role() = 'authenticated');

drop policy if exists "Admin autenticado puede agregar jugadores" on jugadores;
create policy "Admin autenticado puede agregar jugadores"
  on jugadores for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Admin autenticado puede editar jugadores" on jugadores;
create policy "Admin autenticado puede editar jugadores"
  on jugadores for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Admin autenticado puede borrar jugadores" on jugadores;
create policy "Admin autenticado puede borrar jugadores"
  on jugadores for delete
  using (auth.role() = 'authenticated');

-- resultados: cualquiera puede LEER quién va ganando (para el fixture
-- público); solo el admin autenticado puede cargar/editar/borrar.
alter table resultados enable row level security;

drop policy if exists "Cualquiera puede ver los resultados" on resultados;
create policy "Cualquiera puede ver los resultados"
  on resultados for select
  using (true);

drop policy if exists "Admin autenticado puede cargar resultados" on resultados;
create policy "Admin autenticado puede cargar resultados"
  on resultados for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Admin autenticado puede actualizar resultados" on resultados;
create policy "Admin autenticado puede actualizar resultados"
  on resultados for update
  using (auth.role() = 'authenticated');

drop policy if exists "Admin autenticado puede borrar resultados" on resultados;
create policy "Admin autenticado puede borrar resultados"
  on resultados for delete
  using (auth.role() = 'authenticated');

-- Horario de los 3 partidos de cada grupo (round-robin). Los cruces se
-- derivan de los equipos de cada grupo (ver src/lib/grupos.ts), así que
-- acá solo se guarda el horario de cada partido.
create table if not exists partidos_grupo (
  id uuid primary key default gen_random_uuid(),
  grupo text not null check (grupo in ('A', 'B', 'C')),
  numero int not null check (numero between 1 and 3),
  horario text,
  cancha text,
  unique (grupo, numero)
);

-- Las 9 filas (3 grupos x 3 partidos) para que el admin solo cargue horarios.
insert into partidos_grupo (grupo, numero) values
  ('A', 1), ('A', 2), ('A', 3),
  ('B', 1), ('B', 2), ('B', 3),
  ('C', 1), ('C', 2), ('C', 3)
on conflict (grupo, numero) do nothing;

alter table partidos_grupo enable row level security;

drop policy if exists "Cualquiera puede ver los partidos de grupo" on partidos_grupo;
create policy "Cualquiera puede ver los partidos de grupo"
  on partidos_grupo for select
  using (true);

drop policy if exists "Admin autenticado puede editar partidos de grupo" on partidos_grupo;
create policy "Admin autenticado puede editar partidos de grupo"
  on partidos_grupo for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Sembrado de la eliminatoria: qué equipo juega cada lado de las semis
-- (los 3 punteros + mejor segundo los elige el admin a mano). El ganador
-- de cada partido se guarda en la tabla resultados.
create table if not exists cruces (
  id uuid primary key default gen_random_uuid(),
  ronda text not null check (ronda in ('semifinal', 'final')),
  numero int not null,
  lado int not null check (lado in (0, 1)),
  equipo_id uuid references equipos(id) on delete cascade,
  unique (ronda, numero, lado)
);

insert into cruces (ronda, numero, lado) values
  ('semifinal', 1, 0), ('semifinal', 1, 1),
  ('semifinal', 2, 0), ('semifinal', 2, 1)
on conflict (ronda, numero, lado) do nothing;

alter table cruces enable row level security;

drop policy if exists "Cualquiera puede ver los cruces" on cruces;
create policy "Cualquiera puede ver los cruces"
  on cruces for select
  using (true);

drop policy if exists "Admin autenticado puede editar los cruces" on cruces;
create policy "Admin autenticado puede editar los cruces"
  on cruces for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

grant select on partidos_grupo, cruces to anon;
grant all on partidos_grupo, cruces to authenticated;

-- Nadie inserta/edita/borra directo en equipos ni jugadores;
-- solo la función inscribir_equipo (SECURITY DEFINER) puede.
-- No se crean policies de insert/update/delete a propósito.

-- 3) FUNCIÓN RPC: inscripción atómica con cupo + sorteo de posición

drop function if exists inscribir_equipo(text, text, text, text, text, text, jsonb, boolean, boolean);

create or replace function inscribir_equipo(
  p_nombre_equipo text,
  p_logo_url text,
  p_capitan_nombre text,
  p_capitan_dni text,
  p_capitan_telefono text,
  p_comprobante_url text,
  p_comentarios text,
  p_jugadores jsonb, -- [{ "nombre_apellido": "...", "dni": "..." }, ...]
  p_reglamento_aceptado boolean,
  p_estudiantes_facet_confirmado boolean
)
returns int -- devuelve la posición sorteada (1 a 16)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cupo_max int := 16;
  v_equipo_id uuid;
  v_posicion int;
  v_jugador jsonb;
  v_orden int := 1;
begin
  -- Lock para que dos inscripciones simultáneas no pasen el cupo
  -- ni se sorteen la misma posición.
  perform pg_advisory_xact_lock(hashtext('inscribir_equipo'));

  if (select count(*) from equipos) >= v_cupo_max then
    raise exception 'CUPO_COMPLETO: ya se inscribieron % equipos', v_cupo_max;
  end if;

  if not p_reglamento_aceptado or not p_estudiantes_facet_confirmado then
    raise exception 'Hay que aceptar el reglamento y confirmar que todos son estudiantes de la FACET.';
  end if;

  if p_logo_url is null or p_logo_url = '' then
    raise exception 'Hay que elegir un escudo para el equipo.';
  end if;

  if p_comprobante_url is null or p_comprobante_url = '' then
    raise exception 'Hay que subir el comprobante de transferencia.';
  end if;

  if exists (select 1 from equipos where logo_url = p_logo_url) then
    raise exception 'ESCUDO_OCUPADO: ese escudo ya lo eligió otro equipo';
  end if;

  -- Sortea una posición al azar entre las que todavía estén libres
  select n into v_posicion
  from generate_series(1, v_cupo_max) as n
  where n not in (
    select posicion from equipos where posicion is not null
  )
  order by random()
  limit 1;

  insert into equipos (
    nombre_equipo, logo_url, capitan_nombre, capitan_dni, capitan_telefono,
    comprobante_url, comentarios, reglamento_aceptado, estudiantes_facet_confirmado,
    posicion
  ) values (
    p_nombre_equipo, p_logo_url, p_capitan_nombre, p_capitan_dni, p_capitan_telefono,
    p_comprobante_url, p_comentarios, p_reglamento_aceptado, p_estudiantes_facet_confirmado,
    v_posicion
  )
  returning id into v_equipo_id;

  for v_jugador in select * from jsonb_array_elements(p_jugadores)
  loop
    insert into jugadores (equipo_id, nombre_apellido, dni, orden)
    values (
      v_equipo_id,
      v_jugador->>'nombre_apellido',
      v_jugador->>'dni',
      v_orden
    );
    v_orden := v_orden + 1;
  end loop;

  return v_posicion;
end;
$$;

-- Permitir que el rol público (anon) ejecute la función
grant execute on function inscribir_equipo(text, text, text, text, text, text, text, jsonb, boolean, boolean)
  to anon;

-- 4) CONFIGURACIÓN ---------------------------------------------
-- Una sola fila con interruptores generales del sitio. Por ahora
-- solo tiene si el fixture se muestra al público o no; el admin lo
-- prende/apaga desde /#admin.

create table if not exists configuracion (
  id int primary key default 1,
  mostrar_fixture boolean not null default true,
  constraint configuracion_singleton check (id = 1)
);

insert into configuracion (id, mostrar_fixture)
values (1, true)
on conflict (id) do nothing;

alter table configuracion enable row level security;

drop policy if exists "Cualquiera puede ver la configuración" on configuracion;
create policy "Cualquiera puede ver la configuración"
  on configuracion for select
  using (true);

drop policy if exists "Admin autenticado puede editar la configuración" on configuracion;
create policy "Admin autenticado puede editar la configuración"
  on configuracion for update
  using (auth.role() = 'authenticated');

-- 5) STORAGE: bucket para comprobantes de pago ---------------
-- El escudo del equipo ahora es un ícono preseteado (no se sube
-- archivo), así que solo hace falta bucket para comprobantes.
-- Podés crearlo desde el dashboard (Storage > New bucket > "comprobantes")
-- o dejar que esto lo cree:

insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', true)
on conflict (id) do nothing;

drop policy if exists "Cualquiera puede subir comprobantes" on storage.objects;
create policy "Cualquiera puede subir comprobantes"
  on storage.objects for insert
  with check (bucket_id = 'comprobantes');

drop policy if exists "Cualquiera puede leer comprobantes" on storage.objects;
create policy "Cualquiera puede leer comprobantes"
  on storage.objects for select
  using (bucket_id = 'comprobantes');

-- 6) USUARIO ADMIN -------------------------------------------
-- Esto NO se crea por SQL: andá a Supabase > Authentication > Users
-- > Add user > cargá tu email y una contraseña, y tildá
-- "Auto Confirm User" (así no hace falta que confirmes por mail).
-- Ese es el único usuario que va a poder entrar a /#admin en el sitio
-- y ver teléfonos, DNIs y descargar la planilla.
