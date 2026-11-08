// ===================================================================
// 3e · PLANER: SPRUNGFLÄCHEN UND LUFT-SAMMELREIHEN
// Ein unsichtbarer Testpilot (Bot) fliegt die Strecke voraus. Aus SEINEN echten
// Flügen entsteht alles Neue – nichts wird zufällig in den Himmel gestreut:
//   • Sprungflächen: Liegt vor einem Tal eine passende Stelle, wird der Absprung
//     dort vorab durchgerechnet (verschiedene Stärken, verschiedene Anflugtempi,
//     loslassen oder halten). Nur wenn danach eine faire Landung auf einer
//     Abfahrt (nicht am Gegenhang) möglich ist, entsteht die Fläche.
//   • Luft-Reihen: Die Muscheln liegen auf der Flugbahn, die Kalles Mitte
//     tatsächlich geflogen ist. Große Flüge bekommen manchmal zwei Linien:
//     die hohe (losgelassen) und eine niedrige (von Anfang an gehalten).
//   • Rhythmus: Nach einem bestückten Flug folgt ein freier. Kleine Hüpfer
//     bleiben leer. Der Anfang der Strecke bleibt ruhig.
// Die Strecken werden offline geplant (werkzeug-muscheln.js → 2b-muscheln.js),
// der Endlosflug plant im Spiel mit demselben Code.
// ===================================================================

// x-sortiert einfügen (die Muschellisten sind immer nach x geordnet)
function einsortieren(liste, m, schluessel = 'x') {
  let lo = 0, hi = liste.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (liste[mid][schluessel] <= m[schluessel]) lo = mid + 1; else hi = mid; }
  liste.splice(lo, 0, m);
}

// Reihen verbinden: jede Muschel kennt ihre Reihe (n = Größe, got = eingesammelt)
function verknuepfeReihen(liste) {
  const karte = new Map();
  for (const m of liste) {
    if (!m.linie) continue;
    let r = karte.get(m.linie);
    if (!r) { r = { n: 0, got: 0 }; karte.set(m.linie, r); }
    r.n++;
    m.reihe = r;
  }
}

class Planer {
  // taeler: Liste der Tiefpunkte [x, y] (beim Endlosflug laufend ergänzt).
  // matten / muscheln: Ziellisten, in die der Planer einträgt.
  constructor({ g, taeler, kuppen, matten, muscheln, saat, linieStart = 100, positionen = [0.3, 0.6, 1] }) {
    this.positionen = positionen;   // wo auf der Rampe geprüft wird (im Endlosflug weniger: spart Rechenzeit im Spiel)
    this.g = g; this.taeler = taeler; this.kuppen = kuppen; this.matten = matten; this.muscheln = muscheln;
    this.r = zufall((saat >>> 0) * 977 + 5);
    this.entschieden = new Set();
    this.seitMatte = 9;        // Täler seit der letzten Sprungfläche
    this.bestueckt = 0;        // bestückte Flüge hintereinander
    this.linie = linieStart;   // Luft-Reihen bekommen Nummern ab 101
    this.golde = 0;
    this.snap = null;          // Zustand beim Absprung des laufenden Flugs (für die niedrige Linie)
    this.alternativen = [];    // [{ abX, nr }] – Flüge mit niedriger Alternativlinie (für Tests)
    this.log = { matten: 0, reihen: 0, bonus: 0, zwei: 0, abgelehnt: 0, gruende: {} };
  }

