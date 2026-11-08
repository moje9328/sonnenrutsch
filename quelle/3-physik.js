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

// Sprungflächen einer Strecke aus der vorab berechneten Planung (2b-muscheln.js). Jeder Lauf bekommt eigene Kopien.
const MATTEN_PLAN = {};   // Werkzeuge und Tests können hier eine Planung vorgeben (hat Vorrang)
function mattenFuer(def) {
  const t = MATTEN_PLAN[def.id] || (typeof MATTEN !== 'undefined' && MATTEN[def.id]);
  return t ? t.map(([x0, x1, kraft]) => ({ x0, x1, kraft })) : [];
}

class Lauf {
  constructor(def, { ohneMuscheln = false, gelaende = null, matten = null, bahnMerken = false } = {}) {
    this.def = def;
    let s;
    if (gelaende) {
      // Testpilot im Endlosflug: fährt auf dem gemeinsamen, wachsenden Gelände
      s = { gelaende, ziel: Infinity, hinweise: [], start: { x: -6 } };
    } else if (def.endlos) {
      this.endlos = new Endlos(def.saat);
      s = { gelaende: this.endlos.g, ziel: Infinity, hinweise: [], start: { x: -6 } };
    } else s = baueStrecke(def);
    this.g = s.gelaende;
    this.ziel = s.ziel;
    this.hinweise = s.hinweise;
    this.x = s.start.x;
    this.y = this.g.hoehe(this.x);
    this.v = 0;
    this.vx = 0; this.vy = 0;
    this.boden = true;
    this.gestartet = false;
    this.zeit = 0;                 // verstrichene Spielzeit (echte Sekunden)
    this.sinkflug = 0;             // 0..1: wie weit der Sinkflug gerade wirkt (weicher Anlauf)
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
    this.muscheln = ohneMuscheln || gelaende ? [] : this.endlos ? this.endlos.muscheln : legeMuscheln(def, this);
    this.muschelIndex = 0;         // erste noch nicht vorbeigezogene Muschel
    this.muschelWert = 0;          // gesammelt (gold zählt mehr)
    this.muschelGesamt = this.muscheln.reduce((s, m) => s + (m.alt ? 0 : m.gold ? K.GOLD_WERT : 1), 0);   // die niedrige Alternativlinie zählt nicht extra
    this.vorschau = false;         // Bot-Vorschau: sammelt nichts ein
    // Sprungflächen: Strecken laden sie aus der Planung, der Endlosflug teilt eine wachsende Liste
    this.matten = matten || (this.endlos ? this.endlos.matten : mattenFuer(def));
    this.matteSperre = null;       // Fläche, von der Kalle gerade abgesprungen ist (erst nach Verlassen wieder frei)
    this.matteKontakt = new Map(); // Fläche → Spielzeit des letzten Kontakts (für die Feder-Animation)
    this.bahnMerken = bahnMerken;  // Planung: Flugbahnen aufzeichnen
    this.bahn = [];
    this.bonusPunkte = 0;          // Reihen-, Kombo- und Supersprung-Bonus
    this.kombo = 0; this.komboZeit = -1e9;
    this.maxUeberBoden = 0;        // größte Höhe über dem Boden im aktuellen Flug
    this.rufe = new Flugrufe();    // bewertet Flüge → „Juhu!“ / „Yippie!“
    if (this.endlos) {
      this.tag = K.ENDLOS.MAX;     // Bezugsgröße für Anzeige und Himmel
      this.licht = K.ENDLOS.START; // verbleibendes Tageslicht (echte Sekunden)
      this.markeNr = 0;
      this.markeVorher = 0;
      this.marke = K.ENDLOS.MARKE_ERSTE;
      this.lichtBonus = 0;         // insgesamt gewonnenes Tageslicht
      this.endlos.pflege(this);
    }
  }

