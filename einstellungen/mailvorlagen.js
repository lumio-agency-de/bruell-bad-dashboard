/* ==========================================================================
   MAILVORLAGEN
   --------------------------------------------------------------------------
   Texte aus den Outlook-Vorlagen (.oft) übernommen, ergänzt um den Upload-Link. Das Dashboard setzt
   Kundendaten und Termine ein; dann „Text kopieren" oder „In Mailprogramm
   öffnen". Bilder, Signatur und Anhänge bleiben in der Original-.oft —
   die liegt unter „datei" und kann jederzeit geöffnet werden.

   Platzhalter:
     {anrede}               je nach Vorlage „Sehr geehrte …" / „Hallo …" /
                            „Guten Tag …" — Stil steht unter anredeStil
     {nachname}
     {<termin>.datum}       z. B. {erstgespraech.datum}  → 14.10.2026
     {<termin>.wochentag}   → Mittwoch
     {<termin>.uhrzeit}     → 14:30
     {<termin>.kurz}        → 14.10.
     {downloadCode}         PaletteMove-Code aus der Projektakte
     {firma.name} {firma.adresse} {firma.mapsLink} {firma.website}
     {berater} {heizungsexperte}
     {uploadLink}           persönlicher Link, über den der Kunde Dateien
                            direkt in sein Projekt hochlädt

   anhangDateien: Dateien im Ordner vorlagen/, die mitgeschickt werden.
   anhangOrdner:  Projektordner, deren neueste Datei beim „In Outlook öffnen“ angehängt wird.
   Optionale Absätze: [[id]] … [[/id]] — im Dashboard per Häkchen an/aus.
   Felder, die noch leer sind, erscheinen als markierte Lücke ‹…›.
   ========================================================================== */

