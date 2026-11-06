// ===================================================================
// 8 · EINGABE – eine einzige Taste
// Finger, Maus, Stift (Pointer Events) und Leertaste/Pfeil runter/Enter.
// „Gedrückt“ ist, solange irgendein Finger, die Maus oder eine Taste
// unten ist. Die Physik liest den Zustand im nächsten Schritt: keine
// Verzögerung durch Klick-Erkennung oder Doppeltipp-Zoom.
// ===================================================================

const Eingabe = (() => {
  const finger = new Set();
  const tasten = new Set();
  let app = null;
  const SPIELTASTEN = [' ', 'ArrowDown', 'Enter', 'ArrowUp', 'w', 'W', 's', 'S'];

  function init(flaeche, a) {
    app = a;
    flaeche.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button > 0) return;
      Ton.wecke();
      e.preventDefault();
      finger.add(e.pointerId);
      try { flaeche.setPointerCapture(e.pointerId); } catch (f) { /* ältere Browser */ }
      app.gedrueckt();
    });
    const los = (e) => { if (finger.delete(e.pointerId)) app.losgelassen(); };
    flaeche.addEventListener('pointerup', los);
    flaeche.addEventListener('pointercancel', los);
    flaeche.addEventListener('lostpointercapture', los);
    flaeche.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('keydown', taste);
    document.addEventListener('keyup', (e) => { if (tasten.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key)) app.losgelassen(); });
    // Fenster verliert den Fokus: nichts darf „hängen bleiben“
    window.addEventListener('blur', alleLos);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { alleLos(); app.versteckt(); } });
  }
  function alleLos() { const war = gedrueckt(); finger.clear(); tasten.clear(); if (war) app.losgelassen(); }
  function gedrueckt() { return finger.size > 0 || tasten.size > 0; }

  function taste(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key;
    if ((k === 'p' || k === 'P' || k === 'Escape') && !e.repeat) { if (app.pauseTaste()) e.preventDefault(); return; }
    if (app.fensterOffen()) return;
    if ((k === 'r' || k === 'R') && !e.repeat) { app.neustart(); return; }
    if ((k === 'm' || k === 'M') && !e.repeat) { app.tonUmschalten(); return; }
    if (!SPIELTASTEN.includes(k)) return;
    const a = document.activeElement;
    if (a && a !== document.body && a.id !== 'bild' && a.tagName === 'BUTTON') return;   // Knöpfe bedienen lassen
    e.preventDefault();
    Ton.wecke();
    if (e.repeat) return;
    tasten.add(k.length === 1 ? k.toLowerCase() : k);
    app.gedrueckt();
  }

  return { init, gedrueckt, alleLos };
})();
