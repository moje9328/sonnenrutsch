// ===================================================================
// 6 · TON
// Eigene kurze Geräusche mit Web Audio, keine Dateien. Startet erst nach
// einer Nutzeraktion und ist abschaltbar. Bewusst ohne Rauschen.
// ===================================================================

const Ton = (() => {
  let ctx = null, haupt = null, stummAudio = null;
  let an = true;

  // iPhone: Web-Audio ist bei aktivem Stumm-Schalter sonst stumm. „playback“ stellt die Audio-Sitzung wie bei
  // einem Musikplayer ein (Safari ab 16.4). Ältere iOS-Versionen: ein unhörbarer Dauerton über ein Audio-Element.
  function sitzung() {
    try {
      if (navigator.audioSession) { navigator.audioSession.type = 'playback'; return; }
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (!ios) return;
      if (!stummAudio) {
        // 0,25 s Stille als WAV (8 kHz, 8 Bit)
        const n = 2000, b = new Uint8Array(44 + n);
        const w = (o, t) => { for (let i = 0; i < t.length; i++) b[o + i] = t.charCodeAt(i); };
        const d = new DataView(b.buffer);
        w(0, 'RIFF'); d.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true);
        d.setUint32(24, 8000, true); d.setUint32(28, 8000, true); d.setUint16(32, 1, true); d.setUint16(34, 8, true); w(36, 'data'); d.setUint32(40, n, true);
        b.fill(128, 44);
        let bin = ''; for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
        stummAudio = new Audio('data:audio/wav;base64,' + btoa(bin));
        stummAudio.loop = true; stummAudio.volume = 0.01;
        stummAudio.setAttribute('playsinline', '');
      }
      stummAudio.play().catch(() => {});
    } catch (e) { /* egal */ }
  }

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
        haupt.gain.value = 0.8;   // Handy-Lautsprecher sind leise: etwas mehr Grundlautstärke (der Kompressor fängt Spitzen ab)
        haupt.connect(komp).connect(ctx.destination);
      }
      // Auch „interrupted“ (iOS nach Anruf/Appwechsel) wieder aufwecken, nicht nur „suspended“
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      sitzung();
    } catch (e) { ctx = null; }
  }
  const bereit = () => an && ctx && ctx.state === 'running';

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
  const v = () => 1 + (Math.random() * 2 - 1) * 0.05;

  let letzteMuschel = 0, serie = 0;

  return {
    wecke,
    istAn: () => an,
    status: () => ({ kontext: ctx ? ctx.state : 'keiner', an }),   // für Tests
    setze(wert) {
      an = !!wert;
      if (an) wecke();
      else { if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); if (stummAudio) stummAudio.pause(); }
    },
    // Kein Rutsch- oder Windrauschen mehr (Wunsch: Rauschen entfernt). Bleibt als leere
    // Schnittstelle, damit der restliche Code unverändert bleibt.
    fahrt() {},
    still() {},
    // Absprung: kurzes Fahrtwind-„Hui“ (die Stimme kommt aus 6b-rufe.js)
    abflug(tempo) {
      if (!bereit()) return;
      const s = Math.min(1, tempo / 80);
      ton(320 + s * 200, 700 + s * 500, 0.2, { typ: 'sine', laut: 0.07 });
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
      } else if (guete === 'hart') {
        ton(150 * v(), 70, 0.16, { typ: 'triangle', laut: 0.3 });
        ton(420, 300, 0.12, { typ: 'sine', laut: 0.06, start: 0.06 });
      } else {
        ton(200 * v(), 120, 0.09, { typ: 'sine', laut: 0.16 });
      }
    },
    // Sprungfläche: federndes „Boing!“ (Ton fällt kurz, steigt dann wippend an)
    boing(tempo) {
      if (!bereit()) return;
      const s = Math.min(1, (tempo || 80) / 140);
      ton(170, 330 + s * 90, 0.07, { typ: 'sine', laut: 0.18 });
      ton(330 + s * 90, 760 + s * 160, 0.16, { typ: 'sine', laut: 0.17, start: 0.06 });
      ton(760 + s * 160, 420, 0.14, { typ: 'sine', laut: 0.08, start: 0.2 });
      ton(1020, 1500, 0.1, { typ: 'triangle', laut: 0.04, start: 0.05 });
    },
    // Reihe vollständig: kleines aufsteigendes Dreiklang-Funkeln
    reihe() {
      if (!bereit()) return;
      [1319, 1568, 2093].forEach((f, i) => ton(f, f, 0.11, { typ: 'triangle', laut: 0.1, start: i * 0.06 }));
    },
    // Distanzmarke erreicht: helles, freundliches Zwei-Ton-Signal
    marke() {
      if (!bereit()) return;
      ton(784, 784, 0.12, { typ: 'triangle', laut: 0.16 });
      ton(1175, 1175, 0.25, { typ: 'triangle', laut: 0.16, start: 0.1 });
      ton(2350, 2350, 0.2, { typ: 'sine', laut: 0.03, start: 0.12 });
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
