// ===================================================================
// 2 · STRECKEN
// Das Gelände ist eine Kette aus Hoch- und Tiefpunkten. Dazwischen liegt
// jeweils eine halbe Kosinuswelle: Das ergibt weiche, zusammenhängende
// Hügel ohne Knick (Höhe und Steigung sind überall stetig). Weil das
// Gelände eine Höhenfunktion y(x) ist, kann Kalle nie hindurchfallen:
// Liegt er unter y(x), steht er auf dem Boden.
// ===================================================================

class Gelaende {
  constructor(punkte) {
    this.p = punkte;                 // [[x, y], …] streng aufsteigend in x
    this.n = punkte.length;
    this.i = 0;                      // zuletzt benutztes Teilstück (meist dasselbe)
    let min = Infinity, max = -Infinity;
    for (const [, y] of punkte) { min = Math.min(min, y); max = Math.max(max, y); }
    this.min = min; this.max = max;
    this.ende = punkte[punkte.length - 1][0];
    this.anfang = punkte[0][0];
  }
  stueck(x) {
    const p = this.p;
    let i = this.i;
    if (x < p[0][0]) return 0;
    if (x >= p[this.n - 1][0]) return this.n - 2;
    if (x >= p[i][0] && x < p[i + 1][0]) return i;
    // Binärsuche
    let lo = 0, hi = this.n - 2;
    while (lo < hi) {
      const m = (lo + hi + 1) >> 1;
      if (p[m][0] <= x) lo = m; else hi = m - 1;
    }
    this.i = lo;
    return lo;
  }
  // Höhe, Steigung dy/dx und zweite Ableitung an der Stelle x
  hoehe(x) {
    const i = this.stueck(x), a = this.p[i], b = this.p[i + 1];
    const t = Math.max(0, Math.min(1, (x - a[0]) / (b[0] - a[0])));
    return a[1] + (b[1] - a[1]) * (1 - Math.cos(Math.PI * t)) / 2;
  }
  steigung(x) {
    const i = this.stueck(x), a = this.p[i], b = this.p[i + 1];
    const L = b[0] - a[0];
    const t = (x - a[0]) / L;
    if (t <= 0 || t >= 1) return 0;
    return (b[1] - a[1]) * Math.PI / (2 * L) * Math.sin(Math.PI * t);
  }
  kruemmung2(x) {
    const i = this.stueck(x), a = this.p[i], b = this.p[i + 1];
    const L = b[0] - a[0];
    const t = Math.max(0, Math.min(1, (x - a[0]) / L));
    if (x < this.anfang || x > this.ende) return 0;
    return (b[1] - a[1]) * Math.PI * Math.PI / (2 * L * L) * Math.cos(Math.PI * t);
  }
  // Tiefster und höchster Punkt im Bereich [x0, x1] (für die Kamera)
  bereich(x0, x1) {
    let lo = this.hoehe(x0), hi = lo;
    const e = this.hoehe(x1); lo = Math.min(lo, e); hi = Math.max(hi, e);
    for (const [x, y] of this.p) {
      if (x < x0) continue;
      if (x > x1) break;
      lo = Math.min(lo, y); hi = Math.max(hi, y);
    }
    return [lo, hi];
  }
}

// --- Gebiete: Aussehen kommt aus 7-grafik.js (THEMEN), hier nur Name und Text ---
const GEBIETE = [
  { name: 'Sanddünen', text: 'Weiche, lange Dünen. Hier lernt Kalle das Rutschen.', farbe: '#FFD35A' },
  { name: 'Tropeninsel', text: 'Palmen, Lagune und steilere Hügel.', farbe: '#24D6CD' },
  { name: 'Felsküste', text: 'Raue Klippen, große Abstände, unruhiger Rhythmus.', farbe: '#B5CBE0' },
  { name: 'Korallenkap', text: 'Hohe Kämme bis zum Leuchtturm. Nur mit gutem Timing.', farbe: '#FF805B' },
];

