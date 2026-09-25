-- ==========================================================
-- MIGRACIÓN: Fase de grupos + eliminatoria (semis/final)
-- Pegar y ejecutar en Supabase > SQL Editor > New query > Run
--
-- Es no destructivo: agrega una columna a equipos y crea dos
-- tablas nuevas. No borra ni modifica datos existentes.
-- ==========================================================

-- 1) Grupo de cada equipo ('A', 'B' o 'C'), lo asigna el admin.
alter table equipos add column if not exists grupo text;
alter table equipos drop constraint if exists equipos_grupo_check;
alter table equipos add constraint equipos_grupo_check
  check (grupo is null or grupo in ('A', 'B', 'C'));

-- El público necesita leer la columna grupo para el fixture.
revoke select on equipos from anon;
grant select (id, nombre_equipo, logo_url, posicion, grupo, created_at) on equipos to anon;
grant select on equipos to authenticated;

-- 2) Horario de los 3 partidos de cada grupo.
create table if not exists partidos_grupo (
  id uuid primary key default gen_random_uuid(),
  grupo text not null check (grupo in ('A', 'B', 'C')),
  numero int not null check (numero between 1 and 3),
  horario text,
  cancha text,
  unique (grupo, numero)
);

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

grant select on partidos_grupo to anon;
grant all on partidos_grupo to authenticated;

-- 3) Sembrado de las semifinales (4 equipos elegidos a mano).
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

grant select on cruces to anon;
grant all on cruces to authenticated;

-- 4) Refrescar la caché de esquema de la API (PostgREST) para que
--    deje de tirar "Could not find the table ... in the schema cache".
notify pgrst, 'reload schema';
