-- ===========================================================================
-- Bad-Dashboard — Cloud-Schema für Supabase
-- Einmal im Supabase-SQL-Editor ausführen (siehe ANLEITUNG-CLOUD.md).
-- Kann auch erneut ausgeführt werden (Aktualisierung) — Daten bleiben erhalten.
--
-- Ein Supabase-Projekt = eine Firma. Wer was sehen darf, regelt die Ebene in
-- der Tabelle „mitglieder":
--   geschaeftsfuehrung  alles, inkl. Einrichtung und Löschen
--   planung             alle Projekte bearbeiten (Planer/Bearbeiter, Projektleitung)
--   monteur             nur zugewiesene Baustellen; keine Angebote/Aufträge/Rechnungen
--   partner             externe Partner: nur zugewiesene Einsätze, nur das Nötigste
-- Kunden haben keinen Zugang — sie laden nur über ihren persönlichen Link hoch.
-- ===========================================================================

create table if not exists public.projekte (
  id         text primary key,
  daten      jsonb  not null,
  geaendert  bigint not null default 0,
  geloescht  boolean not null default false
);

create table if not exists public.dateien (
  id         uuid primary key default gen_random_uuid(),
  projekt_id text not null references public.projekte(id) on delete cascade,
  kategorie  text not null,
  name       text not null,
  typ        text,
  groesse    bigint,
  pfad       text not null unique,
  quelle     text not null default 'team',   -- 'team' | 'kunde' | 'partner'
  neu        boolean not null default false,
  am         timestamptz not null default now()
);
create index if not exists dateien_projekt on public.dateien(projekt_id);

create table if not exists public.einstellungen (
  id        int primary key default 1 check (id = 1),
  daten     jsonb,
  geaendert bigint not null default 0
);

create table if not exists public.upload_links (
  token      text primary key,
  projekt_id text not null references public.projekte(id) on delete cascade,
  erstellt   timestamptz not null default now(),
  gueltig_bis timestamptz not null default now() + interval '180 days'
);

-- Wer darf rein, auf welcher Ebene? (wird in der Einrichtung gepflegt)
create table if not exists public.mitglieder (
  email     text primary key,
  id        text not null unique,          -- Kürzel (Team) bzw. Partner-ID
  ebene     text not null check (ebene in ('geschaeftsfuehrung', 'planung', 'monteur', 'partner')),
  name      text,
  formulare text[] not null default '{}'   -- Partner: welche Formulare sie sehen
);

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen: Wer bin ich, was darf ich?
-- ---------------------------------------------------------------------------
create or replace function public.ich_email() returns text language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;
create or replace function public.ich_ebene() returns text language sql stable security definer set search_path = public as $$
  select ebene from mitglieder where email = ich_email()
$$;
create or replace function public.ich_id() returns text language sql stable security definer set search_path = public as $$
  select id from mitglieder where email = ich_email()
$$;
create or replace function public.ist_buero() returns boolean language sql stable as $$
  select coalesce(ich_ebene() in ('geschaeftsfuehrung', 'planung'), false)
$$;
create or replace function public.ist_gf() returns boolean language sql stable as $$
  select coalesce(ich_ebene() = 'geschaeftsfuehrung', false)
$$;
create or replace function public.zugewiesen(d jsonb) returns boolean language sql stable as $$
  select coalesce(d -> 'zugriff' ? ich_id(), false)
$$;
-- Darf ich Dateien dieses Projekts in diesem Ordner sehen?
create or replace function public.darf_datei(pid text, kat text) returns boolean language sql stable security definer set search_path = public as $$
  select ist_buero() or exists (
    select 1 from projekte p
    where p.id = pid and not p.geloescht and zugewiesen(p.daten) and (
      (ich_ebene() = 'monteur' and kat not in ('angebot', 'auftrag', 'rechnungen'))
      or (ich_ebene() = 'partner' and kat in ('planung', 'skizzen', 'baustelle', 'auswahl'))
    )
  )
$$;
-- Darf ich in diesen Ordner hochladen?
create or replace function public.darf_hochladen(pid text, kat text) returns boolean language sql stable as $$
  select ist_buero()
    or (ich_ebene() = 'monteur' and kat in ('baustelle', 'fertig') and darf_datei(pid, kat))
    or (ich_ebene() = 'partner' and kat = 'baustelle' and darf_datei(pid, kat))
