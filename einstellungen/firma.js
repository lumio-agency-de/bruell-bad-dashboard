/* ==========================================================================
   FIRMA — Stammdaten, Team und Programme
   --------------------------------------------------------------------------
   Diese Datei ist die Grundeinstellung. Alles hier lässt sich auch direkt im
   Dashboard unter „Einrichtung" ändern — dort Geändertes überschreibt diese
   Werte (gespeichert in der Datendatei bzw. im Browser).

   Für eine neue Firma: Werte ersetzen, Datei speichern, Dashboard neu laden.
   Die Rollen-Kürzel (badberater, badplanung …) werden im Ablauf als
   Platzhalter wie {badberater} verwendet — die Namen hier landen also
   automatisch überall im Handbuch.
   ========================================================================== */

window.FIRMA = {
  name: "Daniel Brüll GmbH",
  kurzname: "Brüll",
  bereich: "Bad & Heizung",
  logo: "app/img/logo.svg",

  adresse: {
    strasse: "Deufringer Str. 19",
    ort: "71134 Aidlingen-Dachtel",
    mapsLink: "https://maps.app.goo.gl/dH1iedYmCXLVH7Aa8",
  },
  telefon: "07056 / 9329666",
  email: "info@daniel-bruell.de",
  website: "www.daniel-bruell.de",

  /* Postfach, aus dem Kundenmails rausgehen (Terminbestätigung etc.) */
  kundenPostfach: "schoenebaeder@daniel-bruell.de",

  /* Farben: Schrift/Flächen (tinte) und EIN Akzent für „jetzt dran" */
  farben: {
    tinte: "#042461",
    akzent: "#E99033",
  },

  /* Team nach Rollen. kuerzel = steht hinter dem Kundenordner (z. B. „Müller KK") */
  team: [
    { rolle: "badberater",      bezeichnung: "Badberater",       name: "Daniel Brüll",     kuerzel: "DB" },
    { rolle: "badplanung",      bezeichnung: "Badplanerin",      name: "Karin Kaufmann",   kuerzel: "KK" },
    { rolle: "badplanung",      bezeichnung: "Badplanerin",      name: "Judith Rapp",      kuerzel: "JR" },
    { rolle: "projektleiter",   bezeichnung: "Projektleiter",    name: "Steven Wagner",    kuerzel: "SW" },
    { rolle: "heizungsexperte", bezeichnung: "Heizungsexperte",  name: "André Winterfeld", kuerzel: "AW" },
  ],

  /* Programme & Orte — im Ablauf als {programm.erp}, {programm.cad} … */
  programme: {
    erp: "KWP",                       // Kunden, Termine, Angebote, Bestellwesen
    cad: "Palette CAD",               // 3D-Badplanung
    cloud: "Palette Cloud",           // Upload der Renderings
    app3d: "PaletteMove",             // Kunden-App für die 3D-Ansicht
    laufwerk: "MOMO1",                // Netzlaufwerk mit den Kundenordnern
    badrechner: "Badrechner auf der Website",
  },

  /* Ordnerpfade auf dem Laufwerk (Anzeige im Handbuch) */
  ordner: {
    anfragen: "MOMO1 → Bad → Badanfragen",
    muster: "MOMO1 → Bad → Badanfragen → 1 Muster_Anfragen",
    auftraege: "MOMO1 → Bad → Badaufträge",
  },

  /* Fristen in Tagen — steuern die „Heute fällig"-Liste */
  fristen: {
    erinnerungVorErstgespraech: 3,    // Fotos & Maße nachfragen
    angebotsverfolgung: 7,            // nach Angebotsbesprechung
    freigabeNachMaterialauswahl: 3,   // Exposé zur Freigabe schicken
    kundenerinnerungVorBaustart: 7,
  },
};
