# Sonnenrutsch – Übergabe

Stand: 6. November 2026. Neues, eigenständiges Pixelhafen-Spiel mit **Kalle** aus
Krabbenalarm als Hauptfigur. **Online:** https://moje9328.github.io/sonnenrutsch/
(Repo `moje9328/sonnenrutsch`, Pages von main /, Karte auf https://moje9328.github.io/spiele/).
Krabbenalarm und Krabben-Krawall wurden nicht verändert.

## Änderungen nach dem ersten Test

- **Fehler behoben: „Nach Level 2 ging es nicht weiter.“** Das Siegfenster stürzte beim zweiten Sieg ab, weil `zeige()` die id des Fenstertitels (`erfolgTitel`) in `fensterTitel` umbenannte. Jetzt werden ids nie umbenannt, nur `aria-labelledby` wird gesetzt. Neuer Browser-Test: zwei Siege hintereinander, dann Strecke 3.
- **Viel steilere, höhere Hügel:** Höhenunterschiede 18–66 m statt 7–30 m, steilste Stelle bis ~65° (`K.STEIL_MAX` 1,4), kürzere Rampen. Leichterer Flug (0,5 g), weniger Luftwiderstand, Höchsttempo 110 m/s. Folge (guter Bot): Flüge typisch 30–90 m hoch und 100–170 m weit (vorher 3–20 m hoch, 20–70 m weit). Weniger Zwischenbuckel, damit lange Flüge möglich bleiben.
- **„Juhuu!“:** Bei kräftigem Absprung steil nach oben (Tempo > 30, Steigung > 0,35) ruft Kalle mit kleiner Comic-Stimme „Juhuu!“ (zwei Silben, Sägezahn + Vokalfilter + Vibrato in `6-ton.js`, `stimme()`), höchstens alle 2 s. Der Text fliegt mit Kalle mit.
- **Kamera:** Kalle fliegt nie mehr hinter die Anzeige. Die Kamera kennt die Höhe des HUD (`Grafik.setzeRandOben`) und zoomt sofort heraus, wenn Kalle zu hoch steigt (statt das Bild nach oben zu schieben).
- 3 Sterne richten sich jetzt nach dem schnellsten Botlauf (guter oder mittlerer Bot).

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
- **Gelände:** Kette aus Hoch- und Tiefpunkten, dazwischen halbe Kosinuswellen → Höhe und Steigung überall stetig (kein Knick, getestet). Steilste Stelle ~65° (`K.STEIL_MAX`).
- **Kein Durchfallen:** Weil das Gelände y(x) ist, gilt „unter y(x) = gelandet“. Physik in festen 1/240-s-Schritten, unabhängig von der Bildrate (getestet: gleiches Ergebnis bei 30/60/240 Hz).
- **Boden:** Beschleunigung längs des Hangs = −g·sin(Neigung) − Reibung. Halten = g × 2,6 (bergab schneller, bergauf langsamer). Mindesttempo 6 m/s → nie Feststecken.
- **Abheben nur aus Schwung:** Kalle hebt ab, wenn v²·Krümmung > g·cos(Neigung). Schwer = höhere g → klebt an der Kuppe; loslassen → fliegt. Es gibt keinen Sprung per Taste. Mini-Hüpfer unter 0,35 m Höhe zählen nicht als Flug (keine Ereignisse, kein Geräuschgewitter).
- **Luft:** losgelassen 0,5 g (weiter, sanfter Flug), gehalten 2,7 g (Sinkflug).
- **Landung:** Tempo längs des Hangs bleibt, Querteil geht verloren. Winkel < 12° auf echtem Abhang nach ≥ 0,32 s Flug = **perfekt**: +5 %, je weitere Perfekte in Folge +1,2 % (max. Kette 5). Winkel > 24° = **hart**: zusätzlich −22 … −40 %, Staub, „Uff!“, verdutztes Gesicht.
- **Kamera:** Kalle bei 30 % der Breite; Sichtbreite wächst mit Tempo; Höhe so, dass Kalle, tiefster und höchster Punkt voraus im Bild sind; herauszoomen schneller als hinein. Im Flug zeigt ein Schatten auf dem Boden, wo Kalle landen wird. Hochkant ist die Mindestbreite 54 m, Kalle bleibt mindestens 54 px breit.
- **Schwierigkeit gemessen statt geschätzt:** `kalibriere.js` fährt jede Strecke mit dem guten Bot (plant voraus) und 5× mit dem mittleren Bot (0,11 s Reaktionszeit, 6 % Fehlentscheidungen). Tageslicht = max(gut × Faktor, Median mittel + 2 s). Der Faktor sinkt von 1,9 (Lernstrecke) auf 1,2 (Finale). Strecke 10 bekam eine andere Saat (105), weil die erste unfair träge war.
- **Sterne:** 3 Sterne ≈ Niveau des guten Bots (+4 %), 2 Sterne in der Mitte zum Tageslicht, 1 Stern = Ziel erreicht.
- **Musik** gibt es bewusst nicht, nur Geräusche (Rutschen, Wind, Absprung, Landungen, Warnglocke in den letzten Sekunden, Fanfare). Passt zur Rückmeldung, dass Musik leise und fröhlich sein soll – kann später ergänzt werden.

## Strecken

| Nr | Gebiet | Name | Länge | Höhe der Hügel | Tageslicht | 2★ / 3★ bis | guter Bot |
|---|---|---|---|---|---|---|---|
| 1 | Sanddünen | Lernstrecke (mit Hinweisen) | 900 m | 18–24 m | 39 s | 30 / 21,1 s | 20,3 s |
| 2 | Sanddünen | Dünenwellen | 1400 m | 20–30 m | 46 s | 38,8 / 31,5 | 30,3 |
| 3 | Sanddünen | Windkamm | 1700 m | 22–34 m | 54 s | 45,5 / 37 | 36,8 |
| 4 | Tropeninsel | Palmenbucht | 1900 m | 24–38 m | 65 s | 56,1 / 47,3 | 45,8 |
| 5 | Tropeninsel | Kokoshügel | 2000 m | 26–42 m | 81 s | 71,4 / 61,8 | 59,4 |
| 6 | Tropeninsel | Lagunensprung | 2100 m | 28–46 m | 64 s | 56 / 48 | 46,2 |
| 7 | Felsküste | Klippenpfad | 2200 m | 30–50 m | 85 s | 76,5 / 67,9 | 65,3 |
| 8 | Felsküste | Brandungsfels | 2300 m | 30–52 m | 84 s | 75,7 / 67,5 | 64,9 |
| 9 | Felsküste | Möwenkap | 2400 m | 32–56 m | 81 s | 73,5 / 66,1 | 63,5 |
| 10 | Korallenkap | Muschelbank | 2500 m | 34–58 m | 89 s | 81,8 / 74,6 | 71,7 |
| 11 | Korallenkap | Korallenkamm | 2600 m | 34–62 m | 105 s | 96,4 / 87,7 | 86,1 |
| 12 | Korallenkap | Leuchtturmlauf | 2800 m | 36–66 m | 98 s | 91,1 / 84,2 | 81,0 |

Schwerer wird es durch höhere, breitere Hügel, steilere Rampen, unregelmäßigeren Rhythmus,
ein paar Zwischenbuckel und weniger Zeitpuffer (Tageslicht/guter Bot von ×1,9 auf ×1,2).
**Nach jeder Änderung an Physik oder Strecken:** `node quelle/kalibriere.js`, Werte in `STRECKEN` übernehmen, beide Tests laufen lassen.

## Geprüft (6.11.2026)

- `test-logik.js`: 176 von 176 bestanden – Gelände stetig, 7632 Landungen (Tempo 8–70 m/s, Winkel −80°…+30°) ohne Durchfallen/Feststecken, Bonus moderat, harte Landung bremst, Abheben hängt von Tempo und Halten ab, bergab halten / bergauf loslassen wirkt, gleiche Ergebnisse bei jeder Bildrate, jede Strecke: guter Bot schafft 3 Sterne, mittlerer Bot schafft es in ≥ 3 von 5 Läufen, nie drücken und dauernd drücken scheitern.
- `test-browser.py`: 114 von 114 in **Chromium und WebKit (Safari-Motor)** – Darstellung bei 360×640, 390×844, 844×390, 768×1024, 1440×900; Kamera während ganzer Bot-Läufe (Kalle, Boden und 25 m Gelände voraus immer im Bild); Eingabe wirkt im nächsten Bild; Maus, Finger, abgebrochene Berührung, Fokusverlust; Pause hält die Sonne an; R und „Sofort nochmal“ (Enter); Sonnenuntergang → Ergebnis; zwei Siege hintereinander → Strecke 3, Freischaltung bleibt nach Neuladen; Geräusche inkl. Juhuu-Stimme ohne Fehler; kaputter/gesperrter Speicher; „weniger Bewegung“; ~60 fps im Testbrowser.
- Screenshots aller Gebiete, von Tageslicht bis Sonnenuntergang, Hoch- und Querformat angesehen.

## Nicht geprüft / offene Punkte

- **Kein echtes Handy, kein echter Mensch:** Spielgefühl, Schwierigkeit für Menschen, Ton und Bildrate auf echten Geräten sind ungetestet. Die Zeiten beruhen auf Bots. Wenn Strecken zu schwer/leicht sind: `zeit`/`sterne` in `STRECKEN` anpassen oder `FAKTOR` in `kalibriere.js`.
- Ton nur im Code geprüft (headless Browser spielen nichts hörbar ab).
- Echte 120-Hz-Displays nicht getestet (Physik ist bildratenunabhängig, sollte also passen).
- Wie die Juhuu-Stimme klingt, konnte ich nicht hören – bitte am Gerät beurteilen (Tonhöhe in `abflug()` in `6-ton.js`).
- Bei Updates: `sw.js` CACHE (`sonnenrutsch-v1`) hochzählen, committen, pushen. In `~/spiele-seite` nur gezielt stagen – Hafenlotse und Bewertungen liegen dort uncommittet und dürfen nicht mit hoch.
- Ideen für später: Freundes-Rangliste per Link wie bei Steinbrecher, leise Musik, Geist-Kalle der Bestzeit.
