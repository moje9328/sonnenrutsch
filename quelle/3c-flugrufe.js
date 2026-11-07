// ===================================================================
// 3c · FLUGRUFE (Bewertung)
// Entscheidet in Weltkoordinaten und Spielzeit, wann Kalle ruft:
//   „Juhu!“   – schöner mittlerer Flug nach oben
//   „Yippie!“ – besonders hoher und schneller oder sehr weiter Flug
// Ein Flug beginnt mit dem echten Abheben (Lauf.echterFlug) und endet erst,
// wenn Kalle BODEN_RUHE Sekunden stabil am Boden war – kurze Aufsetzer
// zwischendurch starten keinen neuen Flug. Pro Flug höchstens ein „Juhu!“
// und danach höchstens ein „Yippie!“ als Steigerung. Zwischen zwei Rufen
// liegen mindestens ABSTAND Sekunden. Es wird nie etwas aufgeschoben: Was
// nicht sofort passt, entfällt. Ergebnis sind Ereignisse { art: 'ruf', ruf }.
// ===================================================================

class Flugrufe {
  constructor() {
    this.imFlug = false;      // gehört der aktuelle Zustand zu einem Flug?
    this.bodenZeit = 0;       // wie lange schon am Boden
    this.gerufen = null;      // null | 'juhu' | 'yippie' (in diesem Flug)
    this.letzterRuf = -1e9;   // Spielzeit des letzten Rufs
    this.start = null;        // Absprung: { x, y, vx, vy }
  }
  // Gipfelhöhe des Flugs über dem Absprung, vorhergesagt aus Höhe und Steiggeschwindigkeit
  static gipfel(l, start) {
    const g = K.G_LUFT;
    return (l.y - start.y) + (l.vy > 0 ? l.vy * l.vy / (2 * g) : 0);
  }
  schritt(l, dt) {
    const R = K.RUF;
    if (l.boden) {
      this.bodenZeit += dt;
      if (this.imFlug && this.bodenZeit >= R.BODEN_RUHE) { this.imFlug = false; this.gerufen = null; this.start = null; }
      return;
    }
    this.bodenZeit = 0;
    if (!l.echterFlug) return;
    if (!this.imFlug) {
      this.imFlug = true;
      this.start = { x: l.abflugX, y: l.abflugY, vy: Math.max(0, l.abflugV * l.abflugSteig), v: l.abflugV };
    }
    if (this.gerufen === 'yippie' || l.ergebnis) return;
    if (l.flugzeit < R.JUHU_MIN_ZEIT) return;
    const st = this.start;
    const hoehe = l.y - st.y;                      // tatsächlich erreicht
    const gipfel = Flugrufe.gipfel(l, st);         // vorhergesagt (ohne Halten)
    const weite = l.x - st.x;
    const sofortYippie = !this.gerufen && gipfel >= R.YIPPIE_SOFORT && st.v >= R.YIPPIE_SOFORT_TEMPO;
    const yippie = sofortYippie || hoehe >= R.YIPPIE_HOEHE || weite >= R.YIPPIE_WEITE;
    const juhu = hoehe >= R.JUHU_HOEHE && l.vy > 0 && st.vy >= R.JUHU_STEIG;   // tatsächlich hoch, noch im Steigflug
    const seitLetztem = l.zeit - this.letzterRuf;
    if (yippie) {
      // Steigerung im selben Flug erst, wenn das Juhu vorbei ist; sonst Abstand zum letzten Flug
      const frei = this.gerufen === 'juhu' ? seitLetztem >= R.STEIGERUNG : seitLetztem >= R.ABSTAND;
      if (frei) this.rufen(l, 'yippie');
    } else if (juhu && !this.gerufen) {
      if (seitLetztem >= R.ABSTAND) this.rufen(l, 'juhu');
      else this.gerufen = 'verpasst';              // zu kurz nach dem letzten Ruf: entfällt, wird nicht nachgeholt
    }
  }
  rufen(l, ruf) {
    this.gerufen = ruf;
    this.letzterRuf = l.zeit;
    l.ereignisse.push({ art: 'ruf', ruf, x: l.x, y: l.y });
  }
}
