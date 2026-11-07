// Logik-Tests ohne Browser: Physik, Landungen, Strecken, Schaffbarkeit.
// Aufruf: node quelle/test-logik.js   (mit „schnell“ als Argument: ohne die langen Botläufe)
const L = require('./lade-logik.js')();
const { K, STRECKEN, Lauf, Bot, GELAENDE, baueStrecke } = L;
const schnell = process.argv.includes('schnell');
let fehler = 0, geprueft = 0;
const ok = (bed, text) => { geprueft++; if (!bed) { fehler++; console.log('  FEHLER:', text); } };

console.log('## Gelände: stetig, weich, ohne Knick');
for (const d of STRECKEN) {
  const l = new Lauf(d);
  const g = l.g;
  let maxSprung = 0, maxSteig = 0, nan = false;
  // An jedem Stützpunkt: Steigung links und rechts gleich (kein Knick)
  for (const [px] of g.p) maxSprung = Math.max(maxSprung, Math.abs(g.steigung(px - 1e-7) - g.steigung(px + 1e-7)));
  for (let x = -100; x < l.ziel + 300; x += 0.05) {
    const a = g.hoehe(x), b = g.hoehe(x + 0.05);
    const s1 = g.steigung(x), s2 = g.steigung(x + 0.05);
    if (!Number.isFinite(a) || !Number.isFinite(s1)) nan = true;
    maxSteig = Math.max(maxSteig, Math.abs(s1));
    // Steigung passt zur Höhe (numerische Ableitung)
    if (Math.abs((b - a) / 0.05 - (s1 + s2) / 2) > 0.02) { nan = true; }
  }
  ok(!nan, `Strecke ${d.id}: Höhe/Steigung endlich und passend`);
  ok(maxSprung < 1e-4, `Strecke ${d.id}: kein Knick (Steigungssprung ${maxSprung.toExponential(1)})`);
  ok(maxSteig < Math.tan(66 * Math.PI / 180), `Strecke ${d.id}: nicht zu steil (steilste Stelle ${(Math.atan(maxSteig) * 180 / Math.PI).toFixed(0)}°)`);
  // Krümmung stetig (kein Ruck an Übergängen), kurze fast flache Stücke, keine Mini-Wellen, keine Schluchten
  let kSprung = 0;
  for (const [px] of g.p) kSprung = Math.max(kSprung, Math.abs(g.kruemmung2(px - 1e-7) - g.kruemmung2(px + 1e-7)));
  ok(kSprung < 1e-4, `Strecke ${d.id}: Krümmung an allen Übergängen stetig (Sprung ${kSprung.toExponential(1)})`);
  let flach = 0, maxFlach = 0;
  const bau = baueStrecke(d), zielAuslauf = bau.taeler[bau.taeler.length - 1][0] - 30;
  for (let x = 0; x < zielAuslauf; x += 0.25) { if (Math.abs(g.steigung(x)) < GELAENDE.FLACH_STEIGUNG) { flach += 0.25; maxFlach = Math.max(maxFlach, flach); } else flach = 0; }
  ok(maxFlach <= GELAENDE.FLACH_MAX, `Strecke ${d.id}: längstes fast flaches Stück ${maxFlach.toFixed(0)} m (≤ ${GELAENDE.FLACH_MAX})`);
  const innen = g.p.filter(q => q[0] >= 0 && q[0] <= l.ziel);
  let minStufe = Infinity, monoton = true;
  for (let i = 1; i < innen.length; i++) {
    minStufe = Math.min(minStufe, Math.abs(innen[i][1] - innen[i - 1][1]));
    // jedes Stück steigt oder fällt durchgehend (kein Überschwingen, keine versteckte Welle)
    const auf = innen[i][1] > innen[i - 1][1];
    for (let x = innen[i - 1][0] + 0.2; x < innen[i][0] - 0.2; x += 0.4) if ((g.steigung(x) > 1e-9) !== auf && Math.abs(g.steigung(x)) > 1e-9) monoton = false;
  }
  ok(minStufe >= GELAENDE.HOEHE_MIN - 0.01, `Strecke ${d.id}: keine Mini-Wellen (kleinste Stufe ${minStufe.toFixed(1)} m)`);
  ok(monoton, `Strecke ${d.id}: jedes Hügelstück steigt oder fällt ohne Zwischenwelle`);
  const taeler = innen.filter((q, i) => i > 0 && i < innen.length - 1 && q[1] < innen[i - 1][1] && q[1] < innen[i + 1][1]);
  ok(taeler.every(q => q[1] > -GELAENDE.TAL_SPIELRAUM - GELAENDE.HOEHE_MIN), `Strecke ${d.id}: keine extrem tiefen Täler`);
  ok(l.ziel > d.laenge - 80 && l.ziel < d.laenge + 120, `Strecke ${d.id}: Ziel bei ${l.ziel.toFixed(0)} m passt zur Länge`);
  ok(Math.abs(g.steigung(l.ziel)) < 0.01 && Math.abs(g.steigung(l.ziel + 200)) < 0.01, `Strecke ${d.id}: flacher Strand hinter dem Ziel`);
  // gleiche Saat → gleiche Strecke
  const l2 = new Lauf(d);
  ok(l2.g.p.length === g.p.length && l2.g.p.every((q, i) => q[0] === g.p[i][0] && q[1] === g.p[i][1]), `Strecke ${d.id}: immer gleich gebaut`);
}

