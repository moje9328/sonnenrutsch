# Sonnenrutsch – Übergabe

Stand: 6. November 2026. Neues, eigenständiges Pixelhafen-Spiel mit **Kalle** aus
Krabbenalarm als Hauptfigur. **Online:** https://moje9328.github.io/sonnenrutsch/
(Repo `moje9328/sonnenrutsch`, Pages von main /, Karte auf https://moje9328.github.io/spiele/).
Krabbenalarm und Krabben-Krawall wurden nicht verändert.

## Sechste Runde (7.11.2026): ruhiger, geschmeidiger, länger

Auftrag: Das Spiel war zu hektisch – Kalle fiel zu schnell, die Sonne ging zu schnell unter, der Hintergrund raste. Die erwähnte Aufnahme lag nicht vor.
**Die globale Zeitbeschleunigung (`K.TEMPO`) aus Runde 5 ist entfernt.** Boden, Luft, Kamera, Hintergrund und Tageslicht sind jetzt getrennt eingestellt.

**Gefundene Ursachen:**
- *Schnelles Fallen:* `TEMPO 2` hat jede Beschleunigung vervierfacht. Dazu war die Luftschwerkraft schon von 0,5 auf 1,0 angehoben. Losgelassen wirkten 96 m/s² (erste Version: 12), im Sinkflug 432 m/s². Ein Fall aus 30 m dauerte 0,79 s.
- *Rasender Hintergrund:* Die Parallax-Verschiebung war `Kameraposition × Zoom × Faktor`. Weit draußen ließ jede kleine Zoomänderung die ganze Küste springen. Gemessen bei 1,6 km: 9,2 px/Bild durch Zoom gegenüber 0,6 px/Bild durch Bewegung, und es wurde mit der Strecke schlimmer.
- *Schneller Sonnenuntergang:* nur 30 s Startvorrat.
- *0 perfekte Landungen:* Die feste Grenze von 30 bzw. 48 m/s Aufprall quer zum Hang schloss bei 130–160 m/s Landetempo fast jede Landung aus (Median quer 88 m/s).

**Neue Werte (`1-einstellungen.js`):**
- Boden: Tempo 2× erste Version (G 96, V_MIN 28, V_MAX 160, Reibung 1,0) → Ø-Tempo ~90–98 m/s wie vorher.
- Luft: eigene Schwerkraft `G_LUFT` 44 m/s². Fall aus 30 m dauert 1,17 s.
- Sinkflug: `SCHWER_LUFT` 3,4× nur bei gehaltener Taste. Er setzt in 0,1 s weich ein (`SINKFLUG_ANLAUF`) und endet beim Loslassen sofort. Die Geschwindigkeit bleibt stetig.
- Luftreibung 0,00025·v².
- Hügel zentral `GELAENDE.LAENGE` 1,8× und `HOEHE` 1,35×, Rundung 6,5. Die längste fast flache Stelle ist 24 m (≈ 0,25 s bei Reisetempo).
- Perfekt: auf einer Abfahrt, ≤ 30° zur Rampentangente, Aufprall quer ≤ max(45 m/s, ½ · Tempo), nach echtem Flug. Ergebnis: gut 30 %, mittel 18 % der Landungen.

**Vergleichsversuche** (gleiche Rampe, losgelassen, `node quelle/vergleich.js`):

| Anfahrt | Flugzeit | Gipfel | Weite | Gipfel nach |
|---|---|---|---|---|
| 95 m/s | 2,73 s | 30 m | 123 m | 1,17 s |
| 115 m/s | 3,65 s | 63 m | 216 m | 1,70 s |
| 135 m/s | 4,57 s | 98 m | 325 m | 2,10 s |
| 155 m/s | 4,73 s | 136 m | 391 m | 2,47 s |

- Die Beschleunigung ändert sich im Flug höchstens um 0,01 m/s² pro Schritt, also auch am Scheitel kein Ruck.
- Nur losgelassen landen diese Versuche am nächsten Anstieg (hart). Mit gezieltem Sinkflug landen sie auf der Abfahrt („gut“ bzw. „perfekt“). Das ist die Spielidee.
- **Kamera:**
  - Ziel mit Toleranz (Zoom 7 %, Höhe 4 m), weiche Glättung (Zoom 1,4/s, Höhe 2,2/s).
  - Im Steigflug wird der vorhergesagte Gipfel eingeplant: Die Kamera zoomt vorausschauend heraus. Das Sicherheitsnetz zoomt nur sofort, wenn Kalle sonst hinausflöge.
  - Die Sonne steht nie hinter der Anzeige.
- **Hintergrund:**
  - Eigener Parallax-Zähler `hgX`, der nur mit der Kamerabewegung wächst (7 px/m, unabhängig vom Zoom).
  - Faktoren `PARALLAXE`: Wolken 0,02–0,04, fern 0,06, nah/Wasser 0,12. Wolken treiben sehr langsam.
  - Wasserglitzern schwächer, Brandung langsamer, Fahrtwind erst ab 75 % V_MAX, Flugspur 18 statt 50 Punkte.
  - Bei „weniger Bewegung“ steht der Hintergrund still.
  - Gemessen bei 2,4 km: ferne Küste 0,56 px/Bild (max. 0,8); mit der alten Formel wären es 4,7 px/Bild (max. 11).
- **Tageslicht** (`K.ENDLOS`):
  - Start 120 s, Vorrat höchstens 180 s, 1:1 mit der aktiven Spielzeit.
  - Marken ab 1500 m, jede weitere 150 m weiter entfernt, je +12 s. Perfekte Landung +3 s.
  - Der Himmel bleibt hell, solange mehr als 75 s übrig sind (`HIMMEL_REF`).
  - Gemessen ohne Boni: genau 120,00 s, bei 30, 60 und 144 Bildern/s gleich.
  - Endlosläufe (Bots):

    | Spielstil | Dauer |
    |---|---|
    | nie drücken | 156 s |
    | Anfänger | 205 s |
    | mittel | 276–330 s |
    | gut | 354 s |

- **Muschel-Linien:**
  - Landestellen von gutem und mittlerem Spiel. Die Linie beginnt 1 m nach der Landestelle (`VORLAUF -1`).
  - Sie liegt nur dort, wo eine 140 m/s schnelle Krabbe nicht wieder abhebt (`GLEIT_TEMPO`).
  - Anteil 75 % der geeigneten Abfahrten. Jede Linie wird von gutem oder mittlerem Spiel zu ≥ 70 % eingesammelt (getestet).
- **Rufe:**
  - „Juhu!“ ab 70 m im Steigflug.
  - „Yippie!“ ab 135 m Höhe oder 335 m Weite oder sofort bei vorhergesagten 220 m und 135 m/s.
  - Endlos: mittel etwa 9 Juhu und 1,5 Yippie pro Minute.
- Strecken neu kalibriert: Sie dauern jetzt 15–60 s.
- `sw.js` CACHE `sonnenrutsch-v7`.

## Fünfte Runde (7.11.2026): doppeltes Tempo und Endlosflug

- **Tempo ×2 (`K.TEMPO` in `1-einstellungen.js`):**
  - Die Physik läuft doppelt so schnell wie die echte Zeit. Das entspricht genau Geschwindigkeiten ×2 und Beschleunigungen ×4.
  - Flugbahnen, Rampen, Muschel-Linien und Landeregeln bleiben räumlich identisch (getestet: gleiche Bahn, halbe Dauer).
  - Die Schritte bleiben 1/240 s Physikzeit, höchstens 0,42 m pro Schritt. Das Gelände ist eine Höhenfunktion, deshalb gibt es kein Durchdringen.
  - `Lauf.zeit` ist echte Zeit, `Lauf.simZeit` Physikzeit. Der Game Loop rechnet `dt · TEMPO`, höchstens 48 Schritte pro Bild.
  - **Nicht beschleunigt:** Tageslicht, Rufabstände, Effekte, Menüs, Töne.
- **Angepasst:**
  - Kamera: mehr Vorschau (`KAM_VORSCHAU` 1,7 Physik-s ≈ 0,85 s echt, hochkant ×0,65), Kalle bei 26 % der Breite, Glättung schneller.
  - Reaktionszeit des Test-Bots `mittel`: 0,11 s echte Zeit.
  - Rufe: Abstand 2,5 s echte Zeit, Juhu ab 28 m, Yippie ab 62 m / 140 m / sofort ab 95 m. Damit ruft Kalle bei mittlerem Spiel etwa alle 4 s „Juhu!“ und unter einmal pro Minute „Yippie!“.
  - Tageslicht der Strecken auf echte Zeit neu kalibriert (etwa halbiert).
- **Endlosflug (`3d-endlos.js`, `K.ENDLOS`):**
  - Ein eigener Startknopf. Der Streckenmodus bleibt.
  - Jeder Lauf hat eine neue Saat und eine zufällige Küste. Tests nutzen `window.__endlosSaat`.
  - Das Gelände wächst 1100 m voraus und wird 260 m hinter Kalle entfernt (bleibt unter 80 Punkten, getestet). Gleiche Hügelarten und Grenzen wie die Strecken. Die Schwierigkeit steigt bis 9000 m und bleibt dann konstant.
  - Muschel-Linien: Ein unsichtbarer Testpilot (Bot `schnell`) fliegt 550 m voraus. Wo er auf einer Abfahrt landet, entsteht eine Linie nach denselben Regeln (`linienPunkte` in `3b-muscheln.js`).
  - Tageslicht:
    - Start 30 s, Vorrat höchstens 45 s.
    - Distanzmarken bei 700 m und danach mit jeweils 90 m mehr Abstand, je +7 s.
    - Perfekte Landung +1,5 s.
    - Läuft nur in aktiven Physikschritten ab (Pause, Tabwechsel und Ergebnis verbrauchen nichts).
  - Himmel und Sonne: `f = 1 − Rest/30`, also voller Startvorrat = Mittag. Nach Sonnenuntergang sinkt die Sonne ganz unter den Horizont.
  - Punkte = Muschelwert × 10 + perfekte Landungen × 25.
  - Rekorde (Strecke und Punkte) liegen in `Speicher.endlos`, getrennt von den Streckenbestzeiten.
- **Balance** (Bots, je 3 Saaten, echte Zeit):

  | Spielstil | Dauer | Strecke |
  |---|---|---|
  | nie drücken | 37 s | 1,3 km |
  | Anfänger | 56 s | 3,6 km |
  | mittel | 77 s | 7,1 km |
  | gut | 139 s | 13,6 km |

  Alle Läufe enden, weil die Marken immer weiter auseinanderrücken.
- **Oberfläche:**
  - Anzeige: Strecke (Balken bis zur nächsten Marke), Punkte, Rekord, Tageslicht, Muscheln, Ton-Knopf, Pause.
  - Einblendung „+7 s Tageslicht“ bzw. „+1,5 s Tageslicht · Perfekt“.
  - Distanzmarken als Pfosten mit Meterzahl, eigenes Ergebnisfenster mit „Sofort nochmal“.
  - Kein Pulsieren der Tageslichtleiste mehr (keine Warnblitze).
- `sw.js` CACHE `sonnenrutsch-v6`.

## Vierte Runde (7.11.2026): Hügelrhythmus, Muschel-Linien, Juhu/Yippie, perfekte Landung

Auftrag: ausführliche Vorgabe (Flugrufe, Hügel, Sammellinien, perfekte Landung, Technik, Prüfung).
Die erwähnte Bildschirmaufnahme lag nicht vor, umgesetzt wurde nach der Textbeschreibung.

- **Gelände (`2-strecken.js`):**
  - Jedes Hügelstück ist jetzt ein Polynom 5. Grades statt eines Kosinusbogens. Höhe, Steigung **und Krümmung** sind an jedem Übergang stetig: kein Ruck, keine versteckte Kante (getestet, Sprung < 1e-4).
  - Die Krümmung an Kuppe und Tal richtet sich nach dem stärkeren Nachbarstück, normiert höchstens 9. Ab etwa 20 würde ein Stück überschwingen; getestet ist, dass jedes Stück durchgehend steigt oder fällt.
  - Grenzen zentral in `GELAENDE`:
    - Stufe mindestens 7 m (keine Mini-Wellen)
    - mittlere Neigung 0,32–1,15, steilste Stelle ~64°
    - Täler höchstens ±5 m um die Grundlinie (keine Schluchten)
    - fast flache Stücke (|Steigung| < 0,15) höchstens 15 m, Start und Zielstrand ausgenommen
  - Vorher gab es bis zu 283 m fast flache Rutschstrecke (Strecke 12), jetzt höchstens 10 m.
  - Die Schanze hat dahinter eine kräftige Abfahrt statt einer langen, flachen Landezone.
  - Darstellung und Kollision nutzen dieselbe Funktion (`Gelaende.werte`).
- **Muschel-Linien (`3b-muscheln.js`):**
  - Linien gibt es nur auf Abfahrten, auf denen der gute Bot tatsächlich landet. Überflogene Abfahrten bleiben leer, und es folgen nie zwei Linien direkt hintereinander.
  - Start 3 m vor der typischen Landestelle, dann 5–8 Muscheln mit 4,2 m Abstand entlang der Kurvenlänge, 1,1 m über dem Hang entlang der Normalen. Die Linie endet, bevor das Tal flach wird.
  - Jede dritte Linie endet mit einer goldenen Muschel.
  - Sammeln: Kalles Mitte liegt 1,0 m über den Füßen senkrecht zu seiner Lage, Radius 1,8 m. Reine Sensoren, kein Einfluss auf die Physik.
  - Ergebnis: Gleitend wird jede Linie ganz eingesammelt (getestet). 4,5 m zu hoch verpasst den Großteil (getestet). Ein guter Lauf sammelt 80–99 %.
  - Pro Strecke 4–10 Linien (24–77 Muscheln). Die Daten liegen vorab berechnet in `2b-muscheln.js` (`[x, y, gold, linie]`). **Nach Physik- oder Streckenänderungen `node quelle/werkzeug-muscheln.js` ausführen.**
- **Perfekte Landung (`3-physik.js`, `landen`):** Alle Bedingungen müssen gelten:
  - Landung auf einer Abfahrt (Steigung < −0,18)
  - Abweichung von der Hangtangente ≤ 26°
  - Aufprall quer zur Oberfläche ≤ 30 m/s
  - Flugzeit > 0,32 s und vorher mindestens 1,2 m über dem Boden
  - Bonus wie bisher +5 % Tempo (+1,2 % je weiterer Perfekter in Folge).
- **Flugrufe:**
  - Bewertung in `3c-flugrufe.js` (Klasse `Flugrufe`, Weltkoordinaten und Spielzeit, Schwellen in `K.RUF`).
  - „Juhu!“: im Steigflug tatsächlich ≥ 24 m über dem Absprung und Absprung mit ≥ 20 m/s nach oben.
  - „Yippie!“: ≥ 55 m tatsächlich erreicht, oder ≥ 125 m weit, oder sofort, wenn der vorhergesagte Gipfel ≥ 85 m bei ≥ 70 m/s liegt.
  - Pro Flug höchstens ein Juhu und ein Yippie. Ein Yippie nach einem Juhu frühestens nach 0,9 s, sonst 1,8 s Abstand zwischen Rufen.
  - Ein neuer Flug beginnt erst nach 0,3 s stabiler Bodenzeit. Was nicht sofort passt, entfällt und wird nicht nachgeholt.
- **Stimme (`6b-rufe.js`):** Austauschbare Anbindung in dieser Reihenfolge:
  1. Sprachclips (`RUF_CLIPS`) – **derzeit keine eingebunden**, die Liste ist leer.
  2. Synthetische Comic-Stimme mit Web Audio – das ist die tatsächlich genutzte Quelle.
  3. Optionale Browser-Sprachausgabe (`RUF_BROWSER_SPRACHE`, Standard aus).

  Es spielt nur nach Nutzeraktion und bei eingeschaltetem Ton, nie zwei Rufe übereinander. `Rufe.stopp()` läuft bei Pause, Tabwechsel, Neustart und Ergebnis. Die Mimik beim Ruf: Jubelgesicht, beim Yippie Scheren hoch; die Physik bleibt unberührt.
- Das alte „Juhuu“ aus `Ton.abflug` ist entfernt.
- Zeiten neu kalibriert (Strecke 1–3 mit Anfänger-Reserve 42/56/57 s).
- `sw.js` CACHE `sonnenrutsch-v5`.
- **Tests:**
  - Logik: siehe unten, mit neuen Gruppen: Krümmung, flache Stücke, Mini-Wellen, Muschel-Linien, perfekte Landung und Flugrufe (Einzelflüge und alle Bot-Läufe).
  - Browser: 126/126 in Chromium und WebKit. In WebKit headless startet kein Audio (kein Ausgabegerät), dort werden die Stimmen-Prüfungen übersprungen und das Spiel läuft ohne Ruf weiter.

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
node quelle/werkzeug-muscheln.js    # Muschel-Linien neu berechnen (nach Physik-/Streckenänderung)
python3 quelle/mache-icons.py       # App-Icons neu zeichnen (aus index.html)
```

Lokal spielen: `python3 -m http.server` im Ordner, dann http://localhost:8000.

## Aufbau (`quelle/`)

| Datei | Inhalt |
|---|---|
| `1-einstellungen.js` | **Alle Stellschrauben** (`K`): Schwerkraft, Schwer-Faktoren, Landungswinkel, Bonus, Kamera |
| `2-strecken.js` | Gelände (`Gelaende`, Grenzen `GELAENDE`), Gebiete, Bauplan der 12 Strecken (`STRECKEN`), Streckengenerator |
| `2b-muscheln.js` | vorab berechnete Muschel-Linien (nicht von Hand ändern) |
| `3-physik.js` | `Lauf`: Boden/Luft, Abheben, Landung, Tageslicht, Muscheln einsammeln, Ereignisse |
| `3b-muscheln.js` | Platzierung der Muschel-Linien (`MUSCHEL_LINIEN`) |
| `3c-flugrufe.js` | Flugbewertung → Ruf-Ereignisse „Juhu“/„Yippie“ |
| `3d-endlos.js` | Endlosflug: wachsendes Gelände, Testpilot, Muschel-Linien |
| `bot.js` | Testbot (`gut`, `mittel`, `nie`, `immer`, `schnell`) – Tests und Menü-Hintergrund |
| `4-krabbe.js` | `malKrabbe` – **wörtlich aus Krabben-Krawall** (dort wörtlich aus Krabbenalarm) + 4 Farbvarianten |
| `5-speicher.js` | localStorage `pixelhafen.sonnenrutsch` (Version 1) |
| `6-ton.js` | Web-Audio-Geräusche, Rutsch-/Windrauschen nach Tempo |
| `6b-rufe.js` | Stimme für die Rufe (Clips / Synthese / optional Browser-Sprache) |
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

Zeiten in echten Sekunden (Tempo ×2):

| Nr | Name | Tageslicht | 2★ / 3★ bis | guter Bot |
|---|---|---|---|---|
| 1 | Lernstrecke | 21 s | 15,3 / 9,6 s | 9,2 s |
| 2 | Dünenwellen | 28 s | 21,5 / 15 | 14,4 |
| 3 | Windkamm | 29 s | 23,9 / 18,9 | 18,2 |
| 4 | Palmenbucht | 30 s | 25,8 / 21,6 | 20,7 |
| 5 | Kokoshügel | 32 s | 28,1 / 24,1 | 23,2 |
| 6 | Lagunensprung | 32 s | 28,3 / 24,6 | 23,6 |
| 7 | Klippenpfad | 33 s | 29,6 / 26,1 | 25,1 |
| 8 | Brandungsfels | 33 s | 29,7 / 26,4 | 25,4 |
| 9 | Möwenkap | 35 s | 31,9 / 28,7 | 27,6 |
| 10 | Muschelbank | 36 s | 32,9 / 29,8 | 28,7 |
| 11 | Korallenkamm | 38 s | 35 / 32,1 | 30,9 |
| 12 | Leuchtturmlauf | 39 s | 36,1 / 33,2 | 32,0 |

Schwerer wird es durch höhere, breitere Hügel, steilere Rampen, unregelmäßigeren Rhythmus,
ein paar Zwischenbuckel und weniger Zeitpuffer (Tageslicht/guter Bot von ×1,9 auf ×1,2).
**Nach jeder Änderung an Physik oder Strecken:** `node quelle/kalibriere.js`, Werte in `STRECKEN` übernehmen, beide Tests laufen lassen.

## Geprüft (6.11.2026)

- `test-logik.js`: 466 von 466 bestanden (Tempo-Tests aus Runde 5 durch Flug- und Tageslicht-Tests ersetzt) – Gelände stetig, 7632 Landungen (Tempo 8–70 m/s, Winkel −80°…+30°) ohne Durchfallen/Feststecken, Bonus moderat, harte Landung bremst, Abheben hängt von Tempo und Halten ab, bergab halten / bergauf loslassen wirkt, gleiche Ergebnisse bei jeder Bildrate, jede Strecke: guter Bot schafft 3 Sterne, mittlerer Bot schafft es in ≥ 3 von 5 Läufen, nie drücken und dauernd drücken scheitern.
- `test-browser.py`: 149 von 149 in **Chromium und WebKit (Safari-Motor)** – Darstellung bei 360×640, 390×844, 844×390, 768×1024, 1440×900; Kamera während ganzer Bot-Läufe (Kalle, Boden und 25 m Gelände voraus immer im Bild); Eingabe wirkt im nächsten Bild; Maus, Finger, abgebrochene Berührung, Fokusverlust; Pause hält die Sonne an; R und „Sofort nochmal“ (Enter); Sonnenuntergang → Ergebnis; zwei Siege hintereinander → Strecke 3, Freischaltung bleibt nach Neuladen; Geräusche inkl. Juhuu-Stimme ohne Fehler; kaputter/gesperrter Speicher; „weniger Bewegung“; ~60 fps im Testbrowser.
- Screenshots aller Gebiete, von Tageslicht bis Sonnenuntergang, Hoch- und Querformat angesehen.

## Nicht geprüft / offene Punkte

- **Kein echtes Handy, kein echter Mensch:** Spielgefühl, Schwierigkeit für Menschen, Ton und Bildrate auf echten Geräten sind ungetestet. Die Zeiten beruhen auf Bots. Wenn Strecken zu schwer/leicht sind: `zeit`/`sterne` in `STRECKEN` anpassen oder `FAKTOR` in `kalibriere.js`.
- Ton nur im Code geprüft (headless Browser spielen nichts hörbar ab).
- Echte 120-Hz-Displays nicht getestet (Physik ist bildratenunabhängig, sollte also passen).
- Wie die Juhuu-Stimme klingt, konnte ich nicht hören – bitte am Gerät beurteilen (Tonhöhe in `abflug()` in `6-ton.js`).
- Bei Updates: `sw.js` CACHE (`sonnenrutsch-v1`) hochzählen, committen, pushen. In `~/spiele-seite` nur gezielt stagen – Hafenlotse und Bewertungen liegen dort uncommittet und dürfen nicht mit hoch.
- Ideen für später: Freundes-Rangliste per Link wie bei Steinbrecher, leise Musik, Geist-Kalle der Bestzeit.
