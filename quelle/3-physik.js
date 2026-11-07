// ===================================================================
// 3 · PHYSIK
// Ein Lauf über eine Strecke. Kalle ist entweder am Boden (bewegt sich
// entlang des Hangs, Tempo v) oder in der Luft (freier Flug, vx/vy).
//
// Boden:  Beschleunigung entlang des Hangs = −g·sin(Neigung) − Reibung.
//         Halten macht g größer: bergab schneller, bergauf langsamer.
//         Abheben, sobald die Kuppe stärker abfällt, als die Schwerkraft
//         Kalle herunterziehen kann: v²·Krümmung > g·cos(Neigung).
//         Wer schwer bleibt, klebt also an der Kuppe; wer loslässt, fliegt.
// Luft:   Schwerkraft leicht (losgelassen) oder stark (gehalten = Sinkflug).
// Landen: Das Tempo längs des Hangs bleibt, der Anteil quer dazu geht
//         verloren. Flache Landung auf einem Abhang = perfekt (+Bonus),
//         Aufprall gegen einen Anstieg bremst zusätzlich.
// Alles läuft in festen Schritten von 1/240 s. So verhält sich das Spiel
// bei 30, 60 oder 144 Bildern pro Sekunde gleich.
// ===================================================================

class Lauf {
  constructor(def, { ohneMuscheln = false } = {}) {
    this.def = def;
    const s = baueStrecke(def);
    this.g = s.gelaende;
    this.ziel = s.ziel;
    this.hinweise = s.hinweise;
    this.x = s.start.x;
    this.y = this.g.hoehe(this.x);
    this.v = 0;
    this.vx = 0; this.vy = 0;
    this.boden = true;
    this.gestartet = false;
    this.zeit = 0;                 // verstrichene Spielzeit
    this.tag = def.zeit;           // Tageslicht gesamt
    this.ergebnis = null;          // 'ziel' | 'nacht'
    this.flugzeit = 0;
    this.echterFlug = false;
    this.abflugX = 0; this.abflugY = 0; this.abflugV = 0;
    this.kette = 0;                // perfekte Landungen in Folge
    this.halten = false;
    this.ereignisse = [];          // für Grafik und Ton: { art, ... }
    this.statistik = { perfekt: 0, gut: 0, hart: 0, fluege: 0, hoechster: 0, weitester: 0, vmax: 0, kette: 0 };
    this.abflugX = 0;
    this.hoechstImFlug = 0;
    this.nachZiel = 0;             // Zeit seit Zieldurchlauf
    // Muscheln: [{ x, y, gold, weg }], nach x sortiert
    this.muscheln = ohneMuscheln ? [] : legeMuscheln(def, this);
    this.muschelIndex = 0;         // erste noch nicht vorbeigezogene Muschel
    this.muschelWert = 0;          // gesammelt (gold zählt mehr)
    this.muschelGesamt = this.muscheln.reduce((s, m) => s + (m.gold ? K.GOLD_WERT : 1), 0);
    this.vorschau = false;         // Bot-Vorschau: sammelt nichts ein
    this.maxUeberBoden = 0;        // größte Höhe über dem Boden im aktuellen Flug
    this.rufe = new Flugrufe();    // bewertet Flüge → „Juhu!“ / „Yippie!“
  }

  get rest() { return Math.max(0, this.tag - this.zeit); }
  get fortschritt() { return Math.max(0, Math.min(1, this.x / this.ziel)); }
  get tempo() { return this.boden ? this.v : Math.hypot(this.vx, this.vy); }
  // Richtung der Bewegung (Bogenmaß, 0 = nach rechts) – für die Grafik
  get winkel() {
    if (this.boden) return Math.atan(this.g.steigung(this.x));
    return Math.atan2(this.vy, Math.max(0.1, this.vx));
  }
  hoeheUeberBoden() { return this.y - this.g.hoehe(this.x); }

  starten() {
    if (this.gestartet) return;
    this.gestartet = true;
    this.v = K.V_START;
  }