console.log('## Landungen bei jedem Tempo und Winkel');
{
  const d = STRECKEN[6];
  let schlecht = 0, faelle = 0, bonusZuGross = 0, hartNichtLangsamer = 0, perfektGesehen = 0, hartGesehen = 0;
  for (let x = 40; x < 1200; x += 7.3) {
    for (const v of [8, 25, 45, 70]) {
      for (let w = -80; w <= 30; w += 10) {
        const l = new Lauf(d);
        l.starten();
        l.x = x; l.boden = false; l.echterFlug = true; l.flugzeit = 1;
        const r = w * Math.PI / 180;
        l.vx = Math.max(1, v * Math.cos(r)); l.vy = v * Math.sin(r);
        l.y = l.g.hoehe(x) + 0.5;
        const vorher = Math.hypot(l.vx, l.vy);
        let t = 0;
        while (!l.boden && t < 12) { l.schritt(false); t += K.SCHRITT; }
        faelle++;
        const e = l.ereignisse.find(e => e.art === 'landung');
        if (!l.boden || !e) { schlecht++; continue; }
        if (!(l.y >= l.g.hoehe(l.x) - 1e-9) || !Number.isFinite(l.v) || l.v < K.V_MIN - 1e-9 || l.v > K.V_MAX + 1e-9) schlecht++;
        const vLand = Math.hypot(l.vx, l.vy) || vorher;
        if (e.guete === 'perfekt') { perfektGesehen++; if (l.v > Math.max(K.V_MIN, vLand * (1 + K.PERFEKT_BONUS + 0.001)) + 0.5) bonusZuGross++; }
        if (e.guete === 'hart') { hartGesehen++; if (l.v > vLand * 0.85 && l.v > K.V_MIN + 0.01) hartNichtLangsamer++; }
        // Nach der Landung: 2 s weiterlaufen ohne Durchfallen/Steckenbleiben
        // Losgelassen: kommt voran. Gehalten: darf bremsen, steht aber nie still.
        const k2 = Bot.kopie(l);
        let xAlt = l.x;
        for (let i = 0; i < 480; i++) { l.schritt(false); if (l.y < l.g.hoehe(l.x) - 1e-6) { schlecht++; break; } }
        if (l.x <= xAlt + 5) schlecht++;
        let xk = k2.x, still = 0;
        for (let i = 0; i < 480; i++) { k2.schritt(true); if (k2.y < k2.g.hoehe(k2.x) - 1e-6) { schlecht++; break; } if (k2.x <= xk + 1e-6) still++; xk = k2.x; }
        if (still > 0) schlecht++;
      }
    }
  }
  ok(schlecht === 0, `${faelle} Landungen: nie unter dem Boden, immer gelandet, nie stecken (Probleme: ${schlecht})`);
  ok(perfektGesehen > 20 && hartGesehen > 20, `perfekte (${perfektGesehen}) und harte (${hartGesehen}) Landungen kommen vor`);
  ok(bonusZuGross === 0, 'Perfekt-Bonus bleibt moderat (≤ 5 % bei erster Landung)');
  ok(hartNichtLangsamer === 0, 'Harte Landung am Gegenhang bremst spürbar');
}

console.log('## Muscheln');
{
  const frisch = require('./lade-logik.js')({ ohneMuscheldatei: true });
  for (const d of STRECKEN) {
    const gespeichert = new Lauf(d).muscheln;
    const neu = frisch.berechneMuscheln(d, new frisch.Lauf(d, { ohneMuscheln: true }));
    const gleich = gespeichert.length === neu.length && gespeichert.every((m, i) => Math.abs(m.x - neu[i].x) < 0.06 && Math.abs(m.y - neu[i].y) < 0.06 && m.gold === neu[i].gold);
    ok(gleich, `Strecke ${d.id}: gespeicherte Muscheln passen zur Physik (sonst: node quelle/werkzeug-muscheln.js)`);
    const l = new Lauf(d);
    const unter = l.muscheln.filter(m => m.y < l.g.hoehe(m.x) + 0.5).length;
    ok(unter === 0 && l.muscheln.length >= 15, `Strecke ${d.id}: ${l.muscheln.length} Muscheln, keine im Boden`);
    const a = Bot.spiele(d, 'gut').lauf.muschelWert, b = Bot.spiele(d, 'gut').lauf.muschelWert;
    ok(a === b && a > 0, `Strecke ${d.id}: Sammeln ist reproduzierbar (${a} Wert)`);
    // Neustart: Muscheln sind wieder da
    ok(new Lauf(d).muscheln.every(m => !m.weg), `Strecke ${d.id}: Neustart bringt alle Muscheln zurück`);
  }
}