window.MAILVORLAGEN = [
  {
    id: "terminbestaetigung",
    phase: 2,
    titel: "Terminbestätigung Erstgespräch",
    datei: "vorlagen/02-terminbestaetigung/Mail-Terminbestaetigung.oft",
    anhaenge: ["Broschüre Bad", "Fotoanleitung Bad", "Broschüre Heizung", "Fotoanleitung Heizung"],
    anhangDateien: [
      "vorlagen/02-terminbestaetigung/anhaenge/Broschuere_Bad.pdf",
      "vorlagen/02-terminbestaetigung/anhaenge/Fotoanleitung_Bad.pdf",
      "vorlagen/02-terminbestaetigung/anhaenge/Broschuere_Heizung.pdf",
      "vorlagen/02-terminbestaetigung/anhaenge/Fotoanleitung_Heizung.pdf",
    ],
    anredeStil: "formell",
    betreff: "Ihr persönliches Traumbad und Ihre sparsame Heizung werden Wirklichkeit …",
    optionen: [],
    text:
`Träume werden Räume – Ihr persönliches Traumbad und Ihre sparsame Heizung werden Wirklichkeit …

{anrede}

ob Solar, Pellets, Wärmepumpe, Öl- oder Gasheizung – oder eine clevere Kombination daraus:
Gemeinsam mit Ihnen entwickeln wir ein maßgeschneidertes Wärmekonzept, das optimal zu Ihren Bedürfnissen passt und Sie langfristig unabhängiger von Energieanbietern macht.

Auch Ihr Bad kann mehr als nur funktional sein:
Immer mehr Menschen wünschen sich einen Ort zum Wohlfühlen, Entspannen und Krafttanken – einen Rückzugsort mitten im Alltag.
Trifft das auch auf Sie zu? Dann sind Sie bei uns in besten Händen!

Eine gelungene Bad- & Heizungsmodernisierung beginnt bei uns mit individueller Beratung und durchdachter Planung.
Wir nehmen uns Zeit für Ihre Wünsche, denken vorausschauend und gestalten gemeinsam mit Ihnen Ihr persönliches Wohlfühlbad und eine sparsame, zuverlässige Heizlösung – abgestimmt auf Ihren Stil, Ihre Bedürfnisse und Ihr Budget.
Unsere Broschüren im Anhang geben Ihnen erste Informationen zu unseren Bad- & Heizungssanierungen.

Kurz gesagt:
Wir möchten, dass Sie sich rundum wohlfühlen – nicht erst mit dem fertigen Bad oder der neuen Heizungsanlage, sondern bereits während der Planung und auch lange nach der Umsetzung. Dafür steht unsere persönliche Service-Garantie.

Den ersten Schritt haben Sie bereits getan.

Ihr Gesprächstermin mit unserem Heizungsexperten Herr {heizungsexperte}
und unserem Badexperten Herr {berater}:
📅 {erstgespraech.wochentag}, {erstgespraech.datum}
⏰ {erstgespraech.uhrzeit} Uhr
📍 {firma.adresse}

📌 Anfahrt leicht gemacht: Hier geht’s zur Adresse auf Google Maps: {firma.mapsLink}

Damit wir Sie optimal beraten können, freuen wir uns vorab über folgende Unterlagen:
•  einen Grundriss und einige Fotos Ihres aktuellen Badezimmers
•  Fotos von Ihrem Heizraum sowie von Ihrem Haus (Außenansicht)
•  Angaben zur Wohnfläche und zum bisherigen Heizungsverbrauch

Am einfachsten laden Sie alles über Ihren persönlichen Link hoch – direkt vom Handy, ohne Anmeldung:
👉 {uploadLink}

Bringen Sie auch gerne Ihre Ideen und Wünsche mit – so können wir direkt starten und gemeinsam Ihr persönliches Bad- und Heizkonzept gestalten.

Wir freuen uns auf ein interessantes und kreatives Gespräch mit Ihnen.

Mit freundlichen Grüßen`,
  },

  {
    id: "freigabe",
    phase: 8,
    titel: "Badplanung zur Prüfung und Freigabe",
    datei: "vorlagen/08-freigabe/Mail-Planung-zur-Freigabe.oft",
    anhaenge: ["Exposé (2D-Ansichten) als PDF", "ggf. aktualisiertes Angebot"],
    anhangOrdner: ["expose", "angebot"],   // jeweils die neueste Datei aus diesen Projektordnern
    anredeStil: "formell",
    betreff: "Ihre Badplanung zur Prüfung und Freigabe",
    optionen: [
      { id: "angebot", label: "Angebot hat sich geändert" },
      { id: "spots", label: "Deckenspots geplant" },
      { id: "masse", label: "WC-Sitzhöhe / Maße abfragen" },
    ],
    text:
`{anrede}

Ihr Termin zur Materialauswahl ist bereits ein paar Tage vergangen.
Um in die nächste Phase der Vorbereitung starten zu können, bitten wir Sie, sich Ihre Badplanung noch einmal genau anzuschauen.

Hierzu finden Sie im Anhang das Exposé mit den 2D-Ansichten Ihres Bades als PDF-Datei. Für eine virtuelle 3D-Ansicht laden Sie sich einfach die kostenfreie App PaletteMove auf Ihr Smartphone oder Tablet und geben dort den folgenden Download-Code ein: {downloadCode}
[[angebot]]Zudem finden Sie ebenfalls noch das aktualisierte Angebot zur Prüfung und Unterschrift im Anhang.
[[/angebot]]
Bitte prüfen Sie vor allem die Aufteilung bzw. Anordnung und schauen Sie gern nach Ihren Artikeln und Farben (Farben können immer etwas zur Wirklichkeit abweichen).
Die Maße sind für unsere Monteure und dienen Ihnen zur Orientierung. Sie können, wie in der Planung unten zu lesen, durch bauliche Gegebenheiten geringfügig abweichen.
[[spots]]In der Draufsicht Ihrer 2D-Planung sehen Sie die Einbauposition Ihrer Deckenspots.
[[/spots]][[masse]]
Teilen Sie uns außerdem noch mit, welche Sitzhöhe für das WC gewünscht ist und ob die Maße von Waschtisch und Spiegelschrank für Sie passend sind.
[[/masse]]
Sollten Sie Fragen haben oder etwas unklar sein, melden Sie sich bitte unbedingt bei uns! Änderungen, die nach Ihrer Freigabe erfolgen, können nicht mehr umgesetzt werden.
Gerne können Sie auch Anmerkungen handschriftlich direkt in der Planung ergänzen.

Bitte senden Sie uns die unterschriebene Planung (Exposé) sowie das unterschriebene Angebot als PDF, Scan oder Foto zurück – am einfachsten über Ihren persönlichen Link:
👉 {uploadLink}

Vielen Dank und herzliche Grüße`,
  },

  {
    id: "baustart",
    phase: 11,
    titel: "Kundenerinnerung vor Baustart",
    datei: "vorlagen/11-ausfuehrung/Mail-Baustart.oft",
    anhaenge: ["Aushang für die Nachbarn", "Team-Foto (in der .oft)"],
    anredeStil: "gutentag",
    betreff: "Das Warten hat bald ein Ende …",
    optionen: [],
    text:
`{anrede}

Ihre Badträume werden endlich wahr!

Unser Team freut sich schon darauf, am kommenden {baustart.wochentag}, den {baustart.datum} bei Ihnen mit dem Badumbau zu starten.
Los geht’s zwischen 8 Uhr und halb 9 Uhr morgens mit Staubschutz und Abrissarbeiten.

Die Monteure sind dann in der Regel von ca. 8:00 bis 17:00 Uhr bei Ihnen vor Ort – freitags voraussichtlich nur bis 12:30 Uhr. Gerne können Sie uns einen Schlüssel übergeben 😊

Vorab bitten wir Sie, alle Gegenstände, die Sie behalten möchten, aus dem Bad zu entfernen. Alles, was zu Beginn noch im Bad verbleibt, wird von uns entsorgt.
Bitte sorgen Sie außerdem dafür, dass die Laufwege frei sind, damit unsere Monteure direkt mit dem Staubschutz und den Abrissarbeiten beginnen können.

Im Anhang finden Sie einen Aushang für Ihre Nachbarn, den Sie gerne ausdrucken und ggf. im Treppenhaus oder am schwarzen Brett aufhängen können.
Sollten Sie keine Möglichkeit zum Ausdrucken haben, übernehmen wir dies gerne und geben den Zettel den Monteuren am {baustart.kurz} mit.

Sollten Sie vorab noch Fragen haben, melden Sie sich gerne!

Hier erhalten Sie einen kleinen Einblick in das Team, das Ihr Traumbad Wirklichkeit werden lässt: (Team-Foto aus der Outlook-Vorlage einfügen)

Wir wünschen Ihnen weiterhin eine angenehme Woche!`,
  },

  {
    id: "schlussrechnung",
    phase: 12,
    titel: "Schlussrechnung & Bitte um Bewertung",
    datei: "vorlagen/12-abnahme/Mail-Schlussrechnung.oft",
    anhaenge: ["Schlussrechnung als PDF"],
    anhangOrdner: ["rechnungen"],
    anredeStil: "hallo",
    betreff: "Ihre Schlussrechnung zur Badsanierung",
    optionen: [],
    text:
`{anrede}

anbei erhalten Sie die Schlussrechnung für Ihre Badsanierung im PDF-Format.

Wir wünschen Ihnen viel Spaß und Freude mit Ihrem neuen Bad/WC und bedanken uns herzlich für die Zusammenarbeit und das entgegengebrachte Vertrauen!

Außerdem würden wir uns freuen, wenn Sie uns eine positive Google-Bewertung schreiben.
Über den folgenden Link gelangen Sie zu unserer Homepage – scrollen Sie einfach nach unten zum Button „Jetzt bewerten“.

👉 {firma.website}

Alles Gute wünscht Ihnen das {firma.kurzname}-Team!`,
  },
];
