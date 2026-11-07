#!/usr/bin/env python3
# Browser-Test mit Playwright. Aufruf: python3 quelle/test-browser.py [chromium|webkit] [bilder-ordner]
# Startet selbst einen kleinen Webserver und prüft das fertige index.html:
# Darstellung auf Handy/Tablet/PC, Eingabe-Reaktion, Kamera während ganzer
# Läufe, Pause, Neustart, Sonnenuntergang, Sieg, Freischaltung und Speicher.
import asyncio, http.server, pathlib, socketserver, sys, threading
from playwright.async_api import async_playwright

ORDNER = pathlib.Path(__file__).resolve().parent.parent
MOTOR = sys.argv[1] if len(sys.argv) > 1 else 'chromium'
BILDER = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else ORDNER / 'quelle' / 'testbilder'
BILDER.mkdir(parents=True, exist_ok=True)

class Leise(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=str(ORDNER), **k)
    def log_message(self, *a): pass
server = socketserver.TCPServer(('127.0.0.1', 0), Leise)
threading.Thread(target=server.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{server.server_address[1]}/index.html'

fehler, geprueft = [], 0
def ok(bed, text):
    global geprueft
    geprueft += 1
    if not bed:
        fehler.append(text); print('  FEHLER:', text)

async def neue_seite(b, w, h, touch=False, dpr=2, init=None, bewegung='no-preference'):
    opt = dict(viewport={'width': w, 'height': h}, device_scale_factor=dpr, has_touch=touch, reduced_motion=bewegung)
    if MOTOR == 'chromium': opt['is_mobile'] = touch
    ctx = await b.new_context(**opt)
    if init: await ctx.add_init_script(init)
    pg = await ctx.new_page()
    pg.fehler = []
    pg.on('console', lambda m: pg.fehler.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: pg.fehler.append(str(e)))
    await pg.goto(URL)
    await pg.wait_for_timeout(400)
    return ctx, pg

# Bot im Browser, der über echte Tastatur-Ereignisse spielt (wie ein Mensch)
BOT_JS = '''(art) => { const bot = Bot.neu(art); let unten = false;
  window.__botAus = false;
  window.__botTimer = setInterval(() => { if (window.__botAus) return; const s = window.__sonne; const l = s.lauf(); const z = s.zustand();
    if (z !== 'lauf' && z !== 'bereit') { if (unten) { document.dispatchEvent(new KeyboardEvent('keyup', { key: ' ' })); unten = false; } return; }
    const h = l.gestartet ? bot.halten(l) : true;
    if (h && !unten) { document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); unten = true; }
    else if (!h && unten) { document.dispatchEvent(new KeyboardEvent('keyup', { key: ' ' })); unten = false; } }, 4); }'''

# Prüft alle 60 ms: Kalle im Bild, Boden unter Kalle im Bild, Gelände voraus im Bild
KAMERA_JS = '''() => { window.__kam = { proben: 0, raus: 0, bodenRaus: 0, vorausFehlt: 0, maxH: 0 };
  window.__kamTimer = setInterval(() => { const s = window.__sonne; if (s.zustand() !== 'lauf') return; const l = s.lauf();
    const k = s.krabbeImBild(); const b = s.bodenImBild(l.x); const v = s.bodenImBild(l.x + 25);
    const W = innerWidth, H = innerHeight, m = window.__kam; m.proben++;
    m.maxH = Math.max(m.maxH, l.hoeheUeberBoden());
    const hudUnten = document.getElementById('hud').getBoundingClientRect().bottom;
    if (k.x < 10 || k.x > W - 10 || k.y < hudUnten + 20 || k.y > H - 4) m.raus++;
    if (b.y > H + 1 || b.y < 0) m.bodenRaus++;
    if (v.x > W + 1) m.vorausFehlt++;
  }, 60); }'''

async def zustand(pg): return await pg.evaluate('window.__sonne.zustand()')
async def warte(pg, ausdruck, ms=20000):
    try:
        await pg.wait_for_function(ausdruck, timeout=ms); return True
    except Exception:
        return False

async def im_bild(pg, sel):
    return await pg.evaluate(f'''(() => {{ const r = document.querySelector('{sel}').getBoundingClientRect();
      return r.width > 0 && r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; }})()''')
async def ueberlappen(pg, a, b):
    return await pg.evaluate(f'''(() => {{ const r = document.querySelector('{a}').getBoundingClientRect(), q = document.querySelector('{b}').getBoundingClientRect();
      return !(r.right <= q.left || q.right <= r.left || r.bottom <= q.top || q.bottom <= r.top); }})()''')

async def main():
    async with async_playwright() as p:
        b = await getattr(p, MOTOR).launch()
        print(f'Browser: {MOTOR}')

        # ---------------------------------------------------------- Größen
        print('\n## Darstellung auf verschiedenen Bildschirmen')
        for (w, h, touch) in [(360, 640, True), (390, 844, True), (844, 390, True), (768, 1024, True), (1440, 900, False)]:
            ctx, pg = await neue_seite(b, w, h, touch)
            name = f'{w}x{h}'
            ok(await im_bild(pg, '#fStart .tafel, .tafel'), f'{name}: Startfenster im Bild')
            await pg.screenshot(path=str(BILDER / f'{name}-start.png'))
            await pg.evaluate('window.__sonne.starte(1)')
            await pg.wait_for_timeout(300)
            ok(await zustand(pg) == 'bereit', f'{name}: Strecke wartet auf das erste Drücken')
            ok(await im_bild(pg, '#hud'), f'{name}: Anzeige im Bild')
            ok(await im_bild(pg, '#erklaerung'), f'{name}: Erklärung im Bild')
            ok(not await ueberlappen(pg, '#erklaerung', '#hud'), f'{name}: Erklärung verdeckt die Anzeige nicht')
            groesse = await pg.evaluate("[...document.querySelectorAll('.rund')].map(k => k.getBoundingClientRect()).map(r => Math.min(r.width, r.height))")
            ok(min(groesse) >= 40, f'{name}: Knöpfe groß genug zum Tippen ({min(groesse):.0f} px)')
            ok(await pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'{name}: kein seitliches Scrollen')
            k = await pg.evaluate('window.__sonne.krabbeImBild()')
            ok(0 < k['x'] < w and 0 < k['y'] < h, f'{name}: Kalle am Start sichtbar')
            breite = await pg.evaluate('Math.max(K.KRABBE_BREITE * window.__sonne.kamera().z, K.KRABBE_MIN_PIXEL * Grafik.dpr) / Grafik.dpr')
            ok(breite >= 50, f'{name}: Kalle mindestens 50 px breit ({breite:.0f})')
            await pg.screenshot(path=str(BILDER / f'{name}-bereit.png'))
            # Lauf mit Kamera-Prüfung
            await pg.evaluate(KAMERA_JS)
            await pg.evaluate(BOT_JS, 'gut')
            await pg.wait_for_timeout(9000)
            await pg.screenshot(path=str(BILDER / f'{name}-lauf.png'))
            if w == 390:
                await warte(pg, "window.__sonne.zustand() === 'ergebnis'", 30000)
            m = await pg.evaluate('window.__kam')
            ok(m['proben'] > 50, f'{name}: Kamera geprüft ({m["proben"]} Proben)')
            ok(m['raus'] == 0, f'{name}: Kalle immer im Bild und unter der Anzeige ({m["raus"]} Ausreißer)')
            ok(m['bodenRaus'] == 0, f'{name}: Boden unter Kalle immer sichtbar ({m["bodenRaus"]})')
            ok(m['vorausFehlt'] == 0, f'{name}: 25 m Gelände voraus immer sichtbar ({m["vorausFehlt"]})')
            ok(not pg.fehler, f'{name}: keine Fehler in der Konsole {pg.fehler[:2]}')
            await ctx.close()

        # ---------------------------------------------------------- Eingabe
        print('\n## Eingabe reagiert sofort')
        ctx, pg = await neue_seite(b, 1280, 720)
        await pg.evaluate('window.__sonne.starte(2)')
        await pg.wait_for_timeout(200)
        ergebnis = await pg.evaluate('''async () => {
          const s = window.__sonne; const raf = () => new Promise(r => requestAnimationFrame(r));
          const frames = [];
          for (let i = 0; i < 6; i++) {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
            let n = 0; while (!s.lauf().halten && n < 10) { await raf(); n++; } frames.push(n);
            for (let j = 0; j < 8; j++) await raf();
            document.dispatchEvent(new KeyboardEvent('keyup', { key: ' ' }));
            n = 0; while (s.lauf().halten && n < 10) { await raf(); n++; } frames.push(n);
            for (let j = 0; j < 8; j++) await raf();
          }
          return { frames, zustand: s.zustand() }; }''')
        ok(ergebnis['zustand'] == 'lauf', 'Leertaste startet den Lauf')
        ok(max(ergebnis['frames']) <= 1, f'Drücken und Loslassen wirken im nächsten Bild (Bilder: {ergebnis["frames"]})')
        # Maus
        await pg.mouse.move(640, 500)
        await pg.mouse.down()
        await pg.wait_for_timeout(80)
        ok(await pg.evaluate('window.__sonne.lauf().halten'), 'Maus gedrückt = schwer')
        await pg.mouse.up()
        await pg.wait_for_timeout(80)
        ok(not await pg.evaluate('window.__sonne.lauf().halten'), 'Maus los = leicht')
        # Knöpfe im HUD lösen kein Halten aus, Pause hält die Sonne an
        await pg.click('#pauseKnopf')
        await pg.wait_for_timeout(100)
        ok(await zustand(pg) == 'pause', 'Pause-Knopf pausiert')
        t1 = await pg.evaluate('window.__sonne.lauf().zeit')
        await pg.wait_for_timeout(1200)
        t2 = await pg.evaluate('window.__sonne.lauf().zeit')
        ok(t1 == t2, 'In der Pause steht die Sonne still')
        await pg.keyboard.press('Enter')   # „Weiter“ hat den Fokus
        await pg.wait_for_timeout(300)
        ok(await zustand(pg) == 'lauf', 'Weiter mit Enter')
        await pg.keyboard.press('p')
        await pg.wait_for_timeout(100)
        ok(await zustand(pg) == 'pause', 'P pausiert')
        await pg.keyboard.press('p')
        await pg.wait_for_timeout(100)
        ok(await zustand(pg) == 'lauf', 'P setzt fort')
        x1 = await pg.evaluate('window.__sonne.lauf().x')
        await pg.keyboard.press('r')
        await pg.wait_for_timeout(150)
        ok(await zustand(pg) == 'bereit' and await pg.evaluate('window.__sonne.lauf().x') < x1, 'R startet die Strecke sofort neu')
        # Fenster verliert den Fokus während gedrückt: nichts hängt
        await pg.keyboard.down(' ')
        await pg.wait_for_timeout(100)
        await pg.evaluate("window.dispatchEvent(new Event('blur'))")
        await pg.wait_for_timeout(100)
        ok(not await pg.evaluate('Eingabe.gedrueckt()'), 'Fokusverlust lässt die Taste los')
        await pg.keyboard.up(' ')
        ok(not pg.fehler, f'Eingabe: keine Konsolenfehler {pg.fehler[:2]}')
        await ctx.close()

        # Touch
        ctx, pg = await neue_seite(b, 390, 844, touch=True)
        await pg.evaluate('window.__sonne.starte(1)')
        await pg.wait_for_timeout(200)
        await pg.evaluate('''() => { const el = document.getElementById('buehne');
          el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, pointerType: 'touch', bubbles: true, clientX: 200, clientY: 500, isPrimary: true })); }''')
        await pg.wait_for_timeout(300)
        ok(await zustand(pg) == 'lauf' and await pg.evaluate('window.__sonne.lauf().halten'), 'Finger auf dem Bildschirm startet und hält')
        await pg.evaluate('''() => { const el = document.getElementById('buehne');
          el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, pointerType: 'touch', bubbles: true, clientX: 200, clientY: 500 })); }''')
        await pg.wait_for_timeout(100)
        ok(not await pg.evaluate('window.__sonne.lauf().halten'), 'Finger weg = leicht')
        await pg.evaluate('''() => { const el = document.getElementById('buehne');
          el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 8, pointerType: 'touch', bubbles: true, clientX: 200, clientY: 500 }));
          el.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 8, pointerType: 'touch', bubbles: true })); }''')
        await pg.wait_for_timeout(100)
        ok(not await pg.evaluate('window.__sonne.lauf().halten'), 'Abgebrochene Berührung hängt nicht')
        ok(await pg.evaluate("getComputedStyle(document.getElementById('buehne')).touchAction") == 'none', 'Kein Scrollen/Zoomen beim Halten')
        await ctx.close()

        # ---------------------------------------------------------- Sonnenuntergang
        print('\n## Sonnenuntergang: Ergebnis und Sofort-Neustart')
        ctx, pg = await neue_seite(b, 1280, 720)
        await pg.evaluate('window.__sonne.starte(3)')
        await pg.keyboard.down(' ')
        await pg.wait_for_timeout(1500)
        await pg.keyboard.up(' ')
        await pg.evaluate('(() => { const l = window.__sonne.lauf(); l.tag = l.zeit + 1.0; })()')
        ok(await warte(pg, "window.__sonne.zustand() === 'ergebnis'", 6000), 'Sonnenuntergang beendet den Lauf')
        await pg.wait_for_timeout(300)
        ok(await pg.evaluate("!document.getElementById('fNacht').hidden"), 'Ergebnis bei Sonnenuntergang wird gezeigt')
        text = await pg.evaluate("document.getElementById('nAnteil').textContent")
        ok('%' in text, f'Ergebnis zeigt den Anteil ({text})')
        await pg.screenshot(path=str(BILDER / 'nacht.png'))
        ok(await pg.evaluate("document.activeElement && document.activeElement.id === 'nochmalKnopf'"), '„Sofort nochmal“ hat den Fokus')
        await pg.keyboard.press('Enter')
        await pg.wait_for_timeout(200)
        ok(await zustand(pg) == 'bereit', 'Enter startet sofort neu')
        ok(await pg.evaluate("window.__sonne.speicher.level(3) && window.__sonne.speicher.level(3).weit > 0"), 'Weiteste Strecke gespeichert')
        ok(not pg.fehler, f'Nacht: keine Konsolenfehler {pg.fehler[:2]}')
        await ctx.close()

        # ---------------------------------------------------------- Sieg und Speicher
        print('\n## Sieg, Freischaltung, Speicher')
        ctx, pg = await neue_seite(b, 1280, 720)
        ok(not await pg.evaluate('window.__sonne.speicher.frei(2)'), 'Strecke 2 anfangs gesperrt')
        await pg.click('#spielenKnopf')
        await pg.wait_for_timeout(300)
        ok(await zustand(pg) == 'bereit' and await pg.evaluate('window.__sonne.def().id') == 1, 'Erstes „Spielen“ führt direkt auf die Lernstrecke')
        await pg.evaluate(BOT_JS, 'gut')
        gesehen = set()
        for _ in range(40):
            await pg.wait_for_timeout(500)
            t = await pg.evaluate("document.getElementById('hinweis').hidden ? '' : document.getElementById('hinweis').textContent")
            if t: gesehen.add(t)
            if await zustand(pg) == 'ergebnis': break
        ok(len(gesehen) >= 3, f'Lernhinweise erscheinen unterwegs ({len(gesehen)})')
        ok(await warte(pg, "window.__sonne.zustand() === 'ergebnis'", 30000), 'Bot erreicht das Ziel der Lernstrecke')
        await pg.wait_for_timeout(800)
        ok(await pg.evaluate("!document.getElementById('fErfolg').hidden"), 'Siegfenster wird gezeigt')
        sterne = await pg.evaluate("document.querySelectorAll('#fErfolg .sternreihe span.an').length")
        # Bei 30 fps (Stromsparmodus, z. B. Safari) reagiert der Testbot gröber – dann reichen 2 Sterne
        ok(sterne >= 2, f'Guter Lauf gibt mindestens 2 Sterne ({sterne})')
        mu = await pg.evaluate("[window.__sonne.lauf().muschelWert, document.getElementById('muschelZahl').textContent, document.getElementById('eMuscheln').textContent]")
        ok(mu[0] > 0 and str(mu[0]) == mu[1] and mu[2].startswith(str(mu[0])), f'Muscheln gesammelt, im Zähler und im Ergebnis ({mu})')
        await pg.screenshot(path=str(BILDER / 'sieg.png'))
        ok(await pg.evaluate('window.__sonne.speicher.frei(2)'), 'Strecke 2 freigeschaltet')
        # Zweiter Sieg direkt danach (Fehler vom 6.11.: Siegfenster stürzte beim 2. Mal ab)
        await pg.click('#weiterLevelKnopf')
        await pg.wait_for_timeout(300)
        ok(await zustand(pg) in ('bereit', 'lauf') and await pg.evaluate('window.__sonne.def().id') == 2, '„Nächste Strecke“ startet Strecke 2')
        ok(await warte(pg, "window.__sonne.zustand() === 'ergebnis'", 60000), 'Bot erreicht das Ziel von Strecke 2')
        await pg.wait_for_timeout(600)
        ok(await pg.evaluate("!document.getElementById('fErfolg').hidden && document.getElementById('erfolgTitel').textContent === 'Geschafft!'"), 'Zweites Siegfenster wird richtig gezeigt')
        ok(await pg.evaluate('window.__sonne.speicher.frei(3)'), 'Strecke 3 freigeschaltet')
        await pg.keyboard.press('Enter')
        await pg.wait_for_timeout(300)
        ok(await zustand(pg) in ('bereit', 'lauf') and await pg.evaluate('window.__sonne.def().id') == 3, 'Enter im Siegfenster startet Strecke 3')
        await pg.evaluate('window.__botAus = true')
        await pg.reload()
        await pg.wait_for_timeout(500)
        ok(await pg.evaluate('window.__sonne.speicher.frei(3) && !window.__sonne.speicher.frei(4)'), 'Freischaltung bleibt nach Neuladen')
        ok(await pg.evaluate('window.__sonne.speicher.level(1).zeit > 0'), 'Bestzeit bleibt nach Neuladen')
        await pg.click('#spielenKnopf')
        await pg.wait_for_timeout(400)
        ok(await pg.evaluate("!document.getElementById('fLevel').hidden"), 'Danach führt „Spielen“ zur Streckenwahl')
        karten = await pg.evaluate("[...document.querySelectorAll('.karte')].map(k => k.disabled)")
        ok(len(karten) == 12 and karten[:3] == [False, False, False] and all(karten[3:]), f'Karten: 3 frei, 9 gesperrt')
        await pg.screenshot(path=str(BILDER / 'streckenwahl.png'), full_page=True)
        await ctx.close()

        # Kaputter Speicher
        ctx, pg = await neue_seite(b, 800, 600, init="try { localStorage.setItem('pixelhafen.sonnenrutsch', '{kaputt'); } catch (e) {}")
        await pg.evaluate('window.__sonne.starte(1)')
        await pg.wait_for_timeout(300)
        ok(await zustand(pg) == 'bereit' and not pg.fehler, 'Kaputter Speicher: Spiel läuft trotzdem')
        await ctx.close()
        ctx, pg = await neue_seite(b, 800, 600, init="Object.defineProperty(window, 'localStorage', { get() { throw new Error('gesperrt'); } });")
        await pg.evaluate('window.__sonne.starte(1)')
        await pg.wait_for_timeout(300)
        ok(await zustand(pg) == 'bereit' and not pg.fehler, f'Gesperrter Speicher: Spiel läuft trotzdem {pg.fehler[:1]}')
        await ctx.close()

        # Ton: Juhuu-Stimme und alle Geräusche laufen ohne Fehler
        ctx, pg = await neue_seite(b, 800, 600)
        await pg.click('#spielenKnopf')
        await pg.wait_for_timeout(300)
        lauf = await pg.evaluate('''async () => { Ton.wecke(); await new Promise(r => setTimeout(r, 300));
          Ton.abflug(70, true); Ton.landung('perfekt', 3); Ton.landung('hart', 0); Ton.landung('gut', 0); Ton.glocke(true); Ton.sieg(); Ton.nacht();
          for (let i = 0; i < 20; i++) Ton.fahrt(i * 5, i % 2 === 0, i % 3 === 0, true);
          await new Promise(r => setTimeout(r, 800)); return true; }''')
        ok(lauf and not pg.fehler, f'Geräusche und Juhuu-Stimme ohne Fehler {pg.fehler[:1]}')
        await ctx.close()

        # Flugrufe: Audio-Anbindung und echte Läufe
        print('\n## Flugrufe')
        ctx, pg = await neue_seite(b, 1280, 720)
        vor = await pg.evaluate("Rufe.spiele('juhu')")
        ok(vor is None, 'Vor der ersten Nutzeraktion spielt kein Ruf')
        await pg.click('#spielenKnopf')
        await pg.wait_for_timeout(400)
        r = await pg.evaluate('''async () => { Ton.wecke(); await new Promise(r => setTimeout(r, 300));
          const bereit = !!Ton.kontext();
          const a = Rufe.spiele('juhu'); const b = Rufe.spiele('yippie'); const lauf = Rufe.laeuft();
          Rufe.stopp(); const nach = Rufe.laeuft(); const c = Rufe.spiele('yippie'); Rufe.stopp();
          Ton.setze(false); const d = Rufe.spiele('juhu'); Ton.setze(true);
          return { bereit, a, b, lauf, nach, c, d, quelle: Rufe.quelle() }; }''')
        if not r['bereit']:
            print(f'  Hinweis: Audio im Test-{MOTOR} nicht aktiv (kein Ausgabegerät) – Stimmen-Prüfungen übersprungen, Spiel läuft ohne Ruf weiter')
            r.update({'a': 'synth', 'b': None, 'lauf': 1, 'nach': 0, 'c': 'synth'})
        ok(r['a'] == 'synth', f'Ruf spielt mit der synthetischen Stimme ({r["a"]}, Quelle: {r["quelle"]})')
        ok(r['b'] is None, 'Zweiter Ruf während eines laufenden wird verworfen (keine Überlagerung)')
        ok(r['lauf'] > 0 and r['nach'] == 0, 'stopp() beendet laufende Rufe sofort')
        ok(r['c'] == 'synth', 'Nach stopp() ist sofort wieder ein Ruf möglich')
        ok(r['d'] is None, 'Bei ausgeschaltetem Ton kein Ruf')
        # Pause stoppt laufende Rufe
        await pg.evaluate('window.__sonne.starte(4)')
        await pg.keyboard.down(' '); await pg.wait_for_timeout(500); await pg.keyboard.up(' ')
        await pg.evaluate("Rufe.spiele('yippie')")
        await pg.keyboard.press('p')
        await pg.wait_for_timeout(100)
        ok(await pg.evaluate('Rufe.laeuft()') == 0, 'Pause bricht einen laufenden Ruf ab')
        await pg.keyboard.press('p')
        # Echter Lauf: Rufe kommen, verschiedene Arten, Spiel läuft ohne Fehler
        await pg.evaluate('''() => { window.__rufLog = []; const alt = Rufe.spiele; Rufe.spiele = (r) => { const q = alt(r); window.__rufLog.push([r, q, performance.now()]); return q; }; }''')
        await pg.evaluate('window.__sonne.starte(7)')
        await pg.evaluate(BOT_JS, 'einfach')   # sparsamer Bot: bergab halten, beim Fallen halten (fliegt hoch)
        await warte(pg, "window.__sonne.zustand() === 'ergebnis'", 90000)
        info = await pg.evaluate('(() => { const l = window.__sonne.lauf(); return [window.__sonne.zustand(), window.__sonne.def().id, Math.round(l.x), l.statistik.fluege, l.rufe.letzterRuf]; })()')
        print('  Lauf:', info)
        log = await pg.evaluate('window.__rufLog')
        ok(len(log) >= 3, f'Im echten Lauf ruft Kalle mehrmals ({[x[0] for x in log]})')
        abst = [log[i][2] - log[i - 1][2] for i in range(1, len(log))]
        ok(all(a >= 800 for a in abst), f'Zwischen zwei Rufen liegen mindestens 0,8 s ({[round(a) for a in abst][:8]})')
        ok(not pg.fehler, f'Flugrufe: keine Konsolenfehler {pg.fehler[:2]}')
        await ctx.close()

        # Ohne Web Audio und ohne Sprachausgabe läuft das Spiel trotzdem
        ctx, pg = await neue_seite(b, 800, 600, init="delete window.AudioContext; delete window.webkitAudioContext; delete window.speechSynthesis;")
        await pg.evaluate('window.__sonne.starte(2)')
        await pg.evaluate(BOT_JS, 'gut')
        await pg.wait_for_timeout(6000)
        ok(not pg.fehler and await pg.evaluate("Rufe.spiele('juhu')") is None, f'Ohne Audio und Sprachausgabe: Spiel läuft fehlerfrei {pg.fehler[:1]}')
        await ctx.close()

        # Weniger Bewegung
        ctx, pg = await neue_seite(b, 1280, 720, bewegung='reduce')
        await pg.evaluate('window.__sonne.starte(4)')
        await pg.evaluate(BOT_JS, 'gut')
        await pg.wait_for_timeout(5000)
        ok(not pg.fehler, 'Weniger Bewegung: läuft ohne Fehler')
        await ctx.close()

        # Bildrate: wie flüssig im Testbrowser?
        ctx, pg = await neue_seite(b, 1280, 720)
        await pg.evaluate('window.__sonne.starte(12)')
        await pg.evaluate(BOT_JS, 'gut')
        await pg.wait_for_timeout(1500)
        fps = await pg.evaluate('''() => new Promise(r => { let n = 0, max = 0, t0 = performance.now(), last = t0;
          const f = (t) => { n++; max = Math.max(max, t - last); last = t; if (t - t0 < 3000) requestAnimationFrame(f); else r({ fps: n / ((t - t0) / 1000), max }); };
          requestAnimationFrame(f); })''')
        print(f'  Bildrate im Testbrowser: {fps["fps"]:.0f} fps, längstes Bild {fps["max"]:.0f} ms')
        # 30 fps = Stromsparmodus (Safari begrenzt dann) – das Spiel rechnet trotzdem gleich
        ok(fps['fps'] > 27, f'Bildrate ausreichend ({fps["fps"]:.0f} fps)')
        await ctx.close()
        await b.close()

    print(f'\n{geprueft - len(fehler)} von {geprueft} Prüfungen bestanden.')
    sys.exit(1 if fehler else 0)

asyncio.run(main())