console.log('## Muschel-Linien folgen der Rampe');
{
  const { MUSCHEL_LINIEN: ML } = L;
  for (const d of STRECKEN) {
    const l = new Lauf(d), g = l.g;
    let abstandFalsch = 0, nichtBergab = 0, schlechterAbstand = 0, linienGanz = 0, linien = 0, hochZuviel = 0;
    const gruppen = {};
    for (const m of l.muscheln) (gruppen[m.linie] = gruppen[m.linie] || []).push(m);
    for (const gr of Object.values(gruppen)) {
      linien++;
      for (const m of gr) {
        // kürzester Abstand zur Kurve ≈ MUSCHEL_HOEHE (also entlang der Normalen), Fuß auf echtem Gefälle
        let best = Infinity, fx = m.x;
        for (let x = m.x - 4; x <= m.x + 4; x += 0.02) { const dd = Math.hypot(m.x - x, m.y - g.hoehe(x)); if (dd < best) { best = dd; fx = x; } }
        if (Math.abs(best - K.MUSCHEL_HOEHE) > 0.06) abstandFalsch++;
        if (-g.steigung(fx) < ML.MIN_STEIGUNG - 0.02) nichtBergab++;
      }
      for (let i = 1; i < gr.length; i++) { const dd = Math.hypot(gr[i].x - gr[i - 1].x, gr[i].y - gr[i - 1].y); if (Math.abs(dd - ML.ABSTAND) > 0.6) schlechterAbstand++; }
      // Ein Kalle, der sauber auf der Rampe gleitet, sammelt die ganze Linie ein
      const k = new Lauf(d); k.starten(); k.tag = 999;
      k.x = gr[0].x - 8; k.y = k.g.hoehe(k.x); k.boden = true; k.v = 35;
      let t = 0; while (k.x < gr[gr.length - 1].x + 3 && t < 10) { k.schritt(false); t += K.SCHRITT; if (!k.boden) { k.boden = true; k.y = k.g.hoehe(k.x); } }
      if (gr.every(m => k.muscheln.find(q => q.x === m.x).weg)) linienGanz++;
      // Wer 4 m zu hoch drüberfliegt, verpasst einen Teil
      const f = new Lauf(d); f.starten(); f.tag = 999; f.vorschau = false;
      let hoch = 0;
      for (const m of gr) { f.x = m.x; f.y = f.g.hoehe(m.x) + 4.5; f.boden = false; f.vx = 30; f.vy = 0; f.sammeln(); }
      hoch = gr.filter(m => f.muscheln.find(q => q.x === m.x).weg).length;
      if (hoch > gr.length / 2) hochZuviel++;
    }
    ok(abstandFalsch === 0, `Strecke ${d.id}: alle Muscheln ${K.MUSCHEL_HOEHE} m über dem Hang (entlang der Normalen)`);
    ok(nichtBergab === 0, `Strecke ${d.id}: Muscheln liegen nur über echten Abfahrten`);
    ok(schlechterAbstand === 0, `Strecke ${d.id}: gleichmäßige Abstände entlang der Kurve`);
    ok(linien >= 3 && linienGanz === linien, `Strecke ${d.id}: gleitend wird jede der ${linien} Linien ganz eingesammelt (${linienGanz})`);
    ok(hochZuviel === 0, `Strecke ${d.id}: 4 m zu hoch drüber verpasst den Großteil`);
    const gut = Bot.spiele(d, 'gut').lauf;
    ok(gut.muschelWert >= gut.muschelGesamt * 0.75, `Strecke ${d.id}: guter Lauf mit sauberen Landungen sammelt fast alles (${gut.muschelWert}/${gut.muschelGesamt})`);
  }
}

