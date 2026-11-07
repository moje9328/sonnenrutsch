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
  ANZAHL: [5, 8],        // Muscheln je Linie
  VORLAUF: 3,            // Linie beginnt so weit vor der typischen Landestelle
  MIN_STEIGUNG: 0.22,    // nur auf echtem Gefälle (Linie endet, bevor das Tal flach wird)
  ANTEIL: 0.6,           // so viele der geeigneten Abfahrten bekommen eine Linie
  GOLD_JEDE: 3,          // jede dritte Linie endet mit einer goldenen Muschel
};

const MUSCHEL_CACHE = new Map();
function legeMuscheln(def, lauf) {
  // Einmal pro Strecke, danach nur kopieren (Neustart ohne Wartezeit)
  if (!MUSCHEL_CACHE.has(def.id)) {
    const fertig = typeof MUSCHELN !== 'undefined' && MUSCHELN[def.id];
    MUSCHEL_CACHE.set(def.id, fertig ? fertig.map(([x, y, gold, linie]) => ({ x, y, gold: !!gold, linie: linie || 0, weg: false })) : berechneMuscheln(def, lauf));
  }
  return MUSCHEL_CACHE.get(def.id).map(m => Object.assign({}, m));
}

// Punkt auf der Oberfläche plus Abstand entlang der Normalen
function ueberBoden(g, x, abstand) {
  const s = g.steigung(x), n = Math.sqrt(1 + s * s);
  return { x: x - (s / n) * abstand, y: g.hoehe(x) + abstand / n };
}

// Wo landet ein guter Spieler auf welcher Abfahrt? (x der Landungen)
// Vorab mit dem guten Bot berechnet; fehlt die Datei im Browser, nimmt der schnellere Bot.
function typischeLandungen(def, art = typeof window === 'undefined' ? 'gut' : 'schnell') {
  const probe = new Lauf(def, { ohneMuscheln: true });
  probe.starten(); probe.tag = 999;
  const bot = Bot.neu(art);
  const landungen = [];
  let schritte = 0;
  while (!probe.ergebnis && schritte++ < 240 * 300) {
    probe.schritt(bot.halten(probe));
    for (const e of probe.ereignisse) if (e.art === 'landung') landungen.push(e.x);
    probe.ereignisse.length = 0;
  }
  return landungen;
}

function berechneMuscheln(def, lauf) {
  const g = lauf.g, ML = MUSCHEL_LINIEN, liste = [];
  const r = zufall(def.saat * 31 + 7);
  const s = baueStrecke(def);
  const landungen = typischeLandungen(def);
  let linie = 0, letzteHatte = false;
  for (const tal of s.taeler) {
    const kuppe = s.kuppen.filter(k => k[0] < tal[0]).pop();
    if (!kuppe || tal[0] > lauf.ziel - 20) continue;
    // Nur Abfahrten, auf denen bei gutem Spiel wirklich gelandet wird (überflogene bleiben leer)
    const land = landungen.find(x => x > kuppe[0] && x < tal[0]);
    if (land === undefined) continue;
    // Bewusste Pausen: nicht jede Abfahrt, nie zwei Linien direkt hintereinander
    if (letzteHatte || r() > ML.ANTEIL) { letzteHatte = false; continue; }
    // Start: kurz vor der typischen Landestelle
    let x = land - ML.VORLAUF;
    while (x < tal[0] && -g.steigung(x) < ML.MIN_STEIGUNG) x += 0.25;   // erst wo es richtig bergab geht
    const anzahl = ML.ANZAHL[0] + Math.floor(r() * (ML.ANZAHL[1] - ML.ANZAHL[0] + 1));
    const punkte = [];
    while (punkte.length < anzahl && x < tal[0] && -g.steigung(x) >= ML.MIN_STEIGUNG) {
      punkte.push(x);
      // ABSTAND entlang der Kurvenlänge weitergehen
      let weg = 0;
      while (weg < ML.ABSTAND && x < tal[0]) { const sl = g.steigung(x); weg += 0.1 * Math.sqrt(1 + sl * sl); x += 0.1; }
    }
    if (punkte.length < 3) continue;   // zu kurz – lieber keine Linie
    linie++;
    letzteHatte = true;
    punkte.forEach((px, k) => {
      const q = ueberBoden(g, px, K.MUSCHEL_HOEHE);
      liste.push({ x: q.x, y: q.y, gold: k === punkte.length - 1 && linie % ML.GOLD_JEDE === 0, linie, weg: false });
    });
  }
  return liste.filter(m => m.x > 5 && m.x < lauf.ziel).sort((a, b) => a.x - b.x);
}
