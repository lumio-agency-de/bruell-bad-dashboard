/* ==========================================================================
   ABLAUF — die Phasen eines Badbaus
   --------------------------------------------------------------------------
   Quelle: „Badablauf Brüll GmbH_angepasst.docx".

   So ist eine Phase aufgebaut:
     nr         laufende Nummer (bestimmt die Reihenfolge)
     titel      Name der Phase
     abschnitt  einer der vier ABSCHNITTE unten (gruppiert die Projektübersicht)
     kurz       ein Satz: worum geht es
     wer        Rolle(n) aus firma.js, die hier hauptsächlich dran sind
     termin     welches Datum des Projekts zu dieser Phase gehört (optional)
     aufgaben   Checkliste. t = Aufgabe, d = Erklärung (optional)
     dokumente  Formulare/Dateien aus dem Ordner vorlagen/
     mails      IDs aus mailvorlagen.js
     ordner     Ordnerstruktur, die in dieser Phase angelegt wird (optional)

   Platzhalter in geschweiften Klammern werden aus firma.js ersetzt:
     {badberater} {badplanung} {badplanung.kuerzel} {projektleiter}
     {heizungsexperte} {programm.erp} {programm.cad} {programm.cloud}
     {programm.laufwerk} {programm.badrechner} {ordner.anfragen}
     {ordner.muster} {ordner.auftraege} {kundenPostfach}

   Eine Phase hinzufügen/entfernen: Block kopieren bzw. löschen, Nummern
   anpassen. Bereits angelegte Projekte behalten ihren Stand.
   ========================================================================== */

window.ABSCHNITTE = [
  { id: "anfrage",   titel: "Anfrage",                von: 1,  bis: 3 },
  { id: "planung",   titel: "Planung & Angebot",      von: 4,  bis: 5 },
  { id: "auftrag",   titel: "Auftrag & Vorbereitung", von: 6,  bis: 10 },
  { id: "baustelle", titel: "Baustelle & Abschluss",  von: 11, bis: 13 },
];

