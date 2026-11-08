// ===================================================================
// 3b · MUSCHEL-LINIEN
// Muscheln liegen als kurze Linien auf ausgewählten Abfahrten. Jede Linie
// beginnt dort, wo ein geübter Spieler nach dem Flug landet, und folgt der
// Hangkurve Richtung Tal:
//   • gleiche Abstände entlang der Kurvenlänge (nicht entlang x),
//   • Abstand zum Boden entlang der Oberflächennormalen (MUSCHEL_HOEHE),
//   • so tief, dass ein gleitender Kalle (Mitte KRABBE_MITTE über dem Boden)
//     sie mitnimmt – wer deutlich zu hoch fliegt, verpasst einen Teil.
// Positionen hängen nur von der Strecke und der Physik ab, nicht vom Bildschirm.
// Sie werden vorab berechnet (werkzeug-muscheln.js → 2b-muscheln.js).
// ===================================================================

const MUSCHEL_LINIEN = {
  ABSTAND: 4.2,          // Meter zwischen zwei Muscheln entlang der Hangkurve
  ANZAHL: [6, 10],       // Muscheln je Linie (länger: sie laufen bis in den Übergang zum Tal)
  VORLAUF: -1,           // Linie beginnt so weit vor der typischen Landestelle (negativ: kurz danach, in der Landezone)
  MIN_STEIGUNG: 0.12,    // nur auf Gefälle (Linie endet erst im Übergang zum Tal)
  ANTEIL: 0.9,           // so viele der geeigneten Abfahrten bekommen eine Linie
  GOLD_JEDE: 3,          // jede dritte Linie endet mit einer goldenen Muschel
  GLEIT_TEMPO: 140,      // so schnell gleitet eine gute Krabbe nach der Landung (für die Wölbungsregel)
};

const MUSCHEL_CACHE = new Map();
function legeMuscheln(def, lauf) {
  // Einmal pro Strecke, danach nur kopieren (Neustart ohne Wartezeit)
  if (!MUSCHEL_CACHE.has(def.id)) {
    const fertig = typeof MUSCHELN !== 'undefined' && MUSCHELN[def.id];
    // Format: [x, y, gold, linie, art] – art: 0 Boden, 1 Luft, 2 niedrige Alternativlinie
    MUSCHEL_CACHE.set(def.id, fertig ? fertig.map(([x, y, gold, linie, art, abX]) => ({ x, y, gold: !!gold, linie: linie || 0, luft: art >= 1, alt: art === 2, abX, weg: false })) : berechneMuscheln(def, lauf));
  }
  const kopie = MUSCHEL_CACHE.get(def.id).map(m => Object.assign({}, m));
  verknuepfeReihen(kopie);   // eigene Reihen-Zähler je Lauf
  return kopie;
}

// Punkt auf der Oberfläche plus Abstand entlang der Normalen
function ueberBoden(g, x, abstand) {
  const s = g.steigung(x), n = Math.sqrt(1 + s * s);
  return { x: x - (s / n) * abstand, y: g.hoehe(x) + abstand / n };
}

// Wo landet ein guter Spieler auf welcher Abfahrt? (x der Landungen)
// Vorab mit dem guten Bot berechnet; fehlt die Datei im Browser, nimmt der schnellere Bot.
function typischeLandungen(def, art = typeof window === 'undefined' ? 'gut' : 'schnell', matten = null) {
  const probe = new Lauf(def, { ohneMuscheln: true, matten });
  probe.starten(); probe.tag = 999;
  const bot = Bot.neu(art);
  const landungen = [];
  let schritte = 0;
  while (!probe.ergebnis && schritte++ < 240 * 300) {
    probe.schritt(bot.halten(probe));
    for (const e of probe.ereignisse) if (e.art === 'landung' && e.guete !== 'matte') landungen.push(e.x);
    probe.ereignisse.length = 0;
  }
  return landungen;
}

