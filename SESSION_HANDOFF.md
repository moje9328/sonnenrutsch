# Sonnenrutsch – Übergabe

Stand: 6. November 2026. Neues, eigenständiges Pixelhafen-Spiel mit **Kalle** aus
Krabbenalarm als Hauptfigur. **Nur lokal**, noch nicht veröffentlicht (kein GitHub-Repo,
keine Karte auf der Pixelhafen-Seite). Krabbenalarm und Krabben-Krawall wurden nicht verändert.

Spielidee: Kalle rutscht über weiche Küstenhügel, sammelt bergab Schwung, fliegt
über die Kuppen und muss das Ziel erreichen, bevor die Sonne untergeht.
Ein-Tasten-Steuerung (Finger, Maus, Leertaste). 1 Lernstrecke + 11 Strecken in 4 Gebieten.

## Bauen und prüfen

```
python3 quelle/baue.py              # baut index.html aus quelle/  (index.html nie direkt bearbeiten)
node quelle/test-logik.js           # Physik, Gelände, Landungen, Schaffbarkeit (~1 min; „schnell“ = ohne Botläufe)
python3 quelle/test-browser.py      # Browser-Test, Chromium (~2 min); „webkit“ als Argument = Safari-Motor
node quelle/kalibriere.js           # misst alle Strecken mit dem Testbot, schlägt Tageslicht/Sterne vor
python3 quelle/mache-icons.py       # App-Icons neu zeichnen (aus index.html)
```

Lokal spielen: `python3 -m http.server` im Ordner, dann http://localhost:8000.

## Aufbau (`quelle/`)

| Datei | Inhalt |
|---|---|
| `1-einstellungen.js` | **Alle Stellschrauben** (`K`): Schwerkraft, Schwer-Faktoren, Landungswinkel, Bonus, Kamera |
| `2-strecken.js` | Gelände (`Gelaende`), Gebiete, Bauplan der 12 Strecken (`STRECKEN`), Streckengenerator |
| `3-physik.js` | `Lauf`: Boden/Luft, Abheben, Landung, Tageslicht, Ereignisse |
| `bot.js` | Testbot (`gut`, `mittel`, `nie`, `immer`, `schnell`) – Tests und Menü-Hintergrund |
| `4-krabbe.js` | `malKrabbe` – **wörtlich aus Krabben-Krawall** (dort wörtlich aus Krabbenalarm) + 4 Farbvarianten |
| `5-speicher.js` | localStorage `pixelhafen.sonnenrutsch` (Version 1) |
| `6-ton.js` | Web-Audio-Geräusche, Rutsch-/Windrauschen nach Tempo |
| `7-grafik.js` | Himmel/Sonne/Parallaxe/Gelände/Kalle/Effekte, Kamera, Themen (`THEMEN`) |
| `8-eingabe.js` | Ein-Tasten-Eingabe (Pointer Events + Tastatur) |
| `9-app.js` | Zustände, Game Loop, HUD, Menüs, Ergebnisse, Test-Schnittstelle `window.__sonne` |
| `kopf.html`, `basis.css` | Seite/HUD/Fenster; `basis.css` ist das gemeinsame Pixelhafen-Design |

## Wichtige Entscheidungen

- **Eigenständiges Spiel** im Pixelhafen-Stil (eigener Ordner `~/sonnenrutsch-app`), wie alle bisherigen Spiele: ein HTML-File, kein Build-Tool, keine Bibliotheken. Eine Physik-Bibliothek ist unnötig: Das Gelände ist eine Höhenfunktion.
- **Gelände:** Kette aus Hoch- und Tiefpunkten, dazwischen halbe Kosinuswellen → Höhe und Steigung überall stetig (kein Knick, getestet). Steigung höchstens ~55°.
- **Kein Durchfallen:** Weil das Gelände y(x) ist, gilt „unter y(x) = gelandet“. Physik in festen 1/240-s-Schritten, unabhängig von der Bildrate (getestet: gleiches Ergebnis bei 30/60/240 Hz).
- **Boden:** Beschleunigung längs des Hangs = −g·sin(Neigung) − Reibung. Halten = g × 2,3 (bergab schneller, bergauf langsamer). Mindesttempo 6 m/s → nie Feststecken.
- **Abheben nur aus Schwung:** Kalle hebt ab, wenn v²·Krümmung > g·cos(Neigung). Schwer = höhere g → klebt an der Kuppe; loslassen → fliegt. Es gibt keinen Sprung per Taste. Mini-Hüpfer unter 0,35 m Höhe zählen nicht als Flug (keine Ereignisse, kein Geräuschgewitter).
- **Luft:** losgelassen 0,68 g (weiter, sanfter Flug), gehalten 2,7 g (Sinkflug).
- **Landung:** Tempo längs des Hangs bleibt, Querteil geht verloren. Winkel < 9° auf echtem Abhang nach ≥ 0,32 s Flug = **perfekt**: +5 %, je weitere Perfekte in Folge +1,2 % (max. Kette 5). Winkel > 24° = **hart**: zusätzlich −22 … −40 %, Staub, „Uff!“, verdutztes Gesicht.
- **Kamera:** Kalle bei 30 % der Breite; Sichtbreite wächst mit Tempo; Höhe so, dass Kalle, tiefster und höchster Punkt voraus im Bild sind; herauszoomen schneller als hinein. Im Flug zeigt ein Schatten auf dem Boden, wo Kalle landen wird. Hochkant ist die Mindestbreite 54 m, Kalle bleibt mindestens 54 px breit.
- **Schwierigkeit gemessen statt geschätzt:** `kalibriere.js` fährt jede Strecke mit dem guten Bot (plant voraus) und 5× mit dem mittleren Bot (0,11 s Reaktionszeit, 6 % Fehlentscheidungen). Tageslicht = max(gut × Faktor, Median mittel + 2 s). Der Faktor sinkt von 1,9 (Lernstrecke) auf 1,2 (Finale). Strecke 10 bekam eine andere Saat (105), weil die erste unfair träge war.
- **Sterne:** 3 Sterne ≈ Niveau des guten Bots (+4 %), 2 Sterne in der Mitte zum Tageslicht, 1 Stern = Ziel erreicht.
- **Musik** gibt es bewusst nicht, nur Geräusche (Rutschen, Wind, Absprung, Landungen, Warnglocke in den letzten Sekunden, Fanfare). Passt zur Rückmeldung, dass Musik leise und fröhlich sein soll – kann später ergänzt werden.

