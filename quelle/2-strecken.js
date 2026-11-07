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
    this.p = punkte;                 // [[x, y], …] streng aufsteigend in x, abwechselnd Hoch-/Tiefpunkte
    this.n = punkte.length;
    this.i = 0;                      // zuletzt benutztes Teilstück (meist dasselbe)
    let min = Infinity, max = -Infinity;
    for (const [, y] of punkte) { min = Math.min(min, y); max = Math.max(max, y); }
    this.min = min; this.max = max;
    this.ende = punkte[punkte.length - 1][0];
    this.anfang = punkte[0][0];
    // Krümmung an jedem Stützpunkt: an beiden angrenzenden Stücken gleich (→ glatte
    // Übergänge ohne Ruck). Gewählt wie bei einer runden Kuppe/einem runden Tal, aber nie
    // stärker, als das kürzere/flachere Nachbarstück verträgt (sonst würde es überschwingen).
    this.k = punkte.map((q, i) => this.kBei(i));
  }
  // Krümmung am Stützpunkt i (0 an den Enden – dort wird beim Anhängen neu gerechnet)
  kBei(i) {
    const punkte = this.p;
    if (i <= 0 || i >= this.n - 1) return 0;
    {
      const [x0, y0] = punkte[i - 1], [x1, y1] = punkte[i], [x2, y2] = punkte[i + 1];
      const hl = y1 - y0, hr = y2 - y1;
      if (Math.abs(hl) < 1e-9 || Math.abs(hr) < 1e-9 || Math.sign(hl) === Math.sign(hr)) return 0;
      const ql = Math.abs(hl) / ((x1 - x0) * (x1 - x0)), qr = Math.abs(hr) / ((x2 - x1) * (x2 - x1));
      // Rundung nach dem stärkeren Nachbarn, aber normiert höchstens RUNDUNG_MAX je Seite
      const k = Math.min(GELAENDE.RUNDUNG * Math.max(ql, qr), GELAENDE.RUNDUNG_MAX * ql, GELAENDE.RUNDUNG_MAX * qr);
      return (hl > 0 ? -1 : 1) * k;   // Kuppe: negativ, Tal: positiv
    }
  }
  // Endlosmodus: neue Punkte hinten anhängen. Der bisher letzte Punkt bekommt jetzt seine
  // echte Krümmung – Kalle ist nie auf den letzten Stücken (Vorlauf), daher ändert sich
  // nichts unter ihm.
  anhaengen(neue) {
    for (const q of neue) {
      if (q[0] <= this.p[this.n - 1][0]) throw new Error('Gelände: Punkte müssen nach rechts wachsen');
      this.p.push(q); this.k.push(0); this.n++;
      this.min = Math.min(this.min, q[1]); this.max = Math.max(this.max, q[1]);
    }
    for (let i = Math.max(1, this.n - neue.length - 1); i < this.n - 1; i++) this.k[i] = this.kBei(i);
    this.ende = this.p[this.n - 1][0];
  }
  // Endlosmodus: weit zurückliegende Punkte entfernen (es bleiben mindestens 3)
  kuerzen(xMin) {
    let weg = 0;
    while (this.n - weg > 3 && this.p[weg + 1][0] < xMin) weg++;
    if (!weg) return 0;
    this.p.splice(0, weg); this.k.splice(0, weg); this.n -= weg;
    this.i = 0;
    this.anfang = this.p[0][0];
    return weg;
  }
  stueck(x) {
    const p = this.p;
    let i = this.i;
    if (x < p[0][0]) return 0;
    if (x >= p[this.n - 1][0]) return this.n - 2;
    if (x >= p[i][0] && x < p[i + 1][0]) return i;
    let lo = 0, hi = this.n - 2;
    while (lo < hi) {
      const m = (lo + hi + 1) >> 1;
      if (p[m][0] <= x) lo = m; else hi = m - 1;
    }
    this.i = lo;
    return lo;
  }
  // Ein Stück ist ein Polynom 5. Grades (normiert auf t = 0..1, Höhe 0..1) mit
  // Steigung 0 an beiden Enden und vorgegebener Krümmung a (Anfang) und b (Ende).
  // Rückgabe: [Höhe, Steigung dy/dx, zweite Ableitung]
  werte(x) {
    const i = this.stueck(x), [x0, y0] = this.p[i], [x1, y1] = this.p[i + 1];
    const L = x1 - x0, h = y1 - y0;
    const t = Math.max(0, Math.min(1, (x - x0) / L));
    if (Math.abs(h) < 1e-9) return [y0, 0, 0];
    const a = this.k[i] * L * L / h, b = this.k[i + 1] * L * L / h;
    const t2 = t * t, t3 = t2 * t, t4 = t3 * t, t5 = t4 * t;
    const f = 10 * t3 - 15 * t4 + 6 * t5 + a * (0.5 * t2 - 1.5 * t3 + 1.5 * t4 - 0.5 * t5) + b * (0.5 * t3 - t4 + 0.5 * t5);
    const f1 = 30 * t2 - 60 * t3 + 30 * t4 + a * (t - 4.5 * t2 + 6 * t3 - 2.5 * t4) + b * (1.5 * t2 - 4 * t3 + 2.5 * t4);
    const f2 = 60 * t - 180 * t2 + 120 * t3 + a * (1 - 9 * t + 18 * t2 - 10 * t3) + b * (3 * t - 12 * t2 + 10 * t3);
    const innen = x > this.anfang && x < this.ende;
    return [y0 + h * f, innen ? h * f1 / L : 0, innen ? h * f2 / (L * L) : 0];
  }
  hoehe(x) { return this.werte(x)[0]; }
  steigung(x) { return this.werte(x)[1]; }
  kruemmung2(x) { return this.werte(x)[2]; }
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

