/* ==========================================================================
   FORMULARE — die Papierformulare als digitale Formulare
   --------------------------------------------------------------------------
   Feld-Typen
     abschnitt   Zwischenüberschrift                 { titel }
     text        einzeilig            textarea  mehrzeilig
     zahl        Zahl (einheit: "m²")  datum     Datum
     janein      Ja / Nein
     auswahl     eine Option          { optionen: [...] }
     mehrfach    mehrere Optionen     { optionen: [...] }
     kunde       Feld der Kundendaten (wird mit dem Projekt geteilt)   { feld: "vorname" }
     wer         Auswahlliste „Wer macht das?“: eigene Monteure + externe Partner
                 { gewerk: "Elektro" } filtert die Partner nach Gewerk;
                 { quelle: "projektuebersicht.elektrikerWer" } übernimmt den Wert
                 von dort (zentral eingetragen, hier nur angezeigt)
     dateien     Upload direkt im Formular → landet im Projektordner   { kategorie }
     unterschrift  Unterschriftenfeld (Maus, Finger, Stift)
     tabelle     { spalten: [{ id, titel, typ }], zeilen: ["Armatur", …] }
                 ohne zeilen → Zeilen frei hinzufügen
     checkliste  { punkte: [{ id, label, optional }], modus: "haken" | "janein" | "pruefung" }
                 Tabellen mit festen Zeilen bekommen automatisch „+ Eigene Zeile“

   Optionen pro Feld
     pflicht: true       muss ausgefüllt sein, damit das Formular als erledigt gilt
     breite: "halb" | "drittel"   (Standard: volle Breite)
     wenn: { feld, wert }        nur sichtbar, wenn ein anderes Feld diesen Wert hat
     wenn: { formular, feld, wert }  … oder ein Feld eines anderen Formulars
                                    (ist das andere Formular leer, wird angezeigt)
     vorbelegen: "termin:erstgespraech" | "heute"
   ========================================================================== */

