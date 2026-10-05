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
        const zeilen = f.zeilen ? f.zeilen.map((z, i) => ({ label: z, r: rows[i] || {}, i })) : rows.map((r, i) => ({ r, i }));
        const zelle = (s, r, i) => {
          const val = r[s.id];
          const a = `data-tab="${esc(f.id)}" data-zeile="${i}" data-spalte="${esc(s.id)}"`;
          if (s.typ === "haken") return `<td class="mitte"><input type="checkbox" class="haken" ${a}${val ? " checked" : ""} aria-label="${esc(s.titel)}"></td>`;
          if (s.typ === "janein") return `<td><select class="eingabe" ${a}><option value=""></option><option value="ja"${val === "ja" ? " selected" : ""}>ja</option><option value="nein"${val === "nein" ? " selected" : ""}>nein</option></select></td>`;
          return `<td><input class="eingabe" ${a} value="${esc(val)}"${s.typ === "zahl" ? ' inputmode="decimal"' : ""} aria-label="${esc(s.titel)}"></td>`;
        };
        return wrap(`${lab}<div class="tab-wrap"><table class="ff-tab"><thead><tr>${f.zeilen ? "<th></th>" : ""}${f.spalten.map((s) => `<th>${esc(s.titel)}</th>`).join("")}${f.zeilen ? "" : "<th></th>"}</tr></thead>
          <tbody>${zeilen.map(({ label, r, i }) => `<tr>${label ? `<th scope="row">${esc(label)}</th>` : ""}${f.spalten.map((s) => zelle(s, r, i)).join("")}${f.zeilen ? "" : `<td class="mitte"><button type="button" class="btn klein still" data-tab-weg="${esc(f.id)}" data-zeile="${i}" aria-label="Zeile entfernen">✕</button></td>`}</tr>`).join("")}</tbody></table></div>
          ${f.zeilen ? "" : `<button type="button" class="btn klein" data-tab-neu="${esc(f.id)}">+ Zeile</button>`}`, "breit-tab");
      }
      case "checkliste": {
        const o = v || {};
        return wrap(`${lab}<ul class="ff-check">${f.punkte.map((pt) => {
          const e = o[pt.id] || {};
          const knoepfe = f.modus === "pruefung"
            ? `<div class="seg klein">${[["ok", "In Ordnung"], ["mangel", "Mangel"], ["entfaellt", "Entfällt"]].map(([k, l]) => `<button type="button" class="seg-k${e.s === k ? " an " + k : ""}" data-check="${esc(f.id)}" data-punkt="${esc(pt.id)}" data-wert="${k}">${l}</button>`).join("")}</div>`
            : `<button type="button" class="haken-k${e.s ? " an" : ""}" data-check="${esc(f.id)}" data-punkt="${esc(pt.id)}" data-wert="toggle" aria-pressed="${!!e.s}"><span></span></button>`;
          const offen = ctx.zeigeFehler && f.pflicht && !pt.optional && !e.s;
          return `<li class="${e.s === "mangel" ? "mangel" : ""}${offen ? " fehlt" : ""}">${f.modus === "pruefung" ? "" : knoepfe}<span class="ck-label">${esc(pt.label)}${pt.optional ? ' <small>(bei Bedarf)</small>' : ""}</span>${f.modus === "pruefung" ? knoepfe : ""}
            <input class="eingabe ck-notiz" placeholder="Notiz (optional)" data-check-notiz="${esc(f.id)}" data-punkt="${esc(pt.id)}" value="${esc(e.n || "")}"></li>`;
        }).join("")}</ul>`, "breit-tab");
      }
    }
    return "";
  }

  function editor(id, p, ctx) {
    const d = def(id); def.aktuell = d;
    const w = werteVon(p, id);
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
    const teile = d.felder.filter((f) => sichtbar(f, w, p)).map((f) => {
      const v = wert(p, f, w);
      if (f.typ === "abschnitt") return `<h3>${esc(f.titel)}</h3>`;
      if (f.typ === "tabelle") {
        const rows = Array.isArray(v) ? v : [];
        const zeilen = f.zeilen ? f.zeilen.map((z, i) => ({ label: z, r: rows[i] || {} })) : rows.map((r) => ({ r }));
        if (!zeilen.length) return `<div class="d-zeile"><b>${esc(f.label)}</b><span class="d-leer">keine Einträge</span></div>`;
        return `<table class="d-tab"><thead><tr>${f.zeilen ? "<th></th>" : ""}${f.spalten.map((s) => `<th>${esc(s.titel)}</th>`).join("")}</tr></thead><tbody>${zeilen.map(({ label, r }) => `<tr>${label ? `<th>${esc(label)}</th>` : ""}${f.spalten.map((s) => `<td>${s.typ === "haken" ? (r[s.id] ? "✓" : "") : esc(r[s.id] || "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
      }
      if (f.typ === "checkliste") {
        const o = v || {};
        const txt = { true: "✓", ok: "in Ordnung", mangel: "MANGEL", entfaellt: "entfällt" };
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