console.log('## Perfekte Landung ist physikalisch begründet');
{
  const d = STRECKEN[3];
  const l0 = new Lauf(d);
  const bau = baueStrecke(d);
  const kuppe = bau.kuppen[3], tal = bau.taeler.find(t => t[0] > kuppe[0]);
  const xm = kuppe[0] + (tal[0] - kuppe[0]) * 0.5;
  const landung = (winkelDaneben, tempo, maxHoehe, flugzeit) => {
    const l = new Lauf(d); l.starten(); l.tag = 999;
    const s = l.g.steigung(xm), w = Math.atan(s) - winkelDaneben * Math.PI / 180;
    l.x = xm; l.boden = false; l.echterFlug = true; l.flugzeit = flugzeit; l.maxUeberBoden = maxHoehe;
    l.vx = tempo * Math.cos(w); l.vy = tempo * Math.sin(w); l.y = l.g.hoehe(xm) + 0.05;
    for (let i = 0; i < 60 && !l.boden; i++) l.schritt(false);
    const e = l.ereignisse.find(e => e.art === 'landung');
    return e ? e.guete : 'keine';
  };
  ok(landung(5, 60, 8, 1.5) === 'perfekt', 'tangential auf der Abfahrt gelandet → perfekt');
  ok(landung(18, 60, 8, 1.5) === 'perfekt', 'leicht steiler (18°), bei 60 m/s → noch perfekt (freundlich)');
  ok(landung(40, 60, 8, 1.5) !== 'perfekt', 'steil auf die Abfahrt (40°) → nicht perfekt');
  ok(landung(5, 60, 0.6, 1.5) !== 'perfekt', 'nur über eine Unebenheit gestreift → nicht perfekt');
  ok(landung(5, 60, 8, 0.15) !== 'perfekt', 'zu kurzer Flug → nicht perfekt');
  let perf = 0;
  for (const dd of STRECKEN) { const st = Bot.spiele(dd, 'gut').stat; perf += st.perfekt; }
  ok(perf >= 24, `gute Läufe landen öfter perfekt (zusammen ${perf} auf 12 Strecken)`);
}

console.log('## Flugrufe: Juhu und Yippie');
{
  const { Flugrufe } = L, R = K.RUF;
  // Kleiner Testflug: Kalle startet bei (0, 0) mit vx/vy, Schwerkraft wie losgelassen; Boden weit unten
  function flug(fr, zeit0, vx, vy, { dauer = 6, halten = false } = {}) {
    const l = { boden: false, echterFlug: true, abflugX: 0, abflugY: 0, abflugV: Math.hypot(vx, vy), abflugSteig: vy / Math.hypot(vx, vy),
      flugzeit: 0, x: 0, y: 0, vx, vy, zeit: zeit0, ergebnis: null, ereignisse: [] };
    const g = K.G * (halten ? K.SCHWER_LUFT : K.LEICHT_LUFT);
    const rufe = [];
    for (let t = 0; t < dauer && l.y >= -0.01; t += K.SCHRITT) {
      l.vy -= g * K.SCHRITT; l.x += l.vx * K.SCHRITT; l.y += l.vy * K.SCHRITT; l.flugzeit += K.SCHRITT; l.zeit += K.SCHRITT;
      fr.schritt(l, K.SCHRITT);
      for (const e of l.ereignisse) rufe.push([e.ruf, l.zeit]);
      l.ereignisse.length = 0;
    }
    return { rufe, l };
  }
  function boden(fr, l, dauer) { l.boden = true; for (let t = 0; t < dauer; t += K.SCHRITT) { l.zeit += K.SCHRITT; fr.schritt(l, K.SCHRITT); } }
  let fr = new Flugrufe();
  ok(flug(fr, 0, 30, 8).rufe.length === 0, 'kleiner Hüpfer (bis ~1 m) → still');
  fr = new Flugrufe();
  ok(flug(fr, 0, 40, 18).rufe.length === 0, 'flacher Rampenkontakt (bis ~7 m) → still');
  fr = new Flugrufe();
  ok(flug(fr, 0, 40, 30).rufe.length === 0, 'mittelhoher Hüpfer (~19 m) → noch still');
  fr = new Flugrufe();
  const mittel = flug(fr, 0, 30, 38).rufe;
  ok(mittel.length === 1 && mittel[0][0] === 'juhu', `mittlerer schöner Flug (~30 m) → genau ein Juhu (${mittel.map(r => r[0])})`);
  fr = new Flugrufe();
  const gross = flug(fr, 0, 55, 58).rufe;
  ok(gross.some(r => r[0] === 'yippie') && gross.filter(r => r[0] === 'juhu').length <= 1 && gross.filter(r => r[0] === 'yippie').length === 1, `hoher Flug (~70 m) → Yippie, höchstens ein Juhu davor (${gross.map(r => r[0])})`);
  if (gross.length === 2) ok(gross[1][1] - gross[0][1] >= R.STEIGERUNG - 1e-9, 'Steigerung Juhu → Yippie überlagert sich nicht');
  fr = new Flugrufe();
  const sofort = flug(fr, 0, 60, 75).rufe;
  ok(sofort.length === 1 && sofort[0][0] === 'yippie', `sofort spektakulär → direkt Yippie, kein Juhu (${sofort.map(r => r[0])})`);
  fr = new Flugrufe();
  const weit = flug(fr, 0, 112, 16).rufe;
  ok(weit.length === 1 && weit[0][0] === 'yippie', `sehr weiter flacher Flug (>${R.YIPPIE_WEITE} m) → Yippie (${weit.map(r => r[0])})`);
  // Schnelle Folge: zweiter Flug kurz nach dem ersten Ruf → kein zweiter Ruf
  fr = new Flugrufe();
  const a1 = flug(fr, 0, 30, 38, { dauer: 1.3 });
  boden(fr, a1.l, R.BODEN_RUHE + 0.01);
  const a2 = flug(fr, a1.l.zeit, 30, 38, { dauer: 1.0 });
  ok(a1.rufe.length === 1 && a2.rufe.length === 0, 'zweiter Flug innerhalb des Mindestabstands bleibt still (und wird nicht nachgeholt)');
  boden(fr, a2.l, 2);
  const a3 = flug(fr, a2.l.zeit, 30, 38);
  ok(a3.rufe.length === 1, 'nach genug Abstand und stabiler Landung ruft Kalle wieder');
  // Kurzer Aufsetzer: gilt als derselbe Flug → kein neues Juhu
  fr = new Flugrufe();
  const b1 = flug(fr, 0, 30, 38, { dauer: 1.2 });
  boden(fr, b1.l, 0.1);
  const b2 = flug(fr, b1.l.zeit + 3, 30, 38, { dauer: 1.2 });
  ok(b1.rufe.length === 1 && b2.rufe.length === 0, 'kurzer Aufsetzer (unter BODEN_RUHE) startet keinen neuen Flug');
  // In allen echten Läufen: pro Flug höchstens 1 Juhu + 1 Yippie, Abstände eingehalten, kleine Flüge still
  let fehlerPro = 0, fehlerAbstand = 0, kleineMitRuf = 0, juhuGesamt = 0, yippieGesamt = 0, fluege = 0;
  for (const dd of STRECKEN) for (const art of ['gut', 'mittel', 'einfach']) {
    let imFlug = [], letzte = null, maxH = 0, startY = 0;
    Bot.spiele(dd, art, 3, { beiSchritt: (l) => {
      if (!l.boden && l.echterFlug) { if (!imFlug.flug) { imFlug = []; imFlug.flug = true; startY = l.abflugY; maxH = 0; fluege++; } maxH = Math.max(maxH, l.y - startY); }
      for (const e of l.ereignisse) if (e.art === 'ruf') {
        imFlug.push(e.ruf); if (e.ruf === 'juhu') juhuGesamt++; else yippieGesamt++;
        if (letzte !== null) { const d2 = l.zeit - letzte.zeit; if (d2 < (letzte.flug === imFlug ? R.STEIGERUNG : R.ABSTAND) - 1e-9) fehlerAbstand++; }
        letzte = { zeit: l.zeit, flug: imFlug };
      }
      if (l.rufe.imFlug === false && imFlug.flug) {
        if (imFlug.filter(r => r === 'juhu').length > 1 || imFlug.filter(r => r === 'yippie').length > 1) fehlerPro++;
        if (maxH < 8 && imFlug.length) kleineMitRuf++;
        imFlug = [];
      }
    } });
  }
  ok(fehlerPro === 0, 'in echten Läufen pro Flug höchstens ein Juhu und ein Yippie');
  ok(fehlerAbstand === 0, 'in echten Läufen Mindestabstände zwischen Rufen eingehalten');
  ok(kleineMitRuf === 0, 'in echten Läufen bleiben kleine Flüge (< 8 m) still');
  ok(juhuGesamt > yippieGesamt && yippieGesamt > 0, `Juhu häufiger als Yippie (${juhuGesamt} Juhu, ${yippieGesamt} Yippie bei ${fluege} Flügen)`);
}

