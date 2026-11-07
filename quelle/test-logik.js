// Logik-Tests ohne Browser: Physik, Landungen, Strecken, Schaffbarkeit.
// Aufruf: node quelle/test-logik.js   (mit „schnell“ als Argument: ohne die langen Botläufe)
const L = require('./lade-logik.js')();
const { K, STRECKEN, Lauf, Bot } = L;
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
  ok(maxSteig < Math.PI / 2 * K.STEIL_MAX + 0.01, `Strecke ${d.id}: nicht zu steil (max ${maxSteig.toFixed(2)})`);
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
    ok(unter === 0 && l.muscheln.length >= 30, `Strecke ${d.id}: ${l.muscheln.length} Muscheln, keine im Boden`);
    const a = Bot.spiele(d, 'gut').lauf.muschelWert, b = Bot.spiele(d, 'gut').lauf.muschelWert;
    ok(a === b && a > 0, `Strecke ${d.id}: Sammeln ist reproduzierbar (${a} Wert)`);
    // Neustart: Muscheln sind wieder da
    ok(new Lauf(d).muscheln.every(m => !m.weg), `Strecke ${d.id}: Neustart bringt alle Muscheln zurück`);
  }
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
