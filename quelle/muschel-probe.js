// Probeflug für Muschel-Linien (genutzt von werkzeug-muscheln.js und test-logik.js):
// Jede Linie muss von gutem oder mittlerem Spiel großteils (≥ 70 %) eingesammelt werden –
// sonst fliegt sie raus (z. B. wo Kalle nach der Landung gleich wieder abhebt).
module.exports = function muschelnMitProbeflug(L, d) {
  let roh = L.berechneMuscheln(d, new L.Lauf(d, { ohneMuscheln: true }));
  L.MUSCHEL_CACHE.set(d.id, roh);
  const laeufe = ['gut', 'mittel'].map(art => L.Bot.spiele(d, art).lauf);
  L.MUSCHEL_CACHE.delete(d.id);
  const anteil = (l, nr) => { const g = l.muscheln.filter(m => m.linie === nr); return g.filter(m => m.weg).length / g.length; };
  const alle = [...new Set(roh.map(m => m.linie))];
  const behalten = alle.filter(nr => Math.max(...laeufe.map(l => anteil(l, nr))) >= 0.7);
  roh = roh.filter(m => behalten.includes(m.linie)).map(m => Object.assign({}, m, { weg: false }));
  // Linien neu durchnummerieren; jede dritte endet golden
  const nrNeu = new Map(behalten.map((nr, i) => [nr, i + 1]));
  roh.forEach(m => { m.linie = nrNeu.get(m.linie); });
  roh.forEach((m, i) => { const letzte = !roh.slice(i + 1).some(q => q.linie === m.linie); m.gold = letzte && m.linie % L.MUSCHEL_LINIEN.GOLD_JEDE === 0; });
  return { muscheln: roh, entfernt: alle.length - behalten.length };
};
