/* Datenschicht — eine Schnittstelle, zwei Betriebsarten:
     lokal  Projekte im Browser (localStorage), Dateien in IndexedDB.
            Gut zum Ausprobieren; der Kunden-Link funktioniert nur im selben Browser.
     cloud  Supabase: Login fürs Team, Projekte + Dateien für alle, Kunden-Uploads
            über den persönlichen Link von überall.
   Wird von app.js (Team) und kunde.js (Kundenportal) benutzt. */

(function () {
  "use strict";

  const LS = { projekte: "baddashboard:projekte", einstellungen: "baddashboard:einstellungen", links: "baddashboard:links" };
  const BUCKET = "akten";
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const token = () => [...crypto.getRandomValues(new Uint8Array(18))].map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, 24);
  const sicher = (n) => n.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^\w.\-]+/g, "_").slice(-80);

  /* Zugang aus firma.js – oder, falls dort leer, im Browser hinterlegt (Einrichtung → Cloud verbinden) */
  function cloudKonfig() {
    const c = (window.FIRMA && window.FIRMA.cloud) || {};
    if (c.url && c.anonKey) return c;
    try { const l = JSON.parse(localStorage.getItem("baddashboard:cloud")); if (l && l.url && l.anonKey) return l; } catch (e) { /* keiner */ }
    return null;
  }

  /* ---------- Fotos vor dem Upload verkleinern (Handyfotos sind 5–10 MB) ---------- */
  async function verkleinern(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 1.5e6) return file;
    try {
      const bmp = await createImageBitmap(file);
      const max = 2400, f = Math.min(1, max / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas");
      c.width = Math.round(bmp.width * f); c.height = Math.round(bmp.height * f);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.85));
      if (!blob || blob.size >= file.size) return file;
      return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
    } catch (e) { return file; }
  }

  /* ---------- IndexedDB (lokaler Modus: Dateien) ---------- */
  let idbPromise;
  function idb() {
    idbPromise = idbPromise || new Promise((res, rej) => {
      const r = indexedDB.open("baddashboard-dateien", 1);
      r.onupgradeneeded = () => {
        const db = r.result;
        db.createObjectStore("meta", { keyPath: "id" }).createIndex("projekt", "projekt_id");
        db.createObjectStore("blobs");
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return idbPromise;
  }
  async function tx(stores, modus, fn) {
    const db = await idb();
    return new Promise((res, rej) => {
      const t = db.transaction(stores, modus);
      let ergebnis;
      Promise.resolve(fn(t)).then((x) => (ergebnis = x));
      t.oncomplete = () => res(ergebnis);
      t.onerror = () => rej(t.error);
    });
  }
  const anfrage = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

  const lesen = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const schreiben = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn("Speicher voll", e); } };

  /* =====================================================================
     Lokal
     ===================================================================== */
  const Lokal = {
    modus: "lokal",
    async start() { return true; },
    angemeldet: true,
    async projekteLaden() { return lesen(LS.projekte, []); },
    async projektSpeichern(p, alle) { schreiben(LS.projekte, alle); },
    async einstellungenLaden() { return lesen(LS.einstellungen, null); },
    async einstellungenSpeichern(e) { schreiben(LS.einstellungen, e); },
    async dateien(pid) {
      return tx(["meta"], "readonly", (t) => anfrage(t.objectStore("meta").index("projekt").getAll(pid)))
        .then((l) => (l || []).sort((a, b) => a.am.localeCompare(b.am)));
    },
    async alleDateien() {
      return tx(["meta"], "readonly", (t) => anfrage(t.objectStore("meta").getAll())).then((l) => l || []);
    },
    async dateiVerschieben(rec, kat) {
      rec.kategorie = kat;
      await tx(["meta"], "readwrite", (t) => t.objectStore("meta").put({ ...rec }));
    },
    async hochladen(pid, kategorie, file, quelle = "team") {
      file = await verkleinern(file);
      const rec = { id: uid(), projekt_id: pid, kategorie, name: file.name, typ: file.type, groesse: file.size,
        pfad: `lokal/${pid}/${kategorie}/${uid()}`, quelle, neu: quelle === "kunde", am: new Date().toISOString() };
      await tx(["meta", "blobs"], "readwrite", (t) => { t.objectStore("meta").put(rec); t.objectStore("blobs").put(file, rec.id); });
      if (quelle === "kunde") {
        const alle = lesen(LS.projekte, []); const p = alle.find((x) => x.id === pid);
        if (p) { p.geaendert = Date.now(); schreiben(LS.projekte, alle); }
      }
      return rec;
    },
    async dateiUrl(rec) {
      const blob = await tx(["blobs"], "readonly", (t) => anfrage(t.objectStore("blobs").get(rec.id)));
      return blob ? URL.createObjectURL(blob) : null;
    },
    async dateiLoeschen(rec) { await tx(["meta", "blobs"], "readwrite", (t) => { t.objectStore("meta").delete(rec.id); t.objectStore("blobs").delete(rec.id); }); },
    async gesehen(pid) {
      const l = await this.dateien(pid);
      await tx(["meta"], "readwrite", (t) => l.filter((d) => d.neu).forEach((d) => t.objectStore("meta").put({ ...d, neu: false })));
    },
    async uploadLink(p) {
      const links = lesen(LS.links, {});
      let t = Object.keys(links).find((k) => links[k] === p.id);
      if (!t) { t = token(); links[t] = p.id; schreiben(LS.links, links); }
      return t;
    },
    async abgleichen() { return false; },
    /* Ebenen: lokal wählt man im Dashboard „Ansicht als …“ */
    async ich() { try { return localStorage.getItem("baddashboard:ich") || null; } catch (e) { return null; } },
    ichSetzen(id) { try { localStorage.setItem("baddashboard:ich", id); } catch (e) { /* egal */ } },
    async mitgliederSpeichern() { return true; },
    partnerAuftraege: null,  // lokal berechnet app.js den Auszug selbst
    /* Portal (lokal: gleicher Browser) */
    async portalInfo(t) {
      const pid = lesen(LS.links, {})[t];
      const p = lesen(LS.projekte, []).find((x) => x.id === pid && !x.geloescht);
      if (!p) return null;
      const hoch = (await this.dateien(pid)).filter((d) => d.quelle === "kunde").map((d) => ({ kategorie: d.kategorie, name: d.name, am: d.am }));
      return { firma: lesen(LS.einstellungen, null), anrede: p.kunde.anrede, vorname: p.kunde.vorname, nachname: p.kunde.nachname, phase: p.phase, hochgeladen: hoch };
    },
    async portalHochladen(t, kategorie, file) {
      const pid = lesen(LS.links, {})[t];
      if (!pid) throw new Error("Link ungültig");
      return this.hochladen(pid, kategorie, file, "kunde");
    },
  };

  /* =====================================================================
     Cloud (Supabase)
     ===================================================================== */
  function Cloud(konf) {
    const sb = window.supabase.createClient(konf.url, konf.anonKey, { auth: { persistSession: true } });
    /* Kundenportal immer anonym – auch wenn im selben Browser jemand vom Team angemeldet ist */
    let anonym = null;
    const sbKunde = () => (anonym = anonym || window.supabase.createClient(konf.url, konf.anonKey, { auth: { persistSession: false, autoRefreshToken: false, storageKey: "baddashboard-portal" } }));
    let stand = 0;
    return {
      modus: "cloud",
      konf,
      sb,
      angemeldet: false,
      nutzer: null,
      async start() {
        const { data } = await sb.auth.getSession();
        this.angemeldet = !!data.session;
        this.nutzer = data.session ? data.session.user.email : null;
        return this.angemeldet;
      },
      async anmelden(email, passwort) {
        const { data, error } = await sb.auth.signInWithPassword({ email, password: passwort });
        if (error) throw new Error(error.message === "Invalid login credentials" ? "E-Mail oder Passwort falsch." : error.message);
        this.angemeldet = true; this.nutzer = data.user.email;
      },
      async abmelden() { await sb.auth.signOut(); this.angemeldet = false; },
      /* eigener Eintrag in „mitglieder“ → Ebene + Kennung */
      async ich() {
        const { data } = await sb.from("mitglieder").select("*").eq("email", (this.nutzer || "").toLowerCase()).maybeSingle();
        this.mitglied = data || null;
        return data ? data.id : null;
      },
      async mitgliederSpeichern(liste) {
        const rows = liste.filter((m) => m.email).map((m) => ({ email: m.email.toLowerCase(), id: m.id, ebene: m.ebene, name: m.name, formulare: m.formulare || [] }));
        if (rows.length) { const { error } = await sb.from("mitglieder").upsert(rows, { onConflict: "email" }); if (error) throw error; }
        const { data } = await sb.from("mitglieder").select("email");
        const behalten = new Set([...rows.map((r) => r.email), (this.nutzer || "").toLowerCase()]);
        const weg = (data || []).map((r) => r.email).filter((e) => !behalten.has(e));
        if (weg.length) await sb.from("mitglieder").delete().in("email", weg);
      },
      async partnerAuftraege() {
        const { data, error } = await sb.rpc("partner_auftraege");
        if (error) throw error;
        return data || [];
      },
      async partnerMelden(pid, erledigt, notiz) {
        const { data, error } = await sb.rpc("partner_melden", { p_projekt: pid, p_erledigt: erledigt, p_notiz: notiz });
        if (error || !data) throw new Error("Meldung fehlgeschlagen");
      },
      async projekteLaden() {
        const { data, error } = await sb.from("projekte").select("daten,geaendert");
        if (error) throw error;
        stand = Math.max(0, ...data.map((r) => r.geaendert));
        return data.map((r) => ({ ...r.daten, geaendert: r.geaendert }));
      },
      async projektSpeichern(p) {
        /* erst aktualisieren (dürfen auch Monteure), nur wenn neu: anlegen (nur das Büro) */
        const zeile = { daten: p, geaendert: p.geaendert, geloescht: !!p.geloescht };
        const { data, error } = await sb.from("projekte").update(zeile).eq("id", p.id).select("id");
        if (error) throw error;
        if (!data.length) { const r = await sb.from("projekte").insert({ id: p.id, ...zeile }); if (r.error) throw r.error; }
        stand = Math.max(stand, p.geaendert);
      },
      async einstellungenLaden() {
        const { data } = await sb.from("einstellungen").select("daten").eq("id", 1).maybeSingle();
        return data ? data.daten : null;
      },
      async einstellungenSpeichern(e) {
        const { error } = await sb.from("einstellungen").upsert({ id: 1, daten: e, geaendert: Date.now() });
        if (error) throw error;
      },
      async dateien(pid) {
        const { data, error } = await sb.from("dateien").select("*").eq("projekt_id", pid).order("am");
        if (error) throw error;
        return data;
      },
      async alleDateien() {
        const { data, error } = await sb.from("dateien").select("*").order("am");
        if (error) throw error;
        return data || [];
      },
      async dateiVerschieben(rec, kat) {
        const { error } = await sb.from("dateien").update({ kategorie: kat }).eq("id", rec.id);
        if (error) throw error;
        rec.kategorie = kat;
      },
      async hochladen(pid, kategorie, file, quelle = "team") {
        file = await verkleinern(file);
        const pfad = `projekte/${pid}/${kategorie}/${uid()}-${sicher(file.name)}`;
        const up = await sb.storage.from(BUCKET).upload(pfad, file, { contentType: file.type || "application/octet-stream" });
        if (up.error) throw up.error;
        const rec = { projekt_id: pid, kategorie, name: file.name, typ: file.type, groesse: file.size, pfad, quelle };
        const { data, error } = await sb.from("dateien").insert(rec).select().single();
        if (error) throw error;
        return data;
      },
      async dateiUrl(rec) {
        const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(rec.pfad, 600);
        if (error) throw error;
        return data.signedUrl;
      },
      async dateiLoeschen(rec) {
        await sb.storage.from(BUCKET).remove([rec.pfad]);
        await sb.from("dateien").delete().eq("id", rec.id);
      },
      async gesehen(pid) { await sb.from("dateien").update({ neu: false }).eq("projekt_id", pid).eq("neu", true); },
      async uploadLink(p) {
        const { data } = await sb.from("upload_links").select("token").eq("projekt_id", p.id).gt("gueltig_bis", new Date().toISOString()).limit(1);
        if (data && data[0]) return data[0].token;
        const t = token();
        const { error } = await sb.from("upload_links").insert({ token: t, projekt_id: p.id });
        if (error) throw error;
        return t;
      },
      /* geänderte Projekte holen (Kolleg:innen, Kunden-Uploads) */
      async abgleichen() {
        const { data, error } = await sb.from("projekte").select("daten,geaendert").gt("geaendert", stand);
        if (error || !data.length) return [];
        stand = Math.max(stand, ...data.map((r) => r.geaendert));
        return data.map((r) => ({ ...r.daten, geaendert: r.geaendert }));
      },
      /* Portal */
      async portalInfo(t) {
        const { data, error } = await sbKunde().rpc("portal_info", { p_token: t });
        if (error) throw error;
        return data;
      },
      async portalHochladen(t, kategorie, file) {
        file = await verkleinern(file);
        const pfad = `kunde/${t}/${kategorie}/${uid()}-${sicher(file.name)}`;
        const up = await sbKunde().storage.from(BUCKET).upload(pfad, file, { contentType: file.type || "application/octet-stream" });
        if (up.error) throw new Error("Upload fehlgeschlagen");
        const { data, error } = await sbKunde().rpc("portal_upload_melden", { p_token: t, p_pfad: pfad, p_kategorie: kategorie, p_name: file.name, p_typ: file.type, p_groesse: file.size });
        if (error || !data) throw new Error("Upload konnte nicht zugeordnet werden");
        return { name: file.name, kategorie };
      },
    };
  }

  const konf = cloudKonfig();
  window.Daten = konf && window.supabase ? Cloud(konf) : Lokal;
})();