$$;

-- ---------------------------------------------------------------------------
-- Zugriffsregeln (alte Fassungen werden ersetzt)
-- ---------------------------------------------------------------------------
alter table public.projekte      enable row level security;
alter table public.dateien       enable row level security;
alter table public.einstellungen enable row level security;
alter table public.upload_links  enable row level security;
alter table public.mitglieder    enable row level security;

drop policy if exists team_projekte on public.projekte;
drop policy if exists team_dateien on public.dateien;
drop policy if exists team_einstellungen on public.einstellungen;
drop policy if exists team_links on public.upload_links;
drop policy if exists team_akten on storage.objects;

drop policy if exists p_lesen on public.projekte;
create policy p_lesen on public.projekte for select to authenticated
  using (ist_buero() or (ich_ebene() = 'monteur' and zugewiesen(daten)));
drop policy if exists p_anlegen on public.projekte;
create policy p_anlegen on public.projekte for insert to authenticated with check (ist_buero());
drop policy if exists p_aendern on public.projekte;
create policy p_aendern on public.projekte for update to authenticated
  using (ist_buero() or (ich_ebene() = 'monteur' and zugewiesen(daten)))
  with check (ist_buero() or (ich_ebene() = 'monteur' and zugewiesen(daten)));
drop policy if exists p_loeschen on public.projekte;
create policy p_loeschen on public.projekte for delete to authenticated using (ist_gf());

drop policy if exists d_lesen on public.dateien;
create policy d_lesen on public.dateien for select to authenticated using (darf_datei(projekt_id, kategorie));
drop policy if exists d_anlegen on public.dateien;
create policy d_anlegen on public.dateien for insert to authenticated with check (darf_hochladen(projekt_id, kategorie));
drop policy if exists d_aendern on public.dateien;
create policy d_aendern on public.dateien for update to authenticated using (ist_buero()) with check (ist_buero());
drop policy if exists d_loeschen on public.dateien;
create policy d_loeschen on public.dateien for delete to authenticated using (ist_buero());

drop policy if exists e_lesen on public.einstellungen;
create policy e_lesen on public.einstellungen for select to authenticated using (true);
drop policy if exists e_schreiben on public.einstellungen;
create policy e_schreiben on public.einstellungen for all to authenticated using (ist_gf()) with check (ist_gf());

drop policy if exists l_buero on public.upload_links;
create policy l_buero on public.upload_links for all to authenticated using (ist_buero()) with check (ist_buero());

drop policy if exists m_lesen on public.mitglieder;
create policy m_lesen on public.mitglieder for select to authenticated using (email = ich_email() or ist_buero());
drop policy if exists m_schreiben on public.mitglieder;
create policy m_schreiben on public.mitglieder for all to authenticated using (ist_gf()) with check (ist_gf());

-- ---------------------------------------------------------------------------
-- Dateispeicher: privater Bucket „akten"
--   projekte/<projekt-id>/<ordner>/<datei>   ← Team, Monteure, Partner
--   kunde/<token>/<ordner>/<datei>           ← Kunden (nur Schreiben)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('akten', 'akten', false, 52428800)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists akten_lesen on storage.objects;
create policy akten_lesen on storage.objects for select to authenticated using (
  bucket_id = 'akten' and (
    ((storage.foldername(name))[1] = 'projekte' and darf_datei((storage.foldername(name))[2], (storage.foldername(name))[3]))
    or ((storage.foldername(name))[1] = 'kunde' and ist_buero())
  ));
drop policy if exists akten_hochladen on storage.objects;
create policy akten_hochladen on storage.objects for insert to authenticated with check (
  bucket_id = 'akten' and (storage.foldername(name))[1] = 'projekte'
  and darf_hochladen((storage.foldername(name))[2], (storage.foldername(name))[3]));
drop policy if exists akten_loeschen on storage.objects;
create policy akten_loeschen on storage.objects for delete to authenticated using (bucket_id = 'akten' and ist_buero());

-- Prüft nur „Link gültig ja/nein" — Kunden können die Tabelle selbst nicht lesen
create or replace function public.link_gueltig(p_token text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from upload_links where token = p_token and gueltig_bis > now())
$$;
grant execute on function public.link_gueltig(text) to anon, authenticated;

