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
  ok(l.ziel > d.laenge * GELAENDE.LAENGE - 80 && l.ziel < d.laenge * GELAENDE.LAENGE + 160, `Strecke ${d.id}: Ziel bei ${l.ziel.toFixed(0)} m passt zur Länge`);
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
        if (!(l.y >= l.g.hoehe(l.x) - 1e-9) || !Number.isFinite(l.v) || l.v < -1e-9 || l.v > K.V_MAX + 1e-9) schlecht++;
        const vLand = Math.hypot(l.vx, l.vy) || vorher;
        if (e.guete === 'perfekt') { perfektGesehen++; if (l.v > Math.max(K.V_MIN, vLand * (1 + K.PERFEKT_BONUS + 0.001)) + 0.5) bonusZuGross++; }
        if (e.guete === 'hart') { hartGesehen++; if (l.v > vLand * 0.85 && l.v > K.V_MIN + 0.01) hartNichtLangsamer++; }
        // Nach der Landung: 2 s weiterlaufen ohne Durchfallen/Steckenbleiben
        // Losgelassen: kein eigener Antrieb, darf stehen bleiben, rollt aber nie zurück.
        // Gehalten: krabbelt immer voran, steht nie still.
        const k2 = Bot.kopie(l);
        let xAlt = l.x;
        for (let i = 0; i < 480; i++) { l.schritt(false); if (l.y < l.g.hoehe(l.x) - 1e-6) { schlecht++; break; } }
        if (l.x < xAlt - 1e-6) schlecht++;
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
    const plan = frisch.planeStrecke(d);
    frisch.MATTEN_PLAN[d.id] = plan.matten.map(m => [m.x0, m.x1, m.kraft]);
    const neu = require('./muschel-probe.js')(frisch, d, plan.luft).muscheln;
    const gleich = gespeichert.length === neu.length && gespeichert.every((m, i) => Math.abs(m.x - neu[i].x) < 0.06 && Math.abs(m.y - neu[i].y) < 0.06 && m.gold === neu[i].gold && !!m.luft === !!neu[i].luft);
    ok(gleich, `Strecke ${d.id}: gespeicherte Muscheln passen zur Physik (sonst: node quelle/werkzeug-muscheln.js)`);
    const gesp = new Lauf(d).matten;
    ok(gesp.length === plan.matten.length && gesp.every((m, i) => Math.abs(m.x0 - plan.matten[i].x0) < 0.02 && m.kraft === plan.matten[i].kraft), `Strecke ${d.id}: gespeicherte Sprungflächen passen zur Physik`);
    const l = new Lauf(d);
    const unter = l.muscheln.filter(m => m.y < l.g.hoehe(m.x) + 0.5).length;
    ok(unter === 0 && l.muscheln.length >= 15, `Strecke ${d.id}: ${l.muscheln.length} Muscheln, keine im Boden`);
    const a = Bot.spiele(d, 'mittel').lauf.muschelWert, b = Bot.spiele(d, 'mittel').lauf.muschelWert;
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
    for (const m of l.muscheln) if (!m.luft) (gruppen[m.linie] = gruppen[m.linie] || []).push(m);   // Luft-Reihen: eigener Abschnitt
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
    // Jede Linie liegt dort, wo gutes oder mittleres Spiel landet – und wird dort auch eingesammelt
    const gut = Bot.spiele(d, 'gut').lauf, mittel = Bot.spiele(d, 'mittel').lauf;
    const eingesammelt = (lauf, nr) => { const g = lauf.muscheln.filter(m => m.linie === nr); return g.filter(m => m.weg).length / g.length; };
    const linienNr = [...new Set(l.muscheln.filter(m => !m.luft).map(m => m.linie))];
    const erreicht = linienNr.filter(nr => Math.max(eingesammelt(gut, nr), eingesammelt(mittel, nr)) >= 0.7).length;
    ok(erreicht === linienNr.length, `Strecke ${d.id}: jede Linie wird von gutem oder mittlerem Spiel großteils eingesammelt (${erreicht}/${linienNr.length})`);
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
    const g = K.G_LUFT * (halten ? K.SCHWER_LUFT : 1);
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
  ok(flug(fr, 0, 40, 60).rufe.length === 0, 'mittelhoher Flug (~40 m) → still');
  fr = new Flugrufe();
  ok(flug(fr, 0, 40, 89).rufe.length === 0, 'normaler schöner Sprung (~90 m hoch, kurz) → still');
  fr = new Flugrufe();
  ok(flug(fr, 0, 20, 120).rufe.length === 0, 'sehr hoch, aber nicht weit → still');
  fr = new Flugrufe();
  ok(flug(fr, 0, 160, 50).rufe.length === 0, 'sehr weit, aber flach → still');
  fr = new Flugrufe();
  const gross = flug(fr, 0, 100, 90).rufe;
  ok(gross.length === 1 && gross[0][0] === 'juhu', `richtig hoch (~92 m) und weit → genau ein Juhu (${gross.map(r => r[0])})`);
  fr = new Flugrufe();
  const riesig = flug(fr, 0, 100, 130).rufe;
  ok(riesig.length === 1 && riesig[0][0] === 'yippie', `riesiger Flug (~190 m) → genau ein Yippie, kein Juhu (${riesig.map(r => r[0])})`);
  // Schnelle Folge: zweiter großer Flug kurz nach dem ersten Ruf → kein zweiter Ruf
  fr = new Flugrufe();
  const a1 = flug(fr, 0, 100, 90, { dauer: 3.5 });
  boden(fr, a1.l, R.BODEN_RUHE + 0.01);
  const a2 = flug(fr, a1.l.zeit, 100, 90, { dauer: 3.5 });
  ok(a1.rufe.length === 1 && a2.rufe.length === 0, 'zweiter großer Flug innerhalb des Mindestabstands bleibt still (und wird nicht nachgeholt)');
  boden(fr, a2.l, R.ABSTAND);
  const a3 = flug(fr, a2.l.zeit, 100, 90);
  ok(a3.rufe.length === 1, 'nach genug Abstand und stabiler Landung ruft Kalle wieder');
  // Kurzer Aufsetzer: gilt als derselbe Flug → kein zweiter Ruf
  fr = new Flugrufe();
  const b1 = flug(fr, 0, 100, 90, { dauer: 3.5 });
  boden(fr, b1.l, 0.1);
  const b2 = flug(fr, b1.l.zeit + 30, 100, 90, { dauer: 3.5 });
  ok(b1.rufe.length === 1 && b2.rufe.length === 0, 'kurzer Aufsetzer (unter BODEN_RUHE) startet keinen neuen Flug');
  // In allen echten Läufen: pro Flug höchstens 1 Ruf, Abstände eingehalten, kleine Flüge still, selten
  let fehlerPro = 0, fehlerAbstand = 0, kleineMitRuf = 0, juhuGesamt = 0, yippieGesamt = 0, fluege = 0, spielzeit = 0;
  for (const dd of STRECKEN) for (const art of ['gut', 'mittel', 'einfach']) {
    let imFlug = [], letzte = null, maxH = 0, startY = 0;
    const erg = Bot.spiele(dd, art, 3, { beiSchritt: (l) => {
      if (!l.boden && l.echterFlug) { if (!imFlug.flug) { imFlug = []; imFlug.flug = true; startY = l.abflugY; maxH = 0; fluege++; } maxH = Math.max(maxH, l.y - startY); }
      for (const e of l.ereignisse) if (e.art === 'ruf') {
        imFlug.push(e.ruf); if (e.ruf === 'juhu') juhuGesamt++; else yippieGesamt++;
        if (letzte !== null && l.zeit - letzte < R.ABSTAND - 1e-9) fehlerAbstand++;
        letzte = l.zeit;
      }
      if (l.rufe.imFlug === false && imFlug.flug) {
        if (imFlug.length > 1) fehlerPro++;
        if (maxH < R.HOEHE && imFlug.length) kleineMitRuf++;
        imFlug = [];
      }
    } });
    spielzeit += erg.zeit || 0;
  }
  const proMin = (juhuGesamt + yippieGesamt) / spielzeit * 60;
  ok(fehlerPro === 0, 'in echten Läufen pro Flug höchstens ein Ruf');
  ok(fehlerAbstand === 0, 'in echten Läufen Mindestabstände zwischen Rufen eingehalten');
  ok(kleineMitRuf === 0, `in echten Läufen bleiben Flüge unter ${R.HOEHE} m still`);
  ok(juhuGesamt > yippieGesamt && yippieGesamt > 0 && proMin < 3, `selten und besonders: ${juhuGesamt} Juhu, ${yippieGesamt} Yippie bei ${fluege} Flügen (${proMin.toFixed(1)} Rufe/min)`);
}

