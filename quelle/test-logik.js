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
  for (let x = -100; x < l.ziel + 300; x += 0.05) {
    const a = g.hoehe(x), b = g.hoehe(x + 0.05);
    const s1 = g.steigung(x), s2 = g.steigung(x + 0.05);
    if (!Number.isFinite(a) || !Number.isFinite(s1)) nan = true;
    maxSprung = Math.max(maxSprung, Math.abs(s2 - s1));
    maxSteig = Math.max(maxSteig, Math.abs(s1));
    // Steigung passt zur Höhe (numerische Ableitung)
    if (Math.abs((b - a) / 0.05 - (s1 + s2) / 2) > 0.02) { nan = true; }
  }
  ok(!nan, `Strecke ${d.id}: Höhe/Steigung endlich und passend`);
  ok(maxSprung < 0.02, `Strecke ${d.id}: kein Knick (Steigungssprung ${maxSprung.toFixed(3)})`);
  ok(maxSteig < 1.6, `Strecke ${d.id}: nicht zu steil (max ${maxSteig.toFixed(2)})`);
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
        if (e.guete === 'perfekt') { perfektGesehen++; if (l.v > vLand * (1 + K.PERFEKT_BONUS + 0.001) + 0.5) bonusZuGross++; }
        if (e.guete === 'hart') { hartGesehen++; if (l.v > vLand * 0.85 && l.v > K.V_MIN + 0.01) hartNichtLangsamer++; }
        // Nach der Landung: 2 s weiterlaufen ohne Durchfallen/Steckenbleiben
        let xAlt = l.x;
        for (let i = 0; i < 480; i++) { l.schritt(i % 50 < 25); if (l.y < l.g.hoehe(l.x) - 1e-6) { schlecht++; break; } }
        if (l.x <= xAlt + 5) schlecht++;
      }
    }
  }
  ok(schlecht === 0, `${faelle} Landungen: nie unter dem Boden, immer gelandet, nie stecken (Probleme: ${schlecht})`);
  ok(perfektGesehen > 20 && hartGesehen > 20, `perfekte (${perfektGesehen}) und harte (${hartGesehen}) Landungen kommen vor`);
  ok(bonusZuGross === 0, 'Perfekt-Bonus bleibt moderat (≤ 5 % bei erster Landung)');
  ok(hartNichtLangsamer === 0, 'Harte Landung am Gegenhang bremst spürbar');
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
    ok(g.zeit && g.zeit <= d.sterne[1] + 0.01, `Strecke ${d.id}: guter Bot schafft 3 Sterne (${g.zeit && g.zeit.toFixed(1)} s ≤ ${d.sterne[1]})`);
    const ms = [1, 2, 3, 4, 5].map(s => Bot.spiele(d, 'mittel', s).zeit || 999);
    const geschafft = ms.filter(z => z <= d.zeit).length;
    ok(geschafft >= 3, `Strecke ${d.id}: mittlerer Bot (Reaktionszeit 0,11 s, Fehler) schafft es in ${geschafft} von 5 Läufen`);
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
