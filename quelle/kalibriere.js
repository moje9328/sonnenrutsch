// Misst jede Strecke mit dem Testbot und schlägt Tageslicht und Sterne vor.
const L = require('./lade-logik.js')();
const FAKTOR = [1.9, 1.5, 1.45, 1.4, 1.36, 1.33, 1.3, 1.28, 1.26, 1.24, 1.22, 1.2];
L.STRECKEN.forEach((d, i) => {
  const g = L.Bot.spiele(d, 'gut').zeit;
  const ms = [1, 2, 3, 4, 5].map(s => L.Bot.spiele(d, 'mittel', s).zeit || 999).sort((a, b) => a - b);
  const zeit = Math.ceil(Math.max(g * FAKTOR[i], ms[2] + 2));
  const s3 = Math.round(g * 1.04 * 10) / 10, s2 = Math.round((g * 1.04 + zeit) / 2 * 10) / 10;
  console.log(`{ id: ${d.id}, gut: ${g.toFixed(1)}, mittel: [${ms.map(x => x.toFixed(1))}], zeit: ${zeit}, sterne: [${s2}, ${s3}] }`);
});
