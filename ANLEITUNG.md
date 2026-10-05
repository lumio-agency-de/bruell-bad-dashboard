# Bad-Dashboard — Anleitung

Ein Arbeits-Dashboard, das jeden Badbau von der ersten Anfrage bis zum Archiv
durch **13 Level** führt. Jedes Level besteht aus konkreten Schritten:
Formulare ausfüllen, Dateien ablegen, Termine setzen, Mails senden,
Entscheidungen treffen. **Das nächste Level wird erst freigeschaltet, wenn alle
Pflichtschritte erledigt sind.** Formulare, Fotos, Pläne und Kunden-Uploads
liegen direkt im Projekt — kein Netzlaufwerk, keine Ordner zum Verschieben.

## Starten

`index.html` öffnen (Chrome oder Edge empfohlen).

- **Lokal** (Standard): alles liegt in diesem Browser. Zum Ausprobieren.
- **Cloud**: Team-Login, alle Arbeitsplätze sehen dasselbe, Kunden laden über ihren
  Link von überall hoch. Einrichtung: `supabase/ANLEITUNG-CLOUD.md`.

## Ebenen: wer sieht was

| Ebene | Sieht | Darf |
| --- | --- | --- |
| **Geschäftsführung** | alles, plus Team-Auslastung im Cockpit | alles, inkl. Einrichtung (Firma, Team, Partner, Rechte), interne Freigaben, Projekte löschen |
| **Planung / Bearbeitung** | alle Projekte; im Cockpit wahlweise nur die eigenen | Anfragen anlegen, Schritte erledigen, Level freischalten, Mails & Kundenlinks, Monteure/Partner zuweisen |
| **Monteur** | „Meine Baustellen“ – nur zugewiesene Projekte, ohne Angebote, Aufträge, Rechnungen | Besichtigung, Restarbeiten, Abnahmeprotokoll (mit Unterschrift), Fotos, Monteurmappe |
| **Externer Partner** | „Meine Einsätze“ – Adresse, Termine, Pläne und die Formulare seines Gewerks | Fotos hochladen, „Gewerk erledigt“ oder Hinweis ans Büro melden |

- Wer was erledigen darf, steht an jedem Schritt in `einstellungen/ablauf.js` (`ebene: [...]`).
  Schritte anderer Ebenen sind sichtbar, aber gesperrt („Erledigt: Planung / Bearbeitung“).
- Monteure und Partner werden im Projekt zugewiesen: Level 10 „Monteure & Partner zuweisen“
  oder jederzeit im Reiter **Team** der Akte. Dort erscheinen auch die Rückmeldungen der Partner.
- Welche Formulare ein Partner sieht, hängt an seinem Gewerk (`gewerke` in `firma.js`).
- Was jede Ebene sieht, steht als Tabelle unter **Konten → Wer sieht was**.

## Konten & Anmeldung

Jede Person hat ein eigenes Konto (Benutzername + Passwort) und sieht nach der
Anmeldung nur, was ihre Ebene erlaubt. Ohne Anmeldung ist nichts zu sehen.

1. **Geschäftsführung** öffnet **Konten**: dort stehen alle Mitarbeiter und Partner mit
   Ebene und Zugangsstatus. Neue Person anlegen → **Änderungen übernehmen** →
   **Zugang anlegen**. Das Dashboard schlägt Benutzername und Startpasswort vor und zeigt
   beides einmal an (Knopf „Zugangsdaten kopieren“).
2. Die Person meldet sich an und muss beim ersten Mal **ein eigenes Passwort** festlegen.
3. Passwort vergessen → Geschäftsführung: **Passwort zurücksetzen** (neues Startpasswort).
   Jemand verlässt die Firma → **Sperren**.
4. Jeder kann sein Passwort jederzeit links unten unter **Passwort ändern** wechseln.

Im **Demo-Modus** (ohne Cloud) liegen die Konten nur im eigenen Browser – zum Ausprobieren.
Der Vorschau-Link mit `?demo=1` legt Demo-Zugänge an (Passwort `demo1234`), die das
Anmeldefenster zum Anklicken anbietet. Ohne `?demo=1` beginnt das Dashboard mit der
**Ersteinrichtung** des Geschäftsführer-Zugangs.

## Bereiche

