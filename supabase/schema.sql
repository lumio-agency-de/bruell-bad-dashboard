-- ===========================================================================
-- Bad-Dashboard — Cloud-Schema für Supabase
-- Einmal im Supabase-SQL-Editor ausführen (siehe ANLEITUNG-CLOUD.md).
-- Ein Supabase-Projekt = eine Firma. Alle angemeldeten Nutzer sind Teammitglieder.
-- Kunden haben KEINEN Zugriff auf Projekte — sie können nur über ihren
-- persönlichen Link Dateien in ihr eigenes Projekt hochladen.
-- ===========================================================================

-- Projekte: das ganze Projekt als JSON-Dokument (Kunde, Phase, Schritte, Formulare …)
create table if not exists public.projekte (
  id         text primary key,
  daten      jsonb  not null,
  geaendert  bigint not null default 0,
  geloescht  boolean not null default false
);

-- Dateien: ersetzt die Ordner auf dem alten Laufwerk
create table if not exists public.dateien (
  id         uuid primary key default gen_random_uuid(),
  projekt_id text not null references public.projekte(id) on delete cascade,
  kategorie  text not null,
  name       text not null,
  typ        text,
  groesse    bigint,
  pfad       text not null unique,
  quelle     text not null default 'team',   -- 'team' | 'kunde'
  neu        boolean not null default false, -- vom Kunden hochgeladen und noch nicht angesehen
  am         timestamptz not null default now()
);
create index if not exists dateien_projekt on public.dateien(projekt_id);

-- Einstellungen der Firma (überschreiben firma.js)
create table if not exists public.einstellungen (
  id        int primary key default 1 check (id = 1),
  daten     jsonb,
  geaendert bigint not null default 0
);

-- Persönliche Upload-Links für Kunden
create table if not exists public.upload_links (
  token      text primary key,
  projekt_id text not null references public.projekte(id) on delete cascade,
  erstellt   timestamptz not null default now(),
  gueltig_bis timestamptz not null default now() + interval '180 days'
);

-- ---------------------------------------------------------------------------
-- Zugriffsregeln: Team (angemeldet) darf alles, anonyme Besucher nichts
-- ---------------------------------------------------------------------------
alter table public.projekte      enable row level security;
alter table public.dateien       enable row level security;
alter table public.einstellungen enable row level security;
alter table public.upload_links  enable row level security;

drop policy if exists team_projekte on public.projekte;
create policy team_projekte on public.projekte for all to authenticated using (true) with check (true);
drop policy if exists team_dateien on public.dateien;
create policy team_dateien on public.dateien for all to authenticated using (true) with check (true);
drop policy if exists team_einstellungen on public.einstellungen;
create policy team_einstellungen on public.einstellungen for all to authenticated using (true) with check (true);
drop policy if exists team_links on public.upload_links;
create policy team_links on public.upload_links for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Dateispeicher: privater Bucket „akten"
--   projekte/<projekt-id>/<kategorie>/<datei>   ← Uploads vom Team
--   kunde/<token>/<kategorie>/<datei>           ← Uploads vom Kunden (nur Schreiben)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('akten', 'akten', false, 52428800)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists team_akten on storage.objects;
create policy team_akten on storage.objects for all to authenticated
  using (bucket_id = 'akten') with check (bucket_id = 'akten');

drop policy if exists kunde_upload on storage.objects;
create policy kunde_upload on storage.objects for insert to anon
  with check (
    bucket_id = 'akten'
    and (storage.foldername(name))[1] = 'kunde'
    and exists (
      select 1 from public.upload_links l
      where l.token = (storage.foldername(name))[2] and l.gueltig_bis > now()
    )
  );

-- ---------------------------------------------------------------------------
-- Kundenportal: zwei Funktionen, die nur mit gültigem Token etwas tun
-- ---------------------------------------------------------------------------

-- Was darf der Kunde sehen? Nur Firmenname, seine Anrede/Name, die angefragten
-- Ordner und was er selbst schon hochgeladen hat.
create or replace function public.portal_info(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_link upload_links;
  v_p    jsonb;
begin
  select * into v_link from upload_links where token = p_token and gueltig_bis > now();
  if not found then return null; end if;
  select daten into v_p from projekte where id = v_link.projekt_id and not geloescht;
  if v_p is null then return null; end if;
  return jsonb_build_object(
    'firma',    (select daten from einstellungen where id = 1),
    'anrede',   v_p #>> '{kunde,anrede}',
    'vorname',  v_p #>> '{kunde,vorname}',
    'nachname', v_p #>> '{kunde,nachname}',
    'phase',    (v_p ->> 'phase')::int,
    'hochgeladen', coalesce((
      select jsonb_agg(jsonb_build_object('kategorie', kategorie, 'name', name, 'am', am) order by am)
      from dateien where projekt_id = v_link.projekt_id and quelle = 'kunde'
    ), '[]'::jsonb)
  );
end $$;

-- Nach dem Hochladen: Datei dem Projekt zuordnen (prüft Token, Pfad und dass die Datei existiert)
create or replace function public.portal_upload_melden(
  p_token text, p_pfad text, p_kategorie text, p_name text, p_typ text, p_groesse bigint)
returns boolean language plpgsql security definer set search_path = public, storage as $$
declare
  v_link upload_links;
begin
  select * into v_link from upload_links where token = p_token and gueltig_bis > now();
  if not found then return false; end if;
  if p_pfad not like 'kunde/' || p_token || '/%' then return false; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'akten' and name = p_pfad) then return false; end if;
  insert into dateien (projekt_id, kategorie, name, typ, groesse, pfad, quelle, neu)
  values (v_link.projekt_id, left(p_kategorie, 40), left(p_name, 200), left(p_typ, 100), p_groesse, p_pfad, 'kunde', true)
  on conflict (pfad) do nothing;
  update projekte set geaendert = (extract(epoch from now()) * 1000)::bigint where id = v_link.projekt_id;
  return true;
end $$;

revoke all on function public.portal_info(text) from public;
revoke all on function public.portal_upload_melden(text, text, text, text, text, bigint) from public;
grant execute on function public.portal_info(text) to anon, authenticated;
grant execute on function public.portal_upload_melden(text, text, text, text, text, bigint) to anon, authenticated;