console.log('## Doppeltes Spieltempo');
{
  ok(K.TEMPO === 2, `Spieltempo ×${K.TEMPO}`);
  // Gleiche Flugsituation: echte Dauer halbiert, Bahn identisch
  const flug = (tempo) => {
    const alt = K.TEMPO; K.TEMPO = tempo;
    const l = new Lauf(STRECKEN[4]); l.starten(); l.tag = 999;
    const bau = baueStrecke(STRECKEN[4]), kuppe = bau.kuppen[4];
    l.x = kuppe[0] - 2; l.boden = false; l.echterFlug = true; l.vx = 55; l.vy = 25; l.y = l.g.hoehe(l.x) + 0.5;
    let maxY = l.y, n = 0;
    while (!l.boden && n++ < 100000) { l.schritt(false); maxY = Math.max(maxY, l.y); }
    K.TEMPO = alt;
    return { zeit: l.zeit, x: l.x, maxY };
  };
  const a1 = flug(1), a2 = flug(2);
  ok(Math.abs(a2.zeit / a1.zeit - 0.5) < 0.01, `gleicher Flug dauert halb so lange (${a1.zeit.toFixed(2)} s → ${a2.zeit.toFixed(2)} s)`);
  ok(Math.abs(a2.x - a1.x) < 1e-6 && Math.abs(a2.maxY - a1.maxY) < 1e-6, 'Flugbahn, Gipfel und Landestelle bleiben exakt gleich (Landungen und Sammelreihen passen weiter)');
  const steigen = (tempo) => { const alt = K.TEMPO; K.TEMPO = tempo; const l = new Lauf(STRECKEN[0]); l.starten(); l.tag = 999; l.x = 100; l.boden = false; l.echterFlug = true; l.vx = 30; l.vy = 40; l.y = l.g.hoehe(100) + 50; while (l.vy > 0) l.schritt(false); K.TEMPO = alt; return l.zeit; };
  ok(steigen(2) < steigen(1) * 0.51, `Aufstieg bis zum Gipfel doppelt so schnell (${steigen(1).toFixed(2)} s → ${steigen(2).toFixed(2)} s)`);
  // Pro Physikschritt bewegt sich Kalle höchstens so weit wie vorher – kein Durchdringen
  ok(K.V_MAX_LUFT * K.SCHRITT < 0.5, `Weg pro Physikschritt höchstens ${(K.V_MAX_LUFT * K.SCHRITT).toFixed(2)} m (Gelände ist eine Höhenfunktion, jeder Schritt wird geprüft)`);
}