// --- Streckenbauplan ---
// laenge: Meter bis zum Ziel
// L: halbe Hügelbreite (Abhang) am Anfang/Ende der Strecke, A: Höhenunterschied am Anfang/Ende
// steil: Verhältnis Anstieg/Abhang (kleiner = kürzere, steilere Rampen)
// wechsel: wie stark Breite und Höhe von Hügel zu Hügel schwanken (0..1)
// muster: Anteile der Hügelarten klein / gross / rampe (Rest: normal), siehe HUEGELARTEN
// zeit: Tageslicht in Sekunden, sterne: [Zeit für 2 Sterne, Zeit für 3 Sterne].
//   Beides gemessen mit kalibriere.js (Testbot) und von test-logik.js geprüft.
const STRECKEN = [
  { id: 1, gebiet: 0, name: 'Lernstrecke', laenge: 1000, L: [42, 50], A: [16, 22], steil: [0.75, 0.65], wechsel: 0.2, muster: { gross: 0.2, rampe: 0.15 }, saat: 11, zeit: 40, sterne: [29.3, 18.6], lern: true },
  { id: 2, gebiet: 0, name: 'Dünenwellen', laenge: 1500, L: [42, 54], A: [18, 26], steil: [0.7, 0.6], wechsel: 0.3, muster: { klein: 0.15, gross: 0.15, rampe: 0.15 }, saat: 21, zeit: 58, sterne: [43.9, 29.7] },
  { id: 3, gebiet: 0, name: 'Windkamm', laenge: 1800, L: [44, 58], A: [20, 30], steil: [0.66, 0.56], wechsel: 0.35, muster: { klein: 0.2, gross: 0.15, rampe: 0.18 }, saat: 33, zeit: 64, sterne: [49.2, 34.4] },
  { id: 4, gebiet: 1, name: 'Palmenbucht', laenge: 2000, L: [44, 62], A: [22, 34], steil: [0.62, 0.52], wechsel: 0.35, muster: { klein: 0.2, gross: 0.18, rampe: 0.2 }, saat: 47, zeit: 59, sterne: [51.1, 43.2] },
  { id: 5, gebiet: 1, name: 'Kokoshügel', laenge: 2200, L: [46, 66], A: [24, 36], steil: [0.6, 0.5], wechsel: 0.4, muster: { klein: 0.25, gross: 0.2, rampe: 0.18 }, saat: 58, zeit: 73, sterne: [64.1, 55.3] },
  { id: 6, gebiet: 1, name: 'Lagunensprung', laenge: 2300, L: [48, 70], A: [24, 38], steil: [0.58, 0.48], wechsel: 0.4, muster: { klein: 0.2, gross: 0.15, rampe: 0.3 }, saat: 64, zeit: 64, sterne: [56, 48] },
  { id: 7, gebiet: 2, name: 'Klippenpfad', laenge: 2400, L: [48, 72], A: [26, 40], steil: [0.56, 0.46], wechsel: 0.45, muster: { klein: 0.25, gross: 0.22, rampe: 0.2 }, saat: 71, zeit: 68, sterne: [61, 53.9] },
  { id: 8, gebiet: 2, name: 'Brandungsfels', laenge: 2500, L: [50, 76], A: [26, 42], steil: [0.54, 0.45], wechsel: 0.5, muster: { klein: 0.28, gross: 0.22, rampe: 0.2 }, saat: 86, zeit: 65, sterne: [58.5, 52.1] },
  { id: 9, gebiet: 2, name: 'Möwenkap', laenge: 2600, L: [52, 80], A: [28, 44], steil: [0.52, 0.44], wechsel: 0.5, muster: { klein: 0.25, gross: 0.25, rampe: 0.22 }, saat: 93, zeit: 63, sterne: [57.3, 51.6] },
  { id: 10, gebiet: 3, name: 'Muschelbank', laenge: 2700, L: [52, 82], A: [28, 46], steil: [0.5, 0.43], wechsel: 0.55, muster: { klein: 0.3, gross: 0.22, rampe: 0.22 }, saat: 105, zeit: 72, sterne: [65.5, 59] },
  { id: 11, gebiet: 3, name: 'Korallenkamm', laenge: 2800, L: [54, 86], A: [30, 48], steil: [0.5, 0.42], wechsel: 0.55, muster: { klein: 0.3, gross: 0.25, rampe: 0.22 }, saat: 117, zeit: 69, sterne: [63.9, 58.7] },
  { id: 12, gebiet: 3, name: 'Leuchtturmlauf', laenge: 3000, L: [56, 90], A: [30, 50], steil: [0.48, 0.4], wechsel: 0.6, muster: { klein: 0.3, gross: 0.25, rampe: 0.25 }, saat: 125, zeit: 90, sterne: [83.7, 77.4] },
];


const mischen = (a, b, t) => a + (b - a) * t;

// Hügelarten. Jede Art bestimmt einen Abhang (ab) und die folgende Rampe (auf):
// L = Länge, A = Höhe, jeweils als Faktor zum Grundwert der Strecke.
const HUEGELARTEN = {
  normal: { ab: [1, 1], auf: [1, 1] },
  klein: { ab: [0.55, 0.4], auf: [0.55, 0.42] },           // kurze, flache Buckel zum Drüberfliegen
  gross: { ab: [1.35, 1.5], auf: [1.25, 1.45] },           // Riesenhügel
  // Sprungschanze: langer, tiefer Anlauf, kurze steile Rampe – danach eine lange Landezone
  rampe: { ab: [1.7, 1.75], auf: [0.85, 1.35], danach: { ab: [2.1, 1.5] } },
};

