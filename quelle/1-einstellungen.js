// ===================================================================
// 1 · EINSTELLUNGEN
// Alle Werte für Physik und Spielgefühl an einer Stelle.
// Welt in Metern, y zeigt nach OBEN. Zeit in Sekunden.
// ===================================================================

const K = {
  SCHRITT: 1 / 240,         // feste Physik-Schrittweite in Physikzeit (unabhängig von der Bildrate)
  // Spieltempo: Die Physik läuft TEMPO-mal so schnell wie die echte Zeit. Das ist dasselbe wie
  // alle Geschwindigkeiten × TEMPO und alle Beschleunigungen × TEMPO², nur ohne hundert Werte
  // umzurechnen: Flugkurven, Rampen, Muschel-Linien und Landeregeln bleiben räumlich gleich,
  // alles passiert nur doppelt so schnell. Die Schritte bleiben 1/240 s Physikzeit klein –
  // so kann Kalle auch bei hohem Tempo nie durch den Boden rutschen.
  // Echtzeit-Dinge (Tageslicht, Rufabstände, Kamera, Effekte, Menüs) laufen NICHT schneller.
  TEMPO: 2,
  MAX_SCHRITTE: 48,         // höchstens so viele Schritte je Bild (nach Hängern kein Nachholen ohne Ende)

  G: 24,                    // Grundschwerkraft
  SCHWER_BODEN: 3.0,        // gedrückt am Boden: so viel schwerer (bergab schneller, bergauf langsamer)
  LEICHT_BODEN: 0.65,       // losgelassen am Boden: Kalle ist leicht und gleitet den Hang hinauf
  SCHWER_LUFT: 4.5,         // gedrückt in der Luft: Sinkflug
  LEICHT_LUFT: 1.0,         // losgelassen in der Luft: normale Schwerkraft

  REIBUNG: 0.25,             // gleichmäßige Bremsung am Boden (m/s²)
  LUFTWIDERSTAND: 0.0004,   // Bremsung ~ v² am Boden
  LUFTWIDERSTAND_FLUG: 0.0003, // Bremsung ~ v² in der Luft
  V_MIN_SCHWER: 5,          // wer bergauf schwer bleibt, wird so langsam
  KRABBELN: 22,             // losgelassen und langsamer als V_MIN: so schnell krabbelt Kalle wieder hoch (m/s²)
  V_MIN: 14,                 // so schnell krabbelt Kalle mindestens (nie Feststecken)
  V_MAX: 80,                // Höchstgeschwindigkeit am Boden
  V_MAX_LUFT: 100,          // Höchstgeschwindigkeit in der Luft (begrenzt Sturzflüge)
  V_START: 14,

  // Landungen
  PERFEKT_WINKEL: 26,       // perfekt: Flugrichtung höchstens so viele Grad neben der Hangtangente …
  PERFEKT_QUER: 30,         // … und Aufprall quer zur Oberfläche höchstens so schnell (m/s)
  PERFEKT_MIN_HOEHE: 1.2,   // … und vorher wirklich in der Luft gewesen (Meter über Boden)
  GUT_WINKEL: 36,           // darunter: Kalle wird in den Hang umgelenkt und behält fast alles Tempo
  GUT_ERHALT: 0.95,         // so viel Tempo bleibt bei einer guten Landung mindestens
  ABHANG_WINKEL: 55,        // auf einem Abhang zählt eine Landung bis zu diesem Winkel noch als gut …
  ABHANG_ERHALT: 0.82,      // … und behält mindestens so viel Tempo
  PERFEKT_MIN_GEFAELLE: 0.18, // perfekt nur auf einem echt abfallenden Hang
  PERFEKT_MIN_FLUGZEIT: 0.32, // kleine Hüpfer an der Kuppe zählen nicht
  PERFEKT_BONUS: 0.05,      // +5 % Tempo …
  KETTEN_BONUS: 0.012,      // … plus 1,2 % je perfekter Landung in Folge
  KETTE_MAX: 5,
  HART_FAKTOR: 0.82,        // harte Landung am Gegenhang: zusätzlicher Tempoverlust

  MUSCHEL_RADIUS: 1.8,      // Sammelbereich: Abstand Kalles Mitte ↔ Muschel (Sensor, kein Stoß)
  MUSCHEL_HOEHE: 1.1,       // Muscheln schweben so weit über dem Boden (entlang der Normalen)
  KRABBE_MITTE: 1.0,        // Kalles Mitte liegt so weit über seinen Füßen
  GOLD_WERT: 5,             // eine goldene Muschel zählt so viel wie 5 normale

  // Flugrufe (Spiellogik in 3c-flugrufe.js, Stimme in 6b-rufe.js). Alles in Weltkoordinaten.
  RUF: {
    JUHU_HOEHE: 28,         // „Juhu!“: im Steigflug tatsächlich so hoch über dem Absprung (m) …
    JUHU_STEIG: 20,         // … und beim Absprung mindestens so schnell nach oben (m/s)
    JUHU_MIN_ZEIT: 0.25,    // frühestens so lange nach dem Abheben (kurze Hüpfer sind dann schon vorbei)
    YIPPIE_HOEHE: 62,       // „Yippie!“: tatsächlich so hoch über dem Absprung erreicht (m) …
    YIPPIE_WEITE: 140,      // … oder so weit geflogen (m, waagerecht) …
    YIPPIE_SOFORT: 95,      // … oder gleich zu Beginn sicher ein Riesenflug (vorhergesagter Gipfel, m)
    YIPPIE_SOFORT_TEMPO: 70,//     bei mindestens diesem Absprungtempo (m/s)
    ABSTAND: 2.5,           // Sekunden (echte Zeit) zwischen Rufen verschiedener Flüge mindestens
    STEIGERUNG: 0.75,       // „Yippie!“ nach „Juhu!“ im selben Flug frühestens so viel später (echte Zeit, Juhu ist dann vorbei)
    BODEN_RUHE: 0.3,        // erst nach so langer stabiler Bodenzeit (Physikzeit) beginnt ein neuer Flug
  },


  // Endlosflug: Tageslicht in echten Sekunden, Strecken in Metern
  ENDLOS: {
    START: 30,              // so viel Tageslicht zu Beginn
    MAX: 45,                // mehr passt nie in den Vorrat
    MARKE_ERSTE: 700,       // erste Distanzmarke (m)
    MARKE_WACHSTUM: 90,     // jede weitere Marke liegt so viel weiter als die vorige (Läufe enden sicher)
    MARKE_BONUS: 7,         // Tageslicht pro erreichter Marke (s)
    PERFEKT_BONUS: 1.5,     // Tageslicht pro perfekter Landung (s)
    PUNKTE_MUSCHEL: 10,     // Punkte je Muschelwert (Gold zählt 5×)
    PUNKTE_PERFEKT: 25,     // Punkte je perfekter Landung
    SCHWIERIG_WEG: 9000,    // nach so vielen Metern ist die volle Schwierigkeit erreicht (danach bleibt sie)
    VORLAUF: 1100,          // so weit voraus ist das Gelände immer schon gebaut (m)
    GEIST_VORLAUF: 550,     // so weit voraus fliegt der unsichtbare Testpilot, der die Landezonen findet
    HINTEN: 260,            // weiter zurück wird Gelände entfernt (m)
  },

  ABHEBEN_SCHWELLE: 1.0,    // v²·Krümmung > g·cos·Schwelle → Kalle hebt ab

  // Kamera
  KAM_VORAUS: 0.26,         // Kalle steht bei 26 % der Bildbreite (mehr Blick nach vorn)
  KAM_BREITE_MIN: 58,       // so viele Meter sieht man mindestens nach vorn/hinten (Querformat)
  KAM_BREITE_MIN_HOCH: 54,  // … hochkant
  KAM_VORSCHAU: 1.7,        // Physik-Sekunden Vorschau bei der Breite (≈ 0,85 s echte Zeit bei TEMPO 2)
  KAM_RAND_OBEN: 7,         // Meter Luft über Kalle
  KAM_RAND_UNTEN: 4,
  KAM_GLAETTE_ZOOM: 4,      // je größer, desto schneller folgt der Zoom (echte Zeit)
  KAM_GLAETTE_Y: 7,

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
