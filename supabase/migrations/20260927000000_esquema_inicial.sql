-- =====================================================================
-- Cuarto de datos: esquema inicial
--  * profiles      : rol, estado y fecha fin de acceso de cada usuario
--  * documents     : espejo de los archivos de Google Drive + visibilidad
--  * view_sessions : tiempo de visualización (latidos del visor)
--  * audit_log     : registro de actividad SOLO INSERCIÓN, con hash encadenado
-- El navegador nunca accede a estas tablas: todo pasa por el servidor
-- con la clave service_role. RLS queda activado y sin políticas de escritura.
-- =====================================================================

create type public.app_role as enum ('admin', 'auditor');

-- ---------------------------------------------------------------------
-- Perfiles
-- ---------------------------------------------------------------------
create table public.profiles (
  id                   uuid primary key references auth.users (id) on delete restrict,
  email                text not null unique,
  full_name            text,
  organization         text,
  role                 public.app_role not null default 'auditor',
  active               boolean not null default true,
  access_until         timestamptz,
  must_change_password boolean not null default true,
  created_at           timestamptz not null default now(),
  created_by           uuid references public.profiles (id),
  updated_at           timestamptz not null default now()
);

alter table public.profiles enable row level security;
-- Un usuario autenticado solo puede leer su propio perfil. Nadie escribe desde el cliente.
create policy "leer propio perfil" on public.profiles
  for select to authenticated using (id = auth.uid());
revoke insert, update, delete, truncate on public.profiles from anon, authenticated;

-- ---------------------------------------------------------------------
-- Documentos (espejo de Drive)
-- ---------------------------------------------------------------------
create table public.documents (
  id            text primary key,           -- id del archivo en Drive
  name          text not null,
  folder_path   text not null default '',   -- "Tema/Subtema"
  mime_type     text not null,
  size_bytes    bigint,
  modified_at   timestamptz,
  visible       boolean not null default false,
  removed       boolean not null default false,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

alter table public.documents enable row level security;
revoke all on public.documents from anon, authenticated;

-- ---------------------------------------------------------------------
-- Sesiones de visualización (mutable; el registro oficial es audit_log)
-- ---------------------------------------------------------------------
create table public.view_sessions (
  id             uuid primary key,
  user_id        uuid not null references public.profiles (id),
  document_id    text not null references public.documents (id),
  started_at     timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),
  active_seconds integer not null default 0,
  max_page       integer not null default 1,
  closed_at      timestamptz
);

alter table public.view_sessions enable row level security;
revoke all on public.view_sessions from anon, authenticated;

-- ---------------------------------------------------------------------
-- Registro de actividad (solo inserción)
-- ---------------------------------------------------------------------
create table public.audit_log (
  id            bigint primary key,                 -- asignado por el trigger, secuencial sin huecos
  occurred_at   timestamptz not null,               -- asignado por el trigger (reloj de la BD)
  user_id       uuid,
  user_email    text,
  user_role     text,
  action        text not null,
  document_id   text,
  document_name text,
  details       jsonb not null default '{}'::jsonb,
  ip            text,
  city          text,
  region        text,
  country       text,
  user_agent    text,
  browser       text,
  os            text,
  device        text,
  session_id    text,
  prev_hash     text not null,
  hash          text not null
);

create index audit_log_occurred_at_idx on public.audit_log (occurred_at desc);
create index audit_log_user_idx        on public.audit_log (user_id, occurred_at desc);
create index audit_log_email_idx       on public.audit_log (lower(user_email), occurred_at desc);
create index audit_log_action_idx      on public.audit_log (action, occurred_at desc);
create index audit_log_document_idx    on public.audit_log (document_id, occurred_at desc);
create index audit_log_ip_idx          on public.audit_log (ip, occurred_at desc);

