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
// buckel: Anteil kleiner Zwischenbuckel, über die man fliegen sollte
// zeit: Tageslicht in Sekunden, sterne: [Zeit für 2 Sterne, Zeit für 3 Sterne].
//   Beides gemessen mit kalibriere.js (Testbot) und von test-logik.js geprüft.
const STRECKEN = [
  { id: 1, gebiet: 0, name: 'Lernstrecke', laenge: 900, L: [40, 48], A: [18, 24], steil: [0.75, 0.65], wechsel: 0.1, buckel: 0, saat: 11, zeit: 39, sterne: [30, 21.1], lern: true },
  { id: 2, gebiet: 0, name: 'Dünenwellen', laenge: 1400, L: [42, 54], A: [20, 30], steil: [0.7, 0.6], wechsel: 0.15, buckel: 0, saat: 21, zeit: 46, sterne: [38.8, 31.5] },
  { id: 3, gebiet: 0, name: 'Windkamm', laenge: 1700, L: [44, 60], A: [22, 34], steil: [0.66, 0.55], wechsel: 0.2, buckel: 0, saat: 33, zeit: 54, sterne: [45.5, 37] },
  { id: 4, gebiet: 1, name: 'Palmenbucht', laenge: 1900, L: [46, 64], A: [24, 38], steil: [0.62, 0.52], wechsel: 0.2, buckel: 0.05, saat: 47, zeit: 65, sterne: [56.1, 47.3] },
  { id: 5, gebiet: 1, name: 'Kokoshügel', laenge: 2000, L: [46, 70], A: [26, 42], steil: [0.6, 0.5], wechsel: 0.25, buckel: 0.06, saat: 58, zeit: 81, sterne: [71.4, 61.8] },
  { id: 6, gebiet: 1, name: 'Lagunensprung', laenge: 2100, L: [50, 76], A: [28, 46], steil: [0.58, 0.48], wechsel: 0.25, buckel: 0.08, saat: 64, zeit: 64, sterne: [56, 48] },
  { id: 7, gebiet: 2, name: 'Klippenpfad', laenge: 2200, L: [50, 80], A: [30, 50], steil: [0.56, 0.46], wechsel: 0.3, buckel: 0.08, saat: 71, zeit: 85, sterne: [76.5, 67.9] },
  { id: 8, gebiet: 2, name: 'Brandungsfels', laenge: 2300, L: [54, 84], A: [30, 52], steil: [0.54, 0.45], wechsel: 0.35, buckel: 0.1, saat: 86, zeit: 84, sterne: [75.7, 67.5] },
  { id: 9, gebiet: 2, name: 'Möwenkap', laenge: 2400, L: [56, 88], A: [32, 56], steil: [0.52, 0.44], wechsel: 0.35, buckel: 0.1, saat: 93, zeit: 81, sterne: [73.5, 66.1] },
  { id: 10, gebiet: 3, name: 'Muschelbank', laenge: 2500, L: [56, 92], A: [34, 58], steil: [0.5, 0.43], wechsel: 0.4, buckel: 0.12, saat: 105, zeit: 89, sterne: [81.8, 74.6] },
  { id: 11, gebiet: 3, name: 'Korallenkamm', laenge: 2600, L: [60, 96], A: [34, 62], steil: [0.5, 0.42], wechsel: 0.4, buckel: 0.12, saat: 117, zeit: 105, sterne: [96.4, 87.7] },
  { id: 12, gebiet: 3, name: 'Leuchtturmlauf', laenge: 2800, L: [62, 100], A: [36, 66], steil: [0.48, 0.4], wechsel: 0.45, buckel: 0.14, saat: 125, zeit: 98, sterne: [91.1, 84.2] },
];


const mischen = (a, b, t) => a + (b - a) * t;

// Baut aus dem Bauplan die Punktkette. Rückgabe: { gelaende, ziel, start, hinweise }
function baueStrecke(def) {
  const r = zufall(def.saat * 7919 + 13);
  const pkt = [];
  const START_Y = 8 + def.A[0];
  // Startplateau: Kalle sitzt oben auf der ersten Düne
  pkt.push([-120, START_Y], [0, START_Y]);
  let x = 0, y = START_Y;
  let hoch = true;   // wir stehen gerade auf einem Hochpunkt
  const grund = (xx) => 6 + 3 * Math.sin(xx / 260 + def.saat);   // grobe Talhöhe, wandert langsam

  while (x < def.laenge - 60) {
    const p = Math.min(1, x / def.laenge);
    const w = () => 1 + def.wechsel * (r() * 2 - 1) * 0.5;
    if (hoch) {
      // Abhang hinunter ins Tal
      const L = mischen(def.L[0], def.L[1], p) * w();
      let A = mischen(def.A[0], def.A[1], p) * w();
      A = Math.min(A, L * K.STEIL_MAX);   // Grenze für die steilste Stelle
      let ty = y - A;
      ty = Math.max(grund(x) - 2, Math.min(ty, grund(x) + 4));
      if (y - ty < 4) ty = y - 4;
      x += L; y = ty;
      pkt.push([x, y]);
      hoch = false;
    } else {
      // Kleiner Zwischenbuckel: kurz, flach – wer gut fliegt, springt drüber
      if (def.buckel && r() < def.buckel && x > 120) {
        const L = mischen(def.L[0], def.L[1], p) * 0.38;
        const hb = mischen(def.A[0], def.A[1], p) * (0.1 + r() * 0.06);
        x += L; pkt.push([x, y + hb]);
        x += L; pkt.push([x, y + 0.2]);
        y = y + 0.2;
      }
      // Rampe hinauf zur nächsten Kuppe (kürzer als der Abhang → Absprung)
      const Ld = mischen(def.L[0], def.L[1], p) * w();
      const L = Ld * mischen(def.steil[0], def.steil[1], p);
      const A = Math.min(mischen(def.A[0], def.A[1], p) * w() * (0.8 + r() * 0.25), L * K.STEIL_MAX);
      x += L; y = y + A;
      pkt.push([x, y]);
      hoch = true;
    }
  }
  // Ins Ziel: ein letzter langer Abhang auf den flachen Strand
  if (hoch) { const ty = Math.min(y - 6, grund(x)); x += Math.max(48, (y - ty) / K.STEIL_MAX); y = ty; pkt.push([x, y]); }
  const ziel = x + 30;
  pkt.push([x + 600, y]);

  // Hinweise der Lernstrecke an festen Stellen
  const hinweise = [];
  if (def.lern) {
    const tal = pkt.filter((q, i) => i > 1 && i % 2 === 0);   // Täler
    const kuppe = pkt.filter((q, i) => i > 1 && i % 2 === 1); // Kuppen
    hinweise.push({ x: -10, bis: 6, text: 'Halten: Kalle macht sich schwer und rutscht bergab.', art: 'halten' });
    if (tal[0]) hinweise.push({ x: tal[0][0] - 6, bis: tal[0][0] + 14, text: 'Vor dem Anstieg loslassen!', art: 'los' });
    if (kuppe[0]) hinweise.push({ x: kuppe[0][0] + 2, bis: kuppe[0][0] + 40, text: 'In der Luft halten: Sinkflug auf den nächsten Abhang.', art: 'luft' });
    if (kuppe[2]) hinweise.push({ x: kuppe[2][0] - 30, bis: kuppe[2][0] + 30, text: 'Lande flach auf dem Abhang: das gibt Schwung.', art: 'perfekt' });
  }
  return { gelaende: new Gelaende(pkt), ziel, start: { x: -6, y: START_Y }, hinweise };
}
