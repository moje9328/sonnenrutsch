// ===================================================================
// 5 · SPEICHER
// Freigeschaltete Strecken, Sterne, Bestzeiten, Ton und Krabbenwahl lokal
// im Browser. Fehlt localStorage oder ist der Inhalt kaputt, läuft das
// Spiel trotzdem – es merkt sich dann alles nur bis zum Neuladen.
// ===================================================================

const Speicher = (() => {
  const SCHLUESSEL = 'pixelhafen.sonnenrutsch';
  const VERSION = 1;
  const leer = () => ({ version: VERSION, ton: true, krabbe: 'kalle', frei: 1, level: {}, lernGesehen: false });
  let daten = leer();

  function lager() { try { return window.localStorage || null; } catch (e) { return null; } }

  function pruefe(roh) {
    const d = leer();
    if (!roh || typeof roh !== 'object' || roh.version !== VERSION) return d;
    if (typeof roh.ton === 'boolean') d.ton = roh.ton;
    if (typeof roh.krabbe === 'string' && KRABBEN[roh.krabbe]) d.krabbe = roh.krabbe;
    if (roh.lernGesehen === true) d.lernGesehen = true;
    const f = Math.floor(Number(roh.frei));
    if (f >= 1) d.frei = Math.min(f, STRECKEN.length);
    if (roh.level && typeof roh.level === 'object') {
      for (const s of STRECKEN) {
        const e = roh.level[s.id];
        if (!e || typeof e !== 'object') continue;
        const sterne = Math.floor(Number(e.sterne));
        const zeit = Number(e.zeit);
        const weit = Number(e.weit);
        const eintrag = {};
        if (sterne >= 1 && sterne <= 3 && zeit > 0 && zeit < 1000) { eintrag.sterne = sterne; eintrag.zeit = Math.round(zeit * 100) / 100; }
        if (weit > 0 && weit <= 1) eintrag.weit = weit;
        const mu = Math.floor(Number(e.muscheln));
        if (mu > 0 && mu < 10000) eintrag.muscheln = mu;
        if (Object.keys(eintrag).length) d.level[s.id] = eintrag;
      }
    }
    return d;
  }
  function laden() {
    try { const l = lager(); const t = l ? l.getItem(SCHLUESSEL) : null; daten = t ? pruefe(JSON.parse(t)) : leer(); }
    catch (e) { daten = leer(); }
  }
  function sichern() { try { const l = lager(); if (l) l.setItem(SCHLUESSEL, JSON.stringify(daten)); } catch (e) { /* gesperrt oder voll */ } }
  laden();

  return {
    tonAn: () => daten.ton,
    setzeTon(an) { daten.ton = !!an; sichern(); },
    krabbe: () => daten.krabbe,
    setzeKrabbe(n) { if (KRABBEN[n]) { daten.krabbe = n; sichern(); } },
    lernGesehen: () => daten.lernGesehen,
    setzeLernGesehen() { daten.lernGesehen = true; sichern(); },
    level: (id) => daten.level[id] || null,
    sterne: (id) => (daten.level[id] && daten.level[id].sterne) || 0,
    sterneGesamt: () => Object.values(daten.level).reduce((s, e) => s + (e.sterne || 0), 0),
    frei: (id) => id <= daten.frei,
    hoechsteFreie: () => daten.frei,
    // Ziel erreicht: Sterne und Bestzeit nur verbessern, nächste Strecke frei
    ziel(id, zeit, sterne) {
      const alt = daten.level[id] || {};
      const besser = { zeit: !alt.zeit || zeit < alt.zeit, sterne: sterne > (alt.sterne || 0), neuFrei: false };
      daten.level[id] = Object.assign({}, alt, { sterne: Math.max(alt.sterne || 0, sterne), zeit: alt.zeit ? Math.min(alt.zeit, zeit) : zeit, weit: 1 });
      if (id + 1 > daten.frei && id < STRECKEN.length) { daten.frei = id + 1; besser.neuFrei = true; }
      sichern();
      return besser;
    },
    // Meiste Muscheln einer Fahrt merken (egal ob geschafft)
    muscheln(id, wert) {
      const alt = daten.level[id] || {};
      const besser = wert > (alt.muscheln || 0);
      if (besser) { daten.level[id] = Object.assign({}, alt, { muscheln: wert }); sichern(); }
      return besser;
    },
    // Nicht geschafft: weiteste Strecke merken
    weit(id, anteil) {
      const alt = daten.level[id] || {};
      const besser = !alt.weit || anteil > alt.weit + 0.001;
      if (besser) { daten.level[id] = Object.assign({}, alt, { weit: Math.min(1, anteil) }); sichern(); }
      return besser;
    },
  };
})();
