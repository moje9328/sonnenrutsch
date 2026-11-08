// ===================================================================
// 1 · EINSTELLUNGEN
// Alle Werte für Physik und Spielgefühl an einer Stelle.
// Welt in Metern, y zeigt nach OBEN. Zeit in Sekunden.
// ===================================================================

const K = {
  SCHRITT: 1 / 240,         // feste Physik-Schrittweite in Physikzeit (unabhängig von der Bildrate)
  // Physik läuft in echter Zeit. Bodentempo, Luftschwerkraft, Kamera, Hintergrund und
  // Tageslicht sind getrennt eingestellt (keine pauschale Zeitbeschleunigung mehr).
  MAX_SCHRITTE: 60,         // höchstens so viele Schritte je Bild (60 × 1/240 s = 0,25 s: auch auf langsamen Handys läuft das Spiel in Echtzeit, nach langen Hängern wird nicht endlos nachgeholt)
  MAX_BILDZEIT: 0.25,       // längste Bildzeit, die in einem Rutsch nachgerechnet wird (s)

  // Boden: flottes Vorwärtstempo (2 × so schnell wie die erste Version, Kräfte 2² ×)
  G: 96,                    // Schwerkraft entlang der Hänge (am Boden)
  SCHWER_BODEN: 3.0,        // gedrückt am Boden: so viel schwerer (bergab schneller, bergauf langsamer)
  LEICHT_BODEN: 0.65,       // losgelassen am Boden: Kalle ist leicht und gleitet den Hang hinauf
  // Luft: eigene, weichere Schwerkraft – Kalle steigt mit Schwung, geht am Gipfel weich über
  // und fällt zunehmend, aber nicht schlagartig
  G_LUFT: 44,               // Schwerkraft im Flug (losgelassen), m/s²
  SCHWER_LUFT: 3.4,         // gedrückt in der Luft: Sinkflug mit G_LUFT × dies …
  // Hohe Flüge sollen zügig nach vorn gehen, nicht schweben:
  FLUG_WINKEL_MAX: 36,      // steiler als so viele Grad steigt Kalle nach dem Absprung nicht lange …
  LENKEN_STAERKE: 3,      // … sondern wird weich nach vorn gelenkt (Anteil des Überschuss-Winkels pro Sekunde) …
  LENKEN_ANLAUF: 0.4,       // … das Lenken setzt über so viele Sekunden nach dem Absprung weich ein (kein Ruck) …
  HOEHE_SCHWER_AB: 35,      // ab so viel Metern über dem Boden zieht die Schwerkraft zunehmend stärker …
  HOEHE_SCHWER_BIS: 110,    // … bis sie ab dieser Höhe …
  HOEHE_SCHWER_EXTRA: 0.6,  // … um so viel stärker ist (×1,6) – kein endloses Schweben am Gipfel
  FALL_EXTRA: 0.3,          // beim Sinken wächst die Schwerkraft weich um bis zu diesen Anteil (schneller, zügiger Fall) …
  FALL_ANLAUF: 32,          // … voll erreicht bei so vielem Sinktempo (m/s); am Gipfel (vy = 0) ist der Zusatz 0 – kein Ruck
  SINKFLUG_ANLAUF: 0.1,     // … setzt in so vielen Sekunden weich ein und endet beim Loslassen sofort

  REIBUNG: 1.0,             // gleichmäßige Bremsung am Boden (m/s²)
  LUFTWIDERSTAND: 0.0004,   // Bremsung ~ v² am Boden
  LUFTWIDERSTAND_FLUG: 0.00025, // Bremsung ~ v² in der Luft (gering: Vorwärtstempo bleibt weitgehend)
  V_MIN_SCHWER: 10,         // wer bergauf schwer bleibt, wird so langsam
  KRABBELN: 88,             // gedrückt und langsamer als V_MIN: so schnell krabbelt Kalle los (m/s²)
  V_MIN: 28,                // gedrückt krabbelt Kalle mindestens so schnell (nie Feststecken); losgelassen kein Antrieb
  V_MAX: 160,               // Höchstgeschwindigkeit am Boden
  V_MAX_LUFT: 200,          // Sicherheitsgrenze in der Luft (wird im normalen Spiel nicht erreicht)
  V_START: 0,               // Kalle steht am Start, bis die Taste gedrückt wird

  // Landungen
  PERFEKT_WINKEL: 30,       // perfekt: Flugrichtung höchstens so viele Grad neben der Rampentangente …
  PERFEKT_QUER: 45,         // … und Aufprall quer zur Oberfläche höchstens so schnell (m/s) …
  PERFEKT_QUER_ANTEIL: 0.5, // … oder höchstens halb so schnell wie Kalle insgesamt (hohes Tempo disqualifiziert nicht)
  PERFEKT_MIN_HOEHE: 1.2,   // … und vorher wirklich in der Luft gewesen (Meter über Boden)
  GUT_WINKEL: 36,           // darunter: Kalle wird in den Hang umgelenkt und behält fast alles Tempo
  GUT_ERHALT: 0.95,         // so viel Tempo bleibt bei einer guten Landung mindestens
  ABHANG_WINKEL: 55,        // auf einem Abhang zählt eine Landung bis zu diesem Winkel noch als gut …
  ABHANG_ERHALT: 0.82,      // … und behält mindestens so viel Tempo
  PERFEKT_MIN_GEFAELLE: 0.18, // perfekt nur auf einem echt abfallenden Hang
  PERFEKT_MIN_FLUGZEIT: 0.25, // kleine Hüpfer an der Kuppe zählen nicht
  PERFEKT_BONUS: 0.05,      // +5 % Tempo …
  KETTEN_BONUS: 0.012,      // … plus 1,2 % je perfekter Landung in Folge
  KETTE_MAX: 5,
  HART_FAKTOR: 0.82,        // harte Landung am Gegenhang: zusätzlicher Tempoverlust

  // Tempo-Anstieg mit der Strecke (0 am Start, 1 nach TEMPO.WEG Metern bzw. am Ziel; weich, nie ein Sprung).
  // Es wächst nur die Bodenschwerkraft und das Krabbel-Mindesttempo; die Luftschwerkraft wächst
  // mit, damit Flüge bei höherem Tempo nicht länger schweben. Tageslicht und Zeit bleiben unberührt.
  TEMPO: {
    WEG: 2600,              // Endlosflug: so viele Meter bis zum vollen Tempo-Anstieg
    G_PLUS: 0.07,           // Bodenschwerkraft am Ende um so viel Anteil größer (bergab schneller)
    LUFT_PLUS: 0.06,        // Luftschwerkraft am Ende um so viel Anteil größer (Flüge bleiben dynamisch)
    V_MIN_PLUS: 8,          // Krabbel-Mindesttempo am Ende um so viel größer (m/s)
  },

  // Sprungflächen (Hafenpolster) auf Rampen. Gültig nur bei echtem Bodenkontakt (überfahren oder
  // darauf gelandet). Der Absprung folgt der Oberfläche (Tempo entlang des Hangs bleibt) plus einem
  // Stoß in Richtung „Oberflächennormale gemischt mit einer festen Vorwärts-/Aufwärtsrichtung“.
  MATTE: {
    BREITE: 15,             // Länge der Fläche (m)
    V_MIN: 32,              // langsamer als so (m/s) federt sie nur, ohne zu springen
    ERHALT: 0.96,           // so viel vom Tempo entlang der Oberfläche bleibt
    RICHTUNG: 52,           // feste Stoßrichtung (Grad über der Waagerechten, nach vorn) …
    MISCHUNG: 0.5,          // … zur Hälfte mit der Oberflächennormalen gemischt
    STOSS: [24, 36, 50],    // Stoßstärke (m/s): die Planung wählt die erste Stärke mit sicherer Landung
    V_MAX: 155,             // Gesamttempo nach dem Absprung höchstens (Sicherheitsgrenze)
    WINKEL_MIN: 8,          // Absprung mindestens so steil (Grad), damit es nie flach über die Fläche streift
    SPERRE: 4,              // erst wieder auslösbar, wenn Kalle so weit (m) von der Fläche weg war
    STEIGUNG: [0.2, 1.6], // Flächen liegen nur auf Rampen mit dieser Neigung (Höhe/Länge)
    LANDE_MIN_FLUGZEIT: 0.8,  // Planung: der Sprung muss mindestens so lange dauern …
    LANDE_MIN_HOEHE: 6,       // … und so hoch gehen (m über der Fläche)
    LANDE_TEMPI: [0.8, 1.0, 1.1], // … und bei diesen Anteilen des Anflugtempos nicht hart landen (bei 1,0 und mehr sauber auf einer Abfahrt)
  },

  // Luft-Sammelreihen (aus echten Flugbahnen des Testpiloten, siehe 3e-luft.js)
  LUFT: {
    ABSTAND: 5.2,           // Meter zwischen zwei Muscheln entlang der Flugbahn
    ANZAHL: [5, 9],
    MIN_GIPFEL: 14,         // Flüge unter so vielen Metern Gipfelhöhe bekommen keine Reihe (nach Sprungflächen: MIN_GIPFEL_MATTE)
    MIN_GIPFEL_MATTE: 5,
    MIN_ZEIT: 0.9,          // … und unter so vielen Sekunden Flugzeit auch nicht
    MIN_ZEIT_MATTE: 0.7,
    BONUS_GIPFEL: 65,       // ab dieser Gipfelhöhe gibt es die höhere Bonusreihe (golden endend)
    ZWEI_LINIEN: 0.35,      // Anteil der großen Flüge mit niedriger und hoher Alternativlinie
    ABSTAND_BODEN: 4,       // mindestens so hoch über dem Gelände (m), damit nichts im Boden steckt
    ABSTAND_BODEN_MATTE: 2.6,  // … nach Sprungflächen (flachere Hüpfer)
    MIN_TRENNUNG: 7,        // niedrige und hohe Linie mindestens so weit auseinander (m)
    PAUSE: 1,               // nach so vielen bestückten Abschnitten folgt ein freier Abschnitt
  },

  // Punkte für Reihen und Kombos (zusätzlich zu Muscheln und perfekten Landungen)
  PUNKTE: {
    REIHE: 30,              // vollständig gesammelte Reihe
    KOMBO_FENSTER: 9,       // Sekunden bis zum nächsten Erfolg, damit die Kombo weiterläuft
    KOMBO_SCHRITT: 5,       // Bonus je Kombo-Stufe (ab Stufe 2) …
    KOMBO_MAX: 5,           // … bis höchstens diese Stufe (also höchstens 40 Punkte je Erfolg)
    SUPERSPRUNG: 40,        // Landung nach einem Flug mit mindestens SUPER_GIPFEL Metern Gipfel
    SUPER_GIPFEL: 95,
  },

  MUSCHEL_RADIUS: 1.8,      // Sammelbereich: Abstand Kalles Mitte ↔ Muschel (Sensor, kein Stoß)
  MUSCHEL_HOEHE: 1.1,       // Muscheln schweben so weit über dem Boden (entlang der Normalen)
  KRABBE_MITTE: 1.0,        // Kalles Mitte liegt so weit über seinen Füßen
  GOLD_WERT: 5,             // eine goldene Muschel zählt so viel wie 5 normale

  // Flugrufe (Spiellogik in 3c-flugrufe.js, Stimme in 6b-rufe.js). Alles in Weltkoordinaten.
  RUF: {
    HOEHE: 85,              // gerufen wird nur, wenn Kalle wirklich so hoch über dem Absprung war (m) …
    WEITE: 255,             // … UND schon so weit geflogen ist (m, waagerecht). Pro Flug höchstens ein Ruf.
    YIPPIE_HOEHE: 105,      // „Yippie!“ statt „Juhu!“, wenn der Gipfel mindestens so hoch ist (m)
    ABSTAND: 15,            // Sekunden zwischen zwei Rufen mindestens (sonst entfällt der Ruf)
    BODEN_RUHE: 0.25,       // erst nach so langer stabiler Bodenzeit beginnt ein neuer Flug
  },


  // Endlosflug: Tageslicht in echten Sekunden, Strecken in Metern
  ENDLOS: {
    START: 120,             // so viel Tageslicht zu Beginn (echte Sekunden; läuft 1:1 mit der aktiven Spielzeit)
    MAX: 180,               // mehr passt nie in den Vorrat
    HIMMEL_REF: 75,         // Himmel bleibt hell, solange mehr als so viel übrig ist; darunter allmählich Abend
    MARKE_ERSTE: 1500,      // erste Distanzmarke (m) – bei Reisetempo etwa alle 15–20 s eine
    MARKE_WACHSTUM: 150,    // jede weitere Marke liegt so viel weiter als die vorige (Läufe enden sicher)
    MARKE_BONUS: 12,        // Tageslicht pro erreichter Marke (s)
    PERFEKT_BONUS: 3,       // Tageslicht pro perfekter Landung (s)
    PUNKTE_MUSCHEL: 10,     // Punkte je Muschelwert (Gold zählt 5×)
    PUNKTE_PERFEKT: 25,     // Punkte je perfekter Landung
    SCHWIERIG_WEG: 15000,   // nach so vielen Metern ist die volle Schwierigkeit erreicht (danach bleibt sie)
    VORLAUF: 2000,          // so weit voraus ist das Gelände immer schon gebaut (m)
    GEIST_VORLAUF: 900,     // so weit voraus fliegt der unsichtbare Testpilot, der die Landezonen findet
    HINTEN: 400,            // weiter zurück wird Gelände entfernt (m)
  },


  ABHEBEN_SCHWELLE: 1.0,    // v²·Krümmung > g·cos·Schwelle → Kalle hebt ab

  // Kamera
  KAM_VORAUS: 0.26,         // Kalle steht bei 26 % der Bildbreite (mehr Blick nach vorn)
  KAM_BREITE_MIN: 58,       // so viele Meter sieht man mindestens nach vorn/hinten (Querformat)
  KAM_BREITE_MIN_HOCH: 54,  // … hochkant
  KAM_VORSCHAU: 0.95,       // Sekunden Vorschau: so viel Weg voraus ist mindestens zu sehen
  KAM_RAND_OBEN: 4,         // Meter Luft über Kalle
  KAM_RAND_UNTEN: 2,
  KAM_GLAETTE_ZOOM: 1.4,    // je größer, desto schneller folgt der Zoom (weich, kein Pumpen)
  KAM_GLAETTE_Y: 2.2,       // Höhe folgt weich
  KAM_TOLERANZ_ZOOM: 0.07,  // Zoom-Ziel ändert sich erst ab 7 % Unterschied (kein Nachregeln bei jedem Hüpfer)
  KAM_TOLERANZ_Y: 4,        // Höhen-Ziel ändert sich erst ab 4 m Unterschied

  // Ansicht (Knopf im Menü): wie nah die Kamera heranzoomt. Gilt zusätzlich zur automatischen Kamera.
  ANSICHT: [1, 1.22, 1.45],  // normal, nah, sehr nah
  ANSICHT_NAMEN: ['Normal', 'Nah', 'Sehr nah'],
  ANSICHT_PHONE: 1,           // Standard auf flachen Touch-Bildschirmen, solange nichts gewählt wurde

  KRABBE_BREITE: 3.0,       // so breit wird Kalle gezeichnet (Meter)
  KRABBE_MIN_PIXEL: 54,     // aber nie schmaler als so viele CSS-Pixel
};

// Mitwachsende Zufallszahlen (gleiche Saat → gleiche Strecke)
function zufall(saat) {
  let s = saat >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
