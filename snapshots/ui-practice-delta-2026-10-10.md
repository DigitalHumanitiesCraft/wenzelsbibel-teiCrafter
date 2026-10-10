# Delta für die UI-Praxis agentisch erzeugter Frontends, Stand 2026-10-10

Dieses Dokument hält den Vorschlag fest, den die Feedback-Runden auf das Wireframe der Wenzelsbibel-Edition für das Vault-Dokument "UI-Praxis für agentisch erzeugte Frontends", seinen Abnahmecheck und den Skill web-style ergeben haben. Es ist ein datierter Bericht für die Vault-Session, die das Delta einarbeitet. Quellen sind die beiden Feedback-Runden des Operators vom 2026-10-10, wie sie knowledge/journal.md und knowledge/design.md festhalten, das Vault-Dokument mit Abnahmecheck, der Skill web-style mit seinen Referenzen, die Skills Impeccable (Tag skill-v4.5.2, Engine 0.1.14), frontend-design (anthropics/skills, Stand 2026-09-03) und web-design-guidelines (vercel-labs/agent-skills, Regeldatei command.md, Stand 2026-10-05), alle vollständig gelesen.

## Befund

Die Feedback-Runden haben sechs Lehren hinterlassen. Die Tabelle zeigt, welcher Träger sie heute als Regel hält.

| Lehre | Vault-Dokument | Abnahmecheck | web-style | design.md |
|---|---|---|---|---|
| Eine Auswahl wird mit einer durchgehenden Hervorhebung gezeichnet (Zaunpfahl) | fehlt | fehlt | fehlt | Regel |
| Keine Sätze, die das Werkzeug oder seine Grenzen erklären | teilweise | teilweise | teilweise | Regel |
| Ein Objekt trägt einen Namen, eine Handlung ein Bedienelement | teilweise | teilweise | außerhalb | Regel |
| Eine im Menü versteckte Handlung existiert für Nutzende nicht | teilweise | fehlt | außerhalb | Regel |
| Eine Zurückweisung nennt ihren Grund | teilweise | teilweise | außerhalb | Regel |
| Trägheit wird gemessen, bevor etwas geändert wird | fehlt | fehlt | fehlt | Regel seit diesem Tag |

Dazu kommen Lehren, die erst beim Vergleich sichtbar wurden: Rückmeldung auf direkte Manipulation folgt im nächsten Frame ohne Timer, Komponentenselektoren sind an ihren Container gebunden, Bearbeiten geschieht an der Auswahl ohne Layoutsprung, eine Fläche mit Schreibmarke verhält sich wie ein Editor, kein Erfolg bleibt stumm, gekoppelte Ansichten folgen der Auswahl auch räumlich, und bestandene automatische Durchläufe belegen Funktion und noch keine Annehmbarkeit.

## Vorgeschlagene Regeln für das Vault-Dokument

Die Regeln sind so formuliert, dass sie für jedes Frontend gelten und keinen Anbieter, kein Modell und kein Projekt nennen.

Neuer Antipattern-Abschnitt "Direkte Manipulation" unter "Wiederkehrende Antipatterns":

- Eine Auswahl wird mit genau einer Hervorhebung gezeichnet, die über die Zwischenräume zwischen ihren Einheiten durchläuft. Eine Markierung je Einheit bleibt einem anderen Zustand vorbehalten, etwa der Position der Schreibmarke, und liegt nie über der Auswahl.
- Werkzeuge zur aktuellen Auswahl öffnen an der Auswahl, ohne sie zu verdecken. Weder eine sich öffnende Ebene noch eine Zustandsmarke noch eine Meldung verschiebt das Layout oder zieht den Blick an einen entfernten Rand.
- Eine Fläche, die wie ein Texteditor aussieht und eine Schreibmarke zeigt, verhält sich wie einer. Einschränkungen des Datenmodells übersetzen die üblichen Editorgesten in zulässige Befehle, und nur das Unübersetzbare wird mit Grund zurückgewiesen.
- Gekoppelte Ansichten folgen einer Auswahl auch räumlich und bringen ihr Gegenstück in den sichtbaren Ausschnitt, wenn es außerhalb liegt. Eine Hervorhebung außerhalb des Sichtfelds zählt als keine Rückmeldung.

Neuer Abschnitt "Versteckte Handlungen" neben "Versteckte Evidenz":

- In einem Arbeitswerkzeug ist jede Handlung als Bedienelement sichtbar. Ein Menü enthält höchstens Werte oder Varianten einer sichtbaren Handlung. Eine im aktuellen Zustand unzulässige Handlung bleibt gesperrt sichtbar, mit einem Grund, den auch Tastatur und Touch erreichen, also über das title-Attribut hinaus.

Ergänzungen in "Zustände und Gründe sichtbar machen":

