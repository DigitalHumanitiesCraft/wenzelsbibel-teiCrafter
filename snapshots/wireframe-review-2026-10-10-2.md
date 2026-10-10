---
title: "Wireframe-Review wenzelsbibel-teiCrafter 2026-10-10, zweite Runde"
project:
  name: wenzelsbibel-teiCrafter
  repository: https://github.com/DigitalHumanitiesCraft/wenzelsbibel-teiCrafter
status: snapshot
language: de
created: 2026-10-10
updated: 2026-10-10
authors: [Christopher Pollin]
generated-with: Claude Code (Claude Opus 5.5)
method:
  name: Promptotyping
  url: https://lisa.gerda-henkel-stiftung.de/digitale_geschichte_pollin
template:
  name: Vorlage Report
  version: 0.3
  url: https://dhcraft.org/Promptotyping/promptotyping-document/report
  alias: https://dhcraft.org/Promptotyping/#promptotyping-document-report
audience:
  type: stakeholder
  name: Operator
report-genre: stakeholder-update
---

| Feld | Angabe |
| --- | --- |
| Projekt | wenzelsbibel-teiCrafter, Wireframe des Editors auf fol. 1r mit allen fünf Workflows im Speicher |
| Gegenstand | `wireframe/`, Stand nach den Korrekturen vom 2026-10-10 |
| Stichtag | 2026-10-10 |
| Grundlage | Durchklicken aller Akzeptanzkriterien der [Specification](../knowledge/specification.md) als Erstnutzerin (Playwright mit Chromium, 1400×900, 390×844, 200 % Zoom), Querbezüge zwischen den Features, Tastaturbedienung, Barrierefreiheitsminima des [Design](../knowledge/design.md) |

## Tätigkeiten im Berichtszeitraum

Nach der [ersten Runde](wireframe-review-2026-10-10.md) wurde der Wireframe so ausgebaut, dass jeder Workflow der Spezifikation einmal durchklickbar ist, im Speicher auf den echten Daten von fol. 1r und mit Rückgängig je Dokument. Dafür wurde die Datenextraktion als Skript `scripts/extract_wireframe_data.py` ins Repository genommen und um Registerzähler, einen ICONCLASS-Katalog aus den Bildannotationen und die vollen Felder der Bildannotationen erweitert. Das Review spielte danach alle Kriterien der fünf Epics durch und fand 21 Befunde, keinen blockierenden. Zwei Korrekturpakete behoben die Befunde, die am Wireframe liegen. Die Walkthroughs liegen unter `wireframe/checks/` und bestehen auf dem Endstand mit 299 Prüfungen.

## Status quo

Der Wireframe zeigt fol. 1r als Fließtext mit Faksimile und Zonen, Inspector in den Zuständen Wort, Wortfolge, Zeile, Miniatur, Randbild, Verweise und Befunde sowie die XML-Ansicht. Apparatkommentare, Registerverknüpfungen und neue Einträge, das Bildannotationsformular mit ICONCLASS-Suche, die Markup-Aktionen, die Prüfungen mit Befundliste und der Speicherablauf ändern das Modell im Speicher. Die XML-Ansicht, die Wohlgeformtheitsprüfung und der Download beziehen sich auf den geladenen Auszug, was die Oberfläche in Worten sagt. Nichts wird auf die Platte geschrieben.

### Befunde

