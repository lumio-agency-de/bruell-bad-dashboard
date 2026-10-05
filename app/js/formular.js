/* Digitale Formulare: Darstellung, Pflichtprüfung, Druckfassung.
   Die Definitionen stehen in einstellungen/formulare.js. */

(function () {
  "use strict";

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const BREITE = { halb: 3, drittel: 2 };
  const ANREDEN = ["Herr", "Frau", "Herr und Frau", "Familie"];

  const def = (id) => window.FORMULARE[id];
  const werteVon = (p, id) => ((p.formulare || {})[id] || {}).werte || {};

  function wert(p, f, w) {
    if (f.typ === "kunde") return (p.kunde || {})[f.feld] || "";
    return w[f.id];
  }

  function sichtbar(f, w, p) {
    if (!f.wenn) return true;
    const ref = def.aktuell && def.aktuell.felder.find((x) => x.id === f.wenn.feld);
    const v = ref ? wert(p, ref, w) : w[f.wenn.feld];
    return Array.isArray(v) ? v.includes(f.wenn.wert) : v === f.wenn.wert;
  }

  function gefuellt(f, v, p, dateien) {
    switch (f.typ) {
      case "abschnitt": return true;
      case "mehrfach": return Array.isArray(v) && v.length > 0;
      case "dateien": return dateien.filter((d) => d.kategorie === f.kategorie).length > 0;
      case "tabelle": {
        if (!Array.isArray(v)) return false;
        if (f.zeilen) return v.some((r) => r && Object.values(r).some((x) => x !== "" && x != null && x !== false));
        return v.length > 0;
      }
      case "checkliste": {
        const o = v || {};
        return f.punkte.filter((pt) => !pt.optional).every((pt) => o[pt.id] && o[pt.id].s);
      }
      default: return v !== undefined && v !== null && String(v).trim() !== "";
    }
  }

  /* Status eines Formulars: wie viele Pflichtfelder sind erfüllt? */
  function status(id, p, dateien = []) {
    const d = def(id); def.aktuell = d;
    const w = werteVon(p, id);
    const pflicht = d.felder.filter((f) => f.pflicht && sichtbar(f, w, p));
    const fehlend = pflicht.filter((f) => !gefuellt(f, f.typ === "kunde" ? wert(p, f, w) : w[f.id], p, dateien));
    let extra = true;
    if (d.erledigtWenn === "alleHaken") {
      const t = d.felder.find((f) => f.typ === "tabelle");
      const rows = Array.isArray(w[t.id]) ? w[t.id] : [];
      extra = rows.every((r) => r.erledigt);
      if (!extra) fehlend.push({ label: `${rows.filter((r) => !r.erledigt).length} offene Restarbeiten` });
    }
    const begonnen = Object.keys(w).length > 0;
    return { gesamt: pflicht.length, ok: pflicht.length - fehlend.filter((f) => f.id).length, fehlend, vollstaendig: fehlend.length === 0 && (begonnen || pflicht.length > 0) && extra, begonnen };
  }

  /* ---------------- Editor ---------------- */
  function feldHtml(f, p, w, ctx) {
    if (!sichtbar(f, w, p)) return "";
    const span = BREITE[f.breite] || 6;
    const v = wert(p, f, w);
    const fehlt = ctx.zeigeFehler && f.pflicht && f.typ !== "checkliste" && !gefuellt(f, v, p, ctx.dateien);
    const lab = f.label ? `<span class="ff-label">${esc(f.label)}${f.pflicht ? ' <i class="pf" title="Pflichtfeld">•</i>' : ""}</span>` : "";
    const wrap = (inner, cls = "") => `<div class="ff${fehlt ? " fehlt" : ""} ${cls}" style="--span:${span}" data-feld-box="${esc(f.id)}">${inner}${fehlt ? '<span class="ff-fehlt-text">Pflichtfeld – bitte ausfüllen</span>' : ""}</div>`;
    const attr = `data-ff="${esc(f.id)}"`;

    switch (f.typ) {
      case "abschnitt":
        return `<h3 class="ff-abschnitt" id="abs-${esc(f.titel.replace(/\W+/g, "-"))}">${esc(f.titel)}</h3>`;
      case "text": case "zahl": case "datum":
        return wrap(`<label>${lab}<span class="ff-eingabe-wrap"><input class="eingabe" ${attr} type="${f.typ === "zahl" ? "number" : f.typ === "datum" ? "date" : "text"}" value="${esc(v)}"${f.typ === "zahl" ? ' inputmode="decimal" step="any"' : ""}>${f.einheit ? `<span class="einheit">${esc(f.einheit)}</span>` : ""}</span></label>`);
      case "textarea":
        return wrap(`<label>${lab}<textarea class="eingabe" ${attr} rows="3">${esc(v)}</textarea></label>`);
      case "kunde":
        if (f.feld === "anrede") return wrap(`<label>${lab}<select class="eingabe" ${attr} data-kunde="anrede">${ANREDEN.map((a) => `<option${a === v ? " selected" : ""}>${a}</option>`).join("")}</select></label>`);
        return wrap(`<label>${lab}<input class="eingabe" ${attr} data-kunde="${esc(f.feld)}" type="${f.feld === "email" ? "email" : /telefon|mobil/i.test(f.feld) ? "tel" : "text"}" value="${esc(v)}"></label>`);
      case "janein":
        return wrap(`${lab}<div class="seg" role="radiogroup">${["ja", "nein"].map((o) => `<button type="button" class="seg-k${v === o ? " an" : ""}" data-ff-wahl="${esc(f.id)}" data-wert="${o}" role="radio" aria-checked="${v === o}">${o === "ja" ? "Ja" : "Nein"}</button>`).join("")}</div>`);
      case "auswahl":
        return wrap(`${lab}<div class="chips" role="radiogroup">${f.optionen.map((o) => `<button type="button" class="chip${v === o ? " an" : ""}" data-ff-wahl="${esc(f.id)}" data-wert="${esc(o)}" role="radio" aria-checked="${v === o}">${esc(o)}</button>`).join("")}</div>`);
      case "mehrfach": {
        const arr = Array.isArray(v) ? v : [];
        return wrap(`${lab}<div class="chips">${f.optionen.map((o) => `<button type="button" class="chip mehr${arr.includes(o) ? " an" : ""}" data-ff-mehr="${esc(f.id)}" data-wert="${esc(o)}" aria-pressed="${arr.includes(o)}">${esc(o)}</button>`).join("")}</div>`);
      }
      case "dateien":
        return wrap(`${lab}${ctx.ablage(f.kategorie, true)}`);
      case "unterschrift":
        return wrap(`${lab}<div class="sign${v ? " voll" : ""}" data-sign="${esc(f.id)}">
          <canvas width="900" height="260" aria-label="Unterschriftenfeld"></canvas>
          ${v ? `<img src="${esc(v)}" alt="Unterschrift">` : `<span class="sign-hinweis">Hier unterschreiben – mit Finger, Stift oder Maus</span>`}
          <button type="button" class="btn klein still" data-sign-weg="${esc(f.id)}">Löschen</button></div>`);
      case "tabelle": {
        const rows = Array.isArray(v) ? v : [];
        const fest = f.zeilen ? f.zeilen.length : 0;
        const zeilen = f.zeilen
          ? [...f.zeilen.map((z, i) => ({ label: z, r: rows[i] || {}, i })), ...rows.slice(fest).map((r, k) => ({ eigen: true, r: r || {}, i: fest + k }))]
          : rows.map((r, i) => ({ r, i }));
        const zelle = (s, r, i) => {
          const val = r[s.id];
          const a = `data-tab="${esc(f.id)}" data-zeile="${i}" data-spalte="${esc(s.id)}"`;
          if (s.typ === "haken") return `<td class="mitte"><input type="checkbox" class="haken" ${a}${val ? " checked" : ""} aria-label="${esc(s.titel)}"></td>`;
          if (s.typ === "janein") return `<td><select class="eingabe" ${a}><option value=""></option><option value="ja"${val === "ja" ? " selected" : ""}>ja</option><option value="nein"${val === "nein" ? " selected" : ""}>nein</option></select></td>`;
          return `<td><input class="eingabe" ${a} value="${esc(val)}"${s.typ === "zahl" ? ' inputmode="decimal"' : ""} aria-label="${esc(s.titel)}"></td>`;
        };
        return wrap(`${lab}<div class="tab-wrap"><table class="ff-tab"><thead><tr>${f.zeilen ? "<th></th>" : ""}${f.spalten.map((s) => `<th>${esc(s.titel)}</th>`).join("")}${!f.zeilen || rows.length > fest ? "<th></th>" : ""}</tr></thead>
          <tbody>${zeilen.map(({ label, eigen, r, i }) => `<tr${eigen ? ' class="eigen"' : ""}>${label ? `<th scope="row">${esc(label)}</th>` : eigen ? `<th scope="row"><input class="eingabe" data-tab="${esc(f.id)}" data-zeile="${i}" data-spalte="_label" value="${esc(r._label || "")}" placeholder="Eigene Zeile" aria-label="Bezeichnung"></th>` : ""}${f.spalten.map((s) => zelle(s, r, i)).join("")}${!f.zeilen || eigen ? `<td class="mitte"><button type="button" class="btn klein still" data-tab-weg="${esc(f.id)}" data-zeile="${i}" aria-label="Zeile entfernen">✕</button></td>` : f.zeilen && rows.length > fest ? "<td></td>" : ""}</tr>`).join("")}</tbody></table></div>
          <button type="button" class="btn klein" data-tab-neu="${esc(f.id)}">${f.zeilen ? "+ Eigene Zeile" : "+ Zeile"}</button>`, "breit-tab");
      }
      case "checkliste": {
        const o = v || {};
        return wrap(`${lab}<ul class="ff-check">${f.punkte.map((pt) => {
          const e = o[pt.id] || {};
          if (e.s === true) e.s = "ja"; // ältere Einträge mit Häkchen
          const seg = (opts) => `<div class="seg klein">${opts.map(([k, l]) => `<button type="button" class="seg-k${e.s === k ? " an " + k : ""}" data-check="${esc(f.id)}" data-punkt="${esc(pt.id)}" data-wert="${k}">${l}</button>`).join("")}</div>`;
          const knoepfe = f.modus === "pruefung" ? seg([["ok", "In Ordnung"], ["mangel", "Mangel"], ["entfaellt", "Entfällt"]])
            : f.modus === "janein" ? seg([["ja", "Ja"], ["nein", "Nein"]])
            : `<button type="button" class="haken-k${e.s ? " an" : ""}" data-check="${esc(f.id)}" data-punkt="${esc(pt.id)}" data-wert="toggle" aria-pressed="${!!e.s}"><span></span></button>`;
          const offen = ctx.zeigeFehler && f.pflicht && !pt.optional && !e.s;
          return `<li class="${e.s === "mangel" ? "mangel" : ""}${offen ? " fehlt" : ""}">${f.modus === "haken" || !f.modus ? knoepfe : ""}<span class="ck-label">${esc(pt.label)}${pt.optional ? ' <small>(bei Bedarf)</small>' : ""}</span>${f.modus === "haken" || !f.modus ? "" : knoepfe}
            <input class="eingabe ck-notiz" placeholder="Notiz (optional)" data-check-notiz="${esc(f.id)}" data-punkt="${esc(pt.id)}" value="${esc(e.n || "")}"></li>`;
        }).join("")}</ul>`, "breit-tab");
      }
    }
    return "";
  }

  /* ---------------- Original-Blätter ----------------
     Das Papierformular originalgetreu nachgebaut – mit denselben Daten wie das
     Formular, zum Antippen/Ausfüllen und mit Stift-Ebene zum Zeichnen. */
  const BLAETTER = {
    tuer(p, w, ctx, lesen) {
      const f = ctx.firma, adr = f.adresse || {};
      const kreuz = (feld, wert, text) => {
        const an = w[feld] === wert;
        return lesen ? `<span class="bl-check${an ? " an" : ""}"><i></i>${esc(text)}</span>`
          : `<button type="button" class="bl-check${an ? " an" : ""}" data-ff-wahl="${feld}" data-wert="${esc(wert)}" aria-pressed="${an}"><i></i>${esc(text)}</button>`;
      };
      const zeile = (feld, wert, a, b) => {
        const an = w[feld] === wert;
        return `<tr class="${an ? "an" : ""}"${lesen ? "" : ` data-ff-wahl="${feld}" data-wert="${esc(wert)}" tabindex="0" role="button" aria-pressed="${an}"`}><td>${esc(a)}</td><td>${esc(b)}</td></tr>`;
      };
      const eingabe = (feld, wert, cls = "") => lesen ? `<span class="bl-wert ${cls}">${esc(wert || "")}</span>` : `<input class="bl-eingabe ${cls}" data-ff="${feld}" value="${esc(wert || "")}">`;
      const B = [["62,5–66,5 cm → 61,0 cm", "62,5 cm – 66,5 cm", "61,0 cm"], ["75,0–79,0 cm → 73,5 cm", "75,0 cm – 79,0 cm", "73,5 cm"], ["87,5–91,5 cm → 86,0 cm", "87,5 cm – 91,5 cm", "86,0 cm"], ["100,0–104,0 cm → 98,5 cm", "100,0 cm – 104,0 cm", "98,5 cm"]];
      const H = [["200,0–202,5 cm → 198,5 cm", "200,0 cm – 202,5 cm", "198,5 cm"], ["212,5–215,0 cm → 211,0 cm", "212,5 cm – 215,0 cm", "211,0 cm"]];
      const WS = [["9,0 cm", "9,0 cm – 10,7 cm"], ["12,0 cm", "12,0 cm – 13,7 cm"], ["14,0 cm", "14,0 cm – 15,7 cm"], ["16,0 cm", "16,0 cm – 17,7 cm"], ["20,0 cm", "20,0 cm – 21,7 cm"], ["26,5 cm", "26,5 cm – 28,2 cm"], ["33,0 cm", "33,0 cm – 34,7 cm"]];
      return `<div class="blatt" data-blatt="tuer">
        <div class="bl-seite">
          <header class="bl-kopf"><h4>Angaben zur Türen-Bestellung:</h4><img src="${esc(f.logo)}" alt="" class="bl-logo"></header>
          <div class="bl-reihe"><span>Projektname:</span>${eingabe("blattProjekt", w.blattProjekt ?? ctx.projektName, "linie")}<span>Projektnummer:</span>${eingabe("blattNr", w.blattNr ?? ctx.projektNr, "linie")}</div>
          <div class="bl-reihe oben"><span>Lieferadresse:</span><div class="bl-adresse">${esc(f.name)}<br>${esc(f.bereich || "")}<br>${esc(adr.strasse || "")}<br>${esc(adr.ort || "")}</div></div>
          <div class="bl-mitte">
            <figure class="bl-tuer"><img src="app/img/tuer.jpg" alt="Tür, Höhe und Breite Türblatt"><figcaption>Abbildung DIN links</figcaption></figure>
            <div class="bl-rechts">
              <div class="bl-optionen"><span><u>Anschlag</u>:</span> <span class="bl-stapel">${kreuz("anschlag", "DIN links", "DIN links")}${kreuz("anschlag", "DIN rechts", "DIN rechts")}</span>
                <span><u>mit WC-Riegel</u>:</span> <span class="bl-stapel">${kreuz("riegel", "ja", "ja")}${kreuz("riegel", "nein", "nein")}</span></div>
              <div class="bl-optionen"><span><u>Tür öffnet</u>:</span> ${kreuz("oeffnet", "in Raum / nach innen", "in Raum/nach innen")}${kreuz("oeffnet", "in Flur / nach außen", "in Flur/nach außen")}</div>
              <p class="bl-titel"><u>Angaben zur Breite</u>:</p>
              <table class="bl-tab"><thead><tr><th>Maueröffnung<br>min. – max.</th><th>Türblattaußenmaß<br>B (nach DIN 18101)</th></tr></thead><tbody>${B.map(([v, a, b]) => zeile("breite", v, a, b)).join("")}</tbody></table>
              <p class="bl-titel"><u>Angaben zur Höhe</u>:</p>
              <table class="bl-tab"><thead><tr><th>Maueröffnung<br>min. – max.</th><th>Türblattaußenmaß<br>H (nach DIN 18101)</th></tr></thead><tbody>${H.map(([v, a, b]) => zeile("hoehe", v, a, b)).join("")}</tbody></table>
            </div>
          </div>
          <div class="bl-unten">
            <div><p class="bl-titel"><u>Angaben zur Wandstärke</u>:</p>
              <table class="bl-tab"><thead><tr><th>Normzarge<br>Wandstärke in cm</th><th>Verstellbereich<br>+1,7 cm / von - bis</th></tr></thead><tbody>${WS.map(([v, b]) => zeile("wand", v, v, b)).join("")}</tbody></table></div>
            <div><p class="bl-titel"><u>Farbangaben</u>:</p>
              <table class="bl-tab farbe"><tbody><tr><th>Frontseite</th><td>${eingabe("farbeFront", w.farbeFront)}</td></tr><tr><th>Rückseite</th><td>${eingabe("farbeRueck", w.farbeRueck)}</td></tr></tbody></table></div>
          </div>
          <footer class="bl-fuss"><span>${esc(adr.strasse || "")}<br>${esc(adr.ort || "")}</span><span>Tel. ${esc(f.telefon || "")}</span><span>${esc(f.email || "")}<br>${esc(f.website || "")}</span></footer>
        </div>
        ${w.blattZeichnung ? `<img class="bl-zeichnung" src="${esc(w.blattZeichnung)}" alt="">` : ""}
        ${lesen ? "" : `<canvas class="bl-stift" width="900" height="1273" data-blatt-stift="tuer" aria-label="Zeichenfläche"></canvas>`}
      </div>`;
    },
  };

  function editor(id, p, ctx) {
    const d = def(id); def.aktuell = d;
    const w = werteVon(p, id);
    if (d.blatt) {
      const original = (w._ansicht || "original") === "original";
      const umschalter = `<div class="bl-umschalter"><div class="seg" role="radiogroup" aria-label="Ansicht">${[["original", "Original-Blatt"], ["formular", "Formular"]].map(([k, l]) => `<button type="button" class="seg-k${(w._ansicht || "original") === k ? " an" : ""}" data-ff-wahl="_ansicht" data-wert="${k}">${l}</button>`).join("")}</div>
        ${original ? `<div class="bl-werkzeug" role="toolbar" aria-label="Werkzeuge"><button type="button" class="btn klein an" data-blatt-modus="fuellen">Ausfüllen</button><button type="button" class="btn klein" data-blatt-modus="stift">✎ Stift</button><button type="button" class="btn klein" data-blatt-modus="radierer">Radierer</button><button type="button" class="btn klein still gefahr" data-blatt-leeren="tuer">Zeichnung löschen</button></div>` : ""}</div>`;
      if (original) return `${umschalter}<div class="bl-rahmen">${BLAETTER[d.blatt](p, w, ctx)}</div><div class="ff-raster bl-rest">${d.felder.filter((f) => f.ausserhalbBlatt).map((f) => feldHtml(f, p, w, ctx)).join("")}</div>`;
      return `${umschalter}<div class="ff-raster">${d.felder.map((f) => feldHtml(f, p, w, ctx)).join("")}</div>`;
    }
    const abschnitte = d.felder.filter((f) => f.typ === "abschnitt");
    return `<div class="ff-layout">
      ${abschnitte.length > 2 ? `<nav class="ff-index" aria-label="Abschnitte">${abschnitte.map((a) => `<a href="#abs-${esc(a.titel.replace(/\W+/g, "-"))}" data-sprung>${esc(a.titel)}</a>`).join("")}</nav>` : ""}
      <div class="ff-raster">${d.felder.map((f) => feldHtml(f, p, w, ctx)).join("")}</div></div>`;
  }

  /* Startwerte (Datum aus Termin, heute …) beim ersten Öffnen */
  function vorbelegen(id, p) {
    const d = def(id);
    p.formulare = p.formulare || {};
    const fo = (p.formulare[id] = p.formulare[id] || { werte: {} });
    let geaendert = false;
    for (const f of d.felder) {
      if (!f.vorbelegen || fo.werte[f.id]) continue;
      if (f.vorbelegen === "heute") fo.werte[f.id] = new Date().toISOString().slice(0, 10);
      else if (f.vorbelegen.startsWith("termin:")) { const t = (p.termine || {})[f.vorbelegen.slice(7)]; if (t) fo.werte[f.id] = t.slice(0, 10); }
      if (fo.werte[f.id]) geaendert = true;
    }
    return geaendert;
  }

  /* ---------------- Druckfassung ---------------- */
  function druckWert(f, v, ctx) {
    const leer = '<span class="d-leer">—</span>';
    switch (f.typ) {
      case "janein": return v ? (v === "ja" ? "Ja" : "Nein") : leer;
      case "mehrfach": return Array.isArray(v) && v.length ? esc(v.join(", ")) : leer;
      case "datum": return v ? esc(new Date(v + "T00:00").toLocaleDateString("de-DE")) : leer;
      case "unterschrift": return v ? `<img class="d-sign" src="${esc(v)}" alt="Unterschrift">` : '<span class="d-linie"></span>';
      case "dateien": { const n = ctx.dateien.filter((d) => d.kategorie === f.kategorie); return n.length ? esc(n.map((d) => d.name).join(", ")) : leer; }
      default: return v !== undefined && v !== "" ? esc(v).replace(/\n/g, "<br>") + (f.einheit ? " " + esc(f.einheit) : "") : leer;
    }
  }
  function druck(id, p, ctx) {
    const d = def(id); def.aktuell = d;
    const w = werteVon(p, id);
    if (d.blatt && (w._ansicht || "original") === "original") return `<section class="d-seite d-blatt">${BLAETTER[d.blatt](p, w, ctx, true)}</section>`;
    const teile = d.felder.filter((f) => sichtbar(f, w, p)).map((f) => {
      const v = wert(p, f, w);
      if (f.typ === "abschnitt") return `<h3>${esc(f.titel)}</h3>`;
      if (f.typ === "tabelle") {
        const rows = Array.isArray(v) ? v : [];
        const zeilen = f.zeilen ? [...f.zeilen.map((z, i) => ({ label: z, r: rows[i] || {} })), ...rows.slice(f.zeilen.length).filter((r) => r && Object.values(r).some((x) => x)).map((r) => ({ label: r._label || "Eigene Zeile", r }))] : rows.map((r) => ({ r }));
        if (!zeilen.length) return `<div class="d-zeile"><b>${esc(f.label)}</b><span class="d-leer">keine Einträge</span></div>`;
        return `<table class="d-tab"><thead><tr>${f.zeilen ? "<th></th>" : ""}${f.spalten.map((s) => `<th>${esc(s.titel)}</th>`).join("")}</tr></thead><tbody>${zeilen.map(({ label, r }) => `<tr>${label ? `<th>${esc(label)}</th>` : ""}${f.spalten.map((s) => `<td>${s.typ === "haken" ? (r[s.id] ? "✓" : "") : esc(r[s.id] || "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
      }
      if (f.typ === "checkliste") {
        const o = v || {};
        const txt = { true: "✓", ja: "Ja", nein: "Nein", ok: "in Ordnung", mangel: "MANGEL", entfaellt: "entfällt" };
        return `<table class="d-tab d-check"><tbody>${f.punkte.map((pt) => { const e = o[pt.id] || {}; return `<tr><td>${esc(pt.label)}</td><td class="${e.s === "mangel" ? "d-mangel" : ""}">${e.s ? txt[e.s] : "☐"}</td><td>${esc(e.n || "")}</td></tr>`; }).join("")}</tbody></table>`;
      }
      return `<div class="d-zeile${f.typ === "unterschrift" ? " d-unterschrift" : ""}"><b>${esc(f.label)}</b><span>${druckWert(f, v, ctx)}</span></div>`;
    }).join("");
    return `<section class="d-seite"><header class="d-kopf"><img src="${esc(ctx.firma.logo)}" alt=""><div><strong>${esc(d.titel)}</strong><span>${esc(ctx.kopfzeile)}</span></div></header>
      <div class="d-inhalt">${teile}</div>
      <footer class="d-fuss">${esc(ctx.firma.name)} · ${esc(ctx.firma.adresse.strasse)} · ${esc(ctx.firma.adresse.ort)} · Tel. ${esc(ctx.firma.telefon)} · ${esc(ctx.firma.email)}</footer></section>`;
  }

  window.Formular = { def, werteVon, sichtbar: (f, w, p) => sichtbar(f, w, p), status, editor, vorbelegen, druck, gefuellt };
})();
