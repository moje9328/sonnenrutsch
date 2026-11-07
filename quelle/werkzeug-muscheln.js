// Berechnet die Muschelpositionen aller Strecken und schreibt sie nach 2b-muscheln.js.
// Nach jeder Änderung an Physik oder Strecken ausführen: node quelle/werkzeug-muscheln.js
const fs = require('fs'), path = require('path');
const L = require('./lade-logik.js')({ ohneMuscheldatei: true });
const probe = require('./muschel-probe.js');
const zeilen = L.STRECKEN.map(d => {
  const { muscheln: roh, entfernt } = probe(L, d);
  if (entfernt) console.log(`Strecke ${d.id}: ${entfernt} Linie(n) ohne sicheres Einsammeln entfernt`);
  const liste = roh.map(m => `[${m.x.toFixed(2)},${m.y.toFixed(2)},${m.gold ? 1 : 0},${m.linie}]`);
  return `  ${d.id}: [${liste.join(',')}],`;
});
const text = `// Vorab berechnete Muscheln je Strecke: [x, y, gold, linie]. NICHT von Hand ändern –
// erzeugt mit: node quelle/werkzeug-muscheln.js (nach Änderungen an Physik oder Strecken)
const MUSCHELN = {
${zeilen.join('\n')}
};
`;
fs.writeFileSync(path.join(__dirname, '2b-muscheln.js'), text);
console.log('2b-muscheln.js:', Math.round(text.length / 1024), 'KB');