  // ---- Sprungflächen --------------------------------------------------
  // Vor jedem Schritt des Testpiloten: rollt er auf einer Abfahrt, deren Tal und Rampe noch nicht geprüft wurden?
  vor(l) {
    if (!l.boden || l.ergebnis) return;
    const tal = this.taeler.find(t => t[0] > l.x + 20);
    if (!tal || this.entschieden.has(tal[0]) || tal[0] - l.x > 300) return;
    if (this.g.steigung(l.x) > -0.08) return;   // erst wenn er wirklich bergab rollt
    this.entschieden.add(tal[0]);
    this.pruefeTal(l, tal);
  }
  // Flächen liegen auf der Rampe hinter dem Tal: sie verstärken den Absprung. Gesucht wird eine Stelle und
  // eine Stoßstärke, bei der danach (auch bei langsamerem Anflug) eine faire Landung bleibt.
  pruefeTal(l, tal) {
    const M = K.MATTE;
    this.seitMatte++;
    if (l.x < 260 || this.seitMatte < 3) return;
    if (this.r() > 0.62) return this.grund('zufall');   // wenige, gezielte Flächen
    const kuppe = this.kuppen.find(k => k[0] > tal[0]);
    if (!kuppe) return;
    const von = tal[0] + 8, bis = kuppe[0] - M.BREITE - 14;   // die Kuppe selbst bleibt frei
    if (bis < von) return this.grund('kurz');
    for (const t of this.positionen) {
      const x0 = von + (bis - von) * t, x1 = x0 + M.BREITE;
      let ok = true;
      for (let x = x0; x <= x1; x += 1) { const s = this.g.steigung(x); if (s < M.STEIGUNG[0] || s > M.STEIGUNG[1]) { ok = false; break; } }
      if (!ok) { this.grund('hang'); continue; }
      for (const kraft of M.STOSS) {
        const pad = { x0, x1, kraft };
        if (this.probe(l, pad)) {
          einsortieren(this.matten, pad, 'x0');
          this.seitMatte = 0;
          this.log.matten++;
          return;
        }
      }
    }
    this.log.abgelehnt++;
  }
  grund(g) { this.log.gruende[g] = (this.log.gruende[g] || 0) + 1; }
  // Ist der Absprung von dieser Fläche fair? Fährt eine Kopie des Piloten hin und rechnet die Flüge durch.
  probe(l, pad) {
    const M = K.MATTE;
    const k0 = Bot.kopie(l);
    k0.matten = [...l.matten, pad].sort((a, b) => a.x0 - b.x0);
    k0.bahnMerken = false; k0.ereignisse = [];
    let n = 0;
    while (k0.boden && k0.x < pad.x0 - 0.5 && n++ < 2400) k0.schritt(Bot.bodenRegel(k0, 0));
    if (!k0.boden || k0.x < pad.x0 - 1.5 || k0.v < M.V_MIN * 1.15) { this.grund('anfahrt'); return false; }
    let haupt = false;
    for (const f of M.LANDE_TEMPI) {
      const k = Bot.kopie(k0);
      k.matten = k0.matten; k.ereignisse = [];
      k.v = k0.v * f;
      let m = 0;
      while (k.boden && k.x <= pad.x1 + 0.5 && m++ < 2000) k.schritt(Bot.bodenRegel(k, 0));
      if (k.boden) { if (f === 1) { this.grund('kein-sprung'); return false; } continue; }   // zu langsam für einen Sprung: dann federt sie nur
      const ok = this.fairerFlug(k, f >= 1);
      if (!ok.gut) { this.grund('unfair@' + f); return false; }
      if (f === 1) haupt = ok.flugzeit >= M.LANDE_MIN_FLUGZEIT && ok.gipfel >= M.LANDE_MIN_HOEHE;
    }
    if (!haupt) this.grund('zu-flach');
    return haupt;
  }
  // Flug nach dem Absprung durchrechnen: losgelassen und gehalten. Fair = einer von beiden landet sauber auf einer Abfahrt.
  // streng: Landung auf einer Abfahrt. Sonst (langsamerer Anflug) genügt es, nicht hart aufzuschlagen.
  fairerFlug(k, streng = true) {
    const sim = (halten) => {
      const q = Bot.kopie(k);
      q.ereignisse = [];
      const y0 = q.y;
      let t = 0, hoechst = q.y;
      while (!q.boden && t < 7) { q.schritt(halten); t += K.SCHRITT; hoechst = Math.max(hoechst, q.y); }
      const e = q.ereignisse.find(z => z.art === 'landung');
      const sauber = !!e && q.boden && q.x < this.g.ende - 40 &&
        (streng ? (e.guete === 'perfekt' || (e.guete === 'gut' && this.g.steigung(e.x) <= 0.05)) && this.g.steigung(e.x) <= 0.05
                : e.guete !== 'hart');
      if (K.PLAN_DEBUG) console.log('   flug', halten ? 'halt' : 'los ', 'f', streng, 't', t.toFixed(2), 'gipfel', (hoechst - y0).toFixed(0), e ? e.guete + ' s=' + this.g.steigung(e.x).toFixed(2) + ' w=' + e.winkel.toFixed(0) + ' x+' + (e.x - k.x).toFixed(0) : 'keine Landung', sauber ? 'OK' : '');
      return { sauber, flugzeit: t, gipfel: hoechst - y0 };
    };
    const los = sim(false), halt = sim(true);
    return { gut: los.sauber || halt.sauber, flugzeit: los.flugzeit, gipfel: los.gipfel };
  }

