# Sonnenrutsch – Übergabe

Stand: 6. November 2026. Neues, eigenständiges Pixelhafen-Spiel mit **Kalle** aus
Krabbenalarm als Hauptfigur. **Online:** https://moje9328.github.io/sonnenrutsch/
(Repo `moje9328/sonnenrutsch`, Pages von main /, Karte auf https://moje9328.github.io/spiele/).
Krabbenalarm und Krabben-Krawall wurden nicht verändert.

## Dritte Runde (7.11.2026): Schwerkraft und Muscheln

- **Schwerkraft in der Luft:** Losgelassen 1,0 g statt 0,7 g, damit Kalle nicht zu lange oben bleibt. Gedrückt 4,5 g statt 3,4 g (schneller Sturz, um Schwung zu holen). Flüge gehen typisch 30–100 m hoch.
- **Muscheln zum Sammeln:**
  - Reihen aus 3–5 Muscheln knapp über den Abhängen.
  - Bögen in der Luft entlang der Flugbahn eines geübten Bots (`schnell`), also erreichbar.
  - Am höchsten Punkt großer Flüge oft eine **goldene Muschel** (zählt 5).
  - Pro Strecke 56–140 Muscheln.
  - Die Positionen sind vorab berechnet in `quelle/2b-muscheln.js`. **Nach jeder Änderung an Physik oder Strecken `node quelle/werkzeug-muscheln.js` ausführen**, sonst schlägt ein Test fehl.
  - Einsammeln in `Lauf.sammeln()` (Radius 2,2 m um Kalles Mitte). Bot-Vorschauen sammeln nichts (`vorschau`).
- **Sammeln: Anzeige und Speicher:**
  - Zähler oben in der Anzeige, der kurz „ploppt“.
  - „Pling“, das bei schneller Serie höher klettert; Gold mit Glitzer, Arpeggio und „+5“.
  - Muscheln stehen im Ergebnis (Sieg und Sonnenuntergang), dazu ein Rekord pro Strecke im Speicher (`muscheln`) und auf der Streckenkarte.
  - Die Starterklärung nennt die Muscheln.
- Muscheln werden als vorgezeichnete Bilder pro Größe eingesetzt (keine Farbverläufe in jedem Bild).
- Zeiten neu gemessen. Strecke 1–3 haben Anfänger-Reserve (40/58/64 s), weil der stärkere Sturz Anfänger öfter hart landen lässt.
- **Hinweis Bildrate:** Im Stromsparmodus begrenzt Safari (Mac und iPhone) auf 30 fps. Die Physik rechnet unabhängig davon gleich (getestet). Die Browser-Tests akzeptieren deshalb ≥ 27 fps, und der Testbot muss dort nur 2 Sterne holen.
- Tests: Logik 227/227, Browser 115/115 in Chromium und WebKit. `sw.js` CACHE `sonnenrutsch-v4`.

## Zweite Runde Rückmeldungen (7.11.2026)

Rückmeldung: Kalle zu langsam, „fühlt sich abgebremst an“, kein Tempo aufbaubar, Touch soll direkter reagieren, Hügel sollen unterschiedlich hoch und lang sein (mal eine perfekte Rampe).

- **Ursache „abgebremst“:** Fast jede Landung nach hohem Flug war hart (−20…−40 % Tempo), auch gute Landungen kosteten Tempo, und auf den hohen Hügeln kroch man bergauf mit 6 m/s.
- **Physik neu:**
  - Losgelassen ist Kalle am Boden leicht (`LEICHT_BODEN` 0,65 g) und gleitet weit den Hang hinauf. Gehalten wirkt 3,0 g (bergab), in der Luft 3,4 g (Sinkflug).
  - Reibung und Luftwiderstand sind kleiner. Höchsttempo: Boden 80, Luft 100 m/s. Mindesttempo 14 m/s.
  - Wer bergauf schwer bleibt, wird bis 5 m/s langsam (`V_MIN_SCHWER`). Losgelassen krabbelt Kalle mit 22 m/s² zurück aufs Mindesttempo, ohne Ruck. Dadurch reicht „dauernd drücken“ nicht mehr.
- **Landungen fairer:**
  - Unter 36° zum Hang wird Kalle in den Hang umgelenkt und behält mindestens 95 % Tempo. Auf einem Abhang gilt das bis 55° mit mindestens 82 %.
  - „Perfekt“ gilt bis 20° (+5 %).
  - Hart ist eine Landung nur gegen einen Anstieg oder bei einem steilen Sturz auf flachen Boden.
- **Hügelarten** (`HUEGELARTEN` in `2-strecken.js`, Anteile je Strecke in `muster`):
  - normal
  - klein: schnelle Buckel
  - gross: Riesenhügel
  - rampe: Sprungschanze mit langem, tiefem Anlauf, kurzer steiler Rampe und langer Landezone dahinter
  - Dazu stärkere Zufallsschwankung (`wechsel` bis 0,6). Wird ein Abhang durch die Talgrenzen zu steil, wird er automatisch länger.
- **Direktere Reaktion:**
  - Die Leinwand nutzt höchstens 1,5 Bildpunkte je CSS-Pixel statt 2. Gemessen mit 4-fach gedrosseltem Prozessor im Handy-Format: 60 statt 44 fps.
  - Jedes Drücken gibt sofort Rückmeldung: ein leises „Wupp“ (`Ton.druck`), Sand fliegt am Boden, Sturzstreifen in der Luft.
- **Messung** (Bot-Durchschnittstempo, vorher → jetzt): gut 34–45 → 36–54 m/s. Gute und mittlere Bots haben kaum noch harte Landungen. Flüge gehen bis etwa 130–150 m hoch und 150–240 m weit.
- **Neuer Bot `einfach`** (Anfänger: bergab halten, beim Fallen halten). Test: Er schafft die Strecken 1–3, deshalb haben Strecke 2 und 3 etwas mehr Tageslicht (50 und 58 s).
- Tests: Logik 179/179, Browser 114/114 in Chromium und WebKit. `sw.js` CACHE `sonnenrutsch-v3`.

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
node quelle/werkzeug-muscheln.js    # Muschelpositionen neu berechnen (nach Physik-/Streckenänderung)
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

| Nr | Gebiet | Name | Länge | Tageslicht | 2★ / 3★ bis | guter Bot |
|---|---|---|---|---|---|---|
| 1 | Sanddünen | Lernstrecke (mit Hinweisen) | 1000 m | 40 s | 29,3 / 18,6 s | 17,8 s |
| 2 | Sanddünen | Dünenwellen | 1500 m | 58 s | 43,9 / 29,7 | 28,5 |
| 3 | Sanddünen | Windkamm | 1800 m | 64 s | 49,2 / 34,4 | 33,1 |
| 4 | Tropeninsel | Palmenbucht | 2000 m | 59 s | 51,1 / 43,2 | 41,6 |
| 5 | Tropeninsel | Kokoshügel | 2200 m | 73 s | 64,1 / 55,3 | 53,2 |
| 6 | Tropeninsel | Lagunensprung | 2300 m | 64 s | 56 / 48 | 47,4 |
| 7 | Felsküste | Klippenpfad | 2400 m | 68 s | 61 / 53,9 | 51,8 |
| 8 | Felsküste | Brandungsfels | 2500 m | 65 s | 58,5 / 52,1 | 50,1 |
| 9 | Felsküste | Möwenkap | 2600 m | 63 s | 57,3 / 51,6 | 49,6 |
| 10 | Korallenkap | Muschelbank | 2700 m | 72 s | 65,5 / 59 | 57,8 |
| 11 | Korallenkap | Korallenkamm | 2800 m | 69 s | 63,9 / 58,7 | 56,5 |
| 12 | Korallenkap | Leuchtturmlauf | 3000 m | 90 s | 83,7 / 77,4 | 74,6 |

Schwerer wird es durch höhere, breitere Hügel, steilere Rampen, unregelmäßigeren Rhythmus,
ein paar Zwischenbuckel und weniger Zeitpuffer (Tageslicht/guter Bot von ×1,9 auf ×1,2).
**Nach jeder Änderung an Physik oder Strecken:** `node quelle/kalibriere.js`, Werte in `STRECKEN` übernehmen, beide Tests laufen lassen.

## Geprüft (6.11.2026)

- `test-logik.js`: 227 von 227 bestanden – Gelände stetig, 7632 Landungen (Tempo 8–70 m/s, Winkel −80°…+30°) ohne Durchfallen/Feststecken, Bonus moderat, harte Landung bremst, Abheben hängt von Tempo und Halten ab, bergab halten / bergauf loslassen wirkt, gleiche Ergebnisse bei jeder Bildrate, jede Strecke: guter Bot schafft 3 Sterne, mittlerer Bot schafft es in ≥ 3 von 5 Läufen, nie drücken und dauernd drücken scheitern.
- `test-browser.py`: 115 von 115 in **Chromium und WebKit (Safari-Motor)** – Darstellung bei 360×640, 390×844, 844×390, 768×1024, 1440×900; Kamera während ganzer Bot-Läufe (Kalle, Boden und 25 m Gelände voraus immer im Bild); Eingabe wirkt im nächsten Bild; Maus, Finger, abgebrochene Berührung, Fokusverlust; Pause hält die Sonne an; R und „Sofort nochmal“ (Enter); Sonnenuntergang → Ergebnis; zwei Siege hintereinander → Strecke 3, Freischaltung bleibt nach Neuladen; Geräusche inkl. Juhuu-Stimme ohne Fehler; kaputter/gesperrter Speicher; „weniger Bewegung“; ~60 fps im Testbrowser.
- Screenshots aller Gebiete, von Tageslicht bis Sonnenuntergang, Hoch- und Querformat angesehen.

## Nicht geprüft / offene Punkte

- **Kein echtes Handy, kein echter Mensch:** Spielgefühl, Schwierigkeit für Menschen, Ton und Bildrate auf echten Geräten sind ungetestet. Die Zeiten beruhen auf Bots. Wenn Strecken zu schwer/leicht sind: `zeit`/`sterne` in `STRECKEN` anpassen oder `FAKTOR` in `kalibriere.js`.
- Ton nur im Code geprüft (headless Browser spielen nichts hörbar ab).
- Echte 120-Hz-Displays nicht getestet (Physik ist bildratenunabhängig, sollte also passen).
- Wie die Juhuu-Stimme klingt, konnte ich nicht hören – bitte am Gerät beurteilen (Tonhöhe in `abflug()` in `6-ton.js`).
- Bei Updates: `sw.js` CACHE (`sonnenrutsch-v1`) hochzählen, committen, pushen. In `~/spiele-seite` nur gezielt stagen – Hafenlotse und Bewertungen liegen dort uncommittet und dürfen nicht mit hoch.
- Ideen für später: Freundes-Rangliste per Link wie bei Steinbrecher, leise Musik, Geist-Kalle der Bestzeit.
