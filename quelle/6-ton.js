// ===================================================================
// 6 · TON
// Eigene kurze Geräusche mit Web Audio, keine Dateien. Startet erst nach
// einer Nutzeraktion und ist abschaltbar. Dazu ein leises Rutsch- und
// Windgeräusch, das mit dem Tempo mitgeht.
// ===================================================================

const Ton = (() => {
  let ctx = null, haupt = null, rauschen = null;
  let an = true;
  let rutsch = null;   // { quelle, filter, gain } dauerhaftes Rauschen

  function wecke() {
    if (!an) return;
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        const komp = ctx.createDynamicsCompressor();
        komp.threshold.value = -16; komp.knee.value = 10; komp.ratio.value = 6;
        haupt = ctx.createGain();
        haupt.gain.value = 0.5;
        haupt.connect(komp).connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    } catch (e) { ctx = null; }
  }
  const bereit = () => an && ctx && ctx.state === 'running';

  function rauschBuffer() {
    if (!rauschen) {
      rauschen = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.5), ctx.sampleRate);
      const d = rauschen.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return rauschen;
  }
  function huelle(g, t, laut, dauer, anstieg = 0.005) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, laut), t + anstieg);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
  }
  function ton(f1, f2, dauer, { typ = 'square', laut = 0.3, start = 0, anstieg } = {}) {
    const t = ctx.currentTime + start;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = typ;
    osc.frequency.setValueAtTime(f1, t);
    if (f2 !== f1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dauer);
    huelle(g, t, laut, dauer, anstieg);
    osc.connect(g).connect(haupt);
    osc.start(t); osc.stop(t + dauer + 0.03);
  }
  function rausch(dauer, { laut = 0.3, start = 0, typ = 'bandpass', f1 = 1800, f2 = 600, q = 0.9 } = {}) {
    const t = ctx.currentTime + start;
    const src = ctx.createBufferSource(); src.buffer = rauschBuffer();
    const fil = ctx.createBiquadFilter(); fil.type = typ; fil.Q.value = q;
    fil.frequency.setValueAtTime(f1, t);
    fil.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dauer);
    const g = ctx.createGain(); huelle(g, t, laut, dauer, 0.003);
    src.connect(fil).connect(g).connect(haupt);
    src.start(t, Math.random() * 0.5); src.stop(t + dauer + 0.03);
  }
  const v = () => 1 + (Math.random() * 2 - 1) * 0.05;

  let letzteMuschel = 0, serie = 0;

  // Dauerrauschen für Rutschen und Fahrtwind
  function rutschStarten() {
    if (rutsch || !ctx) return;
    const src = ctx.createBufferSource(); src.buffer = rauschBuffer(); src.loop = true;
    const fil = ctx.createBiquadFilter(); fil.type = 'bandpass'; fil.Q.value = 0.8; fil.frequency.value = 600;
    const g = ctx.createGain(); g.gain.value = 0.0001;
    src.connect(fil).connect(g).connect(haupt);
    src.start();
    rutsch = { src, fil, g };
  }

  return {
    wecke,
    istAn: () => an,
    setze(wert) {
      an = !!wert;
      if (an) wecke();
      else if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
    },
    // Jedes Bild: Lautstärke und Klangfarbe des Rutschens an Tempo anpassen
    fahrt(tempo, boden, schwer, aktiv) {
      if (!bereit()) return;
      rutschStarten();
      const t = ctx.currentTime;
      const s = Math.min(1, tempo / 55);
      const laut = aktiv ? (boden ? 0.025 + s * 0.07 + (schwer ? 0.02 : 0) : 0.012 + s * 0.035) : 0.0001;
      rutsch.g.gain.setTargetAtTime(Math.max(0.0001, laut), t, 0.06);
      rutsch.fil.frequency.setTargetAtTime(boden ? 300 + s * 900 : 900 + s * 1600, t, 0.08);
      rutsch.fil.Q.setTargetAtTime(boden ? 0.9 : 0.5, t, 0.1);
    },
    still() { if (rutsch && ctx) rutsch.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05); },
    // Absprung: kurzes Fahrtwind-„Hui“ (die Stimme kommt aus 6b-rufe.js)
    abflug(tempo) {
      if (!bereit()) return;
      const s = Math.min(1, tempo / 80);
      ton(320 + s * 200, 700 + s * 500, 0.2, { typ: 'sine', laut: 0.07 });
      rausch(0.25, { laut: 0.05, f1: 600, f2: 2400, q: 0.7 });
    },
    // Für die Rufe: Audio-Kontext und Hauptregler, nur wenn Ton an und schon geweckt
    kontext: () => (bereit() ? { ctx, haupt } : null),
    // Landungen
    landung(guete, kette) {
      if (!bereit()) return;
      if (guete === 'perfekt') {
        const basis = [523, 587, 659, 698, 784][Math.min(4, Math.max(0, kette - 1))];
        ton(basis, basis, 0.09, { typ: 'triangle', laut: 0.2 });
        ton(basis * 1.5, basis * 1.5, 0.16, { typ: 'triangle', laut: 0.18, start: 0.06 });
        ton(basis * 2, basis * 2, 0.2, { typ: 'sine', laut: 0.06, start: 0.12 });
        rausch(0.12, { laut: 0.06, f1: 1200, f2: 500 });
      } else if (guete === 'hart') {
        ton(150 * v(), 70, 0.16, { typ: 'triangle', laut: 0.3 });
        rausch(0.18, { laut: 0.16, typ: 'lowpass', f1: 900, f2: 200, q: 0.8 });
        ton(420, 300, 0.12, { typ: 'sine', laut: 0.06, start: 0.06 });
      } else {
        ton(200 * v(), 120, 0.09, { typ: 'sine', laut: 0.16 });
        rausch(0.09, { laut: 0.08, f1: 900, f2: 300 });
      }
    },
    // Letzte Sekunden Tageslicht: leise Glocke
    glocke(hoch) {
      if (!bereit()) return;
      const f = hoch ? 988 : 784;
      ton(f, f, 0.35, { typ: 'sine', laut: 0.08 });
      ton(f * 2.01, f * 2, 0.2, { typ: 'sine', laut: 0.02 });
    },
    // Muschel: helles „Pling“, das bei schnellen Serien Ton für Ton höher klettert
    muschel(gold) {
      if (!bereit()) return;
      const t = ctx.currentTime;
      serie = t - letzteMuschel < 0.7 ? Math.min(serie + 1, 7) : 0;
      letzteMuschel = t;
      const f = [1047, 1175, 1319, 1397, 1568, 1760, 1976, 2093][serie];
      if (gold) {
        [1319, 1568, 2093, 2637].forEach((g, i) => ton(g, g, 0.12, { typ: 'triangle', laut: 0.13, start: i * 0.05 }));
        ton(3136, 3136, 0.3, { typ: 'sine', laut: 0.05, start: 0.2 });
      } else {
        ton(f, f, 0.06, { typ: 'triangle', laut: 0.11 });
        ton(f * 2, f * 2, 0.1, { typ: 'sine', laut: 0.035, start: 0.03 });
      }
    },
    // Drücken: leises, tiefes „Wupp“ – Kalle macht sich schwer
    druck(boden) {
      if (!bereit()) return;
      ton(boden ? 200 : 260, boden ? 110 : 150, 0.07, { typ: 'sine', laut: 0.07 });
    },
    klick() { if (bereit()) ton(660, 660, 0.04, { typ: 'square', laut: 0.04 }); },
    start() { if (bereit()) { ton(392, 392, 0.08, { typ: 'triangle', laut: 0.16 }); ton(523, 523, 0.12, { typ: 'triangle', laut: 0.16, start: 0.08 }); } },
    // Ziel: kleine Dur-Fanfare
    sieg() {
      if (!bereit()) return;
      const noten = [[523, 0], [659, 0.1], [784, 0.2], [1047, 0.32], [880, 0.46], [1047, 0.56], [1319, 0.68]];
      noten.forEach(([f, st], i) => {
        const lang = i === noten.length - 1 ? 0.5 : 0.11;
        ton(f, f, lang, { typ: 'triangle', laut: 0.22, start: st });
        ton(f / 2, f / 2, lang, { typ: 'square', laut: 0.03, start: st });
      });
    },
    // Sonne weg: freundliches, müdes „Wah-wah“
    nacht() {
      if (!bereit()) return;
      ton(392, 370, 0.3, { typ: 'triangle', laut: 0.2 });
      ton(330, 247, 0.6, { typ: 'triangle', laut: 0.2, start: 0.3 });
    },
  };
})();