-- Representación canónica de una fila para el hash (el mismo texto que verifica la función de abajo).
create or replace function public.audit_canonical(r public.audit_log)
returns text
language sql
immutable
set search_path = ''
as $$
  select concat_ws('|',
    r.id::text,
    to_char(r.occurred_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    coalesce(r.user_id::text, ''),
    coalesce(r.user_email, ''),
    coalesce(r.user_role, ''),
    r.action,
    coalesce(r.document_id, ''),
    coalesce(r.document_name, ''),
    r.details::text,
    coalesce(r.ip, ''),
    coalesce(r.city, ''),
    coalesce(r.region, ''),
    coalesce(r.country, ''),
    coalesce(r.user_agent, ''),
    coalesce(r.browser, ''),
    coalesce(r.os, ''),
    coalesce(r.device, ''),
    coalesce(r.session_id, ''),
    r.prev_hash
  );
$$;

-- Antes de insertar: serializa, asigna id y hora del servidor, y encadena el hash.
create or replace function public.audit_log_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  last_row public.audit_log;
begin
  perform pg_advisory_xact_lock(hashtext('public.audit_log'));

  select * into last_row from public.audit_log order by id desc limit 1;

  new.id          := coalesce(last_row.id, 0) + 1;
  new.occurred_at := clock_timestamp();
  new.details     := coalesce(new.details, '{}'::jsonb);
  new.prev_hash   := coalesce(last_row.hash, repeat('0', 64));
  new.hash        := encode(sha256(convert_to(public.audit_canonical(new), 'UTF8')), 'hex');
  return new;
end;
$$;

create trigger audit_log_chain
  before insert on public.audit_log
  for each row execute function public.audit_log_before_insert();

-- Bloqueo de modificaciones: ni UPDATE, ni DELETE, ni TRUNCATE, para ningún rol.
create or replace function public.audit_log_block_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_log es de solo inserción: % no permitido', tg_op
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger audit_log_no_update_delete
  before update or delete on public.audit_log
  for each row execute function public.audit_log_block_changes();

create trigger audit_log_no_truncate
  before truncate on public.audit_log
  for each statement execute function public.audit_log_block_changes();

alter table public.audit_log enable row level security;
-- Sin políticas: anon y authenticated no pueden leer ni escribir.
revoke all on public.audit_log from anon, authenticated;
revoke update, delete, truncate on public.audit_log from service_role;
grant select, insert on public.audit_log to service_role;

-- Verificación de integridad: recalcula toda la cadena.
create or replace function public.verify_audit_chain()
returns table (ok boolean, total bigint, first_bad_id bigint, message text)
language plpgsql
stable
set search_path = ''
as $$
declare
  r        public.audit_log;
  expected text := repeat('0', 64);
  n        bigint := 0;
begin
  for r in select * from public.audit_log order by id loop
    n := n + 1;
    if r.id <> n then
      return query select false, n, r.id, format('Falta la fila %s (salto en la secuencia)', n);
      return;
    end if;
    if r.prev_hash <> expected then
      return query select false, n, r.id, format('La fila %s no enlaza con la anterior', r.id);
      return;
    end if;
    if encode(sha256(convert_to(public.audit_canonical(r), 'UTF8')), 'hex') <> r.hash then
      return query select false, n, r.id, format('La fila %s fue alterada (hash no coincide)', r.id);
      return;
    end if;
    expected := r.hash;
  end loop;
  return query select true, n, null::bigint, format('Cadena íntegra: %s registros verificados', n);
end;
$$;

revoke execute on function public.verify_audit_chain() from public, anon, authenticated;
grant execute on function public.verify_audit_chain() to service_role;

-- Intentos fallidos recientes (para bloquear fuerza bruta).
create or replace function public.recent_failed_logins(p_email text, p_ip text, p_minutes integer)
returns table (by_email bigint, by_ip bigint)
language sql
stable
set search_path = ''
as $$
  select
    count(*) filter (where lower(user_email) = lower(p_email)),
    count(*) filter (where ip = p_ip)
  from public.audit_log
  where action in ('login_fallido', 'mfa_fallido')
    and occurred_at > now() - make_interval(mins => p_minutes);
$$;

revoke execute on function public.recent_failed_logins(text, text, integer) from public, anon, authenticated;
grant execute on function public.recent_failed_logins(text, text, integer) to service_role;