- Weist die Anwendung eine Eingabe oder Handlung zurück, nennt sie Grund und gangbaren Weg sichtbar an der auslösenden Stelle oder in der zentralen Meldungsleiste und fasst wiederholte Zurückweisungen zusammen. Das gilt auch für einen einzelnen Tastendruck.
- Jede ausdrücklich angeforderte Handlung gibt eine wahrnehmbare Rückmeldung, auch wenn ihr Ergebnis leer oder fehlerfrei ist. Eine Handlung, die einen vorhandenen Wert ersetzt, nennt die Ersetzung.
- Die Folge einer Handlung wird gemeldet, wenn die Handlung ausgeführt wird. Den fortbestehenden Zustand trägt eine Zustandsmarke, und eine Ansicht beginnt mit ihrem Gegenstand.
- Technische Kennungen, die der Arbeitsschritt nicht liest, werden auch in einer Quellansicht eingeklappt und erscheinen am ausgewählten Element oder auf Anforderung. Das Einklappen verändert nur die Anzeige.

Neuer Abschnitt "Rückmeldezeit" nach "Responsive Darstellung", mit Verweis auf "Web-Performance messen" für das Verfahren:

- Wird eine Oberfläche als träge wahrgenommen, wird vor jeder Änderung gemessen, etwa die langen Tasks je Interaktion in einem reproduzierbaren Browserlauf, und die Korrektur setzt an der gemessenen Ursache an. In der ersten Runde entlastete die Messung die vermutete Ursache, die Auswahl, und fand einen Timer und eine Stilkollision.
- Die sichtbare Rückmeldung auf direkte Manipulation folgt im nächsten Frame ohne Timer-Verzögerung. Teure Folgeaktualisierungen warten auf das Ende der Geste, und eine Ansicht wird nur neu aufgebaut, wenn ihre Quelle sich geändert hat.

Ergänzung in "Metadaten und Gewichtung":

- Ein Objekt trägt an einer Stelle genau einen sichtbaren Namen und eine Handlung genau ein Bedienelement. Ein zweiter Bezeichner wie ein Dateiname erscheint nur dort, wo eine Aufgabe ihn verlangt.

Ergänzung in "Benennung nach Technik und Prozess", als Prototyp-Klausel:

- Ein Prototyp im Feedback trägt seinen vorläufigen Status in genau einer Marke mit Tooltip. Jeder weitere Satz über den Entwurf, seine Daten oder seine Grenzen ist ein Prozessrest, und ein Bedienelement, das im Prototyp noch nichts tun kann, wird nicht gerendert.

Ergänzung in "Sprache" aus den Interface-Text-Regeln des Skills frontend-design, die ein Dokument besser trägt als ein geladener Skill: Beschriftungen von Handlungen nennen Verb und Objekt, eine Fehlermeldung nennt, was geschah und was jetzt möglich ist, und ein Text steht nur dort, wo er eine Frage der Nutzenden beantwortet.

Ergänzung in "Synthesis":

- Bestandene automatische Durchläufe und erfüllte Akzeptanzkriterien belegen Funktion. Annehmbarkeit entscheidet die verantwortliche Person an den Kerninteraktionen am Bildschirm, und ein automatischer Befund an einer Kerninteraktion wird darum als Befund behandelt und bleibt offen, bis sie ihn gesehen hat. In den Runden galten dem Operator genau die Befunde als entscheidend, die ein Review als kosmetisch eingestuft hatte.

Quellen: ein Eintrag für die Feedback-Runden vom 2026-10-10 auf das Wireframe der Wenzelsbibel-Edition, mit dem Operator nach Rolle. Frontmatter: updated und neue query-topics wie direkte-manipulation, auswahl-hervorhebung, stille-zurueckweisung, rueckmeldezeit.

## Vorgeschlagene Punkte für den Abnahmecheck

In der deklarativen Form der bestehenden Liste.

- Jede Handlung ist ohne Öffnen eines Menüs sichtbar, ein Menü hält nur Werte oder Varianten einer sichtbaren Handlung, und eine gerade unzulässige Handlung bleibt gesperrt sichtbar mit einem Grund, den Tastatur und Touch erreichen.
- Eine markierte Spanne erscheint als eine durchgehende Hervorhebung, ohne zweite Tönung und ohne Lücken zwischen ihren Einheiten.
- Werkzeuge zur Auswahl öffnen an der Auswahl, und weder eine Ebene noch eine Zustandsmarke noch eine Meldung verschiebt das Layout.
- Eine editierbar wirkende Fläche verhält sich wie ein Texteditor, oder sie nennt sichtbar den Grund jeder Zurückweisung.
- Jede zurückgewiesene Eingabe, auch ein einzelner Tastendruck, nennt sichtbar Grund und gangbaren Weg, wiederholte Zurückweisungen gebündelt.
- Jede angeforderte Handlung bestätigt auch ein leeres oder fehlerfreies Ergebnis wahrnehmbar, und eine Ersetzung nennt den ersetzten Wert.
- Die Folge einer Handlung erscheint beim Auslösen, der fortbestehende Zustand in einer Zustandsmarke, und jede Ansicht beginnt mit ihrem Gegenstand.
- Gekoppelte Ansichten bringen das Gegenstück einer Auswahl in den sichtbaren Ausschnitt.
- Ein Objekt trägt an einer Stelle genau einen sichtbaren Namen und eine Handlung genau ein Bedienelement.
- Für die Kerninteraktionen liegt eine Messung langer Tasks und der Reaktionszeit vor, und jede gemeldete Verzögerung ist auf eine gemessene Ursache zurückgeführt.
- Die verantwortliche Person hat die Kerninteraktionen am Bildschirm abgenommen, unabhängig davon, ob die automatischen Durchläufe bestehen.

