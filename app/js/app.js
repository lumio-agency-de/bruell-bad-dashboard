/* Bad-Dashboard — das Arbeits-Dashboard.
   Jede Phase ist ein Level: erst wenn alle Pflichtschritte erledigt sind,
   wird die nächste freigeschaltet. Formulare, Dateien und Kunden-Uploads
   liegen direkt im Projekt. */

(function () {
  "use strict";

  const PHASEN = [...window.ABLAUF].sort((a, b) => a.nr - b.nr);
  const N = PHASEN.length;
  const phase = (nr) => PHASEN.find((p) => p.nr === nr);
  const ersteNr = PHASEN[0].nr;
  const naechsteNr = (nr) => { const i = PHASEN.findIndex((p) => p.nr === nr); return i >= 0 && i < N - 1 ? PHASEN[i + 1].nr : null; };
  const phaseIndex = (nr) => PHASEN.findIndex((p) => p.nr === nr);
  const KAT = window.KATEGORIEN;
  const katTitel = (id) => (KAT.find((k) => k.id === id) || { titel: id }).titel;

  const TERMINE = [
    { key: "erstgespraech",          label: "Erstgespräch",           typ: "datetime-local" },
    { key: "angebotsbesprechung",    label: "Angebotsbesprechung",    typ: "datetime-local" },
    { key: "baustellenbesichtigung", label: "Baustellenbesichtigung", typ: "datetime-local" },
    { key: "materialauswahl",        label: "Materialauswahl",        typ: "datetime-local" },
    { key: "baustart",               label: "Baustart",               typ: "date" },
    { key: "abnahme",                label: "Abnahme",                typ: "datetime-local" },
  ];
  const STATUS = [
    { id: "aktiv", label: "Aktiv" },
    { id: "pausiert", label: "Pausiert" },
    { id: "abgeschlossen", label: "Abgeschlossen" },
    { id: "verloren", label: "Abgesagt" },
  ];
  const ANREDEN = ["Herr", "Frau", "Herr und Frau", "Familie"];
  const EBENE_TITEL = Object.fromEntries((window.EBENEN || []).map((e) => [e.id, e.titel]));
  const GESPERRT_MONTEUR = ["angebot", "auftrag", "rechnungen"];
  const PARTNER_ORDNER = ["planung", "skizzen", "baustelle", "auswahl"];

  /* ---------- Helfer ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const zwei = (n) => String(n).padStart(2, "0");
  const isoTag = (d) => `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
  const heute = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const plusTage = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const datum = (s) => { if (!s) return null; const d = new Date(s.length <= 10 ? s + "T00:00" : s); return isNaN(d) ? null : d; };
  const tageBis = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return Math.round((x - heute()) / 864e5); };
  const WT = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  const fDatum = (d) => `${zwei(d.getDate())}.${zwei(d.getMonth() + 1)}.${d.getFullYear()}`;
  const fKurz = (d) => `${zwei(d.getDate())}.${zwei(d.getMonth() + 1)}.`;
  const fUhr = (d) => `${zwei(d.getHours())}:${zwei(d.getMinutes())}`;
  const hatUhrzeit = (s) => s && s.length > 10;
  const fTermin = (s) => {
    const d = datum(s); if (!d) return "";
    const t = tageBis(d);
    const tag = t === 0 ? "heute" : t === 1 ? "morgen" : t === -1 ? "gestern" : `${WT[d.getDay()].slice(0, 2)}, ${fDatum(d)}`;
    return hatUhrzeit(s) ? `${tag}, ${fUhr(d)} Uhr` : tag;
  };
  const relativ = (d) => { const t = tageBis(d); return t === 0 ? "heute" : t > 0 ? `in ${t} ${t === 1 ? "Tag" : "Tagen"}` : `seit ${-t} ${t === -1 ? "Tag" : "Tagen"}`; };
  const groesse = (b) => (b > 1e6 ? (b / 1e6).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(b / 1e3)) + " KB");
  const istBild = (d) => /^image\//.test(d.typ || "") || /\.(jpe?g|png|webp|gif)$/i.test(d.name);

  function toast(text, art) {
    const t = $("#toast");
    t.textContent = text; t.className = "toast an" + (art ? " " + art : "");
    clearTimeout(toast.timer); toast.timer = setTimeout(() => (t.className = "toast"), 2600);
  }
  async function kopieren(text) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); }
  }
  function herunterladen(name, text, typ = "application/json") {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: typ }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- Zustand ---------- */
  const S = {
    projekte: [],
    dateien: [],            // Metadaten aller Dateien (für Zähler & Fortschritt)
    einstellungen: null,
    filter: { suche: "", wer: "", status: "offen", abschnitt: "" },
    akteTab: "dateien",
    ordnerOffen: null,
    ansicht: {},            // projektId → angezeigtes Level
    zeigeFehler: false,
    ich: null,              // { id, name, ebene, gewerk? }
    voll: null,             // lokal als Partner: alle Projekte (nur zum Speichern von Meldungen)
    nurMeine: true,
  };
  const urlCache = new Map();

  /* ---------- Einstellungen ---------- */
  function cfg() {
    const basis = window.FIRMA;
    const e = S.einstellungen;
    if (!e) return basis;
    const out = { ...basis, ...e };
    for (const k of ["adresse", "farben", "programme", "fristen"]) out[k] = { ...basis[k], ...(e[k] || {}) };
    out.team = e.team || basis.team;
    out.partner = e.partner || basis.partner || [];
    out.cloud = Daten.konf || basis.cloud;
    return out;
  }
  const leute = (rolle) => cfg().team.filter((m) => m.rolle === rolle && m.name);
  const namen = (rolle) => leute(rolle).map((m) => m.name).join(" oder ") || rolle;
  const kuerzelListe = () => cfg().team.filter((m) => m.kuerzel).map((m) => m.kuerzel);
  function ersetzen(text) {
    const c = cfg();
    return String(text).replace(/\{([a-zA-Z.]+)\}/g, (m, key) => {
      if (key.startsWith("programm.")) return c.programme[key.slice(9)] ?? m;
      if (c.team.some((t) => t.rolle === key)) return namen(key);
      return m;
    });
  }
  function anwenden() {
    const c = cfg();
    const r = document.documentElement.style;
    r.setProperty("--tinte", c.farben.tinte);
    r.setProperty("--akzent", c.farben.akzent);
    $("#marke-name").textContent = c.name;
    $("#marke-bereich").textContent = c.bereich;
    $("#marke-logo").src = c.logo;
    document.title = `${c.kurzname || c.name} · Bad-Dashboard`;
  }

  /* ---------- Ebenen & Rechte ---------- */
  function mitgliedZu(id) {
    const c = cfg();
    const t = c.team.find((m) => m.kuerzel === id);
    if (t) return { id, name: t.name, ebene: t.ebene || "planung" };
    const pa = (c.partner || []).find((x) => x.id === id);
    if (pa) return { id, name: pa.firma, ebene: "partner", gewerk: pa.gewerk };
    return null;
  }
  const ebene = () => (S.ich ? S.ich.ebene : "geschaeftsfuehrung");
  const istGF = () => ebene() === "geschaeftsfuehrung";
  const istBuero = () => ebene() === "geschaeftsfuehrung" || ebene() === "planung";
  const darfSchritt = (s) => istGF() || (s.ebene || ["planung"]).includes(ebene());
  const darfKat = (kat) => istBuero() || (ebene() === "monteur" ? !GESPERRT_MONTEUR.includes(kat) : PARTNER_ORDNER.includes(kat));
  const darfHochladen = (kat) => istBuero() || (ebene() === "monteur" ? ["baustelle", "fertig"].includes(kat) : kat === "baustelle");
  const darfFormular = (fid) => istBuero() || (ebene() === "monteur" && (window.MONTEUR_FORMULARE || []).includes(fid));
  const zugewiesen = (p) => !!S.ich && (p.zugriff || []).includes(S.ich.id);
  const ebenenText = (l) => (l || ["planung"]).map((e) => EBENE_TITEL[e] || e).join(" / ");
  const monteure = () => cfg().team.filter((m) => m.ebene === "monteur" && m.name);

  /* Was ein Partner von einem Projekt sehen darf (gleicher Auszug wie partner_auftraege() in der Cloud) */
  function partnerSicht(p, partner) {
    const forms = (cfg().gewerke || {})[partner.gewerk] || [];
    const k = p.kunde || {};
    return {
      id: p.id, projektnr: p.projektnr, phase: p.phase, status: p.status, geaendert: p.geaendert,
      kunde: { anrede: k.anrede, vorname: k.vorname, nachname: k.nachname, strasse: k.strasse, ort: k.ort, telefon: k.telefon, mobil: k.mobil },
      termine: { baustart: (p.termine || {}).baustart, abnahme: (p.termine || {}).abnahme },
      formulare: Object.fromEntries(forms.filter((f) => (p.formulare || {})[f]).map((f) => [f, p.formulare[f]])),
      meldung: (p.partnerStatus || {})[partner.id] || null,
    };
  }

  /* ---------- Projekte ---------- */
  const alle = () => S.projekte.filter((p) => !p.geloescht && (ebene() !== "monteur" || zugewiesen(p)));
  const finde = (id) => S.projekte.find((p) => p.id === id && !p.geloescht);
  const dateienVon = (pid, kat) => S.dateien.filter((d) => d.projekt_id === pid && (!kat || d.kategorie === kat) && darfKat(d.kategorie));
  function anzeigeName(p) {
    const k = p.kunde || {};
    if (k.anrede === "Familie") return `Familie ${k.nachname}`;
    if (k.vorname) return `${k.vorname} ${k.nachname}`;
    return `${k.anrede || ""} ${k.nachname}`.trim();
  }

  const offen = new Set();
  let speicherTimer;
  function speichern(p) {
    if (ebene() === "partner") return;
    p.geaendert = Date.now();
    offen.add(p.id);
    clearTimeout(speicherTimer);
    speicherTimer = setTimeout(async () => {
      const ids = [...offen]; offen.clear();
      try {
        if (Daten.modus === "lokal") await Daten.projektSpeichern(null, S.projekte);
        else for (const id of ids) await Daten.projektSpeichern(S.projekte.find((x) => x.id === id));
      } catch (e) { ids.forEach((i) => offen.add(i)); toast("Nicht gespeichert – Verbindung prüfen", "fehler"); }
    }, 350);
  }
  function aendern(p, fn, log) {
    fn(p);
    if (log) { p.verlauf = p.verlauf || []; p.verlauf.unshift({ ts: Date.now(), text: log }); }
    speichern(p);
  }
  function neuesProjekt(kunde, extra = {}) {
    const p = {
      id: uid(), kunde: { anrede: "Herr", vorname: "", nachname: "", strasse: "", ort: "", email: "", telefon: "", telefonGeschaeft: "", mobil: "", ...kunde },
      projektnr: "", zustaendig: "", status: "aktiv", phase: ersteNr, schritte: {}, formulare: {}, termine: {}, mails: {},
      downloadCode: "", wiedervorlage: "", wiedervorlageNotiz: "", notiz: "", verlauf: [{ ts: Date.now(), text: "Anfrage angelegt" }],
      angelegt: Date.now(), geaendert: Date.now(), ...extra,
    };
    S.projekte.push(p);
    speichern(p);
    return p;
  }

  /* ---------- Spiel-Logik: Schritte & Level ---------- */
  const sKey = (nr, s) => `${nr}:${s.id}`;
  function schrittGilt(p, nr, s) {
    if (!s.wenn) return true;
    if (s.wenn.schritt) return ((p.schritte || {})[`${nr}:${s.wenn.schritt}`] || {}).wahl === s.wenn.wert;
    if (s.wenn.formular) {
      const w = Formular.werteVon(p, s.wenn.formular)[s.wenn.feld];
      return Array.isArray(w) ? w.includes(s.wenn.wert) : w === s.wenn.wert;
    }
    return true;
  }
  function schrittErledigt(p, nr, s) {
    if (p.demo && nr < p.phase) return true;
    const st = (p.schritte || {})[sKey(nr, s)] || {};
    switch (s.typ) {
      case "formular": return Formular.status(s.formular, p, dateienVon(p.id)).vollstaendig;
      case "dateien": return !!st.ersatz || dateienVon(p.id, s.kategorie).length >= (s.min || 1);
      case "termin": return !!(p.termine || {})[s.termin];
      case "mail": return !!(p.mails || {})[s.mail];
      case "erledigt": return !!st.erledigt;
      case "entscheidung": { const o = (s.optionen || []).find((x) => x.id === st.wahl); return !!o && o.weiter !== false; }
      case "feld": return !!String(p[s.feld] || "").trim();
      case "team": return (p.zugriff || []).length > 0;
    }
    return false;
  }
  function phaseStatus(p, nr) {
    const ph = phase(nr);
    const liste = ph.schritte.filter((s) => schrittGilt(p, nr, s)).map((s) => ({ s, pflicht: s.pflicht !== false, erledigt: schrittErledigt(p, nr, s) }));
    const pflicht = liste.filter((x) => x.pflicht);
    const fertig = pflicht.filter((x) => x.erledigt);
    return { liste, pflicht: pflicht.length, fertig: fertig.length, komplett: fertig.length === pflicht.length, offen: pflicht.filter((x) => !x.erledigt) };
  }
  function naechsterSchritt(p) {
    if (p.status === "abgeschlossen") return "Abgeschlossen";
    const st = phaseStatus(p, p.phase);
    return st.komplett ? "Bereit für das nächste Level" : ersetzen(st.offen[0].s.titel);
  }

  /* ---------- Fälligkeiten (Cockpit) ---------- */
  function faelligkeiten(p) {
    if (p.geloescht || p.status === "abgeschlossen" || p.status === "verloren") return [];
    const f = cfg().fristen, t = p.termine || {}, m = p.mails || {}, out = [];
    const add = (text, d, unter) => out.push({ p, text, d, unter, ueber: tageBis(d) < 0 });
    const wv = datum(p.wiedervorlage);
    if (wv && tageBis(wv) <= 0) add(p.wiedervorlageNotiz || "Wiedervorlage", wv, "Wiedervorlage");
    if (p.status === "pausiert") return out;
    const eg = datum(t.erstgespraech);
    if (p.phase === 2 && eg && tageBis(eg) >= 0 && tageBis(eg) <= f.erinnerungVorErstgespraech && !dateienVon(p.id, "bilder-alt").length && !((p.schritte || {})["2:fotos"] || {}).ersatz)
      add("Fotos & Maße fehlen – Kunden anrufen", plusTage(eg, -f.erinnerungVorErstgespraech), `Erstgespräch ${fTermin(t.erstgespraech)}`);
    const ab = datum(t.angebotsbesprechung);
    if (p.phase === 4 && ab && tageBis(ab) <= 3) add("Angebot & Planung fertigstellen", plusTage(ab, -3), `Besprechung ${fTermin(t.angebotsbesprechung)}`);
    if (p.phase === 5 && ab && !((p.schritte || {})["5:ergebnis"] || {}).wahl && tageBis(plusTage(ab, f.angebotsverfolgung)) <= 0)
      add("Angebotsverfolgung – nachfragen", plusTage(ab, f.angebotsverfolgung), `Besprechung war ${fTermin(t.angebotsbesprechung)}`);
    const ma = datum(t.materialauswahl);
    if ((p.phase === 7 || p.phase === 8) && ma && !m.freigabe && tageBis(plusTage(ma, f.freigabeNachMaterialauswahl)) <= 0)
      add("Planung zur Freigabe schicken", plusTage(ma, f.freigabeNachMaterialauswahl), `Materialauswahl ${fTermin(t.materialauswahl)}`);
    const bs = datum(t.baustart);
    if (bs && p.phase <= 11 && tageBis(bs) >= 0 && tageBis(bs) <= f.kundenerinnerungVorBaustart && !m.baustart)
      add("Kundenerinnerung vor Baustart senden", plusTage(bs, -f.kundenerinnerungVorBaustart), `Baustart ${fTermin(t.baustart)}`);
    const an = datum(t.abnahme);
    if (p.phase === 12 && an && tageBis(an) <= 0 && !m.schlussrechnung) add("Schlussrechnung senden", an, `Abnahme ${fTermin(t.abnahme)}`);
    return out;
  }

  /* ---------- Vorschaubilder ---------- */
  async function dateiUrl(d) {
    if (urlCache.has(d.id)) return urlCache.get(d.id);
    const u = await Daten.dateiUrl(d);
    urlCache.set(d.id, u);
    return u;
  }
  function vorschauenLaden(root = document) {
    $$("img[data-vorschau]", root).forEach(async (img) => {
      const d = S.dateien.find((x) => x.id === img.dataset.vorschau);
      if (!d) return;
      try { img.src = await dateiUrl(d); } catch (e) { /* ohne Vorschau */ }
    });
  }

  /* ---------- Bausteine ---------- */
  function fliesen(p) {
    const i = phaseIndex(p.phase), fertig = p.status === "abgeschlossen";
    return `<span class="fliesen" aria-label="Level ${i + 1} von ${N}">${PHASEN.map((_, k) => `<span class="fliese${fertig || k < i ? " fertig" : k === i ? " jetzt" : ""}"></span>`).join("")}</span>`;
  }
  const opt = (liste, wert) => liste.map((x) => {
    const [v, l] = typeof x === "string" ? [x, x] : [x.id, x.label];
    return `<option value="${esc(v)}"${v === wert ? " selected" : ""}>${esc(l)}</option>`;
  }).join("");

  /* Datei-Ablage einer Kategorie: Vorschauen + Upload-Feld */
  function ablage(p, kat, kompakt) {
    const l = dateienVon(p.id, kat);
    return `<div class="ablage${kompakt ? " kompakt" : ""}" data-ablage="${esc(kat)}">
      ${l.length ? `<ul class="thumbs">${l.map((d) => `<li><button type="button" class="thumb${d.neu ? " neu" : ""}" data-aktion="datei" data-datei="${esc(d.id)}" title="${esc(d.name)}">
        ${istBild(d) ? `<img data-vorschau="${esc(d.id)}" alt="">` : `<span class="typ">${esc((d.name.split(".").pop() || "").toUpperCase().slice(0, 4))}</span>`}
        <span class="thumb-name">${esc(d.name)}</span>${d.quelle === "kunde" ? '<span class="vom-kunden">Kunde</span>' : d.quelle === "partner" ? '<span class="vom-kunden partner">Partner</span>' : ""}</button></li>`).join("")}</ul>` : ""}
      ${darfHochladen(kat) ? `<label class="drop"><input type="file" multiple data-upload="${esc(kat)}" hidden>
        <span class="drop-icon" aria-hidden="true">＋</span><span>Dateien hierher ziehen oder <u>auswählen</u></span></label>` : l.length ? "" : '<p class="leise klein-text">Noch keine Dateien.</p>'}</div>`;
  }

  /* ================================================================
     Cockpit
     ================================================================ */
  function ansichtCockpit() {
    const meine = ebene() === "planung" && S.nurMeine;
    const laufend = alle().filter((p) => (p.status === "aktiv" || p.status === "pausiert") && (!meine || p.zustaendig === S.ich.id));
    const faellig = laufend.flatMap(faelligkeiten).sort((a, b) => a.d - b.d);
    const neu = S.dateien.filter((d) => d.neu && finde(d.projekt_id));
    const termine = [];
    for (const p of alle()) for (const t of TERMINE) { const d = datum((p.termine || {})[t.key]); if (d && tageBis(d) >= 0 && tageBis(d) <= 14 && p.status !== "verloren") termine.push({ p, t, d, s: p.termine[t.key] }); }
    termine.sort((a, b) => a.d - b.d);
    const d = new Date();
    const queue = laufend.filter((p) => p.status === "aktiv").map((p) => ({ p, st: phaseStatus(p, p.phase) })).sort((a, b) => (b.st.komplett - a.st.komplett) || (b.p.phase - a.p.phase));
    const neuNachProjekt = {};
    for (const x of neu) (neuNachProjekt[x.projekt_id] = neuNachProjekt[x.projekt_id] || []).push(x);

    return `<div class="seite cockpit">
      <header class="kopf"><div><p class="eyebrow">${WT[d.getDay()]}, ${fDatum(d)}${S.ich ? " · " + esc(S.ich.name) : ""}</p><h1>Cockpit</h1></div>
        ${ebene() === "planung" ? `<div class="kopf-aktionen"><div class="seg"><button class="seg-k${S.nurMeine ? " an" : ""}" data-aktion="nur-meine" data-wert="1">Meine Projekte</button><button class="seg-k${S.nurMeine ? "" : " an"}" data-aktion="nur-meine" data-wert="0">Alle</button></div></div>` : ""}</header>
      <section class="kpis">
        ${window.ABSCHNITTE.map((a) => {
          const l = laufend.filter((p) => p.phase >= a.von && p.phase <= a.bis);
          return `<a class="kpi" href="#/projekte?abschnitt=${a.id}"><span class="kpi-zahl">${l.length}</span><span class="kpi-titel">${esc(a.titel)}</span><span class="kpi-unter">Level ${zwei(a.von)}–${zwei(a.bis)}</span></a>`;
        }).join("")}
        <div class="kpi ${neu.length ? "alarm" : ""}"><span class="kpi-zahl">${neu.length}</span><span class="kpi-titel">Neu vom Kunden</span><span class="kpi-unter">${neu.length ? "Dateien warten" : "nichts Neues"}</span></div>
      </section>

      <div class="cockpit-raster">
        <section class="panel">
          <h2 class="panel-titel">Fällig ${faellig.length ? `<span class="zahl">${faellig.length}</span>` : ""}</h2>
          <ul class="liste">${faellig.length ? faellig.map((f) => `<li><a class="zeile" href="#/projekt/${f.p.id}">
            <span class="marker ${f.ueber ? "ueber" : "jetzt"}"></span>
            <span><span class="zeile-titel">${esc(f.text)}</span><span class="zeile-unter">${esc(anzeigeName(f.p))} · ${esc(f.unter)}</span></span>
            <span class="zeile-rechts ${f.ueber ? "ueberfaellig" : ""}">${f.ueber ? relativ(f.d) : "heute"}</span></a></li>`).join("")
            : `<li class="leer-hinweis">Nichts überfällig.</li>`}</ul>

          <h2 class="panel-titel abstand">Als Nächstes</h2>
          <ul class="liste">${queue.length ? queue.map(({ p, st }) => `<li><a class="zeile" href="#/projekt/${p.id}">
            <span class="lv-mini${st.komplett ? " bereit" : ""}">${zwei(p.phase)}</span>
            <span><span class="zeile-titel">${esc(naechsterSchritt(p))}</span><span class="zeile-unter">${esc(anzeigeName(p))} · ${esc(phase(p.phase).titel)}</span></span>
            <span class="zeile-rechts">${st.fertig}/${st.pflicht}</span></a></li>`).join("")
            : `<li class="leer-hinweis">Keine laufenden Projekte. <button class="btn klein" data-aktion="neu">+ Neue Anfrage</button></li>`}</ul>
        </section>

        <div class="spalte">
          <section class="panel">
            <h2 class="panel-titel">Neu vom Kunden ${neu.length ? `<span class="zahl">${neu.length}</span>` : ""}</h2>
            <ul class="liste">${Object.keys(neuNachProjekt).length ? Object.entries(neuNachProjekt).map(([pid, l]) => { const p = finde(pid); return `<li><a class="zeile" href="#/projekt/${pid}">
              <span class="marker jetzt"></span><span><span class="zeile-titel">${esc(anzeigeName(p))}</span><span class="zeile-unter">${l.length} ${l.length === 1 ? "Datei" : "Dateien"} · ${esc([...new Set(l.map((x) => katTitel(x.kategorie)))].join(", "))}</span></span>
              <span class="zeile-rechts">${fTermin(String(l[l.length - 1].am).slice(0, 10))}</span></a></li>`; }).join("")
              : `<li class="leer-hinweis">Hier landen Fotos und Unterlagen, die Kunden über ihren Link hochladen.</li>`}</ul>
          </section>
          ${istGF() ? teamPanel() : ""}
          <section class="panel">
            <h2 class="panel-titel">Termine · 14 Tage</h2>
            <ul class="liste">${termine.length ? termine.map((t) => `<li><a class="zeile" href="#/projekt/${t.p.id}">
              <span class="marker termin"></span><span><span class="zeile-titel">${esc(t.t.label)}</span><span class="zeile-unter">${esc(anzeigeName(t.p))}${t.p.kunde.ort ? " · " + esc(t.p.kunde.ort) : ""}</span></span>
              <span class="zeile-rechts">${esc(fTermin(t.s))}</span></a></li>`).join("") : `<li class="leer-hinweis">Keine Termine.</li>`}</ul>
          </section>
        </div>
      </div>

      <section class="panel wand" style="--n:${N}">
        <h2 class="panel-titel">Fliesenspiegel <small>jede Fliese ein Bad, in der Spalte seines Levels</small></h2>
        <div class="wand-raster">${PHASEN.map((ph) => `<div class="wand-spalte">${laufend.filter((p) => p.phase === ph.nr).map((p) => `<a class="wand-stein${phaseStatus(p, p.phase).komplett ? " bereit" : ""}${faelligkeiten(p).length ? " faellig" : ""}" href="#/projekt/${p.id}" title="${esc(anzeigeName(p))}">${esc(p.kunde.nachname)}</a>`).join("") || '<span class="wand-leer"></span>'}</div>`).join("")}</div>
        <div class="wand-fuss">${PHASEN.map((ph) => `<span title="${esc(ph.titel)}">${zwei(ph.nr)}</span>`).join("")}</div>
      </section>
    </div>`;
  }

  /* Geschäftsführung: wer hat wie viel auf dem Tisch? */
  function teamPanel() {
    const aktiv = alle().filter((p) => p.status === "aktiv" || p.status === "pausiert");
    const zeilen = cfg().team.filter((m) => m.name).map((m) => {
      const l = m.ebene === "monteur" ? aktiv.filter((p) => (p.zugriff || []).includes(m.kuerzel)) : aktiv.filter((p) => p.zustaendig === m.kuerzel);
      return { m, l };
    }).filter((x) => x.m.ebene !== "geschaeftsfuehrung");
    const max = Math.max(1, ...zeilen.map((x) => x.l.length));
    return `<section class="panel"><h2 class="panel-titel">Team-Auslastung</h2>
      <ul class="auslastung">${zeilen.map(({ m, l }) => `<li><span class="kuerzel klein">${esc(m.kuerzel)}</span><span class="al-name">${esc(m.name)}<small>${esc(EBENE_TITEL[m.ebene] || "")}</small></span>
        <span class="al-balken"><span style="width:${Math.round((l.length / max) * 100)}%"></span></span><span class="al-zahl">${l.length}</span></li>`).join("")}</ul></section>`;
  }

  /* ================================================================
     Monteur: Meine Baustellen
     ================================================================ */
  function ansichtBaustellen() {
    const liste = alle().filter((p) => p.status !== "verloren").sort((a, b) => String((a.termine || {}).baustart || "9").localeCompare(String((b.termine || {}).baustart || "9")));
    return `<div class="seite"><header class="kopf"><div><p class="eyebrow">${esc(S.ich.name)} · Monteur</p><h1>Meine Baustellen</h1></div></header>
      ${liste.length ? `<div class="karten">${liste.map((p) => {
        const k = p.kunde, st = phaseStatus(p, p.phase);
        const meine = st.liste.filter((x) => !x.erledigt && darfSchritt(x.s));
        return `<article class="panel einsatz-karte"><header><span class="lv-mini">${zwei(p.phase)}</span><div><h2>${esc(anzeigeName(p))}</h2><p>${esc([k.strasse, k.ort].filter(Boolean).join(", "))}</p></div></header>
          <dl class="infos"><dt>Baustart</dt><dd>${esc(fTermin((p.termine || {}).baustart) || "—")}</dd><dt>Abnahme</dt><dd>${esc(fTermin((p.termine || {}).abnahme) || "—")}</dd><dt>Telefon</dt><dd>${[k.telefon, k.mobil].filter(Boolean).map((x) => `<a href="tel:${esc(x.replace(/[^\d+]/g, ""))}">${esc(x)}</a>`).join(" · ") || "—"}</dd></dl>
          ${meine.length ? `<p class="q-gruppe">Für dich offen</p><ul class="einfach">${meine.map((x) => `<li>${esc(ersetzen(x.s.titel))}</li>`).join("")}</ul>` : ""}
          <footer class="aktionen"><a class="btn voll" href="#/projekt/${p.id}">Öffnen <span class="pfeil">→</span></a><button class="btn" data-aktion="mappe" data-id="${p.id}">Monteurmappe</button>
          ${k.strasse ? `<a class="btn still" href="https://maps.google.com/?q=${encodeURIComponent([k.strasse, k.ort].join(" "))}" target="_blank" rel="noopener">Route</a>` : ""}</footer></article>`;
      }).join("")}</div>` : `<div class="panel startfeld"><h2>Keine Baustellen</h2><p>Sobald dich das Büro einer Baustelle zuweist, erscheint sie hier.</p></div>`}</div>`;
  }

  /* ================================================================
     Externer Partner: Meine Einsätze
     ================================================================ */
  function ansichtEinsaetze() {
    const liste = S.projekte.filter((p) => p.status !== "verloren");
    return `<div class="seite"><header class="kopf"><div><p class="eyebrow">${esc(S.ich.name)} · ${esc(S.ich.gewerk || "Partner")}</p><h1>Meine Einsätze</h1></div></header>
      ${liste.length ? `<div class="karten">${liste.map((p) => `<a class="panel einsatz-karte link" href="#/projekt/${p.id}">
        <header><span class="lv-mini${p.meldung && p.meldung.erledigt ? " bereit" : ""}">${p.meldung && p.meldung.erledigt ? "✓" : zwei(p.phase)}</span><div><h2>${esc(anzeigeName(p))}</h2><p>${esc([p.kunde.strasse, p.kunde.ort].filter(Boolean).join(", "))}</p></div></header>
        <dl class="infos"><dt>Baustart</dt><dd>${esc(fTermin(p.termine.baustart) || "noch offen")}</dd><dt>Status</dt><dd>${p.meldung ? (p.meldung.erledigt ? "Erledigt gemeldet" : "Rückmeldung gesendet") : "Offen"}</dd></dl></a>`).join("")}</div>`
        : `<div class="panel startfeld"><h2>Keine Einsätze</h2><p>Sobald Sie einem Bad zugewiesen werden, erscheint es hier.</p></div>`}</div>`;
  }
  function ansichtEinsatz(id) {
    const p = S.projekte.find((x) => x.id === id);
    if (!p) return `<div class="seite"><a class="btn" href="#/cockpit">← Meine Einsätze</a></div>`;
    const k = p.kunde, c = cfg();
    const ctx = { firma: c, dateien: dateienVon(p.id), kopfzeile: anzeigeName(p) };
    const forms = Object.keys(p.formulare || {}).filter((f) => Formular.def(f));
    return `<div class="seite einsatz" data-projekt="${p.id}">
      <header class="p-kopf"><div><p class="eyebrow"><a href="#/cockpit">Meine Einsätze</a> / ${esc(S.ich.gewerk || "")}</p><h1>${esc(anzeigeName(p))}</h1>
        <div class="p-kontakt"><span>${esc([k.strasse, k.ort].filter(Boolean).join(", "))}</span>${k.strasse ? `<a href="https://maps.google.com/?q=${encodeURIComponent([k.strasse, k.ort].join(" "))}" target="_blank" rel="noopener">Route</a>` : ""}
        ${[k.telefon, k.mobil].filter(Boolean).map((x) => `<a href="tel:${esc(x.replace(/[^\d+]/g, ""))}">${esc(x)}</a>`).join("")}</div></div></header>
      <div class="arbeit">
        <div class="spalte">
          <section class="panel"><h2 class="panel-titel">Unterlagen für Ihr Gewerk</h2>
            <div class="einsatz-docs">${forms.length ? forms.map((f) => Formular.druck(f, p, ctx)).join("") : '<p class="leer-hinweis">Noch keine Unterlagen freigegeben.</p>'}</div></section>
          <section class="panel"><h2 class="panel-titel">Pläne & Skizzen</h2><div class="panel-innen">${ablage(p, "planung")}${dateienVon(p.id, "skizzen").length ? ablage(p, "skizzen") : ""}</div></section>
        </div>
        <div class="spalte">
          <section class="panel"><h2 class="panel-titel">Termine</h2><dl class="infos panel-innen"><dt>Baustart</dt><dd>${esc(fTermin(p.termine.baustart) || "noch offen")}</dd><dt>Abnahme</dt><dd>${esc(fTermin(p.termine.abnahme) || "—")}</dd><dt>Ansprechpartner</dt><dd>${esc(namen("projektleiter"))} · <a href="tel:${esc(String(c.telefon).replace(/[^\d+]/g, ""))}">${esc(c.telefon)}</a></dd></dl></section>
          <section class="panel"><h2 class="panel-titel">Fotos von der Baustelle</h2><div class="panel-innen">${ablage(p, "baustelle")}</div></section>
          <section class="panel"><h2 class="panel-titel">Rückmeldung ans Büro</h2><div class="panel-innen">
            ${p.meldung ? `<p class="${p.meldung.erledigt ? "gruen" : ""}"><b>${p.meldung.erledigt ? "✓ Erledigt gemeldet" : "Rückmeldung gesendet"}</b> am ${fKurz(new Date(p.meldung.am))}${p.meldung.notiz ? ` – ${esc(p.meldung.notiz)}` : ""}</p>` : ""}
            <textarea class="eingabe" id="meldung-text" rows="3" placeholder="Hinweis fürs Büro (optional) – z. B. Material fehlt, Termin verschoben …"></textarea>
            <div class="aktionen"><button class="btn jetzt" data-aktion="melden" data-erledigt="1">Gewerk erledigt melden</button><button class="btn" data-aktion="melden" data-erledigt="0">Nur Hinweis senden</button></div></div></section>
        </div></div></div>`;
  }

  /* ================================================================
     Projekte
     ================================================================ */
  function ansichtProjekte() {
    if (!alle().length) {
      return `<div class="seite"><header class="kopf"><div><p class="eyebrow">Projekte</p><h1>Noch leer</h1></div></header>
        <div class="panel startfeld"><h2>Die erste Anfrage anlegen</h2>
          <p>Jedes Bad läuft als Projekt durch ${N} Level. Leg eine echte Anfrage an – oder probier das Dashboard erst mit Beispielprojekten aus (lassen sich unter „Einrichtung“ wieder entfernen).</p>
          <div class="aktionen"><button class="btn jetzt" data-aktion="neu">+ Neue Anfrage</button><button class="btn" data-aktion="demo">Beispielprojekte laden</button></div></div></div>`;
    }
    const f = S.filter;
    return `<div class="seite">
      <header class="kopf"><div><p class="eyebrow">Projekte</p><h1>Alle Bäder</h1></div></header>
      <div class="werkzeuge">
        <input class="eingabe feld-suche" type="search" placeholder="Name, Ort, Projektnummer …" data-filter="suche" value="${esc(f.suche)}" aria-label="Suchen">
        <select class="eingabe auto" data-filter="abschnitt" aria-label="Abschnitt"><option value="">Alle Abschnitte</option>${opt(window.ABSCHNITTE.map((a) => ({ id: a.id, label: a.titel })), f.abschnitt)}</select>
        <select class="eingabe auto" data-filter="wer" aria-label="Zuständig"><option value="">Alle Zuständigen</option>${opt(kuerzelListe(), f.wer)}</select>
        <select class="eingabe auto" data-filter="status" aria-label="Status">${opt([{ id: "offen", label: "Laufende" }, ...STATUS, { id: "alle", label: "Alle" }], f.status)}</select>
      </div>
      <div id="projektliste">${projektListe()}</div></div>`;
  }
  function projektListe() {
    const f = S.filter, q = f.suche.trim().toLowerCase();
    const liste = alle().filter((p) => {
      if (f.status === "offen" && !(p.status === "aktiv" || p.status === "pausiert")) return false;
      if (f.status !== "offen" && f.status !== "alle" && p.status !== f.status) return false;
      if (f.wer && p.zustaendig !== f.wer) return false;
      if (q && ![p.kunde.nachname, p.kunde.vorname, p.kunde.ort, p.projektnr, p.kunde.strasse].join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
    if (!liste.length) return `<p class="leer-hinweis">Keine Projekte für diese Auswahl.</p>`;
    return window.ABSCHNITTE.filter((a) => !f.abschnitt || a.id === f.abschnitt).map((a) => {
      const teil = liste.filter((p) => p.phase >= a.von && p.phase <= a.bis).sort((x, y) => y.phase - x.phase || x.kunde.nachname.localeCompare(y.kunde.nachname, "de"));
      if (!teil.length) return "";
      return `<section class="abschnitt"><div class="abschnitt-kopf"><h2>${esc(a.titel)}</h2><span class="phasen">Level ${a.von}–${a.bis}</span><span class="anzahl">${teil.length}</span></div>
        ${teil.map((p) => {
          const st = phaseStatus(p, p.phase);
          const neu = dateienVon(p.id).filter((d) => d.neu).length;
          return `<a class="projekt-zeile" href="#/projekt/${p.id}">
            <span><span class="p-name">${esc(anzeigeName(p))}</span>${p.status !== "aktiv" ? `<span class="status-chip ${p.status}">${esc(STATUS.find((s) => s.id === p.status)?.label)}</span>` : ""}${p.demo ? `<span class="status-chip">Beispiel</span>` : ""}${neu ? `<span class="status-chip neu">${neu} neu</span>` : ""}<br><span class="p-ort">${esc([p.projektnr, p.kunde.ort].filter(Boolean).join(" · ") || "—")}</span></span>
            <span class="p-phase">${zwei(p.phase)} ${esc(phase(p.phase).titel)}<small>${esc(naechsterSchritt(p))}</small></span>
            ${fliesen(p)}
            <span class="p-termin">${st.fertig}/${st.pflicht} Schritte</span>
            <span class="kuerzel" title="Zuständig">${esc(p.zustaendig || "–")}</span></a>`;
        }).join("")}</section>`;
    }).join("");
  }

  /* ================================================================
     Projekt — die Spielfläche
     ================================================================ */
  function ansichtProjekt(id) {
    const p = finde(id);
    if (!p) return `<div class="seite"><header class="kopf"><div><p class="eyebrow">Projekt</p><h1>Nicht gefunden</h1></div></header><a class="btn" href="#/projekte">← Zu den Projekten</a></div>`;
    const nr = S.ansicht[id] && S.ansicht[id] <= p.phase ? S.ansicht[id] : p.phase;
    S.ansicht[id] = nr;
    return `<div class="seite projekt" data-projekt="${p.id}">
      ${projektKopf(p)}
      <nav class="karte" aria-label="Level">${levelKarte(p, nr)}</nav>
      <div class="arbeit">
        <div id="mission">${mission(p, nr)}</div>
        <aside class="akte" id="akte">${akte(p)}</aside>
      </div></div>`;
  }
  function projektKopf(p) {
    const k = p.kunde;
    const tel = [k.telefon, k.mobil, k.telefonGeschaeft].filter(Boolean);
    const neu = dateienVon(p.id).filter((d) => d.neu).length;
    return `<header class="p-kopf">
      <div><p class="eyebrow"><a href="#/projekte">Projekte</a> / ${p.projektnr ? "Nr. " + esc(p.projektnr) + " · " : ""}Level ${zwei(p.phase)} von ${N}${p.status !== "aktiv" ? " · " + esc(STATUS.find((s) => s.id === p.status)?.label) : ""}</p>
        <h1>${esc(anzeigeName(p))}</h1>
        <div class="p-kontakt">
          ${k.strasse || k.ort ? `<span>${esc([k.strasse, k.ort].filter(Boolean).join(", "))}</span>` : ""}
          ${tel.map((t) => `<a href="tel:${esc(t.replace(/[^\d+]/g, ""))}">${esc(t)}</a>`).join("")}
          ${k.email && istBuero() ? `<a href="mailto:${esc(k.email)}">${esc(k.email)}</a>` : ""}
          ${p.zustaendig ? `<span class="kuerzel klein" title="Zuständig">${esc(p.zustaendig)}</span>` : ""}
        </div></div>
      <div class="kopf-aktionen">
        ${neu && istBuero() ? `<button class="btn jetzt" data-aktion="akte-tab" data-tab="dateien">${neu} neu vom Kunden</button>` : ""}
        ${istBuero() ? `<button class="btn" data-aktion="kundenlink">Kundenlink</button>` : ""}
        <button class="btn" data-aktion="mappe">Monteurmappe</button>
      </div></header>`;
  }
  function levelKarte(p, ansicht) {
    const i = phaseIndex(p.phase), fertigAlle = p.status === "abgeschlossen";
    return `<ol class="levels">${PHASEN.map((ph, k) => {
      const z = fertigAlle || k < i ? "fertig" : k === i ? "jetzt" : "zu";
      return `<li class="lv ${z}${ph.nr === ansicht ? " ansicht" : ""}">
        <button type="button" data-aktion="level" data-nr="${ph.nr}" ${z === "zu" ? 'aria-disabled="true"' : ""} title="${zwei(ph.nr)} ${esc(ph.titel)}${z === "zu" ? " – noch gesperrt" : ""}">
          <span class="lv-knoten">${z === "fertig" ? "✓" : z === "zu" ? '<span class="schloss" aria-hidden="true"></span>' : zwei(ph.nr)}</span>
          <span class="lv-titel">${esc(ph.titel)}</span></button></li>`;
    }).join("")}</ol>`;
  }

  function mission(p, nr) {
    const ph = phase(nr);
    const st = phaseStatus(p, nr);
    const istJetzt = nr === p.phase && p.status !== "abgeschlossen";
    const prozent = st.pflicht ? Math.round((st.fertig / st.pflicht) * 100) : 100;
    const weiter = naechsteNr(nr);
    return `<section class="mission panel${istJetzt ? "" : " vergangen"}">
      <header class="mission-kopf">
        <span class="mission-nr">${zwei(nr)}</span>
        <div><p class="eyebrow">${istJetzt ? "Aktuelles Level" : "Abgeschlossenes Level"} · ${esc(window.ABSCHNITTE.find((a) => nr >= a.von && nr <= a.bis).titel)}</p>
          <h2>${esc(ph.titel)}</h2><p class="mission-ziel">${esc(ersetzen(ph.ziel))}</p></div>
        <div class="fortschritt" role="progressbar" aria-valuenow="${prozent}" aria-valuemin="0" aria-valuemax="100" aria-label="Fortschritt">
          <span class="fs-zahl">${st.fertig}<small>/${st.pflicht}</small></span><span class="fs-balken"><span style="width:${prozent}%"></span></span></div>
      </header>
      <ol class="quests">${st.liste.map((x, k) => quest(p, nr, x, k)).join("")}</ol>
      <footer class="mission-fuss">${istJetzt && !istBuero()
        ? `<span class="offen-text">${st.komplett ? "Alles erledigt – das Büro schaltet das nächste Level frei." : `Noch offen: ${st.offen.map((x) => esc(ersetzen(x.s.titel))).join(" · ")}`}</span>`
        : istJetzt
        ? (st.komplett
          ? `<span class="bereit-text">Alles erledigt – Level freischalten.</span><button class="btn jetzt gross" data-aktion="abschliessen">${weiter ? `Weiter zu Level ${zwei(weiter)}: ${esc(phase(weiter).titel)}` : "Projekt abschließen & archivieren"} <span class="pfeil">→</span></button>`
          : `<span class="offen-text">Noch offen: ${st.offen.map((x) => esc(ersetzen(x.s.titel))).join(" · ")}</span><button class="btn gross" disabled>${weiter ? `Level ${zwei(weiter)} gesperrt` : "Abschluss gesperrt"}</button>`)
        : `<span class="offen-text">Dieses Level ist abgeschlossen. Änderungen bleiben möglich.</span><button class="btn voll" data-aktion="level" data-nr="${p.phase}">Zum aktuellen Level ${zwei(p.phase)}</button>`}
      </footer></section>`;
  }

  function quest(p, nr, x, k) {
    const s = x.s, key = sKey(nr, s), st = (p.schritte || {})[key] || {};
    const titel = ersetzen(s.titel);
    let inhalt = "", meta = "";
    switch (s.typ) {
      case "formular": {
        const fs = Formular.status(s.formular, p, dateienVon(p.id));
        meta = fs.vollstaendig ? "vollständig" : fs.begonnen ? `${fs.ok} von ${fs.gesamt} Pflichtfeldern` : "noch nicht begonnen";
        inhalt = `<div class="q-aktion"><a class="btn ${x.erledigt ? "" : "voll"}" href="#/projekt/${p.id}/formular/${s.formular}">${fs.begonnen ? "Formular bearbeiten" : "Formular ausfüllen"} <span class="pfeil">→</span></a>
          ${fs.begonnen ? `<button class="btn still" data-aktion="drucken" data-formular="${s.formular}">Drucken</button>` : ""}</div>`;
        break;
      }
      case "dateien": {
        const n = dateienVon(p.id, s.kategorie).length;
        meta = st.ersatz ? `abgehakt: ${esc(st.ersatz)}` : `${n}${s.min > 1 ? ` von ${s.min}` : ""} ${n === 1 ? "Datei" : "Dateien"} in „${esc(katTitel(s.kategorie))}“`;
        inhalt = `${s.vorlage ? `<div class="q-vorlagen">${s.vorlage.map((v) => `<a class="btn klein" href="${esc(v.datei)}" target="_blank" rel="noopener">↓ ${esc(v.titel)}</a>`).join("")}</div>` : ""}
          ${ablage(p, s.kategorie, true)}
          <div class="q-unter">${s.kundenlink ? `<button class="btn klein" data-aktion="kundenlink">Kundenlink kopieren</button>` : ""}
          ${s.ersatz && !n ? (st.ersatz ? `<button class="btn klein still" data-aktion="ersatz-weg" data-key="${key}">Rückgängig</button>` : `<button class="btn klein still" data-aktion="ersatz" data-key="${key}" data-text="${esc(s.ersatz)}">Ohne Dateien abhaken: ${esc(s.ersatz)}</button>`) : ""}</div>`;
        break;
      }
      case "termin": {
        const def = TERMINE.find((t) => t.key === s.termin);
        const v = (p.termine || {})[s.termin] || "";
        meta = v ? fTermin(v) : "noch kein Termin";
        inhalt = `<div class="q-aktion"><input class="eingabe auto" type="${def.typ}" data-termin="${s.termin}" value="${esc(v)}" aria-label="${esc(def.label)}"></div>`;
        break;
      }
      case "mail": {
        const am = (p.mails || {})[s.mail];
        meta = am ? `gesendet ${fKurz(new Date(am))}` : "noch nicht gesendet";
        inhalt = `<div class="q-aktion"><button class="btn ${am ? "" : "voll"}" data-aktion="mail" data-mail="${s.mail}">${am ? "Erneut öffnen" : "Mail schreiben"} <span class="pfeil">→</span></button></div>`;
        break;
      }
      case "erledigt":
        meta = st.erledigt ? `bestätigt ${fKurz(new Date(st.am))}${st.von ? " · " + esc(st.von) : ""}` : "";
        inhalt = `<div class="q-aktion"><button class="btn ${st.erledigt ? "an" : ""}" data-aktion="bestaetigen" data-key="${key}" aria-pressed="${!!st.erledigt}">${st.erledigt ? "✓ Erledigt" : "Als erledigt bestätigen"}</button></div>`;
        break;
      case "entscheidung":
        meta = st.wahl ? esc(ersetzen((s.optionen.find((o) => o.id === st.wahl) || {}).label || "")) : "";
        inhalt = `<div class="chips">${s.optionen.map((o) => `<button type="button" class="chip${st.wahl === o.id ? " an" : ""}${o.status === "verloren" ? " warn" : ""}" data-aktion="wahl" data-key="${key}" data-nr="${nr}" data-schritt="${s.id}" data-wert="${o.id}">${esc(ersetzen(o.label))}</button>`).join("")}</div>`;
        break;
      case "team": {
        const z = p.zugriff || [];
        meta = z.length ? `${z.length} zugewiesen` : "noch niemand";
        const chip = (id, name, zusatz) => `<button type="button" class="chip${z.includes(id) ? " an" : ""}" data-aktion="zuweisen" data-id="${esc(id)}">${esc(name)}${zusatz ? ` <small>${esc(zusatz)}</small>` : ""}</button>`;
        inhalt = `<p class="q-gruppe">Monteure</p><div class="chips">${monteure().map((m) => chip(m.kuerzel, m.name)).join("") || '<span class="leise">In der Einrichtung Monteure anlegen.</span>'}</div>
          <p class="q-gruppe">Externe Partner</p><div class="chips">${(cfg().partner || []).map((x) => chip(x.id, x.firma, x.gewerk)).join("") || '<span class="leise">In der Einrichtung Partner anlegen.</span>'}</div>`;
        break;
      }
      case "feld": {
        const v = p[s.feld] || "";
        meta = v ? esc(v) : "";
        inhalt = s.feld === "zustaendig"
          ? `<div class="chips">${leute("badplanung").map((m) => `<button type="button" class="chip${v === m.kuerzel ? " an" : ""}" data-aktion="setze-feld" data-feld="zustaendig" data-wert="${esc(m.kuerzel)}">${esc(m.name)} (${esc(m.kuerzel)})</button>`).join("")}</div>`
          : `<div class="q-aktion"><input class="eingabe auto" data-pfeld="${s.feld}" value="${esc(v)}" aria-label="${esc(titel)}" placeholder="eintragen"></div>`;
        break;
      }
    }
    const darf = darfSchritt(s);
    if (!darf) {
      if (s.typ === "formular") inhalt = Object.keys(Formular.werteVon(p, s.formular)).length ? `<div class="q-aktion"><a class="btn" href="#/projekt/${p.id}/formular/${s.formular}">Ansehen</a></div>` : "";
      else if (s.typ === "dateien") inhalt = ablage(p, s.kategorie, true);
      else inhalt = "";
      inhalt += `<p class="q-fremd">Erledigt: ${esc(ebenenText(s.ebene))}</p>`;
    }
    return `<li class="quest ${x.erledigt ? "erledigt" : "offen"}${x.pflicht ? "" : " optional"}${darf ? "" : " fremd"}" data-quest="${key}">
      <span class="q-marker" aria-hidden="true">${x.erledigt ? "✓" : k + 1}</span>
      <div class="q-inhalt"><div class="q-kopf"><h3>${esc(titel)}</h3>${x.pflicht ? "" : '<span class="q-tag">optional</span>'}${meta ? `<span class="q-meta">${meta}</span>` : ""}</div>
        ${s.hinweis ? `<p class="q-hinweis">${esc(ersetzen(s.hinweis))}</p>` : ""}${inhalt}</div></li>`;
  }

  /* Akte rechts: Dateien, Kunde, Termine, Verlauf */
  function akte(p) {
    if (!istBuero() && !["dateien", "kunde", "termine"].includes(S.akteTab)) S.akteTab = "dateien";
    const t = S.akteTab;
    const tabs = istBuero() ? [["dateien", "Dateien"], ["kunde", "Kunde"], ["team", "Team"], ["termine", "Termine"], ["verlauf", "Verlauf"]] : [["dateien", "Dateien"], ["kunde", "Kunde"], ["termine", "Termine"]];
    let inhalt = "";
    if (!istBuero() && (t === "kunde" || t === "termine")) {
      const k = p.kunde;
      inhalt = t === "kunde"
        ? `<dl class="infos"><dt>Kunde</dt><dd>${esc(anzeigeName(p))}</dd><dt>Adresse</dt><dd>${esc([k.strasse, k.ort].filter(Boolean).join(", ") || "—")}${k.strasse ? ` · <a href="https://maps.google.com/?q=${encodeURIComponent([k.strasse, k.ort].join(" "))}" target="_blank" rel="noopener">Karte</a>` : ""}</dd>
           <dt>Telefon</dt><dd>${[k.telefon, k.mobil].filter(Boolean).map((x) => `<a href="tel:${esc(x.replace(/[^\d+]/g, ""))}">${esc(x)}</a>`).join(" · ") || "—"}</dd><dt>Zuständig im Büro</dt><dd>${esc(p.zustaendig || "—")}</dd></dl>`
        : `<dl class="infos">${TERMINE.map((d) => `<dt>${esc(d.label)}</dt><dd>${esc(fTermin((p.termine || {})[d.key]) || "—")}</dd>`).join("")}</dl>`;
    } else if (t === "team") {
      const z = p.zugriff || [], st = p.partnerStatus || {};
      const zeile = (id, name, art) => `<li><button type="button" class="haken-k${z.includes(id) ? " an" : ""}" data-aktion="zuweisen" data-id="${esc(id)}" aria-pressed="${z.includes(id)}"><span></span></button><span><b>${esc(name)}</b><small>${esc(art)}</small>${st[id] ? `<small class="${st[id].erledigt ? "gruen" : ""}">${st[id].erledigt ? "✓ erledigt gemeldet" : "Rückmeldung"} ${fKurz(new Date(st[id].am))}${st[id].notiz ? ": " + esc(st[id].notiz) : ""}</small>` : ""}</span></li>`;
      inhalt = `<p class="leise klein-text">Zugewiesene sehen dieses Projekt – Monteure ohne Angebote/Rechnungen, Partner nur Adresse, Termine, Pläne und ihr Gewerk.</p>
        <ul class="team-liste">${monteure().map((m) => zeile(m.kuerzel, m.name, "Monteur")).join("")}${(cfg().partner || []).map((x) => zeile(x.id, x.firma, "Partner · " + x.gewerk)).join("")}</ul>`;
    } else if (t === "dateien") {
      inhalt = `<ul class="ordner">${KAT.filter((k) => darfKat(k.id)).map((k) => {
        const l = dateienVon(p.id, k.id), neu = l.filter((d) => d.neu).length, auf = S.ordnerOffen === k.id;
        return `<li class="${auf ? "auf" : ""}"><button class="ordner-k" data-aktion="ordner" data-kat="${k.id}" aria-expanded="${auf}">
          <span class="ordner-icon" aria-hidden="true"></span><span class="ordner-name">${esc(k.titel)}</span>
          ${neu ? `<span class="badge">${neu} neu</span>` : ""}<span class="ordner-zahl">${l.length || ""}</span></button>
          ${auf ? ablage(p, k.id) : ""}</li>`;
      }).join("")}</ul>`;
    } else if (t === "kunde") {
      const k = p.kunde;
      const f = (feld, label, typ = "text", breit) => `<div class="feld${breit ? " breit" : ""}"><label for="k-${feld}">${label}</label><input class="eingabe" id="k-${feld}" type="${typ}" data-kfeld="${feld}" value="${esc(k[feld])}"></div>`;
      inhalt = `<div class="felder">
        <div class="feld"><label for="k-anrede">Anrede</label><select class="eingabe" id="k-anrede" data-kfeld="anrede">${opt(ANREDEN, k.anrede)}</select></div>
        ${f("vorname", "Vorname")}${f("nachname", "Nachname")}${f("telefon", "Telefon", "tel")}${f("mobil", "Mobil", "tel")}${f("telefonGeschaeft", "Tel. geschäftl.", "tel")}
        ${f("email", "E-Mail", "email", true)}${f("strasse", "Straße")}${f("ort", "PLZ & Ort")}
        <div class="feld"><label for="k-status">Status</label><select class="eingabe" id="k-status" data-pfeld="status">${opt(STATUS, p.status)}</select></div>
        <div class="feld"><label for="k-zust">Zuständig</label><select class="eingabe" id="k-zust" data-pfeld="zustaendig"><option value="">–</option>${opt(kuerzelListe(), p.zustaendig)}</select></div>
        <div class="feld"><label for="k-wv">Wiedervorlage</label><input class="eingabe" id="k-wv" type="date" data-pfeld="wiedervorlage" value="${esc(p.wiedervorlage)}"></div>
        <div class="feld"><label for="k-wvn">Worum geht's</label><input class="eingabe" id="k-wvn" data-pfeld="wiedervorlageNotiz" value="${esc(p.wiedervorlageNotiz)}"></div>
        <div class="feld breit"><label for="k-notiz">Notizen</label><textarea class="eingabe" id="k-notiz" data-pfeld="notiz" rows="4">${esc(p.notiz)}</textarea></div>
      </div>${istGF() ? `<button class="btn still gefahr klein" data-aktion="loeschen">Projekt löschen</button>` : ""}`;
    } else if (t === "termine") {
      inhalt = TERMINE.map((d) => `<div class="termin-zeile"><span>${esc(d.label)}</span><input class="eingabe" type="${d.typ}" data-termin="${d.key}" value="${esc((p.termine || {})[d.key] || "")}" aria-label="${esc(d.label)}"></div>`).join("");
    } else {
      inhalt = `<ul class="verlauf">${(p.verlauf || []).map((v) => { const d = new Date(v.ts); return `<li><time>${fKurz(d)} ${fUhr(d)}</time><span>${esc(v.text)}</span></li>`; }).join("")}</ul>`;
    }
    return `<div class="panel akte-panel"><div class="tabs" role="tablist">${tabs.map(([id, l]) => `<button role="tab" aria-selected="${t === id}" class="tab${t === id ? " an" : ""}" data-aktion="akte-tab" data-tab="${id}">${l}${id === "dateien" && dateienVon(p.id).length ? ` <small>${dateienVon(p.id).length}</small>` : ""}</button>`).join("")}</div>
      <div class="akte-inhalt">${inhalt}</div></div>`;
  }

  function teilRendern(p) {
    const nr = S.ansicht[p.id] || p.phase;
    const m = $("#mission"); if (m) m.innerHTML = mission(p, nr);
    const k = $(".karte"); if (k) k.innerHTML = levelKarte(p, nr);
    const a = $("#akte"); if (a && !a.contains(document.activeElement)) a.innerHTML = akte(p);
    vorschauenLaden();
  }
  function kopfNeu(p) { const k = $(".p-kopf"); if (k) k.outerHTML = projektKopf(p); }

  /* ================================================================
     Formular-Seite
     ================================================================ */
  function ansichtFormular(pid, fid) {
    const p = finde(pid), d = Formular.def(fid);
    if (!p || !d) return `<div class="seite"><a class="btn" href="#/projekte">← zurück</a></div>`;
    const lesen = !darfFormular(fid);
    if (!lesen && Formular.vorbelegen(fid, p)) speichern(p);
    const st = Formular.status(fid, p, dateienVon(p.id));
    return `<div class="seite formularseite${lesen ? " nur-lesen" : ""}" data-projekt="${p.id}" data-formular="${fid}">
      <header class="f-kopf panel">
        <a class="btn still" href="#/projekt/${p.id}">← ${esc(anzeigeName(p))}</a>
        <div class="f-titel"><p class="eyebrow">${lesen ? "Formular · nur ansehen" : "Formular · wird automatisch gespeichert"}</p><h1>${esc(d.titel)}</h1></div>
        <div class="f-status" id="f-status">${formularStatusHtml(st)}</div>
        <div class="kopf-aktionen">${d.vorlage ? `<a class="btn still" href="${esc(d.vorlage)}" target="_blank" rel="noopener" title="Original-Vorlage">Papiervorlage</a>` : ""}
          ${fid === "abnahme" && !lesen ? `<button class="btn" data-aktion="maengel">Mängel → Restarbeiten</button>` : ""}
          <button class="btn" data-aktion="drucken" data-formular="${fid}">Drucken / PDF</button>
          ${lesen ? `<a class="btn voll" href="#/projekt/${p.id}">Zurück</a>` : `<button class="btn jetzt" data-aktion="formular-fertig">Fertig</button>`}</div>
      </header>
      <fieldset class="panel f-flaeche" id="f-flaeche"${lesen ? " disabled" : ""}>${Formular.editor(fid, p, { dateien: dateienVon(p.id), zeigeFehler: S.zeigeFehler, ablage: (kat, k) => ablage(p, kat, k) })}</fieldset></div>`;
  }
  const formularStatusHtml = (st) => `<span class="${st.vollstaendig ? "ok" : ""}">${st.vollstaendig ? "✓ vollständig" : `${st.ok} von ${st.gesamt} Pflichtfeldern`}</span>`;
  function formularNeuZeichnen(p, fid, ganz) {
    const st = Formular.status(fid, p, dateienVon(p.id));
    const s = $("#f-status"); if (s) s.innerHTML = formularStatusHtml(st);
    if (ganz) {
      const fl = $("#f-flaeche"); if (!fl) return;
      const y = window.scrollY;
      fl.innerHTML = Formular.editor(fid, p, { dateien: dateienVon(p.id), zeigeFehler: S.zeigeFehler, ablage: (kat, k) => ablage(p, kat, k) });
      window.scrollTo(0, y); vorschauenLaden(fl); unterschriftenAn();
    }
  }
  function formularWerte(p, fid) {
    p.formulare = p.formulare || {};
    return (p.formulare[fid] = p.formulare[fid] || { werte: {} }).werte;
  }

  /* Unterschriftenfelder */
  function unterschriftenAn() {
    $$(".sign").forEach((box) => {
      const c = $("canvas", box); if (c.dataset.an) return; c.dataset.an = 1;
      const ctx = c.getContext("2d");
      let zieht = false, last = null, gemalt = false;
      const pos = (e) => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) * (c.width / r.width), (e.clientY - r.top) * (c.height / r.height)]; };
      c.addEventListener("pointerdown", (e) => {
        zieht = true; last = pos(e); c.setPointerCapture(e.pointerId);
        const img = $("img", box); if (img) { img.remove(); ctx.clearRect(0, 0, c.width, c.height); }
        const h = $(".sign-hinweis", box); if (h) h.remove();
      });
      c.addEventListener("pointermove", (e) => {
        if (!zieht) return; const q = pos(e);
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--tinte").trim() || "#042461";
        ctx.lineWidth = 3.2; ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.beginPath(); ctx.moveTo(...last); ctx.lineTo(...q); ctx.stroke(); last = q; gemalt = true;
      });
      const ende = () => {
        if (!zieht) return; zieht = false; if (!gemalt) return;
        const seite = $(".formularseite"); const p = finde(seite.dataset.projekt); const fid = seite.dataset.formular;
        aendern(p, () => { formularWerte(p, fid)[box.dataset.sign] = c.toDataURL("image/png"); });
        box.classList.add("voll"); formularNeuZeichnen(p, fid);
      };
      c.addEventListener("pointerup", ende); c.addEventListener("pointercancel", ende);
    });
  }

  /* ================================================================
     Drucken (Formulare, Monteurmappe)
     ================================================================ */
  function druckKontext(p) {
    const c = cfg();
    return { firma: c, dateien: dateienVon(p.id), kopfzeile: `${anzeigeName(p)}${p.projektnr ? " · Projekt " + p.projektnr : ""}${p.kunde.ort ? " · " + [p.kunde.strasse, p.kunde.ort].filter(Boolean).join(", ") : ""}` };
  }
  function drucken(html) {
    $("#druck").innerHTML = html;
    const bilder = $$("#druck img");
    Promise.all(bilder.map((i) => (i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = r; })))).then(() => setTimeout(() => window.print(), 50));
  }
  async function monteurmappe(p) {
    const ctx = druckKontext(p);
    const formulare = ["projektuebersicht", "baustellenbesichtigung", "tuer", "auswahl", "fliesen", "elektro", "abriss", "baustellenplan"]
      .filter((f) => Object.keys(Formular.werteVon(p, f)).length);
    const bilder = [...dateienVon(p.id, "planung"), ...dateienVon(p.id, "skizzen")].filter(istBild);
    const urls = await Promise.all(bilder.map((d) => dateiUrl(d).catch(() => null)));
    const c = cfg(), k = p.kunde, bp = Formular.werteVon(p, "baustellenplan");
    const deckblatt = `<section class="d-seite"><header class="d-kopf"><img src="${esc(c.logo)}" alt=""><div><strong>Monteurmappe</strong><span>${esc(ctx.kopfzeile)}</span></div></header>
      <div class="d-inhalt"><h3>Baustelle</h3>
        <div class="d-zeile"><b>Kunde</b><span>${esc(anzeigeName(p))}</span></div>
        <div class="d-zeile"><b>Adresse</b><span>${esc([k.strasse, k.ort].filter(Boolean).join(", ") || "—")}</span></div>
        <div class="d-zeile"><b>Telefon</b><span>${esc([k.telefon, k.mobil].filter(Boolean).join(" · ") || "—")}</span></div>
        <div class="d-zeile"><b>Baustart</b><span>${esc(p.termine.baustart ? fDatum(datum(p.termine.baustart)) : "—")}</span></div>
        <div class="d-zeile"><b>Projektleiter</b><span>${esc(namen("projektleiter"))}</span></div>
        <div class="d-zeile"><b>Zugang</b><span>${esc(bp.schluessel || "—")}</span></div>
        <h3>Inhalt</h3><div class="d-zeile"><b>Formulare</b><span>${formulare.map((f) => esc(Formular.def(f).titel)).join(", ") || "—"}</span></div>
        <div class="d-zeile"><b>Pläne & Skizzen</b><span>${bilder.length} Bilder</span></div>
        ${bp.anschluss ? `<h3>Anschlussmaße & Hinweise</h3><p>${esc(bp.anschluss).replace(/\n/g, "<br>")}</p>` : ""}
      </div><footer class="d-fuss">${esc(c.name)} · ${esc(c.adresse.strasse)} · ${esc(c.adresse.ort)} · Tel. ${esc(c.telefon)}</footer></section>`;
    const bildSeiten = bilder.map((d, i) => urls[i] ? `<section class="d-seite d-bild"><header class="d-kopf"><img src="${esc(c.logo)}" alt=""><div><strong>${esc(katTitel(d.kategorie))}</strong><span>${esc(d.name)}</span></div></header><img class="d-gross" src="${esc(urls[i])}" alt=""></section>` : "").join("");
    drucken(deckblatt + formulare.map((f) => Formular.druck(f, p, ctx)).join("") + bildSeiten);
  }

  /* ================================================================
     Dialoge
     ================================================================ */
  function dialog(html, setup) {
    const alt = $("#dlg");
    const dlg = alt.cloneNode(false); // frisches Element = keine alten Listener
    alt.replaceWith(dlg);
    dlg.innerHTML = html;
    dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest('[data-aktion="dlg-zu"]')) dlg.close(); });
    if (setup) setup(dlg);
    dlg.showModal();
    return dlg;
  }

  function neuDialog() {
    dialog(`<form id="neu-form">
      <div class="dlg-kopf"><div><p class="eyebrow">Level 01 · Kundenanfrage</p><h2>Neue Anfrage</h2><p>Das Nötigste reicht – der Rest kommt in die Bestandsaufnahme.</p></div><button class="btn still" type="button" data-aktion="dlg-zu" aria-label="Schließen">✕</button></div>
      <div class="dlg-inhalt"><div class="felder">
        <div class="feld"><label for="n-anrede">Anrede</label><select class="eingabe" id="n-anrede" name="anrede">${opt(ANREDEN, "Herr")}</select></div>
        <div class="feld"><label for="n-vorname">Vorname</label><input class="eingabe" id="n-vorname" name="vorname"></div>
        <div class="feld"><label for="n-nachname">Nachname *</label><input class="eingabe" id="n-nachname" name="nachname" required></div>
        <div class="feld"><label for="n-tel">Telefon</label><input class="eingabe" id="n-tel" name="telefon" type="tel"></div>
        <div class="feld breit"><label for="n-mail">E-Mail</label><input class="eingabe" id="n-mail" name="email" type="email"></div>
      </div></div>
      <div class="dlg-fuss"><button class="btn" type="button" data-aktion="dlg-zu">Abbrechen</button><button class="btn jetzt" type="submit">Anlegen & Bestandsaufnahme starten <span class="pfeil">→</span></button></div></form>`, (dlg) => {
      $("#neu-form", dlg).addEventListener("submit", (e) => {
        e.preventDefault(); e.stopPropagation();
        const d = Object.fromEntries(new FormData(e.target));
        if (!d.nachname.trim()) return;
        const p = neuesProjekt({ ...d, nachname: d.nachname.trim() });
        dlg.close();
        location.hash = `#/projekt/${p.id}/formular/bestandsaufnahme`;
      });
      setTimeout(() => $("#n-vorname", dlg).focus(), 30);
    });
  }

  async function kundenLink(p) {
    const t = await Daten.uploadLink(p);
    const basis = cfg().cloud.portalUrl || new URL("kunde.html", location.href).href;
    return `${basis.replace(/#.*$/, "")}#${t}`;
  }
  async function kundenlinkDialog(p) {
    let link;
    try { link = await kundenLink(p); } catch (e) { return toast("Link konnte nicht erstellt werden", "fehler"); }
    const lokal = Daten.modus === "lokal";
    dialog(`<div class="dlg-kopf"><div><p class="eyebrow">${esc(anzeigeName(p))}</p><h2>Persönlicher Kundenlink</h2>
        <p>Über diesen Link lädt der Kunde Fotos und Unterlagen hoch – ohne Anmeldung, direkt vom Handy. Alles landet automatisch im richtigen Ordner dieses Projekts.</p></div>
        <button class="btn still" data-aktion="dlg-zu" aria-label="Schließen">✕</button></div>
      <div class="dlg-inhalt">
        <div class="link-feld"><input class="eingabe" readonly value="${esc(link)}" id="kl-link" aria-label="Kundenlink"><button class="btn voll" data-dlg="kopieren">Kopieren</button></div>
        ${lokal ? `<p class="luecken">Lokaler Modus: Der Link funktioniert nur hier in diesem Browser (zum Ausprobieren). Für echte Kunden die Cloud einrichten – siehe Einrichtung.</p>` : ""}
        <p class="anhang-info">Der Link steckt automatisch in der Terminbestätigung und in der Freigabe-Mail. Er ist 180 Tage gültig.</p>
      </div>
      <div class="dlg-fuss"><a class="btn" href="${esc(link)}" target="_blank" rel="noopener">Kundenansicht öffnen</a></div>`, (dlg) => {
      dlg.addEventListener("click", async (e) => {
        if (e.target.dataset.dlg === "kopieren") { await kopieren(link); toast("Link kopiert"); }
      });
    });
  }

  function anrede(p, stil) {
    const n = p.kunde.nachname || "‹Nachname›";
    const t = {
      formell: { "Herr": `Sehr geehrter Herr ${n},`, "Frau": `Sehr geehrte Frau ${n},`, "Herr und Frau": `Sehr geehrte Frau ${n}, sehr geehrter Herr ${n},`, "Familie": `Sehr geehrte Familie ${n},` },
      hallo: { "Herr": `Hallo Herr ${n},`, "Frau": `Hallo Frau ${n},`, "Herr und Frau": `Hallo Frau ${n}, hallo Herr ${n},`, "Familie": `Hallo Familie ${n},` },
      gutentag: { "Herr": `Guten Tag Herr ${n},`, "Frau": `Guten Tag Frau ${n},`, "Herr und Frau": `Guten Tag Frau und Herr ${n},`, "Familie": `Guten Tag liebe Familie ${n},` },
    };
    return (t[stil] || t.formell)[p.kunde.anrede] || t.formell.Herr;
  }
  function mailBauen(m, p, optionen, link) {
    const c = cfg(), luecken = [];
    let text = m.text.replace(/\[\[(\w+)\]\]([\s\S]*?)\[\[\/\1\]\]/g, (_, id, inhalt) => (optionen[id] ? inhalt : ""));
    const label = (k) => (TERMINE.find((t) => t.key === k) || {}).label || k;
    text = text.replace(/\{([a-zA-Z.]+)\}/g, (ganz, key) => {
      const fehlt = (was) => { if (!luecken.includes(was)) luecken.push(was); return `‹${was}›`; };
      if (key === "anrede") return anrede(p, m.anredeStil);
      if (key === "nachname") return p.kunde.nachname || fehlt("Nachname");
      if (key === "downloadCode") return p.downloadCode || fehlt(`${c.programme.app3d}-Code`);
      if (key === "uploadLink") return link || fehlt("Upload-Link");
      if (key === "berater") return leute("badberater")[0]?.name || fehlt("Badberater");
      if (key === "heizungsexperte") return leute("heizungsexperte")[0]?.name || fehlt("Heizungsexperte");
      if (key === "firma.name") return c.name;
      if (key === "firma.kurzname") return c.kurzname || c.name;
      if (key === "firma.adresse") return `${c.adresse.strasse}, ${c.adresse.ort}`;
      if (key === "firma.mapsLink") return c.adresse.mapsLink;
      if (key === "firma.website") return c.website;
      const [tk, teil] = key.split(".");
      if (TERMINE.some((t) => t.key === tk)) {
        const s = (p.termine || {})[tk], d = datum(s);
        if (!d) return fehlt(`Termin ${label(tk)}`);
        if (teil === "wochentag") return WT[d.getDay()];
        if (teil === "uhrzeit") return hatUhrzeit(s) ? fUhr(d) : fehlt(`Uhrzeit ${label(tk)}`);
        if (teil === "kurz") return fKurz(d);
        return fDatum(d);
      }
      return ganz;
    });
    return { text: text.replace(/\n{3,}/g, "\n\n"), luecken };
  }
  async function mailDialog(mailId, p) {
    const m = window.MAILVORLAGEN.find((x) => x.id === mailId);
    const optionen = {};
    let link = null;
    if (/\{uploadLink\}/.test(m.text)) { try { link = await kundenLink(p); } catch (e) { /* Lücke */ } }
    const mailto = (dlg) => `mailto:${encodeURIComponent(p.kunde.email || "")}?subject=${encodeURIComponent($("#mail-betreff", dlg).value)}&body=${encodeURIComponent($("#mail-text", dlg).value)}`;
    const zeichnen = (dlg) => {
      const { text, luecken } = mailBauen(m, p, optionen, link);
      dlg.innerHTML = `<div class="dlg-kopf"><div><p class="eyebrow">Level ${zwei(m.phase)} · ${esc(anzeigeName(p))}</p><h2>${esc(m.titel)}</h2>
          <p>${p.kunde.email ? `An: ${esc(p.kunde.email)}` : "Beim Kunden ist noch keine E-Mail-Adresse hinterlegt."}</p></div><button class="btn still" data-aktion="dlg-zu" aria-label="Schließen">✕</button></div>
        <div class="dlg-inhalt">
          ${m.optionen.length ? `<div class="optionen">${m.optionen.map((o) => `<label><input type="checkbox" data-option="${o.id}"${optionen[o.id] ? " checked" : ""}> ${esc(o.label)}</label>`).join("")}</div>` : ""}
          ${luecken.length ? `<div class="luecken">Noch offen: ${luecken.map(esc).join(", ")} – im Projekt nachtragen oder im Text ersetzen.</div>` : ""}
          <div class="feld"><label for="mail-betreff">Betreff</label><input class="eingabe" id="mail-betreff" value="${esc(m.betreff)}"></div>
          <div class="feld abstand-o"><label for="mail-text">Text</label><textarea class="eingabe mail-text" id="mail-text">${esc(text)}</textarea></div>
          <p class="anhang-info">Anhänge: ${m.anhangDateien ? m.anhangDateien.map((f, i) => `<a href="${esc(f)}" download>${esc(m.anhaenge[i] || f.split("/").pop())}</a>`).join(", ") : m.anhaenge.map(esc).join(", ") || "keine"} · Absender: ${esc(cfg().kundenPostfach)}</p></div>
        <div class="dlg-fuss"><a class="btn links" href="${esc(m.datei)}">Outlook-Vorlage</a><button class="btn" data-dlg="kopieren">Text kopieren</button>
          <a class="btn" data-dlg="mailto" href="#">Im Mailprogramm öffnen</a><button class="btn jetzt" data-dlg="gesendet">Als gesendet markieren</button></div>`;
      $('[data-dlg="mailto"]', dlg).href = mailto(dlg);
    };
    dialog("", (dlg) => {
      zeichnen(dlg);
      dlg.addEventListener("click", async (e) => {
        const a = e.target.closest("[data-dlg]"); if (!a) return;
        if (a.dataset.dlg === "kopieren") { await kopieren($("#mail-text", dlg).value); toast("Text kopiert"); }
        if (a.dataset.dlg === "mailto") a.href = mailto(dlg);
        if (a.dataset.dlg === "gesendet") {
          aendern(p, (x) => { x.mails = x.mails || {}; x.mails[m.id] = Date.now(); }, `Mail „${m.titel}“ gesendet`);
          dlg.close(); toast("Als gesendet vermerkt"); teilRendern(p);
        }
      });
      dlg.addEventListener("change", (e) => { const o = e.target.dataset.option; if (o) { optionen[o] = e.target.checked; zeichnen(dlg); } });
      dlg.addEventListener("input", (e) => { if (e.target.id === "mail-text" || e.target.id === "mail-betreff") $('[data-dlg="mailto"]', dlg).href = mailto(dlg); });
    });
  }

  async function dateiDialog(d) {
    const p = finde(d.projekt_id);
    let url; try { url = await dateiUrl(d); } catch (e) { return toast("Datei nicht erreichbar", "fehler"); }
    const pdf = /pdf/i.test(d.typ || d.name);
    dialog(`<div class="dlg-kopf"><div><p class="eyebrow">${esc(katTitel(d.kategorie))}${d.quelle === "kunde" ? " · vom Kunden" : ""}</p><h2>${esc(d.name)}</h2><p>${groesse(d.groesse || 0)} · ${esc(new Date(d.am).toLocaleString("de-DE"))}</p></div><button class="btn still" data-aktion="dlg-zu" aria-label="Schließen">✕</button></div>
      <div class="dlg-inhalt vorschau">${istBild(d) ? `<img src="${esc(url)}" alt="">` : pdf ? `<iframe src="${esc(url)}" title="${esc(d.name)}"></iframe>` : `<p>Keine Vorschau – bitte herunterladen.</p>`}</div>
      <div class="dlg-fuss"><button class="btn still gefahr links" data-dlg="loeschen">Löschen</button>
        <select class="eingabe auto" data-dlg-kat aria-label="In Ordner verschieben">${KAT.map((k) => `<option value="${k.id}"${k.id === d.kategorie ? " selected" : ""}>${esc(k.titel)}</option>`).join("")}</select>
        <a class="btn" href="${esc(url)}" download="${esc(d.name)}" target="_blank" rel="noopener">Herunterladen</a></div>`, (dlg) => {
      dlg.addEventListener("click", async (e) => {
        if (e.target.dataset.dlg !== "loeschen" || !confirm(`„${d.name}“ löschen?`)) return;
        await Daten.dateiLoeschen(d);
        S.dateien = S.dateien.filter((x) => x.id !== d.id);
        aendern(p, () => {}, `Datei gelöscht: ${d.name}`);
        dlg.close(); allesNeu();
      });
      dlg.addEventListener("change", async (e) => {
        if (!e.target.matches("[data-dlg-kat]")) return;
        try { await Daten.dateiVerschieben(d, e.target.value); toast(`Verschoben nach „${katTitel(d.kategorie)}“`); allesNeu(); }
        catch (err) { toast("Verschieben fehlgeschlagen", "fehler"); }
      });
    });
  }

  /* Level geschafft */
  function levelUp(nr) {
    const el = $("#levelup");
    el.innerHTML = nr ? `<span class="lu-nr">${zwei(nr)}</span><span><small>Level freigeschaltet</small><b>${esc(phase(nr).titel)}</b></span>` : `<span class="lu-nr">✓</span><span><small>Geschafft</small><b>Projekt abgeschlossen</b></span>`;
    el.classList.remove("an"); void el.offsetWidth; el.classList.add("an");
    setTimeout(() => el.classList.remove("an"), 2600);
  }

  /* ================================================================
     Einrichtung
     ================================================================ */
  function ansichtEinrichtung() {
    const c = cfg();
    const f = (pfad, label, wert, typ = "text") => `<div class="feld"><label for="c-${pfad}">${label}</label><input class="eingabe" id="c-${pfad}" type="${typ}" data-cfg="${pfad}" value="${esc(wert)}"></div>`;
    const rollen = [...new Set([...window.FIRMA.team.map((t) => t.rolle), ...c.team.map((t) => t.rolle)])];
    const demo = alle().some((p) => p.demo);
    const cloud = Daten.modus === "cloud";
    return `<div class="seite">
      <header class="kopf"><div><p class="eyebrow">Einrichtung</p><h1>Firma & Team</h1></div>
        <div class="kopf-aktionen"><button class="btn jetzt" data-aktion="cfg-speichern">Übernehmen</button></div></header>
      <div class="einr">
        <section class="panel"><h3>Betriebsart: ${cloud ? "Cloud" : "Lokal"}</h3>
          <p class="leise">${cloud ? `Verbunden mit <b>${esc(c.cloud.url)}</b>${Daten.nutzer ? ` als <b>${esc(Daten.nutzer)}</b>` : ""}. Projekte, Dateien und Kunden-Uploads liegen in der Cloud – für alle im Team gleich.`
            : "Projekte und Dateien liegen nur in diesem Browser. Zum Ausprobieren ideal; für mehrere Arbeitsplätze und echte Kunden-Links die Cloud einrichten: Anleitung in <code>supabase/ANLEITUNG-CLOUD.md</code>, Zugangsdaten in <code>einstellungen/firma.js</code> unter <code>cloud</code>."}</p>
          <div class="aktionen">
            ${cloud ? `<button class="btn" data-aktion="abmelden">Abmelden</button>` : ""}
            ${cloud && !(window.FIRMA.cloud || {}).url ? `<button class="btn still gefahr" data-aktion="cloud-trennen">Cloud trennen</button>` : ""}
            <button class="btn" data-aktion="export">Projekte sichern (JSON)</button>
            <label class="btn">Sicherung einspielen<input type="file" accept=".json,application/json" data-aktion="import" hidden></label>
            ${demo ? `<button class="btn still gefahr" data-aktion="demo-weg">Beispielprojekte entfernen</button>` : `<button class="btn still" data-aktion="demo">Beispielprojekte laden</button>`}
          </div></section>
        ${cloud ? "" : `<section class="panel"><h3>Cloud verbinden</h3>
          <p class="leise">Zugangsdaten aus dem Supabase-Projekt (Project Settings → API). Sie werden nur in diesem Browser gespeichert; für alle Arbeitsplätze und das Kundenportal gehören sie in <code>einstellungen/firma.js</code>.</p>
          <div class="felder drei">
            <div class="feld"><label for="cl-url">Project URL</label><input class="eingabe" id="cl-url" placeholder="https://xxxx.supabase.co"></div>
            <div class="feld"><label for="cl-key">anon / publishable key</label><input class="eingabe" id="cl-key"></div>
            <div class="feld"><label for="cl-portal">Adresse des Kundenportals</label><input class="eingabe" id="cl-portal" placeholder="https://…/kunde.html"></div>
          </div><div class="aktionen"><button class="btn voll" data-aktion="cloud-verbinden">Verbinden</button></div></section>`}
        <section class="panel"><h3>Firma</h3><div class="felder drei">
          ${f("name", "Firmenname", c.name)}${f("kurzname", "Kurzname (in Mails)", c.kurzname)}${f("bereich", "Untertitel", c.bereich)}
          ${f("adresse.strasse", "Straße", c.adresse.strasse)}${f("adresse.ort", "PLZ & Ort", c.adresse.ort)}${f("adresse.mapsLink", "Google-Maps-Link", c.adresse.mapsLink, "url")}
          ${f("telefon", "Telefon", c.telefon)}${f("email", "E-Mail", c.email, "email")}${f("website", "Website", c.website)}
          ${f("kundenPostfach", "Postfach für Kundenmails", c.kundenPostfach, "email")}${f("logo", "Logo-Datei", c.logo)}
        </div></section>
        <section class="panel"><h3>Farben</h3><div class="felder drei">
          <div class="feld"><span class="lab">Grundfarbe</span><div class="farbe"><input type="color" data-cfg="farben.tinte" value="${esc(c.farben.tinte)}" aria-label="Grundfarbe"><code>${esc(c.farben.tinte)}</code></div></div>
          <div class="feld"><span class="lab">Akzent („jetzt dran“)</span><div class="farbe"><input type="color" data-cfg="farben.akzent" value="${esc(c.farben.akzent)}" aria-label="Akzentfarbe"><code>${esc(c.farben.akzent)}</code></div></div>
        </div></section>
        <section class="panel"><h3>Ebenen & Rechte</h3><p class="leise">Jede Person im Team und jeder Partner bekommt eine Ebene. ${cloud ? "In der Cloud erzwingt die Datenbank diese Rechte." : "Lokal lässt sich jede Ebene links unten über „Ansicht als“ ausprobieren."}</p>
          <div class="ebenen">${(window.EBENEN || []).map((e) => `<div class="ebene"><b>${esc(e.titel)}</b><ul>${e.kann.map((k) => `<li>${esc(k)}</li>`).join("")}</ul></div>`).join("")}</div></section>
        <section class="panel"><h3>Team</h3><p class="leise">Rolle = wer in den Schritten genannt wird. Ebene = was die Person darf. Login-E-Mail nur für den Cloud-Betrieb.</p>
          <div class="tab-wrap"><table class="team-tabelle"><thead><tr><th>Rolle</th><th>Bezeichnung</th><th>Name</th><th>Kürzel</th><th>Ebene</th><th>Login-E-Mail</th><th></th></tr></thead>
          <tbody id="team">${c.team.map((m) => teamZeile(m, rollen)).join("")}</tbody></table></div>
          <div class="aktionen"><button class="btn klein" data-aktion="team-neu">+ Person</button></div></section>
        <section class="panel"><h3>Externe Partner</h3><p class="leise">Subunternehmer sehen nur Projekte, denen sie zugewiesen sind – und davon nur Adresse, Termine, Pläne und die Formulare ihres Gewerks.</p>
          <div class="tab-wrap"><table class="team-tabelle"><thead><tr><th>Firma</th><th>Gewerk</th><th>Ansprechpartner</th><th>Telefon</th><th>Login-E-Mail</th><th></th></tr></thead>
          <tbody id="partner">${(c.partner || []).map((x) => partnerZeile(x)).join("")}</tbody></table></div>
          <div class="aktionen"><button class="btn klein" data-aktion="partner-neu">+ Partner</button></div></section>
        <section class="panel"><h3>Programme</h3><div class="felder drei">
          ${Object.entries(c.programme).map(([k, v]) => f("programme." + k, { erp: "Warenwirtschaft / ERP", cad: "Badplanung (CAD)", app3d: "3D-App für Kunden", badrechner: "Kostenrechner" }[k] || k, v)).join("")}
        </div></section>
        <section class="panel"><h3>Fristen (Tage)</h3><div class="felder drei">
          ${f("fristen.erinnerungVorErstgespraech", "Fotos fehlen – Tage vor Erstgespräch", c.fristen.erinnerungVorErstgespraech, "number")}
          ${f("fristen.angebotsverfolgung", "Angebotsverfolgung – Tage nach Besprechung", c.fristen.angebotsverfolgung, "number")}
          ${f("fristen.freigabeNachMaterialauswahl", "Freigabe – Tage nach Materialauswahl", c.fristen.freigabeNachMaterialauswahl, "number")}
          ${f("fristen.kundenerinnerungVorBaustart", "Kundenerinnerung – Tage vor Baustart", c.fristen.kundenerinnerungVorBaustart, "number")}
        </div></section>
        <section class="panel"><h3>Für eine andere Firma übernehmen</h3>
          <p class="leise">Einstellungen übernehmen, dann als <code>firma.js</code> herunterladen und im Ordner <code>einstellungen/</code> ersetzen. Level, Formulare und Mailtexte stehen in <code>ablauf.js</code>, <code>formulare.js</code> und <code>mailvorlagen.js</code> – siehe <code>ANLEITUNG.md</code>.</p>
          <div class="aktionen"><button class="btn" data-aktion="cfg-datei">firma.js herunterladen</button><button class="btn still gefahr" data-aktion="cfg-reset">Auf firma.js zurücksetzen</button></div></section>
      </div></div>`;
  }
  const EBENE_OPT = () => (window.EBENEN || []).filter((e) => e.id !== "partner").map((e) => ({ id: e.id, label: e.titel }));
  const teamZeile = (m, rollen) => `<tr><td><select class="eingabe" data-team="rolle">${opt(rollen, m.rolle)}</select></td><td><input class="eingabe" data-team="bezeichnung" value="${esc(m.bezeichnung || "")}"></td><td><input class="eingabe" data-team="name" value="${esc(m.name || "")}"></td><td><input class="eingabe kurz" data-team="kuerzel" value="${esc(m.kuerzel || "")}"></td>
    <td><select class="eingabe" data-team="ebene">${opt(EBENE_OPT(), m.ebene || "planung")}</select></td><td><input class="eingabe" type="email" data-team="email" value="${esc(m.email || "")}" placeholder="nur Cloud"></td><td><button class="btn still" data-aktion="team-weg" aria-label="Entfernen">✕</button></td></tr>`;
  const partnerZeile = (x) => `<tr data-id="${esc(x.id || "")}"><td><input class="eingabe" data-partner="firma" value="${esc(x.firma || "")}"></td><td><select class="eingabe" data-partner="gewerk">${opt(Object.keys(cfg().gewerke || {}), x.gewerk)}</select></td>
    <td><input class="eingabe" data-partner="name" value="${esc(x.name || "")}"></td><td><input class="eingabe" data-partner="telefon" value="${esc(x.telefon || "")}"></td><td><input class="eingabe" type="email" data-partner="email" value="${esc(x.email || "")}" placeholder="nur Cloud"></td><td><button class="btn still" data-aktion="team-weg" aria-label="Entfernen">✕</button></td></tr>`;
  const slug = (t) => t.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "partner";
  function cfgSammeln() {
    const c = JSON.parse(JSON.stringify(cfg()));
    for (const el of $$("[data-cfg]")) {
      const pfad = el.dataset.cfg.split(".");
      let ziel = c; while (pfad.length > 1) ziel = ziel[pfad.shift()];
      ziel[pfad[0]] = el.type === "number" ? Number(el.value) || 0 : el.value.trim();
    }
    c.team = $$("#team tr").map((tr) => Object.fromEntries($$("[data-team]", tr).map((el) => [el.dataset.team, el.value.trim()]))).filter((m) => m.name || m.kuerzel);
    const ids = new Set();
    c.partner = $$("#partner tr").map((tr) => {
      const x = Object.fromEntries($$("[data-partner]", tr).map((el) => [el.dataset.partner, el.value.trim()]));
      let id = tr.dataset.id || "p-" + slug(x.firma || "");
      while (ids.has(id)) id += "-2";
      ids.add(id); return { id, ...x };
    }).filter((x) => x.firma);
    delete c.cloud;
    return c;
  }

  /* ---------- Beispielprojekte ---------- */
  function demoLaden() {
    const t = (n, h) => { const d = plusTage(new Date(), n); return h ? `${isoTag(d)}T${h}` : isoTag(d); };
    const pl = leute("badplanung").map((m) => m.kuerzel);
    const mk = (kunde, ph, extra) => neuesProjekt(kunde, { demo: true, phase: ph, ...extra });
    mk({ anrede: "Familie", nachname: "Beispiel", ort: "71134 Aidlingen", strasse: "Lindenweg 4", telefon: "07031 000000", email: "familie@beispiel.de" }, 1, {});
    mk({ anrede: "Frau", vorname: "Anna", nachname: "Muster", ort: "71083 Herrenberg", strasse: "Hauptstr. 12", email: "anna@beispiel.de" }, 2,
      { zustaendig: pl[1] || "", termine: { erstgespraech: t(2, "10:00") }, schritte: { "2:kwp-kunde": { erledigt: true, am: Date.now() } } });
    mk({ anrede: "Herr und Frau", nachname: "Probst", ort: "71032 Böblingen", strasse: "Am Wald 3", email: "probst@beispiel.de" }, 5,
      { zustaendig: pl[0] || "", projektnr: "B-2026-027", termine: { erstgespraech: t(-30, "10:00"), angebotsbesprechung: t(-9, "15:00") } });
    mk({ anrede: "Herr", vorname: "Jonas", nachname: "Vorlage", ort: "71101 Schönaich", strasse: "Gartenstr. 8", email: "jonas@beispiel.de" }, 7,
      { zustaendig: pl[1] || "", projektnr: "B-2026-019", termine: { baustellenbesichtigung: t(-12, "08:30"), materialauswahl: t(-4, "10:00") },
        formulare: { projektuebersicht: { werte: { abriss: "ja", abrissWer: "Brüll", elektriker: "ja", fliesen: "ja", fliesenWo: ["Wand", "Boden"], decke: ["Spanndecke"], fenster: "nein", tuer: "nein" } } } });
    const mo = monteure().map((m) => m.kuerzel), pa = (cfg().partner || []).map((x) => x.id);
    mk({ anrede: "Familie", nachname: "Testfeld", ort: "71093 Weil im Schönbuch", strasse: "Schulstr. 1", email: "testfeld@beispiel.de", telefon: "07157 000000" }, 11,
      { zustaendig: pl[0] || "", projektnr: "B-2026-011", termine: { baustart: t(5), abnahme: t(16, "10:00") }, zugriff: [...mo.slice(0, 1), ...pa],
        notiz: "Interne Notiz: Kunde zahlt in zwei Raten.",
        formulare: { projektuebersicht: { werte: { abriss: "ja", elektriker: "ja", fliesen: "ja", fliesenWo: ["Wand", "Boden"], decke: ["Streichen"], fenster: "nein", tuer: "nein", licht: "2 Deckenspots über der Dusche, Spiegelbeleuchtung" } },
          elektro: { werte: { firma: "Elektro-Partner", posten: [{ jn: "ja", wo: "Unterverteilung Flur" }, { jn: "ja", wo: "Decke über Dusche", anzahl: "2" }] } },
          fliesen: { werte: { firma: "Fliesen-Partner", flaechen: [{ menge: "24 m²", groesse: "60×120", verlegeart: "Halbverband", bez: "Feinsteinzeug Sand" }, { menge: "6 m²", groesse: "60×60", verlegeart: "Kreuzfuge", bez: "Feinsteinzeug Anthrazit" }] } } } });
  }

  const keinZugang = () => `<div class="login"><div class="panel login-karte"><h1>Noch kein Zugang</h1><p>Du bist als <b>${esc(Daten.nutzer || "")}</b> angemeldet, aber noch keiner Ebene zugeordnet. Die Geschäftsführung trägt dich unter Einrichtung → Team bzw. Externe Partner mit dieser E-Mail ein.</p><button class="btn" data-aktion="abmelden">Abmelden</button></div></div>`;

  /* ================================================================
     Login (Cloud)
     ================================================================ */
  function ansichtLogin(fehler) {
    return `<div class="login"><form class="panel login-karte" id="login-form">
      <img src="${esc(cfg().logo)}" alt="" class="login-logo"><h1>${esc(cfg().name)}</h1><p class="leise">Bad-Dashboard · Anmeldung</p>
      ${fehler ? `<p class="luecken">${esc(fehler)}</p>` : ""}
      <div class="feld"><label for="l-mail">E-Mail</label><input class="eingabe" id="l-mail" type="email" autocomplete="username" required></div>
      <div class="feld"><label for="l-pw">Passwort</label><input class="eingabe" id="l-pw" type="password" autocomplete="current-password" required></div>
      <button class="btn jetzt gross" type="submit">Anmelden</button></form></div>`;
  }

  /* ================================================================
     Router & Rendern
     ================================================================ */
  function route() {
    const [pfad, query] = location.hash.replace(/^#\/?/, "").split("?");
    const teile = (pfad || "cockpit").split("/");
    return { name: teile[0], arg: teile[1], sub: teile[2], subArg: teile[3], query: new URLSearchParams(query || "") };
  }
  function render() {
    anwenden();
    const r = route();
    if (r.name === "projekte" && r.query.get("abschnitt")) { S.filter.abschnitt = r.query.get("abschnitt"); S.filter.status = "offen"; }
    const e = ebene();
    const html =
      e === "partner" ? (r.name === "projekt" ? ansichtEinsatz(r.arg) : ansichtEinsaetze()) :
      r.name === "projekt" && r.sub === "formular" ? ansichtFormular(r.arg, r.subArg) :
      r.name === "projekt" ? ansichtProjekt(r.arg) :
      e === "monteur" ? ansichtBaustellen() :
      r.name === "projekte" ? ansichtProjekte() :
      r.name === "einrichtung" && istGF() ? ansichtEinrichtung() : ansichtCockpit();
    $("#main").innerHTML = html;
    navRendern();
    const nav = r.name === "projekt" ? (istBuero() ? "projekte" : "cockpit") : r.name === "einrichtung" || r.name === "projekte" ? r.name : "cockpit";
    $$(".nav a").forEach((a) => (a.dataset.nav === nav ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
    statusLeiste();
    vorschauenLaden();
    unterschriftenAn();
    if (r.name === "projekt" && !r.sub && istBuero()) gesehenMarkieren(r.arg);
  }
  function navRendern() {
    const e = ebene();
    const punkte = e === "partner" ? [["cockpit", "Meine Einsätze", "projekte"]]
      : e === "monteur" ? [["cockpit", "Meine Baustellen", "projekte"]]
      : [["cockpit", "Cockpit", "cockpit"], ["projekte", "Projekte", "projekte"], ...(istGF() ? [["einrichtung", "Einrichtung", "einrichtung"]] : [])];
    $(".nav").innerHTML = punkte.map(([id, l, i]) => `<a href="#/${id}" data-nav="${id}"><span class="nav-i i-${i}" aria-hidden="true"></span>${l}</a>`).join("");
    $(".neu-knopf").hidden = !istBuero();
  }
  function allesNeu() {
    const r = route();
    if (r.name === "projekt" && r.sub === "formular") { const p = finde(r.arg); if (p) return formularNeuZeichnen(p, r.subArg, true); }
    if (r.name === "projekt" && !r.sub && ebene() !== "partner") { const p = finde(r.arg); if (p) { kopfNeu(p); return teilRendern(p); } }
    render();
  }
  function statusLeiste() {
    const el = $("#speicher"); if (!el) return;
    const wer = S.ich ? `<b>${esc(S.ich.name)}</b><br><small>${esc(EBENE_TITEL[S.ich.ebene] || "")}</small>` : "";
    if (Daten.modus === "cloud") {
      el.innerHTML = `${wer}<p class="sp-zeile"><span class="punkt an"></span>Cloud verbunden</p><button class="btn klein hell" data-aktion="abmelden">Abmelden</button>`;
      return;
    }
    const c = cfg();
    el.innerHTML = `<label class="ansicht-als">Ansicht als (zum Testen)<select class="eingabe" data-aktion="ansicht-als" aria-label="Ansicht als">
        <optgroup label="Team">${c.team.filter((m) => m.name).map((m) => `<option value="${esc(m.kuerzel)}"${S.ich && S.ich.id === m.kuerzel ? " selected" : ""}>${esc(m.name)} · ${esc(EBENE_TITEL[m.ebene] || "")}</option>`).join("")}</optgroup>
        <optgroup label="Externe Partner">${(c.partner || []).map((x) => `<option value="${esc(x.id)}"${S.ich && S.ich.id === x.id ? " selected" : ""}>${esc(x.firma)}</option>`).join("")}</optgroup></select></label>
      <p class="sp-zeile"><span class="punkt"></span>Lokal – nur dieser Browser</p>${istGF() ? `<a href="#/einrichtung">Cloud einrichten →</a>` : ""}`;
  }
  /* „neu vom Kunden“ wird beim Öffnen als gesehen gespeichert, bleibt aber bis zum nächsten Laden hervorgehoben */
  async function gesehenMarkieren(pid) {
    if (!S.dateien.some((d) => d.projekt_id === pid && d.neu)) return;
    try { await Daten.gesehen(pid); } catch (e) { /* später erneut */ }
  }

  /* ---------- Hochladen ---------- */
  async function hochladen(p, kat, files) {
    files = [...files]; if (!files.length) return;
    $$(`[data-ablage="${kat}"] .drop`).forEach((z) => z.classList.add("laedt"));
    let ok = 0;
    for (const f of files) {
      if (f.size > 50e6) { toast(`${f.name} ist größer als 50 MB`, "fehler"); continue; }
      try { const d = await Daten.hochladen(p.id, kat, f, ebene() === "partner" ? "partner" : "team"); S.dateien.push(d); ok++; }
      catch (e) { toast(`Upload fehlgeschlagen: ${f.name}`, "fehler"); }
    }
    if (ok) { aendern(p, () => {}, `${ok} ${ok === 1 ? "Datei" : "Dateien"} in „${katTitel(kat)}“ abgelegt`); toast(`${ok} ${ok === 1 ? "Datei" : "Dateien"} abgelegt`); }
    allesNeu();
  }

  /* ================================================================
     Ereignisse
     ================================================================ */
  const aktuellesProjekt = () => { const el = $("#main [data-projekt]"); return el ? finde(el.dataset.projekt) : null; };
  const schrittTitel = (key) => { const [nr, id] = key.split(":"); return (phase(Number(nr)).schritte.find((s) => s.id === id) || {}).titel || id; };

  document.addEventListener("click", async (e) => {
    const a = e.target.closest("[data-aktion]");
    if (!a || a.closest("dialog")) return;
    const akt = a.dataset.aktion;
    const p = aktuellesProjekt();

    if (akt === "neu") return istBuero() ? neuDialog() : null;
    if (akt === "nur-meine") { S.nurMeine = a.dataset.wert === "1"; return render(); }
    if (akt === "zuweisen" && p && istBuero()) {
      const id = a.dataset.id, m = mitgliedZu(id);
      aendern(p, (x) => { const z = new Set(x.zugriff || []); z.has(id) ? z.delete(id) : z.add(id); x.zugriff = [...z]; }, `${(p.zugriff || []).includes(id) ? "Entfernt" : "Zugewiesen"}: ${m ? m.name : id}`);
      $("#akte").innerHTML = akte(p); return teilRendern(p);
    }
    if (akt === "melden" && p && ebene() === "partner") {
      const erledigt = a.dataset.erledigt === "1", notiz = ($("#meldung-text") || {}).value || "";
      if (!erledigt && !notiz.trim()) return toast("Bitte einen Hinweis eintragen", "fehler");
      try {
        if (Daten.modus === "cloud") await Daten.partnerMelden(p.id, erledigt, notiz.trim());
        else {
          const v = S.voll.find((x) => x.id === p.id);
          v.partnerStatus = { ...(v.partnerStatus || {}), [S.ich.id]: { erledigt, notiz: notiz.trim(), am: Date.now() } };
          v.verlauf = [{ ts: Date.now(), text: `${S.ich.name}: ${erledigt ? "Gewerk erledigt" : "Rückmeldung"}${notiz.trim() ? " – " + notiz.trim() : ""}` }, ...(v.verlauf || [])];
          v.geaendert = Date.now();
          await Daten.projektSpeichern(null, S.voll);
        }
        p.meldung = { erledigt, notiz: notiz.trim(), am: Date.now() };
        toast(erledigt ? "Erledigt gemeldet – danke!" : "Hinweis gesendet"); return render();
      } catch (err) { return toast("Senden fehlgeschlagen", "fehler"); }
    }
    if (akt === "partner-neu") { $("#partner").insertAdjacentHTML("beforeend", partnerZeile({ gewerk: Object.keys(cfg().gewerke || {})[0] })); return; }
    if (akt === "neu-laden") return location.reload();
    if (akt === "kundenlink" && p) return kundenlinkDialog(p);
    if (akt === "mappe") { const q = a.dataset.id ? finde(a.dataset.id) : p; if (q) monteurmappe(q); return; }
    if (akt === "mail" && p) return mailDialog(a.dataset.mail, p);
    if (akt === "datei") { const d = S.dateien.find((x) => x.id === a.dataset.datei); if (d) dateiDialog(d); return; }
    if (akt === "drucken" && p) return drucken(Formular.druck(a.dataset.formular, p, druckKontext(p)));
    if (akt === "demo") { demoLaden(); toast("Beispielprojekte geladen"); location.hash = "#/cockpit"; return render(); }
    if (akt === "demo-weg") {
      if (!confirm("Alle Beispielprojekte entfernen?")) return;
      alle().filter((x) => x.demo).forEach((x) => aendern(x, (y) => { y.geloescht = true; }));
      toast("Beispiele entfernt"); return render();
    }
    if (akt === "level" && p) {
      const nr = Number(a.dataset.nr);
      if (nr > p.phase) { const li = a.closest(".lv"); li.classList.remove("wackeln"); void li.offsetWidth; li.classList.add("wackeln"); return toast(`Gesperrt – erst Level ${zwei(p.phase)} abschließen`); }
      S.ansicht[p.id] = nr; return teilRendern(p);
    }
    if (akt === "abschliessen" && p) {
      if (!phaseStatus(p, p.phase).komplett) return;
      const n = naechsteNr(p.phase);
      if (n) aendern(p, (x) => { x.phase = n; }, `Level ${zwei(n)} „${phase(n).titel}“ freigeschaltet`);
      else aendern(p, (x) => { x.status = "abgeschlossen"; }, "Projekt abgeschlossen & archiviert");
      S.ansicht[p.id] = p.phase; levelUp(n);
      kopfNeu(p); teilRendern(p); window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (akt === "bestaetigen" && p) {
      const key = a.dataset.key; const an = !((p.schritte || {})[key] || {}).erledigt;
      aendern(p, (x) => { x.schritte = x.schritte || {}; x.schritte[key] = an ? { erledigt: true, am: Date.now(), von: Daten.nutzer || "" } : {}; }, an ? `Erledigt: ${ersetzen(schrittTitel(key))}` : null);
      return teilRendern(p);
    }
    if (akt === "wahl" && p) {
      const nr = Number(a.dataset.nr), s = phase(nr).schritte.find((x) => x.id === a.dataset.schritt), o = s.optionen.find((x) => x.id === a.dataset.wert);
      aendern(p, (x) => {
        x.schritte = x.schritte || {}; x.schritte[a.dataset.key] = { wahl: o.id, am: Date.now() };
        if (o.status) x.status = o.status; else if (x.status !== "aktiv" && x.status !== "abgeschlossen") x.status = "aktiv";
        if (o.wiedervorlage) { x.wiedervorlage = isoTag(plusTage(new Date(), o.wiedervorlage)); x.wiedervorlageNotiz = `${ersetzen(s.titel)} – nachfassen`; }
      }, `${ersetzen(s.titel)}: ${ersetzen(o.label)}`);
      if (o.status === "verloren") toast("Projekt als abgesagt markiert");
      else if (o.wiedervorlage) toast(`Wiedervorlage in ${o.wiedervorlage} Tagen gesetzt`);
      kopfNeu(p); return teilRendern(p);
    }
    if (akt === "setze-feld" && p) { aendern(p, (x) => { x[a.dataset.feld] = a.dataset.wert; }, `Zuständig: ${a.dataset.wert}`); kopfNeu(p); return teilRendern(p); }
    if (akt === "ersatz" && p) { aendern(p, (x) => { x.schritte = x.schritte || {}; x.schritte[a.dataset.key] = { ersatz: a.dataset.text, am: Date.now() }; }, `Abgehakt: ${a.dataset.text}`); return teilRendern(p); }
    if (akt === "ersatz-weg" && p) { aendern(p, (x) => { delete x.schritte[a.dataset.key]; }); return teilRendern(p); }
    if (akt === "akte-tab" && p) { S.akteTab = a.dataset.tab; $("#akte").innerHTML = akte(p); vorschauenLaden($("#akte")); if (a.closest(".p-kopf")) $("#akte").scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    if (akt === "ordner" && p) { S.ordnerOffen = S.ordnerOffen === a.dataset.kat ? null : a.dataset.kat; $("#akte").innerHTML = akte(p); vorschauenLaden($("#akte")); return; }
    if (akt === "loeschen" && p && istGF()) { if (!confirm(`Projekt „${anzeigeName(p)}“ wirklich löschen?`)) return; aendern(p, (x) => { x.geloescht = true; }); location.hash = "#/projekte"; return; }
    if (akt === "formular-fertig" && p) {
      const fid = $(".formularseite").dataset.formular, st = Formular.status(fid, p, dateienVon(p.id));
      if (!st.vollstaendig && !S.zeigeFehler) {
        S.zeigeFehler = true; formularNeuZeichnen(p, fid, true);
        const f = $(".ff.fehlt"); if (f) f.scrollIntoView({ behavior: "smooth", block: "center" });
        return toast(`Noch ${st.fehlend.length} Pflichtangaben offen – erneut „Fertig“ zum Verlassen`);
      }
      S.zeigeFehler = false; location.hash = `#/projekt/${p.id}`; return;
    }
    if (akt === "maengel" && p) {
      const w = Formular.werteVon(p, "abnahme"), d = Formular.def("abnahme"), neu = [];
      d.felder.filter((f) => f.typ === "checkliste").forEach((f) => f.punkte.forEach((pt) => { const e2 = (w[f.id] || {})[pt.id]; if (e2 && e2.s === "mangel") neu.push({ arbeit: pt.label + (e2.n ? ` – ${e2.n}` : ""), wer: "", erledigt: false }); }));
      if (!neu.length) return toast("Keine Mängel markiert");
      aendern(p, () => { const r = formularWerte(p, "restarbeiten"); r.offen = [...(r.offen || []), ...neu]; }, `${neu.length} Mängel in Restarbeiten übernommen`);
      return toast(`${neu.length} Mängel in Restarbeiten übernommen`);
    }
    if (akt === "abmelden") { await Daten.abmelden(); location.reload(); return; }
    if (akt === "cloud-verbinden") {
      const k = { url: $("#cl-url").value.trim().replace(/\/$/, ""), anonKey: $("#cl-key").value.trim(), portalUrl: $("#cl-portal").value.trim() };
      if (!/^https?:\/\//.test(k.url) || !k.anonKey) return toast("URL und Key eintragen", "fehler");
      try { localStorage.setItem("baddashboard:cloud", JSON.stringify(k)); } catch (err) { return toast("Browser-Speicher gesperrt", "fehler"); }
      location.hash = "#/cockpit"; location.reload(); return;
    }
    if (akt === "cloud-trennen") { if (!confirm("Cloud-Verbindung in diesem Browser trennen?")) return; await Daten.abmelden(); localStorage.removeItem("baddashboard:cloud"); location.reload(); return; }

    /* Einrichtung */
    if (akt === "cfg-speichern") {
      S.einstellungen = cfgSammeln();
      try {
        await Daten.einstellungenSpeichern(S.einstellungen);
        const gw = cfg().gewerke || {};
        await Daten.mitgliederSpeichern([
          ...S.einstellungen.team.filter((m) => m.email).map((m) => ({ email: m.email, id: m.kuerzel, ebene: m.ebene || "planung", name: m.name })),
          ...S.einstellungen.partner.filter((x) => x.email).map((x) => ({ email: x.email, id: x.id, ebene: "partner", name: x.firma, formulare: gw[x.gewerk] || [] })),
        ]);
        toast("Einstellungen übernommen");
      } catch (err) { toast("Nicht gespeichert: " + (err.message || err), "fehler"); }
      return render();
    }
    if (akt === "cfg-reset") { if (!confirm("Änderungen verwerfen und firma.js verwenden?")) return; S.einstellungen = null; await Daten.einstellungenSpeichern(null); return render(); }
    if (akt === "cfg-datei") { const c = { ...cfgSammeln(), cloud: window.FIRMA.cloud }; return herunterladen("firma.js", `/* Firma — erzeugt mit dem Bad-Dashboard am ${fDatum(new Date())}. Ersetzt einstellungen/firma.js. */\n\nwindow.FIRMA = ${JSON.stringify(c, null, 2)};\n`, "text/javascript"); }
    if (akt === "team-neu") {
      const rollen = [...new Set(cfg().team.map((t) => t.rolle))];
      $("#team").insertAdjacentHTML("beforeend", `<tr><td><select class="eingabe" data-team="rolle">${opt(rollen, "badplanung")}</select></td><td><input class="eingabe" data-team="bezeichnung" placeholder="z. B. Badplanerin"></td><td><input class="eingabe" data-team="name" placeholder="Vor- und Nachname"></td><td><input class="eingabe kurz" data-team="kuerzel"></td><td><button class="btn still" data-aktion="team-weg" aria-label="Entfernen">✕</button></td></tr>`);
      return;
    }
    if (akt === "team-weg") return a.closest("tr").remove();
    if (akt === "export") return herunterladen(`bad-dashboard-projekte-${isoTag(new Date())}.json`, JSON.stringify({ projekte: S.projekte, einstellungen: S.einstellungen }, null, 1));
  });

  /* Formular-Bedienung (Knöpfe, Chips, Checklisten) */
  document.addEventListener("click", (e) => {
    const seite = e.target.closest(".formularseite"); if (!seite) return;
    const b = e.target.closest("[data-ff-wahl],[data-ff-mehr],[data-check],[data-tab-neu],[data-tab-weg],[data-sign-weg],[data-sprung]");
    if (!b) return;
    if (b.hasAttribute("data-sprung")) { e.preventDefault(); const z = document.getElementById(b.getAttribute("href").slice(1)); if (z) z.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    const p = finde(seite.dataset.projekt), fid = seite.dataset.formular, w = formularWerte(p, fid);
    aendern(p, () => {
      if (b.dataset.ffWahl) {
        const f = Formular.def(fid).felder.find((x) => x.id === b.dataset.ffWahl);
        if (f && f.typ === "kunde") p.kunde[f.feld] = b.dataset.wert;
        else w[b.dataset.ffWahl] = w[b.dataset.ffWahl] === b.dataset.wert ? "" : b.dataset.wert;
      } else if (b.dataset.ffMehr) {
        const arr = new Set(w[b.dataset.ffMehr] || []); arr.has(b.dataset.wert) ? arr.delete(b.dataset.wert) : arr.add(b.dataset.wert); w[b.dataset.ffMehr] = [...arr];
      } else if (b.dataset.check) {
        const o = (w[b.dataset.check] = w[b.dataset.check] || {}); const e2 = (o[b.dataset.punkt] = o[b.dataset.punkt] || {});
        e2.s = b.dataset.wert === "toggle" ? !e2.s : e2.s === b.dataset.wert ? "" : b.dataset.wert;
      } else if (b.dataset.tabNeu) { (w[b.dataset.tabNeu] = w[b.dataset.tabNeu] || []).push({}); }
      else if (b.dataset.tabWeg) { w[b.dataset.tabWeg].splice(Number(b.dataset.zeile), 1); }
      else if (b.dataset.signWeg) { delete w[b.dataset.signWeg]; }
    });
    formularNeuZeichnen(p, fid, true);
  });

  document.addEventListener("input", (e) => {
    const el = e.target;
    if (el.closest("dialog")) return;
    const seite = el.closest(".formularseite");
    if (seite && (el.dataset.ff || el.dataset.tab || el.dataset.checkNotiz)) {
      const p = finde(seite.dataset.projekt), fid = seite.dataset.formular, w = formularWerte(p, fid);
      aendern(p, () => {
        if (el.dataset.kunde) p.kunde[el.dataset.kunde] = el.value;
        else if (el.dataset.ff) w[el.dataset.ff] = el.value;
        else if (el.dataset.tab) {
          const rows = (w[el.dataset.tab] = w[el.dataset.tab] || []); const i = Number(el.dataset.zeile);
          for (let k = 0; k <= i; k++) rows[k] = rows[k] || {};
          rows[i][el.dataset.spalte] = el.type === "checkbox" ? el.checked : el.value;
        } else if (el.dataset.checkNotiz) {
          const o = (w[el.dataset.checkNotiz] = w[el.dataset.checkNotiz] || {}); (o[el.dataset.punkt] = o[el.dataset.punkt] || {}).n = el.value;
        }
      });
      formularNeuZeichnen(p, fid);
      return;
    }
    if (el.dataset.filter === "suche") { S.filter.suche = el.value; $("#projektliste").innerHTML = projektListe(); return; }
    if (el.type === "color") { document.documentElement.style.setProperty(el.dataset.cfg === "farben.tinte" ? "--tinte" : "--akzent", el.value); el.nextElementSibling.textContent = el.value; }
  });

  document.addEventListener("change", async (e) => {
    const el = e.target;
    if (el.closest("dialog")) return;
    const p = aktuellesProjekt();
    if (el.dataset.aktion === "ansicht-als") { Daten.ichSetzen(el.value); await laden(); location.hash = "#/cockpit"; render(); toast(`Ansicht: ${S.ich.name}`); return; }
    if (el.dataset.upload && p) { await hochladen(p, el.dataset.upload, el.files); el.value = ""; return; }
    const seite = el.closest(".formularseite");
    if (seite) {
      /* Bedingungen (z. B. „wenn Mehrfamilienhaus“) neu auswerten, sobald ein Feld fertig ist */
      if ((el.dataset.ff && el.tagName === "SELECT") || (el.dataset.tab && el.type === "checkbox")) formularNeuZeichnen(finde(seite.dataset.projekt), seite.dataset.formular, true);
      return;
    }
    if (el.dataset.termin && p) {
      const def = TERMINE.find((t) => t.key === el.dataset.termin);
      aendern(p, (x) => { x.termine = x.termine || {}; if (el.value) x.termine[def.key] = el.value; else delete x.termine[def.key]; }, el.value ? `${def.label}: ${fTermin(el.value)}` : `${def.label} entfernt`);
      return teilRendern(p);
    }
    if (el.dataset.pfeld && p) {
      const k = el.dataset.pfeld;
      aendern(p, (x) => { x[k] = el.value.trim(); }, k === "status" ? `Status: ${STATUS.find((s) => s.id === el.value)?.label}` : k === "projektnr" ? `Projektnummer: ${el.value.trim()}` : k === "downloadCode" ? `Download-Code: ${el.value.trim()}` : null);
      kopfNeu(p); return teilRendern(p);
    }
    if (el.dataset.kfeld && p) { aendern(p, (x) => { x.kunde[el.dataset.kfeld] = el.value.trim(); }); kopfNeu(p); return; }
    if (el.dataset.filter) { S.filter[el.dataset.filter] = el.value; $("#projektliste").innerHTML = projektListe(); return; }
    if (el.dataset.aktion === "import" && el.files[0]) {
      try {
        const d = JSON.parse(await el.files[0].text());
        for (const q of d.projekte || []) { const alt = S.projekte.find((x) => x.id === q.id); if (!alt || (q.geaendert || 0) > (alt.geaendert || 0)) { if (alt) Object.assign(alt, q); else S.projekte.push(q); speichern(alt || q); } }
        toast("Sicherung eingespielt"); render();
      } catch (err) { toast("Keine gültige Sicherung", "fehler"); }
    }
    if (el.type === "color") el.nextElementSibling.textContent = el.value;
  });

  /* Drag & Drop auf Ablagen */
  document.addEventListener("dragover", (e) => { const z = e.target.closest && e.target.closest(".drop"); if (z) { e.preventDefault(); z.classList.add("ueber"); } });
  document.addEventListener("dragleave", (e) => { const z = e.target.closest && e.target.closest(".drop"); if (z) z.classList.remove("ueber"); });
  document.addEventListener("drop", (e) => {
    const z = e.target.closest && e.target.closest(".drop"); if (!z) return;
    e.preventDefault(); z.classList.remove("ueber");
    const p = aktuellesProjekt(); if (p) hochladen(p, z.closest("[data-ablage]").dataset.ablage, e.dataTransfer.files);
  });

  document.addEventListener("submit", async (e) => {
    if (e.target.id !== "login-form") return;
    e.preventDefault();
    try { await Daten.anmelden($("#l-mail").value, $("#l-pw").value); await laden(); render(); }
    catch (err) { $("#main").innerHTML = err.keinZugang ? keinZugang() : ansichtLogin(err.message); }
  });

  window.addEventListener("hashchange", () => { S.zeigeFehler = false; render(); window.scrollTo(0, 0); $("#main").focus({ preventScroll: true }); });

  /* ---------- Abgleich: Kolleg:innen & Kunden-Uploads ---------- */
  const beschaeftigt = () => $("#dlg").open || (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName));
  async function abgleich() {
    if (!Daten.angemeldet || !S.ich) return;
    let neu = false;
    try {
      if (ebene() === "partner") {
        const vorher = S.projekte.map((x) => x.geaendert).join();
        await laden(); neu = S.projekte.map((x) => x.geaendert).join() !== vorher;
      } else if (Daten.modus === "cloud") {
        for (const q of await Daten.abgleichen()) {
          if (offen.has(q.id)) continue;
          const i = S.projekte.findIndex((x) => x.id === q.id);
          if (i < 0) S.projekte.push(q); else if ((q.geaendert || 0) > (S.projekte[i].geaendert || 0)) S.projekte[i] = q;
          neu = true;
        }
        if (neu) S.dateien = await Daten.alleDateien();
      } else if (!offen.size) {
        const l = await Daten.projekteLaden();
        if (l.map((x) => x.geaendert).join() !== S.projekte.map((x) => x.geaendert).join()) { S.projekte = l; neu = true; }
        const d = await Daten.alleDateien();
        if (d.length !== S.dateien.length) { S.dateien = d; neu = true; }
      }
    } catch (e) { /* offline – später erneut */ }
    if (neu && !beschaeftigt()) allesNeu();
  }
  window.addEventListener("focus", abgleich);
  window.addEventListener("storage", abgleich);
  setInterval(abgleich, 15000);

  async function laden() {
    S.einstellungen = await Daten.einstellungenLaden();
    const id = await Daten.ich();
    if (Daten.modus === "cloud") {
      const m = Daten.mitglied;
      if (!m) throw Object.assign(new Error("kein-zugang"), { keinZugang: true });
      S.ich = { ...(mitgliedZu(m.id) || {}), id: m.id, name: m.name || (mitgliedZu(m.id) || {}).name || m.email, ebene: m.ebene };
    } else {
      const erster = cfg().team.find((t) => t.ebene === "geschaeftsfuehrung") || cfg().team[0];
      S.ich = mitgliedZu(id) || mitgliedZu(erster.kuerzel);
    }
    if (S.ich.ebene === "partner") {
      if (Daten.modus === "cloud") S.projekte = await Daten.partnerAuftraege();
      else {
        S.voll = await Daten.projekteLaden();
        S.projekte = S.voll.filter((p) => !p.geloescht && (p.zugriff || []).includes(S.ich.id)).map((p) => partnerSicht(p, { id: S.ich.id, gewerk: S.ich.gewerk }));
      }
    } else S.projekte = await Daten.projekteLaden();
    S.dateien = await Daten.alleDateien();
  }

  /* ---------- Start ---------- */
  (async () => {
    anwenden();
    try {
      const ok = await Daten.start();
      if (!ok) { $("#main").innerHTML = ansichtLogin(); return; }
      await laden();
    } catch (e) {
      if (e.keinZugang) { $("#main").innerHTML = keinZugang(); return; }
      $("#main").innerHTML = `<div class="seite"><div class="panel startfeld"><h2>Keine Verbindung</h2><p>${esc(e.message || e)}</p><button class="btn" data-aktion="neu-laden">Erneut versuchen</button></div></div>`;
      return;
    }
    render();
  })();
})();