| Bereich | Wofür |
| --- | --- |
| **Cockpit** | Zahlen je Abschnitt, was **fällig** ist (Nachfassen, Erinnerungen), was **als Nächstes** zu tun ist (je Projekt der nächste offene Schritt), **Neu vom Kunden**, Termine der nächsten 14 Tage, Fliesenspiegel aller Bäder. |
| **Projekte** | Alle Bäder nach Abschnitt, mit Suche und Filtern. |
| **Projekt** | Die Spielfläche: oben die Level-Karte, links die Schritte des aktuellen Levels, rechts die Akte (Dateien-Ordner, Kunde, Termine, Verlauf). |
| **Unternehmen** | (nur Geschäftsführung) Ordner wie am iPhone: Finanzen, Vertrieb, Zeit & Ablauf, Kapazität & Team, Nachkalkulation. Darin: Jahresziel, Umsatz, Deckungsbeitrag, Quote, Dauer, Auftragsbestand, offene Forderungen, Kapazität der nächsten 8 Wochen, Vertriebstrichter — jeweils mit Vergleich zum Vorzeitraum. Euro-Beträge pro Projekt unter Akte → Zahlen. |
| **Konten** | (nur Geschäftsführung) Mitarbeiter und Partner, Ebenen, Zugänge anlegen/zurücksetzen/sperren, Tabelle „Wer sieht was“. |
| **Einrichtung** | (nur Geschäftsführung) Firma, Farben, Ziele, Programme, Fristen, Cloud, Sicherung. |
| **Meine Baustellen / Meine Einsätze** | Startseite für Monteure bzw. externe Partner. |

**+ Neue Anfrage** (links oben) legt ein Projekt an und öffnet direkt die Bestandsaufnahme.

## Die 13 Level

| Level | Was dort passiert |
| --- | --- |
| 01 Kundenanfrage | Bestandsaufnahme, Entscheidung „Erstgespräch ja/nein“, Termin |
| 02 Terminbestätigung | Kunde in KWP, Terminbestätigung mit Upload-Link, Fotos & Maße vom Kunden |
| 03 Erstgespräch | Erstgesprächs-Notizen, Skizze, Badplanerin festlegen, Termin Angebotsbesprechung |
| 04 Angebot & Planung | Renderings und Angebot ablegen, Projektnummer, Prüfung durch den Badberater |
| 05 Angebotsbesprechung | Ergebnis: Auftrag / überlegt noch (Wiedervorlage) / abgesagt; unterschriebenes Angebot |
| 06 Baustellenbesichtigung | Checkliste mit Fotos und Raummaßen, ggf. Angaben zur Tür |
| 07 Materialauswahl | Projekt-Übersicht, Auswahlgespräch mit Unterschrift; Fliesen-, Elektro-, Abriss-Formular und Spanndecke erscheinen nur, wenn sie gebraucht werden |
| 08 Freigabe | Exposé, PaletteMove-Code, Freigabe-Mail, unterschriebene Freigabe (vom Kunden per Link) |
| 09 Materialbestellung | Bestellungen in KWP anlegen, abgleichen, versenden |
| 10 Baustelle planen | Baustart, Subunternehmer, Abschlagsrechnung, Monteurmappe |
| 11 Ausführung | Kundenerinnerung, Baustellenfotos, Restarbeiten |
| 12 Abnahme & Übergabe | Abnahmeprotokoll mit Unterschrift, Schlussrechnung, Mail |
| 13 Abschluss | Bewertung, Bilder fertiges Bad, Showroom — dann archivieren |

Was in **KWP** oder **Palette CAD** passiert, wird im Dashboard mit „Als erledigt
bestätigen“ quittiert — mit Datum und Namen.

## Formulare

Alle Papierformulare gibt es digital: Felder, Auswahl-Chips, Tabellen, Checklisten,
Foto-Upload direkt im Formular und **Unterschrift per Finger/Stift auf dem Tablet**.
Pflichtfelder sind mit • markiert; der Zähler oben zeigt, was noch fehlt.
Gespeichert wird automatisch. **Drucken / PDF** erzeugt eine A4-Fassung im Firmenbriefkopf.

Im Abnahmeprotokoll übernimmt **Mängel → Restarbeiten** alle als Mangel markierten
Punkte als offene Restarbeiten.

**Monteurmappe** (oben im Projekt) druckt Deckblatt mit Adresse und Zugang, alle
Auswahl- und Gewerke-Formulare sowie Pläne und Skizzen in einem Rutsch.

## Mehrere Personen gleichzeitig (Schreibschutz)

