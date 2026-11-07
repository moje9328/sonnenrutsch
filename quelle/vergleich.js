// Vergleichsversuch: dieselbe Rampe, verschiedene Anfahrtstempi, losgelassen (kein Sinkflug).
// Aufruf: node quelle/vergleich.js  – gibt Flugzeit, Gipfel, Reichweite und Scheitel-Verhalten aus.
const L = require('./lade-logik.js')();
const { K, STRECKEN, Lauf, baueStrecke } = L;
module.exports = function vergleich(tempi = [95, 115, 135, 155]) {
  const d = STRECKEN[4];
  const bau = baueStrecke(d);
  const tal = bau.taeler[3], kuppe = bau.kuppen.find(k => k[0] > tal[0]);
  return tempi.map(v0 => {
    const l = new Lauf(d); l.starten(); l.tag = 999;
    // Start unten im Tal mit festem Tempo, dann ohne Drücken die Rampe hinauf
    l.x = tal[0]; l.y = l.g.hoehe(l.x); l.v = v0; l.boden = true;
    let t0 = null, x0 = 0, y0 = 0, maxY = -1e9, vAb = 0, winkelAb = 0, n = 0, sprungA = 0, ayAlt = null, luftSchritte = 0, scheitelZeit = null;
    while (n++ < 240 * 20) {
      const vor = l.boden, vyAlt = l.vy;
      l.schritt(false);
      if (vor && !l.boden) { t0 = l.zeit; x0 = l.x; y0 = l.y; vAb = Math.hypot(l.vx, l.vy); winkelAb = Math.atan2(l.vy, l.vx) * 180 / Math.PI; }
      if (!l.boden && t0 !== null) {
        maxY = Math.max(maxY, l.y);
        if (vyAlt > 0 && l.vy <= 0) scheitelZeit = l.zeit - t0;
        // Beschleunigung von Schritt zu Schritt (ab dem 2. Luftschritt; der erste liest noch den Bodenwert)
        if (++luftSchritte >= 2) {
          const ay = (l.vy - vyAlt) / K.SCHRITT;
          if (ayAlt !== null) sprungA = Math.max(sprungA, Math.abs(ay - ayAlt));
          ayAlt = ay;
        }
      }
      if (t0 !== null && l.boden) break;
      if (t0 === null && l.x > kuppe[0] + 20) break;   // nicht abgehoben
    }
    const land = l.ereignisse.filter(e => e.art === 'landung').pop();
    return t0 === null ? { v0, abgehoben: false } : { v0, abgehoben: true, vAb, winkelAb, flugzeit: l.zeit - t0, gipfel: maxY - y0, weite: l.x - x0, guete: land && land.guete, ruckAmScheitel: sprungA, scheitelZeit };
  });
};
if (require.main === module) {
  for (const r of module.exports()) {
    if (!r.abgehoben) { console.log(`Anfahrt ${r.v0} m/s: hebt nicht ab`); continue; }
    console.log(`Anfahrt ${String(r.v0).padStart(3)} m/s → Absprung ${r.vAb.toFixed(0)} m/s unter ${r.winkelAb.toFixed(0)}° | Flugzeit ${r.flugzeit.toFixed(2)} s | Gipfel ${r.gipfel.toFixed(1)} m | Weite ${r.weite.toFixed(0)} m | Gipfel nach ${r.scheitelZeit.toFixed(2)} s | Landung ${r.guete} | größte Änderung der Beschleunigung zwischen zwei Schritten ${r.ruckAmScheitel.toFixed(3)} m/s²`);
  }
}
