// Probeflug für Muscheln (genutzt von werkzeug-muscheln.js und test-logik.js):
//  • Bodenlinien müssen von gutem oder mittlerem Spiel großteils (≥ 70 %) eingesammelt werden –
//    sonst fliegen sie raus (z. B. wo Kalle nach der Landung gleich wieder abhebt).
//  • Luft-Reihen (Flugbahn des guten Testpiloten) müssen vom guten Spiel zu ≥ 85 % eingesammelt werden.
//  • Niedrige Alternativlinien werden mit einem Piloten geprüft, der in dem Flug von Anfang an hält (≥ 80 %).
// Rückgabe: alle Muscheln (Boden, Luft, Alternativen) nach x sortiert plus Zähler.
module.exports = function muschelnMitProbeflug(L, d, luft = []) {
  const bodenRoh = L.berechneMuscheln(d, new L.Lauf(d, { ohneMuscheln: true }));
  const kopieren = (liste) => liste.map(m => Object.assign({}, m, { weg: false }));
  const sortiert = (liste) => liste.slice().sort((a, b) => a.x - b.x);
  const setze = (liste) => { L.MUSCHEL_CACHE.set(d.id, sortiert(kopieren(liste))); };
  const anteil = (l, nr) => { const g = l.muscheln.filter(m => m.linie === nr); return g.length ? g.filter(m => m.weg).length / g.length : 0; };

  setze([...bodenRoh, ...luft.filter(m => !m.alt)]);
  const laeufe = ['gut', 'mittel'].map(art => L.Bot.spiele(d, art).lauf);
  L.MUSCHEL_CACHE.delete(d.id);

  // Bodenlinien
  const bodenNr = [...new Set(bodenRoh.map(m => m.linie))];
  const bodenBleibt = bodenNr.filter(nr => Math.max(...laeufe.map(l => anteil(l, nr))) >= 0.7);
  let boden = bodenRoh.filter(m => bodenBleibt.includes(m.linie)).map(m => Object.assign({}, m, { weg: false }));
  const nrNeu = new Map(bodenBleibt.map((nr, i) => [nr, i + 1]));
  boden.forEach(m => { m.linie = nrNeu.get(m.linie); });
  boden.forEach((m, i) => { const letzte = !boden.slice(i + 1).some(q => q.linie === m.linie); m.gold = letzte && m.linie % L.MUSCHEL_LINIEN.GOLD_JEDE === 0; });

  // Luft-Reihen (hohe Linien)
  const hochNr = [...new Set(luft.filter(m => !m.alt).map(m => m.linie))];
  const hochBleibt = hochNr.filter(nr => anteil(laeufe[0], nr) >= 0.85);
  const hoch = luft.filter(m => !m.alt && hochBleibt.includes(m.linie));

  // Niedrige Alternativen: Pilot hält in dem passenden Flug von Anfang an
  setze([...boden, ...hoch, ...luft.filter(m => m.alt)]);
  const altAb = new Map(luft.filter(m => m.alt).map(m => [m.linie, m.abX]));
  const bot = L.Bot.neu('gut');
  const l = new L.Lauf(d);
  l.starten(); l.tag = 999;
  const ziele = [...altAb.values()];
  let n = 0;
  while (!l.ergebnis && n++ < 240 * 400) {
    let h = bot.halten(l);
    if (!l.boden && ziele.some(x => Math.abs(x - l.abflugX) < 6)) h = true;
    l.schritt(h);
    l.ereignisse.length = 0;
  }
  const altBleibt = [...altAb.keys()].filter(nr => anteil(l, nr) >= 0.8 && hochBleibt.includes(luft.find(m => m.linie === nr).linie - 1));
  const alt = luft.filter(m => m.alt && altBleibt.includes(m.linie));
  L.MUSCHEL_CACHE.delete(d.id);
  const alle = sortiert([...boden, ...hoch, ...alt]).map(m => Object.assign({}, m, { weg: false }));
  return { muscheln: alle, entferntBoden: bodenNr.length - bodenBleibt.length, entferntLuft: hochNr.length - hochBleibt.length, entferntAlt: altAb.size - altBleibt.length };
};