  get rest() { return this.endlos ? Math.max(0, this.licht) : Math.max(0, this.tag - this.zeit); }
  // Level: Anteil der Strecke. Endlos: Anteil bis zur nächsten Distanzmarke
  get fortschritt() {
    if (this.endlos) return Math.max(0, Math.min(1, (this.x - this.markeVorher) / (this.marke - this.markeVorher)));
    return Math.max(0, Math.min(1, this.x / this.ziel));
  }
  get strecke() { return Math.max(0, this.x); }
  get punkte() { return this.muschelWert * K.ENDLOS.PUNKTE_MUSCHEL + this.statistik.perfekt * K.ENDLOS.PUNKTE_PERFEKT + this.bonusPunkte; }
  // Tempo-Anstieg 0..1 mit der Strecke (weich): Strecken bis zum Ziel, Endlosflug über TEMPO.WEG
  get tempoGrad() {
    const t = Math.max(0, Math.min(1, this.x / (Number.isFinite(this.ziel) ? this.ziel : K.TEMPO.WEG)));
    return t * t * (3 - 2 * t);
  }
  // Ein Erfolg (perfekte Landung, volle Reihe, Sprungfläche): läuft die Kombo, gibt es begrenzten Bonus
  erfolg(x, y) {
    const P = K.PUNKTE;
    if (this.zeit - this.komboZeit > P.KOMBO_FENSTER) this.kombo = 0;
    this.kombo = Math.min(P.KOMBO_MAX, this.kombo + 1);
    this.komboZeit = this.zeit;
    if (this.kombo >= 2) {
      const plus = P.KOMBO_SCHRITT * (this.kombo - 1);
      this.bonusPunkte += plus;
      this.ereignisse.push({ art: 'kombo', stufe: this.kombo, plus, x, y });
    }
  }
  // Tageslicht gewinnen (Endlos), nie über den Vorrat hinaus
  lichtGewinn(plus, grund) {
    const vorher = this.licht;
    this.licht = Math.min(K.ENDLOS.MAX, this.licht + plus);
    this.lichtBonus += this.licht - vorher;
    this.ereignisse.push({ art: 'licht', plus: this.licht - vorher, grund, x: this.x, y: this.y });
  }
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
    this.v = K.V_START;   // 0: Kalle steht, bis gedrückt wird
  }

  // Ein fester Physikschritt
  schritt(halten) {
    const dt = K.SCHRITT;
    this.halten = !!halten;
    if (!this.gestartet) return;
    const sp = this.matteSperre;
    if (sp && (this.x < sp.x0 - K.MATTE.SPERRE || this.x > sp.x1 + K.MATTE.SPERRE)) this.matteSperre = null;   // eindeutig verlassen
    if (!this.ergebnis) {
      this.zeit += dt;
      if (this.endlos) {
        // Tageslicht läuft nur während aktiver Physikschritte ab (Pause/Tabwechsel: keine Schritte)
        this.licht -= dt;
        if (this.x >= this.marke) {
          this.markeNr++;
          this.ereignisse.push({ art: 'marke', nr: this.markeNr, x: this.marke });
          this.lichtGewinn(K.ENDLOS.MARKE_BONUS, 'marke');
          this.markeVorher = this.marke;
          this.marke += K.ENDLOS.MARKE_ERSTE + K.ENDLOS.MARKE_WACHSTUM * this.markeNr;
        }
        if (this.licht <= 0) { this.licht = 0; this.ergebnis = 'nacht'; this.ereignisse.push({ art: 'nacht' }); }
      } else if (this.x >= this.ziel) { this.ergebnis = 'ziel'; this.ereignisse.push({ art: 'ziel' }); }
      else if (this.zeit >= this.tag) { this.zeit = this.tag; this.ergebnis = 'nacht'; this.ereignisse.push({ art: 'nacht' }); }
    }
    // Nach dem Ziel ausrollen, bei Nacht langsam stehen bleiben
    const auslauf = !!this.ergebnis;
    if (auslauf) { this.nachZiel += dt; this.halten = false; }
    if (this.boden) this.bodenSchritt(dt, auslauf);
    else this.luftSchritt(dt);
    this.statistik.vmax = Math.max(this.statistik.vmax, this.tempo);
    if (!this.vorschau) this.rufe.schritt(this, dt);
    if (this.endlos && !this.vorschau) this.endlos.pflege(this);
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
        if (mu.reihe && ++mu.reihe.got === mu.reihe.n && mu.reihe.n >= 3) {
          this.bonusPunkte += K.PUNKTE.REIHE;
          this.ereignisse.push({ art: 'reihe', x: mu.x, y: mu.y, luft: !!mu.luft, n: mu.reihe.n });
          this.erfolg(mu.x, mu.y);
        }
      }
    }
  }

  bodenSchritt(dt, auslauf) {
    const s = this.g.steigung(this.x);
    const n = Math.sqrt(1 + s * s);
    const cos = 1 / n, sin = s / n;
    const tp = this.tempoGrad, vmin = K.V_MIN + K.TEMPO.V_MIN_PLUS * tp;
    const g = K.G * (1 + K.TEMPO.G_PLUS * tp) * (this.halten ? K.SCHWER_BODEN : K.LEICHT_BODEN);
    let a = -g * sin - K.REIBUNG - K.LUFTWIDERSTAND * this.v * this.v;
    const vorher = this.v;
    this.v += a * dt;
    if (auslauf) {
      this.v = Math.max(0, this.v - (this.ergebnis === 'nacht' ? 14 : 9) * dt);
    } else {
      // Kalle läuft nur, solange die Taste gedrückt ist: dann krabbelt er zügig aufs
      // Mindesttempo (nie Feststecken). Losgelassen gibt es keinen eigenen Antrieb –
      // nur Schwung und Gefälle; ohne Schwung bleibt er stehen (rutscht nie rückwärts).
      if (this.halten && this.v < vmin) this.v = Math.max(this.v, Math.min(vmin, Math.max(0, vorher) + K.KRABBELN * dt));
      this.v = Math.max(0, Math.min(K.V_MAX, this.v));
    }
    // Abheben an der Kuppe?
    const y2 = this.g.kruemmung2(this.x);
    const kruemmung = -y2 / (n * n * n);   // > 0 an Kuppen
    if (kruemmung > 0 && this.v * this.v * kruemmung > g * cos * K.ABHEBEN_SCHWELLE && this.v > vmin + 2) {
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
      this.sinkflug = 0;
      this.hoechstImFlug = this.y;
      this.flugArt = 'rampe';
      if (this.bahnMerken) this.bahn = [this.x, this.y];
      this.ereignisse.push({ art: 'absprung' });   // nur für den Planer (Zustand genau beim Absprung)
      this.luftSchritt(dt);
      return;
    }
    this.x += this.v * cos * dt;
    this.y = this.g.hoehe(this.x);
    if (!auslauf && this.matten.length) this.mattePruefen(this.v);
  }

  // ---- Sprungflächen -------------------------------------------------
  padBei(x) {
    for (const m of this.matten) { if (x >= m.x0 && x <= m.x1) return m; if (m.x0 > x) break; }
    return null;
  }
  // Bodenkontakt auf einer Fläche: schnell genug und nicht gesperrt → ein kontrollierter Absprung
  mattePruefen(vt) {
    const m = this.padBei(this.x);
    if (m && m !== this.matteSperre && vt >= K.MATTE.V_MIN && !this.ergebnis) this.matteAusloesen(m, vt);
  }
  // Absprung: Tempo entlang der Oberfläche bleibt (ERHALT), dazu ein Stoß senkrecht zur Oberfläche
  // und ein kleiner Vorwärtsstoß. Gesamttempo und Mindestwinkel sind begrenzt.
  matteAusloesen(m, vt) {
    const M = K.MATTE;
    const s = this.g.steigung(this.x), n = Math.sqrt(1 + s * s);
    const tx = 1 / n, ty = s / n, nx = -s / n, ny = 1 / n;
    const stoss = m.kraft || M.STOSS[1];
    // Stoßrichtung: Oberflächennormale gemischt mit einer festen Vorwärts-/Aufwärtsrichtung
    const rw = M.RICHTUNG * Math.PI / 180;
    let dx = nx * (1 - M.MISCHUNG) + Math.cos(rw) * M.MISCHUNG, dy = ny * (1 - M.MISCHUNG) + Math.sin(rw) * M.MISCHUNG;
    const dl = Math.hypot(dx, dy); dx /= dl; dy /= dl;
    let vx = tx * vt * M.ERHALT + dx * stoss, vy = ty * vt * M.ERHALT + dy * stoss;
    const wMin = M.WINKEL_MIN * Math.PI / 180;
    let sp = Math.hypot(vx, vy);
    if (Math.atan2(vy, vx) < wMin) { vx = sp * Math.cos(wMin); vy = sp * Math.sin(wMin); }
    if (sp > M.V_MAX) { vx *= M.V_MAX / sp; vy *= M.V_MAX / sp; sp = M.V_MAX; }
    // Ein Flug, der auf der Fläche endet, zählt ganz normal (Statistik, Rufe); ein neuer beginnt
    if (!this.boden && this.echterFlug) {
      this.statistik.weitester = Math.max(this.statistik.weitester, this.x - this.abflugX);
      this.statistik.hoechster = Math.max(this.statistik.hoechster, this.hoechstImFlug - this.g.hoehe(this.abflugX));
    }
    this.landungMelden('matte', { winkel: 0, quer: 0, v: sp, verlust: 0 });
    const hMatte = this.g.hoehe(this.x);
    this.boden = false;
    this.vx = vx; this.vy = vy; this.v = 0;
    this.y = hMatte + 0.1;
    this.flugzeit = 0; this.echterFlug = false;
    this.abflugX = this.x; this.abflugY = hMatte; this.abflugV = sp; this.abflugSteig = vy / sp;
    this.maxUeberBoden = 0; this.sinkflug = 0; this.hoechstImFlug = this.y;
    this.flugArt = 'matte';
    if (this.bahnMerken) this.bahn = [this.x, this.y];
    this.matteSperre = m;
    if (!this.vorschau) this.matteKontakt.set(m, this.zeit);
    this.statistik.matten = (this.statistik.matten || 0) + 1;
    this.rufe.imFlug = false; this.rufe.gerufen = null; this.rufe.bodenZeit = 0;   // der Sprung zählt als neuer Flug
    this.ereignisse.push({ art: 'matte', x: this.x, y: hMatte, v: sp, m });
    if (!this.vorschau) this.erfolg(this.x, hMatte);
  }

  luftSchritt(dt) {
    // Sinkflug nur bei gehaltener Taste: weicher Anlauf, beim Loslassen sofort aus.
    // Die Geschwindigkeit selbst ändert sich nie sprunghaft – nur die Kraft.
    this.sinkflug = this.halten ? Math.min(1, this.sinkflug + dt / K.SINKFLUG_ANLAUF) : 0;
    // Hoch über dem Boden zieht die Schwerkraft stetig stärker (weich, ohne Sprung)
    const ueber = this.y - this.g.hoehe(this.x);
    const hochT = Math.max(0, Math.min(1, (ueber - K.HOEHE_SCHWER_AB) / (K.HOEHE_SCHWER_BIS - K.HOEHE_SCHWER_AB)));
    const hochAnteil = hochT * hochT * (3 - 2 * hochT);
    // Beim Sinken zieht die Schwerkraft weich stärker (nach dem Gipfel: sinkend zügig, nie ein Ruck)
    const fallT = Math.max(0, Math.min(1, -this.vy / K.FALL_ANLAUF)), fall = 1 + K.FALL_EXTRA * fallT * fallT * (3 - 2 * fallT);
    const g = K.G_LUFT * fall * (1 + K.TEMPO.LUFT_PLUS * this.tempoGrad) * (1 + K.HOEHE_SCHWER_EXTRA * hochAnteil) * (1 + (K.SCHWER_LUFT - 1) * this.sinkflug);
    // Steiler Steigflug wird nach dem Absprung weich nach vorn gelenkt (gleiches Tempo,
    // mehr davon nach vorn) – hohe Flüge kommen so zügig voran statt fast senkrecht zu schweben
    if (this.vy > 0) {
      const wMax = K.FLUG_WINKEL_MAX * Math.PI / 180, wJetzt = Math.atan2(this.vy, this.vx);
      if (wJetzt > wMax) {
        // Lenken proportional zum Überschuss-Winkel, setzt über LENKEN_ANLAUF s weich ein (kein Ruck)
        const t = Math.min(1, this.flugzeit / K.LENKEN_ANLAUF), weich = t * t * (3 - 2 * t);
        const neu = wJetzt - (wJetzt - wMax) * Math.min(1, K.LENKEN_STAERKE * weich * dt), vb = Math.hypot(this.vx, this.vy);
        this.vx = vb * Math.cos(neu); this.vy = vb * Math.sin(neu);
      }
    }
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
    if (this.bahnMerken && ((this.flugzeit / dt + 0.5) | 0) % 10 === 0) this.bahn.push(this.x, this.y);
    const h = this.g.hoehe(this.x);
    this.maxUeberBoden = Math.max(this.maxUeberBoden, this.y - h);
    if (!this.echterFlug && (this.y - h > 0.35 || this.flugzeit > 0.15)) {
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
    // Landung auf einer Sprungfläche: kein Aufsetzen, sondern gleich der nächste Absprung
    if (this.matten.length && !this.ergebnis && this.echterFlug) {
      const m = this.padBei(this.x);
      if (m && m !== this.matteSperre && vt >= K.MATTE.V_MIN) { this.matteAusloesen(m, vt); return; }
    }
    if (!this.echterFlug) {
      // Nur kurz von der Kuppe abgehoben: still weiterrutschen, kein Ereignis
      this.boden = true;
      this.y = h;
      this.v = this.ergebnis ? neu : Math.min(K.V_MAX, neu);
      return;
    }
    const weit = this.x - this.abflugX;
    const hoch = this.hoechstImFlug - this.g.hoehe(this.abflugX);
    // Perfekt: auf einer Abfahrt, Richtung passt zur Rampentangente, kaum Aufprall quer zur
    // Oberfläche, nach einem echten Flug (nicht nur über eine Unebenheit gestreift)
    if (s < -K.PERFEKT_MIN_GEFAELLE && winkel < K.PERFEKT_WINKEL && quer < Math.max(K.PERFEKT_QUER, K.PERFEKT_QUER_ANTEIL * v) &&
        this.flugzeit > K.PERFEKT_MIN_FLUGZEIT && this.maxUeberBoden > K.PERFEKT_MIN_HOEHE) {
      art = 'perfekt';
      this.kette = Math.min(K.KETTE_MAX, this.kette + 1);
      neu *= 1 + K.PERFEKT_BONUS + K.KETTEN_BONUS * (this.kette - 1);
      st.perfekt++;
      st.kette = Math.max(st.kette, this.kette);
      if (this.endlos && !this.ergebnis && !this.vorschau) this.lichtGewinn(K.ENDLOS.PERFEKT_BONUS, 'perfekt');
      if (!this.vorschau) this.erfolg(this.x, h);
    } else if (winkel < K.GUT_WINKEL || (s < -0.1 && winkel < K.ABHANG_WINKEL)) {
      art = 'gut';
      // Sauber in den Hang gelenkt: fast das ganze Tempo bleibt (nur auf einem Abhang)
      if (s < 0) neu = Math.max(neu, v * (winkel < K.GUT_WINKEL ? K.GUT_ERHALT : K.ABHANG_ERHALT));
      if (this.flugzeit >= K.PERFEKT_MIN_FLUGZEIT) this.kette = 0;
      st.gut++;
    } else {
      art = 'hart';
      this.kette = 0;
      this.kombo = 0;
      // Je steiler gegen den Hang, desto mehr Bremsung – aber nie ganz stehen bleiben
      const stoss = Math.min(1, (winkel - K.GUT_WINKEL) / 50);
      neu *= K.HART_FAKTOR - 0.18 * stoss;
      st.hart++;
    }
    if (this.flugzeit > 0.3) {
      st.weitester = Math.max(st.weitester, weit);
      st.hoechster = Math.max(st.hoechster, hoch);
    }
    const vNeu = this.ergebnis ? neu : Math.min(K.V_MAX, neu);
    this.landungMelden(art, { winkel, quer, v: vNeu, verlust: v - vNeu });
    this.boden = true;
    this.y = h;
    this.v = vNeu;
  }

  // Ereignis „Flug beendet“ (auch wenn er auf einer Sprungfläche endet). Muss vor dem Umschalten
  // auf Boden aufgerufen werden, weil es den laufenden Flug beschreibt.
  landungMelden(art, d) {
    if (this.boden || !this.echterFlug) return;
    const weit = this.x - this.abflugX, hoch = this.hoechstImFlug - this.g.hoehe(this.abflugX), gipfel = this.hoechstImFlug - this.abflugY;
    const h = this.g.hoehe(this.x);
    if (this.bahnMerken) this.bahn.push(this.x, Math.max(this.y, h));
    // Supersprung: sehr hoher Flug, sauber beendet
    if (!this.vorschau && art !== 'hart' && gipfel >= K.PUNKTE.SUPER_GIPFEL) {
      this.bonusPunkte += K.PUNKTE.SUPERSPRUNG;
      this.ereignisse.push({ art: 'super', x: this.x, y: h, gipfel });
    }
    this.ereignisse.push({ art: 'landung', guete: art, winkel: d.winkel, quer: d.quer, v: d.v, verlust: d.verlust, x: this.x, y: h, kette: this.kette, flugzeit: this.flugzeit, weit, hoch, gipfel, flugArt: this.flugArt, abX: this.abflugX, abY: this.abflugY, bahn: this.bahnMerken ? this.bahn.slice() : null });
  }
}
