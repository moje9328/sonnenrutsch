// ===================================================================
// 3d · ENDLOSFLUG
// Ein zusammenhängender Lauf ohne Levelgrenzen:
//   • Gelände wird laufend nach vorn erweitert (gleiche Hügelarten und Grenzen
//     wie die Strecken; die Schwierigkeit steigt langsam mit der Strecke bis zu
//     einer Obergrenze) und hinten wieder entfernt.
//   • Ein unsichtbarer Testpilot (Bot 'schnell') fliegt GEIST_VORLAUF Meter
//     voraus. Wo er auf einer Abfahrt landet, entsteht eine Muschel-Linie –
//     dieselbe Regel wie bei den Strecken (nur erreichbare Abfahrten, Pausen).
//   • Tageslicht, Distanzmarken und Boni stehen in Lauf (3-physik.js).
// Alles ist deterministisch: gleiche Saat → gleicher Lauf (für Tests).
// ===================================================================

const ENDLOS_ANFANG = { L: [42, 54], A: [18, 26], steil: [0.72, 0.6], wechsel: 0.3, muster: { klein: 0.15, gross: 0.12, rampe: 0.12 } };
const ENDLOS_ENDE = { L: [56, 88], A: [30, 48], steil: [0.5, 0.42], wechsel: 0.55, muster: { klein: 0.3, gross: 0.25, rampe: 0.25 } };

// Bauplan des Endlosflugs (wie ein Streckeneintrag, aber ohne Ziel). Die Saat setzt die App je Lauf neu.
const ENDLOS_DEF = { id: 'endlos', endlos: true, name: 'Endlosflug', gebiet: 0, saat: 1 };

class Endlos {
  constructor(saat) {
    this.saat = saat >>> 0;
    this.r = zufall(this.saat * 7919 + 13);
    this.rLinie = zufall(this.saat * 31 + 7);
    const startY = 10 + ENDLOS_ANFANG.A[0] * 1.2 * GELAENDE.HOEHE;
    this.g = new Gelaende([[-120, startY], [0, startY]]);
    this.x = 0; this.y = startY;
    this.zaehler = 0;
    this.naechsterAbhang = null;
    this.kuppen = []; this.taeler = [];
    this.muscheln = [];
    this.matten = [];               // Sprungflächen (gemeinsame Liste für Spieler und Testpilot)
    this.linie = 0;
    this.entschieden = new Map();   // Abfahrt (x des Tals) → Linie ja/nein
    this.letzteHatte = false;
    this.erweitern(K.ENDLOS.VORLAUF);
    this.planer = new Planer({ g: this.g, taeler: this.taeler, kuppen: this.kuppen, matten: this.matten, muscheln: this.muscheln, saat, positionen: [0.45, 0.9] });
    this.geist = new Lauf({ id: 'geist', saat }, { gelaende: this.g, matten: this.matten, bahnMerken: true });
    this.geist.vorschau = true;     // sammelt nichts, ruft nicht
    this.geist.tag = 1e9;
    this.geist.starten();
    this.geistBot = Bot.neu('schnell');
  }
  // Schwierigkeit 0..1 nach zurückgelegter Strecke – danach konstant (Obergrenze)
  schwierigkeit(x) { return Math.max(0, Math.min(1, x / K.ENDLOS.SCHWIERIG_WEG)); }

