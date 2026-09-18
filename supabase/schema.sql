-- ==========================================================
-- ESQUEMA: Torneo de Fútbol 6 Relámpago — FACET
-- Pegar y ejecutar en Supabase > SQL Editor > New query > Run
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

create table if not exists jugadores (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid not null references equipos(id) on delete cascade,
  nombre_apellido text not null,
  dni text not null,
  orden int not null
);

-- 2) SEGURIDAD (RLS) ----------------------------------------
-- El público NO inserta directo en las tablas: todo pasa por la
-- función inscribir_equipo() de abajo, que controla el cupo.
-- Sí puede LEER equipos (para mostrar el fixture), pero no jugadores
-- (para no exponer DNIs de otros equipos).

alter table equipos enable row level security;
alter table jugadores enable row level security;

create policy "Cualquiera puede ver los equipos (fixture)"
  on equipos for select
  using (true);

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

-- 4) STORAGE: bucket para comprobantes de pago ---------------
-- El escudo del equipo ahora es un ícono preseteado (no se sube
-- archivo), así que solo hace falta bucket para comprobantes.
-- Podés crearlo desde el dashboard (Storage > New bucket > "comprobantes")
-- o dejar que esto lo cree:

insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', true)
on conflict (id) do nothing;

create policy "Cualquiera puede subir comprobantes"
  on storage.objects for insert
  with check (bucket_id = 'comprobantes');

create policy "Cualquiera puede leer comprobantes"
  on storage.objects for select
  using (bucket_id = 'comprobantes');