console.log('## Geschmeidige Flugphysik (Vergleichsversuche auf derselben Rampe)');
{
  const vergleich = require('./vergleich.js');
  const r = vergleich([95, 115, 135, 155]);
  for (const x of r) console.log(`  Anfahrt ${x.v0} m/s: Flugzeit ${x.flugzeit.toFixed(2)} s, Gipfel ${x.gipfel.toFixed(0)} m, Weite ${x.weite.toFixed(0)} m`);
  ok(r.every(x => x.abgehoben), 'alle Anfahrten heben an der Rampe ab');
  ok(r.every((x, i) => i === 0 || (x.weite > r[i - 1].weite && x.gipfel > r[i - 1].gipfel && x.flugzeit > r[i - 1].flugzeit)), 'schnellerer Absprung → höher, weiter und länger in der Luft');
  ok(r.every(x => Math.abs(x.winkelAb - r[0].winkelAb) < 6), 'vergleichbarer Absprungwinkel (Rampentangente bleibt erhalten)');
  ok(r.every(x => x.ruckAmScheitel < 1), `kein Ruck: Beschleunigung ändert sich im Flug höchstens ${Math.max(...r.map(x => x.ruckAmScheitel)).toFixed(2)} m/s² pro Schritt (< 2 % der Schwerkraft)`);
  const hoch = r[r.length - 1];
  ok(hoch.flugzeit < 4 && hoch.weite / hoch.flugzeit > 90, `hoher Flug schwebt nicht: ${hoch.flugzeit.toFixed(2)} s in der Luft, vorwärts ${(hoch.weite / hoch.flugzeit).toFixed(0)} m/s (vorher 4,73 s, 83 m/s)`);
  ok(r[0].flugzeit > 2 && r[0].gipfel > 20, `kein „Stein“: schon der langsamste Flug dauert ${r[0].flugzeit.toFixed(1)} s`);
  // Fallzeit aus 30 m (losgelassen): geschmeidig, aber nicht schwerelos
  const fall = Math.sqrt(2 * 30 / (K.G_LUFT * (1 + K.FALL_EXTRA * 0.6)));   // mit dem weichen Fall-Zusatz
  ok(fall > 1 && fall < 1.6, `Fall aus 30 m dauert ${fall.toFixed(2)} s (vorher 0,79 s)`);
  // Sinkflug nur bei gehaltener Taste, endet sofort, Geschwindigkeit springt nie
  const l = new Lauf(STRECKEN[4]); l.starten(); l.tag = 999;
  l.x = 500; l.boden = false; l.echterFlug = true; l.flugzeit = 2; l.vx = 80; l.vy = -10; l.y = l.g.hoehe(500) + 300;
  const fallF = (vy) => { const t = Math.max(0, Math.min(1, -vy / K.FALL_ANLAUF)); return 1 + K.FALL_EXTRA * t * t * (3 - 2 * t); };
  const gBasis = K.G_LUFT * (1 + K.TEMPO.LUFT_PLUS * l.tempoGrad) * (1 + K.HOEHE_SCHWER_EXTRA);   // weit über dem Boden zieht die Schwerkraft stärker
  let gHoch = gBasis * fallF(l.vy);
  const ay = (halten) => { const v0 = l.vy; l.schritt(halten); return (l.vy - v0) / K.SCHRITT; };
  const frei = ay(false);
  const gFrei = gHoch;
  let vyVor = l.vy;
  let maxSprungV = 0, vAlt = Math.hypot(l.vx, l.vy), a = 0;
  for (let i = 0; i < 0.3 / K.SCHRITT; i++) { vyVor = l.vy; a = ay(true); const v = Math.hypot(l.vx, l.vy); maxSprungV = Math.max(maxSprungV, Math.abs(v - vAlt)); vAlt = v; }
  const vyLos = l.vy, losgelassen = ay(false);
  gHoch = gBasis * fallF(vyVor);
  ok(Math.abs(frei + gFrei) < 2, `losgelassen hoch oben: Luftschwerkraft ${(-frei).toFixed(0)} m/s²`);
  ok(Math.abs(a + gHoch * K.SCHWER_LUFT) < 4, `gehalten: Sinkflug ${(-a).toFixed(0)} m/s²`);
  ok(Math.abs(losgelassen + gBasis * fallF(vyLos)) < 5, 'nach dem Loslassen endet die Zusatzkraft sofort');
  ok(maxSprungV < gHoch * K.SCHWER_LUFT * K.SCHRITT * 1.2, 'Geschwindigkeit bleibt beim Sinkflug stetig (kein Sprung)');
  ok(K.V_MAX_LUFT * K.SCHRITT < 1, `Weg pro Physikschritt höchstens ${(K.V_MAX_LUFT * K.SCHRITT).toFixed(2)} m (jeder Schritt wird gegen den Boden geprüft)`);
}

