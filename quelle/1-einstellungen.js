// ===================================================================
// 1 · EINSTELLUNGEN
// Alle Werte für Physik und Spielgefühl an einer Stelle.
// Welt in Metern, y zeigt nach OBEN. Zeit in Sekunden.
// ===================================================================

const K = {
  SCHRITT: 1 / 240,         // feste Physik-Schrittweite (unabhängig von der Bildrate)
  MAX_SCHRITTE: 24,         // höchstens so viele Schritte je Bild (nach Hängern kein Nachholen ohne Ende)

  G: 24,                    // Grundschwerkraft
  SCHWER_BODEN: 2.3,        // gedrückt am Boden: so viel schwerer (bergab schneller, bergauf langsamer)
  SCHWER_LUFT: 2.7,         // gedrückt in der Luft: Sinkflug
  LEICHT_LUFT: 0.68,        // losgelassen in der Luft: sanfter, weiter Flug

  REIBUNG: 0.6,             // gleichmäßige Bremsung am Boden (m/s²)
  LUFTWIDERSTAND: 0.0016,   // Bremsung ~ v² am Boden
  LUFTWIDERSTAND_FLUG: 0.0011, // Bremsung ~ v² in der Luft
  V_MIN: 6,                 // so schnell krabbelt Kalle mindestens (nie Feststecken)
  V_MAX: 70,                // Höchstgeschwindigkeit
  V_START: 6,

  // Landungen
  PERFEKT_WINKEL: 9,        // Grad zwischen Flugrichtung und Hang: darunter „perfekt“
  GUT_WINKEL: 24,           // darunter verliert Kalle nur den Anteil quer zum Hang
  PERFEKT_MIN_GEFAELLE: 0.18, // perfekt nur auf einem echt abfallenden Hang
  PERFEKT_MIN_FLUGZEIT: 0.32, // kleine Hüpfer an der Kuppe zählen nicht
  PERFEKT_BONUS: 0.05,      // +5 % Tempo …
  KETTEN_BONUS: 0.012,      // … plus 1,2 % je perfekter Landung in Folge
  KETTE_MAX: 5,
  HART_FAKTOR: 0.78,        // harte Landung am Gegenhang: zusätzlicher Tempoverlust

  ABHEBEN_SCHWELLE: 1.0,    // v²·Krümmung > g·cos·Schwelle → Kalle hebt ab

  // Kamera
  KAM_VORAUS: 0.30,         // Kalle steht bei 30 % der Bildbreite
  KAM_BREITE_MIN: 58,       // so viele Meter sieht man mindestens nach vorn/hinten (Querformat)
  KAM_BREITE_MIN_HOCH: 54,  // … hochkant
  KAM_VORSCHAU: 1.1,        // Sekunden Vorschau bei der Breite (schneller = weiter sehen)
  KAM_RAND_OBEN: 7,         // Meter Luft über Kalle
  KAM_RAND_UNTEN: 4,
  KAM_GLAETTE_ZOOM: 2.2,    // je größer, desto schneller folgt der Zoom
  KAM_GLAETTE_Y: 4,

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
