// ===================================================================
// BOT · spielt eine Strecke mit derselben Ein-Tasten-Eingabe wie ein Mensch.
// Wird von den Tests benutzt (Schaffbarkeit, Zeitlimits) und im Spiel für
// die Vorführung im Startbildschirm.
// art: 'gut'   – schaut voraus, wo er landet, und entscheidet dann
//      'mittel'– wie 'gut', aber mit Reaktionszeit und kleinen Fehlern
//      'schnell' – sparsamer Rechner für die Vorführung im Menü
//      'einfach' – Anfänger: bergab und beim Fallen halten
//      'nie' / 'immer' – drückt nie bzw. immer
// ===================================================================
const Bot = (() => {
  // Kopie des Laufs für die Vorschau (Gelände wird geteilt)
  function kopie(l) {
    const k = Object.create(Lauf.prototype);
    Object.assign(k, l);
    k.ereignisse = [];
    k.statistik = Object.assign({}, l.statistik);
    k.vorschau = true;   // Vorschau darf keine Muscheln einsammeln
    return k;
  }
  // Fliegt mit fester Haltung bis zur Landung; Ergebnis: Tempo danach
  function landeTempo(l, halten, maxT = 6) {
    const k = kopie(l);
    let t = 0;
    while (!k.boden && t < maxT) { k.schritt(halten); t += K.SCHRITT; }
    // Kurz weiterrutschen, damit „schnell aber gegen den Hang“ nicht gewinnt
    for (let i = 0; i < 24 && k.boden; i++) k.schritt(false);
    return k.tempo + (k.x - l.x) * 0.002;
  }
  // Bodenregel des Bots: bergab halten, kurz vor dem Anstieg loslassen
  function bodenRegel(l, vorlauf) {
    const s = l.g.steigung(l.x);
    const voraus = l.g.steigung(l.x + l.v * (0.08 + vorlauf));
    return s < -0.02 && voraus < 0.05;
  }
  // Wie weit kommt Kalle in fester Zeit, wenn er jetzt hält / loslässt?
  // (danach: in der Luft nicht halten, am Boden die Bodenregel)
  function reichweite(l, halten, dauer = 3) {
    const k = kopie(l);
    let t = 0;
    while (t < dauer) {
      const h = !k.boden ? halten : bodenRegel(k, 0);
      if (k.boden) halten = false;
      k.schritt(h); t += K.SCHRITT;
    }
    return k.x + k.tempo * 0.6;
  }
  function neu(art, saat = 1) {
    const r = zufall(saat);
    const verzoegerung = art === 'mittel' ? Math.round(0.11 / K.SCHRITT) : 0;   // 0,11 s Reaktionszeit
    const schlange = [];
    let entscheidung = false, naechste = 0, schritte = 0;
    const vorlauf = art === 'mittel' ? 0.05 : 0.0;
    return {
      art,
      letzte: false,
      // Liefert „gedrückt?“ für den nächsten Physikschritt
      halten(l) {
        schritte++;
        if (art === 'nie') return false;
        if (art === 'immer') return true;
        // 'einfach': so spielt ein Anfänger – bergab halten, beim Fallen halten
        if (art === 'einfach') { const h = l.boden ? l.g.steigung(l.x) < 0 : l.vy < 0; this.letzte = h; return h; }
        if (schritte >= naechste) {
          naechste = schritte + 6;   // alle 1/40 s neu nachdenken
          if (l.boden) entscheidung = bodenRegel(l, vorlauf);
          else if (art === 'schnell') entscheidung = landeTempo(l, true) > landeTempo(l, false) + 0.05;
          else entscheidung = reichweite(l, true) > reichweite(l, false) + 0.05;
          if (art === 'mittel' && r() < 0.06) entscheidung = !entscheidung;
        }
        let aus = entscheidung;
        if (verzoegerung) { schlange.push(entscheidung); aus = schlange.length > verzoegerung ? schlange.shift() : false; }
        this.letzte = aus;
        return aus;
      },
    };
  }
  // Ganze Strecke spielen; liefert Zeit (oder null) und Statistik
  function spiele(def, art, saat = 1, { maxZeit = 400, beiSchritt } = {}) {
    const l = new Lauf(def);
    const b = neu(art, saat);
    l.starten();
    const tagAlt = l.tag;
    l.tag = maxZeit;   // ohne Zeitlimit messen
    while (!l.ergebnis) { l.schritt(b.halten(l)); if (beiSchritt) beiSchritt(l); l.ereignisse.length = 0; }
    const zeit = l.ergebnis === 'ziel' ? l.zeit : null;
    l.tag = tagAlt;
    return { zeit, lauf: l, stat: l.statistik };
  }
  return { neu, spiele, kopie };
})();