| Befund | Schwere | Stand |
| --- | --- | --- |
| In Bildannotationen zeigte XML den Codex-Auszug, Text danach den Codex-Fluss unter der Miniaturliste | kostet Zeit | behoben |
| Dokumentwechsel und Browser-Zurück verwarfen nicht angewendete Eingaben ohne Rückfrage (F36) | kostet Zeit | behoben, Wechsel wird gehalten, bis Anwenden oder Abbrechen erfolgt |
| Eine Undo-Historie für beide Dokumente, Rückgängig in Bildannotationen nahm Codex-Änderungen zurück (F5) | kostet Zeit | behoben, Historie je Dokument mit Ansage des Schritts |
| Modelländerungen erreichen die XML-Ansicht nicht | kostet Zeit | offen, echter Build; Hinweis in der Ansicht |
| Registerverknüpfung über einen Apparatanker verweigert, obwohl F38 Anker zwischen den Wörtern erlaubt | kostet Zeit | behoben, verweigert wird nur das Teilen eines umschließenden Elements |
| Befund an zeilenfinaler Interpunktion sprang nirgendwohin | kostet Zeit | behoben, alle Review-Befunde der Seite springen |
| Befundsprung bei aktiven Bildannotationen markierte im verborgenen Fluss | kostet Zeit | behoben, Sprung wechselt zuerst zum Codex |
| Sheet bei 390 px und 200 % deckte Menü- und Dokumentleiste ab, Shift+Tab verließ das Sheet auf verdeckte Elemente | kostet Zeit | behoben, Sheet beginnt unter der Dokumentleiste, verdeckter Bereich inert |
| Menüleiste ohne Pfeiltasten, Fokus nach Menülauf auf body | kostet Zeit | behoben, WAI-ARIA-Menubar-Muster |
| US5.1.1 nicht darstellbar, XML-Ansicht nur lesend, keine Prüfung nach Pause | kostet Zeit | offen, echter Build; Ergebnis trägt „geladener Auszug“ |
| US5.2.3 nicht vorführbar, kein Bedienweg lässt eine Prüfung beim Speichern scheitern | kostet Zeit | offen, echter Build |
| Veralteter Befund sprang nach Ankereinfügung ins falsche Wort | kosmetisch | behoben, Befunde halten Wort-ID oder Position mit Typ und Text |
| Ablehnung beim Verknüpfen unter dem Inspector-Kopf statt am Registerfeld | kosmetisch | behoben |
| ICONCLASS-Trefferlabels mit 2,92:1 Kontrast | kosmetisch | behoben (5,58:1) |
| Register-Chips und Summary 19 px, Rahmen des Ort-Chips 2,96:1 | kosmetisch | behoben (24 px, 3,76:1) |
| ICONCLASS-Liste und offenes Menü, Escape holte den Fokus aus dem Menü | kosmetisch | behoben |
| Schnelles Tab durch den Fluss ersetzt die frisch geöffnete Befundliste | kosmetisch | offen, trat bei menschlichem Tempo nicht auf |
| „+ neu anlegen“ füllte die ID aus dem Suchtext statt aus der Auswahl | kosmetisch | behoben |
| Hervorhebung ersetzte `rubrication` stillschweigend | kostet Zeit | behoben, Meldung nennt die Ersetzung, Menü markiert den aktuellen Wert |
| Platzhalter „MK“ im Sigle-Feld wirkte vorbelegt | kosmetisch | behoben |
| Codex-Spalte nicht in der Adresse (F12) | kosmetisch | behoben (`#codex/1r/a`) |

## Ergebnisse

Alle Akzeptanzkriterien von US1.1 bis US5.2 sind erfüllt, soweit das Modell im Speicher sie tragen kann. Nicht erfüllt bleiben US4.2.3 (Ausfall des ICONCLASS-Dienstes, weil ein lokaler Katalog den Dienst vertritt), US5.1.1 (Wohlgeformtheit beim Tippen in der XML-Ansicht) und US5.2.3 (fehlgeschlagene Prüfung beim Speichern). Die Querbezüge halten: Kommentar und Verknüpfung auf denselben Wörtern, Markup auf verknüpften Wörtern, Rückgängig und Wiederholen über drei Features hinweg mit byte-gleichem Modell, Befundliste nach jeder Änderung als veraltet markiert. Die Tastaturkette von Prüfen über Befundliste, Wortauswahl, Verknüpfung bis zum Kommentar läuft ohne Maus. Neue Elemente erreichen Kontraste zwischen 5,0:1 und 17,4:1, Fokusringe sind sichtbar, bei 390 px und 200 % gibt es kein waagrechtes Scrollen.

Aus den Daten kamen Befunde für das Editionsteam, aufgenommen in die [Editionsrichtlinien](../knowledge/editorial-guidelines.md): fol. 1r trägt vier Bildannotationen, nicht eine; ein Apparat zeigt auf einen Anker, den es im Codex nicht gibt; zwei Apparattypen sind Tippfehlervarianten; sieben ICONCLASS-Notationen tragen widersprüchliche Beschriftungen, eine Adresse ist falsch geschrieben; ein Ortsziel ist falsch kodiert (`KeÃ¯la`).

## Offene Punkte und nächste Schritte

Der Operatortest ist der nächste Schritt. Im echten Build liegen die lebende Quelle in der XML-Ansicht, der Dienstaufruf für ICONCLASS, der vorführbare Fehlerfall beim Speichern und die Miniaturwahl in der Dokumentleiste. Zwei Verhaltensweisen aus dem Wireframe sind Vorschläge für den Build und für das Editionsteam: Apparatbereiche und Registerverknüpfungen dürfen einander überlappen, weil Anker Meilensteine sind, und bei schmaler Breite öffnet die Wortwahl das Sheet mit Fokus im Formular, sodass das Tippen im Text erst nach dem Schließen weitergeht.

## Prüfmethode

Headless Chromium über Playwright gegen den lokalen Server, Skripte unter `wireframe/checks/`, Screenshots unter `test-results/wireframe/`. Die 200-%-Prüfung emuliert den Zoom über ein halbiertes Viewport mit doppeltem Gerätepixelverhältnis. Die Sichtprüfung durch den Operator ersetzt das nicht.