// Eine Linie auf der Abfahrt bis talX, beginnend kurz vor der Landestelle land.
// Rückgabe: Fußpunkte (x) entlang der Kurve – leer, wenn dort kein echtes Gefälle ist.
// Bleibt eine schnell gleitende Krabbe hier am Boden? (Wölbung klein genug, dass sie bei
// GLEIT_TEMPO mit gedrückter Taste nicht wieder abhebt – dieselbe Regel wie in der Physik)
function bleibtAmBoden(g, x) {
  const s = g.steigung(x), n = Math.sqrt(1 + s * s);
  const kruemmung = -g.kruemmung2(x) / (n * n * n);
  return kruemmung <= 0 || MUSCHEL_LINIEN.GLEIT_TEMPO ** 2 * kruemmung < K.G * K.SCHWER_BODEN / n;
}
function linienPunkte(g, land, talX, anzahl) {
  const ML = MUSCHEL_LINIEN;
  let x = land - ML.VORLAUF;
  while (x < talX && (-g.steigung(x) < ML.MIN_STEIGUNG || !bleibtAmBoden(g, x))) x += 0.25;   // erst wo es richtig bergab geht und Kalle am Boden bleibt
  const punkte = [];
  while (punkte.length < anzahl && x < talX && -g.steigung(x) >= ML.MIN_STEIGUNG && bleibtAmBoden(g, x)) {
    punkte.push(x);
    let weg = 0;   // ABSTAND entlang der Kurvenlänge weitergehen
    while (weg < ML.ABSTAND && x < talX) { const sl = g.steigung(x); weg += 0.1 * Math.sqrt(1 + sl * sl); x += 0.1; }
  }
  return punkte.length >= 3 ? punkte : [];
}

function berechneMuscheln(def, lauf) {
  const g = lauf.g, ML = MUSCHEL_LINIEN, liste = [];
  const r = zufall(def.saat * 31 + 7);
  const s = baueStrecke(def);
  // Landestellen von gutem und mittlerem Spiel (offline); im Browser ohne Datei nur der schnelle Bot
  const landungen = typeof window === 'undefined'
    ? [...typischeLandungen(def, 'gut', lauf.matten), ...typischeLandungen(def, 'mittel', lauf.matten)].sort((a, b) => a - b)
    : typischeLandungen(def, 'schnell', lauf.matten);
  let linie = 0, letzteHatte = false;
  for (const tal of s.taeler) {
    const kuppe = s.kuppen.filter(k => k[0] < tal[0]).pop();
    if (!kuppe || tal[0] > lauf.ziel - 20) continue;
    // Nur Abfahrten, auf denen bei gutem Spiel wirklich gelandet wird (überflogene bleiben leer)
    const land = landungen.find(x => x > kuppe[0] && x < tal[0]);
    if (land === undefined) { letzteHatte = false; continue; }   // überflogene Abfahrt ist selbst schon eine Pause
    // Bewusste Pausen: nicht jede Abfahrt, nie zwei Linien direkt hintereinander
    if (letzteHatte || r() > ML.ANTEIL) { letzteHatte = false; continue; }
    // Start: kurz vor der typischen Landestelle
    const anzahl = ML.ANZAHL[0] + Math.floor(r() * (ML.ANZAHL[1] - ML.ANZAHL[0] + 1));
    // Liegt am Tal eine Sprungfläche, endet die Linie davor (die Fläche bleibt frei)
    const pad = lauf.matten.find(m => Math.abs(m.x1 - tal[0]) < K.MATTE.BREITE);
    const punkte = linienPunkte(g, land, pad ? pad.x0 - 2 : tal[0], anzahl);
    if (!punkte.length) continue;   // zu kurz – lieber keine Linie
    linie++;
    letzteHatte = true;
    punkte.forEach((px, k) => {
      const q = ueberBoden(g, px, K.MUSCHEL_HOEHE);
      liste.push({ x: q.x, y: q.y, gold: k === punkte.length - 1 && linie % ML.GOLD_JEDE === 0, linie, weg: false });
    });
  }
  return liste.filter(m => m.x > 5 && m.x < lauf.ziel).sort((a, b) => a.x - b.x);
}