console.log('## Endlosflug');
{
  const { ENDLOS_DEF } = L, E = K.ENDLOS;
  const def = (saat) => Object.assign({}, ENDLOS_DEF, { saat });
  // Frischer Lauf
  const f0 = new Lauf(def(7));
  ok(f0.rest === E.START && f0.strecke === 0 && f0.punkte === 0 && f0.zeit === 0 && f0.muscheln.every(m => !m.weg), 'Neuer Lauf: volles Start-Tageslicht, Strecke/Punkte 0');
  ok(f0.g.ende >= E.VORLAUF, `Gelände ist ${Math.round(f0.g.ende)} m voraus gebaut`);
  // Deterministisch
  const kurz = (saat, art) => { const l = new Lauf(def(saat)); const b = Bot.neu(art, saat); l.starten(); for (let i = 0; i < 240 * 20; i++) l.schritt(b.halten(l)); return l.x.toFixed(6) + '|' + l.punkte; };
  ok(kurz(3, 'gut') === kurz(3, 'gut'), 'gleiche Saat → gleicher Lauf');
  ok(kurz(3, 'gut') !== kurz(4, 'gut'), 'andere Saat → andere Landschaft');
  // Lange Läufe mit verschiedenen Spielern und Saaten
  const ergebnisse = {};
  for (const art of ['gut', 'mittel', 'einfach', 'nie']) for (const saat of [1, 2, 3]) {
    const l = new Lauf(def(saat)); const b = Bot.neu(art, saat); l.starten();
    let unter = 0, steht = 0, standZeit = 0, letzteX = -1e9, nacht = 0, marken = [], lichtEv = 0, perfektEv = 0, perfektBonus = 0, ueberMax = 0;
    let maxPunkte = 0, maxMuscheln = 0, kSprung = 0, flach = 0, maxFlach = 0, flachX = 0, abstandFalsch = 0, nichtBergab = 0, geprueft = new Set();
    let n = 0;
    while (n++ < 240 * 60 * 30) {
      const vorher = l.ergebnis;
      l.schritt(b.halten(l));
      if (l.y < l.g.hoehe(l.x) - 1e-6) unter++;
      if (!l.ergebnis) { if (l.x <= letzteX + 1e-4) { standZeit += K.SCHRITT; if (standZeit > 0.5) steht++; } else standZeit = 0; }
      letzteX = l.x;
      if (l.licht > E.MAX + 1e-9) ueberMax++;
      for (const e of l.ereignisse) {
        if (e.art === 'nacht') nacht++;
        if (e.art === 'marke') marken.push(e.x);
        if (e.art === 'licht') { lichtEv++; if (e.grund === 'perfekt') perfektBonus++; }
        if (e.art === 'landung' && e.guete === 'perfekt' && !vorher) perfektEv++;
      }
      l.ereignisse.length = 0;
      maxPunkte = Math.max(maxPunkte, l.g.n); maxMuscheln = Math.max(maxMuscheln, l.muscheln.length);
      // Gelände direkt hinter und vor Kalle: Anschlüsse glatt, keine langen Flachstücke
      if (n % 240 === 0) {
        for (const [px] of l.g.p) if (px > l.x - 50 && px < l.g.ende - 1 && !geprueft.has(px)) {
          kSprung = Math.max(kSprung, Math.abs(l.g.kruemmung2(px - 1e-7) - l.g.kruemmung2(px + 1e-7)), Math.abs(l.g.steigung(px - 1e-7) - l.g.steigung(px + 1e-7)));
          geprueft.add(px);
        }
        for (const m of l.muscheln) if (!m.geprueft) {
          m.geprueft = true;
          let best = Infinity, fx = m.x;
          for (let x = m.x - 4; x <= m.x + 4; x += 0.05) { const dd = Math.hypot(m.x - x, m.y - l.g.hoehe(x)); if (dd < best) { best = dd; fx = x; } }
          if (Math.abs(best - K.MUSCHEL_HOEHE) > 0.08) abstandFalsch++;
          if (-l.g.steigung(fx) < L.MUSCHEL_LINIEN.MIN_STEIGUNG - 0.03) nichtBergab++;
        }
      }
      if (l.boden && l.x > 30 && Math.abs(l.g.steigung(l.x)) < GELAENDE.FLACH_STEIGUNG) { flach += l.x - flachX; } else flach = 0;
      flachX = l.x;
      maxFlach = Math.max(maxFlach, flach);
      if (l.ergebnis && vorher) break;
    }
    const name = `${art}/${saat}`;
    ok(unter === 0 && steht === 0, `${name}: nie im Boden, nie stecken`);
    ok(nacht === 1 && l.ergebnis === 'nacht', `${name}: Lauf endet genau einmal bei Sonnenuntergang`);
    ok(marken.every((x, i) => i === 0 || x > marken[i - 1]) && marken.length === l.markeNr && new Set(marken).size === marken.length, `${name}: jede Distanzmarke gibt genau einmal Tageslicht (${marken.length} Marken)`);
    ok(perfektBonus === perfektEv, `${name}: jede perfekte Landung gibt genau einmal Tageslicht (${perfektEv})`);
    ok(ueberMax === 0, `${name}: Tageslicht nie über dem Vorrat (${E.MAX} s)`);
    ok(kSprung < 1e-4, `${name}: Geländeabschnitte schließen glatt aneinander an (Sprung ${kSprung.toExponential(1)})`);
    ok(maxFlach <= GELAENDE.FLACH_MAX, `${name}: längste fast flache Rutschstrecke am Boden ${maxFlach.toFixed(0)} m`);
    ok(maxPunkte < 80 && maxMuscheln < 150, `${name}: Speicher bleibt klein (${maxPunkte} Geländepunkte, ${maxMuscheln} Muscheln)`);
    ok(abstandFalsch === 0 && nichtBergab === 0, `${name}: Muscheln liegen ${K.MUSCHEL_HOEHE} m über echten Abfahrten`);
    (ergebnisse[art] = ergebnisse[art] || []).push({ zeit: l.zeit, strecke: l.strecke, punkte: l.punkte, perfekt: l.statistik.perfekt });
  }
  const mittelWert = (art, k) => ergebnisse[art].reduce((s, e) => s + e[k], 0) / ergebnisse[art].length;
  const z = (art) => mittelWert(art, 'zeit');
  console.log('  Mittlere Laufdauer (echte s): ' + ['nie', 'einfach', 'mittel', 'gut'].map(a => `${a} ${z(a).toFixed(0)} s / ${Math.round(mittelWert(a, 'strecke'))} m`).join(', '));
  ok(z('nie') < z('einfach') && z('einfach') < z('mittel') && z('mittel') < z('gut'), 'besser spielen = länger fliegen (nie < einfach < mittel < gut)');
  ok(z('nie') < 45, `wer nie drückt, ist schnell im Dunkeln (${z('nie').toFixed(0)} s)`);
  ok(z('mittel') > 50 && z('mittel') < 150, `normales Spiel: ${z('mittel').toFixed(0)} s – füllt die Zeit nicht unbegrenzt auf`);
  ok(z('gut') < 400, `auch sehr gutes Spiel endet irgendwann (${z('gut').toFixed(0)} s)`);
  ok(mittelWert('gut', 'perfekt') > mittelWert('mittel', 'perfekt') * 2, 'gute Landungen machen den Unterschied (deutlich mehr perfekte Landungen)');
}