console.log('## Sprungflächen (Hafenpolster)');
{
  const M = K.MATTE;
  let gesamt = 0;
  const alle = [];
  for (const d of STRECKEN) {
    const l = new Lauf(d);
    const ms = l.matten;
    gesamt += ms.length;
    ms.forEach(m => alle.push({ d, m }));
    ok(!d.lern || ms.length === 0, `Strecke ${d.id}: Lernstrecke bleibt ohne Sprungflächen`);
    const sortiert = ms.every((m, i) => i === 0 || m.x0 > ms[i - 1].x1 + 100);
    ok(sortiert, `Strecke ${d.id}: wenige Sprungflächen, sortiert und weit auseinander (${ms.length})`);
    ok(ms.every(m => Math.abs(m.x1 - m.x0 - M.BREITE) < 0.01 && M.STOSS.includes(m.kraft)), `Strecke ${d.id}: Breite und Stoßstärke wie konfiguriert`);
    // Auf Rampen mit passender Neigung, nicht auf der Kuppe
    const bau = baueStrecke(d);
    ok(ms.every(m => { for (let x = m.x0; x <= m.x1; x += 1) { const s = l.g.steigung(x); if (s < M.STEIGUNG[0] - 1e-6 || s > M.STEIGUNG[1] + 1e-6) return false; } return !!bau.kuppen.find(k => k[0] > m.x1 + 10); }), `Strecke ${d.id}: jede Fläche liegt auf einer Rampe mit passender Neigung vor einer Kuppe`);
    // Sprungflächen blockieren keine Muscheln und liegen im Gelände (nicht darunter)
    ok(ms.every(m => l.g.hoehe(m.x0) > -50 && m.x0 > 0 && m.x1 < l.ziel), `Strecke ${d.id}: Flächen liegen innerhalb der Strecke`);
  }
  ok(gesamt >= 8, `insgesamt ${gesamt} Sprungflächen auf den 12 Strecken (≥ 8)`);

  // Hilfsfunktion: Kalle rollt mit Tempo v auf die Fläche zu
  const rolle = (d, nr, v, { luft = false, hoehe = 0, vy = 0 } = {}) => {
    const l = new Lauf(d); l.starten(); l.tag = 999;
    const m = l.matten[nr];
    l.x = m.x0 - 6; l.y = l.g.hoehe(l.x);
    if (luft) { l.boden = false; l.y += hoehe; l.vx = v; l.vy = vy; l.echterFlug = true; l.abflugX = l.x - 30; l.abflugY = l.y; l.hoechstImFlug = l.y; l.flugzeit = 1; }
    else { l.boden = true; l.v = v; }
    return { l, m };
  };
  const ersteStrecke = STRECKEN.find(d => new Lauf(d).matten.length > 0);
  const lauefe = (l, bis, halten = false) => {
    const ev = [];
    let t = 0;
    while (t < bis) { l.schritt(halten); t += K.SCHRITT; for (const e of l.ereignisse) ev.push(e); l.ereignisse.length = 0; }
    return ev;
  };
  {
    // Bodenkontakt bei Tempo: genau ein Absprung, Vorwärtsschwung bleibt, Tempo begrenzt
    for (const v of [60, 100, 140]) {
      const { l, m } = rolle(ersteStrecke, 0, v);
      const vor = v;
      const ev = lauefe(l, 0.4);
      const matte = ev.filter(e => e.art === 'matte');
      ok(matte.length === 1, `Tempo ${v}: Überfahren löst genau einen Absprung aus (${matte.length})`);
      ok(matte.length === 1 && matte[0].v <= M.V_MAX + 1e-6, `Tempo ${v}: Gesamttempo nach dem Absprung ${matte[0] ? matte[0].v.toFixed(0) : '–'} ≤ ${M.V_MAX}`);
      ok(!l.boden || l.statistik.matten === 1, `Tempo ${v}: danach in der Luft`);
      ok(l.vx > 0.8 * vor * Math.cos(Math.atan(l.g.steigung(m.x0))) * M.ERHALT, `Tempo ${v}: Vorwärtsschwung bleibt weitgehend erhalten (vx ${l.vx.toFixed(0)})`);
    }
    // Mehr Anflugtempo → weiterer Sprung
    const weite = (v) => { const { l } = rolle(ersteStrecke, 0, v); let t = 0; while (l.boden && t < 2) { l.schritt(false); t += K.SCHRITT; } const x0 = l.x; t = 0; while (!l.boden && t < 6) { l.schritt(false); t += K.SCHRITT; } return l.x - x0; };
    const w1 = weite(70), w2 = weite(110), w3 = weite(150);
    ok(w1 < w2 && w2 < w3, `Mehr Anflugtempo, mehr Reichweite (${w1.toFixed(0)} < ${w2.toFixed(0)} < ${w3.toFixed(0)} m)`);
    // Zu langsam: kein Absprung
    { const { l } = rolle(ersteStrecke, 0, M.V_MIN - 8); const ev = lauefe(l, 0.4); ok(ev.every(e => e.art !== 'matte'), 'zu langsam: die Fläche federt nicht ab'); }
    // Darüberfliegen löst nichts aus
    { const { l, m } = rolle(ersteStrecke, 0, 100, { luft: true, hoehe: 60, vy: 0 }); const ev = []; let t = 0; while (l.x < m.x1 + 15 && t < 3) { l.schritt(false); t += K.SCHRITT; for (const e of l.ereignisse) ev.push(e); l.ereignisse.length = 0; }
      ok(ev.every(e => e.art !== 'matte') && l.statistik.matten === undefined, 'Darüberfliegen löst keinen Sprung aus'); }
    // Landen auf der Fläche löst aus – und endet den Flug als Landung „matte“
    { const { l } = rolle(ersteStrecke, 0, 110, { luft: true, hoehe: 5, vy: -15 }); l.x = l.matten[0].x0 + 2; l.y = l.g.hoehe(l.x) + 5;
      const ev = lauefe(l, 0.6);
      ok(ev.filter(e => e.art === 'matte').length === 1, 'Landen auf der Fläche löst genau einen Sprung aus');
      ok(ev.some(e => e.art === 'landung' && e.guete === 'matte'), 'der Flug endet als Landung „matte“'); }
    // Kein mehrfaches Auslösen durch mehrere Kontaktmeldungen; erst nach Verlassen wieder frei
    { const { l, m } = rolle(ersteStrecke, 0, 100); lauefe(l, 0.25);
      ok(l.matteSperre === m, 'nach dem Absprung ist die Fläche gesperrt');
      let n = 0; for (let i = 0; i < 50; i++) { l.boden = true; l.y = l.g.hoehe(l.x); l.v = 100; l.x = (m.x0 + m.x1) / 2; const vorher = l.statistik.matten; l.schritt(false); n += l.statistik.matten - vorher; l.ereignisse.length = 0; }
      ok(n === 0, 'erneuter Kontakt auf der gesperrten Fläche löst nichts aus (50 Versuche)');
      l.boden = true; l.x = m.x1 + M.SPERRE + 2; l.y = l.g.hoehe(l.x); l.v = 100; l.schritt(false);
      ok(l.matteSperre === null, 'weit genug weg: Sperre aufgehoben');
      l.x = m.x0 + 3; l.y = l.g.hoehe(l.x); l.boden = true; l.v = 100; const vorher = l.statistik.matten; l.schritt(false);
      ok(l.statistik.matten === vorher + 1, 'neuer gültiger Kontakt löst wieder aus'); }
    // Absprung ist über Bildraten gleich (feste Physikschritte): zweimal gleich
    { const a = rolle(ersteStrecke, 0, 100), b = rolle(ersteStrecke, 0, 100); lauefe(a.l, 2); lauefe(b.l, 2); ok(a.l.x === b.l.x && a.l.y === b.l.y, 'Absprung und Flug sind reproduzierbar'); }
  }
  // Mit den Testbots: Nach jedem Sprung von einer Fläche landet gutes Spiel nicht hart; Flächen werden benutzt
  let benutzt = 0, hart = 0, sprueche = 0;
  for (const d of STRECKEN) {
    if (!new Lauf(d).matten.length) continue;
    const l = new Lauf(d), b = Bot.neu('gut'); l.starten(); l.tag = 999;
    let nachMatte = false, n = 0;
    while (!l.ergebnis && n++ < 240 * 400) {
      l.schritt(b.halten(l));
      for (const e of l.ereignisse) {
        if (e.art === 'matte') { benutzt++; nachMatte = true; }
        else if (e.art === 'landung' && nachMatte && e.guete !== 'matte') { nachMatte = false; sprueche++; if (e.guete === 'hart') hart++; }
      }
      l.ereignisse.length = 0;
    }
  }
  ok(benutzt >= 6, `gutes Spiel nutzt die Sprungflächen (${benutzt} Sprünge)`);
  ok(hart === 0 && sprueche > 0, `nach Sprungflächen landet gutes Spiel nie hart (${sprueche} Landungen, ${hart} hart)`);
}

