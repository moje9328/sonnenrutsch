// Berechnet die Muschelpositionen aller Strecken und schreibt sie nach 2b-muscheln.js.
// Nach jeder Änderung an Physik oder Strecken ausführen: node quelle/werkzeug-muscheln.js
const fs = require('fs'), path = require('path');
const L = require('./lade-logik.js')({ ohneMuscheldatei: true });
const zeilen = L.STRECKEN.map(d => {
  const lauf = new L.Lauf(d, { ohneMuscheln: true });
  const liste = L.berechneMuscheln(d, lauf).map(m => `[${m.x.toFixed(1)},${m.y.toFixed(1)}${m.gold ? ',1' : ''}]`);
  return `  ${d.id}: [${liste.join(',')}],`;
});
const text = `// Vorab berechnete Muscheln je Strecke: [x, y, gold?]. NICHT von Hand ändern –
// erzeugt mit: node quelle/werkzeug-muscheln.js (nach Änderungen an Physik oder Strecken)
const MUSCHELN = {
${zeilen.join('\n')}
};
`;
fs.writeFileSync(path.join(__dirname, '2b-muscheln.js'), text);
console.log('2b-muscheln.js:', Math.round(text.length / 1024), 'KB');
