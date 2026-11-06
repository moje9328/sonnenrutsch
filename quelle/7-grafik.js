// ===================================================================
// 7 · GRAFIK
// Alles wird scharf in voller Bildschirmauflösung gezeichnet (kein Pixel-
// Look). Ebenen von hinten nach vorn:
//   Himmel (Farbe wandert mit dem Tageslicht) → Sonne → Wolken → Meer
//   → ferne Küste (langsame Parallaxe) → nahe Küste → Gelände → Kalle
//   → Effekte → leichter Abendschimmer über allem
// Die Hügelkontur hat immer eine dunkle Kante und eine helle Oberkante,
// damit sie auch im Abendrot gut zu erkennen ist.
// ===================================================================

const mischFarbe = (a, b, t) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
};
// Farbe aus einer Stützstellen-Liste [[t, '#farbe'], …]
function verlauf(liste, t) {
  if (t <= liste[0][0]) return liste[0][1];
  for (let i = 1; i < liste.length; i++) {
    if (t <= liste[i][0]) {
      const [t0, f0] = liste[i - 1], [t1, f1] = liste[i];
      return mischFarbe(f0, f1, (t - t0) / (t1 - t0));
    }
  }
  return liste[liste.length - 1][1];
}
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// Tageslicht 0 (Mittag) … 1 (Sonne weg)
const HIMMEL_OBEN = [[0, '#3f9be0'], [0.5, '#4f8fd2'], [0.75, '#5a6fb8'], [0.9, '#43478f'], [1, '#232659']];
const HIMMEL_UNTEN = [[0, '#c4ebfa'], [0.45, '#f4e7b8'], [0.72, '#ffc27a'], [0.88, '#ff8a5c'], [1, '#c9556e']];
const SONNE_FARBE = [[0, '#fff7d6'], [0.6, '#ffe08a'], [0.85, '#ff9a4a'], [1, '#ff5a3c']];
const LICHT = [[0, '#ffffff'], [0.55, '#fff3df'], [0.8, '#ffd6b0'], [0.93, '#f0b3b0'], [1, '#b49ac8']];

// Aussehen der vier Gebiete
const THEMEN = [
  { // Sanddünen
    boden: ['#f6cf7c', '#e2a656', '#b97a3a'], kante: '#fff0b8', rand: '#6e4320', muster: 'rillen',
    musterFarbe: 'rgba(150, 92, 38, 0.22)', fern: '#e9c88e', fern2: '#d9ad6c', nah: '#e3b46d', meer: '#46b4d6', deko: 'duene',
  },
  { // Tropeninsel
    boden: ['#f4d48e', '#e2b066', '#bf8644'], kante: '#bff07a', rand: '#2f5a24', muster: 'gras', grasFarbe: '#5cbf4a', grasDunkel: '#3c8f35',
    musterFarbe: 'rgba(160, 110, 50, 0.2)', fern: '#3f9a86', fern2: '#2f7f73', nah: '#4caf7d', meer: '#2ccfc4', deko: 'palme',
  },
  { // Felsküste
    boden: ['#a39d93', '#7f786f', '#5a544d'], kante: '#d9e6b8', rand: '#2e2a27', muster: 'schichten', grasFarbe: '#86ad55', grasDunkel: '#5e8a3a',
    musterFarbe: 'rgba(40, 34, 30, 0.22)', fern: '#7b8ba0', fern2: '#62738a', nah: '#8a8f94', meer: '#2f78b0', deko: 'fels',
  },
  { // Korallenkap
    boden: ['#ffc0ae', '#f0948a', '#c76a6e'], kante: '#fff0e6', rand: '#6a2d3c', muster: 'muscheln',
    musterFarbe: 'rgba(130, 50, 70, 0.2)', fern: '#d68fa4', fern2: '#b87390', nah: '#e8a39a', meer: '#38c2c9', deko: 'koralle',
  },
];

