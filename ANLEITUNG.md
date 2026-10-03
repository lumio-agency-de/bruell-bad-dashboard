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

## Bereiche

| Bereich | Wofür |
| --- | --- |
| **Cockpit** | Zahlen je Abschnitt, was **fällig** ist (Nachfassen, Erinnerungen), was **als Nächstes** zu tun ist (je Projekt der nächste offene Schritt), **Neu vom Kunden**, Termine der nächsten 14 Tage, Fliesenspiegel aller Bäder. |
| **Projekte** | Alle Bäder nach Abschnitt, mit Suche und Filtern. |
| **Projekt** | Die Spielfläche: oben die Level-Karte, links die Schritte des aktuellen Levels, rechts die Akte (Dateien-Ordner, Kunde, Termine, Verlauf). |
| **Einrichtung** | Firma, Farben, Team, Programme, Fristen, Cloud, Sicherung. |

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

## Kundenlink

Jedes Projekt hat einen persönlichen Link (`Kundenlink` oben im Projekt). Er steckt
automatisch in der Terminbestätigung und der Freigabe-Mail. Der Kunde sieht nur
seine Begrüßung und die passenden Upload-Felder (z. B. „Fotos Ihres jetzigen
Badezimmers“, „Grundriss & Maße“, später „Unterschriebene Planung & Angebot“) —
keine Projektdaten. Hochgeladenes landet sofort im richtigen Ordner und erscheint im
Cockpit unter **Neu vom Kunden**. Fotos werden dabei automatisch verkleinert.

## Auf eine andere Firma übertragen

1. Ordner kopieren, `index.html` öffnen → **Einrichtung**: Firma, Farben, Team
   (Rollen + Kürzel), Programme, Fristen eintragen → **Übernehmen**.
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