  // Ein fester Physikschritt
  schritt(halten) {
    const dt = K.SCHRITT;
    this.halten = !!halten;
    if (!this.gestartet) return;
    if (!this.ergebnis) {
      this.zeit += dt;
      if (this.x >= this.ziel) { this.ergebnis = 'ziel'; this.ereignisse.push({ art: 'ziel' }); }
      else if (this.zeit >= this.tag) { this.zeit = this.tag; this.ergebnis = 'nacht'; this.ereignisse.push({ art: 'nacht' }); }
    }
    // Nach dem Ziel ausrollen, bei Nacht langsam stehen bleiben
    const auslauf = !!this.ergebnis;
    if (auslauf) { this.nachZiel += dt; this.halten = false; }
    if (this.boden) this.bodenSchritt(dt, auslauf);
    else this.luftSchritt(dt);
    this.statistik.vmax = Math.max(this.statistik.vmax, this.tempo);
    if (!this.vorschau) this.rufe.schritt(this, dt);
    if (!this.vorschau) this.sammeln();
  }

  // Muscheln in Reichweite einsammeln. Muscheln sind reine Sensoren: kein Stoß, kein
  // Einfluss auf Bodenkontakt oder Tempo. Kalles Mitte liegt KRABBE_MITTE über den Füßen,
  // senkrecht zu seiner Lage (am Hang also schräg) – wie er gezeichnet wird.
  sammeln() {
    const m = this.muscheln, r = K.MUSCHEL_RADIUS;
    const w = this.winkel;
    const mx = this.x - Math.sin(w) * K.KRABBE_MITTE, my = this.y + Math.cos(w) * K.KRABBE_MITTE;
    while (this.muschelIndex < m.length && m[this.muschelIndex].x < this.x - r * 2) this.muschelIndex++;
    for (let i = this.muschelIndex; i < m.length && m[i].x < this.x + r; i++) {
      const mu = m[i];
      if (mu.weg) continue;
      if (Math.hypot(mu.x - mx, mu.y - my) < r) {
        mu.weg = true;
        this.muschelWert += mu.gold ? K.GOLD_WERT : 1;
        this.ereignisse.push({ art: 'muschel', x: mu.x, y: mu.y, gold: mu.gold });
      }
    }
  }

  bodenSchritt(dt, auslauf) {
    const s = this.g.steigung(this.x);
    const n = Math.sqrt(1 + s * s);
    const cos = 1 / n, sin = s / n;
    const g = K.G * (this.halten ? K.SCHWER_BODEN : K.LEICHT_BODEN);
    let a = -g * sin - K.REIBUNG - K.LUFTWIDERSTAND * this.v * this.v;
    this.v += a * dt;
    if (auslauf) {
      this.v = Math.max(0, this.v - (this.ergebnis === 'nacht' ? 14 : 9) * dt);
    } else {
      // Nie Feststecken: losgelassen krabbelt Kalle zügig zurück aufs Mindesttempo.
      // Wer bergauf schwer bleibt, wird dagegen richtig langsam.
      if (this.halten) this.v = Math.max(K.V_MIN_SCHWER, this.v);
      else if (this.v < K.V_MIN) this.v = Math.min(K.V_MIN, Math.max(K.V_MIN_SCHWER, this.v) + K.KRABBELN * dt);
      this.v = Math.min(K.V_MAX, this.v);
    }
    // Abheben an der Kuppe?
    const y2 = this.g.kruemmung2(this.x);
    const kruemmung = -y2 / (n * n * n);   // > 0 an Kuppen
    if (kruemmung > 0 && this.v * this.v * kruemmung > g * cos * K.ABHEBEN_SCHWELLE && this.v > K.V_MIN + 2) {
      this.boden = false;
      this.vx = this.v * cos;
      this.vy = this.v * sin;
      this.flugzeit = 0;
      this.echterFlug = false;   // erst ab spürbarer Höhe zählt es als Flug
      this.abflugX = this.x;
      this.abflugY = this.y;
      this.abflugV = this.v;
      this.abflugSteig = sin;   // wie steil es nach oben geht (0..1)
      this.maxUeberBoden = 0;
      this.hoechstImFlug = this.y;
      this.luftSchritt(dt);
      return;
    }
    this.x += this.v * cos * dt;
    this.y = this.g.hoehe(this.x);
  }