console.log('## Abheben hängt von Tempo und Halten ab');
{
  const d = STRECKEN[1];
  const l0 = new Lauf(d);
  const kuppe = l0.g.p.find((q, i) => i > 2 && i % 2 === 1);   // eine Kuppe
  const probe = (v, halten) => {
    const l = new Lauf(d); l.starten(); l.x = kuppe[0] - 12; l.y = l.g.hoehe(l.x); l.v = v;
    for (let i = 0; i < 240; i++) { l.schritt(halten); if (!l.boden && l.echterFlug) return true; if (l.x > kuppe[0] + 15) break; }
    return false;
  };
  ok(probe(40, false), 'schnell und losgelassen: fliegt über die Kuppe');
  ok(!probe(10, false), 'langsam: bleibt am Boden');
  ok(probe(40, false) && !probe(24, true) , 'gehalten bleibt Kalle bei mittlerem Tempo am Boden (schwer)');
}

console.log('## Schwer machen wirkt richtig');
{
  const d = STRECKEN[1];
  const l0 = new Lauf(d);
  const p = l0.g.p;
  const kuppe = p[3], tal = p[4];
  const bergab = (h) => { const l = new Lauf(d); l.starten(); l.x = kuppe[0] + 1; l.y = l.g.hoehe(l.x); l.v = 10; while (l.x < tal[0]) l.schritt(h); return l.v; };
  ok(bergab(true) > bergab(false) + 3, `bergab gehalten schneller (${bergab(true).toFixed(1)} gegen ${bergab(false).toFixed(1)})`);
  const bergauf = (h) => { const l = new Lauf(d); l.starten(); l.x = tal[0] + 1; l.y = l.g.hoehe(l.x); l.v = 30; let i = 0; while (l.boden && l.x < p[5][0] - 8 && i++ < 2000) l.schritt(h); return l.v; };
  ok(bergauf(false) > bergauf(true) + 2, `bergauf losgelassen behält mehr Schwung (${bergauf(false).toFixed(1)} gegen ${bergauf(true).toFixed(1)})`);
}

