/* Bad-Dashboard — Ansichten und Bedienung.
   Inhalte (Firma, Ablauf, Mailtexte) kommen aus /einstellungen, die Projekte
   aus dem Store. Kein Build, kein Server: index.html doppelklicken genügt. */

(function () {
  "use strict";

  const PHASEN = [...window.ABLAUF].sort((a, b) => a.nr - b.nr);
  const N = PHASEN.length;
  const phase = (nr) => PHASEN.find((p) => p.nr === nr);
  const ersteNr = PHASEN[0].nr;
  const letzteNr = PHASEN[N - 1].nr;
  const naechsteNr = (nr) => { const i = PHASEN.findIndex((p) => p.nr === nr); return i >= 0 && i < N - 1 ? PHASEN[i + 1].nr : null; };
  const phaseIndex = (nr) => PHASEN.findIndex((p) => p.nr === nr);

  const TERMINE = [
    { key: "anfrageAm",              label: "Anfrage vom",             typ: "date" },
    { key: "erstgespraech",          label: "Erstgespräch",            typ: "datetime-local" },
    { key: "angebotsbesprechung",    label: "Angebotsbesprechung",     typ: "datetime-local" },
    { key: "baustellenbesichtigung", label: "Baustellenbesichtigung",  typ: "datetime-local" },
    { key: "materialauswahl",        label: "Materialauswahl",         typ: "datetime-local" },
    { key: "freigabeGesendet",       label: "Freigabe gesendet",       typ: "date" },
    { key: "baustart",               label: "Baustart",                typ: "date" },
    { key: "abnahme",                label: "Abnahme",                 typ: "datetime-local" },
  ];
  const STATUS = [
    { id: "aktiv", label: "Aktiv" },
    { id: "pausiert", label: "Pausiert – Kunde braucht Zeit" },
    { id: "abgeschlossen", label: "Abgeschlossen" },
    { id: "verloren", label: "Abgesagt" },
  ];
  const ANREDEN = ["Herr", "Frau", "Herr und Frau", "Familie"];
  const QUELLEN = ["Telefon", "Website / Badrechner", "Empfehlung", "Ausstellung", "Social Media", "Stammkunde", "Sonstiges"];

  /* ---------- Helfer ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const zwei = (n) => String(n).padStart(2, "0");
  const isoTag = (d) => `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
  const heute = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const plusTage = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const datum = (s) => { if (!s) return null; const d = new Date(s.length <= 10 ? s + "T00:00" : s); return isNaN(d) ? null : d; };
  const tagOnly = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const tageBis = (d) => Math.round((tagOnly(d) - heute()) / 864e5);
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

  function toast(text) {
    const t = $("#toast");
    t.textContent = text; t.classList.add("an");
    clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove("an"), 2400);
  }
  async function kopieren(text) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
      const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta);
      ta.select(); document.execCommand("copy"); ta.remove();
    }
  }
  function herunterladen(name, text, typ = "application/json") {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: typ }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- Einstellungen (firma.js + Änderungen aus „Einrichtung") ---------- */
  function cfg() {
    const basis = window.FIRMA;
    const e = Store.daten.einstellungen;
    if (!e) return basis;
    const out = { ...basis, ...e };
    for (const k of ["adresse", "farben", "programme", "ordner", "fristen"]) out[k] = { ...basis[k], ...(e[k] || {}) };
    out.team = e.team || basis.team;
    return out;
  }
  const leute = (rolle) => cfg().team.filter((m) => m.rolle === rolle && m.name);
  const namen = (rolle) => leute(rolle).map((m) => m.name).join(" oder ") || `‹${rolle}›`;
  const kuerzelListe = () => cfg().team.filter((m) => m.kuerzel).map((m) => m.kuerzel);

  function ersetzen(text) {
    const c = cfg();
    return String(text).replace(/\{([a-zA-Z.]+)\}/g, (m, key) => {
      if (key === "badplanung.kuerzel") return leute("badplanung").map((x) => x.kuerzel).join(" oder ");
      if (key.startsWith("programm.")) return c.programme[key.slice(9)] ?? m;
      if (key.startsWith("ordner.")) return c.ordner[key.slice(7)] ?? m;
      if (key === "kundenPostfach") return c.kundenPostfach;
      if (cfg().team.some((t) => t.rolle === key)) return namen(key);
      return m;
    });
  }
  const rolleName = (rolle) => { const t = cfg().team.find((m) => m.rolle === rolle); return t ? t.bezeichnung : rolle; };

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

  /* ---------- Projekte ---------- */
  const alle = () => Store.daten.projekte.filter((p) => !p.geloescht);
  const finde = (id) => Store.daten.projekte.find((p) => p.id === id && !p.geloescht);
  function anzeigeName(p) {
    if (p.anrede === "Familie") return `Familie ${p.nachname}`;
    if (p.vorname) return `${p.vorname} ${p.nachname}`;
    return `${p.anrede || ""} ${p.nachname}`.trim();
  }
  function aendern(p, fn, log) {
    fn(p);
    p.geaendert = Date.now();
    if (log) { p.verlauf = p.verlauf || []; p.verlauf.unshift({ ts: Date.now(), text: log }); }
    Store.speichern();
  }
  function neuesProjekt(d) {
    const p = {
      id: uid(), anrede: "Herr", vorname: "", nachname: "", telefon: "", mobil: "", email: "",
      strasse: "", ort: "", projektnr: "", zustaendig: "", status: "aktiv", quelle: "", kunde: "Neukunde",
      budget: "", downloadCode: "", notiz: "", phase: ersteNr, erledigt: {}, termine: { anfrageAm: isoTag(new Date()) },
      mails: {}, wiedervorlage: "", wiedervorlageNotiz: "", verlauf: [], angelegt: Date.now(), geaendert: Date.now(),
      ...d,
    };
    p.verlauf.unshift({ ts: Date.now(), text: "Anfrage angelegt" });
    Store.daten.projekte.push(p);
    Store.speichern();
    return p;
  }
  const erledigtAnzahl = (p, nr) => phase(nr).aufgaben.filter((_, i) => p.erledigt[`${nr}:${i}`]).length;
  const abschnittVon = (nr) => window.ABSCHNITTE.find((a) => nr >= a.von && nr <= a.bis) || window.ABSCHNITTE[0];

  /* Was ist fällig? Regeln entsprechen dem Ablauf-Handbuch. */
  function faelligkeiten(p) {
    if (p.geloescht || p.status === "abgeschlossen" || p.status === "verloren") return [];
    const f = cfg().fristen;
    const out = [];
    const t = p.termine || {};
    const erl = (k) => p.erledigt[k];
    const add = (text, d, unter) => out.push({ p, text, d, unter, ueber: tageBis(d) < 0 });

    const wv = datum(p.wiedervorlage);
    if (wv && tageBis(wv) <= 0) add(p.wiedervorlageNotiz || "Wiedervorlage", wv, "Wiedervorlage");
    if (p.status === "pausiert") return out;

    const eg = datum(t.erstgespraech);
    if (p.phase <= 2 && eg && tageBis(eg) >= 0 && tageBis(eg) <= f.erinnerungVorErstgespraech && !erl("2:2") && !erl("2:4"))
      add("Fotos & Maße nachfragen, an Termin erinnern", plusTage(eg, -f.erinnerungVorErstgespraech), `Erstgespräch ${fTermin(t.erstgespraech)}`);
    if (p.phase === 2 && !erl("2:1") && eg) add("Terminbestätigung senden", heute(), `Erstgespräch ${fTermin(t.erstgespraech)}`);

    const ab = datum(t.angebotsbesprechung);
    if (p.phase === 4 && ab && tageBis(ab) <= 3 && tageBis(ab) >= 0) add("Angebot & Planung prüfen", plusTage(ab, -3), `Besprechung ${fTermin(t.angebotsbesprechung)}`);
    if (p.phase === 5 && ab && !wv && tageBis(plusTage(ab, f.angebotsverfolgung)) <= 0)
      add("Angebotsverfolgung – beim Kunden nachfragen", plusTage(ab, f.angebotsverfolgung), `Besprechung war ${fTermin(t.angebotsbesprechung)}`);

    const ma = datum(t.materialauswahl);
    if ((p.phase === 7 || p.phase === 8) && ma && !t.freigabeGesendet && tageBis(plusTage(ma, f.freigabeNachMaterialauswahl)) <= 0)
      add("Exposé & Angebot zur Freigabe schicken", plusTage(ma, f.freigabeNachMaterialauswahl), `Materialauswahl ${fTermin(t.materialauswahl)}`);

    const bs = datum(t.baustart);
    if (bs && p.phase <= 11 && tageBis(bs) >= 0 && tageBis(bs) <= f.kundenerinnerungVorBaustart && !erl("11:0") && !(p.mails || {}).baustart)
      add("Kundenerinnerung vor Baustart senden", plusTage(bs, -f.kundenerinnerungVorBaustart), `Baustart ${fTermin(t.baustart)}`);

    const an = datum(t.abnahme);
    if (p.phase === 12 && an && tageBis(an) <= 0 && !erl("12:1")) add("Schlussrechnung schreiben & senden", an, `Abnahme ${fTermin(t.abnahme)}`);
    if (p.phase === 13 && an && tageBis(plusTage(an, 7)) <= 0 && !erl("13:0")) add("Bewertung nachhaken", plusTage(an, 7), "Abschluss");
    return out;
  }

  function anstehendeTermine(tage) {
    const out = [];
    for (const p of alle()) {
      if (p.status === "verloren") continue;
      for (const def of TERMINE) {
        if (def.key === "anfrageAm" || def.key === "freigabeGesendet") continue;
        const d = datum((p.termine || {})[def.key]);
        if (d && tageBis(d) >= 0 && tageBis(d) <= tage) out.push({ p, def, d, s: p.termine[def.key] });
      }
    }
    return out.sort((a, b) => a.d - b.d);
  }

  /* ---------- Bausteine ---------- */
  function fliesen(p, gross) {
    const i = phaseIndex(p.phase);
    const fertig = p.status === "abgeschlossen";
    return `<span class="fliesen${gross ? " gross" : ""}" aria-label="Phase ${i + 1} von ${N}">${PHASEN.map((ph, k) =>
      `<span class="fliese${fertig || k < i ? " fertig" : k === i ? " jetzt" : ""}"></span>`).join("")}</span>`;
  }
  function vorschauBild(datei) {
    return "vorlagen/_vorschau/" + datei.replace(/^vorlagen\//, "").replace(/\//g, "_").replace(/\.[^.]+$/, ".jpg");
  }
  function dokKachel(d) {
    const ext = d.datei.split(".").pop().toUpperCase();
    return `<a class="dok" href="${esc(d.datei)}" target="_blank" rel="noopener">
      <div class="dok-bild"><img class="dok-thumb" src="${esc(vorschauBild(d.datei))}" alt="" loading="lazy"></div>
      <div class="dok-name">${esc(d.titel)}</div>
      <div class="dok-meta"><span class="dok-typ">${ext}</span>${esc(d.hinweis || (ext === "DOCX" ? "in Word öffnen" : "öffnen & drucken"))}</div></a>`;
  }
  function mailKnopf(m, p) {
    const am = p && p.mails && p.mails[m.id];
    return `<button class="mail-knopf" type="button" data-aktion="mail" data-mail="${m.id}"${p ? ` data-id="${p.id}"` : ""}>
      <span class="umschlag" aria-hidden="true"></span>
      <span><b>${esc(m.titel)}</b><small>Betreff: ${esc(m.betreff)}</small></span>
      ${am ? `<span class="gesendet">gesendet ${fKurz(new Date(am))}</span>` : `<span class="pfeil" aria-hidden="true">→</span>`}</button>`;
  }
  const opt = (liste, wert) => liste.map((x) => {
    const [v, l] = typeof x === "string" ? [x, x] : [x.id, x.label];
    return `<option value="${esc(v)}"${v === wert ? " selected" : ""}>${esc(l)}</option>`;
  }).join("");

  /* ================================================================
     ANSICHT: Heute
     ================================================================ */
  function ansichtHeute() {
    const c = cfg();
    const projekte = alle().filter((p) => p.status === "aktiv" || p.status === "pausiert");
    const faellig = projekte.flatMap(faelligkeiten).sort((a, b) => a.d - b.d);
    const faelligIds = new Set(faellig.map((f) => f.p.id));
    const termine = anstehendeTermine(14);
    const d = new Date();

    const spalten = PHASEN.map((ph) => {
      const steine = projekte.filter((p) => p.phase === ph.nr);
      return `<div class="wand-spalte">${steine.length ? steine.map((p) =>
        `<a class="wand-stein${faelligIds.has(p.id) ? " faellig" : ""}" href="#/projekt/${p.id}" aria-label="${esc(anzeigeName(p))}"><span class="nm">${esc(p.nachname)}</span><span class="tip">${esc(anzeigeName(p))} · ${esc(ph.titel)}</span></a>`).join("")
        : `<span class="wand-leer"></span>`}</div>`;
    }).join("");

    return `<div class="seite">
      <header class="kopf">
        <div><p class="eyebrow">${WT[d.getDay()]}, ${fDatum(d)}</p>
          <h1>Guten ${d.getHours() < 11 ? "Morgen" : d.getHours() < 18 ? "Tag" : "Abend"}.</h1>
          <p class="unter">${faellig.length ? `${faellig.length} ${faellig.length === 1 ? "Sache ist" : "Sachen sind"} heute dran, ${projekte.length} Bäder laufen gerade.` : projekte.length ? `Nichts überfällig — ${projekte.length} Bäder laufen gerade.` : "Noch keine Projekte angelegt."}</p></div>
        <div class="kopf-aktionen"><button class="btn jetzt" data-aktion="neu">+ Neue Anfrage</button></div>
      </header>

      <section class="wand" style="--n:${N}" aria-label="Fliesenspiegel aller Projekte">
        <div class="wand-kopf"><h2>Der Fliesenspiegel</h2><span>Jede Fliese ein Bad — in der Spalte seiner Phase. Orange = heute etwas zu tun.</span></div>
        <div class="wand-raster">${spalten}</div>
        <div class="wand-fuss">${PHASEN.map((ph) => `<a href="#/ablauf/${ph.nr}" title="${esc(ph.titel)}">${zwei(ph.nr)}<small>${esc(ph.titel.split(/[ &]/)[0])}</small></a>`).join("")}</div>
        <div class="wand-abschnitte">${window.ABSCHNITTE.map((a) => `<span style="grid-column: span ${PHASEN.filter((p) => p.nr >= a.von && p.nr <= a.bis).length}">${esc(a.titel)}</span>`).join("")}</div>
      </section>

      <div class="zwei">
        <section>
          <h2 class="block-titel">Heute zu tun ${faellig.length ? `<span class="zahl">${faellig.length}</span>` : ""}</h2>
          <ul class="liste">${faellig.length ? faellig.map((f) => `<li><a class="zeile" href="#/projekt/${f.p.id}">
              <span class="marker ${f.ueber ? "ueber" : "jetzt"}"></span>
              <span><span class="zeile-titel">${esc(f.text)}</span><br><span class="zeile-unter">${esc(anzeigeName(f.p))} · ${esc(f.unter)}</span></span>
              <span class="zeile-rechts ${f.ueber ? "ueberfaellig" : ""}">${f.ueber ? relativ(f.d) : "heute"}</span></a></li>`).join("")
            : `<li class="leer-hinweis">Alles erledigt. Fällige Nachfassaktionen erscheinen hier automatisch — z. B. die Angebotsverfolgung ${c.fristen.angebotsverfolgung} Tage nach der Besprechung.</li>`}</ul>
        </section>
        <section>
          <h2 class="block-titel">Nächste 14 Tage</h2>
          <ul class="liste">${termine.length ? termine.map((t) => `<li><a class="zeile" href="#/projekt/${t.p.id}">
              <span class="marker termin"></span>
              <span><span class="zeile-titel">${esc(t.def.label)}</span><br><span class="zeile-unter">${esc(anzeigeName(t.p))}${t.p.ort ? " · " + esc(t.p.ort) : ""}</span></span>
              <span class="zeile-rechts">${esc(fTermin(t.s))}</span></a></li>`).join("")
            : `<li class="leer-hinweis">Keine Termine eingetragen.</li>`}</ul>
        </section>
      </div>
    </div>`;
  }

  /* ================================================================
     ANSICHT: Projekte
     ================================================================ */
  const filter = { suche: "", wer: "", status: "offen" };
  function ansichtProjekte() {
    const liste = alle();
    if (!liste.length) {
      return `<div class="seite"><header class="kopf"><div><p class="eyebrow">Projekte</p><h1>Noch leer.</h1></div></header>
        <div class="startfeld"><h2>Die erste Anfrage anlegen</h2>
          <p>Jedes Bad läuft hier als Projekt durch die ${N} Phasen. Lege eine echte Anfrage an — oder schau dir das Dashboard erst mit ein paar Beispielprojekten an (die lassen sich unter „Einrichtung" wieder entfernen).</p>
          <div class="aktionen"><button class="btn jetzt" data-aktion="neu">+ Neue Anfrage</button><button class="btn" data-aktion="demo">Beispielprojekte laden</button></div></div></div>`;
    }
    return `<div class="seite">
      <header class="kopf"><div><p class="eyebrow">Projekte</p><h1>Alle Bäder</h1></div>
        <div class="kopf-aktionen"><button class="btn jetzt" data-aktion="neu">+ Neue Anfrage</button></div></header>
      <div class="werkzeuge">
        <input class="eingabe feld-suche" type="search" placeholder="Name, Ort, Projektnummer …" data-filter="suche" value="${esc(filter.suche)}" aria-label="Suchen">
        <select class="eingabe" data-filter="wer" aria-label="Zuständig" style="width:auto"><option value="">Alle Zuständigen</option>${opt(kuerzelListe(), filter.wer)}</select>
        <select class="eingabe" data-filter="status" aria-label="Status" style="width:auto">${opt([{ id: "offen", label: "Laufende" }, ...STATUS, { id: "alle", label: "Alle" }], filter.status)}</select>
      </div>
      <div id="projektliste">${projektListe()}</div></div>`;
  }
  function projektListe() {
    const q = filter.suche.trim().toLowerCase();
    const liste = alle().filter((p) => {
      if (filter.status === "offen" && !(p.status === "aktiv" || p.status === "pausiert")) return false;
      if (filter.status !== "offen" && filter.status !== "alle" && p.status !== filter.status) return false;
      if (filter.wer && p.zustaendig !== filter.wer) return false;
      if (q && ![p.nachname, p.vorname, p.ort, p.projektnr, p.strasse].join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
    if (!liste.length) return `<p class="leer-hinweis">Keine Projekte für diese Auswahl.</p>`;
    return window.ABSCHNITTE.map((a) => {
      const teil = liste.filter((p) => p.phase >= a.von && p.phase <= a.bis).sort((x, y) => y.phase - x.phase || x.nachname.localeCompare(y.nachname, "de"));
      if (!teil.length) return "";
      return `<section class="abschnitt"><div class="abschnitt-kopf"><h2>${esc(a.titel)}</h2><span class="phasen">Phase ${a.von}–${a.bis}</span><span class="anzahl">${teil.length}</span></div>
        ${teil.map((p) => {
          const ph = phase(p.phase);
          const naechster = TERMINE.map((t) => ({ t, s: p.termine[t.key] })).filter((x) => x.s && datum(x.s) && tageBis(datum(x.s)) >= 0).sort((x, y) => datum(x.s) - datum(y.s))[0];
          return `<a class="projekt-zeile" href="#/projekt/${p.id}">
            <span><span class="p-name">${esc(anzeigeName(p))}</span>${p.status !== "aktiv" ? `<span class="status-chip ${p.status}">${esc(p.status)}</span>` : ""}${p.demo ? `<span class="status-chip">Beispiel</span>` : ""}<br><span class="p-ort">${esc([p.projektnr, p.ort].filter(Boolean).join(" · ") || "—")}</span></span>
            <span class="p-phase">${zwei(ph.nr)} ${esc(ph.titel)}<small>${erledigtAnzahl(p, p.phase)} von ${ph.aufgaben.length} erledigt</small></span>
            ${fliesen(p)}
            <span class="p-termin">${naechster ? `${esc(naechster.t.label)}<br>${esc(fTermin(naechster.s))}` : ""}</span>
            <span class="kuerzel" title="Zuständig">${esc(p.zustaendig || "–")}</span></a>`;
        }).join("")}</section>`;
    }).join("");
  }

  /* ================================================================
     ANSICHT: Projektakte
     ================================================================ */
  let ansichtPhase = null; // welche Phase in der Akte gerade angezeigt wird
  function ansichtProjekt(id) {
    const p = finde(id);
    if (!p) return `<div class="seite"><header class="kopf"><div><p class="eyebrow">Projekt</p><h1>Nicht gefunden.</h1></div></header><a class="btn" href="#/projekte">← Zu den Projekten</a></div>`;
    if (!ansichtPhase || ansichtPhase.id !== id) ansichtPhase = { id, nr: p.phase };
    return `<div class="seite" data-projekt="${p.id}">
      <div id="akte-kopf">${akteKopf(p)}</div>
      <div class="akte">
        <div id="phase-blatt">${phaseBlatt(p, ansichtPhase.nr)}</div>
        <aside class="akte-seite">${akteSeite(p)}</aside>
      </div></div>`;
  }
  function akteKopf(p) {
    const i = phaseIndex(p.phase);
    const tel = [p.telefon, p.mobil].filter(Boolean);
    return `<header class="akte-kopf">
        <div><p class="eyebrow"><a href="#/projekte" style="text-decoration:none">Projekte</a> / ${esc(abschnittVon(p.phase).titel)}${p.projektnr ? " · Nr. " + esc(p.projektnr) : ""}</p>
          <h1>${esc(anzeigeName(p))}</h1>
          <div class="akte-kontakt">
            ${p.strasse || p.ort ? `<span>${esc([p.strasse, p.ort].filter(Boolean).join(", "))}</span>` : ""}
            ${tel.map((t) => `<a href="tel:${esc(t.replace(/[^\d+]/g, ""))}">${esc(t)}</a>`).join("")}
            ${p.email ? `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : ""}
            ${p.zustaendig ? `<span>Zuständig: <b>${esc(p.zustaendig)}</b></span>` : ""}
          </div></div>
        <div class="kopf-aktionen"><button class="btn" data-aktion="drucken">Drucken</button></div>
      </header>
      <div class="akte-spiegel" style="--n:${N}">
        <div class="fliesen gross">${PHASEN.map((ph, k) => `<button type="button" class="fliese${p.status === "abgeschlossen" || k < i ? " fertig" : k === i ? " jetzt" : ""}${ansichtPhase.nr === ph.nr ? " ansicht" : ""}" data-aktion="zeige-phase" data-nr="${ph.nr}" title="${zwei(ph.nr)} ${esc(ph.titel)}" aria-label="Phase ${ph.nr}: ${esc(ph.titel)}"></button>`).join("")}</div>
        <div class="akte-spiegel-legende"><span>${p.status === "abgeschlossen" ? "Abgeschlossen" : `Phase ${i + 1} von ${N} · ${esc(phase(p.phase).titel)}`}</span><span>Fliese anklicken, um eine Phase anzusehen</span></div>
      </div>`;
  }
  function phaseBlatt(p, nr) {
    const ph = phase(nr);
    const zustand = p.status === "abgeschlossen" || nr < p.phase ? "vergangen" : nr === p.phase ? "jetzt" : "kuenftig";
    const fertig = erledigtAnzahl(p, nr);
    const mails = (ph.mails || []).map((id) => window.MAILVORLAGEN.find((m) => m.id === id)).filter(Boolean);
    const weiter = naechsteNr(nr);
    return `<article class="phase-blatt ${zustand === "jetzt" ? "" : zustand}">
      <div class="phase-blatt-kopf"><span class="phase-nr">${zwei(ph.nr)}</span><h2>${esc(ph.titel)}</h2><p>${esc(ph.kurz)}</p></div>
      <div class="phase-teil"><p class="teil-titel">Checkliste · ${fertig} von ${ph.aufgaben.length}</p>
        <ul class="check">${ph.aufgaben.map((a, k) => `<li><label><input type="checkbox" data-aktion="haken" data-key="${nr}:${k}"${p.erledigt[`${nr}:${k}`] ? " checked" : ""}><span><span class="t">${esc(ersetzen(a.t))}</span>${a.d ? `<span class="d">${esc(ersetzen(a.d))}</span>` : ""}</span></label></li>`).join("")}</ul></div>
      ${mails.length ? `<div class="phase-teil"><p class="teil-titel">E-Mail an den Kunden</p><div class="mails">${mails.map((m) => mailKnopf(m, p)).join("")}</div></div>` : ""}
      ${ph.dokumente.length ? `<div class="phase-teil"><p class="teil-titel">Formulare & Unterlagen</p><div class="doks">${ph.dokumente.map(dokKachel).join("")}</div></div>` : ""}
      ${ph.ordner ? `<div class="phase-teil"><p class="teil-titel">Ordnerstruktur</p><ul class="ordner-liste">${ph.ordner.map((o) => `<li>${esc(o)}</li>`).join("")}</ul></div>` : ""}
      <div class="phase-fuss">${zustand === "jetzt" && p.status !== "abgeschlossen"
        ? `<small>${fertig === ph.aufgaben.length ? "Alles abgehakt." : `Noch ${ph.aufgaben.length - fertig} offen.`}</small>
           ${weiter ? `<button class="btn jetzt" data-aktion="weiter">Weiter zu ${zwei(weiter)} ${esc(phase(weiter).titel)} <span class="pfeil">→</span></button>`
                    : `<button class="btn jetzt" data-aktion="abschliessen">Projekt abschließen ✓</button>`}`
        : `<small>${zustand === "vergangen" ? "Diese Phase ist abgeschlossen." : "Diese Phase kommt noch."}</small>
           <span style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-aktion="setze-phase" data-nr="${nr}">Projekt auf diese Phase setzen</button>
           <button class="btn voll" data-aktion="zeige-phase" data-nr="${p.phase}">Zur aktuellen Phase</button></span>`}
      </div></article>`;
  }
  function akteSeite(p) {
    const aktTermin = phase(p.phase).termin;
    const f = (key, label, typ = "text", breit) => `<div class="feld${breit ? " breit" : ""}"><label for="f-${key}">${label}</label><input class="eingabe" id="f-${key}" type="${typ}" data-feld="${key}" value="${esc(p[key])}"></div>`;
    return `
      <section class="kasten"><h3>Termine</h3>
        ${TERMINE.map((t) => `<div class="termin-zeile${t.key === aktTermin ? " aktiv" : ""}"><span>${esc(t.label)}</span><input class="eingabe" type="${t.typ}" data-termin="${t.key}" value="${esc(p.termine[t.key] || "")}" aria-label="${esc(t.label)}"></div>`).join("")}
      </section>
      <section class="kasten"><h3>Wiedervorlage</h3>
        <div class="felder"><div class="feld"><label for="f-wv">Am</label><input class="eingabe" id="f-wv" type="date" data-feld="wiedervorlage" value="${esc(p.wiedervorlage)}"></div>
        <div class="feld"><label for="f-wvn">Worum geht's</label><input class="eingabe" id="f-wvn" data-feld="wiedervorlageNotiz" value="${esc(p.wiedervorlageNotiz)}" placeholder="z. B. nochmal anrufen"></div></div>
      </section>
      <section class="kasten"><h3>Kunde</h3>
        <div class="felder">
          <div class="feld"><label for="f-anrede">Anrede</label><select class="eingabe" id="f-anrede" data-feld="anrede">${opt(ANREDEN, p.anrede)}</select></div>
          ${f("vorname", "Vorname")}${f("nachname", "Nachname")}${f("projektnr", "Projekt-Nr.")}
          ${f("telefon", "Telefon", "tel")}${f("mobil", "Mobil", "tel")}${f("email", "E-Mail", "email", true)}
          ${f("strasse", "Straße")}${f("ort", "PLZ & Ort")}
          <div class="feld"><label for="f-zustaendig">Zuständig</label><select class="eingabe" id="f-zustaendig" data-feld="zustaendig"><option value="">–</option>${opt(kuerzelListe(), p.zustaendig)}</select></div>
          <div class="feld"><label for="f-status">Status</label><select class="eingabe" id="f-status" data-feld="status">${opt(STATUS, p.status)}</select></div>
          <div class="feld"><label for="f-quelle">Kontakt über</label><select class="eingabe" id="f-quelle" data-feld="quelle"><option value="">–</option>${opt(QUELLEN, p.quelle)}</select></div>
          <div class="feld"><label for="f-kunde">Kunde</label><select class="eingabe" id="f-kunde" data-feld="kunde">${opt(["Neukunde", "Stammkunde"], p.kunde)}</select></div>
          ${f("budget", "Budget")}${f("downloadCode", cfg().programme.app3d + "-Code")}
        </div>
      </section>
      <section class="kasten"><h3>Notizen</h3><textarea class="eingabe" data-feld="notiz" rows="5" placeholder="Wünsche, Besonderheiten, Absprachen …">${esc(p.notiz)}</textarea></section>
      <section class="kasten"><h3>Verlauf</h3><ul class="verlauf">${(p.verlauf || []).map((v) => { const d = new Date(v.ts); return `<li><time>${fKurz(d)} ${fUhr(d)}</time><span>${esc(v.text)}</span></li>`; }).join("")}</ul></section>
      <button class="btn still gefahr" data-aktion="loeschen">Projekt löschen</button>`;
  }

  /* ================================================================
     Mail-Dialog
     ================================================================ */
  function anrede(p, stil) {
    const n = p.nachname || "‹Nachname›";
    const t = {
      formell:  { "Herr": `Sehr geehrter Herr ${n},`, "Frau": `Sehr geehrte Frau ${n},`, "Herr und Frau": `Sehr geehrte Frau ${n}, sehr geehrter Herr ${n},`, "Familie": `Sehr geehrte Familie ${n},` },
      hallo:    { "Herr": `Hallo Herr ${n},`, "Frau": `Hallo Frau ${n},`, "Herr und Frau": `Hallo Frau ${n}, hallo Herr ${n},`, "Familie": `Hallo Familie ${n},` },
      gutentag: { "Herr": `Guten Tag Herr ${n},`, "Frau": `Guten Tag Frau ${n},`, "Herr und Frau": `Guten Tag Frau und Herr ${n},`, "Familie": `Guten Tag liebe Familie ${n},` },
    };
    return (t[stil] || t.formell)[p.anrede] || t.formell.Herr;
  }
  function mailBauen(m, p, optionen) {
    const c = cfg();
    const luecken = [];
    let text = m.text.replace(/\[\[(\w+)\]\]([\s\S]*?)\[\[\/\1\]\]/g, (_, id, inhalt) => (optionen[id] ? inhalt : ""));
    const label = (k) => (TERMINE.find((t) => t.key === k) || {}).label || k;
    text = text.replace(/\{([a-zA-Z.]+)\}/g, (ganz, key) => {
      const fehlt = (was) => { if (!luecken.includes(was)) luecken.push(was); return `‹${was}›`; };
      if (key === "anrede") return anrede(p, m.anredeStil);
      if (key === "nachname") return p.nachname || fehlt("Nachname");
      if (key === "downloadCode") return p.downloadCode || fehlt(`${c.programme.app3d}-Code`);
      if (key === "berater") return leute("badberater")[0]?.name || fehlt("Badberater");
      if (key === "heizungsexperte") return leute("heizungsexperte")[0]?.name || fehlt("Heizungsexperte");
      if (key === "firma.name") return c.name;
      if (key === "firma.kurzname") return c.kurzname || c.name;
      if (key === "firma.adresse") return `${c.adresse.strasse}, ${c.adresse.ort}`;
      if (key === "firma.mapsLink") return c.adresse.mapsLink;
      if (key === "firma.website") return c.website;
      const [tk, teil] = key.split(".");
      if (TERMINE.some((t) => t.key === tk)) {
        const s = p.termine[tk]; const d = datum(s);
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

  function mailDialog(mailId, projektId) {
    const m = window.MAILVORLAGEN.find((x) => x.id === mailId);
    const p = projektId ? finde(projektId) : null;
    const dlg = $("#dlg");
    const optionen = {};
    const muster = p || { anrede: "Herr", nachname: "Mustermann", termine: {}, downloadCode: "" };

    const zeichnen = () => {
      const { text, luecken } = mailBauen(m, muster, optionen);
      dlg.innerHTML = `
        <div class="dlg-kopf"><div><p class="eyebrow">Phase ${zwei(m.phase)} · ${p ? esc(anzeigeName(p)) : "Vorschau mit Musterdaten"}</p><h2>${esc(m.titel)}</h2>
          <p>${p && p.email ? `An: ${esc(p.email)}` : p ? "Beim Kunden ist noch keine E-Mail-Adresse hinterlegt." : "In einer Projektakte geöffnet, werden Name und Termine automatisch eingesetzt."}</p></div>
          <button class="btn still" data-aktion="dlg-zu" aria-label="Schließen">✕</button></div>
        <div class="dlg-inhalt">
          ${m.optionen.length ? `<div class="optionen">${m.optionen.map((o) => `<label><input type="checkbox" data-option="${o.id}"${optionen[o.id] ? " checked" : ""}> ${esc(o.label)}</label>`).join("")}</div>` : ""}
          ${p && luecken.length ? `<div class="luecken">Noch offen: ${luecken.map(esc).join(", ")} — in der Akte nachtragen oder unten im Text ersetzen.</div>` : ""}
          <div class="feld"><label for="mail-betreff">Betreff</label><input class="eingabe" id="mail-betreff" value="${esc(m.betreff)}"></div>
          <div class="feld" style="margin-top:12px"><label for="mail-text">Text</label><textarea class="eingabe mail-text" id="mail-text">${esc(text)}</textarea></div>
          <p class="anhang-info">Anhänge: ${m.anhaenge.map(esc).join(", ") || "keine"}. Bilder, Signatur und Anhänge stecken in der Outlook-Vorlage — Text dort einfügen oder Anhänge im Mailprogramm ergänzen. Absender: ${esc(cfg().kundenPostfach)}</p>
        </div>
        <div class="dlg-fuss">
          <a class="btn links" href="${esc(m.datei)}">Outlook-Vorlage öffnen</a>
          <button class="btn" data-aktion="kopiere-text">Text kopieren</button>
          ${p ? `<a class="btn" data-aktion="mailto" href="mailto:${esc(p.email || "")}">Im Mailprogramm öffnen</a>
                 <button class="btn jetzt" data-aktion="als-gesendet">Als gesendet markieren</button>` : ""}
        </div>`;
      const mt = $('[data-aktion="mailto"]', dlg);
      if (mt) mt.href = `mailto:${encodeURIComponent(p.email || "")}?subject=${encodeURIComponent($("#mail-betreff", dlg).value)}&body=${encodeURIComponent($("#mail-text", dlg).value)}`;
    };

    dlg.onclick = async (e) => {
      if (e.target === dlg) return dlg.close();
      const a = e.target.closest("[data-aktion]"); if (!a) return;
      const akt = a.dataset.aktion;
      if (akt === "dlg-zu") dlg.close();
      if (akt === "kopiere-text") { await kopieren(`${$("#mail-text", dlg).value}`); toast("Text kopiert — Betreff: " + $("#mail-betreff", dlg).value); }
      if (akt === "mailto") { a.href = `mailto:${encodeURIComponent(p.email || "")}?subject=${encodeURIComponent($("#mail-betreff", dlg).value)}&body=${encodeURIComponent($("#mail-text", dlg).value)}`; }
      if (akt === "als-gesendet") {
        aendern(p, (x) => {
          x.mails = x.mails || {}; x.mails[m.id] = Date.now();
          if (m.id === "freigabe" && !x.termine.freigabeGesendet) x.termine.freigabeGesendet = isoTag(new Date());
          const aufgabe = phase(m.phase).aufgaben.findIndex((t) => /mail|senden|versenden|Kundenerinnerung/i.test(t.t));
          if (aufgabe >= 0) x.erledigt[`${m.phase}:${aufgabe}`] = true;
        }, `Mail „${m.titel}" gesendet`);
        dlg.close(); toast("Als gesendet vermerkt"); render();
      }
    };
    dlg.onchange = (e) => { const o = e.target.dataset.option; if (o) { optionen[o] = e.target.checked; zeichnen(); } };
    dlg.oninput = (e) => {
      if (e.target.id === "mail-text" || e.target.id === "mail-betreff") {
        const mt = $('[data-aktion="mailto"]', dlg);
        if (mt) mt.href = `mailto:${encodeURIComponent(p.email || "")}?subject=${encodeURIComponent($("#mail-betreff", dlg).value)}&body=${encodeURIComponent($("#mail-text", dlg).value)}`;
      }
    };
    zeichnen();
    dlg.showModal();
  }

  /* ---------- Dialog: Neue Anfrage ---------- */
  function neuDialog() {
    const dlg = $("#dlg");
    dlg.innerHTML = `<form method="dialog" id="neu-form">
      <div class="dlg-kopf"><div><p class="eyebrow">Phase 01 · Kundenanfrage</p><h2>Neue Anfrage</h2><p>Das Nötigste reicht — alles Weitere kommt in die Akte.</p></div>
        <button class="btn still" type="button" data-aktion="dlg-zu" aria-label="Schließen">✕</button></div>
      <div class="dlg-inhalt"><div class="felder">
        <div class="feld"><label for="n-anrede">Anrede</label><select class="eingabe" id="n-anrede" name="anrede">${opt(ANREDEN, "Herr")}</select></div>
        <div class="feld"><label for="n-kunde">Kunde</label><select class="eingabe" id="n-kunde" name="kunde">${opt(["Neukunde", "Stammkunde"], "Neukunde")}</select></div>
        <div class="feld"><label for="n-vorname">Vorname</label><input class="eingabe" id="n-vorname" name="vorname"></div>
        <div class="feld"><label for="n-nachname">Nachname *</label><input class="eingabe" id="n-nachname" name="nachname" required></div>
        <div class="feld"><label for="n-tel">Telefon</label><input class="eingabe" id="n-tel" name="telefon" type="tel"></div>
        <div class="feld"><label for="n-mail">E-Mail</label><input class="eingabe" id="n-mail" name="email" type="email"></div>
        <div class="feld"><label for="n-str">Straße</label><input class="eingabe" id="n-str" name="strasse"></div>
        <div class="feld"><label for="n-ort">PLZ & Ort</label><input class="eingabe" id="n-ort" name="ort"></div>
        <div class="feld"><label for="n-quelle">Kontakt über</label><select class="eingabe" id="n-quelle" name="quelle"><option value="">–</option>${opt(QUELLEN, "")}</select></div>
        <div class="feld"><label for="n-wer">Zuständig</label><select class="eingabe" id="n-wer" name="zustaendig"><option value="">–</option>${opt(leute("badplanung").map((m) => m.kuerzel), "")}</select></div>
        <div class="feld breit"><label for="n-notiz">Was soll gemacht werden?</label><textarea class="eingabe" id="n-notiz" name="notiz" rows="3" placeholder="z. B. Komplettsanierung, bodengleiche Dusche statt Wanne …"></textarea></div>
      </div></div>
      <div class="dlg-fuss"><button class="btn" type="button" data-aktion="dlg-zu">Abbrechen</button><button class="btn jetzt" type="submit">Anfrage anlegen <span class="pfeil">→</span></button></div></form>`;
    dlg.onclick = (e) => { if (e.target === dlg || e.target.closest('[data-aktion="dlg-zu"]')) dlg.close(); };
    dlg.onchange = null; dlg.oninput = null;
    $("#neu-form").onsubmit = (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      d.nachname = d.nachname.trim();
      if (!d.nachname) return;
      const p = neuesProjekt(d);
      dlg.close();
      location.hash = `#/projekt/${p.id}`;
      toast("Anfrage angelegt");
    };
    dlg.showModal();
    setTimeout(() => $("#n-vorname").focus(), 30);
  }

  /* ================================================================
     ANSICHT: Ablauf (Handbuch)
     ================================================================ */
  function ansichtAblauf(nr) {
    const notizen = Store.daten.notizen || {};
    return `<div class="seite">
      <header class="kopf"><div><p class="eyebrow">Handbuch</p><h1>So bauen wir ein Bad.</h1>
        <p class="unter">${N} Phasen von der ersten Anfrage bis zum archivierten Projekt. Was hier steht, ist die Checkliste in jeder Projektakte.</p></div></header>
      <div class="handbuch">
        <ul class="index">${window.ABSCHNITTE.map((a) => `<li class="gruppe">${esc(a.titel)}</li>${PHASEN.filter((p) => p.nr >= a.von && p.nr <= a.bis).map((p) => `<li><a href="#/ablauf/${p.nr}"${p.nr === nr ? ' class="aktiv"' : ""}><span>${zwei(p.nr)}</span><span>${esc(p.titel)}</span></a></li>`).join("")}`).join("")}
          <li class="gruppe">Sonstiges</li><li><a href="#/ablauf/notizen"><span>✎</span><span>Notizen</span></a></li></ul>
        <div class="strang">
          ${PHASEN.map((ph) => {
            const mails = (ph.mails || []).map((id) => window.MAILVORLAGEN.find((m) => m.id === id)).filter(Boolean);
            return `<section class="station${ph.nr === nr ? " hervor" : ""}" id="phase-${ph.nr}">
              <div class="station-nr">${zwei(ph.nr)}</div>
              <div>
                <p class="station-abschnitt">${esc(abschnittVon(ph.nr).titel)}</p>
                <h2>${esc(ph.titel)}</h2>
                <p class="kurz">${esc(ph.kurz)}</p>
                <div class="wer">${ph.wer.map((r) => `<span>${esc(rolleName(r))}: ${esc(namen(r))}</span>`).join("")}</div>
                <ol class="schritte">${ph.aufgaben.map((a) => `<li><span><b>${esc(ersetzen(a.t))}</b>${a.d ? `<small>${esc(ersetzen(a.d))}</small>` : ""}</span></li>`).join("")}</ol>
                ${mails.length ? `<div class="mails">${mails.map((m) => mailKnopf(m)).join("")}</div>` : ""}
                ${ph.dokumente.length ? `<div class="doks">${ph.dokumente.map(dokKachel).join("")}</div>` : ""}
                ${ph.ordner ? `<ul class="ordner-liste" style="margin-bottom:14px">${ph.ordner.map((o) => `<li>${esc(o)}</li>`).join("")}</ul>` : ""}
                <div class="notiz-feld"><label for="notiz-${ph.nr}">Notiz zu dieser Phase</label><textarea class="eingabe" id="notiz-${ph.nr}" data-notiz="${ph.nr}" placeholder="Ergänzungen, Sonderfälle, Tipps fürs Team …">${esc(notizen[ph.nr] || "")}</textarea></div>
              </div></section>`;
          }).join("")}
          <section class="station" id="phase-notizen"><div class="station-nr">✎</div><div>
            <p class="station-abschnitt">Sonstiges</p><h2>Notizen</h2>
            <p class="kurz">Alles, was nicht zu einer einzelnen Phase gehört — für alle im Büro sichtbar.</p>
            <div class="notiz-feld"><textarea class="eingabe" data-notiz="allgemein" rows="8" style="min-height:180px" aria-label="Allgemeine Notizen">${esc(notizen.allgemein || "")}</textarea></div>
          </div></section>
        </div></div></div>`;
  }

  /* ================================================================
     ANSICHT: Vorlagen
     ================================================================ */
  function ansichtVorlagen() {
    const gruppen = PHASEN.filter((ph) => ph.dokumente.length || (ph.mails || []).length);
    const gesehen = new Set();
    return `<div class="seite">
      <header class="kopf"><div><p class="eyebrow">Vorlagen</p><h1>Formulare & Mails</h1>
        <p class="unter">Alle Unterlagen nach Phase sortiert. Formulare öffnen sich zum Drucken bzw. in Word, Mails mit Vorschau.</p></div></header>
      ${gruppen.map((ph) => {
        const doks = ph.dokumente.filter((d) => !gesehen.has(d.datei)); doks.forEach((d) => gesehen.add(d.datei));
        const mails = (ph.mails || []).map((id) => window.MAILVORLAGEN.find((m) => m.id === id)).filter(Boolean);
        if (!doks.length && !mails.length) return "";
        return `<section class="vorlagen-gruppe"><div><span class="nr">${zwei(ph.nr)}</span><h2>${esc(ph.titel)}</h2></div>
          <div>${mails.length ? `<div class="mails" style="max-width:560px;margin-bottom:${doks.length ? 18 : 0}px">${mails.map((m) => mailKnopf(m)).join("")}</div>` : ""}
          ${doks.length ? `<div class="doks">${doks.map(dokKachel).join("")}</div>` : ""}</div></section>`;
      }).join("")}</div>`;
  }

  /* ================================================================
     ANSICHT: Einrichtung
     ================================================================ */
  function ansichtEinrichtung() {
    const c = cfg();
    const f = (pfad, label, wert, typ = "text") => `<div class="feld"><label for="c-${pfad}">${label}</label><input class="eingabe" id="c-${pfad}" type="${typ}" data-cfg="${pfad}" value="${esc(wert)}"></div>`;
    const rollen = [...new Set([...window.FIRMA.team.map((t) => t.rolle), ...c.team.map((t) => t.rolle)])];
    const demo = alle().some((p) => p.demo);
    const st = Store.dateiStatus;
    return `<div class="seite">
      <header class="kopf"><div><p class="eyebrow">Einrichtung</p><h1>Ihre Firma.</h1>
        <p class="unter">Hier wird das Dashboard auf einen Betrieb eingestellt. Namen und Programme landen automatisch im Ablauf-Handbuch, in den Checklisten und in den Mails.</p></div>
        <div class="kopf-aktionen"><button class="btn jetzt" data-aktion="cfg-speichern">Übernehmen</button></div></header>
      <div class="einr">
        <section class="kasten"><h3>Daten & Speicherort</h3>
          <p>${st === "verbunden" ? `Verbunden mit der Datendatei <b>${esc(Store.dateiName)}</b>. Jede Änderung wird dort gespeichert; Änderungen der Kolleg:innen werden alle 20 Sekunden übernommen.`
            : Store.dateiMoeglich ? "Die Projekte liegen gerade nur in diesem Browser. Für das ganze Büro: eine Datendatei auf dem Netzlaufwerk anlegen — alle, die das Dashboard öffnen und dieselbe Datei verbinden, sehen dieselben Projekte."
            : "Dieser Browser kann keine Datendatei verbinden — die Projekte liegen nur hier. Für das Büro Chrome oder Edge verwenden. Bis dahin regelmäßig sichern."}</p>
          <div class="aktionen">
            ${Store.dateiMoeglich ? (st === "verbunden" ? `<button class="btn" data-aktion="datei-trennen">Datei trennen</button>`
              : `<button class="btn voll" data-aktion="datei-neu">Neue Datendatei anlegen</button><button class="btn" data-aktion="datei-oeffnen">Vorhandene Datei verbinden</button>${st === "getrennt" ? `<button class="btn jetzt" data-aktion="datei-wieder">Wieder verbinden</button>` : ""}`) : ""}
            <button class="btn" data-aktion="export">Sicherung herunterladen</button>
            <label class="btn">Sicherung einspielen<input type="file" accept=".json,application/json" data-aktion="import" hidden></label>
            ${demo ? `<button class="btn still gefahr" data-aktion="demo-weg">Beispielprojekte entfernen</button>` : `<button class="btn still" data-aktion="demo">Beispielprojekte laden</button>`}
          </div></section>

        <section class="kasten"><h3>Firma</h3><div class="felder drei">
          ${f("name", "Firmenname", c.name)}${f("kurzname", "Kurzname (in Mails)", c.kurzname)}${f("bereich", "Untertitel", c.bereich)}
          ${f("adresse.strasse", "Straße", c.adresse.strasse)}${f("adresse.ort", "PLZ & Ort", c.adresse.ort)}${f("adresse.mapsLink", "Google-Maps-Link", c.adresse.mapsLink, "url")}
          ${f("telefon", "Telefon", c.telefon)}${f("email", "E-Mail", c.email, "email")}${f("website", "Website", c.website)}
          ${f("kundenPostfach", "Postfach für Kundenmails", c.kundenPostfach, "email")}${f("logo", "Logo-Datei (im Ordner)", c.logo)}
        </div></section>

        <section class="kasten"><h3>Farben</h3><p>Eine Grundfarbe für Schrift und Leiste, ein Akzent für „jetzt dran". Mehr braucht es nicht.</p>
          <div class="felder drei">
            <div class="feld"><span>Grundfarbe</span><div class="farbe"><input type="color" data-cfg="farben.tinte" value="${esc(c.farben.tinte)}" aria-label="Grundfarbe"><code>${esc(c.farben.tinte)}</code></div></div>
            <div class="feld"><span>Akzent</span><div class="farbe"><input type="color" data-cfg="farben.akzent" value="${esc(c.farben.akzent)}" aria-label="Akzentfarbe"><code>${esc(c.farben.akzent)}</code></div></div>
          </div></section>

        <section class="kasten"><h3>Team</h3><p>Rollen steuern, wer im Handbuch genannt wird. Das Kürzel steht hinter dem Kundenordner und in der Projektliste.</p>
          <table class="team-tabelle"><thead><tr><th>Rolle</th><th>Bezeichnung</th><th>Name</th><th>Kürzel</th><th></th></tr></thead>
          <tbody id="team">${c.team.map((m, i) => `<tr data-i="${i}">
            <td><select class="eingabe" data-team="rolle">${opt(rollen, m.rolle)}</select></td>
            <td><input class="eingabe" data-team="bezeichnung" value="${esc(m.bezeichnung)}"></td>
            <td><input class="eingabe" data-team="name" value="${esc(m.name)}"></td>
            <td><input class="eingabe" data-team="kuerzel" value="${esc(m.kuerzel)}" style="max-width:80px"></td>
            <td><button class="btn still" data-aktion="team-weg" data-i="${i}" aria-label="Entfernen">✕</button></td></tr>`).join("")}</tbody></table>
          <div class="aktionen"><button class="btn klein" data-aktion="team-neu">+ Person</button></div></section>

        <section class="kasten"><h3>Programme & Ablage</h3><div class="felder drei">
          ${Object.entries(c.programme).map(([k, v]) => f("programme." + k, { erp: "Warenwirtschaft / ERP", cad: "Badplanung (CAD)", cloud: "Render-Cloud", app3d: "3D-App für Kunden", laufwerk: "Netzlaufwerk", badrechner: "Kostenrechner" }[k] || k, v)).join("")}
          ${Object.entries(c.ordner).map(([k, v]) => f("ordner." + k, { anfragen: "Ordner Anfragen", muster: "Muster-Ordner", auftraege: "Ordner Aufträge" }[k] || k, v)).join("")}
        </div></section>

        <section class="kasten"><h3>Fristen</h3><p>Steuern, wann etwas unter „Heute" auftaucht (in Tagen).</p><div class="felder drei">
          ${f("fristen.erinnerungVorErstgespraech", "Fotos/Maße nachfragen — Tage vor Erstgespräch", c.fristen.erinnerungVorErstgespraech, "number")}
          ${f("fristen.angebotsverfolgung", "Angebotsverfolgung — Tage nach Besprechung", c.fristen.angebotsverfolgung, "number")}
          ${f("fristen.freigabeNachMaterialauswahl", "Freigabe senden — Tage nach Materialauswahl", c.fristen.freigabeNachMaterialauswahl, "number")}
          ${f("fristen.kundenerinnerungVorBaustart", "Kundenerinnerung — Tage vor Baustart", c.fristen.kundenerinnerungVorBaustart, "number")}
        </div></section>

        <section class="kasten"><h3>Für eine andere Firma übernehmen</h3>
          <p>Einstellungen übernehmen, dann hier als <code>firma.js</code> herunterladen und die Datei im Ordner <code>einstellungen/</code> ersetzen — so ist es die neue Grundeinstellung. Ablauf und Mailtexte stehen in <code>einstellungen/ablauf.js</code> und <code>mailvorlagen.js</code>; die Anleitung liegt in <code>ANLEITUNG.md</code>.</p>
          <div class="aktionen"><button class="btn" data-aktion="cfg-datei">firma.js herunterladen</button><button class="btn still gefahr" data-aktion="cfg-reset">Auf Grundeinstellung zurücksetzen</button></div></section>
      </div></div>`;
  }
  function cfgSammeln() {
    const c = JSON.parse(JSON.stringify(cfg()));
    for (const el of $$("[data-cfg]")) {
      const pfad = el.dataset.cfg.split(".");
      let ziel = c; while (pfad.length > 1) ziel = ziel[pfad.shift()];
      ziel[pfad[0]] = el.type === "number" ? Number(el.value) || 0 : el.value.trim();
    }
    c.team = $$("#team tr").map((tr) => Object.fromEntries($$("[data-team]", tr).map((el) => [el.dataset.team, el.value.trim()]))).filter((m) => m.name || m.kuerzel);
    return c;
  }

  /* ---------- Beispielprojekte ---------- */
  function demoLaden() {
    const t = (n, h) => { const d = plusTage(new Date(), n); return h ? `${isoTag(d)}T${h}` : isoTag(d); };
    const pl = leute("badplanung").map((m) => m.kuerzel);
    const mk = (d, phaseNr, haken) => {
      const p = neuesProjekt({ demo: true, ...d, phase: phaseNr });
      p.erledigt = {};
      for (const ph of PHASEN) if (ph.nr < phaseNr) ph.aufgaben.forEach((_, i) => (p.erledigt[`${ph.nr}:${i}`] = true));
      (haken || []).forEach((k) => (p.erledigt[k] = true));
    };
    mk({ anrede: "Familie", nachname: "Beispiel", ort: "71134 Aidlingen", telefon: "07031 000000", email: "familie@beispiel.de", zustaendig: pl[0] || "", quelle: "Website / Badrechner", notiz: "Komplettsanierung, bodengleiche Dusche statt Wanne.", termine: { anfrageAm: t(-4), erstgespraech: t(2, "10:00") } }, 2, ["2:0"]);
    mk({ anrede: "Frau", vorname: "Anna", nachname: "Muster", ort: "71083 Herrenberg", email: "anna@beispiel.de", zustaendig: pl[1] || pl[0] || "", projektnr: "B-2026-031", termine: { anfrageAm: t(-30), erstgespraech: t(-21, "14:00"), angebotsbesprechung: t(-9, "16:00") } }, 5, ["5:0"]);
    mk({ anrede: "Herr und Frau", nachname: "Probst", ort: "71032 Böblingen", email: "probst@beispiel.de", zustaendig: pl[0] || "", projektnr: "B-2026-027", downloadCode: "", termine: { anfrageAm: t(-60), erstgespraech: t(-50, "10:00"), angebotsbesprechung: t(-38, "15:00"), baustellenbesichtigung: t(-25, "09:00"), materialauswahl: t(-4, "13:30") } }, 8);
    mk({ anrede: "Herr", vorname: "Jonas", nachname: "Vorlage", ort: "71101 Schönaich", email: "jonas@beispiel.de", zustaendig: pl[1] || pl[0] || "", projektnr: "B-2026-019", termine: { anfrageAm: t(-90), erstgespraech: t(-80, "10:00"), angebotsbesprechung: t(-70, "17:00"), baustellenbesichtigung: t(-60, "08:30"), materialauswahl: t(-45, "10:00"), freigabeGesendet: t(-40), baustart: t(5) } }, 10, ["10:0", "10:1", "10:2"]);
    mk({ anrede: "Familie", nachname: "Testfeld", ort: "71093 Weil im Schönbuch", zustaendig: pl[0] || "", projektnr: "B-2026-011", termine: { anfrageAm: t(-120), baustart: t(-16), abnahme: t(-2, "11:00") } }, 12, ["12:0"]);
    Store.speichern();
  }

  /* ================================================================
     Router & Rendern
     ================================================================ */
  function route() {
    const teile = (location.hash.replace(/^#\/?/, "") || "heute").split("/");
    return { name: teile[0], arg: teile[1] };
  }
  function render() {
    anwenden();
    const r = route();
    const main = $("#main");
    const html =
      r.name === "projekte" ? ansichtProjekte() :
      r.name === "projekt" ? ansichtProjekt(r.arg) :
      r.name === "ablauf" ? ansichtAblauf(Number(r.arg) || null) :
      r.name === "vorlagen" ? ansichtVorlagen() :
      r.name === "einrichtung" ? ansichtEinrichtung() : ansichtHeute();
    main.innerHTML = html;
    const navName = r.name === "projekt" ? "projekte" : r.name;
    $$(".nav a").forEach((a) => {
      if (a.dataset.nav === navName) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    renderSpeicher();
  }
  function renderSpeicher() {
    const el = $("#speicher");
    const st = Store.dateiStatus;
    el.innerHTML = st === "verbunden"
      ? `<span class="punkt an"></span>Gespeichert in <b>${esc(Store.dateiName)}</b>`
      : st === "getrennt"
        ? `<span class="punkt warn"></span>Datendatei getrennt<br><button class="btn hell klein" data-aktion="datei-wieder">Wieder verbinden</button>`
        : st === "fehler"
          ? `<span class="punkt warn"></span>Datei nicht erreichbar — Änderungen bleiben im Browser`
          : `<span class="punkt"></span>Gespeichert in diesem Browser<br><a href="#/einrichtung" style="color:#fff">Für das Büro einrichten →</a>`;
  }

  /* ---------- Ereignisse (alles per Delegation, kein Inline-JS) ---------- */
  document.addEventListener("click", async (e) => {
    const a = e.target.closest("[data-aktion]");
    if (!a || a.closest("#dlg")) return;
    const akt = a.dataset.aktion;
    const pid = $("[data-projekt]")?.dataset.projekt;
    const p = pid ? finde(pid) : null;

    if (akt === "neu") return neuDialog();
    if (akt === "mail") return mailDialog(a.dataset.mail, a.dataset.id);
    if (akt === "drucken") return window.print();
    if (akt === "demo") { demoLaden(); toast("Beispielprojekte geladen"); location.hash = "#/heute"; return render(); }
    if (akt === "demo-weg") {
      if (!confirm("Alle Beispielprojekte entfernen?")) return;
      Store.daten.projekte.filter((x) => x.demo).forEach((x) => { x.geloescht = true; x.geaendert = Date.now(); });
      Store.speichern(); toast("Beispiele entfernt"); return render();
    }
    if (akt === "zeige-phase" && p) {
      ansichtPhase = { id: p.id, nr: Number(a.dataset.nr) };
      $("#phase-blatt").innerHTML = phaseBlatt(p, ansichtPhase.nr);
      $("#akte-kopf").innerHTML = akteKopf(p);
      return;
    }
    if (akt === "weiter" && p) {
      const n = naechsteNr(p.phase);
      aendern(p, (x) => { x.phase = n; }, `Phase ${zwei(n)} „${phase(n).titel}" begonnen`);
      ansichtPhase = { id: p.id, nr: n };
      toast(`Weiter mit ${phase(n).titel}`);
      render(); window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (akt === "setze-phase" && p) {
      const n = Number(a.dataset.nr);
      aendern(p, (x) => { x.phase = n; if (x.status === "abgeschlossen") x.status = "aktiv"; }, `Auf Phase ${zwei(n)} „${phase(n).titel}" gesetzt`);
      ansichtPhase = { id: p.id, nr: n };
      return render();
    }
    if (akt === "abschliessen" && p) {
      aendern(p, (x) => { x.status = "abgeschlossen"; }, "Projekt abgeschlossen");
      toast("Projekt abgeschlossen"); return render();
    }
    if (akt === "loeschen" && p) {
      if (!confirm(`Projekt „${anzeigeName(p)}" wirklich löschen?`)) return;
      aendern(p, (x) => { x.geloescht = true; });
      location.hash = "#/projekte"; return;
    }

    /* Einrichtung */
    if (akt === "cfg-speichern") {
      Store.daten.einstellungen = cfgSammeln(); Store.daten.einstellungenGeaendert = Date.now();
      Store.speichern(); toast("Einstellungen übernommen"); return render();
    }
    if (akt === "cfg-reset") {
      if (!confirm("Alle Änderungen aus der Einrichtung verwerfen und firma.js verwenden?")) return;
      Store.daten.einstellungen = null; Store.daten.einstellungenGeaendert = Date.now();
      Store.speichern(); return render();
    }
    if (akt === "cfg-datei") {
      const c = cfgSammeln();
      return herunterladen("firma.js", `/* Firma — erzeugt mit dem Bad-Dashboard am ${fDatum(new Date())}.\n   Ersetzt einstellungen/firma.js. */\n\nwindow.FIRMA = ${JSON.stringify(c, null, 2)};\n`, "text/javascript");
    }
    if (akt === "team-neu") {
      const tb = $("#team"); const i = tb.children.length;
      const rollen = [...new Set(cfg().team.map((t) => t.rolle))];
      tb.insertAdjacentHTML("beforeend", `<tr data-i="${i}"><td><select class="eingabe" data-team="rolle">${opt(rollen, "badplanung")}</select></td>
        <td><input class="eingabe" data-team="bezeichnung" placeholder="z. B. Badplanerin"></td><td><input class="eingabe" data-team="name" placeholder="Vor- und Nachname"></td>
        <td><input class="eingabe" data-team="kuerzel" style="max-width:80px"></td><td><button class="btn still" data-aktion="team-weg" aria-label="Entfernen">✕</button></td></tr>`);
      return;
    }
    if (akt === "team-weg") return a.closest("tr").remove();
    if (akt === "export") return herunterladen(`bad-dashboard-sicherung-${isoTag(new Date())}.json`, Store.exportText());
    try {
      if (akt === "datei-neu") { await Store.dateiNeu(); toast("Datendatei angelegt"); return render(); }
      if (akt === "datei-oeffnen") { await Store.dateiOeffnen(); toast("Datendatei verbunden"); return render(); }
      if (akt === "datei-wieder") { await Store.dateiWiederverbinden(); return render(); }
      if (akt === "datei-trennen") { await Store.dateiTrennen(); return render(); }
    } catch (err) { if (err.name !== "AbortError") toast("Hat nicht geklappt: " + err.message); }
  });

  document.addEventListener("change", (e) => {
    const el = e.target;
    if (el.closest("#dlg")) return;
    const pid = $("[data-projekt]")?.dataset.projekt;
    const p = pid ? finde(pid) : null;

    if (el.dataset.aktion === "haken" && p) {
      const k = el.dataset.key;
      aendern(p, (x) => { if (el.checked) x.erledigt[k] = true; else delete x.erledigt[k]; });
      const offen = $(".phase-teil .teil-titel"); if (offen) { const nr = Number(k.split(":")[0]); offen.textContent = `Checkliste · ${erledigtAnzahl(p, nr)} von ${phase(nr).aufgaben.length}`; }
      const fuss = $(".phase-fuss small"); if (fuss && Number(k.split(":")[0]) === p.phase) { const ph = phase(p.phase); const f = erledigtAnzahl(p, p.phase); fuss.textContent = f === ph.aufgaben.length ? "Alles abgehakt." : `Noch ${ph.aufgaben.length - f} offen.`; }
      return;
    }
    if (el.dataset.feld && p) {
      const k = el.dataset.feld; const alt = p[k];
      aendern(p, (x) => { x[k] = el.value.trim(); }, k === "status" ? `Status: ${STATUS.find((s) => s.id === el.value)?.label}` : null);
      if (["anrede", "vorname", "nachname", "strasse", "ort", "telefon", "mobil", "email", "projektnr", "zustaendig", "status"].includes(k) && alt !== el.value) $("#akte-kopf").innerHTML = akteKopf(p);
      if (k === "status") $("#phase-blatt").innerHTML = phaseBlatt(p, ansichtPhase.nr);
      return;
    }
    if (el.dataset.termin && p) {
      const def = TERMINE.find((t) => t.key === el.dataset.termin);
      aendern(p, (x) => { if (el.value) x.termine[def.key] = el.value; else delete x.termine[def.key]; }, el.value ? `${def.label}: ${fTermin(el.value)}` : `${def.label} entfernt`);
      return;
    }
    if (el.dataset.filter) { filter[el.dataset.filter] = el.value; $("#projektliste").innerHTML = projektListe(); return; }
    if (el.dataset.aktion === "import" && el.files[0]) {
      el.files[0].text().then((t) => { Store.importieren(t); toast("Sicherung eingespielt"); render(); }).catch((err) => toast("Fehler: " + err.message));
    }
    if (el.type === "color") el.nextElementSibling.textContent = el.value;
  });

  let notizTimer;
  document.addEventListener("input", (e) => {
    const el = e.target;
    if (el.dataset.filter === "suche") { filter.suche = el.value; $("#projektliste").innerHTML = projektListe(); return; }
    if (el.dataset.notiz) {
      clearTimeout(notizTimer);
      notizTimer = setTimeout(() => {
        Store.daten.notizen = { ...(Store.daten.notizen || {}), [el.dataset.notiz]: el.value };
        Store.daten.notizenGeaendert = Date.now(); Store.speichern();
      }, 500);
    }
    if (el.type === "color") {
      document.documentElement.style.setProperty(el.dataset.cfg === "farben.tinte" ? "--tinte" : "--akzent", el.value);
      el.nextElementSibling.textContent = el.value;
    }
  });

  /* fehlendes Vorschaubild → schlichtes Papier statt kaputtem Bild */
  document.addEventListener("error", (e) => { if (e.target.classList && e.target.classList.contains("dok-thumb")) e.target.remove(); }, true);

  window.addEventListener("hashchange", () => {
    render();
    const r = route();
    if (r.name === "ablauf" && r.arg) { const z = document.getElementById("phase-" + r.arg); if (z) z.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }
    else window.scrollTo(0, 0);
    $("#main").focus({ preventScroll: true });
  });

  /* Abgleich mit der Datendatei: bei Fokus und alle 20 Sekunden */
  const beschaeftigt = () => $("#dlg").open || (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName));
  async function abgleich() { if (await Store.abgleichen() && !beschaeftigt()) render(); }
  window.addEventListener("focus", abgleich);
  setInterval(abgleich, 20000);
  Store.beobachten(renderSpeicher);

  Store.start().then(() => {
    render();
    const r = route();
    if (r.name === "ablauf" && r.arg) document.getElementById("phase-" + r.arg)?.scrollIntoView();
  });
})();