// Baut aus dem Bauplan die Punktkette. Rückgabe: { gelaende, ziel, start, hinweise, taeler, kuppen }
function baueStrecke(def) {
  const r = zufall(def.saat * 7919 + 13);
  const pkt = [], taeler = [], kuppen = [];
  const START_Y = 10 + def.A[0] * 1.2;
  // Startplateau: Kalle sitzt oben auf der ersten Düne
  pkt.push([-120, START_Y], [0, START_Y]);
  let x = 0, y = START_Y;
  const grund = (xx) => 6 + 4 * Math.sin(xx / 300 + def.saat);   // grobe Talhöhe, wandert langsam
  const muster = def.muster || {};
  let naechsterAbhang = null;   // Landezone hinter einer Schanze
  let zaehler = 0;

  while (x < def.laenge - 80) {
    const p = Math.min(1, x / def.laenge);
    const w = () => 1 + def.wechsel * (r() * 2 - 1);
    const Lg = mischen(def.L[0], def.L[1], p), Ag = mischen(def.A[0], def.A[1], p);
    // Hügelart würfeln (die ersten zwei Hügel sind immer normal)
    let art = 'normal';
    const z = r();
    if (zaehler >= 2) {
      if (z < (muster.rampe || 0)) art = 'rampe';
      else if (z < (muster.rampe || 0) + (muster.gross || 0)) art = 'gross';
      else if (z < (muster.rampe || 0) + (muster.gross || 0) + (muster.klein || 0)) art = 'klein';
    }
    zaehler++;
    const h = HUEGELARTEN[art];
    // Abhang hinunter ins Tal
    const ab = naechsterAbhang || h.ab;
    naechsterAbhang = null;
    const L = Lg * ab[0] * w();
    let A = Math.min(Ag * ab[1] * w(), L * K.STEIL_MAX);
    let ty = y - A;
    const tief = art === 'rampe' || art === 'gross' ? 10 : 2;
    ty = Math.max(grund(x) - tief, Math.min(ty, grund(x) + 6));
    if (y - ty < 3) ty = y - 3;
    // Die Talgrenzen können den Abhang steiler machen: dann wird er länger
    x += Math.max(L, (y - ty) / K.STEIL_MAX); y = ty;
    pkt.push([x, y]); taeler.push([x, y]);
    if (x >= def.laenge - 80) break;
    // Rampe hinauf (kürzer als der Abhang → Absprung)
    const La = Lg * h.auf[0] * mischen(def.steil[0], def.steil[1], p) * w() * (art === 'rampe' ? 0.75 : 1);
    const Aa = Math.min(Ag * h.auf[1] * w() * (0.85 + r() * 0.2), La * K.STEIL_MAX);
    x += La; y += Aa;
    pkt.push([x, y]); kuppen.push([x, y]);
    if (h.danach) naechsterAbhang = h.danach.ab;
  }
  // Ins Ziel: ein letzter Abhang auf den flachen Strand
  if (pkt[pkt.length - 1] === kuppen[kuppen.length - 1]) {
    const ty = Math.min(y - 6, grund(x));
    x += Math.max(60, (y - ty) / K.STEIL_MAX); y = ty; pkt.push([x, y]); taeler.push([x, y]);
  }
  const ziel = x + 30;
  pkt.push([x + 600, y]);

  // Hinweise der Lernstrecke an festen Stellen
  const hinweise = [];
  if (def.lern) {
    hinweise.push({ x: -10, bis: 6, text: 'Halten: Kalle macht sich schwer und rutscht bergab.', art: 'halten' });
    if (taeler[0]) hinweise.push({ x: taeler[0][0] - 8, bis: taeler[0][0] + 14, text: 'Vor dem Anstieg loslassen!', art: 'los' });
    if (kuppen[0]) hinweise.push({ x: kuppen[0][0] + 2, bis: kuppen[0][0] + 50, text: 'In der Luft halten: Sinkflug auf den nächsten Abhang.', art: 'luft' });
    if (kuppen[2]) hinweise.push({ x: kuppen[2][0] - 30, bis: kuppen[2][0] + 40, text: 'Lande flach auf dem Abhang: das gibt Schwung.', art: 'perfekt' });
  }
  return { gelaende: new Gelaende(pkt), ziel, start: { x: -6, y: START_Y }, hinweise, taeler, kuppen };
}