console.log('## Gleiches Ergebnis, egal wie viele Schritte je Bild');
{
  const d = STRECKEN[3];
  const lauf = (stueck) => {
    const l = new Lauf(d); const b = Bot.neu('gut'); l.starten();
    let schritte = 0;
    while (!l.ergebnis && schritte < 240 * 20) { for (let i = 0; i < stueck && !l.ergebnis; i++) { l.schritt(b.halten(l)); schritte++; } }
    return l.x.toFixed(6) + '|' + l.y.toFixed(6);
  };
  ok(lauf(1) === lauf(4) && lauf(4) === lauf(8), '30, 60 und 240 Hz liefern denselben Lauf');
}

console.log('## Pausen ohne Start: Sonne wartet');
{
  const l = new Lauf(STRECKEN[0]);
  for (let i = 0; i < 2400; i++) l.schritt(false);
  ok(l.zeit === 0 && l.x === l.def ? true : l.zeit === 0, 'vor dem ersten Drücken läuft keine Zeit');
}

if (!schnell) {
  console.log('## Schaffbarkeit jeder Strecke (Testbots)');
  let vorher = 0;
  for (const d of STRECKEN) {
    // Kein Durchfallen, kein Stillstand im ganzen Lauf
    let unter = 0, steht = 0, letzteX = -1e9, standZeit = 0;
    const g = Bot.spiele(d, 'gut', 1, { beiSchritt: (l) => {
      if (l.y < l.g.hoehe(l.x) - 1e-6) unter++;
      if (l.x <= letzteX + 1e-4) { standZeit += K.SCHRITT; if (standZeit > 0.3) steht++; } else standZeit = 0;
      letzteX = l.x;
    } });
    ok(unter === 0 && steht === 0, `Strecke ${d.id}: nie im Boden, nie stecken`);
    const ms = [1, 2, 3, 4, 5].map(s => Bot.spiele(d, 'mittel', s).zeit || 999);
    const bester = Math.min(g.zeit || 999, ...ms);
    ok(bester <= d.sterne[1] + 0.01, `Strecke ${d.id}: 3 Sterne sind erreichbar (bester Botlauf ${bester.toFixed(1)} s ≤ ${d.sterne[1]})`);
    ok(d.sterne[1] >= bester, `Strecke ${d.id}: 3 Sterne nicht schneller als jeder Bot (${d.sterne[1]})`);
    const geschafft = ms.filter(z => z <= d.zeit).length;
    ok(geschafft >= 3, `Strecke ${d.id}: mittlerer Bot (Reaktionszeit 0,11 s, Fehler) schafft es in ${geschafft} von 5 Läufen`);
    if (d.id <= 3) { const anf = Bot.spiele(d, 'einfach', 2).zeit; ok(anf && anf <= d.zeit, `Strecke ${d.id}: auch ein Anfänger (bergab halten, beim Fallen halten) schafft sie (${anf && anf.toFixed(1)} s)`); }
    const nie = Bot.spiele(d, 'nie').zeit;
    ok(!nie || nie > d.zeit, `Strecke ${d.id}: ohne Drücken nicht zu schaffen`);
    if (!d.lern) { const immer = Bot.spiele(d, 'immer').zeit; ok(!immer || immer > d.zeit, `Strecke ${d.id}: dauernd Drücken reicht nicht`); }
    ok(d.sterne[1] < d.sterne[0] && d.sterne[0] < d.zeit, `Strecke ${d.id}: Sternzeiten sinnvoll`);
    // Druck steigt: Zeitpuffer gegenüber dem guten Bot wird kleiner
    const puffer = d.zeit / g.zeit;
    if (d.id > 2) ok(puffer <= vorher + 0.08, `Strecke ${d.id}: Zeitpuffer ${puffer.toFixed(2)} nicht größer als davor (${vorher.toFixed(2)})`);
    vorher = puffer;
    console.log(`  ${d.id} ${d.name}: gut ${g.zeit.toFixed(1)} s, mittel ${ms.map(z => z.toFixed(0)).join('/')}, Tageslicht ${d.zeit} s, Puffer ×${puffer.toFixed(2)}`);
  }
}

console.log(`\n${geprueft - fehler} von ${geprueft} Prüfungen bestanden.`);
process.exit(fehler ? 1 : 0);
