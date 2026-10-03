# Bad-Dashboard — Anleitung

Ein Werkzeug, das einen Badbau von der ersten Anfrage bis zum archivierten Projekt
durch 13 Phasen führt: mit Checkliste je Phase, den passenden Formularen und
fertig ausgefüllten Kundenmails. Läuft komplett lokal — kein Server, kein Abo,
keine Installation.

## Starten

`index.html` doppelklicken. Empfohlen: **Google Chrome oder Microsoft Edge**
(nur dort funktioniert die gemeinsame Datendatei fürs Büro, siehe unten).

Tipp: Die Seite als Lesezeichen speichern oder eine Verknüpfung auf den Desktop legen.

## Die fünf Bereiche

| Bereich | Wofür |
| --- | --- |
| **Heute** | Was ist fällig (Nachfassen, Erinnerungen, Freigaben) und welche Termine kommen. Oben der *Fliesenspiegel*: jedes laufende Bad als Fliese in der Spalte seiner Phase. |
| **Projekte** | Alle Bäder, gruppiert nach Anfrage · Planung & Angebot · Auftrag & Vorbereitung · Baustelle & Abschluss. Suche und Filter nach Zuständigkeit/Status. |
| **Projektakte** | Klick auf ein Projekt: Checkliste der aktuellen Phase, Formulare, Kundenmails, Termine, Wiedervorlage, Notizen, Verlauf. „Weiter zu …" schaltet die nächste Phase frei. |
| **Ablauf** | Das Handbuch — alle 13 Phasen mit Erklärungen. Zu jeder Phase gibt es ein Notizfeld fürs Team, ganz unten allgemeine Notizen. |
| **Vorlagen** | Alle Formulare und Mailvorlagen nach Phase. |
| **Einrichtung** | Firma, Farben, Team, Programme, Fristen, Speicherort. |

## Was automatisch unter „Heute" auftaucht

- **Fotos & Maße nachfragen** — 3 Tage vor dem Erstgespräch, solange noch nicht abgehakt
- **Terminbestätigung senden** — sobald ein Erstgesprächstermin eingetragen ist
- **Angebot & Planung prüfen** — 3 Tage vor der Angebotsbesprechung
- **Angebotsverfolgung** — 7 Tage nach der Angebotsbesprechung (mit Wiedervorlage verschiebbar)
- **Exposé zur Freigabe schicken** — 3 Tage nach der Materialauswahl
- **Kundenerinnerung vor Baustart** — 7 Tage vor Baustart
- **Schlussrechnung** — nach der Abnahme
- **Bewertung nachhaken** — 7 Tage nach der Abnahme
- **jede Wiedervorlage**, die man in einer Akte setzt

Die Tage lassen sich unter *Einrichtung → Fristen* ändern.

## Kundenmails

In der Akte auf die Mail klicken: Anrede, Name, Termine und PaletteMove-Code
sind schon eingesetzt. Fehlt etwas, steht es gelb markiert oben und als ‹Lücke› im Text.
Optionale Absätze (z. B. „Deckenspots") per Häkchen an/aus.

- **Text kopieren** → in die Outlook-Vorlage bzw. den Entwurf im Kundenpostfach einfügen
  (dort stecken Signatur, Bilder und Broschüren-Anhänge)
- **Im Mailprogramm öffnen** → neue Mail mit Empfänger, Betreff und Text
- **Als gesendet markieren** → Datum wird in der Akte vermerkt, die Aufgabe abgehakt

## Daten: wo liegen die Projekte?

**Standard:** im Browser dieses Computers. Unter *Einrichtung → Sicherung herunterladen*
regelmäßig eine Sicherung ziehen.

**Fürs ganze Büro (empfohlen):** *Einrichtung → Neue Datendatei anlegen* und die Datei
auf dem Netzlaufwerk speichern (z. B. `MOMO1\Bad\badprojekte.json`). An jedem anderen
Arbeitsplatz einmal *Vorhandene Datei verbinden* → dieselbe Datei wählen. Ab dann sehen
alle dieselben Projekte; Änderungen der Kolleg:innen kommen alle 20 Sekunden bzw. beim
Zurückwechseln ins Fenster an. Bearbeiten zwei Personen gleichzeitig *verschiedene*
Projekte, geht nichts verloren; beim *selben* Projekt gewinnt die zuletzt gespeicherte
Änderung.

Nach einem Browser-Neustart fragt Chrome/Edge einmal nach der Erlaubnis — links unten
auf **Wieder verbinden** klicken.

## Auf eine andere Firma übertragen

1. Ordner kopieren.
2. Dashboard öffnen → **Einrichtung**: Firmendaten, Farben, Team (mit Rollen und Kürzeln),
   Programme, Ordnerpfade und Fristen eintragen → **Übernehmen**.
3. **firma.js herunterladen** und damit `einstellungen/firma.js` ersetzen
   (dann gilt das auch für neue Browser/Arbeitsplätze).
4. Logo als `app/img/logo.svg` (oder .png — Pfad in der Einrichtung angeben) ablegen.
5. Eigene Formulare in `vorlagen/<phase>/` legen und in `einstellungen/ablauf.js`
   bei der jeweiligen Phase unter `dokumente` eintragen.
6. Mailtexte in `einstellungen/mailvorlagen.js` anpassen.
7. Unter *Einrichtung* die Beispielprojekte entfernen (falls geladen).

Im Ablauf stehen keine festen Namen, sondern Rollen-Platzhalter wie `{badberater}`,
`{badplanung}`, `{projektleiter}` oder `{programm.erp}`. Wer in der Einrichtung als
Badplanerin eingetragen ist, steht automatisch an allen passenden Stellen.

### Ablauf ändern

`einstellungen/ablauf.js` mit einem Texteditor öffnen. Jede Phase ist ein Block mit
`titel`, `kurz`, `aufgaben`, `dokumente`, `mails`. Aufgaben ergänzen = eine Zeile
`{ t: "Aufgabe", d: "Erklärung" },` dazuschreiben. Speichern, Dashboard neu laden.

### Vorschaubilder der Formulare

Liegen in `vorlagen/_vorschau/` (Dateiname = Pfad mit `_` statt `/`, Endung `.jpg`).
Fehlt eins, zeigt das Dashboard ein leeres Blatt — funktioniert trotzdem.

## Ordner

```
Dashboard/
├── index.html              ← doppelklicken
├── ANLEITUNG.md
├── einstellungen/
│   ├── firma.js            ← Firma, Team, Programme, Fristen
│   ├── ablauf.js           ← die 13 Phasen
│   └── mailvorlagen.js     ← Kundenmails
├── vorlagen/               ← Formulare (PDF/DOCX), Outlook-Vorlagen (.oft), Vorschaubilder
└── app/                    ← Programm (nicht ändern nötig)
```

Die Originale liegen unverändert in `../Bad_Dashboard/`.
