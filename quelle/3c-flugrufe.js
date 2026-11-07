// ===================================================================
// 3c · FLUGRUFE (Bewertung)
// Entscheidet in Weltkoordinaten und Spielzeit, wann Kalle ruft:
//   Nur bei richtig großen Flügen (hoch UND weit) und pro Flug höchstens EIN Ruf:
//   „Juhu!“ normalerweise, „Yippie!“ wenn der Gipfel besonders hoch ist.
// Ein Flug beginnt mit dem echten Abheben (Lauf.echterFlug) und endet erst,
// wenn Kalle BODEN_RUHE Sekunden stabil am Boden war – kurze Aufsetzer
// zwischendurch starten keinen neuen Flug. Zwischen zwei Rufen
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
      this.maxHoehe = 0;
    }
    // Pro Flug höchstens EIN Ruf – und nur bei einem richtig großen Flug: tatsächlich hoch
    // UND weit. „Yippie!“ statt „Juhu!“ nur, wenn der Gipfel besonders hoch wird.
    if (this.gerufen || l.ergebnis) return;
    const st = this.start;
    const hoehe = l.y - st.y;                      // tatsächlich erreicht
    const weite = l.x - st.x;
    this.maxHoehe = Math.max(this.maxHoehe, hoehe);
    if (this.maxHoehe < R.HOEHE || weite < R.WEITE) return;
    if (l.zeit - this.letzterRuf < R.ABSTAND) { this.gerufen = 'verpasst'; return; }   // entfällt, wird nicht nachgeholt
    this.rufen(l, Math.max(this.maxHoehe, Flugrufe.gipfel(l, st)) >= R.YIPPIE_HOEHE ? 'yippie' : 'juhu');
  }
  rufen(l, ruf) {
    this.gerufen = ruf;
    this.letzterRuf = l.zeit;
    l.ereignisse.push({ art: 'ruf', ruf, x: l.x, y: l.y });
  }
}