console.log('## Luft-Sammelreihen');
{
  const LF = K.LUFT;
  let reihenGesamt = 0, altGesamt = 0, bonusGesamt = 0;
  for (const d of STRECKEN) {
    const l = new Lauf(d);
    const luft = l.muscheln.filter(m => m.luft);
    const gruppen = {};
    for (const m of luft) (gruppen[m.linie] = gruppen[m.linie] || []).push(m);
    const nrn = Object.keys(gruppen);
    ok(!d.lern || nrn.length === 0, `Strecke ${d.id}: Lernstrecke bleibt frei von Luft-Reihen`);
    let imBoden = 0, abstandFalsch = 0, kurz = 0;
    for (const gr of Object.values(gruppen)) {
      if (gr.length < 4) kurz++;
      for (const m of gr) if (m.y - l.g.hoehe(m.x) < LF.ABSTAND_BODEN_MATTE - 0.05) imBoden++;
      for (let i = 1; i < gr.length; i++) { const dd = Math.hypot(gr[i].x - gr[i - 1].x, gr[i].y - gr[i - 1].y); if (Math.abs(dd - LF.ABSTAND) > 1.2) abstandFalsch++; }
    }
    ok(imBoden === 0, `Strecke ${d.id}: keine Luft-Muschel im oder knapp über dem Boden`);
    ok(abstandFalsch === 0 && kurz === 0, `Strecke ${d.id}: Luft-Reihen mit gleichmäßigem Abstand (${LF.ABSTAND} m) und mindestens 4 Muscheln`);
    // Erreichbarkeit: gutes Spiel sammelt jede (hohe) Reihe zu ≥ 85 %; die niedrige Alternative mit Halten von Anfang an
    const gut = Bot.spiele(d, 'gut').lauf;
    const anteil = (lauf, nr) => { const g = lauf.muscheln.filter(m => m.linie === nr); return g.filter(m => m.weg).length / g.length; };
    const hoch = nrn.filter(nr => !gruppen[nr][0].alt), alt = nrn.filter(nr => gruppen[nr][0].alt);
    const schlecht = hoch.filter(nr => anteil(gut, Number(nr)) < 0.85).length;
    ok(schlecht === 0, `Strecke ${d.id}: alle ${hoch.length} Luft-Reihen sind vom guten Spiel erreichbar (${schlecht} nicht)`);
    if (alt.length) {
      const bot = Bot.neu('gut'), k = new Lauf(d); k.starten(); k.tag = 999;
      const ziele = alt.map(nr => gruppen[nr][0].abX);
      let n = 0;
      while (!k.ergebnis && n++ < 240 * 400) { let h = bot.halten(k); if (!k.boden && ziele.some(x => Math.abs(x - k.abflugX) < 6)) h = true; k.schritt(h); k.ereignisse.length = 0; }
      const schlecht2 = alt.filter(nr => anteil(k, Number(nr)) < 0.8).length;
      ok(schlecht2 === 0, `Strecke ${d.id}: ${alt.length} niedrige Alternativlinie(n) sind mit Halten von Anfang an erreichbar (${schlecht2} nicht)`);
      // niedrige Linie liegt wirklich tiefer als die hohe
      for (const nr of alt) {
        const tief = gruppen[nr], hochG = gruppen[Number(nr) - 1] || [];
        const mx = tief[Math.floor(tief.length / 2)];
        const nah = hochG.reduce((b, m) => (!b || Math.abs(m.x - mx.x) < Math.abs(b.x - mx.x) ? m : b), null);
        ok(!nah || nah.y - mx.y >= 3, `Strecke ${d.id}: niedrige Linie ${nr} liegt unter der hohen`);
      }
    }
    // Rhythmus: nicht jeder Flug ist bestückt, es gibt freie Abschnitte
    ok(hoch.length <= Math.max(1, Math.ceil(gut.statistik.fluege * 0.8)), `Strecke ${d.id}: Rhythmus – ${hoch.length} Reihen bei ${gut.statistik.fluege} Flügen (es bleiben freie Abschnitte)`);
    reihenGesamt += hoch.length; altGesamt += alt.length;
    bonusGesamt += hoch.filter(nr => gruppen[nr].some(m => m.gold)).length;
    // Gesamtwert: die niedrige Linie zählt nicht zusätzlich
    ok(l.muschelGesamt === l.muscheln.filter(m => !m.alt).reduce((s, m) => s + (m.gold ? K.GOLD_WERT : 1), 0), `Strecke ${d.id}: Muschel-Gesamtwert ohne Alternativlinien`);
  }
  ok(reihenGesamt >= 30, `insgesamt ${reihenGesamt} Luft-Reihen (≥ 30)`);
  ok(bonusGesamt >= 5, `davon ${bonusGesamt} mit goldener Schlussmuschel (≥ 5)`);
  console.log(`  (Info: ${altGesamt} Strecken-Flüge mit zwei Linien)`);
  // Jede Muschel zählt nur einmal
  { const d = STRECKEN[4]; const lauf = Bot.spiele(d, 'gut').lauf; const wert = lauf.muscheln.filter(m => m.weg).reduce((s, m) => s + (m.gold ? K.GOLD_WERT : 1), 0); ok(lauf.muschelWert === wert, 'jede eingesammelte Muschel zählt genau einmal'); }
}