drop policy if exists kunde_upload on storage.objects;
create policy kunde_upload on storage.objects for insert to anon
  with check (
    bucket_id = 'akten'
    and (storage.foldername(name))[1] = 'kunde'
    and public.link_gueltig((storage.foldername(name))[2])
  );

-- ---------------------------------------------------------------------------
-- Externe Partner: sehen nur einen Auszug ihrer Einsätze
-- ---------------------------------------------------------------------------
create or replace function public.partner_auftraege()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'projektnr', p.daten ->> 'projektnr',
    'phase', (p.daten ->> 'phase')::int,
    'status', p.daten ->> 'status',
    'kunde', jsonb_build_object(
      'anrede', p.daten #>> '{kunde,anrede}', 'vorname', p.daten #>> '{kunde,vorname}', 'nachname', p.daten #>> '{kunde,nachname}',
      'strasse', p.daten #>> '{kunde,strasse}', 'ort', p.daten #>> '{kunde,ort}',
      'telefon', p.daten #>> '{kunde,telefon}', 'mobil', p.daten #>> '{kunde,mobil}'),
    'termine', jsonb_build_object('baustart', p.daten #>> '{termine,baustart}', 'abnahme', p.daten #>> '{termine,abnahme}'),
    'formulare', coalesce((select jsonb_object_agg(f, p.daten -> 'formulare' -> f) from unnest(m.formulare) f where p.daten -> 'formulare' ? f), '{}'::jsonb),
    'meldung', p.daten -> 'partnerStatus' -> m.id,
    'geaendert', p.geaendert
  ) order by p.daten #>> '{termine,baustart}'), '[]'::jsonb)
  from projekte p join mitglieder m on m.email = ich_email() and m.ebene = 'partner'
  where not p.geloescht and p.daten -> 'zugriff' ? m.id
$$;

-- Partner meldet: Gewerk erledigt / Hinweis
create or replace function public.partner_melden(p_projekt text, p_erledigt boolean, p_notiz text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_m mitglieder;
  v_text text;
begin
  select * into v_m from mitglieder where email = ich_email() and ebene = 'partner';
  if not found then return false; end if;
  if not exists (select 1 from projekte where id = p_projekt and daten -> 'zugriff' ? v_m.id) then return false; end if;
  v_text := coalesce(v_m.name, v_m.id) || case when p_erledigt then ': Gewerk erledigt' else ': Rückmeldung' end
            || case when coalesce(p_notiz, '') <> '' then ' – ' || left(p_notiz, 500) else '' end;
  update projekte set
    daten = jsonb_set(
      daten || jsonb_build_object('partnerStatus', coalesce(daten -> 'partnerStatus', '{}'::jsonb) ||
        jsonb_build_object(v_m.id, jsonb_build_object('erledigt', p_erledigt, 'notiz', left(coalesce(p_notiz, ''), 500), 'am', (extract(epoch from now()) * 1000)::bigint))),
      '{verlauf}',
      jsonb_build_array(jsonb_build_object('ts', (extract(epoch from now()) * 1000)::bigint, 'text', v_text)) || coalesce(daten -> 'verlauf', '[]'::jsonb)),
    geaendert = (extract(epoch from now()) * 1000)::bigint
  where id = p_projekt;
  return true;
end $$;

-- ---------------------------------------------------------------------------
-- Kundenportal: zwei Funktionen, die nur mit gültigem Token etwas tun
-- ---------------------------------------------------------------------------
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
    'firma',    (select daten - 'team' - 'partner' from einstellungen where id = 1),
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
revoke all on function public.partner_auftraege() from public;
revoke all on function public.partner_melden(text, boolean, text) from public;
grant execute on function public.portal_info(text) to anon, authenticated;
grant execute on function public.portal_upload_melden(text, text, text, text, text, bigint) to anon, authenticated;
grant execute on function public.partner_auftraege() to authenticated;
grant execute on function public.partner_melden(text, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- ERSTER ZUGANG: die Geschäftsführung eintragen (E-Mail anpassen!).
-- Danach pflegt sie alle weiteren Mitglieder in der Einrichtung des Dashboards.
-- ---------------------------------------------------------------------------
-- insert into public.mitglieder (email, id, ebene, name)
-- values ('chef@ihre-firma.de', 'DB', 'geschaeftsfuehrung', 'Daniel Brüll')
-- on conflict (email) do update set ebene = excluded.ebene;