// Grenzen für den Streckenbau – zentral, damit Tests und Generator dasselbe meinen
const GELAENDE = {
  RUNDUNG: 4.6,          // Krümmung an Kuppen/Tälern ≈ RUNDUNG · Höhe / Länge² (4,93 wäre ein Kosinusbogen)
  RUNDUNG_MAX: 9,        // normierte Krümmung je Stück höchstens (ab ~20 würde ein Stück überschwingen)
  HOEHE_MIN: 7,          // kein Hügelstück niedriger als 7 m – keine Mini-Wellen, die Hüpfer auslösen
  NEIGUNG_MIN: 0.32,     // mittlere Neigung (Höhe/Länge) mindestens – sonst wird es eine lange Rutschbahn
  NEIGUNG_MAX: 1.15,     // … und höchstens (steilste Stelle dann etwa 63°)
  TAL_SPIELRAUM: 5,      // Täler liegen höchstens so weit über/unter der Grundlinie – keine Schluchten
  FLACH_STEIGUNG: 0.15,  // als „fast flach“ gilt |Steigung| darunter …
  FLACH_MAX: 15,         // … und so ein Stück darf höchstens so lang sein (Meter; Start und Zielstrand ausgenommen)
};

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
// zeit: Tageslicht in ECHTEN Sekunden (bei K.TEMPO), sterne: [Zeit für 2 Sterne, Zeit für 3 Sterne].
//   Beides gemessen mit kalibriere.js (Testbot) und von test-logik.js geprüft.
const STRECKEN = [
  { id: 1, gebiet: 0, name: 'Lernstrecke', laenge: 1000, L: [42, 50], A: [16, 22], steil: [0.75, 0.65], wechsel: 0.2, muster: { gross: 0.2, rampe: 0.15 }, saat: 11, zeit: 21, sterne: [15.3, 9.6], lern: true },
  { id: 2, gebiet: 0, name: 'Dünenwellen', laenge: 1500, L: [42, 54], A: [18, 26], steil: [0.7, 0.6], wechsel: 0.3, muster: { klein: 0.15, gross: 0.15, rampe: 0.15 }, saat: 21, zeit: 28, sterne: [21.5, 15] },
  { id: 3, gebiet: 0, name: 'Windkamm', laenge: 1800, L: [44, 58], A: [20, 30], steil: [0.66, 0.56], wechsel: 0.35, muster: { klein: 0.2, gross: 0.15, rampe: 0.18 }, saat: 33, zeit: 29, sterne: [23.9, 18.9] },
  { id: 4, gebiet: 1, name: 'Palmenbucht', laenge: 2000, L: [44, 62], A: [22, 34], steil: [0.62, 0.52], wechsel: 0.35, muster: { klein: 0.2, gross: 0.18, rampe: 0.2 }, saat: 47, zeit: 30, sterne: [25.8, 21.6] },
  { id: 5, gebiet: 1, name: 'Kokoshügel', laenge: 2200, L: [46, 66], A: [24, 36], steil: [0.6, 0.5], wechsel: 0.4, muster: { klein: 0.25, gross: 0.2, rampe: 0.18 }, saat: 58, zeit: 32, sterne: [28.1, 24.1] },
  { id: 6, gebiet: 1, name: 'Lagunensprung', laenge: 2300, L: [48, 70], A: [24, 38], steil: [0.58, 0.48], wechsel: 0.4, muster: { klein: 0.2, gross: 0.15, rampe: 0.3 }, saat: 64, zeit: 32, sterne: [28.3, 24.6] },
  { id: 7, gebiet: 2, name: 'Klippenpfad', laenge: 2400, L: [48, 72], A: [26, 40], steil: [0.56, 0.46], wechsel: 0.45, muster: { klein: 0.25, gross: 0.22, rampe: 0.2 }, saat: 71, zeit: 33, sterne: [29.6, 26.1] },
  { id: 8, gebiet: 2, name: 'Brandungsfels', laenge: 2500, L: [50, 76], A: [26, 42], steil: [0.54, 0.45], wechsel: 0.5, muster: { klein: 0.28, gross: 0.22, rampe: 0.2 }, saat: 86, zeit: 33, sterne: [29.7, 26.4] },
  { id: 9, gebiet: 2, name: 'Möwenkap', laenge: 2600, L: [52, 80], A: [28, 44], steil: [0.52, 0.44], wechsel: 0.5, muster: { klein: 0.25, gross: 0.25, rampe: 0.22 }, saat: 93, zeit: 35, sterne: [31.9, 28.7] },
  { id: 10, gebiet: 3, name: 'Muschelbank', laenge: 2700, L: [52, 82], A: [28, 46], steil: [0.5, 0.43], wechsel: 0.55, muster: { klein: 0.3, gross: 0.22, rampe: 0.22 }, saat: 105, zeit: 36, sterne: [32.9, 29.8] },
  { id: 11, gebiet: 3, name: 'Korallenkamm', laenge: 2800, L: [54, 86], A: [30, 48], steil: [0.5, 0.42], wechsel: 0.55, muster: { klein: 0.3, gross: 0.25, rampe: 0.22 }, saat: 117, zeit: 38, sterne: [35, 32.1] },
  { id: 12, gebiet: 3, name: 'Leuchtturmlauf', laenge: 3000, L: [56, 90], A: [30, 50], steil: [0.48, 0.4], wechsel: 0.6, muster: { klein: 0.3, gross: 0.25, rampe: 0.25 }, saat: 125, zeit: 39, sterne: [36.1, 33.2] },
];