console.log('## Punkte, Reihen-Bonus und Kombo');
{
  const d = STRECKEN[5];
  const l = new Lauf(d); l.starten(); l.tag = 999;
  // Eine Bodenreihe komplett einsammeln
  const nr = l.muscheln.find(m => !m.luft).linie, reihe = l.muscheln.filter(m => m.linie === nr);
  let ev = [];
  for (const m of reihe.slice(0, -1)) { l.x = m.x; l.y = m.y - K.KRABBE_MITTE; l.boden = false; l.vx = 30; l.vy = 0; l.sammeln(); }
  ok(l.bonusPunkte === 0, 'unvollständige Reihe gibt keinen Reihen-Bonus');
  const m = reihe[reihe.length - 1]; l.x = m.x; l.y = m.y - K.KRABBE_MITTE; l.sammeln(); ev = l.ereignisse.filter(e => e.art === 'reihe');
  ok(ev.length === 1 && l.bonusPunkte === K.PUNKTE.REIHE, `volle Reihe: genau ein Bonus von ${K.PUNKTE.REIHE} Punkten (${l.bonusPunkte})`);
  l.sammeln(); ok(l.ereignisse.filter(e => e.art === 'reihe').length === 1, 'derselbe Bonus kommt nicht zweimal');
  ok(l.punkte === l.muschelWert * K.ENDLOS.PUNKTE_MUSCHEL + l.statistik.perfekt * K.ENDLOS.PUNKTE_PERFEKT + l.bonusPunkte, 'Punkte = Muscheln + Perfekt + Bonus');
  // Kombo: begrenzt und läuft nach dem Fenster aus
  const k = new Lauf(d); k.starten(); k.tag = 999;
  let letzteStufe = 0, maxPlus = 0;
  for (let i = 0; i < 12; i++) { k.ereignisse.length = 0; k.erfolg(0, 0); const e = k.ereignisse.find(z => z.art === 'kombo'); if (e) { letzteStufe = e.stufe; maxPlus = Math.max(maxPlus, e.plus); } k.zeit += 2; }
  ok(letzteStufe <= K.PUNKTE.KOMBO_MAX && maxPlus <= K.PUNKTE.KOMBO_SCHRITT * (K.PUNKTE.KOMBO_MAX - 1), `Kombo ist begrenzt (Stufe ≤ ${K.PUNKTE.KOMBO_MAX}, Bonus ≤ ${K.PUNKTE.KOMBO_SCHRITT * (K.PUNKTE.KOMBO_MAX - 1)})`);
  k.zeit += K.PUNKTE.KOMBO_FENSTER + 1; k.ereignisse.length = 0; k.erfolg(0, 0);
  ok(k.kombo === 1 && !k.ereignisse.some(z => z.art === 'kombo'), 'nach dem Zeitfenster beginnt die Kombo neu');
  // Harte Landung beendet die Kombo
  { const q = new Lauf(d); q.starten(); q.tag = 999; q.kombo = 3; q.boden = false; q.echterFlug = true; q.flugzeit = 1; q.abflugX = 10; q.hoechstImFlug = 50; q.maxUeberBoden = 20; q.x = 700; q.y = q.g.hoehe(700) - 0.1; q.vx = 20; q.vy = -150; q.landen(q.g.hoehe(700)); ok(q.kombo === 0, 'harte Landung beendet die Kombo'); }
  // Supersprung: nur bei sehr hohem, sauber beendetem Flug
  { const q = new Lauf(d); q.starten(); q.tag = 999; q.boden = false; q.echterFlug = true; q.flugzeit = 3; q.abflugX = 10; q.abflugY = 10; q.hoechstImFlug = 10 + K.PUNKTE.SUPER_GIPFEL + 5; q.x = 500; q.y = q.g.hoehe(500); q.landungMelden('gut', { winkel: 5, quer: 5, v: 100, verlust: 0 });
    ok(q.ereignisse.some(e => e.art === 'super') && q.bonusPunkte === K.PUNKTE.SUPERSPRUNG, 'Supersprung nach sehr hohem Flug gibt einmal Bonus');
    const r = new Lauf(d); r.starten(); r.tag = 999; r.boden = false; r.echterFlug = true; r.flugzeit = 3; r.abflugX = 10; r.abflugY = 10; r.hoechstImFlug = 30; r.x = 500; r.y = r.g.hoehe(500); r.landungMelden('gut', { winkel: 5, quer: 5, v: 100, verlust: 0 });
    ok(!r.ereignisse.some(e => e.art === 'super'), 'kleiner Flug: kein Supersprung'); }
}

