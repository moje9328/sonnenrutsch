// ===================================================================
// 9 · APP
// Zustände: menue → bereit (Erklärung, wartet auf Drücken) → lauf →
// ende (Ausrollen) → Ergebnisfenster. pause liegt über bereit/lauf.
// Es gibt genau EINEN Game Loop (requestAnimationFrame). Die Physik läuft
// darin in festen Schritten von 1/240 s.
// ===================================================================

(() => {
  const $ = (id) => document.getElementById(id);
  const wurzel = document.documentElement;
  const leinwand = $('bild');
  const fenster = $('fenster');
  const SEKTIONEN = ['fStart', 'fKrabben', 'fLevel', 'fPause', 'fErfolg', 'fNacht', 'fEndlos'];

  let zustand = 'menue';
  let modus = 'strecke';        // 'strecke' | 'endlos'
  let lauf = null;
  let def = STRECKEN[0];
  let vorher = 'menue';         // für „Zurück“ aus der Krabbenwahl
  let endeZeit = 0;             // Sekunden seit Ende (für Ausrollen und Fenster)
  let halten = false;
  let rest = 0;                 // Physik-Zeitrest
  let letzte = 0;
  let glockeBei = 0;            // letzte Warnglocke (Sekunden Rest)
  let gedruecktSeit = 0;        // Zeit der letzten Ergebnisanzeige (Tasten-Sperre)
  const pose = { lauf: 0, platt: 0, jubelZeit: 0, verdutztZeit: 0, schwer: false };

  if (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window) wurzel.classList.add('touch');

  // ---------------------------------------------------------- Fenster
  function zeige(id) {
    for (const s of SEKTIONEN) $(s).hidden = s !== id;
    fenster.hidden = !id;
    fenster.querySelector('.tafel').classList.toggle('breit', id === 'fLevel');
    if (id) {
      // Dialogtitel für Screenreader verknüpfen – vorhandene ids nie umbenennen
      const t = $(id).querySelector('[data-titel]');
      if (t) { if (!t.id) t.id = id + 'Titel'; fenster.querySelector('.tafel').setAttribute('aria-labelledby', t.id); }
      const erst = $(id).querySelector('.btn.main') || $(id).querySelector('button');
      if (erst) setTimeout(() => erst.focus({ preventScroll: true }), 30);
    }
  }
  const fensterOffen = () => !fenster.hidden;
  function setzeZustand(z) { zustand = z; wurzel.dataset.zustand = z; }

  // ---------------------------------------------------------- Ton
  function tonKnoepfe() {
    for (const k of document.querySelectorAll('.js-ton')) {
      k.textContent = 'Ton: ' + (Ton.istAn() ? 'an' : 'aus');
      k.setAttribute('aria-pressed', Ton.istAn() ? 'true' : 'false');
    }
    $('tonKnopfHud').setAttribute('aria-pressed', Ton.istAn() ? 'true' : 'false');
  }
  function tonUmschalten() { Ton.setze(!Ton.istAn()); Speicher.setzeTon(Ton.istAn()); tonKnoepfe(); if (!Ton.istAn()) { Ton.still(); Rufe.stopp(); } }
  Ton.setze(Speicher.tonAn());
  tonKnoepfe();
  for (const k of document.querySelectorAll('.js-ton')) k.addEventListener('click', () => { tonUmschalten(); Ton.klick(); });

  // ---------------------------------------------------------- Strecke starten
  function starteStrecke(id) {
    modus = 'strecke';
    wurzel.dataset.modus = modus;
    def = STRECKEN.find(s => s.id === id) || STRECKEN[0];
    lauf = new Lauf(def);
    laufVorbereiten();
    $('hudNr').textContent = def.id;
    $('hudTitel').textContent = def.name;
    // Erklärung: ausführlich auf der Lernstrecke und beim allerersten Mal, sonst kurz
    const ausfuehrlich = def.lern || !Speicher.lernGesehen();
    $('erklTitel').textContent = def.lern ? 'LERNSTRECKE' : `STRECKE ${def.id} · ${def.name.toUpperCase()}`;
    $('erklListe').hidden = !ausfuehrlich;
    $('erklEndlos').hidden = true;
    ansage(`Strecke ${def.id}, ${def.name}. Gedrückt halten zum Losrutschen.`);
  }
  // Endlosflug: jedes Mal neue Landschaft (neue Saat) und eine zufällige Küste
  function starteEndlos() {
    modus = 'endlos';
    wurzel.dataset.modus = modus;
    const saat = (Math.random() * 1e9) >>> 0;
    def = Object.assign({}, ENDLOS_DEF, { saat, gebiet: saat % GEBIETE.length });
    if (window.__endlosSaat !== undefined) def = Object.assign(def, { saat: window.__endlosSaat, gebiet: window.__endlosSaat % GEBIETE.length });   // Tests
    lauf = new Lauf(def);
    laufVorbereiten();
    $('hudNr').textContent = '∞';
    $('hudTitel').textContent = 'Endlosflug';
    $('erklTitel').textContent = 'ENDLOSFLUG';
    $('erklEndlos').hidden = false;
    $('erklListe').hidden = Speicher.lernGesehen();
    $('rekordZahl').textContent = Speicher.endlosRekord().strecke + ' m';
    ansage('Endlosflug. Flieg dem Sonnenuntergang davon. Gedrückt halten zum Losrutschen.');
  }
  // Gemeinsamer Neustart: alles Laufbezogene zurücksetzen
  function laufVorbereiten() {
    Rufe.stopp();
    Grafik.neuerLauf();
    rest = 0;
    endeZeit = 0;
    glockeBei = 99;
    Object.assign(pose, { lauf: 0, platt: 0, jubelZeit: 0, verdutztZeit: 0, yippie: 0 });
    $('kette').hidden = true;
    $('bonus').classList.remove('zeigen');
    hudAlt = '';
    muschelAnzeige(true);
    hinweis(null);
    setzeZustand('bereit');
    zeige(null);
    Eingabe.alleLos();
    halten = false;
    leinwand.focus({ preventScroll: true });
  }
  function neustart() {
    if (zustand === 'menue' && !lauf) return;
    Ton.klick();
    if (modus === 'endlos') starteEndlos(); else starteStrecke(def.id);
  }

  // ---------------------------------------------------------- Eingabe
  const app = {
    gedrueckt() {
      if (!halten && zustand === 'lauf') Ton.druck(lauf.boden);
      halten = true;
      if (zustand === 'bereit' && !fensterOffen()) {
        lauf.starten();
        setzeZustand('lauf');
        Ton.start();
        if (def.lern || !Speicher.lernGesehen()) Speicher.setzeLernGesehen();
      }
    },
    losgelassen() { halten = Eingabe.gedrueckt(); },
    versteckt() { if (zustand === 'lauf' || zustand === 'bereit') pause(); },
    pauseTaste() {
      if (zustand === 'lauf' || zustand === 'bereit') { pause(); return true; }
      if (zustand === 'pause') { weiter(); return true; }
      return false;
    },
    fensterOffen,
    neustart() { if (['bereit', 'lauf', 'ende'].includes(zustand) || (zustand === 'ergebnis')) neustart(); },
    tonUmschalten,
  };
  Eingabe.init($('buehne'), app);

  // Knöpfe im HUD dürfen kein „Halten“ auslösen
  for (const id of ['neuKnopfHud', 'pauseKnopf', 'tonKnopfHud']) {
    $(id).addEventListener('pointerdown', (e) => e.stopPropagation());
  }
  $('neuKnopfHud').addEventListener('click', () => neustart());
  $('pauseKnopf').addEventListener('click', () => pause());
  $('tonKnopfHud').addEventListener('click', () => { tonUmschalten(); Ton.klick(); leinwand.focus({ preventScroll: true }); });

  function pause() {
    if (zustand !== 'lauf' && zustand !== 'bereit') return;
    vorher = zustand;
    setzeZustand('pause');
    Ton.still();
    Rufe.stopp();
    zeige('fPause');
  }
  function weiter() {
    if (zustand !== 'pause') return;
    zeige(null);
    setzeZustand(vorher);
    Eingabe.alleLos();
    halten = false;
    letzte = performance.now();
    leinwand.focus({ preventScroll: true });
  }
  $('weiterKnopf').addEventListener('click', weiter);
  $('neuKnopf').addEventListener('click', () => neustart());
  $('pauseLevelKnopf').addEventListener('click', () => { setzeZustand('menue'); levelWahl(); });

  // ---------------------------------------------------------- Menüs
  $('spielenKnopf').addEventListener('click', () => {
    Ton.wecke(); Ton.klick();
    // Erstes Mal: direkt auf die Lernstrecke
    if (!Speicher.level(1) && Speicher.hoechsteFreie() === 1) starteStrecke(1);
    else levelWahl();
  });
  $('endlosKnopf').addEventListener('click', () => { Ton.wecke(); Ton.klick(); starteEndlos(); });
  $('endlosNochmal').addEventListener('click', () => { Ton.klick(); starteEndlos(); });
  $('endlosMenue').addEventListener('click', () => { Ton.klick(); setzeZustand('menue'); startKrabbe(); zeige('fStart'); });
  $('levelZurueck').addEventListener('click', () => { Ton.klick(); zeige('fStart'); setzeZustand('menue'); });
  $('krabbeWahlKnopf').addEventListener('click', () => { Ton.klick(); krabbenWahl(); });
  $('krabbenFertig').addEventListener('click', () => { Ton.klick(); zeige('fStart'); startKrabbe(); });

  function startKrabbe() {
    krabbeInLeinwand($('startKrabbe'), { figur: Speicher.krabbe(), mund: 'lachen', schereAuf: true, schereHoch: true });
    const r = Speicher.endlosRekord();
    $('endlosRekordStart').hidden = !r.strecke;
    $('startRekord').textContent = `${r.strecke} m · ${r.punkte} Punkte`;
  }

  function krabbenWahl() {
    const liste = $('krabbenListe');
    liste.innerHTML = '';
    for (const name of KRABBEN_REIHE) {
      const k = KRABBEN[name];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'krabbenkarte';
      b.setAttribute('aria-pressed', Speicher.krabbe() === name ? 'true' : 'false');
      const cv = document.createElement('canvas');
      cv.width = 176; cv.height = 144;
      b.append(cv, Object.assign(document.createElement('span'), { textContent: k.name }), Object.assign(document.createElement('small'), { textContent: k.text }));
      krabbeInLeinwand(cv, { figur: name, mund: name === 'kalle' ? 'lachen' : undefined });
      b.addEventListener('click', () => {
        Speicher.setzeKrabbe(name); Ton.klick();
        for (const x of liste.children) x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
      });
      liste.append(b);
    }
    zeige('fKrabben');
  }

  const zeitText = (s) => {
    const m = Math.floor(s / 60), r = s - m * 60;
    return m > 0 ? `${m}:${r.toFixed(1).padStart(4, '0')}` : `${r.toFixed(1)} s`;
  };
  const sterneHtml = (n) => '★'.repeat(n) + '<i>' + '★'.repeat(3 - n) + '</i>';

  function levelWahl() {
    setzeZustand('menue');
    const box = $('gebietListe');
    box.innerHTML = '';
    GEBIETE.forEach((g, gi) => {
      const sek = document.createElement('section');
      sek.className = 'gebiet';
      sek.style.setProperty('--g', g.farbe);
      sek.innerHTML = `<h3>${g.name}</h3><p>${g.text}</p>`;
      const karten = document.createElement('div');
      karten.className = 'karten';
      for (const s of STRECKEN.filter(s => s.gebiet === gi)) {
        const frei = Speicher.frei(s.id);
        const e = Speicher.level(s.id);
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'karte';
        b.disabled = !frei;
        const cv = document.createElement('canvas');
        cv.width = 240; cv.height = 135;
        let best = 'Noch nicht gefahren';
        if (e && e.zeit) best = 'Bestzeit ' + zeitText(e.zeit);
        else if (e && e.weit) best = 'Weiteste: ' + Math.floor(e.weit * 100) + ' %';
        if (e && e.muscheln) best += ` · ${e.muscheln} Muscheln`;
        b.innerHTML = `<span class="nr">${s.lern ? 'LERNEN' : 'STRECKE ' + s.id}</span><span>${s.name}</span><span class="sterne" aria-label="${Speicher.sterne(s.id)} von 3 Sternen">${sterneHtml(Speicher.sterne(s.id))}</span><span class="best">${frei ? best : 'Gesperrt'}</span>`;
        b.prepend(cv);
        if (!frei) b.insertAdjacentHTML('beforeend', '<span class="schloss" aria-hidden="true"><svg><use href="#schloss"/></svg></span>');
        b.setAttribute('aria-label', `${s.name}, ${frei ? best : 'gesperrt – erst die Strecke davor schaffen'}`);
        Grafik.profil(cv, s);
        b.addEventListener('click', () => { Ton.wecke(); Ton.klick(); starteStrecke(s.id); });
        karten.append(b);
      }
      sek.append(karten);
      box.append(sek);
    });
    zeige('fLevel');
  }

  // ---------------------------------------------------------- Ergebnis
  function sterneFuer(d, zeit) {
    if (zeit <= d.sterne[1]) return 3;
    if (zeit <= d.sterne[0]) return 2;
    return 1;
  }
  function zeigeErfolg() {
    const st = lauf.statistik;
    const sterne = sterneFuer(def, lauf.zeit);
    const besser = Speicher.ziel(def.id, lauf.zeit, sterne);
    const e = Speicher.level(def.id);
    $('erfolgTitel').textContent = def.lern ? 'Lernstrecke geschafft!' : 'Geschafft!';
    const sprueche = ['Kalle gräbt sich zufrieden in den warmen Sand.', 'Pünktlich zum Sonnenuntergang am Strand!', 'Was für ein Ritt über die Hügel!', 'Die Möwen klatschen Beifall.'];
    $('erfolgSpruch').textContent = sterne === 3 ? 'Sonnenschnell! ' + sprueche[def.id % sprueche.length] : sprueche[def.id % sprueche.length];
    krabbeInLeinwand($('erfolgKrabbe'), { figur: Speicher.krabbe(), mund: 'jubel', schereAuf: true, schereHoch: true, tanzt: true });
    const spans = document.querySelectorAll('#fErfolg .sternreihe span');
    spans.forEach((s, i) => { s.classList.remove('an'); setTimeout(() => s.classList.toggle('an', i < sterne), 150 + i * 180); });
    $('sterneText').textContent = `${sterne} von 3 Sternen`;
    $('eZeit').textContent = zeitText(lauf.zeit);
    $('eRest').textContent = zeitText(lauf.rest);
    $('ePerfekt').textContent = st.perfekt + (st.kette > 1 ? ` (Kette ×${st.kette})` : '');
    $('eWeit').textContent = Math.round(st.weitester) + ' m';
    const mehrMuscheln = Speicher.muscheln(def.id, lauf.muschelWert);
    $('eMuscheln').textContent = muschelText() + (mehrMuscheln && lauf.muschelWert > 0 ? ' (Rekord!)' : '');
    $('eBest').textContent = zeitText(e.zeit);
    $('neuBest').hidden = !(besser.zeit && Speicher.level(def.id) && lauf.zeit <= e.zeit && (besser.sterne || besser.zeit) && !besser.neuFrei);
    $('sternInfo').textContent = sterne < 3 ? `${sterne + 1} Sterne ab ${zeitText(def.sterne[sterne === 1 ? 0 : 1])}.` : 'Alle Sterne geholt!';
    const naechste = STRECKEN.find(s => s.id === def.id + 1);
    $('weiterLevelKnopf').hidden = !naechste;
    if (!naechste) $('erfolgTitel').textContent = 'Alle Strecken geschafft!';
    zeige('fErfolg');
    if (!naechste) $('nochmalErfolgKnopf').focus({ preventScroll: true });
    ansage(`Geschafft in ${zeitText(lauf.zeit)}. ${sterne} von 3 Sternen.${besser.neuFrei ? ' Nächste Strecke freigeschaltet.' : ''}`);
  }
  function zeigeNacht() {
    const anteil = lauf.fortschritt;
    const alt = Speicher.level(def.id);
    const altWeit = alt && alt.weit ? alt.weit : 0;
    Speicher.weit(def.id, anteil);
    krabbeInLeinwand($('nachtKrabbe'), { figur: Speicher.krabbe(), mund: 'oh', blickHoch: true });
    $('nachtSpruch').textContent = anteil > 0.85 ? 'So knapp! Der Strand war schon zu sehen.' : anteil > 0.5 ? 'Mehr als die Hälfte – das klappt beim nächsten Mal!' : 'Kalle braucht mehr Schwung.';
    $('nAnteil').textContent = Math.floor(anteil * 100) + ' %';
    $('nRest').textContent = Math.max(0, Math.round(lauf.ziel - lauf.x)) + ' m';
    $('nPerfekt').textContent = lauf.statistik.perfekt;
    Speicher.muscheln(def.id, lauf.muschelWert);
    $('nMuscheln').textContent = muschelText();
    $('nBest').textContent = Math.floor(Math.max(altWeit, anteil) * 100) + ' %' + (anteil > altWeit + 0.001 && altWeit > 0 ? ' (neu!)' : '');
    const st = lauf.statistik;
    let tipp = 'Tipp: Bergab halten, vor dem Anstieg loslassen.';
    if (st.hart > st.perfekt) tipp = 'Tipp: In der Luft halten, damit Kalle flach auf einem Abhang landet – nicht gegen den nächsten Hügel.';
    else if (st.fluege < 4) tipp = 'Tipp: Lass früher los, dann trägt der Schwung Kalle über die Kuppen.';
    $('nachtTipp').textContent = tipp;
    zeige('fNacht');
    ansage(`Die Sonne ist untergegangen. ${Math.floor(anteil * 100)} Prozent geschafft.`);
  }
  // Ergebnis des Endlosflugs (Sonne untergegangen)
  function zeigeEndlos() {
    const st = lauf.statistik;
    const strecke = Math.floor(lauf.strecke), punkte = lauf.punkte;
    const alt = Speicher.endlosRekord();
    const neu = Speicher.endlosErgebnis(strecke, punkte);
    const r = Speicher.endlosRekord();
    krabbeInLeinwand($('endlosKrabbe'), { figur: Speicher.krabbe(), mund: neu.strecke ? 'jubel' : 'oh', schereHoch: neu.strecke, schereAuf: true, blickHoch: !neu.strecke });
    $('endlosSpruch').textContent = neu.strecke ? 'So weit ist Kalle noch nie geflogen!' : strecke > alt.strecke * 0.8 ? 'Knapp am Rekord vorbei!' : 'Saubere Landungen bringen Tageslicht.';
    $('enStrecke').textContent = strecke + ' m';
    $('enPunkte').textContent = punkte;
    $('enMuscheln').textContent = lauf.muschelWert;
    $('enPerfekt').textContent = st.perfekt;
    $('enBonus').textContent = '+' + Math.round(lauf.lichtBonus) + ' s';
    $('enRekord').textContent = r.strecke + ' m';
    $('enRekordPunkte').textContent = r.punkte;
    $('enNeu').hidden = !(neu.strecke || neu.punkte);
    $('enNeu').textContent = neu.strecke && neu.punkte ? 'NEUER REKORD: STRECKE UND PUNKTE!' : neu.strecke ? 'NEUER STRECKENREKORD!' : 'NEUER PUNKTEREKORD!';
    zeige('fEndlos');
    ansage(`Die Sonne ist untergegangen. ${strecke} Meter, ${punkte} Punkte.${neu.strecke ? ' Neuer Rekord.' : ''}`);
  }
  $('nochmalKnopf').addEventListener('click', () => { Ton.klick(); starteStrecke(def.id); });
  $('nachtLevelKnopf').addEventListener('click', () => { Ton.klick(); levelWahl(); });
  $('nochmalErfolgKnopf').addEventListener('click', () => { Ton.klick(); starteStrecke(def.id); });
  $('erfolgLevelKnopf').addEventListener('click', () => { Ton.klick(); levelWahl(); });
  $('weiterLevelKnopf').addEventListener('click', () => { Ton.klick(); starteStrecke(def.id + 1); });

  // ---------------------------------------------------------- Anzeige
  let hinweisText = null;
  function hinweis(t) {
    if (t === hinweisText) return;
    hinweisText = t;
    $('hinweis').hidden = !t;
    if (t) $('hinweis').textContent = t;
  }
  function ansage(t) { $('ansage').textContent = t; }
  let muschelAlt = -1;
  function muschelAnzeige(sofort) {
    if (lauf.muschelWert === muschelAlt && !sofort) return;
    muschelAlt = lauf.muschelWert;
    $('muschelZahl').textContent = lauf.muschelWert;
    $('hudMuscheln').setAttribute('aria-label', `${lauf.muschelWert} von ${lauf.muschelGesamt} Muscheln`);
    const el = $('hudMuscheln');
    if (!sofort) { el.classList.remove('plopp'); void el.offsetWidth; el.classList.add('plopp'); }
  }
  const muschelText = () => `${lauf.muschelWert} / ${lauf.muschelGesamt}`;
  let hudAlt = '';
  function hud() {
    const r = lauf.rest, f = lauf.fortschritt;
    const tagAnteil = Math.min(1, r / lauf.tag);
    const schluessel = Math.ceil(r * 10) + '|' + Math.floor(f * 400) + '|' + Math.floor(lauf.strecke) + '|' + lauf.punkte;
    if (schluessel === hudAlt) return;
    hudAlt = schluessel;
    if (modus === 'endlos') {
      $('punkteZahl').textContent = lauf.punkte;
      $('wegFuellung').style.width = (f * 100).toFixed(1) + '%';
      $('wegKrabbe').style.left = (f * 100).toFixed(1) + '%';
      $('wegText').textContent = Math.floor(lauf.strecke) + ' m';
      $('wegBalken').setAttribute('aria-valuenow', Math.floor(f * 100));
      $('wegBalken').setAttribute('aria-label', `Strecke ${Math.floor(lauf.strecke)} Meter, nächste Marke bei ${Math.round(lauf.marke)} Metern`);
      $('tagFuellung').style.width = (tagAnteil * 100).toFixed(1) + '%';
      $('tagText').textContent = Math.ceil(r) + ' s';
      $('tagBalken').setAttribute('aria-valuenow', Math.round(tagAnteil * 100));
      $('hudTag').classList.toggle('knapp', r < 8 && zustand === 'lauf');
      return;
    }
    $('tagFuellung').style.width = (tagAnteil * 100).toFixed(1) + '%';
    $('tagText').textContent = Math.ceil(r) + ' s';
    $('tagBalken').setAttribute('aria-valuenow', Math.round(tagAnteil * 100));
    $('hudTag').classList.toggle('knapp', r < 10 && zustand === 'lauf');
    $('wegFuellung').style.width = (f * 100).toFixed(1) + '%';
    $('wegKrabbe').style.left = (f * 100).toFixed(1) + '%';
    $('wegText').textContent = Math.floor(f * 100) + ' %';
    $('wegBalken').setAttribute('aria-valuenow', Math.floor(f * 100));
  }

  // ---------------------------------------------------------- Pose von Kalle
  function posenSchritt(dt) {
    const l = lauf;
    pose.platt = Math.max(0, pose.platt - dt * 5);
    pose.jubelZeit = Math.max(0, pose.jubelZeit - dt);
    pose.verdutztZeit = Math.max(0, pose.verdutztZeit - dt);
    pose.yippie = Math.max(0, (pose.yippie || 0) - dt);
    const schwer = halten && zustand === 'lauf';
    // Beine laufen, solange Kalle langsam am Boden ist; schnell = Beine angelegt
    if (l.boden && l.gestartet) pose.lauf += dt * Math.min(3.2, l.tempo * 0.35) * (l.tempo < 22 ? 1 : 0.25);
    const p = {
      lauf: pose.lauf,
      platt: pose.platt,
      schwer,
      jubel: pose.jubelZeit > 0 || (zustand === 'ende' && l.ergebnis === 'ziel'),
      armeHoch: (!l.boden && l.vy > 2 && !schwer) || pose.yippie > 0,
      blick: 0.6,
      blickHoch: false,
      schielen: pose.verdutztZeit > 0.25,
      mund: 'lachen',
      sandFarbe: THEMEN[def.gebiet].boden[0],
    };
    if (schwer) p.mund = 'entschlossen';
    else if (!l.boden) p.mund = l.vy > 0 ? 'jubel' : 'lachen';
    if (pose.jubelZeit > 0) p.mund = 'jubel';
    if (pose.verdutztZeit > 0) p.mund = 'verdutzt';
    if (zustand === 'ende' && l.ergebnis === 'ziel') { p.mund = 'jubel'; p.armeHoch = true; }
    if (l.ergebnis === 'nacht') { p.mund = 'oh'; p.blickHoch = true; }
    if (!l.gestartet) { p.blick = 0.9; p.mund = 'lachen'; }
    return p;
  }

  // ---------------------------------------------------------- Game Loop
  function rahmen(t) {
    requestAnimationFrame(rahmen);
    const dt = Math.min(0.1, Math.max(0, (t - letzte) / 1000));
    letzte = t;
    if (!lauf) { zeichneMenueHintergrund(dt); return; }
    const aktiv = zustand === 'lauf' || zustand === 'ende' || zustand === 'bereit';
    if (aktiv) {
      rest += dt * K.TEMPO;   // echte Zeit → Physikzeit
      let n = 0;
      while (rest >= K.SCHRITT && n < K.MAX_SCHRITTE) {
        lauf.schritt(zustand === 'lauf' && halten);
        rest -= K.SCHRITT; n++;
        for (const e of lauf.ereignisse) verarbeite(e);
        lauf.ereignisse.length = 0;
      }
      if (n >= K.MAX_SCHRITTE) rest = 0;
    }
    if (zustand === 'ende') {
      endeZeit += dt;
      if (endeZeit > (lauf.ergebnis === 'ziel' ? 1.6 : 1.5) && !fensterOffen()) {
        setzeZustand('ergebnis');
        Ton.still();
        Rufe.stopp();
        if (lauf.ergebnis === 'ziel') zeigeErfolg(); else if (modus === 'endlos') zeigeEndlos(); else zeigeNacht();
      }
    }
    // Lernhinweise an festen Stellen der Strecke
    if (zustand === 'lauf') {
      const h = lauf.hinweise.find(h => lauf.x >= h.x && lauf.x <= h.bis);
      hinweis(h ? h.text : null);
      // Warnglocke in den letzten Sekunden
      const r = Math.ceil(lauf.rest);
      if (r > 10) glockeBei = 99;   // nach einem Zeitbonus wieder warnen dürfen
      if (r <= 5 && r < glockeBei && r > 0) { glockeBei = r; Ton.glocke(r <= 3); }
      else if (r === 10 && glockeBei > 10) { glockeBei = 10; Ton.glocke(false); }
    } else if (zustand !== 'pause') hinweis(null);
    if (zustand === 'pause' || zustand === 'menue') Ton.still();
    else Ton.fahrt(lauf.tempo, lauf.boden, halten, zustand === 'lauf' || (zustand === 'ende' && lauf.tempo > 2));
    posenFuerBild = posenSchritt(zustand === 'pause' ? 0 : dt);
    // Himmel und Sonne hängen am selben Restwert wie die Tageslichtanzeige.
    // Nach Sonnenuntergang sinkt die Sonne noch ganz hinter den Horizont.
    // Endlos: voller Startvorrat = Mittag (blau/türkis), wenig = Gold/Koralle, kurz vor 0 = violett
    const f = modus === 'endlos' ? 1 - Math.min(1, lauf.rest / K.ENDLOS.START) : Math.min(1, 1 - lauf.rest / lauf.tag);
    const fSonne = lauf.ergebnis === 'nacht' ? 1 + Math.min(0.15, endeZeit * 0.12) : f;
    Grafik.zeichne(lauf, { dt: zustand === 'pause' ? 0 : dt, f, fSonne, figur: Speicher.krabbe(), pose: posenFuerBild, gebiet: def.gebiet });
    hud();
  }
  let posenFuerBild = null;

  function verarbeite(e) {
    Grafik.ereignis(e, lauf, THEMEN[def.gebiet]);
    if (e.art === 'abflug') Ton.abflug(e.v);
    else if (e.art === 'ruf') {
      // Nur aktuelle Rufe: Ereignisse werden im selben Bild verarbeitet, nichts wird nachgeholt
      Rufe.spiele(e.ruf);
      Grafik.ruf(e.ruf);
      pose.jubelZeit = e.ruf === 'yippie' ? 0.9 : 0.6;
      pose.yippie = e.ruf === 'yippie' ? 0.9 : 0;
    }
    else if (e.art === 'landung') {
      Ton.landung(e.guete, e.kette);
      pose.platt = e.guete === 'hart' ? 1 : e.guete === 'perfekt' ? 0.4 : 0.6;
      if (e.guete === 'perfekt') pose.jubelZeit = 0.5;
      if (e.guete === 'hart') pose.verdutztZeit = 0.7;
      const k = $('kette');
      if (e.kette > 1) { k.hidden = false; k.textContent = `PERFEKT ×${e.kette}`; }
      else if (e.guete !== 'perfekt') k.hidden = true;
    } else if (e.art === 'licht') {
      // Zeitgewinn kurz und verständlich anzeigen (gerundet auf halbe Sekunden)
      const plus = Math.round(e.plus * 2) / 2;
      if (plus > 0) bonusZeigen(`+${String(plus).replace('.', ',')} s Tageslicht${e.grund === 'perfekt' ? ' · Perfekt' : ''}`);
    } else if (e.art === 'marke') {
      Ton.marke();
      Grafik.weltText(e.x, lauf.g.hoehe(e.x) + 10, `${Math.round(e.x)} m!`, '#9fe7c4');
    } else if (e.art === 'muschel') {
      Ton.muschel(e.gold);
      muschelAnzeige(false);
    } else if (e.art === 'ziel') {
      setzeZustand('ende'); endeZeit = 0; Ton.sieg(); hinweis(null);
      $('kette').hidden = true;
    } else if (e.art === 'nacht') {
      setzeZustand('ende'); endeZeit = 0; Ton.nacht(); hinweis(null);
      $('kette').hidden = true;
    }
  }

  let bonusUhr = 0;
  function bonusZeigen(text) {
    const b = $('bonus');
    b.textContent = text;
    b.classList.add('zeigen');
    clearTimeout(bonusUhr);
    bonusUhr = setTimeout(() => b.classList.remove('zeigen'), 1400);
  }

  // Hinter dem Startmenü fährt ein Bot die Lernstrecke (lebendiger Hintergrund)
  let vorfuehrung = null, vorfuehrBot = null;
  function zeichneMenueHintergrund(dt) {
    if (!vorfuehrung || vorfuehrung.ergebnis) {
      vorfuehrung = new Lauf(STRECKEN[1]);
      vorfuehrung.starten();
      vorfuehrung.tag = 9999;
      vorfuehrBot = Bot.neu('schnell');
      Grafik.neuerLauf();
    }
    rest += dt * K.TEMPO;   // echte Zeit → Physikzeit
    let n = 0;
    while (rest >= K.SCHRITT && n < K.MAX_SCHRITTE) {
      vorfuehrung.schritt(vorfuehrBot.halten(vorfuehrung)); rest -= K.SCHRITT; n++;
      for (const e of vorfuehrung.ereignisse) Grafik.ereignis(e, vorfuehrung, THEMEN[0]);
      vorfuehrung.ereignisse.length = 0;
    }
    if (n >= K.MAX_SCHRITTE) rest = 0;
    const f = Math.min(0.9, (vorfuehrung.x / vorfuehrung.ziel) * 0.9);
    Grafik.zeichne(vorfuehrung, { dt, f, figur: Speicher.krabbe(), pose: { lauf: 0, platt: 0, schwer: vorfuehrBot.letzte, mund: vorfuehrBot.letzte ? 'entschlossen' : 'lachen', blick: 0.6 }, gebiet: 0 });
  }

  // ---------------------------------------------------------- Start
  Grafik.init(leinwand);
  // Platz der Anzeige oben an die Kamera melden (Kalle soll nie dahinter fliegen)
  function randMessen() { const r = $('hud').getBoundingClientRect(), b = $('buehne').getBoundingClientRect(); Grafik.setzeRandOben(Math.max(0, r.bottom - b.top) + 6); }
  window.addEventListener('resize', () => { Grafik.groesse(); randMessen(); });
  randMessen();
  setzeZustand('menue');
  startKrabbe();
  zeige('fStart');
  requestAnimationFrame((t) => { letzte = t; requestAnimationFrame(rahmen); });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !/^(127\.|localhost)/.test(location.hostname)) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // Schnittstelle für die automatischen Browser-Tests
  window.__sonne = {
    zustand: () => zustand,
    lauf: () => lauf,
    starte: (id) => starteStrecke(id),
    starteEndlos: () => starteEndlos(),
    modus: () => modus,
    himmel: () => ({ f: Grafik.letztesF, sonne: Grafik.sonneF }),
    def: () => def,
    kamera: () => ({ x: Grafik.kam.x, b: Grafik.kam.b, z: Grafik.kam.z }),
    krabbeImBild: () => Grafik.krabbeImBild(lauf),
    bodenImBild: (x) => Grafik.bodenImBild(lauf, x),
    speicher: Speicher,
  };
})();
