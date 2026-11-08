// Plant Sprungflächen und Muscheln aller Strecken und schreibt sie nach 2b-muscheln.js.
// Nach jeder Änderung an Physik oder Strecken ausführen: node quelle/werkzeug-muscheln.js
// (Die Strecken werden parallel in Kindprozessen geplant; „node quelle/werkzeug-muscheln.js 5“ plant nur Strecke 5 und schreibt nichts.)
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');
const nurId = process.argv[2] ? Number(process.argv[2]) : null;
const art = (m) => m.alt ? 2 : m.luft ? 1 : 0;

if (nurId) {
  const L = require('./lade-logik.js')({ ohneMuscheldatei: true });
  const probe = require('./muschel-probe.js');
  const d = L.STRECKEN.find(s => s.id === nurId);
  const plan = L.planeStrecke(d);
  L.MATTEN_PLAN[d.id] = plan.matten.map(m => [m.x0, m.x1, m.kraft]);   // ab jetzt fahren alle Probeläufe mit den Flächen
  const erg = probe(L, d, plan.luft);
  const n = (f) => new Set(erg.muscheln.filter(f).map(m => m.linie)).size;
  const info = `Strecke ${String(d.id).padStart(2)}: ${plan.matten.length} Flächen, ${n(m => !m.luft)} Bodenreihen, ${n(m => m.luft && !m.alt)} Luftreihen, ${n(m => m.alt)} Alternativlinien` +
    (erg.entferntBoden || erg.entferntLuft || erg.entferntAlt ? ` (entfernt: ${erg.entferntBoden} Boden, ${erg.entferntLuft} Luft, ${erg.entferntAlt} Alternativ)` : '');
  const zeile = `  ${d.id}: [${erg.muscheln.map(m => `[${m.x.toFixed(2)},${m.y.toFixed(2)},${m.gold ? 1 : 0},${m.linie},${art(m)}${m.alt ? ',' + m.abX.toFixed(2) : ''}]`).join(',')}],`;
  const matten = `  ${d.id}: [${plan.matten.map(m => `[${m.x0.toFixed(2)},${m.x1.toFixed(2)},${m.kraft}]`).join(',')}],`;
  console.log(info);
  if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify({ info, zeile, matten, zaehl: { matten: plan.matten.length, boden: n(m => !m.luft), luft: n(m => m.luft && !m.alt), alt: n(m => m.alt) } }));
  process.exit(0);
}

const ids = Array.from({ length: 12 }, (_, i) => i + 1);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-'));
const frei = Math.max(1, Math.min(6, os.cpus().length - 1));
let laeuft = 0, naechste = 0, fertig = 0;
function start() {
  while (laeuft < frei && naechste < ids.length) {
    const id = ids[naechste++];
    laeuft++;
    const kind = cp.spawn(process.execPath, [__filename, String(id), path.join(tmp, id + '.json')], { stdio: 'inherit' });
    kind.on('exit', (code) => { laeuft--; fertig++; if (code) { console.error('Strecke', id, 'fehlgeschlagen'); process.exit(1); } if (fertig === ids.length) schreibe(); else start(); });
  }
}
function schreibe() {
  const teile = ids.map(id => JSON.parse(fs.readFileSync(path.join(tmp, id + '.json'), 'utf8')));
  const summe = teile.reduce((a, t) => ({ matten: a.matten + t.zaehl.matten, boden: a.boden + t.zaehl.boden, luft: a.luft + t.zaehl.luft, alt: a.alt + t.zaehl.alt }), { matten: 0, boden: 0, luft: 0, alt: 0 });
  console.log('Gesamt:', JSON.stringify(summe));
  const text = `// Vorab geplante Sprungflächen und Muscheln je Strecke. NICHT von Hand ändern –
// erzeugt mit: node quelle/werkzeug-muscheln.js (nach Änderungen an Physik oder Strecken)
// MUSCHELN: [x, y, gold, reihe, art, abX]  art: 0 Boden, 1 Luft, 2 niedrige Alternativlinie (nur dann abX = Absprungstelle des Flugs)
// MATTEN:   [x0, x1, Stoßstärke]
const MUSCHELN = {
${teile.map(t => t.zeile).join('\n')}
};
const MATTEN = {
${teile.map(t => t.matten).join('\n')}
};
`;
  fs.writeFileSync(path.join(__dirname, '2b-muscheln.js'), text);
  console.log('2b-muscheln.js:', Math.round(text.length / 1024), 'KB');
}
start();