console.log('## Tempo-Anstieg mit der Strecke');
{
  for (const d of [STRECKEN[1], STRECKEN[8]]) {
    const l = new Lauf(d);
    let vorher = 0, maxSprung = 0, monoton = true;
    for (let x = 0; x <= l.ziel; x += 0.25) { l.x = x; const t = l.tempoGrad; maxSprung = Math.max(maxSprung, Math.abs(t - vorher)); if (t < vorher - 1e-12) monoton = false; vorher = t; }
    l.x = 0; const a = l.tempoGrad; l.x = l.ziel; const b = l.tempoGrad;
    ok(a === 0 && Math.abs(b - 1) < 1e-9, `Strecke ${d.id}: Tempo-Anstieg von 0 bis 1 (${a.toFixed(2)} → ${b.toFixed(2)})`);
    ok(monoton && maxSprung < 0.01, `Strecke ${d.id}: Anstieg stetig, ohne Sprung (größter Schritt ${maxSprung.toFixed(4)} je 0,25 m)`);
  }
  // Das Tempo bleibt begrenzt: gutes Spiel überschreitet nie die Grenzen
  let vmaxBoden = 0, vmaxLuft = 0;
  for (const d of STRECKEN) {
    const l = new Lauf(d), b = Bot.neu('gut'); l.starten(); l.tag = 999; let n = 0;
    while (!l.ergebnis && n++ < 240 * 400) { l.schritt(b.halten(l)); if (l.boden) vmaxBoden = Math.max(vmaxBoden, l.v); else vmaxLuft = Math.max(vmaxLuft, Math.hypot(l.vx, l.vy)); l.ereignisse.length = 0; }
  }
  ok(vmaxBoden <= K.V_MAX + 1e-6 && vmaxLuft <= K.V_MAX_LUFT + 1e-6, `Höchsttempo begrenzt (Boden ${vmaxBoden.toFixed(0)} ≤ ${K.V_MAX}, Luft ${vmaxLuft.toFixed(0)} ≤ ${K.V_MAX_LUFT})`);
  // Weiche Schwerkraft beim Sinken: am Gipfel kein Ruck
  { const l = new Lauf(STRECKEN[2]); l.starten(); l.tag = 999; l.boden = false; l.x = 100; l.y = 200; l.vx = 80; l.vy = 40; l.echterFlug = true; l.abflugX = 90; l.abflugY = 190; l.hoechstImFlug = 200;
    let vyAlt = l.vy, aAlt = null, maxRuck = 0, n = 0; while (!l.boden && n++ < 240 * 6) { l.schritt(false); const a = (l.vy - vyAlt) / K.SCHRITT; if (aAlt !== null) maxRuck = Math.max(maxRuck, Math.abs(a - aAlt)); aAlt = a; vyAlt = l.vy; l.ereignisse.length = 0; }
    ok(maxRuck < 1, `Übergang vom Steigen zum Sinken ohne Ruck (größte Änderung ${maxRuck.toFixed(3)} m/s²)`); }
}

