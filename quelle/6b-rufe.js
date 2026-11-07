// ===================================================================
// 6b · RUFE (Stimme)
// Austauschbare Audioanbindung für Kalles „Juhu!“ und „Yippie!“.
// Quellen, in dieser Reihenfolge:
//   1. Sprachclips (RUF_CLIPS, z. B. 'rufe/juhu.mp3'). Aktuell sind KEINE
//      Clips eingebunden – die Liste ist leer. Wer Clips hinzufügt, trägt
//      die Pfade ein; fehlt eine Datei oder lädt sie nicht, wird die
//      nächste Quelle genommen.
//   2. Synthetische Comic-Stimme mit Web Audio (Standard): Sägezahn durch
//      Vokalfilter mit Vibrato, je Silbe eigene Tonhöhe. Kein Netz, keine Kosten.
//   3. Optional: Browser-Sprachausgabe (RUF_BROWSER_SPRACHE = true). Standard
//      aus, weil Verzögerung und Stimme je Gerät stark schwanken.
// Regeln: nur nach Nutzeraktion (Ton.wecke), nur wenn Ton an ist, nie zwei
// Rufe übereinander, stopp() bricht laufende Rufe sofort ab (Pause, Neustart).
// ===================================================================

const RUF_CLIPS = {};                 // z. B. { juhu: 'rufe/juhu.mp3', yippie: 'rufe/yippie.mp3' }
const RUF_BROWSER_SPRACHE = false;

const Rufe = (() => {
  const clips = {};                   // geladene AudioBuffer
  let laedt = false;
  let aktiv = [];                     // laufende Knoten (zum Abbrechen)
  let bisZeit = 0;                    // AudioContext-Zeit, bis der aktuelle Ruf dauert

  function clipsLaden(ctx) {
    if (laedt) return;
    laedt = true;
    for (const [name, pfad] of Object.entries(RUF_CLIPS)) {
      try {
        fetch(pfad).then(a => a.ok ? a.arrayBuffer() : Promise.reject())
          .then(b => ctx.decodeAudioData(b)).then(buf => { clips[name] = buf; }).catch(() => {});
      } catch (e) { /* ohne Clips weiter */ }
    }
  }

  // Eine Silbe der Comic-Stimme: tonhoehen [[zeit, Hz], …], formanten [F1, F2]
  function silbe(ctx, ziel, start, dauer, tonhoehen, formanten, laut) {
    const t = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(tonhoehen[0][1], t);
    for (const [dt, f] of tonhoehen.slice(1)) osc.frequency.linearRampToValueAtTime(f, t + dt);
    const vib = ctx.createOscillator(), vibG = ctx.createGain();
    vib.frequency.value = 10; vibG.gain.value = tonhoehen[0][1] * 0.03;
    vib.connect(vibG).connect(osc.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(laut, t + 0.02);
    g.gain.setValueAtTime(laut, t + dauer * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    for (const [f, q, anteil] of [[formanten[0], 5, 1], [formanten[1], 8, 0.6]]) {
      const fil = ctx.createBiquadFilter(); fil.type = 'bandpass'; fil.frequency.value = f; fil.Q.value = q;
      const ga = ctx.createGain(); ga.gain.value = anteil * 2.2;
      osc.connect(fil).connect(ga).connect(g);
    }
    g.connect(ziel);
    osc.start(t); vib.start(t);
    osc.stop(t + dauer + 0.05); vib.stop(t + dauer + 0.05);
    aktiv.push(osc, vib);
    osc.onended = () => { aktiv = aktiv.filter(n => n !== osc && n !== vib); };
  }
  // Kurzer Luft-/Konsonantenhauch („h“, „p“)
  function hauch(ctx, ziel, start, dauer, freq, laut) {
    const t = ctx.currentTime + start;
    const len = Math.floor(ctx.sampleRate * dauer);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const fil = ctx.createBiquadFilter(); fil.type = 'highpass'; fil.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = laut;
    src.connect(fil).connect(g).connect(ziel);
    src.start(t);
    aktiv.push(src);
  }

  function synth(ctx, ziel, ruf) {
    const p = 0.95 + Math.random() * 0.1;
    if (ruf === 'juhu') {
      // „ju“ kurz, „huu“ länger und fröhlich steigend
      silbe(ctx, ziel, 0, 0.11, [[0, 620 * p], [0.1, 760 * p]], [520, 1900], 0.16);
      hauch(ctx, ziel, 0.11, 0.05, 2200, 0.05);
      silbe(ctx, ziel, 0.14, 0.36, [[0, 720 * p], [0.12, 980 * p], [0.36, 1180 * p]], [480, 1500], 0.17);
      return 0.55;
    }
    // „Yip-pi-iieh!“: hoch, schnell, am Ende ein langer jubelnder Bogen nach oben
    silbe(ctx, ziel, 0, 0.1, [[0, 820 * p], [0.1, 1000 * p]], [420, 2700], 0.16);
    hauch(ctx, ziel, 0.1, 0.03, 3000, 0.07);
    silbe(ctx, ziel, 0.13, 0.08, [[0, 1100 * p], [0.08, 1180 * p]], [420, 2800], 0.15);
    silbe(ctx, ziel, 0.23, 0.48, [[0, 1150 * p], [0.15, 1450 * p], [0.35, 1600 * p], [0.48, 1850 * p]], [400, 2900], 0.18);
    return 0.75;
  }

  function sprache(ruf) {
    try {
      if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return false;
      const u = new SpeechSynthesisUtterance(ruf === 'juhu' ? 'Juhu!' : 'Jippie!');
      u.lang = 'de-DE'; u.pitch = 2; u.rate = 1.3; u.volume = 0.8;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  }

  return {
    // Spielt einen Ruf, wenn gerade keiner läuft. Rückgabe: welche Quelle (für Tests)
    spiele(ruf) {
      const k = Ton.kontext();
      if (!k) return null;                       // Ton aus oder noch keine Nutzeraktion
      const { ctx, haupt } = k;
      clipsLaden(ctx);
      if (ctx.currentTime < bisZeit) return null; // nie übereinander
      if (clips[ruf]) {
        const src = ctx.createBufferSource(); src.buffer = clips[ruf];
        const g = ctx.createGain(); g.gain.value = 0.9;
        src.connect(g).connect(haupt); src.start();
        aktiv.push(src);
        bisZeit = ctx.currentTime + clips[ruf].duration;
        return 'clip';
      }
      if (RUF_BROWSER_SPRACHE && sprache(ruf)) { bisZeit = ctx.currentTime + 0.8; return 'browser'; }
      bisZeit = ctx.currentTime + synth(ctx, haupt, ruf);
      return 'synth';
    },
    // Laufende Rufe sofort beenden (Pause, Neustart, Tabwechsel, Ergebnis)
    stopp() {
      for (const n of aktiv) { try { n.stop(); } catch (e) { /* schon beendet */ } }
      aktiv = [];
      bisZeit = 0;
      try { if (RUF_BROWSER_SPRACHE && 'speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (e) { /* egal */ }
    },
    laeuft: () => aktiv.length,
    quelle: () => (Object.keys(RUF_CLIPS).length ? 'clip (falls geladen), sonst synth' : RUF_BROWSER_SPRACHE ? 'browser, sonst synth' : 'synth'),
  };
})();