## Strecken

| Nr | Gebiet | Name | Länge | Tageslicht | 2★ / 3★ bis | guter Bot |
|---|---|---|---|---|---|---|
| 1 | Sanddünen | Lernstrecke (mit Hinweisen unterwegs) | 620 m | 40 s | 29,5 / 19,5 s | 18,7 s |
| 2 | Sanddünen | Dünenwellen | 1000 m | 40 s | 33,7 / 27,4 | 26,4 |
| 3 | Sanddünen | Windkamm | 1300 m | 54 s | 46,1 / 38,2 | 36,7 |
| 4 | Tropeninsel | Palmenbucht | 1450 m | 55 s | 47,4 / 39,7 | 38,2 |
| 5 | Tropeninsel | Kokoshügel | 1650 m | 71 s | 62,6 / 54,2 | 52,1 |
| 6 | Tropeninsel | Lagunensprung | 1750 m | 72 s | 63,9 / 55,7 | 53,6 |
| 7 | Felsküste | Klippenpfad | 1850 m | 73 s | 65,5 / 58 | 55,7 |
| 8 | Felsküste | Brandungsfels | 1950 m | 76 s | 68,7 / 61,5 | 59,1 |
| 9 | Felsküste | Möwenkap | 2050 m | 86 s | 77,3 / 68,6 | 66,0 |
| 10 | Korallenkap | Muschelbank | 2150 m | 84 s | 75,4 / 66,8 | 64,3 |
| 11 | Korallenkap | Korallenkamm | 2250 m | 91 s | 82,6 / 74,2 | 71,4 |
| 12 | Korallenkap | Leuchtturmlauf | 2450 m | 104 s | 95,1 / 86,2 | 82,8 |

Schwerer wird es durch breitere/höhere Hügel, steilere Rampen, unregelmäßigeren Rhythmus,
kleine Zwischenbuckel (über die man fliegen sollte) und weniger Zeitpuffer.
**Nach jeder Änderung an Physik oder Strecken:** `node quelle/kalibriere.js`, Werte in `STRECKEN` übernehmen, beide Tests laufen lassen.

## Geprüft (6.11.2026)

- `test-logik.js`: 164 von 164 bestanden – Gelände stetig, 7632 Landungen (Tempo 8–70 m/s, Winkel −80°…+30°) ohne Durchfallen/Feststecken, Bonus moderat, harte Landung bremst, Abheben hängt von Tempo und Halten ab, bergab halten / bergauf loslassen wirkt, gleiche Ergebnisse bei jeder Bildrate, jede Strecke: guter Bot schafft 3 Sterne, mittlerer Bot schafft es in ≥ 3 von 5 Läufen, nie drücken und dauernd drücken scheitern.
- `test-browser.py`: 108 von 108 in **Chromium und WebKit (Safari-Motor)** – Darstellung bei 360×640, 390×844, 844×390, 768×1024, 1440×900; Kamera während ganzer Bot-Läufe (Kalle, Boden und 25 m Gelände voraus immer im Bild); Eingabe wirkt im nächsten Bild; Maus, Finger, abgebrochene Berührung, Fokusverlust; Pause hält die Sonne an; R und „Sofort nochmal“ (Enter); Sonnenuntergang → Ergebnis; Sieg → 3 Sterne, Freischaltung bleibt nach Neuladen; kaputter/gesperrter Speicher; „weniger Bewegung“; ~60 fps im Testbrowser.
- Screenshots aller Gebiete, von Tageslicht bis Sonnenuntergang, Hoch- und Querformat angesehen.

## Nicht geprüft / offene Punkte

- **Kein echtes Handy, kein echter Mensch:** Spielgefühl, Schwierigkeit für Menschen, Ton und Bildrate auf echten Geräten sind ungetestet. Die Zeiten beruhen auf Bots. Wenn Strecken zu schwer/leicht sind: `zeit`/`sterne` in `STRECKEN` anpassen oder `FAKTOR` in `kalibriere.js`.
- Ton nur im Code geprüft (headless Browser spielen nichts hörbar ab).
- Echte 120-Hz-Displays nicht getestet (Physik ist bildratenunabhängig, sollte also passen).
- Nicht veröffentlicht: Repo `moje9328/sonnenrutsch` und Karte auf `~/spiele-seite` fehlen. Beim Hochladen: Repo anlegen, Pages von main /, Karte in `SPIELE` ergänzen – **ohne Hafenlotse** (dort nur gezielt stagen, nie `git add .`). `sw.js` CACHE (`sonnenrutsch-v1`) bei jedem Update hochzählen.
- Ideen für später: Freundes-Rangliste per Link wie bei Steinbrecher, leise Musik, Geist-Kalle der Bestzeit.
