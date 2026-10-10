---
title: "Wireframe-Review wenzelsbibel-teiCrafter 2026-10-10"
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
| Projekt | wenzelsbibel-teiCrafter, statischer Wireframe des Editors auf fol. 1r |
| Gegenstand | `wireframe/index.html`, `wireframe/wireframe.css`, `wireframe/wireframe.js` |
| Stichtag | 2026-10-10 |
| Grundlage | Usability-Review als Erstnutzerin (Playwright mit Chromium, 1400×900, 390 px, 200 % Zoom), Abgleich mit [Specification](../knowledge/specification.md) und [Design](../knowledge/design.md) |

## Tätigkeiten im Berichtszeitraum

Das Review spielte die fünf Demo-Schritte der Specification auf echten Daten von fol. 1r durch und maß Kontraste, Zielgrößen und Tastaturbedienung. Danach wurde der Wireframe in einem Bereinigungspaket an Specification und Design angeglichen. Die Befunde, die erst der echte Editor lösen kann, sind unten als offen geführt.

## Status quo

Der Wireframe zeigt Spalte a und b von fol. 1r als editierbaren Fließtext mit Faksimile, Zonen, Inspector in den Zuständen Wort, Wortfolge, Zeile, Miniatur und Befunde sowie XML-Ansicht mit Formatierung. Jedes Bedienelement ohne Funktion antwortet mit „Im Entwurf noch ohne Funktion.“, damit im Termin keine Attrappe für eine Funktion gehalten wird. Die simulierte Schematron-Prüfung ist als „Beispielbefund aus den Daten“ gekennzeichnet.

### Befunde

| Befund | Schwere | Stand |
| --- | --- | --- |
| Normalisiert-Änderung ohne Ungesichert-Punkt, Bestätigung, Anwenden und Abbrechen | blockiert | behoben |
| Wirkungslose Bedienelemente (Speichern, Öffnen, Kommentar, ICONCLASS, Register-Menü, TEI All und weitere) nicht als Entwurf erkennbar | blockiert | behoben durch Hinweis, Funktion offen |
| Strg+S nicht abgefangen, im Browser öffnet sich „Seite speichern“ | blockiert | behoben |
| Autocomplete ohne Tastaturauswahl und ohne combobox-ARIA, Liste am Rand der Leiste abgeschnitten | blockiert | behoben |
| Bei 200 % Zoom mit Faksimile und Inspector bleibt rund eine Textzeile | blockiert | behoben, Inspector wird unter 48rem zum Vollhöhen-Sheet |
| Kommentarformular fehlt (US2.1) | blockiert | offen, echter Build |
| Registerwahl, „+ neu anlegen“ und „Verknüpfung lösen“ ohne Ergebnis (US3.1, US3.2) | blockiert | offen, echter Build |
| ICONCLASS-Suche fehlt (US4.1) | blockiert | offen, echter Build |
| Speichern fehlt, Speicherregel ungeklärt | blockiert | offen, echter Build und Operatorentscheidung |
| Zeilennummer und Zeilenzone öffnen „Wortfolge“ statt „Zeile“ (US1.2, F31) | kostet Zeit | behoben |
| Faksimile mehrere Sekunden leer, ohne Ladehinweis | kostet Zeit | behoben |
| Faksimile folgt dem Spaltenwechsel nicht | kostet Zeit | behoben, Ausschnitt springt auf die Textregionen der Spalte |
| Ansicht bietet Zeilenweise und Fließtext entgegen F7 | kostet Zeit | behoben |
| Markup-Werte weichen von F32 ab (Menü „Überschuss“, `diplography`, Elementname `del` als Wert, `redemption_point` fehlt) | kostet Zeit | behoben |
| Deaktivierte Folio-Pfeile sehen aktiv aus | kostet Zeit | behoben durch Entfernen, der Wireframe hat ein Folio |
| Niedrige Fenster mit Faksimile lassen dem Text zu wenig Höhe | kostet Zeit | behoben, Inspector auf 30dvh begrenzt |
| Menüleiste ohne Pfeiltasten, Markup-Dropdowns ohne Pfeiltasten | kostet Zeit | offen |
| „Im Text zeigen“ ersetzt das Miniaturformular ohne Rückweg | kostet Zeit | offen |
| Kontrast XML-Attributnamen 4,07:1, Ungesichert-Punkt 2,91:1 | kostet Zeit | behoben (5,88:1 und 5,44:1) |
| Eingabefelder und Auswahllisten mit 14 px | kostet Zeit | behoben (16 px) |
| Ungesichert-Punkt verschiebt die Dokumentleiste, Auswahlbalken zwischen Wörtern | kosmetisch | offen |
| Register-Chip im Text 19 px hoch, unter der Zielgröße von 24 px | kosmetisch | offen |