(function () {
  const JN = "janein";
  const AUSWAHL_SPALTEN = [
    { id: "typ", titel: "Typ" },
    { id: "lieferant", titel: "Lieferant" },
    { id: "stueck", titel: "Stück", typ: "zahl" },
    { id: "artnr", titel: "Artikel-Nr." },
  ];
  const abschnittAuswahl = (id, titel, zeilen, extra = []) => [
    { typ: "abschnitt", titel },
    { id: id + "-noetig", typ: "auswahl", label: "Wird benötigt?", optionen: ["ja", "entfällt"], pflicht: true, breite: "halb" },
    { id, typ: "tabelle", label: titel, spalten: AUSWAHL_SPALTEN, zeilen, wenn: { feld: id + "-noetig", wert: "ja" } },
    ...extra.map((f) => ({ ...f, wenn: { feld: id + "-noetig", wert: "ja" } })),
    { id: id + "-notiz", typ: "textarea", label: `Notizen ${titel.replace(/^\d+\.\s*/, "")}`, wenn: { feld: id + "-noetig", wert: "ja" } },
  ];

  window.FORMULARE = {
    bestandsaufnahme: {
      titel: "Bestandsaufnahme Bad",
      vorlage: "vorlagen/01-kundenanfrage/Bestandsaufnahme-Bad.docx",
      felder: [
        { typ: "abschnitt", titel: "Anfrage" },
        { id: "datum", typ: "datum", label: "Anfrage vom", pflicht: true, breite: "drittel", vorbelegen: "heute" },
        { id: "kundenart", typ: "auswahl", label: "Kunde", optionen: ["Neukunde", "Stammkunde"], pflicht: true, breite: "drittel" },
        { id: "eigentum", typ: "auswahl", label: "Wohnsituation", optionen: ["Eigentümer", "Mieter"], pflicht: true, breite: "drittel" },
        { id: "kontakt", typ: "auswahl", label: "Wie kam der Kontakt zustande?", optionen: ["Website / Badrechner", "Empfehlung", "Social Media", "Stammkunde", "Sonstiges"], pflicht: true },
        { id: "kontaktText", typ: "text", label: "Details zum Kontakt (z. B. empfohlen von …, Messe, Zeitung)" },

        { typ: "abschnitt", titel: "Kunde" },
        { id: "anrede", typ: "kunde", feld: "anrede", label: "Anrede", breite: "drittel", pflicht: true },
        { id: "vorname", typ: "kunde", feld: "vorname", label: "Vorname", breite: "drittel" },
        { id: "nachname", typ: "kunde", feld: "nachname", label: "Nachname", breite: "drittel", pflicht: true },
        { id: "strasse", typ: "kunde", feld: "strasse", label: "Straße", breite: "drittel", pflicht: true },
        { id: "hausnr", typ: "kunde", feld: "hausnr", label: "Hausnummer", breite: "drittel", pflicht: true },
        { id: "ort", typ: "kunde", feld: "ort", label: "PLZ & Ort", breite: "halb", pflicht: true },
        { id: "email", typ: "kunde", feld: "email", label: "E-Mail", breite: "halb", pflicht: true },
        { id: "telefon", typ: "kunde", feld: "telefon", label: "Telefon privat", breite: "halb" },
        { id: "telefonGeschaeft", typ: "kunde", feld: "telefonGeschaeft", label: "Telefon geschäftlich", breite: "halb" },
        { id: "mobil", typ: "kunde", feld: "mobil", label: "Telefon mobil", breite: "halb" },
        { id: "rechnung", typ: "text", label: "Rechnungsadresse / Kunden-Nr. (falls abweichend)", breite: "halb" },
        { id: "bauvorhaben", typ: "text", label: "Bauvorhaben (falls andere Adresse)", breite: "halb" },

        { typ: "abschnitt", titel: "Gebäude" },
        { id: "haus", typ: "auswahl", label: "Gebäude", optionen: ["Einfamilienhaus", "Mehrfamilienhaus", "Wohn-/Geschäftshaus"], pflicht: true },
        { id: "einheiten", typ: "zahl", label: "Wie viele Wohneinheiten?", breite: "drittel", wenn: { feld: "haus", wert: "Mehrfamilienhaus" } },
        { id: "etage", typ: "text", label: "In welcher Etage ist das Bad / WC?", breite: "drittel" },
        { id: "baujahr", typ: "zahl", label: "Baujahr des Hauses", breite: "drittel" },
        { id: "qm", typ: "zahl", label: "Größe Bad / WC", einheit: "m²", breite: "drittel" },

        { typ: "abschnitt", titel: "1. Was soll konkret gemacht werden?" },
        { id: "art", typ: "auswahl", label: "Vorhaben", optionen: ["Neubau", "Renovierung"], pflicht: true, breite: "halb" },
        { id: "umfang", typ: "auswahl", label: "Umfang", optionen: ["Komplettsanierung (alles aus einer Hand)", "Teilsanierung", "Nur Gewerke", "Nur Materiallieferung"], pflicht: true },
        { id: "bereiche", typ: "mehrfach", label: "Was genau?", optionen: ["Duschbad", "Gäste-WC", "Fliesen", "Decke", "Beleuchtung", "Dusche", "Wanne", "Whirlpool", "Dampfdusche", "Badmöbel", "Planung Bad & Heizung"] },
        { id: "sonstiges", typ: "text", label: "Sonstiges" },

        { typ: "abschnitt", titel: "2. Wie groß ist das Bad?" },
        { id: "laenge", typ: "zahl", label: "Länge", einheit: "cm", breite: "drittel" },
        { id: "breite", typ: "zahl", label: "Breite", einheit: "cm", breite: "drittel" },
        { id: "hoehe", typ: "zahl", label: "Höhe", einheit: "cm", breite: "drittel" },

        { typ: "abschnitt", titel: "3. Realisierung & 4. Budget" },
        { id: "von", typ: "text", label: "Realisierungszeitraum von", breite: "halb" },
        { id: "bis", typ: "text", label: "bis", breite: "halb" },
        { id: "budget", typ: "auswahl", label: "Budgetvorstellung", optionen: ["ca. 10.000 €", "ca. 15.000 €", "ca. 30.000 €", "anderes"], pflicht: true },
        { id: "budgetFrei", typ: "text", label: "Budget (eigene Angabe)", wenn: { feld: "budget", wert: "anderes" } },

        { typ: "abschnitt", titel: "5. Bemerkungen" },
        { id: "bemerkungen", typ: "textarea", label: "Bemerkungen" },
      ],
    },

    erstgespraech: {
      titel: "Erstgesprächs-Notizen",
      vorlage: "vorlagen/03-erstgespraech/Erstgespraechs-Notizen.docx",
      felder: [
        { id: "datum", typ: "datum", label: "Datum", pflicht: true, breite: "halb", vorbelegen: "termin:erstgespraech" },
        { typ: "abschnitt", titel: "Was soll gemacht werden?" },
        { id: "sanierung", typ: "auswahl", label: "Sanierung", optionen: ["Komplettsanierung", "Teilsanierung"], pflicht: true, breite: "halb" },
        { id: "bereich", typ: "text", label: "Welcher Bereich?", wenn: { feld: "sanierung", wert: "Teilsanierung" } },
        { id: "sanNotiz", typ: "textarea", label: "Notizen" },
        { typ: "abschnitt", titel: "Badeinrichtung" },
        { id: "moebel", typ: JN, label: "Möbel", pflicht: true, breite: "drittel" }, { id: "moebelNotiz", typ: "text", label: "Möbel – Wünsche", wenn: { feld: "moebel", wert: "ja" } },
        { id: "wc", typ: JN, label: "WC", pflicht: true, breite: "drittel" }, { id: "wcNotiz", typ: "text", label: "WC – Wünsche", wenn: { feld: "wc", wert: "ja" } },
        { id: "wanne", typ: JN, label: "Badewanne", pflicht: true, breite: "drittel" }, { id: "wanneNotiz", typ: "text", label: "Badewanne – Wünsche", wenn: { feld: "wanne", wert: "ja" } },
        { id: "dusche", typ: JN, label: "Dusche", pflicht: true, breite: "drittel" }, { id: "duscheNotiz", typ: "text", label: "Dusche – Wünsche", wenn: { feld: "dusche", wert: "ja" } },
        { id: "heizkoerper", typ: JN, label: "Heizkörper", pflicht: true, breite: "drittel" }, { id: "heizNotiz", typ: "text", label: "Heizkörper – Wünsche", wenn: { feld: "heizkoerper", wert: "ja" } },
        { typ: "abschnitt", titel: "Vorhandene Fliesen" },
        { id: "fliesenAlt", typ: "auswahl", label: "Fliesen", optionen: ["raus", "bleiben"], pflicht: true, breite: "halb" },
        { id: "fliesenAltWo", typ: "mehrfach", label: "Wo?", optionen: ["Wand", "Boden"], breite: "halb" },
        { typ: "abschnitt", titel: "Wand / Boden / Decke" },
        { id: "fugenlos", typ: JN, label: "Fugenlos", pflicht: true, breite: "drittel" },
        { id: "wandFliesen", typ: JN, label: "Wand: Fliesen", breite: "drittel" },
        { id: "wandRenoDeko", typ: JN, label: "Wand: Reno Deko", breite: "drittel" },
        { id: "wandPutz", typ: JN, label: "Wand: Putz", breite: "drittel" },
        { id: "wandTapete", typ: JN, label: "Wand: Tapete", breite: "drittel" },
        { id: "bodenFliesen", typ: JN, label: "Boden: Fliesen", breite: "drittel" },
        { id: "bodenVinyl", typ: JN, label: "Boden: Vinyl", breite: "drittel" },
        { id: "wbdNotiz", typ: "textarea", label: "Wand / Boden / Decke – Notizen" },
        { typ: "abschnitt", titel: "Elektrik, Fenster, Tür" },
        { id: "fi", typ: JN, label: "FI-Schutzschalter vorhanden", pflicht: true, breite: "drittel" },
        { id: "fenster", typ: JN, label: "Fenster", pflicht: true, breite: "drittel" },
        { id: "tuer", typ: JN, label: "Türe", pflicht: true, breite: "drittel" },
        { id: "elNotiz", typ: "textarea", label: "Elektrik / Fenster / Tür – Notizen" },
        { typ: "abschnitt", titel: "Skizzen & Notizen" },
        { id: "skizzen", typ: "dateien", kategorie: "skizzen", label: "Skizze (Foto der Handskizze)" },
        { id: "notizen", typ: "textarea", label: "Notizen" },
      ],
    },

    baustellenbesichtigung: {
      titel: "Checkliste Baustellenbesichtigung",
      vorlage: "vorlagen/06-baustellenbesichtigung/Checkliste-Baustellenbesichtigung.docx",
      felder: [
        { id: "datum", typ: "datum", label: "Datum", pflicht: true, breite: "halb", vorbelegen: "termin:baustellenbesichtigung" },
        { id: "tuertausch", typ: JN, label: "Türentausch geplant? (bei Ja folgt „Angaben zur Tür“)", pflicht: true, breite: "halb" },
        { typ: "abschnitt", titel: "Vor Ort erledigt" },
        { id: "check", typ: "checkliste", modus: "janein", label: "Checkliste", pflicht: true, punkte: [
          { id: "fotoBad", label: "Fotos vom Bad" },
          { id: "fotoWc", label: "Fotos vom WC", optional: true },
          { id: "aufmassBad", label: "Aufmaß Bad" },
          { id: "aufmassWc", label: "Aufmaß WC", optional: true },
          { id: "fensterTuer", label: "Fenster- und Türenmaße" },
          { id: "wasserzaehler", label: "Wasserzähler Maße" },
          { id: "heizkoerper", label: "Heizkörperanschluss Maße" },
          { id: "estrich", label: "Höhe Estrich" },
          { id: "grundriss", label: "Grundriss Wohnung/Haus" },
          { id: "staubschutz", label: "Fotos mit Notizen: wo wird Staubschutz benötigt" },
          { id: "sicherung", label: "Foto Sicherungskasten mit Beschriftung/Position" },
          { id: "eingang", label: "Fotos Eingangsbereich" },
          { id: "parken", label: "Parkmöglichkeiten abgeklärt + Fotos" },
          { id: "entsorgung", label: "Fotos der Entsorgungswege" },
          { id: "garten", label: "Fotos Garten", optional: true },
          { id: "rohre", label: "Fotos Rohr-/Wasserleitungen im Keller (Stand-/Wand-WC …)" },
          { id: "absperr", label: "Funktionsprüfung Absperrhähne Wasserzulauf Bad + WC" },
          { id: "hausverwaltung", label: "Infos Hausverwaltung", optional: true },
        ] },
        { id: "system", typ: "auswahl", label: "Heizkörper-System", optionen: ["Einrohrsystem", "Zweirohrsystem"], pflicht: true, breite: "halb" },
        { id: "fotos", typ: "dateien", kategorie: "baustelle", label: "Fotos von der Besichtigung", pflicht: true },
        { typ: "abschnitt", titel: "Raummaße" },
        { id: "raumhoehe", typ: "zahl", label: "Raumhöhe", einheit: "cm", breite: "drittel", pflicht: true },
        { id: "raumlaenge", typ: "zahl", label: "Länge", einheit: "cm", breite: "drittel" },
        { id: "raumbreite", typ: "zahl", label: "Breite", einheit: "cm", breite: "drittel" },
        { id: "skizze", typ: "dateien", kategorie: "skizzen", label: "Raumskizze mit Bemaßung" },
        { typ: "abschnitt", titel: "Stundeneinschätzung" },
        { id: "stunden", typ: "tabelle", label: "Ungefähre Stunden je Arbeit (jede Zeile ausfüllen, 0 wenn entfällt)", pflicht: true, alleZeilen: "h", spalten: [{ id: "h", titel: "Stunden", typ: "zahl" }],
          zeilen: ["Staubschutz", "Abrissarbeiten", "Installationsarbeiten", "Malerarbeiten", "Fliesenarbeiten", "Fertigmontage"] },
        { id: "notizen", typ: "textarea", label: "Notizen" },
      ],
    },

    tuer: {
      titel: "Angaben zur Tür",
      blatt: "tuer",   // Original-Blatt „Angaben zur Türen-Bestellung“ als Ansicht (siehe app/js/formular.js)
      felder: [
        { id: "anschlag", typ: "auswahl", label: "Anschlag", optionen: ["DIN links", "DIN rechts"], pflicht: true, breite: "halb" },
        { id: "riegel", typ: JN, label: "mit WC-Riegel", pflicht: true, breite: "halb" },
        { id: "oeffnet", typ: "auswahl", label: "Tür öffnet", optionen: ["in Raum / nach innen", "in Flur / nach außen"], pflicht: true },
        { id: "breite", typ: "auswahl", label: "Breite (Maueröffnung → Türblatt nach DIN 18101)", pflicht: true, optionen: ["62,5–66,5 cm → 61,0 cm", "75,0–79,0 cm → 73,5 cm", "87,5–91,5 cm → 86,0 cm", "100,0–104,0 cm → 98,5 cm"] },
        { id: "hoehe", typ: "auswahl", label: "Höhe (Maueröffnung → Türblatt)", pflicht: true, optionen: ["200,0–202,5 cm → 198,5 cm", "212,5–215,0 cm → 211,0 cm"] },
        { id: "wand", typ: "auswahl", label: "Wandstärke (Normzarge, Verstellbereich +1,7 cm)", pflicht: true, optionen: ["9,0 cm", "12,0 cm", "14,0 cm", "16,0 cm", "20,0 cm", "26,5 cm", "33,0 cm"] },
        { id: "farbeFront", typ: "text", label: "Farbe Frontseite", breite: "halb" },
        { id: "farbeRueck", typ: "text", label: "Farbe Rückseite", breite: "halb" },
        { id: "schiebe", typ: JN, label: "Schiebetür?", pflicht: true, breite: "halb", ausserhalbBlatt: true },
        { id: "durchgang", typ: "text", label: "Durchgangsmaß H × B", breite: "halb", wenn: { feld: "schiebe", wert: "ja" }, ausserhalbBlatt: true },
        { id: "blatt", typ: "text", label: "Türblattmaß H × B", breite: "halb", wenn: { feld: "schiebe", wert: "ja" }, ausserhalbBlatt: true },
        { id: "montage", typ: "auswahl", label: "Montage", optionen: ["im Bad", "auf der Flurseite"], breite: "drittel", wenn: { feld: "schiebe", wert: "ja" }, ausserhalbBlatt: true },
        { id: "richtung", typ: "auswahl", label: "öffnet nach", optionen: ["links", "rechts"], breite: "drittel", wenn: { feld: "schiebe", wert: "ja" }, ausserhalbBlatt: true },
        { id: "material", typ: "auswahl", label: "Material", optionen: ["Holz", "Glas"], breite: "drittel", wenn: { feld: "schiebe", wert: "ja" }, ausserhalbBlatt: true },
        { id: "notizen", typ: "textarea", label: "Allgemeine Notizen", ausserhalbBlatt: true },
      ],
    },

    projektuebersicht: {
      titel: "Projekt-Übersicht",
      vorlage: "vorlagen/07-materialauswahl/Projekt-Uebersicht.pdf",
      felder: [
        { typ: "abschnitt", titel: "Was wird benötigt?" },
        { id: "abriss", typ: JN, label: "Abriss", pflicht: true, breite: "drittel" },
        { id: "abrissWer", typ: "wer", gewerk: "Abriss", label: "Abriss – wer?", pflicht: true, breite: "drittel", wenn: { feld: "abriss", wert: "ja" } },
        { id: "estrich", typ: "text", label: "Info Estrich", breite: "drittel" },
        { id: "elektriker", typ: JN, label: "Elektriker", pflicht: true, breite: "drittel" },
        { id: "elektrikerWer", typ: "wer", gewerk: "Elektro", label: "Elektriker – wer?", pflicht: true, breite: "drittel", wenn: { feld: "elektriker", wert: "ja" } },
        { id: "licht", typ: "mehrfach", label: "Licht", optionen: ["Decke", "Nische", "Spiegelschrank"] },
        { id: "lichtNotiz", typ: "text", label: "Licht – Notizen" },
        { id: "fliesen", typ: JN, label: "Fliesen", pflicht: true, breite: "drittel" },
        { id: "fliesenWo", typ: "mehrfach", label: "Fliesen wo?", optionen: ["Wand", "Boden"], breite: "drittel", wenn: { feld: "fliesen", wert: "ja" } },
        { id: "fliesenWer", typ: "wer", gewerk: "Fliesen", label: "Fliesen – wer?", breite: "drittel", wenn: { feld: "fliesen", wert: "ja" } },
        { id: "resopal", typ: JN, label: "Resopal", pflicht: true, breite: "drittel" },
        { id: "resopalWo", typ: "mehrfach", label: "Resopal wo?", optionen: ["Wand", "Boden", "Duschboard"], wenn: { feld: "resopal", wert: "ja" } },
        { typ: "abschnitt", titel: "Wände & Decke" },
        { id: "wandflaechen", typ: "mehrfach", label: "Wandflächen", optionen: ["Verputzen", "Tapezieren", "Spachteltechnik"] },
        { id: "putzbuendig", typ: JN, label: "Wände putzbündig", breite: "halb" },
        { id: "putzbuendigWelche", typ: "text", label: "Welche Wände?", breite: "halb", wenn: { feld: "putzbuendig", wert: "ja" } },
        { id: "sockel", typ: JN, label: "Sockel putzbündig", breite: "halb" },
        { id: "decke", typ: "mehrfach", label: "Decke", pflicht: true, optionen: ["Verputzen", "Tapezieren", "Streichen", "Spanndecke", "Gipskarton", "Bleibt", "Bauseits"] },
        { typ: "abschnitt", titel: "Fenster & Tür" },
        { id: "fenster", typ: JN, label: "Fenster", pflicht: true, breite: "halb" },
        { id: "fensterbauer", typ: "wer", gewerk: "Fensterbau", label: "Fenster – wer?", pflicht: true, breite: "halb", wenn: { feld: "fenster", wert: "ja" } },
        { id: "fensterbank", typ: JN, label: "Fensterbank", breite: "drittel" },
        { id: "fbMaterial", typ: "text", label: "Material", breite: "drittel", wenn: { feld: "fensterbank", wert: "ja" } },
        { id: "fbFarbe", typ: "text", label: "Farbe", breite: "drittel", wenn: { feld: "fensterbank", wert: "ja" } },
        { id: "tuer", typ: JN, label: "Tür", pflicht: true, breite: "drittel" },
        { id: "tuerWer", typ: "wer", gewerk: "Schreiner", label: "Tür – wer?", pflicht: true, breite: "drittel", wenn: { feld: "tuer", wert: "ja" } },
        { id: "tuerArt", typ: "mehrfach", label: "Art", optionen: ["Schiebetür", "Zarge"], wenn: { feld: "tuer", wert: "ja" } },
        { id: "verbreitert", typ: JN, label: "Wird die Tür verbreitert?", breite: "halb", wenn: { feld: "tuer", wert: "ja" } },
        { id: "verbreitertMass", typ: "text", label: "Auf welches Maß?", breite: "halb", wenn: { feld: "verbreitert", wert: "ja" } },
        { id: "bemerkungen", typ: "textarea", label: "Sonstige Infos / Bemerkungen" },
      ],
    },

    auswahl: {
      titel: "Traumbad-Auswahlgespräch",
      vorlage: "vorlagen/07-materialauswahl/Traumbad-Auswahlgespraech.pdf",
      felder: [
        ...abschnittAuswahl("waschtisch", "1. Waschtischanlage", ["Armatur", "Möbelwaschtisch", "Waschtischunterschrank", "Hochschrank", "Spiegelschrank", "Beleuchtung"], [
          { id: "hahnloch", typ: JN, label: "Hahnlochbohrung", breite: "drittel" },
          { id: "wtuGriff", typ: "text", label: "Unterschrank: Grifftyp", breite: "drittel" },
          { id: "wtuFront", typ: "text", label: "Unterschrank: Frontfarbe", breite: "drittel" },
          { id: "wtuKorpus", typ: "text", label: "Unterschrank: Korpusfarbe", breite: "drittel" },
          { id: "hsGriff", typ: "text", label: "Hochschrank: Grifftyp", breite: "drittel" },
          { id: "hsFront", typ: "text", label: "Hochschrank: Frontfarbe", breite: "drittel" },
          { id: "hsKorpus", typ: "text", label: "Hochschrank: Korpusfarbe", breite: "drittel" },
          { id: "ssSteckdose", typ: JN, label: "Spiegelschrank: Steckdose", breite: "drittel" },
          { id: "ssKorpus", typ: "text", label: "Spiegelschrank: Korpusfarbe", breite: "drittel" },
        ]),
        ...abschnittAuswahl("dusche", "2. Dusche", ["Kabine", "Armatur", "UP-Körper", "Handbrause", "Brausestange", "Brauseschlauch", "Wandanschlussbogen", "Kopfbrause", "Brausearm", "Duschwanne / Rinne", "Abdeckung", "Ablauf"], [
          { id: "dProfil", typ: "text", label: "Kabine: Profilfarbe", breite: "drittel" },
          { id: "dHoehe", typ: "text", label: "Kabine: Höhe", breite: "drittel" },
          { id: "dBeschichtung", typ: "text", label: "Kabine: Beschichtung", breite: "drittel" },
          { id: "dMontage", typ: "auswahl", label: "Montage auf", optionen: ["Wanne", "Fliese"], breite: "halb" },
        ]),
        ...abschnittAuswahl("wanne", "3. Badewanne", ["Wanne", "Wannenfuß", "Wannenleiste", "Wannendichtband", "Multiplex Trio", "Fertig Set", "Kabine", "Armatur", "UP-Körper", "Handbrause", "Brausestange", "Brauseschlauch", "Wandanschlussbogen", "Kopfbrause", "Brausearm"], [
          { id: "wProfil", typ: "text", label: "Kabine: Profilfarbe", breite: "halb" },
          { id: "wHoehe", typ: "text", label: "Kabine: Höhe", breite: "halb" },
          { id: "wMontage", typ: "auswahl", label: "Montage auf", optionen: ["Wanne", "Fliese"], breite: "halb" },
        ]),
        ...abschnittAuswahl("wc", "4. WC", ["UP Montage", "WC", "Sitz", "Drücker", "Einwurfschacht", "Geruchsabsaugung"]),
        ...abschnittAuswahl("gwt", "5. Gäste-WC – Waschtisch", ["Armatur", "Möbelwaschtisch", "Waschtischunterschrank", "Spiegelschrank", "Beleuchtung"], [
          { id: "gwtGriff", typ: "text", label: "Unterschrank: Grifftyp", breite: "drittel" },
          { id: "gwtFront", typ: "text", label: "Unterschrank: Frontfarbe", breite: "drittel" },
          { id: "gwtKorpus", typ: "text", label: "Unterschrank: Korpusfarbe", breite: "drittel" },
        ]),
        ...abschnittAuswahl("gwc", "6. Gäste-WC – WC", ["UP Montage", "WC", "Sitz", "Drücker"]),
        ...abschnittAuswahl("sonst", "7. Sonstiges", ["Heizkörper", "Zubehör", "Handtuchhalter"]),
        { typ: "abschnitt", titel: "Eigene Notizen" },
        { id: "notizen", typ: "textarea", label: "Notizen zum Auswahlgespräch" },
        { typ: "abschnitt", titel: "Bestätigung" },
        { id: "datum", typ: "datum", label: "Datum", pflicht: true, breite: "halb", vorbelegen: "termin:materialauswahl" },
        { id: "unterschrift", typ: "unterschrift", label: "Unterschrift Kunde", pflicht: true },
      ],
    },

    fliesen: {
      titel: "Fliesenarbeiten",
      vorlage: "vorlagen/07-materialauswahl/Fliesenarbeiten.pdf",
      felder: [
        { id: "firma", typ: "text", label: "Geplante Ausführung durch", breite: "halb", pflicht: true },
        { id: "flaechen", typ: "tabelle", label: "Flächen", pflicht: true,
          spalten: [{ id: "menge", titel: "Menge" }, { id: "groesse", titel: "Größe" }, { id: "verlegeart", titel: "Verlegeart" }, { id: "bez", titel: "Bezeichnung" }, { id: "artnr", titel: "Art.-Nr." }],
          zeilen: ["Wandfläche", "Bodenfläche", "Sockel", "Sonstiges"] },
        { id: "silikonWand", typ: "text", label: "Silikon Wand", breite: "halb" },
        { id: "silikonBoden", typ: "text", label: "Silikon Boden", breite: "halb" },
        { id: "fugeWand", typ: "text", label: "Fugenfarbe Wand", breite: "halb" },
        { id: "fugeBoden", typ: "text", label: "Fugenfarbe Boden", breite: "halb" },
        { id: "profil", typ: JN, label: "Profil", breite: "drittel", pflicht: true },
        { id: "profilForm", typ: "auswahl", label: "Form", optionen: ["Eckig", "Rund"], breite: "drittel", wenn: { feld: "profil", wert: "ja" } },
        { id: "profilFarbe", typ: "text", label: "Farbe", breite: "drittel", wenn: { feld: "profil", wert: "ja" } },
        { id: "buendig", typ: JN, label: "Flächenbündig", breite: "drittel", pflicht: true },
        { id: "bemerkungen", typ: "textarea", label: "Bemerkungen" },
      ],
    },

    elektro: {
      titel: "Elektroarbeiten",
      vorlage: "vorlagen/07-materialauswahl/Elektroarbeiten.pdf",
      felder: [
        { id: "firma", typ: "wer", quelle: "projektuebersicht.elektrikerWer", label: "Geplante Ausführung Firma", breite: "halb" },
        { id: "installation", typ: "datum", label: "Installations-Termin", breite: "drittel" },
        { id: "fertig", typ: "datum", label: "Fertigmontage-Termin", breite: "drittel" },
        { id: "posten", typ: "tabelle", label: "Elektro-Posten", pflicht: true,
          spalten: [{ id: "jn", titel: "ja/nein", typ: "janein" }, { id: "wo", titel: "wo" }, { id: "anzahl", titel: "Anzahl / m²" }, { id: "sonst", titel: "Sonstiges" }],
          zeilen: ["FI-Schutzschalter", "Beleuchtung 1", "Beleuchtung 2", "Beleuchtung 3", "Beleuchtung 4", "Steckdosen 1", "Steckdosen 2", "Steckdosen 3", "FBH elektrisch", "Lichtschalter 1", "Lichtschalter 2"] },
        { id: "bemerkungen", typ: "textarea", label: "Bemerkungen" },
      ],
    },

    abriss: {
      titel: "Abrissarbeiten",
      vorlage: "vorlagen/07-materialauswahl/Abrissarbeiten.pdf",
      felder: [
        { id: "abrissDurch", typ: "wer", quelle: "projektuebersicht.abrissWer", label: "Abriss durch", breite: "halb" },
        { id: "staubschutz", typ: "wer", gewerk: "Abriss", label: "Ausführung Staubschutz durch wen?", pflicht: true, breite: "halb" },
        { id: "posten", typ: "tabelle", label: "Abriss", pflicht: true,
          spalten: [{ id: "jn", titel: "Abriss", typ: "janein" }, { id: "info", titel: "Erläuterungen" }],
          zeilen: ["Wandbeläge", "Bodenbelag", "Sanitärgegenstände", "Vorwände", "Decke", "Türe", "Estrich", "Sonstiges"] },
        { id: "entsorgung", typ: "mehrfach", label: "Entsorgung Bauschutt über", optionen: ["Fenster", "Flur", "Treppenhaus"], pflicht: true },
        { id: "bemerkungen", typ: "textarea", label: "Bemerkungen" },
      ],
    },

    baustellenplan: {
      titel: "Baustellenplan",
      felder: [
        { id: "subs", typ: "tabelle", label: "Subunternehmer & Gewerke", pflicht: true,
          spalten: [{ id: "gewerk", titel: "Gewerk" }, { id: "firma", titel: "Firma" }, { id: "termin", titel: "Termin" }, { id: "bestaetigt", titel: "bestätigt", typ: "haken" }] },
        { id: "anschluss", typ: "textarea", label: "Anschlussmaße & Hinweise für die Monteure" },
        { id: "schluessel", typ: "text", label: "Schlüsselübergabe / Zugang" },
      ],
    },

    abschlag: {
      titel: "Abschlagsrechnung",
      felder: [
        { id: "betrag", typ: "zahl", label: "Betrag (netto)", einheit: "€", pflicht: true, breite: "halb" },
        { id: "am", typ: "datum", label: "gestellt am", pflicht: true, breite: "halb", vorbelegen: "heute" },
        { id: "datei", typ: "dateien", kategorie: "rechnungen", label: "Abschlagsrechnung als PDF", pflicht: true },
      ],
    },

    restarbeiten: {
      titel: "Restarbeiten & Reklamationen",
      vorlage: "vorlagen/10-baustellenablauf/Restarbeiten-Protokoll.pdf",
      erledigtWenn: "alleHaken",
      felder: [
        { id: "datum", typ: "datum", label: "Datum", breite: "halb", vorbelegen: "heute" },
        { id: "offen", typ: "tabelle", label: "Folgende Arbeiten sind noch offen",
          spalten: [{ id: "arbeit", titel: "Arbeit / Reklamation" }, { id: "wer", titel: "wer", typ: "person" }, { id: "erledigt", titel: "erledigt", typ: "haken" }] },
        { id: "zufrieden", typ: JN, label: "Alle Arbeiten zur Zufriedenheit des Kunden erledigt", pflicht: true },
        { id: "bemerkungen", typ: "textarea", label: "Wenn nein – Bemerkungen", wenn: { feld: "zufrieden", wert: "nein" } },
        { id: "unterschrift", typ: "unterschrift", label: "Unterschrift Kunde" },
      ],
    },

    abnahme: {
      titel: "Abnahmeprotokoll Fertigmontage",
      vorlage: "vorlagen/10-baustellenablauf/Abnahmeprotokoll-Fertigmontage.pdf",
      felder: [
        { id: "datum", typ: "datum", label: "Datum", pflicht: true, breite: "halb", vorbelegen: "termin:abnahme" },
        { typ: "abschnitt", titel: "Waschtisch-Anlage + Möbel", wenn: { formular: "auswahl", feld: "waschtisch-noetig", wert: "ja" } },
        { id: "wt", typ: "checkliste", modus: "pruefung", pflicht: true, wenn: { formular: "auswahl", feld: "waschtisch-noetig", wert: "ja" }, punkte: [
          { id: "fronten", label: "Schubladen- / Türfronten sind ausgerichtet" },
          { id: "druck", label: "Wasserdruck an den Armaturen stimmt" },
          { id: "ablauf", label: "Wasser läuft gut, gleichmäßig und vollständig ab" },
          { id: "oberflaeche", label: "Oberfläche im Sichtbereich des WTs ist anstandslos" } ] },
        { typ: "abschnitt", titel: "WC-Anlage", wenn: { formular: "auswahl", feld: "wc-noetig", wert: "ja" } },
        { id: "wc", typ: "checkliste", modus: "pruefung", pflicht: true, wenn: { formular: "auswahl", feld: "wc-noetig", wert: "ja" }, punkte: [
          { id: "spuelung", label: "2-Mengenspülung funktioniert" },
          { id: "absenk", label: "Absenkautomatik funktioniert" },
          { id: "duschwc", label: "Dusch-WC: Funktion geprüft und Kunde eingewiesen" } ] },
        { typ: "abschnitt", titel: "Dusch-Anlage", wenn: { formular: "auswahl", feld: "dusche-noetig", wert: "ja" } },
        { id: "dusche", typ: "checkliste", modus: "pruefung", pflicht: true, wenn: { formular: "auswahl", feld: "dusche-noetig", wert: "ja" }, punkte: [
          { id: "kopf", label: "Umstellung auf Kopfbrause funktioniert" },
          { id: "druck", label: "Wasserdruck der Armatur stimmt" },
          { id: "dichtung", label: "Dichtungen der Duschtüren lückenlos und fest" },
          { id: "hebesenk", label: "Hebe-Senk-Mechanismus der Duschtüren funktioniert" },
          { id: "ablauf", label: "Wasser läuft gut, gleichmäßig und vollständig ab" },
          { id: "pumpe", label: "Bodenpumpe: Funktion geprüft und Kunde eingewiesen" } ] },
        { typ: "abschnitt", titel: "Wannen-Anlage", wenn: { formular: "auswahl", feld: "wanne-noetig", wert: "ja" } },
        { id: "wanne", typ: "checkliste", modus: "pruefung", pflicht: true, wenn: { formular: "auswahl", feld: "wanne-noetig", wert: "ja" }, punkte: [
          { id: "umstellung", label: "Umstellung Wanneneinlauf auf Handbrause funktioniert" },
          { id: "druck", label: "Wasserdruck der Armatur stimmt" },
          { id: "oberflaeche", label: "Oberfläche im Sichtbereich der Wanne ist anstandslos" } ] },
        { typ: "abschnitt", titel: "Allgemeines" },
        { id: "allg", typ: "checkliste", modus: "pruefung", pflicht: true, punkte: [
          { id: "heizung", label: "Heizkörper entlüftet, wird warm, Anlage ggf. nachgefüllt" },
          { id: "belaege", label: "Wand-/Bodenbeläge, Putz- und Malerarbeiten erledigt und anstandslos" },
          { id: "fugen", label: "Sämtliche Fugen ordentlich und gleichmäßig gezogen" },
          { id: "licht", label: "Funktion sämtlicher Beleuchtungselemente getestet" },
          { id: "accessoires", label: "Accessoires angebracht / Funktion geprüft" } ] },
        { typ: "abschnitt", titel: "Raum-Tür", wenn: { formular: "projektuebersicht", feld: "tuer", wert: "ja" } },
        { id: "tuer", typ: "checkliste", modus: "pruefung", pflicht: true, wenn: { formular: "projektuebersicht", feld: "tuer", wert: "ja" }, punkte: [
          { id: "schliesst", label: "Tür schließt und öffnet einwandfrei" },
          { id: "oberflaeche", label: "Oberfläche der Tür ist anstandslos" },
          { id: "schloss", label: "Funktion Türschloss geprüft" } ] },
        { id: "sonstiges", typ: "textarea", label: "Sonstiges" },
        { typ: "abschnitt", titel: "Unterschriften" },
        { id: "uKunde", typ: "unterschrift", label: "Unterschrift Kunde", pflicht: true, breite: "halb" },
        { id: "uMitarbeiter", typ: "unterschrift", label: "Unterschrift Mitarbeiter", pflicht: true, breite: "halb" },
      ],
    },
  };
})();