const mischen = (a, b, t) => a + (b - a) * t;

// Hügelarten. Jede Art bestimmt einen Abhang (ab) und die folgende Rampe (auf):
// L = Länge, A = Höhe, jeweils als Faktor zum Grundwert der Strecke.
const HUEGELARTEN = {
  normal: { ab: [1, 1], auf: [1, 1] },
  klein: { ab: [0.62, 0.5], auf: [0.6, 0.5] },             // kurze, schnelle Hügel zum Drüberfliegen
  gross: { ab: [1.3, 1.45], auf: [1.2, 1.4] },             // Riesenhügel
  // Sprungschanze: tiefer Anlauf, kurze steile Rampe – danach eine kräftige Abfahrt als Landezone
  rampe: { ab: [1.45, 1.6], auf: [0.8, 1.3], danach: { ab: [1.25, 1.35] } },
};

// Ein Hügelstück in die erlaubten Grenzen bringen: Mindesthöhe, Neigung zwischen min und max
function stueckGrenzen(hoehe, laenge) {
  const h = Math.max(GELAENDE.HOEHE_MIN, hoehe);
  const L = Math.min(Math.max(laenge, h / GELAENDE.NEIGUNG_MAX), h / GELAENDE.NEIGUNG_MIN);
  return [h, L];
}

// Baut aus dem Bauplan die Punktkette. Rückgabe: { gelaende, ziel, start, hinweise, taeler, kuppen }
// Rhythmus immer: Kuppe → Abfahrt → rundes Tal → Steigung → Kuppe … (keine flachen Zwischenstücke)
function baueStrecke(def) {
  const r = zufall(def.saat * 7919 + 13);
  const pkt = [], taeler = [], kuppen = [];
  const START_Y = 10 + def.A[0] * 1.2;
  // Startplateau: Kalle sitzt oben auf der ersten Düne
  pkt.push([-120, START_Y], [0, START_Y]);
  let x = 0, y = START_Y;
  const grund = (xx) => 6 + 4 * Math.sin(xx / 300 + def.saat);   // Talhöhe wandert langsam
  const muster = def.muster || {};
  let naechsterAbhang = null;   // Landezone hinter einer Schanze
  let zaehler = 0;

  while (x < def.laenge - 80) {
    const p = Math.min(1, x / def.laenge);
    const w = () => 1 + def.wechsel * (r() * 2 - 1) * 0.6;
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
    // Abfahrt ins Tal
    const ab = naechsterAbhang || h.ab;
    naechsterAbhang = null;
    let ty = y - Ag * ab[1] * w();
    ty = Math.max(grund(x) - GELAENDE.TAL_SPIELRAUM, Math.min(ty, grund(x) + GELAENDE.TAL_SPIELRAUM));
    const [hAb, LAb] = stueckGrenzen(y - ty, Lg * ab[0] * w());
    x += LAb; y -= hAb;
    pkt.push([x, y]); taeler.push([x, y]);
    if (x >= def.laenge - 80) break;
    // Steigung zur nächsten Kuppe (kürzer und steiler als die Abfahrt → Absprung)
    const steil = mischen(def.steil[0], def.steil[1], p) * (art === 'rampe' ? 0.75 : 1);
    const [hAuf, LAuf] = stueckGrenzen(Ag * h.auf[1] * w() * (0.85 + r() * 0.2), Lg * h.auf[0] * steil * w());
    x += LAuf; y += hAuf;
    pkt.push([x, y]); kuppen.push([x, y]);
    if (h.danach) naechsterAbhang = h.danach.ab;
  }
  // Ins Ziel: eine letzte Abfahrt auf den flachen Strand
  if (pkt[pkt.length - 1] === kuppen[kuppen.length - 1]) {
    const [hz, Lz] = stueckGrenzen(y - Math.min(y - GELAENDE.HOEHE_MIN, grund(x)), 60);
    x += Lz; y -= hz; pkt.push([x, y]); taeler.push([x, y]);
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