console.log('## Tageslicht');
{
  const { ENDLOS_DEF } = L, E = K.ENDLOS;
  ok(E.START === 120 && E.MAX === 180, `Start ${E.START} s, Vorrat höchstens ${E.MAX} s`);
  // Ohne Boni: genau START aktive Sekunden – egal in welchen Häppchen gerechnet wird (30/60/144 fps)
  const alt = [E.MARKE_BONUS, E.PERFEKT_BONUS];
  E.MARKE_BONUS = 0; E.PERFEKT_BONUS = 0;
  const dauer = (schritteJeBild) => {
    const l = new Lauf(Object.assign({}, ENDLOS_DEF, { saat: 9 })); const b = Bot.neu('nie'); l.starten();
    let bilder = 0, nacht = 0;
    while (!l.ergebnis) { for (let i = 0; i < schritteJeBild && !l.ergebnis; i++) { l.schritt(b.halten(l)); for (const e of l.ereignisse) if (e.art === 'nacht') nacht++; l.ereignisse.length = 0; } bilder++; }
    return { zeit: l.zeit, nacht, bilder };
  };
  const d30 = dauer(8), d60 = dauer(4), d144 = dauer(240 / 144 | 0 || 1);
  E.MARKE_BONUS = alt[0]; E.PERFEKT_BONUS = alt[1];
  ok(Math.abs(d30.zeit - E.START) < 0.01 && Math.abs(d60.zeit - E.START) < 0.01 && Math.abs(d144.zeit - E.START) < 0.01, `ohne Boni geht die Sonne nach ${d60.zeit.toFixed(2)} aktiven Sekunden unter – bei 30, 60 und 144 Bildern/s gleich`);
  ok(d30.nacht === 1 && d60.nacht === 1, 'Sonnenuntergang wird genau einmal ausgelöst');
}