Öffnet jemand ein Projekt, ist es für diese Person reserviert. Alle anderen sehen
„**Schreibgeschützt** – Karin Kaufmann bearbeitet dieses Projekt seit 10:42 Uhr“ und können
nur mitlesen; Änderungen erscheinen laufend. Verlässt die Person das Projekt (oder schließt
den Browser), wird es nach spätestens 90 Sekunden frei. Die Geschäftsführung kann die
Bearbeitung übernehmen.

## Arbeitszeit

Oben im Projekt **Arbeitszeit starten** – mit Pause, Fortsetzen und Beenden (optional mit
Tätigkeit). Ist man länger als 10 Minuten nicht aktiv (einstellbar in `firma.js`,
`arbeitszeit`), pausiert der Timer **rückwirkend ab der letzten Aktivität** – auch wenn der
Browser zwischendurch zu war. Beim Zurückkommen: weiter stempeln, Pause verwerfen
(„habe weitergearbeitet“, z. B. in KWP) oder beenden. Alle Einträge stehen im Akte-Reiter
**Zeiten** und fließen in die Nachkalkulation.

## Nachkalkulation (Geschäftsführung)

Im Projekt unter Akte → **Nachkalkulation** → „Nachkalkulation öffnen“: Erlöse, Stunden
eigener Mitarbeiter (aus dem Timer + Zusatzstunden × Kostensatz), Zeiten und Kosten
externer Partner, Material (kalkuliert/tatsächlich), sonstige Kosten, Dauer. Ergebnis:
Deckungsbeitrag, Marge, DB pro Stunde. Alle Nachkalkulationen sammelt
**Unternehmen → Nachkalkulation**. Den Standard-Kostensatz setzt die Einrichtung.

## Outlook

- **In Outlook öffnen** (im Mail-Fenster) erzeugt einen fertigen Entwurf inkl. Anhängen
  (Broschüren, neuestes Exposé/Angebot/Rechnung). Datei öffnen → Outlook zeigt die Mail
  zum Prüfen und Absenden.
- **📅 In Outlook-Kalender** neben jedem Termin erzeugt einen Kalendereintrag mit Ort
  (Ausstellung bzw. Kundenadresse) und Telefonnummer.

## Kundenlink

Jedes Projekt hat einen persönlichen Link (`Kundenlink` oben im Projekt). Er steckt
automatisch in der Terminbestätigung und der Freigabe-Mail. Der Kunde sieht nur
seine Begrüßung und die passenden Upload-Felder (z. B. „Fotos Ihres jetzigen
Badezimmers“, „Grundriss & Maße“, später „Unterschriebene Planung & Angebot“) —
keine Projektdaten. Hochgeladenes landet sofort im richtigen Ordner und erscheint im
Cockpit unter **Neu vom Kunden**. Fotos werden dabei automatisch verkleinert.

## Auf eine andere Firma übertragen

1. Ordner kopieren, `index.html` öffnen → Geschäftsführer-Zugang anlegen →
   **Einrichtung**: Firma, Farben, Ziele, Programme, Fristen → **Übernehmen**;
   **Konten**: Team (Rollen, Kürzel, Ebene) und externe Partner eintragen, Zugänge vergeben.
2. **firma.js herunterladen** und `einstellungen/firma.js` damit ersetzen.
3. Logo als `app/img/logo.svg` (oder anderer Pfad in der Einrichtung).
4. Cloud einrichten: `supabase/ANLEITUNG-CLOUD.md`.
5. Anpassen ohne Programmierkenntnisse, jeweils mit Kommentaren in der Datei:
   - `einstellungen/ablauf.js` — Level, Schritte, Projektordner, was der Kunde hochladen darf
   - `einstellungen/formulare.js` — alle Formulare und ihre Felder
   - `einstellungen/mailvorlagen.js` — Mailtexte mit Platzhaltern

Im Ablauf stehen keine festen Namen, sondern Rollen wie `{badberater}`,
`{badplanung}`, `{projektleiter}` und Programme wie `{programm.erp}`.

## Ordner

```
Dashboard/
├── index.html              ← Dashboard fürs Team
├── kunde.html              ← Upload-Seite für Kunden (öffentlich erreichbar machen)
├── einstellungen/          ← firma.js, ablauf.js, formulare.js, mailvorlagen.js
├── vorlagen/               ← Original-Papiervorlagen, Lieferantenformulare, Outlook-Vorlagen, Broschüren
├── supabase/               ← schema.sql + ANLEITUNG-CLOUD.md
└── app/                    ← Programm, Schriften, Logo
```

Die Originale liegen unverändert in `../Bad_Dashboard/`.