  // Ein Hügel: Abfahrt ins Tal + Steigung zur nächsten Kuppe
  naechsterHuegel() {
    const r = this.r, p = this.schwierigkeit(this.x), a = ENDLOS_ANFANG, e = ENDLOS_ENDE;
    const mitte = (bereich) => (bereich[0] + bereich[1]) / 2;
    const wechsel = mischen(a.wechsel, e.wechsel, p);
    const w = () => 1 + wechsel * (r() * 2 - 1) * 0.6;
    const Lg = mischen(mitte(a.L), mitte(e.L), p) * (0.85 + r() * 0.3) * GELAENDE.LAENGE;
    const Ag = mischen(mitte(a.A), mitte(e.A), p) * (0.85 + r() * 0.3) * GELAENDE.HOEHE;
    const m = {};
    for (const k of ['klein', 'gross', 'rampe']) m[k] = mischen(a.muster[k], e.muster[k], p);
    let art = 'normal';
    const z = r();
    if (this.zaehler >= 2) {
      if (z < m.rampe) art = 'rampe';
      else if (z < m.rampe + m.gross) art = 'gross';
      else if (z < m.rampe + m.gross + m.klein) art = 'klein';
    }
    this.zaehler++;
    const h = HUEGELARTEN[art];
    const grund = 6 + 4 * Math.sin(this.x / 300 + this.saat);
    const ab = this.naechsterAbhang || h.ab;
    this.naechsterAbhang = null;
    let ty = this.y - Ag * ab[1] * w();
    ty = Math.max(grund - GELAENDE.TAL_SPIELRAUM, Math.min(ty, grund + GELAENDE.TAL_SPIELRAUM));
    const [hAb, LAb] = stueckGrenzen(this.y - ty, Lg * ab[0] * w());
    this.x += LAb; this.y -= hAb;
    const tal = [this.x, this.y];
    const steil = mischen(mitte(a.steil), mitte(e.steil), p) * (art === 'rampe' ? 0.75 : 1);
    const [hAuf, LAuf] = stueckGrenzen(Ag * h.auf[1] * w() * (0.85 + r() * 0.2), Lg * h.auf[0] * steil * w());
    this.x += LAuf; this.y += hAuf;
    const kuppe = [this.x, this.y];
    if (h.danach) this.naechsterAbhang = h.danach.ab;
    this.taeler.push(tal); this.kuppen.push(kuppe);
    return [tal, kuppe];
  }
  erweitern(bisX) {
    while (this.g.ende < bisX) this.g.anhaengen(this.naechsterHuegel());
  }

  // Bei jedem Physikschritt des echten Laufs (nicht für Vorschau oder Testpilot)
  pflege(l) {
    const E = K.ENDLOS;
    this.erweitern(l.x + E.VORLAUF);
    // Testpilot vorausfliegen lassen (höchstens 600 Schritte je Aufruf, holt danach weiter auf)
    const gst = this.geist;
    let n = 0;
    while (gst.x < l.x + E.GEIST_VORLAUF && n++ < 600) {
      this.erweitern(gst.x + E.VORLAUF * 0.6);
      this.planer.vor(gst);
      gst.schritt(this.geistBot.halten(gst));
      for (const e of gst.ereignisse) {
        if (e.art === 'landung' && e.guete !== 'matte') this.landung(e.x);
        this.planer.ereignis(gst, e);
      }
      gst.ereignisse.length = 0;
    }
    // Hinten aufräumen: Gelände, Hügellisten, Muscheln
    const weg = l.x - E.HINTEN;
    if (this.g.n > 6 && this.g.p[2][0] < weg) this.g.kuerzen(weg);
    while (this.kuppen.length && this.kuppen[0][0] < weg) this.kuppen.shift();
    while (this.taeler.length && this.taeler[0][0] < weg) this.taeler.shift();
    let raus = 0;
    while (raus < this.muscheln.length && this.muscheln[raus].x < weg) raus++;
    if (raus) { this.muscheln.splice(0, raus); l.muschelIndex = Math.max(0, l.muschelIndex - raus); }
    for (const [tx] of this.entschieden) { if (tx < weg) this.entschieden.delete(tx); else break; }
    this.planer.aufraeumen(weg);
  }

  // Der Testpilot ist auf einer Abfahrt gelandet → dort eventuell eine Muschel-Linie
  landung(x) {
    const kuppe = this.kuppen.filter(k => k[0] < x).pop();
    const tal = this.taeler.find(t => t[0] > x);
    if (!kuppe || !tal || kuppe[0] > tal[0] || this.entschieden.has(tal[0])) return;
    const ML = MUSCHEL_LINIEN, r = this.rLinie;
    // Pausen wie bei den Strecken: nicht jede Abfahrt, nie zwei Linien direkt hintereinander
    const wuerfel = r(), anzahl = ML.ANZAHL[0] + Math.floor(r() * (ML.ANZAHL[1] - ML.ANZAHL[0] + 1));
    const pad = this.matten.find(m => Math.abs(m.x1 - tal[0]) < K.MATTE.BREITE);
    const punkte = !this.letzteHatte && wuerfel <= ML.ANTEIL && x > 40 ? linienPunkte(this.g, x, pad ? pad.x0 - 2 : tal[0], anzahl) : [];
    const ja = punkte.length > 0;
    this.entschieden.set(tal[0], ja);
    this.letzteHatte = ja;
    if (!ja) return;
    this.linie++;
    const neu = punkte.map((px, k) => {
      const q = ueberBoden(this.g, px, K.MUSCHEL_HOEHE);
      return { x: q.x, y: q.y, gold: k === punkte.length - 1 && this.linie % ML.GOLD_JEDE === 0, linie: this.linie, weg: false };
    });
    for (const m of neu) einsortieren(this.muscheln, m);
    verknuepfeReihen(neu);
  }
}