console.log('## Endlosflug');
{
  const { ENDLOS_DEF } = L, E = K.ENDLOS;
  const def = (saat) => Object.assign({}, ENDLOS_DEF, { saat });
  // Frischer Lauf
  const f0 = new Lauf(def(7));
  ok(f0.rest === K.ENDLOS.START && f0.strecke === 0 && f0.punkte === 0 && f0.zeit === 0 && f0.muscheln.every(m => !m.weg), 'Neuer Lauf: volles Start-Tageslicht, Strecke/Punkte 0');
  ok(f0.g.ende >= E.VORLAUF, `Gelände ist ${Math.round(f0.g.ende)} m voraus gebaut`);
  // Deterministisch
  const kurz = (saat, art) => { const l = new Lauf(def(saat)); const b = Bot.neu(art, saat); l.starten(); for (let i = 0; i < 240 * 20; i++) l.schritt(b.halten(l)); return l.x.toFixed(6) + '|' + l.punkte; };
  ok(kurz(3, 'gut') === kurz(3, 'gut'), 'gleiche Saat → gleicher Lauf');
  ok(kurz(3, 'gut') !== kurz(4, 'gut'), 'andere Saat → andere Landschaft');
  // Lange Läufe mit verschiedenen Spielern und Saaten
  const ergebnisse = {};
  for (const [art, saaten] of [['gut', [1]], ['mittel', [1, 2]], ['einfach', [1, 2]], ['nie', [1, 2]]]) for (const saat of saaten) {
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
          if (m.luft) continue;   // Luft-Reihen folgen der Flugbahn, nicht dem Hang
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
    if (art === 'nie') ok(unter === 0 && l.strecke < 1, `${name}: ohne Drücken bleibt Kalle am Start stehen (${l.strecke.toFixed(1)} m)`);
    else ok(unter === 0 && steht === 0, `${name}: nie im Boden, nie stecken`);
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
  ok(z('nie') >= K.ENDLOS.START && z('nie') < K.ENDLOS.START + 60, `wer nie drückt, bekommt kaum Bonus (${z('nie').toFixed(0)} s)`);
  ok(z('mittel') > z('nie') + 60, `normales Spiel verlängert spürbar (${z('mittel').toFixed(0)} s)`);
  ok(z('gut') < 1200, `auch sehr gutes Spiel endet irgendwann (${z('gut').toFixed(0)} s)`);
  ok(mittelWert('gut', 'perfekt') > mittelWert('mittel', 'perfekt') * 1.2, `gute Landungen machen den Unterschied (perfekte Landungen: gut ${mittelWert('gut', 'perfekt').toFixed(0)}, mittel ${mittelWert('mittel', 'perfekt').toFixed(0)})`);
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
  ok(probe(80, false), 'schnell und losgelassen: fliegt über die Kuppe');
  ok(!probe(30, false), 'langsam: bleibt am Boden');
  ok(probe(80, false) && !probe(80, true), 'gehalten bleibt Kalle bei gleichem Tempo am Boden (schwer)');
}

console.log('## Schwer machen wirkt richtig');
{
  const d = STRECKEN[1];
  const l0 = new Lauf(d);
  const p = l0.g.p;
  const kuppe = p[3], tal = p[4];
  const bergab = (h) => { const l = new Lauf(d); l.starten(); l.x = kuppe[0] + 1; l.y = l.g.hoehe(l.x); l.v = 10; while (l.x < tal[0]) l.schritt(h); return l.v; };
  ok(bergab(true) > bergab(false) + 3, `bergab gehalten schneller (${bergab(true).toFixed(1)} gegen ${bergab(false).toFixed(1)})`);
  const bergauf = (h) => { const l = new Lauf(d); l.starten(); l.x = tal[0] + 1; l.y = l.g.hoehe(l.x); l.v = 60; let i = 0; while (l.boden && l.x < p[5][0] - 8 && i++ < 2000) l.schritt(h); return l.v; };
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

console.log('## Kalle bewegt sich nur mit gedrückter Taste von selbst');
{
  const d = STRECKEN[0];
  const l = new Lauf(d); l.starten();
  const x0 = l.x;
  for (let i = 0; i < 2400; i++) l.schritt(false);
  ok(l.tempo === 0 && Math.abs(l.x - x0) < 1e-9, `gestartet, aber nie gedrückt: Kalle steht still (${(l.x - x0).toFixed(2)} m)`);
  for (let i = 0; i < 240; i++) l.schritt(true);
  ok(l.x > x0 + 10, `gedrückt: Kalle krabbelt los (${(l.x - x0).toFixed(0)} m in 1 s)`);
  // Auf ebenem Stück und am Anstieg: losgelassen läuft der Schwung aus, ohne Rückwärtsrutschen
  const p = new Lauf(STRECKEN[1]).g.p, tal = p[4];
  const m = new Lauf(STRECKEN[1]); m.starten(); m.x = tal[0] + 1; m.y = m.g.hoehe(m.x); m.v = 12;
  let minX = m.x, rueck = 0;
  for (let i = 0; i < 2400; i++) { m.schritt(false); if (m.x < minX - 1e-9) rueck++; minX = Math.max(minX, m.x); }
  ok(m.tempo === 0 && rueck === 0, `bergauf losgelassen ohne Schwung: bleibt stehen, rutscht nicht zurück`);
  const xs = m.x;
  for (let i = 0; i < 480; i++) m.schritt(true);
  ok(m.x > xs + 10, `danach gedrückt: krabbelt auch bergauf weiter (${(m.x - xs).toFixed(0)} m in 2 s)`);
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