const Grafik = (() => {
  let leinwand, c, W = 1, H = 1, dpr = 1, cssW = 1, cssH = 1;
  const kam = { x: 0, b: 0, z: 10, bereit: false };
  let randOben = 0;        // so viele CSS-Pixel oben deckt die Anzeige ab   // x = linker Rand, b = unterer Rand (Welt), z = Pixel je Meter
  let zeit = 0;
  const teilchen = [];
  const texte = [];
  let blitz = 0;           // kurzer Lichtschein bei perfekter Landung
  let spur = [];           // Flugspur
  let ruhig = false;       // prefers-reduced-motion

  function init(el) {
    leinwand = el;
    c = el.getContext('2d', { alpha: false });
    try { ruhig = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { ruhig = false; }
    groesse();
  }
  function groesse() {
    const r = leinwand.getBoundingClientRect();
    cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.round(cssW * dpr); H = Math.round(cssH * dpr);
    if (leinwand.width !== W || leinwand.height !== H) { leinwand.width = W; leinwand.height = H; }
  }
  const hochkant = () => cssH > cssW * 1.05;
  const sx = (x) => (x - kam.x) * kam.z;
  const sy = (y) => H - (y - kam.b) * kam.z;

  // ---------------------------------------------------------- Kamera
  // Ziel: Kalle bei 30 % der Breite, vorn genug Gelände, oben Platz für
  // den Flug, unten der tiefste Punkt des sichtbaren Geländes.
  function kameraZiel(l) {
    const v = l.tempo;
    const minB = hochkant() ? K.KAM_BREITE_MIN_HOCH : K.KAM_BREITE_MIN;
    let breite = minB + v * K.KAM_VORSCHAU;
    const links = l.x - breite * K.KAM_VORAUS;
    const [lo, hi] = l.g.bereich(links, links + breite * 1.15);
    const oben = Math.max(l.y + K.KAM_RAND_OBEN, hi + 3);
    const unten = lo - K.KAM_RAND_UNTEN;
    const hoeheNoetig = oben - unten;
    let z = Math.min(W / breite, (H - randOben * dpr) / hoeheNoetig);
    // Nie so nah, dass Kalle riesig wirkt, nie so weit, dass er verschwindet
    z = Math.min(z, W / (minB * 0.8));
    // Übrige Höhe: zum Teil unter das Gelände legen, damit der Boden nicht am Rand klebt
    const frei = H / z - hoeheNoetig;
    const tiefer = frei > 0 ? Math.min(frei * (hochkant() ? 0.42 : 0.3), hoeheNoetig * (hochkant() ? 1.2 : 0.6)) : 0;
    return { z, unten: unten - tiefer, x: l.x };
  }
  function kamera(l, dt, sofort) {
    const ziel = kameraZiel(l);
    if (sofort || !kam.bereit) { kam.z = ziel.z; kam.b = ziel.unten; kam.bereit = true; }
    else {
      const kz = 1 - Math.exp(-K.KAM_GLAETTE_ZOOM * dt);
      // Herauszoomen schneller als hineinzoomen: Landeflächen sind früh im Bild
      const kzr = ziel.z < kam.z ? Math.min(1, kz * 1.8) : kz;
      kam.z += (ziel.z - kam.z) * kzr;
      const ky = 1 - Math.exp(-K.KAM_GLAETTE_Y * dt);
      kam.b += (ziel.unten - kam.b) * ky;
    }
    // Kalle muss immer ganz im Bild und unter der Anzeige sein: sonst sofort
    // herauszoomen (nicht nach oben schieben, damit der Boden sichtbar bleibt)
    const krabbePx = K.KRABBE_MIN_PIXEL * dpr * 1.1 + 10 * dpr;
    const nutzbar = H - randOben * dpr - krabbePx;
    if (l.y > kam.b && (l.y - kam.b) * kam.z > nutzbar) kam.z = nutzbar / (l.y - kam.b);
    kam.x = l.x - (W / kam.z) * K.KAM_VORAUS;
  }

  // ---------------------------------------------------------- Himmel
  function himmel(f, thema) {
    const horizont = H * (hochkant() ? 0.62 : 0.58);
    const v = c.createLinearGradient(0, 0, 0, horizont);
    v.addColorStop(0, verlauf(HIMMEL_OBEN, f));
    v.addColorStop(1, verlauf(HIMMEL_UNTEN, f));
    c.fillStyle = v;
    c.fillRect(0, 0, W, horizont + 2);
    // Sterne in der Dämmerung
    if (f > 0.82) {
      c.fillStyle = `rgba(255, 250, 230, ${Math.min(1, (f - 0.82) * 5) * 0.8})`;
      for (let i = 0; i < 40; i++) {
        const x = hash(i) * W, y = hash(i + 50) * horizont * 0.55;
        const r = (hash(i + 99) > 0.8 ? 1.6 : 1) * dpr;
        c.fillRect(x, y, r, r);
      }
    }
    // Sonne: wandert vor Kalle zum Horizont hinunter
    const sxp = W * (hochkant() ? 0.7 : 0.76);
    const syp = H * 0.1 + (horizont - H * 0.1) * Math.pow(f, 1.25) + f * f * H * 0.04;
    const r = Math.min(W, H) * (0.055 + f * 0.03);
    const sf = verlauf(SONNE_FARBE, f);
    const glanz = c.createRadialGradient(sxp, syp, r * 0.6, sxp, syp, r * 4.5);
    glanz.addColorStop(0, sf + 'aa');
    glanz.addColorStop(1, sf + '00');
    c.fillStyle = glanz;
    c.fillRect(sxp - r * 5, syp - r * 5, r * 10, r * 10);
    c.beginPath(); c.arc(sxp, syp, r, 0, Math.PI * 2); c.fillStyle = sf; c.fill();
    // Wolken
    for (let i = 0; i < 6; i++) {
      const tempo = 0.012 + hash(i + 7) * 0.02;
      const wx = ((hash(i) * 1.6 - (kam.x * tempo * kam.z) / W - zeit * 0.004 * (1 + i % 3)) % 1.6 + 1.6) % 1.6 - 0.3;
      const wy = horizont * (0.12 + hash(i + 3) * 0.5);
      wolke(wx * W, wy, Math.min(W, H) * (0.06 + hash(i + 11) * 0.05), f);
    }
    // Meer
    const meerOben = horizont;
    const m = c.createLinearGradient(0, meerOben, 0, H);
    m.addColorStop(0, mischFarbe(thema.meer, verlauf(HIMMEL_UNTEN, f), 0.35 + f * 0.25));
    m.addColorStop(1, mischFarbe(thema.meer, '#1a2a50', 0.3 + f * 0.4));
    c.fillStyle = m;
    c.fillRect(0, meerOben, W, H - meerOben);
    // Glitzern und Sonnenspiegelung
    c.fillStyle = sf;
    for (let i = 0; i < 26; i++) {
      const y = meerOben + 4 * dpr + hash(i + 200) * (H - meerOben) * 0.5;
      const breite = (8 + hash(i + 300) * 26) * dpr * (1 + (y - meerOben) / H);
      const nahSonne = Math.abs(hash(i + 400) - 0.5) < 0.18;
      const x = nahSonne ? sxp + (hash(i + 500) - 0.5) * r * 3 : ((hash(i + 600) * W - kam.x * kam.z * 0.05 + zeit * 6 * dpr) % W + W) % W;
      c.globalAlpha = (nahSonne ? 0.55 : 0.22) * (0.6 + 0.4 * Math.sin(zeit * 2 + i));
      c.fillRect(x - breite / 2, y, breite, 1.5 * dpr);
    }
    c.globalAlpha = 1;
    return horizont;
  }
  function wolke(x, y, s, f) {
    const hell = mischFarbe('#ffffff', '#ffc9a8', Math.min(1, f * 1.1));
    const schatten = mischFarbe('#dbeaf5', '#c98a9a', Math.min(1, f * 1.1));
    c.fillStyle = schatten;
    c.beginPath();
    c.ellipse(x, y + s * 0.18, s * 1.25, s * 0.38, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = hell;
    c.beginPath();
    c.ellipse(x - s * 0.5, y, s * 0.55, s * 0.4, 0, 0, Math.PI * 2);
    c.ellipse(x + s * 0.1, y - s * 0.2, s * 0.65, s * 0.55, 0, 0, Math.PI * 2);
    c.ellipse(x + s * 0.7, y + s * 0.02, s * 0.48, s * 0.36, 0, 0, Math.PI * 2);
    c.fill();
  }

  // ---------------------------------------------------------- Ferne Küste (Parallaxe)
  // Höhenlinie aus Sinuswellen, verschiebt sich langsamer als die Kamera
  function silhouette(horizont, faktor, hoehe, farbe, saat, glatt, inseln) {
    const versatz = kam.x * kam.z * faktor;
    c.beginPath();
    c.moveTo(0, horizont + 1);
    const schritt = 8 * dpr;
    for (let px = 0; px <= W + schritt; px += schritt) {
      const u = (px + versatz) / (H * 0.9);
      let h = Math.sin(u * 1.3 + saat) * 0.5 + Math.sin(u * 2.9 + saat * 2) * 0.28 + Math.sin(u * 0.47 + saat * 3) * 0.6;
      if (!glatt) h += Math.abs(Math.sin(u * 7.1 + saat)) * 0.18;
      let y = (0.55 + h * 0.45) * hoehe;
      if (inseln) y = Math.max(0, y - hoehe * 0.55) * 1.8;   // Lücken: dort sieht man das Meer
      c.lineTo(px, horizont - y);
    }
    c.lineTo(W, horizont + 1);
    c.closePath();
    c.fillStyle = farbe;
    c.fill();
  }
  function ferneKueste(horizont, f, thema, nr) {
    const dunst = verlauf(HIMMEL_UNTEN, f);
    const hoehe = H * 0.12;
    silhouette(horizont, 0.06, hoehe, mischFarbe(thema.fern, dunst, 0.45 + f * 0.15), 1 + nr, nr === 0);
    // Wahrzeichen in der Ferne
    const versatz = kam.x * kam.z * 0.06;
    const abstand = W * 1.3;
    const i0 = Math.floor(versatz / abstand);
    for (let i = i0; i <= i0 + 1; i++) {
      const x = i * abstand - versatz + abstand * (0.3 + hash(i) * 0.4);
      const fy = horizont - hoehe * 0.35;
      wahrzeichen(nr, x, fy, H * 0.12, mischFarbe(thema.fern2, dunst, 0.4 + f * 0.15), f, i);
    }
    // Nähere Küstenstücke mit Meer dazwischen, darunter ein heller Brandungsstreifen
    const y2 = horizont + H * 0.05;
    silhouette(y2, 0.14, hoehe * 0.8, mischFarbe(thema.fern2, dunst, 0.22 + f * 0.15), 7 + nr * 3, nr === 0, true);
    c.fillStyle = `rgba(255, 255, 255, ${0.25 - f * 0.12})`;
    for (let i = 0; i < 3; i++) {
      const wy = y2 + (4 + i * 9) * dpr, ph = zeit * (0.6 + i * 0.2) + i;
      c.fillRect(0, wy + Math.sin(ph) * 1.5 * dpr, W, 1.2 * dpr);
    }
  }
  function wahrzeichen(nr, x, y, s, farbe, f, i) {
    c.fillStyle = farbe;
    if (nr === 0) {
      // Strandhütte auf Stelzen
      c.fillRect(x - s * 0.18, y - s * 0.32, s * 0.36, s * 0.22);
      c.beginPath(); c.moveTo(x - s * 0.26, y - s * 0.3); c.lineTo(x, y - s * 0.5); c.lineTo(x + s * 0.26, y - s * 0.3); c.fill();
      c.fillRect(x - s * 0.15, y - s * 0.1, s * 0.03, s * 0.14); c.fillRect(x + s * 0.12, y - s * 0.1, s * 0.03, s * 0.14);
    } else if (nr === 1) {
      // Insel mit Palmen
      c.beginPath(); c.ellipse(x, y + s * 0.05, s * 0.6, s * 0.12, 0, Math.PI, 0); c.fill();
      for (let k = -1; k <= 1; k += 2) palmeForm(x + k * s * 0.2, y, s * (0.55 + 0.1 * k), farbe, 0.15 * k);
    } else {
      // Leuchtturm mit drehendem Licht
      const b = s * 0.12, h = s * 0.85;
      c.beginPath();
      c.moveTo(x - b, y); c.lineTo(x - b * 0.65, y - h); c.lineTo(x + b * 0.65, y - h); c.lineTo(x + b, y); c.fill();
      c.fillRect(x - b * 0.9, y - h - s * 0.12, b * 1.8, s * 0.12);
      if (f > 0.55) {
        const a = Math.min(1, (f - 0.55) * 3);
        const w = zeit * 1.4 + i;
        const lx = x, ly = y - h - s * 0.06;
        const breit = Math.cos(w) * s * 1.6;
        c.fillStyle = `rgba(255, 236, 160, ${0.22 * a})`;
        c.beginPath(); c.moveTo(lx, ly); c.lineTo(lx + breit, ly - s * 0.1); c.lineTo(lx + breit, ly + s * 0.1); c.fill();
        c.fillStyle = `rgba(255, 244, 200, ${a})`;
        c.beginPath(); c.arc(lx, ly, s * 0.035, 0, Math.PI * 2); c.fill();
      }
    }
  }
  function palmeForm(x, y, s, farbe, neigung) {
    c.save();
    c.fillStyle = farbe; c.strokeStyle = farbe;
    c.lineWidth = s * 0.06; c.lineCap = 'round';
    const kx = x + neigung * s, ky = y - s;
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + neigung * s * 0.2, y - s * 0.6, kx, ky); c.stroke();
    for (let k = 0; k < 5; k++) {
      const w = -Math.PI / 2 + (k - 2) * 0.62;
      c.beginPath();
      c.moveTo(kx, ky);
      c.quadraticCurveTo(kx + Math.cos(w) * s * 0.35, ky + Math.sin(w) * s * 0.35 - s * 0.1, kx + Math.cos(w) * s * 0.5, ky + Math.sin(w) * s * 0.3 + s * 0.14);
      c.lineWidth = s * 0.07;
      c.stroke();
    }
    c.restore();
  }

  // ---------------------------------------------------------- Gelände
  function gelaendePfad(l, x0, x1) {
    const g = l.g;
    const schritt = Math.max(0.25, 5 * dpr / kam.z);
    c.beginPath();
    c.moveTo(sx(x0), H + 4);
    for (let x = x0; x <= x1 + schritt; x += schritt) c.lineTo(sx(x), sy(g.hoehe(x)));
    c.lineTo(sx(x1 + schritt), H + 4);
    c.closePath();
  }
  function gelaende(l, thema, f, nr) {
    const x0 = kam.x - 2, x1 = kam.x + W / kam.z + 2;
    const g = l.g;
    const licht = verlauf(LICHT, f);
    const [lo, hi] = g.bereich(x0, x1);
    // Deko hinter der Kante (Palmen, Gras, Felsen) – steht auf dem Gelände
    dekoHinten(l, thema, nr, x0, x1, licht);
    // Füllung
    gelaendePfad(l, x0, x1);
    const v = c.createLinearGradient(0, sy(hi), 0, Math.max(sy(lo - 14), sy(hi) + 10));
    v.addColorStop(0, mischFarbe(thema.boden[0], licht, 0.2));
    v.addColorStop(0.5, mischFarbe(thema.boden[1], licht, 0.2));
    v.addColorStop(1, mischFarbe(thema.boden[2], licht, 0.25));
    c.fillStyle = v;
    c.fill();
    // Muster im Boden, parallel zur Oberfläche
    c.save();
    c.clip();
    muster(l, thema, x0, x1);
    c.restore();
    // Kante: dunkler Rand, darunter helle Oberkante (Lesbarkeit)
    const schritt = Math.max(0.25, 5 * dpr / kam.z);
    c.beginPath();
    for (let x = x0; x <= x1 + schritt; x += schritt) {
      const px = sx(x), py = sy(g.hoehe(x));
      if (x === x0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.lineJoin = 'round'; c.lineCap = 'round';
    if (thema.grasFarbe && thema.muster !== 'schichten') {
      c.strokeStyle = thema.grasDunkel; c.lineWidth = Math.max(7 * dpr, 0.9 * kam.z); c.stroke();
      c.strokeStyle = thema.grasFarbe; c.lineWidth = Math.max(4.5 * dpr, 0.55 * kam.z); c.stroke();
    } else if (thema.muster === 'schichten') {
      c.strokeStyle = thema.grasDunkel; c.lineWidth = Math.max(6 * dpr, 0.6 * kam.z); c.stroke();
      c.strokeStyle = thema.grasFarbe; c.lineWidth = Math.max(3.5 * dpr, 0.35 * kam.z); c.stroke();
    } else {
      c.strokeStyle = mischFarbe(thema.kante, licht, 0.25); c.lineWidth = Math.max(5 * dpr, 0.5 * kam.z); c.stroke();
    }
    c.strokeStyle = thema.rand; c.lineWidth = 2.2 * dpr;
    c.save(); c.translate(0, -Math.max(2 * dpr, 0.25 * kam.z)); c.stroke(); c.restore();
  }
  function muster(l, thema, x0, x1) {
    const g = l.g;
    const schritt = Math.max(0.5, 8 * dpr / kam.z);
    c.strokeStyle = thema.musterFarbe;
    c.lineWidth = Math.max(1.5 * dpr, 0.16 * kam.z);
    if (thema.muster === 'rillen' || thema.muster === 'gras' || thema.muster === 'schichten') {
      // Linien in festen Tiefen unter der Oberfläche, leicht gewellt
      const tiefen = thema.muster === 'schichten' ? [2.2, 4.6, 7.5, 11] : [1.8, 3.6, 6, 9.5];
      for (const t of tiefen) {
        c.beginPath();
        let erst = true;
        for (let x = x0; x <= x1 + schritt; x += schritt) {
          const w = thema.muster === 'schichten' ? Math.sin(x * 0.11 + t) * 0.6 : Math.sin(x * 0.35 + t * 3) * 0.25;
          const px = sx(x), py = sy(g.hoehe(x) - t - w);
          if (erst) { c.moveTo(px, py); erst = false; } else c.lineTo(px, py);
        }
        c.stroke();
      }
    }
    if (thema.muster === 'muscheln' || thema.muster === 'gras' || thema.muster === 'rillen') {
      // kleine Kiesel / Muscheln, an Weltpositionen festgemacht
      const abstand = 4.5;
      const i0 = Math.floor(x0 / abstand), i1 = Math.ceil(x1 / abstand);
      for (let i = i0; i <= i1; i++) {
        const x = i * abstand + hash(i) * abstand;
        const t = 1.5 + hash(i + 3) * 9;
        const px = sx(x), py = sy(g.hoehe(x) - t);
        const r = (0.18 + hash(i + 5) * 0.2) * kam.z;
        c.fillStyle = thema.muster === 'muscheln' ? (hash(i + 9) > 0.5 ? 'rgba(255,255,255,0.45)' : 'rgba(150,60,80,0.3)') : thema.musterFarbe;
        c.beginPath(); c.ellipse(px, py, r * 1.3, r, 0, 0, Math.PI * 2); c.fill();
      }
    }
  }
  // Deko an festen Weltpositionen, die auf dem Gelände steht
  function dekoHinten(l, thema, nr, x0, x1, licht) {
    const g = l.g;
    const abstand = 11;
    const i0 = Math.floor((x0 - 10) / abstand), i1 = Math.ceil((x1 + 10) / abstand);
    for (let i = i0; i <= i1; i++) {
      if (hash(i * 3 + nr) < 0.45) continue;
      const x = i * abstand + hash(i) * abstand * 0.6;
      if (x < -20 || x > l.ziel + 200) continue;
      if (Math.abs(x - l.ziel) < 18) continue;
      const y = g.hoehe(x) - 0.3;
      const px = sx(x), py = sy(y);
      const s = kam.z;
      const art = hash(i + 17);
      if (nr === 0) {
        if (art < 0.6) grasBusch(px, py, s * (0.8 + hash(i + 2) * 0.6), '#9fae55', '#6f7f35');
        else zaun(px, py, s, g, x);
      } else if (nr === 1) {
        if (art < 0.42) palme(px, py, s * (4 + hash(i + 2) * 2.5), (hash(i + 4) - 0.5) * 0.5);
        else grasBusch(px, py, s * 1.1, '#5cbf4a', '#2f7f2f');
      } else if (nr === 2) {
        if (art < 0.5) stein(px, py, s * (0.8 + hash(i + 2)), '#8a847c', '#4a4540');
        else grasBusch(px, py, s * 0.8, '#86ad55', '#4e7a2e');
      } else {
        if (art < 0.5) koralle(px, py, s * (1.2 + hash(i + 2) * 1.2), hash(i + 6));
        else stein(px, py, s * 0.7, '#f5d8c8', '#a06a6a');
      }
    }
  }
  function grasBusch(px, py, s, hell, dunkel) {
    c.lineCap = 'round';
    for (let k = -3; k <= 3; k++) {
      c.strokeStyle = k % 2 ? dunkel : hell;
      c.lineWidth = Math.max(1.5 * dpr, s * 0.12);
      c.beginPath();
      c.moveTo(px + k * s * 0.12, py);
      c.quadraticCurveTo(px + k * s * 0.2, py - s * 0.6, px + k * s * 0.38 + Math.sin(zeit * 1.5 + px * 0.01) * s * 0.08, py - s * (0.9 + (3 - Math.abs(k)) * 0.12));
      c.stroke();
    }
  }
  function zaun(px, py, s, g, x) {
    c.strokeStyle = '#8a6a44'; c.lineWidth = Math.max(2 * dpr, s * 0.18); c.lineCap = 'round';
    for (let k = 0; k < 4; k++) {
      const xx = sx(x + k * 1.1), yy = sy(g.hoehe(x + k * 1.1) - 0.2);
      c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx + s * 0.05, yy - s * 1.6); c.stroke();
    }
    c.lineWidth = Math.max(1.2 * dpr, s * 0.08); c.strokeStyle = '#a9875b';
    c.beginPath();
    for (let k = 0; k < 4; k++) { const xx = sx(x + k * 1.1), yy = sy(g.hoehe(x + k * 1.1)) - s * 1.1; if (k) c.lineTo(xx, yy); else c.moveTo(xx, yy); }
    c.stroke();
  }
  function palme(px, py, s, neigung) {
    c.save();
    c.lineCap = 'round';
    const kx = px + neigung * s, ky = py - s;
    c.strokeStyle = '#6b4a2a'; c.lineWidth = s * 0.09;
    c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px + neigung * s * 0.2, py - s * 0.6, kx, ky); c.stroke();
    c.strokeStyle = '#a77b4a'; c.lineWidth = s * 0.04;
    c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px + neigung * s * 0.2, py - s * 0.6, kx, ky); c.stroke();
    const wipp = ruhig ? 0 : Math.sin(zeit * 1.3 + px * 0.01) * 0.06;
    for (let k = 0; k < 6; k++) {
      const w = -Math.PI / 2 + (k - 2.5) * 0.55 + wipp;
      const ex = kx + Math.cos(w) * s * 0.55, ey = ky + Math.sin(w) * s * 0.28 + s * 0.2;
      c.strokeStyle = '#2f7f3a'; c.lineWidth = s * 0.1;
      c.beginPath(); c.moveTo(kx, ky); c.quadraticCurveTo(kx + Math.cos(w) * s * 0.35, ky + Math.sin(w) * s * 0.4 - s * 0.1, ex, ey); c.stroke();
      c.strokeStyle = '#4fbf5a'; c.lineWidth = s * 0.05;
      c.stroke();
    }
    c.fillStyle = '#7a5a2a';
    c.beginPath(); c.arc(kx - s * 0.04, ky + s * 0.05, s * 0.05, 0, Math.PI * 2); c.arc(kx + s * 0.05, ky + s * 0.06, s * 0.05, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  function stein(px, py, s, hell, dunkel) {
    c.fillStyle = hell; c.strokeStyle = dunkel; c.lineWidth = Math.max(1.5 * dpr, s * 0.1);
    c.beginPath(); c.ellipse(px, py, s * 1.1, s * 0.75, 0, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
  }
  function koralle(px, py, s, art) {
    c.strokeStyle = art > 0.5 ? '#ff6f7f' : '#ffa45c'; c.lineCap = 'round'; c.lineWidth = s * 0.16;
    const ast = (x, y, l, w, tiefe) => {
      const ex = x + Math.cos(w) * l, ey = y + Math.sin(w) * l;
      c.beginPath(); c.moveTo(x, y); c.lineTo(ex, ey); c.stroke();
      if (tiefe > 0) { ast(ex, ey, l * 0.7, w - 0.5, tiefe - 1); ast(ex, ey, l * 0.7, w + 0.5, tiefe - 1); }
    };
    ast(px, py, s * 0.5, -Math.PI / 2, 2);
  }

  // ---------------------------------------------------------- Start und Ziel
  function startZiel(l, f) {
    const g = l.g;
    // Ziel: Bogen aus Treibholz mit Wimpeln und Muschelflagge
    const zx = l.ziel, zy = g.hoehe(zx);
    const px = sx(zx), py = sy(zy), s = kam.z;
    if (px > -s * 10 && px < W + s * 10) {
      c.lineCap = 'round';
      c.strokeStyle = '#4a2f1a'; c.lineWidth = s * 0.55;
      c.beginPath(); c.moveTo(px - s * 3, py); c.lineTo(px - s * 3, py - s * 7); c.moveTo(px + s * 3, py); c.lineTo(px + s * 3, py - s * 7); c.stroke();
      c.strokeStyle = '#a8794a'; c.lineWidth = s * 0.32; c.stroke();
      // Banner
      eckigWelt(px - s * 3.6, py - s * 8.6, s * 7.2, s * 2.2, s * 0.4, '#ffd35a', '#4a2f1a');
      c.fillStyle = '#10243a';
      c.font = `${Math.round(s * 1.15)}px 'Press Start 2P', monospace`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('ZIEL', px, py - s * 7.45);
      // Wimpelkette
      for (let k = 0; k < 7; k++) {
        const t = k / 6;
        const wx = px - s * 3 + t * s * 6, wy = py - s * 5.6 + Math.sin(t * Math.PI) * s * 0.6;
        c.fillStyle = ['#ff805b', '#24d6cd', '#ffd35a', '#b58cff'][k % 4];
        c.beginPath(); c.moveTo(wx - s * 0.35, wy); c.lineTo(wx + s * 0.35, wy); c.lineTo(wx, wy + s * 0.8 + Math.sin(zeit * 4 + k) * s * 0.1); c.fill();
      }
      // Zielstreifen im Sand
      c.fillStyle = 'rgba(255,255,255,0.7)';
      for (let k = 0; k < 6; k++) c.fillRect(px - s * 0.3, py + k * s * 0.5, s * 0.6, s * 0.25);
    }
    // Start: Holzschild
    const qx = sx(-14), qy = sy(g.hoehe(-14));
    if (qx > -s * 6 && qx < W + s * 6) {
      c.strokeStyle = '#4a2f1a'; c.lineWidth = s * 0.4;
      c.beginPath(); c.moveTo(qx, qy); c.lineTo(qx, qy - s * 3.6); c.stroke();
      eckigWelt(qx - s * 2.6, qy - s * 4.8, s * 5.2, s * 1.6, s * 0.3, '#f7e0b0', '#4a2f1a');
      c.fillStyle = '#4a2f1a';
      c.font = `${Math.round(s * 0.8)}px 'Press Start 2P', monospace`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('START', qx, qy - s * 3.95);
    }
  }
  function eckigWelt(x, y, b, h, r, farbe, rand) {
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + b, y, x + b, y + h, r); c.arcTo(x + b, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + b, y, r); c.closePath();
    c.fillStyle = farbe; c.fill();
    c.strokeStyle = rand; c.lineWidth = Math.max(2 * dpr, r * 0.4); c.stroke();
  }

  // ---------------------------------------------------------- Kalle
  // Pose aus dem Zustand ableiten: schwer machen, fliegen, jubeln, verdutzt
  function krabbe(l, figur, pose) {
    const breite = Math.max(K.KRABBE_BREITE * kam.z, K.KRABBE_MIN_PIXEL * dpr);
    const e = breite / 44;
    const px = sx(l.x), py = sy(l.y);
    const winkel = l.winkel;
    // Schatten auf dem Boden während des Flugs: zeigt, wo Kalle landet
    if (!l.boden) {
      const h = l.hoeheUeberBoden();
      const gx = sx(l.x), gy = sy(l.g.hoehe(l.x));
      const a = Math.max(0.12, 0.42 - h * 0.012);
      const r = breite * (0.45 - Math.min(0.25, h * 0.006));
      c.fillStyle = `rgba(40, 20, 30, ${a})`;
      c.beginPath(); c.ellipse(gx, gy, r, r * 0.28, Math.atan(-l.g.steigung(l.x)), 0, Math.PI * 2); c.fill();
    }
    c.save();
    c.translate(px, py);
    c.rotate(-winkel);
    // Quetschen: schwer = breit und flach, Aufprall = kurz platt
    let qx = 1, qy = 1;
    if (pose.schwer) { qx = 1.12; qy = 0.82; }
    if (pose.platt > 0) { const p = pose.platt; qx *= 1 + 0.25 * p; qy *= 1 - 0.3 * p; }
    if (!l.boden && !pose.schwer) { qx *= 0.96; qy *= 1.05; }
    c.scale(e * qx, e * qy);
    c.translate(-22, -35.5);
    malKrabbe(c, {
      figur,
      lauf: pose.lauf,
      wedel: zeit,
      tanzt: pose.jubel,
      schereHoch: pose.armeHoch,
      schereAuf: pose.armeHoch || pose.jubel,
      mund: pose.mund,
      blick: pose.blick,
      blickHoch: pose.blickHoch,
      schielen: pose.schielen,
    });
    c.restore();
    // Fahrtwind-Linien bei hohem Tempo
    const v = l.tempo;
    if (v > 26 && !ruhig) {
      const a = Math.min(0.5, (v - 26) / 40);
      c.strokeStyle = `rgba(255, 255, 255, ${a})`;
      c.lineWidth = 2 * dpr; c.lineCap = 'round';
      for (let k = 0; k < 4; k++) {
        const ph = (zeit * 9 + k * 0.37) % 1;
        const lx = px - breite * (0.6 + ph * 1.4), ly = py - breite * (0.15 + k * 0.17);
        c.beginPath(); c.moveTo(lx, ly); c.lineTo(lx - breite * (0.5 + a), ly + Math.tan(winkel) * breite * 0.5); c.stroke();
      }
    }
  }

  // ---------------------------------------------------------- Effekte
  function staub(x, y, menge, farbe, kraft = 1) {
    if (ruhig) menge = Math.ceil(menge / 3);
    for (let i = 0; i < menge; i++) {
      teilchen.push({ x, y, vx: (Math.random() * 2 - 1.3) * 6 * kraft, vy: Math.random() * 5 * kraft, leben: 0.5 + Math.random() * 0.4, alt: 0, r: 0.25 + Math.random() * 0.35, farbe, art: 'staub' });
    }
  }
  function funken(x, y, menge) {
    if (ruhig) menge = Math.ceil(menge / 3);
    for (let i = 0; i < menge; i++) {
      const w = Math.random() * Math.PI * 2, t = 4 + Math.random() * 8;
      teilchen.push({ x, y: y + 1, vx: Math.cos(w) * t, vy: Math.sin(w) * t + 3, leben: 0.45 + Math.random() * 0.35, alt: 0, r: 0.25 + Math.random() * 0.2, farbe: Math.random() > 0.5 ? '#fff4b0' : '#ffd35a', art: 'funke' });
    }
  }
  function text(x, y, inhalt, farbe, gross = 1) {
    texte.push({ x, y, inhalt, farbe, alt: 0, leben: 1.0, gross });
  }
  function ereignis(e, l, thema) {
    if (e.art === 'landung') {
      if (e.guete === 'perfekt') {
        funken(e.x, e.y, 18);
        blitz = 1;
        text(e.x, e.y + 4.5, e.kette > 1 ? `Perfekt ×${e.kette}` : 'Perfekt!', '#ffd35a', 1.1);
      } else if (e.guete === 'hart') {
        staub(e.x, e.y, 16, thema.boden[1], 1.2);
        text(e.x, e.y + 4, 'Uff!', '#ffb0a0', 0.9);
      } else {
        staub(e.x, e.y, 6, thema.boden[0], 0.6);
      }
    } else if (e.art === 'abflug') {
      staub(e.x, e.y, 5, thema.boden[0], 0.5);
    }
  }
  function effekte(dt, l) {
    for (let i = teilchen.length - 1; i >= 0; i--) {
      const t = teilchen[i];
      t.alt += dt;
      if (t.alt >= t.leben) { teilchen.splice(i, 1); continue; }
      t.vy -= (t.art === 'funke' ? 6 : 14) * dt;
      t.x += t.vx * dt; t.y += t.vy * dt;
      const a = 1 - t.alt / t.leben;
      c.globalAlpha = a;
      c.fillStyle = t.farbe;
      c.beginPath();
      if (t.art === 'funke') {
        const r = t.r * kam.z * (0.6 + a * 0.6), x = sx(t.x), y = sy(t.y);
        c.moveTo(x, y - r * 2); c.lineTo(x + r * 0.5, y - r * 0.5); c.lineTo(x + r * 2, y); c.lineTo(x + r * 0.5, y + r * 0.5);
        c.lineTo(x, y + r * 2); c.lineTo(x - r * 0.5, y + r * 0.5); c.lineTo(x - r * 2, y); c.lineTo(x - r * 0.5, y - r * 0.5);
        c.closePath();
      } else c.arc(sx(t.x), sy(t.y), Math.max(1.5 * dpr, t.r * kam.z), 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
    for (let i = texte.length - 1; i >= 0; i--) {
      const t = texte[i];
      t.alt += dt;
      if (t.alt >= t.leben) { texte.splice(i, 1); continue; }
      const a = Math.min(1, (t.leben - t.alt) * 4);
      if (t.folgt && l) { t.x = l.x; t.y = l.y + 3.5; }
      const hoch = t.folgt ? t.alt * 1.2 : t.alt * 2.5;
      const groesse = Math.round(Math.max(13 * dpr, 0.9 * kam.z) * t.gross * (1 + Math.max(0, 0.15 - t.alt) * 2));
      c.globalAlpha = a;
      c.font = `${groesse}px 'Press Start 2P', monospace`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      let y = Math.max(groesse * 3, sy(t.y + hoch));
      if (t.folgt && l) {
        // immer knapp über Kalle, egal wie groß er gerade gezeichnet wird
        const kalle = Math.max(K.KRABBE_BREITE * kam.z, K.KRABBE_MIN_PIXEL * dpr);
        y = Math.max(groesse * 3, sy(l.y) - kalle * 0.95 - groesse * 0.6 - t.alt * 12 * dpr);
      }
      const x = Math.min(W - groesse * 4, Math.max(groesse * 4, sx(t.x)));
      c.lineWidth = groesse * 0.35; c.strokeStyle = '#10243a'; c.lineJoin = 'round';
      c.strokeText(t.inhalt, x, y);
      c.fillStyle = t.farbe;
      c.fillText(t.inhalt, x, y);
    }
    c.globalAlpha = 1;
  }
  function flugSpur(l) {
    if (!l.boden && l.gestartet) spur.push([l.x, l.y + 0.8]);
    else if (spur.length) spur.shift();
    if (spur.length > 50) spur.shift();
    if (spur.length < 2 || ruhig) return;
    c.lineCap = 'round';
    for (let i = 1; i < spur.length; i++) {
      c.strokeStyle = `rgba(255, 255, 255, ${(i / spur.length) * 0.4})`;
      c.lineWidth = Math.max(2 * dpr, 0.3 * kam.z) * (i / spur.length);
      c.beginPath(); c.moveTo(sx(spur[i - 1][0]), sy(spur[i - 1][1])); c.lineTo(sx(spur[i][0]), sy(spur[i][1])); c.stroke();
    }
  }

  // ---------------------------------------------------------- Ein Bild
  // f = Tageslicht-Fortschritt (0 = Mittag, 1 = Sonne weg)
  function zeichne(l, { dt, f, figur, pose, gebiet }) {
    zeit += dt;
    f = Math.max(0, Math.min(1, f || 0));
    const thema = THEMEN[gebiet] || THEMEN[0];
    kamera(l, dt);
    const horizont = himmel(f, thema);
    ferneKueste(horizont, f, thema, gebiet);
    startZiel(l, f);
    gelaende(l, thema, f, gebiet);
    flugSpur(l);
    krabbe(l, figur, pose);
    effekte(dt, l);
    // Kurzer warmer Schein nach perfekter Landung
    if (blitz > 0) {
      c.fillStyle = `rgba(255, 236, 160, ${blitz * 0.18})`;
      c.fillRect(0, 0, W, H);
      blitz = Math.max(0, blitz - dt * 4);
    }
    // Abendlicht über allem (dezent, Kontraste bleiben)
    if (f > 0.55) {
      c.globalCompositeOperation = 'multiply';
      c.fillStyle = verlauf(LICHT, f);
      c.globalAlpha = Math.min(0.55, (f - 0.55) * 1.3);
      c.fillRect(0, 0, W, H);
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
    }
    if (f >= 1) {
      c.fillStyle = 'rgba(20, 20, 60, 0.25)';
      c.fillRect(0, 0, W, H);
    }
  }
  function neuerLauf() { teilchen.length = 0; texte.length = 0; spur = []; blitz = 0; kam.bereit = false; }

  // Kleines Streckenprofil für die Levelkarten
  function profil(leinw, def) {
    const g2 = leinw.getContext('2d');
    const s = baueStrecke(def);
    const th = THEMEN[def.gebiet];
    const b = leinw.width, h = leinw.height;
    const v = g2.createLinearGradient(0, 0, 0, h);
    v.addColorStop(0, '#5aa6e0'); v.addColorStop(1, '#ffd9a0');
    g2.fillStyle = v; g2.fillRect(0, 0, b, h);
    // Typischer Ausschnitt aus der Mitte der Strecke, kaum überhöht
    const x0 = s.ziel * 0.5, x1 = x0 + 260;
    const [lo, hi] = s.gelaende.bereich(x0, x1);
    const mProPx = (x1 - x0) / b;
    const unten = h * 0.92, mitte = (lo + hi) / 2;
    const yv = (x) => unten - h * 0.35 - (s.gelaende.hoehe(x) - mitte) / mProPx * 1.4;
    g2.beginPath(); g2.moveTo(0, h);
    for (let px = 0; px <= b; px++) g2.lineTo(px, yv(x0 + px * mProPx));
    g2.lineTo(b, h); g2.closePath();
    g2.fillStyle = th.boden[1]; g2.fill();
    g2.beginPath();
    for (let px = 0; px <= b; px++) { const y = yv(x0 + px * mProPx); if (px) g2.lineTo(px, y); else g2.moveTo(px, y); }
    if (th.grasFarbe) { g2.strokeStyle = th.grasFarbe; g2.lineWidth = 5; g2.stroke(); }
    g2.strokeStyle = th.rand; g2.lineWidth = 2; g2.stroke();
  }

  return {
    init, groesse, zeichne, setzeRandOben(px) { randOben = px; },
    juhu(x, y) { text(x, y + 3.5, 'Juhuu!', '#ffffff', 0.95); texte[texte.length - 1].folgt = true; }, ereignis, neuerLauf, profil, kamera, kameraZiel,
    get kam() { return kam; }, get dpr() { return dpr; }, get W() { return W; }, get H() { return H; },
    get cssW() { return cssW; }, get cssH() { return cssH; },
    // Für Tests: Bildposition von Kalle in CSS-Pixeln
    krabbeImBild(l) { return { x: sx(l.x) / dpr, y: sy(l.y) / dpr }; },
    bodenImBild(l, x) { return { x: sx(x) / dpr, y: sy(l.g.hoehe(x)) / dpr }; },
  };
})();
