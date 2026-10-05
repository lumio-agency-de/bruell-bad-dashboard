/* ==========================================================================
   FIRMA — Stammdaten, Team und Programme
   --------------------------------------------------------------------------
   Diese Datei ist die Grundeinstellung. Alles hier lässt sich auch direkt im
   Dashboard unter „Einrichtung" ändern — dort Geändertes überschreibt diese
   Werte (gespeichert in der Datendatei bzw. im Browser).

   Für eine neue Firma: Werte ersetzen, Datei speichern, Dashboard neu laden.
   Die Ebenen (Geschäftsführung, Planung, Monteur, Partner) und ihre Rechte
   stehen am Ende dieser Datei.
   Die Rollen-Kürzel (badberater, badplanung …) werden im Ablauf als
   Platzhalter wie {badberater} verwendet — die Namen hier landen also
   automatisch überall im Handbuch.
   ========================================================================== */

window.FIRMA = {
  name: "Brüll GmbH",
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

  /* Team.
       rolle    fachliche Rolle — im Ablauf als Platzhalter {badberater}, {badplanung} …
       kuerzel  steht in der Projektliste und dient als Kennung
       ebene    was die Person im Dashboard darf (siehe EBENEN unten):
                geschaeftsfuehrung | planung | monteur
       email    Login-E-Mail (nur im Cloud-Betrieb nötig) */
  team: [
    { rolle: "badberater",      bezeichnung: "Badberater · Geschäftsführer", name: "Daniel Brüll",     kuerzel: "DB", ebene: "geschaeftsfuehrung", email: "" },
    { rolle: "badplanung",      bezeichnung: "Badplanerin",      name: "Karin Kaufmann",   kuerzel: "KK", ebene: "planung", email: "" },
    { rolle: "badplanung",      bezeichnung: "Badplanerin",      name: "Judith Rapp",      kuerzel: "JR", ebene: "planung", email: "" },
    { rolle: "projektleiter",   bezeichnung: "Projektleiter",    name: "Steven Wagner",    kuerzel: "SW", ebene: "planung", email: "" },
    { rolle: "heizungsexperte", bezeichnung: "Heizungsexperte",  name: "André Winterfeld", kuerzel: "AW", ebene: "planung", email: "" },
    { rolle: "monteur",         bezeichnung: "Monteur",          name: "Monteur (Beispiel – Namen eintragen)", kuerzel: "MO", ebene: "monteur", email: "" },
  ],

  /* Externe Partner (Subunternehmer). Sie sehen nur Projekte, denen sie im
     Projekt unter „Team" zugewiesen sind — und davon nur Adresse, Termine,
     Pläne und die Formulare ihres Gewerks. */
  partner: [
    { id: "p-elektro", firma: "Elektro-Partner (Beispiel)", gewerk: "Elektro", name: "", telefon: "", email: "" },
    { id: "p-fliesen", firma: "Fliesen-Partner (Beispiel)", gewerk: "Fliesen", name: "", telefon: "", email: "" },
  ],

  /* Welche Formulare ein Partner je Gewerk sieht */
  gewerke: {
    "Elektro":            ["elektro", "projektuebersicht"],
    "Fliesen":            ["fliesen", "projektuebersicht", "auswahl"],
    "Abriss":             ["abriss", "projektuebersicht"],
    "Maler / Trockenbau": ["projektuebersicht"],
    "Spanndecke":         ["projektuebersicht"],
    "Schreiner":          ["projektuebersicht", "auswahl"],
    "Fensterbau":         ["projektuebersicht"],
    "Sonstiges":          ["projektuebersicht"],
  },

  /* Programme, die neben dem Dashboard weiterlaufen — im Ablauf als {programm.erp} … */
  programme: {
    erp: "KWP",                       // Kunden, Angebote, Bestellwesen, Rechnungen
    cad: "Palette CAD",               // 3D-Badplanung
    app3d: "PaletteMove",             // Kunden-App für die 3D-Ansicht
    badrechner: "Badrechner auf der Website",
  },

  /* Cloud (Supabase): Projekte, Dateien und Kunden-Uploads für alle im Büro.
     Leer lassen = lokaler Modus (nur dieser Browser). Einrichtung: supabase/ANLEITUNG-CLOUD.md
     Der „anonKey" ist öffentlich und darf hier stehen — geschützt wird über Login + Datenbankregeln. */
  cloud: {
    url: "",
    anonKey: "",
    /* Adresse, unter der kunde.html öffentlich erreichbar ist (für den Kunden-Upload-Link) */
    portalUrl: "",
  },

  /* Ziele — nur auf der Seite „Unternehmen" (Geschäftsführung) sichtbar */
  ziele: {
    jahresumsatz: 0,                  // Umsatzziel netto in € (0 = kein Ziel)
  },

  /* Fristen in Tagen — steuern das Cockpit */
  fristen: {
    erinnerungVorErstgespraech: 3,    // Fotos & Maße nachfragen
    angebotsverfolgung: 7,            // nach Angebotsbesprechung
    freigabeNachMaterialauswahl: 3,   // Exposé zur Freigabe schicken
    kundenerinnerungVorBaustart: 7,
  },
};

/* ==========================================================================
   EBENEN — wer darf was
   Im Cloud-Betrieb werden diese Rechte zusätzlich von der Datenbank erzwungen
   (supabase/schema.sql), die Texte hier dienen der Anzeige.
   ========================================================================== */
window.EBENEN = [
  { id: "geschaeftsfuehrung", titel: "Geschäftsführung",
    kann: ["Alle Projekte sehen und bearbeiten", "Interne Freigaben (z. B. Angebot geprüft)", "Einrichtung: Firma, Team, Partner, Rechte", "Projekte löschen", "Team-Auslastung im Cockpit"] },
  { id: "planung", titel: "Planung / Bearbeitung",
    kann: ["Alle Projekte sehen und bearbeiten", "Neue Anfragen anlegen, Level freischalten", "Kundenmails & Kundenlinks", "Monteure und Partner zuweisen"] },
  { id: "monteur", titel: "Monteur",
    kann: ["Nur zugewiesene Baustellen", "Besichtigung, Restarbeiten, Abnahmeprotokoll mit Unterschrift", "Fotos hochladen, Monteurmappe drucken", "Keine Angebote, Aufträge, Rechnungen"] },
  { id: "partner", titel: "Externer Partner",
    kann: ["Nur zugewiesene Einsätze", "Adresse, Termine, Pläne und die Formulare des eigenen Gewerks", "Fotos hochladen, „Gewerk erledigt“ melden", "Keine Preise, Notizen oder sonstigen Kundendaten"] },
];