  luftSchritt(dt) {
    const g = K.G * (this.halten ? K.SCHWER_LUFT : K.LEICHT_LUFT);
    const v = Math.hypot(this.vx, this.vy);
    const w = K.LUFTWIDERSTAND_FLUG * v;
    this.vx -= w * this.vx * dt;
    this.vy -= (g + w * this.vy) * dt;
    if (this.ergebnis) this.vx = Math.max(0, this.vx - 4 * dt);
    const vl = Math.hypot(this.vx, this.vy);
    if (vl > K.V_MAX_LUFT) { this.vx *= K.V_MAX_LUFT / vl; this.vy *= K.V_MAX_LUFT / vl; }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.flugzeit += dt;
    this.hoechstImFlug = Math.max(this.hoechstImFlug, this.y);
    const h = this.g.hoehe(this.x);
    this.maxUeberBoden = Math.max(this.maxUeberBoden, this.y - h);
    if (!this.echterFlug && (this.y - h > 0.35 || this.flugzeit > 0.2)) {
      this.echterFlug = true;
      this.statistik.fluege++;
      this.ereignisse.push({ art: 'abflug', v: this.abflugV, x: this.abflugX, y: this.abflugY, steigt: this.abflugSteig });
    }
    if (this.y <= h) this.landen(h);
  }

  // Landung: Geschwindigkeit in Hangrichtung zerlegen
  landen(h) {
    const s = this.g.steigung(this.x);
    const n = Math.sqrt(1 + s * s);
    const tx = 1 / n, ty = s / n;
    const v = Math.hypot(this.vx, this.vy) || 1;
    const vt = this.vx * tx + this.vy * ty;
    const winkel = Math.acos(Math.max(-1, Math.min(1, vt / v))) * 180 / Math.PI;
    // Aufprall quer zur Oberfläche (Normale zeigt vom Boden weg; der Boden steht still)
    const quer = Math.abs(this.vx * (-s / n) + this.vy * (1 / n));
    let art, neu = Math.max(0, vt);
    const st = this.statistik;
    if (!this.echterFlug) {
      // Nur kurz von der Kuppe abgehoben: still weiterrutschen, kein Ereignis
      this.boden = true;
      this.y = h;
      this.v = this.ergebnis ? neu : Math.max(K.V_MIN, Math.min(K.V_MAX, neu));
      return;
    }
    const weit = this.x - this.abflugX;
    const hoch = this.hoechstImFlug - this.g.hoehe(this.abflugX);
    // Perfekt: auf einer Abfahrt, Richtung passt zur Rampentangente, kaum Aufprall quer zur
    // Oberfläche, nach einem echten Flug (nicht nur über eine Unebenheit gestreift)
    if (s < -K.PERFEKT_MIN_GEFAELLE && winkel < K.PERFEKT_WINKEL && quer < K.PERFEKT_QUER &&
        this.flugzeit > K.PERFEKT_MIN_FLUGZEIT && this.maxUeberBoden > K.PERFEKT_MIN_HOEHE) {
      art = 'perfekt';
      this.kette = Math.min(K.KETTE_MAX, this.kette + 1);
      neu *= 1 + K.PERFEKT_BONUS + K.KETTEN_BONUS * (this.kette - 1);
      st.perfekt++;
      st.kette = Math.max(st.kette, this.kette);
    } else if (winkel < K.GUT_WINKEL || (s < -0.1 && winkel < K.ABHANG_WINKEL)) {
      art = 'gut';
      // Sauber in den Hang gelenkt: fast das ganze Tempo bleibt (nur auf einem Abhang)
      if (s < 0) neu = Math.max(neu, v * (winkel < K.GUT_WINKEL ? K.GUT_ERHALT : K.ABHANG_ERHALT));
      if (this.flugzeit >= K.PERFEKT_MIN_FLUGZEIT) this.kette = 0;
      st.gut++;
    } else {
      art = 'hart';
      this.kette = 0;
      // Je steiler gegen den Hang, desto mehr Bremsung – aber nie ganz stehen bleiben
      const stoss = Math.min(1, (winkel - K.GUT_WINKEL) / 50);
      neu *= K.HART_FAKTOR - 0.18 * stoss;
      st.hart++;
    }
    if (this.flugzeit > 0.3) {
      st.weitester = Math.max(st.weitester, weit);
      st.hoechster = Math.max(st.hoechster, hoch);
    }
    this.boden = true;
    this.y = h;
    this.v = this.ergebnis ? neu : Math.max(K.V_MIN, Math.min(K.V_MAX, neu));
    this.ereignisse.push({ art: 'landung', guete: art, winkel, quer, v: this.v, verlust: v - this.v, x: this.x, y: h, kette: this.kette, flugzeit: this.flugzeit, weit, hoch });
  }
}