## Ergebnisse

- Die Zeile als eigener Inspector-Zustand mit Titel „Zeile N, fol. 1r a“, Zonen-ID und den Wörtern der Zeile als Chips mit normalisierter Lesung. Ein Chip öffnet den Zustand Wort.
- Normalisiert mit Anwenden und Abbrechen. Anwenden schreibt die Lesung in die Arbeitsdaten im Speicher, setzt den Ungesichert-Punkt und bestätigt kurz im Inspector. Diplomatisch bleibt live mit dem Fließtext gekoppelt.
- Die Markup-Aktionen folgen F32 mit den Handbuchwerten aus den kontrollierten Vokabularen der [Editionsrichtlinien](../knowledge/editorial-guidelines.md). Tilgung führt `surplus/@reason` mit `Diplography` und `del/@type` mit `erasure` und `redemption_point`.
- Das Register-Autocomplete ist als Combobox mit Pfeiltasten und Enter bedienbar, öffnet über oder unter dem Feld, je nach Platz, und bietet „+ neu anlegen“.

## Offene Punkte und nächste Schritte

Dem echten Build gehören das Apparatformular, die Registerverknüpfung samt Anlegen und Lösen, die ICONCLASS-Suche, das Speichern und der Ladetest mit Projektordner. Die Speicherregel ist eine Operatorentscheidung. Für den Wireframe bleiben Pfeiltastennavigation in Menüleiste und Markup-Dropdowns, ein Rückweg von „Im Text zeigen“ zur Miniatur und die Zielgröße der Register-Chips.

Zwei Fragen gehen an das Editionsteam. Der Wert `erasure_point` steht in den Daten, das Handbuch nennt `redemption_point`, und der Wireframe bietet vorerst nur den Handbuchwert an. Design.md beschreibt den Zustand Zeile mit Zeilen für Diplomatisch und Normalisiert, der Wireframe zeigt die Wörter als Chips, die erst im Zustand Wort editierbar werden. Welche Form trägt, entscheidet die Demo.

## Prüfmethode

Ein Playwright-Skript gegen den statischen Server prüfte am Stichtag 35 Punkte, alle bestanden. Geprüft wurden die Menüeinträge, der Zustand Zeile per Zeilennummer, Anwenden und Abbrechen bei Normalisiert, das Abfangen von Strg+S, Autocomplete per Tastatur samt ARIA-Attributen und Lage im Viewport, der Hinweis bei 21 Menüeinträgen und vier Inspector-Elementen ohne Funktion, die Kennzeichnung der Beispielbefunde, die nach WCAG-Formel gemessenen Kontraste, die Schriftgröße der Eingaben, der Ladehinweis und der Spaltenwechsel im Faksimile, die Inspector-Höhe bei 650 px Fensterhöhe sowie fehlendes Querscrollen und das Vollhöhen-Sheet bei 390 px und bei 200 % Zoom. Konsolenfehler traten in keiner Größe auf. `node --check wireframe/wireframe.js` lief ohne Fehler.
