#!/usr/bin/env python3
# Zeichnet die App-Icons mit Kalle aus dem Spiel. Aufruf: python3 quelle/mache-icons.py
import asyncio, pathlib, base64
from playwright.async_api import async_playwright
ORDNER = pathlib.Path(__file__).resolve().parent.parent
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        await pg.goto((ORDNER / 'index.html').as_uri()); await pg.wait_for_timeout(400)
        for groesse, name in [(512, 'icon-512.png'), (192, 'icon-192.png'), (180, 'apple-touch-icon.png')]:
            daten = await pg.evaluate('''(n) => { const cv = document.createElement('canvas'); cv.width = cv.height = n; const c = cv.getContext('2d');
              const v = c.createLinearGradient(0, 0, 0, n); v.addColorStop(0, '#5a6fb8'); v.addColorStop(0.55, '#ffb36b'); v.addColorStop(1, '#ff8a5c');
              c.fillStyle = v; c.fillRect(0, 0, n, n);
              c.fillStyle = '#ffe08a'; c.beginPath(); c.arc(n * 0.72, n * 0.36, n * 0.17, 0, Math.PI * 2); c.fill();
              c.beginPath(); c.moveTo(0, n); c.lineTo(0, n * 0.72);
              for (let x = 0; x <= n; x += 2) c.lineTo(x, n * 0.72 - Math.sin(x / n * Math.PI * 1.4 + 0.3) * n * 0.1);
              c.lineTo(n, n); c.closePath(); c.fillStyle = '#f6cf7c'; c.fill(); c.lineWidth = n * 0.02; c.strokeStyle = '#6e4320'; c.stroke();
              const e = n * 0.6 / 44; c.save(); c.translate(n * 0.2, n * 0.27); c.scale(e, e); malKrabbe(c, { figur: 'kalle', mund: 'jubel', schereHoch: true, schereAuf: true }); c.restore();
              return cv.toDataURL('image/png').split(',')[1]; }''', groesse)
            (ORDNER / 'icons' / name).write_bytes(base64.b64decode(daten))
        await b.close()
asyncio.run(main())