## Konflikte, die die Vault-Session entscheidet

- Das Vault-Dokument zählt unter "Benennung nach Technik und Prozess" die Gattung eines Bauartefakts wie Wireframe als Linktext zu den Prozessresten. design.md erlaubt genau eine Marke "Wireframe" mit Tooltip als Statusträger eines Prototyps. Die Prototyp-Klausel oben löst das auf, wenn das Dokument sie übernimmt.
- Das Vault-Dokument sagt unter "Zustände und Gründe sichtbar machen", dass ein Grund allein im title-Attribut weder Touch noch Tastatur erreicht. design.md und die Anforderung F1 ließen den Grund im Tooltip, das Wireframe nennt ihn zusätzlich beim Aktivieren des gesperrten Elements. design.md ist seit diesem Tag auf die Fassung des Wireframes gebracht, das Vault-Dokument kann die Formulierung "Tooltip und beim Aktivieren" übernehmen.
- Nach der Regel zu versteckten Handlungen darf ein Menü nur Werte oder Varianten einer sichtbaren Handlung halten. Das Prüfen-Menü der Arbeitsleiste hält mit "Befundliste" eine eigene Handlung. Entweder die Regel kennt Prüfmengen als Variante, oder die Befundliste wird ein eigenes Bedienelement.

## Was ein Skill besser trägt als ein Dokument

Deterministisch prüfbar und darum als Schritt in web-style unter Verification, als Playwright-Lauf gegen den gebauten Prototyp oder das Produkt:

- lange Tasks und Reaktionszeit je Kerninteraktion, mit dem Messskript als Vorlage, das dieses Repository unter test/wb-latency.mjs hält
- Timer auf selectionchange oder auf anderen Eingabeereignissen, als Suche im Quelltext
- Komponentenselektoren ohne Containerbindung, als Vergleich der Selektoren über die Stylesheets, mit einer Entscheidung in references/css.md
- aria-disabled ohne sichtbaren Grund außerhalb des title-Attributs
- derselbe Objektname zweimal in einer Fläche, als Vergleich der Textknoten
- eine definierte ::selection-Regel und das Fehlen einer zweiten Tönung je Einheit innerhalb einer Auswahl
- Layoutverschiebung beim Öffnen und Schließen von Ebenen und Meldungen, über den LayoutShift-Beobachter

Alles, was Urteil braucht, bleibt Dokument und Abnahmecheck: ob ein Satz die Oberfläche erklärt, ob ein Menü eine Handlung versteckt, ob eine Fläche wie ein Editor wirkt, ob eine Rückmeldung wahrnehmbar ist.

## Einschätzung der drei Skills

Impeccable prüft mit 59 deterministischen Regeln ohne Modell Slop-Muster, Typografie, Kontrast, Textüberlauf und Token-Drift gegen ein DESIGN.md und installiert einen Hook, der bei jedem Edit läuft. Als Craft-Floor ist es brauchbar, für die Lehren dieser Runden ist es blind, denn keine Regel betrifft Auswahl, Zurückweisung, versteckte Handlungen oder Reaktionszeit. Zwei Angaben des Handoff-Punkts waren zu korrigieren. Das README verlangt die Prüfung der installierten Hooks vor unbeaufsichtigten Läufen, und das Validate-Skript ist eines, das das Zielprojekt selbst in package.json definiert und das der Live-Modus in einer Shell ausführt. web-design-guidelines hält keine eigenen Regeldateien, sondern holt command.md zur Laufzeit ungepinnt vom main-Branch eines fremden Repositories, also Fremdtext als Anweisung mit einer Vertrauens- und Reproduzierbarkeitsgrenze. Es ist nur mit gepinnter Kopie einzusetzen. frontend-design hat außer SKILL.md keine Referenzdateien, seine Regeln zum Interface-Text sind wenige Sätze, die oben ins Dokument eingehen. Die Quellen widersprechen sich an mehreren Stellen, etwa bei Satz- und Titelschreibung, bei Kontrastmaßen und bei der Zahl sichtbarer Optionen, sodass keine von ihnen als Ganzes übernommen werden sollte.