  // ---- Luft-Reihen ----------------------------------------------------
  // Für jedes Ereignis des Testpiloten aufrufen (l = sein Lauf, mit bahnMerken)
  ereignis(l, e) {
    if (e.art === 'absprung' || e.art === 'matte') {
      this.snap = Bot.kopie(l);
      this.snap.matten = l.matten;
    } else if (e.art === 'landung' && e.bahn) this.flug(e);
  }
  flug(e) {
    const Lf = K.LUFT;
    const vonMatte = e.flugArt === 'matte';
    if (e.guete === 'hart') { this.bestueckt = 0; return; }
    if (e.abX < 90 || e.gipfel < (vonMatte ? Lf.MIN_GIPFEL_MATTE : Lf.MIN_GIPFEL) || e.flugzeit < (vonMatte ? Lf.MIN_ZEIT_MATTE : Lf.MIN_ZEIT)) return;   // Anfang ruhig, kleine Hüpfer leer
    if (!vonMatte && this.bestueckt >= Lf.PAUSE) { this.bestueckt = 0; return; }       // freier Abschnitt zum Durchatmen
    const bonus = e.gipfel >= Lf.BONUS_GIPFEL;
    const hoch = this.reiheAus(e.bahn, bonus, vonMatte ? Lf.ABSTAND_BODEN_MATTE : Lf.ABSTAND_BODEN);
    if (!hoch.length) return;
    const nr = ++this.linie;
    this.golde++;
    const gold = bonus || this.golde % MUSCHEL_LINIEN.GOLD_JEDE === 0;
    const erzeugt = hoch.map((p, i) => ({ x: p.x, y: p.y, gold: gold && i === hoch.length - 1, linie: nr, luft: true, alt: false, weg: false }));
    // Große Flüge: gelegentlich zusätzlich eine niedrige Linie (von Anfang an gehalten)
    let niedrig = [];
    if (e.gipfel >= 28 && this.snap && this.r() < Lf.ZWEI_LINIEN) niedrig = this.niedrigeLinie(hoch);
    if (niedrig.length) {
      const nr2 = ++this.linie;
      niedrig.forEach((p, i) => erzeugt.push({ x: p.x, y: p.y, gold: false, linie: nr2, luft: true, alt: true, abX: e.abX, weg: false }));
      this.alternativen.push({ abX: e.abX, nr: nr2, hoch: nr });
      this.log.zwei++;
    }
    for (const m of erzeugt) einsortieren(this.muscheln, m);
    verknuepfeReihen(erzeugt);
    this.bestueckt++;
    this.log.reihen++;
    if (bonus) this.log.bonus++;
  }
  // Kalles Mitte entlang der aufgezeichneten Bahn: gleiche Abstände (Kurvenlänge), mittig im Flug,
  // mindestens ABSTAND_BODEN über dem Gelände. Rückgabe: [{x, y}] oder leer.
  reiheAus(bahn, bonus, bodenAbstand = K.LUFT.ABSTAND_BODEN) {
    const Lf = K.LUFT, n = bahn.length / 2;
    if (n < 5) return [];
    const s = [0];
    for (let i = 1; i < n; i++) s.push(s[i - 1] + Math.hypot(bahn[2 * i] - bahn[2 * i - 2], bahn[2 * i + 1] - bahn[2 * i - 1]));
    const gesamt = s[n - 1];
    const wunsch = bonus ? Lf.ANZAHL[1] : Lf.ANZAHL[0] + Math.floor(this.r() * (Lf.ANZAHL[1] - Lf.ANZAHL[0] + 1));
    let anz = Math.min(wunsch, Math.floor(gesamt * 0.7 / Lf.ABSTAND) + 1);
    while (anz >= 4 && (gesamt - (anz - 1) * Lf.ABSTAND) / 2 < 0.15 * gesamt) anz--;
    if (anz < 4) return [];
    const start = (gesamt - (anz - 1) * Lf.ABSTAND) / 2;
    const punkte = [];
    let i = 1;
    for (let j = 0; j < anz; j++) {
      const sj = start + j * Lf.ABSTAND;
      while (i < n - 1 && s[i] < sj) i++;
      const t = (sj - s[i - 1]) / Math.max(1e-9, s[i] - s[i - 1]);
      const px = bahn[2 * i - 2] + (bahn[2 * i] - bahn[2 * i - 2]) * t, py = bahn[2 * i - 1] + (bahn[2 * i + 1] - bahn[2 * i - 1]) * t;
      const dx = bahn[2 * i] - bahn[2 * i - 2], dy = bahn[2 * i + 1] - bahn[2 * i - 1], dl = Math.hypot(dx, dy) || 1;
      // Kalles Mitte liegt KRABBE_MITTE senkrecht über der Flugrichtung (wie beim Einsammeln)
      punkte.push({ x: px - dy / dl * K.KRABBE_MITTE, y: py + dx / dl * K.KRABBE_MITTE });
    }
    // Nichts im Boden: längster zusammenhängender Abschnitt mit genug Abstand zum Gelände
    let besser = [], lauf = [];
    for (const p of punkte) {
      if (p.y - this.g.hoehe(p.x) >= bodenAbstand) lauf.push(p);
      else { if (lauf.length > besser.length) besser = lauf; lauf = []; }
    }
    if (lauf.length > besser.length) besser = lauf;
    return besser.length >= 4 ? besser : [];
  }
  // Niedrige Alternativlinie: derselbe Absprung, aber von Anfang an gehalten (Sinkflug)
  niedrigeLinie(hoch) {
    const q = Bot.kopie(this.snap);
    q.bahnMerken = true; q.ereignisse = [];
    q.bahn = [q.x, q.y];
    let t = 0;
    while (!q.boden && t < 7) { q.schritt(true); t += K.SCHRITT; }
    const e = q.ereignisse.find(z => z.art === 'landung');
    if (!e || !q.boden || !(e.guete === 'perfekt' || (e.guete === 'gut' && this.g.steigung(e.x) <= 0.05))) return [];
    let reihe = this.reiheAus(q.bahn, false);
    // Genug Abstand zur hohen Linie (sonst sind es keine zwei Linien) und nicht länger als die hohe
    const hochY = (x) => {
      let b = null;
      for (let i = 1; i < hoch.length; i++) if (hoch[i].x >= x && hoch[i - 1].x <= x) { const t2 = (x - hoch[i - 1].x) / Math.max(1e-9, hoch[i].x - hoch[i - 1].x); b = hoch[i - 1].y + (hoch[i].y - hoch[i - 1].y) * t2; break; }
      return b;
    };
    reihe = reihe.filter(p => { const hy = hochY(p.x); return hy === null || hy - p.y >= K.LUFT.MIN_TRENNUNG; });
    if (reihe.length > hoch.length) reihe = reihe.slice(0, hoch.length);
    return reihe.length >= 4 ? reihe : [];
  }

  // Beim Endlosflug: weit zurückliegendes vergessen
  aufraeumen(xMin) {
    for (const x of this.entschieden) if (x < xMin) this.entschieden.delete(x);
    while (this.matten.length && this.matten[0].x1 < xMin) this.matten.shift();
  }
}

// Offline-Planung einer ganzen Strecke (Werkzeuge, Tests). Rückgabe: { matten, luft, planer }
function planeStrecke(def, art = 'gut') {
  const s = baueStrecke(def);
  const matten = [], luft = [];
  const planer = new Planer({ g: s.gelaende, taeler: s.taeler, kuppen: s.kuppen, matten, muscheln: luft, saat: def.saat });
  if (def.lern) return { matten, luft, planer };   // die Lernstrecke bleibt ruhig
  const l = new Lauf(def, { ohneMuscheln: true, matten, bahnMerken: true });
  l.starten(); l.tag = 999;
  const bot = Bot.neu(art);
  let schritte = 0;
  while (!l.ergebnis && schritte++ < 240 * 400) {
    planer.vor(l);
    l.schritt(bot.halten(l));
    for (const e of l.ereignisse) planer.ereignis(l, e);
    l.ereignisse.length = 0;
  }
  return { matten, luft, planer };
}