window.ABLAUF = [
  {
    nr: 1,
    titel: "Kundenanfrage & Erstkontakt",
    abschnitt: "anfrage",
    kurz: "Am Telefon die ersten Infos aufnehmen und den Anfrageordner anlegen.",
    wer: ["badplanung"],
    termin: "anfrageAm",
    aufgaben: [
      { t: "Im Telefongespräch erste Informationen zum Badumbau aufnehmen",
        d: "Dabei das Formular „Bestandsaufnahme Bad\" ausfüllen." },
      { t: "Anfrageordner anlegen",
        d: "{ordner.muster} kopieren und die Kopie in „Anfrage_Kundennachname\" umbenennen." },
      { t: "Bestandsaufnahme im neuen Kundenordner öffnen und alle bekannten Infos eintragen" },
      { t: "Prüfen, ob ein Erstgesprächstermin in der Ausstellung vereinbart werden kann",
        d: "Wer bei den Kosten noch unsicher ist, wird auf den {programm.badrechner} verwiesen — dann vorerst keinen Termin vereinbaren." },
    ],
    dokumente: [
      { titel: "Bestandsaufnahme Bad", datei: "vorlagen/01-kundenanfrage/Bestandsaufnahme-Bad.docx" },
    ],
    mails: [],
  },

  {
    nr: 2,
    titel: "Terminbestätigung",
    abschnitt: "anfrage",
    kurz: "Kunde anlegen, Termin bestätigen und Fotos & Maße vor dem Gespräch einsammeln.",
    wer: ["badplanung"],
    termin: "erstgespraech",
    aufgaben: [
      { t: "Neukunden mit Adresse und Kontaktdaten in {programm.erp} anlegen und mit dem Termin verknüpfen" },
      { t: "Terminbestätigung per E-Mail senden",
        d: "Entwurf „Ihr persönliches Traumbad wird Wirklichkeit …\" aus {kundenPostfach} verwenden, Anrede und genauen Termin eintragen, von dort aus senden." },
      { t: "Eingang von Fotos und Maßen im Blick behalten",
        d: "Nach Eingang auf Vollständigkeit prüfen und im Anfrageordner unter „Bilder alt\" ablegen." },
      { t: "Bei Bedarf bemaßten Grundriss in {programm.cad} erstellen und ausdrucken",
        d: "Den nutzt {badberater} im Gespräch zum Skizzieren des neuen Bades." },
      { t: "Einige Tage vorher anrufen, falls noch keine Fotos/Maße da sind",
        d: "An den Beratungstermin erinnern und erneut um Fotos und Maße bitten — macht, wer die Anfrage bearbeitet ({badplanung})." },
    ],
    dokumente: [
      { titel: "Broschüre Bad", datei: "vorlagen/02-terminbestaetigung/anhaenge/Broschuere_Bad.pdf", hinweis: "Anhang der Mail" },
      { titel: "Fotoanleitung Bad", datei: "vorlagen/02-terminbestaetigung/anhaenge/Fotoanleitung_Bad.pdf", hinweis: "Anhang der Mail" },
      { titel: "Broschüre Heizung", datei: "vorlagen/02-terminbestaetigung/anhaenge/Broschuere_Heizung.pdf", hinweis: "Anhang der Mail" },
      { titel: "Fotoanleitung Heizung", datei: "vorlagen/02-terminbestaetigung/anhaenge/Fotoanleitung_Heizung.pdf", hinweis: "Anhang der Mail" },
    ],
    mails: ["terminbestaetigung"],
  },

  {
    nr: 3,
    titel: "Erstgespräch in der Ausstellung",
    abschnitt: "anfrage",
    kurz: "Wünsche aufnehmen, skizzieren und die Badplanung an eine Planerin übergeben.",
    wer: ["badberater", "badplanung"],
    termin: "erstgespraech",
    aufgaben: [
      { t: "Gespräch mit Formular „Erstgesprächs-Notizen\" und ausgedrucktem Grundriss führen" },
      { t: "Termin zur Angebots- & Planungsbesprechung vereinbaren" },
      { t: "Alle Infos im Kundenordner ablegen" },
      { t: "Zuständigkeit festlegen",
        d: "Mit {badplanung} besprechen, wer die 3D-Planung in {programm.cad} und das Angebot in {programm.erp} übernimmt. Kürzel ({badplanung.kuerzel}) hinter den Kundenordner schreiben." },
    ],
    dokumente: [
      { titel: "Erstgesprächs-Notizen", datei: "vorlagen/03-erstgespraech/Erstgespraechs-Notizen.docx" },
    ],
    mails: [],
  },

  {
    nr: 4,
    titel: "Angebots- & Planungserstellung",
    abschnitt: "planung",
    kurz: "3D-Planung rendern und das Angebot aus dem Musterangebot ableiten.",
    wer: ["badplanung"],
    termin: "angebotsbesprechung",
    aufgaben: [
      { t: "Prüftermin „Angebot & Planung prüfen\" einige Tage vor der Besprechung in den Kalender von {badberater} eintragen" },
      { t: "Badplanung laut Notizen & Skizze in {programm.cad} erstellen" },
      { t: "Entwurf in Highend-Fotorealistik rendern und in die {programm.cloud} hochladen",
        d: "Optisch noch einmal prüfen; bei Unklarheiten {badberater} vor dem Angebot fragen." },
      { t: "Projekt in {programm.erp} anlegen",
        d: "Titel meist „Realisierung Ihres Traumbades\", Abteilung „Bad/Sanitär\", rote Farbe (= Auftrag noch nicht erteilt)." },
      { t: "Musterangebot hinterlegen und Titel für Titel an die 3D-Planung anpassen",
        d: "Nicht benötigte Titel (z. B. Schreinerarbeiten, Spanndecke) löschen, Positionen, Artikel und Mengen anpassen." },
      { t: "{badberater} Bescheid geben, dass alles zur Prüfung bereit ist" },
    ],
    dokumente: [],
    mails: [],
  },

  {
    nr: 5,
    titel: "Angebots- & Planungsbesprechung",
    abschnitt: "planung",
    kurz: "Planung in der Ausstellung vorstellen und dranbleiben, bis entschieden ist.",
    wer: ["badberater", "badplanung"],
    termin: "angebotsbesprechung",
    aufgaben: [
      { t: "Bei sofortigem Auftrag: unterschriebenes Angebot einscannen und im Kundenordner speichern" },
      { t: "Kundenordner nach „Badaufträge\" verschieben und umbenennen",
        d: "Von {ordner.anfragen} nach {ordner.auftraege}; „Anfrage_\" vor dem Nachnamen entfernen." },
      { t: "Termin zur Baustellenbesichtigung vereinbaren und bei {projektleiter} im Kalender eintragen" },
      { t: "Angebotsverfolgung nach ca. 1 Woche",
        d: "Ohne Rückmeldung nachfragen, ob Fragen offen sind oder schon eine Entscheidung steht. Braucht der Kunde Zeit, die Erinnerung verschieben und regelmäßig wieder nachfragen." },
    ],
    dokumente: [],
    mails: [],
  },

  {
    nr: 6,
    titel: "Baustellenbesichtigung",
    abschnitt: "auftrag",
    kurz: "Vor Ort aufmessen und die Bausituation an die Planung zurückspielen.",
    wer: ["projektleiter", "badplanung"],
    termin: "baustellenbesichtigung",
    aufgaben: [
      { t: "Nach Unterschrift des Angebots Termin vereinbaren" },
      { t: "Besichtigung mit der Checkliste durchführen",
        d: "Fotos, Aufmaß Bad/WC, Fenster- und Türmaße, Wasserzähler, Heizkörperanschluss, Estrichhöhe, Sicherungskasten, Zugang/Parken, Entsorgungswege, Absperrhähne, Hausverwaltung." },
      { t: "{projektleiter} bespricht die Bausituation mit der zuständigen Planerin" },
      { t: "Genaue Raummaße in {programm.cad} übernehmen bzw. Planung bei Abweichungen anpassen" },
    ],
    dokumente: [
      { titel: "Checkliste Baustellenbesichtigung", datei: "vorlagen/06-baustellenbesichtigung/Checkliste-Baustellenbesichtigung.docx", hinweis: "inkl. Raumskizze & Angaben zur Tür" },
    ],
    mails: [],
  },

  {
    nr: 7,
    titel: "Materialauswahl in der Ausstellung",
    abschnitt: "auftrag",
    kurz: "Alles auswählen, in den Formularen festhalten und Angebot & Planung nachziehen.",
    wer: ["badberater", "badplanung"],
    termin: "materialauswahl",
    aufgaben: [
      { t: "Materialauswahl in den Formularen zusammenfassen",
        d: "Projekt-Übersicht, Traumbad-Auswahlgespräch und je nach Gewerk Fliesen, Elektro, Abriss, Spanndecke." },
      { t: "Angebot in {programm.erp} an die Auswahl anpassen" },
      { t: "Planung in {programm.cad} an die Auswahl anpassen" },
    ],
    dokumente: [
      { titel: "Projekt-Übersicht", datei: "vorlagen/07-materialauswahl/Projekt-Uebersicht.pdf", hinweis: "Was wird benötigt?" },
      { titel: "Traumbad-Auswahlgespräch", datei: "vorlagen/07-materialauswahl/Traumbad-Auswahlgespraech.pdf", hinweis: "5 Seiten, mit Gäste-WC" },
      { titel: "Fliesenarbeiten", datei: "vorlagen/07-materialauswahl/Fliesenarbeiten.pdf" },
      { titel: "Elektroarbeiten", datei: "vorlagen/07-materialauswahl/Elektroarbeiten.pdf" },
      { titel: "Abrissarbeiten", datei: "vorlagen/07-materialauswahl/Abrissarbeiten.pdf" },
      { titel: "Bestellformular Spanndecke", datei: "vorlagen/07-materialauswahl/Bestellformular-Spanndecke.pdf", hinweis: "Lieferant DPS" },
      { titel: "Bestellformular Zubehör", datei: "vorlagen/07-materialauswahl/Bestellformular-Spanndecke-Zubehoer.pdf", hinweis: "Lieferant DPS" },
    ],
    mails: [],
  },

  {
    nr: 8,
    titel: "Angebot & Exposé zur Freigabe",
    abschnitt: "auftrag",
    kurz: "Exposé und ggf. geändertes Angebot zur Prüfung schicken, Unterschrift zurückholen.",
    wer: ["badplanung"],
    termin: "freigabeGesendet",
    aufgaben: [
      { t: "Exposé mit 2D-Ansichten als PDF erstellen und den {programm.app3d}-Download-Code bereitlegen" },
      { t: "Bei Änderungen: aktualisiertes Angebot zur Unterschrift beilegen" },
      { t: "Mail „Ihre Badplanung zur Prüfung und Freigabe\" senden",
        d: "Optionale Absätze (Deckenspots, WC-Sitzhöhe, Maße Waschtisch/Spiegelschrank) nur drinlassen, wenn sie zutreffen." },
      { t: "Unterschriebenes Exposé und Angebot zurückerhalten und im Kundenordner ablegen" },
    ],
    dokumente: [],
    mails: ["freigabe"],
  },

  {
    nr: 9,
    titel: "Materialbestellung",
    abschnitt: "auftrag",
    kurz: "Bestellungen aus dem Angebot erzeugen, prüfen und rausschicken.",
    wer: ["badplanung"],
    aufgaben: [
      { t: "In {programm.erp} die Artikel aus dem Angebot ins Bestellwesen übertragen und alle Bestellungen anlegen" },
      { t: "Lieferant, Lieferadresse, Wunsch-Liefertermin und Bezeichnung eintragen" },
      { t: "Bestellungen mit den Auswahllisten abgleichen" },
      { t: "Bestellungen per E-Mail oder Onlineshop rausschicken (ggf. über IDS)" },
    ],
    dokumente: [],
    mails: [],
  },

  {
    nr: 10,
    titel: "Baustellenablauf planen",
    abschnitt: "auftrag",
    kurz: "Termin, Subunternehmer, Abschlag und Monteurordner vorbereiten.",
    wer: ["projektleiter"],
    termin: "baustart",
    aufgaben: [
      { t: "Umsetzungstermin festlegen" },
      { t: "Subunternehmer einplanen" },
      { t: "Abschlagsrechnung stellen" },
      { t: "Monteurordner mit Anschlussmaßen etc. zusammenstellen",
        d: "Auswahl, Pläne & Zeichnungen, Fotos und die Protokolle für Abnahme und Restarbeiten." },
    ],
    ordner: ["Auswahl", "Bilder alt", "Bilder+Notizen Baustelle", "Pläne&Zeichnungen", "Restarbeiten", "Bilder fertiges Bad"],
    dokumente: [
      { titel: "Abnahmeprotokoll Fertigmontage", datei: "vorlagen/10-baustellenablauf/Abnahmeprotokoll-Fertigmontage.pdf", hinweis: "für den Monteurordner" },
      { titel: "Restarbeiten-Protokoll", datei: "vorlagen/10-baustellenablauf/Restarbeiten-Protokoll.pdf", hinweis: "für den Monteurordner" },
    ],
    mails: [],
  },

  {
    nr: 11,
    titel: "Ausführung",
    abschnitt: "baustelle",
    kurz: "Kunden eine Woche vorher einstimmen, dann bauen und Restarbeiten abarbeiten.",
    wer: ["projektleiter"],
    termin: "baustart",
    aufgaben: [
      { t: "Kundenerinnerung 1 Woche vor Baustart",
        d: "Mail „Das Warten hat bald ein Ende …\" mit Aushang für die Nachbarn." },
      { t: "Auftretende Reklamationen bearbeiten" },
      { t: "Restarbeiten aufnehmen und zeitnah erledigen" },
    ],
    dokumente: [
      { titel: "Restarbeiten-Protokoll", datei: "vorlagen/10-baustellenablauf/Restarbeiten-Protokoll.pdf" },
    ],
    mails: ["baustart"],
  },

  {
    nr: 12,
    titel: "Abnahme & Übergabe",
    abschnitt: "baustelle",
    kurz: "Abnahme protokollieren und die Schlussrechnung schicken.",
    wer: ["projektleiter", "badplanung"],
    termin: "abnahme",
    aufgaben: [
      { t: "Abnahmeprotokoll ausfüllen und vom Kunden unterschreiben lassen" },
      { t: "Schlussrechnung schreiben und mit der Vorlage versenden" },
    ],
    dokumente: [
      { titel: "Abnahmeprotokoll Fertigmontage", datei: "vorlagen/10-baustellenablauf/Abnahmeprotokoll-Fertigmontage.pdf" },
    ],
    mails: ["schlussrechnung"],
  },

  {
    nr: 13,
    titel: "Abschluss",
    abschnitt: "baustelle",
    kurz: "Bewertung, Bilder fürs Showroom und sauber archivieren.",
    wer: ["badplanung"],
    aufgaben: [
      { t: "Bewertung des Kunden abwarten, darauf reagieren, ggf. erinnern" },
      { t: "Bilder vom neuen Bad in den Showroom laden" },
      { t: "Evtl. Interview mit dem Kunden für Social Media" },
      { t: "Alle Ordner unter Kundenadresse und Projektnummer archivieren" },
    ],
    dokumente: [],
    mails: [],
  },
];
