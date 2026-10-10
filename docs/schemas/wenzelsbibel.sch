<?xml version="1.0" encoding="UTF-8"?>
<sch:schema xmlns:sch="http://purl.oclc.org/dsdl/schematron" queryBinding="xslt1" defaultPhase="editing">
  <sch:title>Wenzelsbibel: Editionsregeln für Codex 2759 und Bildannotationen</sch:title>
  <sch:ns prefix="tei" uri="http://www.tei-c.org/ns/1.0"/>
  <sch:p>Project Schematron of the Wenzelsbibel edition, derived from knowledge/editorial-guidelines.md. The phase editing holds only what a save must never break, and the published codex passes it unchanged. The phase review adds word identifiers, non-empty register pointers, the handbook vocabularies (errors for unknown values, warnings with role="warning" for values found only in the data), the apparatus and register checks and the image-annotation review rules. Restricted to XPath 1.0, plain rules, scalar lets, asserts and reports so that the browser runtime of teiCrafter can execute it without compilation. Rules within one pattern have disjoint contexts, because that runtime evaluates every rule independently instead of applying XSLT first-match semantics.</sch:p>

  <sch:phase id="editing">
    <sch:active pattern="editing-root"/>
    <sch:active pattern="editing-apparatus"/>
    <sch:active pattern="editing-registers"/>
  </sch:phase>
  <sch:phase id="review">
    <sch:active pattern="editing-root"/>
    <sch:active pattern="editing-apparatus"/>
    <sch:active pattern="editing-registers"/>
    <sch:active pattern="review-words"/>
    <sch:active pattern="review-highlighting"/>
    <sch:active pattern="review-interventions"/>
    <sch:active pattern="review-languages-numbers-notes"/>
    <sch:active pattern="review-regions"/>
    <sch:active pattern="review-apparatus"/>
    <sch:active pattern="review-apparatus-anchors"/>
    <sch:active pattern="review-registers"/>
    <sch:active pattern="review-image-records"/>
    <sch:active pattern="review-image-miniatures"/>
    <sch:active pattern="review-image-artists"/>
    <sch:active pattern="review-image-iconclass"/>
    <sch:active pattern="review-image-ranges"/>
  </sch:phase>

  <sch:pattern id="editing-root">
    <sch:rule context="/">
      <sch:assert id="tei-root" role="error" test="tei:TEI">Das Dokument braucht ein Wurzelelement TEI im TEI-Namensraum (http://www.tei-c.org/ns/1.0).</sch:assert>
    </sch:rule>
  </sch:pattern>

  <sch:pattern id="review-words">
    <sch:rule context="tei:w[@orig or @norm]">
      <sch:assert id="w-id" role="error" test="normalize-space(@xml:id) != ''">Ein Wort mit diplomatischer oder normalisierter Lesung (@orig, @norm) braucht eine xml:id, damit Apparat, Register und Bildbezüge darauf verweisen können. Wort: "<sch:value-of select="normalize-space(.)"/>".</sch:assert>
    </sch:rule>
  </sch:pattern>

  <sch:pattern id="editing-apparatus">
    <sch:rule context="tei:app">
      <sch:assert id="app-from-to" role="error" test="@sameAs or (normalize-space(@from) != '' and normalize-space(@to) != '')">Ein Apparateintrag braucht @from und @to, die auf seinen Anfangs- und Endanker im Text zeigen (außer er verweist mit @sameAs auf einen anderen Eintrag).</sch:assert>
    </sch:rule>
  </sch:pattern>

  <sch:pattern id="editing-registers">
    <sch:rule context="tei:rs | tei:body//tei:ref[not(ancestor::tei:list[@type='image-annotations' or @type='page-annotations'])]">
      <sch:let name="typeLower" value="translate(@type, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')"/>
      <sch:assert id="register-type" role="error" test="$typeLower = 'person' or $typeLower = 'place' or $typeLower = 'folk'">Ein Registerverweis braucht @type mit einem Wert aus dem Handbuch: person, place oder folk. Gefunden: "<sch:value-of select="@type"/>".</sch:assert>
    </sch:rule>
  </sch:pattern>

  <sch:pattern id="review-highlighting">
    <sch:rule context="tei:hi">
      <sch:assert id="hi-rend-known" role="error" test="@rend and contains(' rubrication inkRed gold initial initial_historisiert border_decoration ligature textStyle decoration full_page marginalia italic ', concat(' ', @rend, ' '))">Unbekannter Hervorhebungswert hi/@rend="<sch:value-of select="@rend"/>". Zulässig nach Handbuch: rubrication, inkRed, gold, initial, initial_historisiert, border_decoration.</sch:assert>
      <sch:report id="hi-rend-data-only" role="warning" test="contains(' ligature textStyle decoration full_page marginalia italic ', concat(' ', @rend, ' '))">Der Wert hi/@rend="<sch:value-of select="@rend"/>" kommt in den Daten vor, steht aber nicht im Transkriptionshandbuch. Er wartet auf die Entscheidung des Editionsteams.</sch:report>
    </sch:rule>
  </sch:pattern>

  <sch:pattern id="review-interventions">
    <sch:rule context="tei:supplied">
      <sch:assert id="supplied-reason-known" role="error" test="@reason and contains(' text_intervention switch damage additionalPunctuation ', concat(' ', @reason, ' '))">Ergänzter Text (supplied) braucht @reason aus dem Handbuch: text_intervention, switch oder damage. Gefunden: "<sch:value-of select="@reason"/>".</sch:assert>
      <sch:report id="supplied-reason-data-only" role="warning" test="@reason = 'additionalPunctuation'">Der Wert supplied/@reason="additionalPunctuation" kommt in den Daten vor, steht aber nicht im Transkriptionshandbuch.</sch:report>
    </sch:rule>
    <sch:rule context="tei:surplus">
      <sch:assert id="surplus-reason-known" role="error" test="not(@reason) or contains(' Diplography decor text_erasure switch instruction_note ', concat(' ', @reason, ' '))">Unbekannter Grund surplus/@reason="<sch:value-of select="@reason"/>". Zulässig nach Handbuch: ohne @reason, Diplography, decor, text_erasure, switch, instruction_note.</sch:assert>
    </sch:rule>
    <sch:rule context="tei:del">
      <sch:assert id="del-type-known" role="error" test="not(@type) or contains(' erasure redemption_point erasure_point ', concat(' ', @type, ' '))">Unbekannte Tilgungsart del/@type="<sch:value-of select="@type"/>". Zulässig nach Handbuch: ohne @type, erasure, redemption_point.</sch:assert>
      <sch:report id="del-type-data-only" role="warning" test="@type = 'erasure_point'">Der Wert del/@type="erasure_point" kommt in den Daten vor; das Handbuch nennt für den Tilgungspunkt redemption_point.</sch:report>
    </sch:rule>
  </sch:pattern>

  <sch:pattern id="review-languages-numbers-notes">
    <sch:rule context="tei:foreign">
      <sch:assert id="foreign-lang-known" role="error" test="@xml:lang = 'lat' or @xml:lang = 'cze'">Fremdsprachiger Text (foreign) braucht xml:lang aus dem Handbuch: lat oder cze. Gefunden: "<sch:value-of select="@xml:lang"/>".</sch:assert>
    </sch:rule>
    <sch:rule context="tei:num">
      <sch:assert id="num-type-known" role="error" test="@type = 'chapter'">Eine Zahl (num) braucht nach Handbuch @type="chapter". Gefunden: "<sch:value-of select="@type"/>".</sch:assert>
    </sch:rule>
    <sch:rule context="tei:body//tei:note[not(ancestor::tei:list[@type='image-annotations' or @type='page-annotations'])]">
      <sch:assert id="note-type-known" role="error" test="@type = 'instruction'">Eine Anmerkung im Codextext braucht nach Handbuch @type="instruction" (nicht ausgeführte Anweisung). Gefunden: "<sch:value-of select="@type"/>".</sch:assert>
    </sch:rule>
  </sch:pattern>

  <sch:pattern id="review-regions">
    <sch:rule context="tei:fw">
      <sch:assert id="fw-ana-known" role="error" test="@ana and contains(' header instruction_note marginalia text_in_image borderdecoration scroll painter_instruction ', concat(' ', @ana, ' '))">Unbekannter Regionstyp fw/@ana="<sch:value-of select="@ana"/>". Zulässig nach Handbuch: header, instruction_note, marginalia, text_in_image, borderdecoration, scroll, painter_instruction.</sch:assert>
    </sch:rule>
    <sch:rule context="tei:seg[@ana]">
      <sch:assert id="seg-ana-known" role="error" test="contains(' header instruction_note marginalia text_in_image borderdecoration border-decoration border_decoration scroll painter_instruction ', concat(' ', @ana, ' '))">Unbekannter Regionstyp seg/@ana="<sch:value-of select="@ana"/>". Bekannt sind die Regionstypen des Handbuchs und die Schreibungen border-decoration und border_decoration aus den Daten.</sch:assert>
      <sch:report id="seg-ana-data-only" role="warning" test="true()">Die Textregion "<sch:value-of select="@ana"/>" ist als seg codiert; das Handbuch sieht fw/@ana vor (bei Randdekoration mit dem Wert borderdecoration). Element und Schreibung warten auf die Entscheidung des Editionsteams.</sch:report>
    </sch:rule>
  </sch:pattern>

  <sch:pattern id="review-apparatus">
    <sch:rule context="tei:app">
      <sch:assert id="app-type-known" role="error" test="normalize-space(@type) != '' and contains(' comment_edition comment_understanding comment_translation comment_translation_ses comment_translation_vev comment_manuscript comment_variant ', concat(' ', @type, ' '))">Unbekannter Kommentartyp app/@type="<sch:value-of select="@type"/>". Zulässig: comment_edition, comment_understanding, comment_translation, comment_translation_ses, comment_translation_vev, comment_manuscript, comment_variant.</sch:assert>
      <sch:report id="app-sameas-unanchored" role="warning" test="@sameAs and not(@from or @to)">Der Apparateintrag verweist mit @sameAs="<sch:value-of select="@sameAs"/>" auf einen anderen Eintrag, hat aber selbst kein @from und @to und ist damit an keiner Textstelle verankert.</sch:report>
    </sch:rule>
  </sch:pattern>

  <sch:pattern id="review-apparatus-anchors">
    <sch:rule context="tei:app[@from or @to]">
      <sch:let name="fromId" value="substring-after(@from, '#')"/>
      <sch:let name="toId" value="substring-after(@to, '#')"/>
      <sch:let name="found" value="count(/tei:TEI/tei:text/descendant::tei:anchor[@xml:id = $fromId or @xml:id = $toId])"/>
      <sch:let name="first" value="string((/tei:TEI/tei:text/descendant::tei:anchor[@xml:id = $fromId or @xml:id = $toId])[1]/@xml:id)"/>
      <sch:let name="resolved" value="starts-with(@from, '#') and starts-with(@to, '#') and $fromId != '' and $toId != '' and ($found = 2 or ($found = 1 and $fromId = $toId))"/>
      <sch:assert id="app-anchors-resolve" role="error" test="$resolved">Die Zeiger des Apparateintrags müssen die Form #ID haben und auf ein anchor-Element im Text desselben Dokuments zeigen. @from="<sch:value-of select="@from"/>", @to="<sch:value-of select="@to"/>".</sch:assert>
      <sch:assert id="app-order" role="error" test="not($resolved) or ($fromId != $toId and $first = $fromId)">Der Anfangsanker (@from="<sch:value-of select="@from"/>") muss im Text vor dem Endanker (@to="<sch:value-of select="@to"/>") stehen, und beide müssen verschiedene Anker sein.</sch:assert>
    </sch:rule>
  </sch:pattern>

  <sch:pattern id="review-registers">
    <sch:rule context="tei:rs | tei:body//tei:ref[not(ancestor::tei:list[@type='image-annotations' or @type='page-annotations'])]">
      <sch:let name="pointer" value="concat(@ref, @target)"/>
      <sch:assert id="register-pointer" role="error" test="(self::tei:rs and normalize-space(@ref) != '') or (self::tei:ref and normalize-space(@target) != '')">Ein Registerverweis braucht einen nicht leeren Zeiger auf den Registereintrag: @ref bei rs, @target bei ref.</sch:assert>
      <sch:assert id="register-pointer-syntax" role="error" test="$pointer = normalize-space($pointer) and not(contains($pointer, ' '))">Der Registerzeiger "<sch:value-of select="concat(@ref, @target)"/>" darf keine Leerzeichen enthalten, weder am Anfang oder Ende noch im Inneren; eine Register-ID ist ein einzelnes Token.</sch:assert>
      <sch:report id="register-type-case" role="warning" test="@type and not(@type = 'person' or @type = 'place' or @type = 'folk')">Der Registertyp "<sch:value-of select="@type"/>" weicht in der Schreibung vom Handbuch ab; erwartet wird person, place oder folk in Kleinbuchstaben.</sch:report>
    </sch:rule>
  </sch:pattern>

  <sch:pattern id="review-image-records">
    <sch:rule context="tei:list[@type='image-annotations']/tei:item[not(@sameAs)]">
      <sch:assert id="image-title" role="error" test="tei:title[normalize-space(.) != '']">Eine Bildannotation braucht einen nicht leeren Titel (title). Eintrag: <sch:value-of select="@xml:id"/>.</sch:assert>
      <sch:assert id="image-description" role="error" test="tei:note[@type='description'][not(@subtype)][normalize-space(.) != '']">Eine Bildannotation braucht eine nicht leere Beschreibung (note type="description" ohne subtype). Eintrag: <sch:value-of select="@xml:id"/>.</sch:assert>
      <sch:assert id="image-folio" role="error" test="tei:ref[@type='folio'][normalize-space(@target) != '']">Eine Bildannotation braucht eine Folioangabe (ref type="folio" mit @target). Eintrag: <sch:value-of select="@xml:id"/>.</sch:assert>
      <sch:assert id="image-artist" role="error" test="tei:listPerson[@type='artists']/tei:person[normalize-space(@corresp) != '']">Eine Bildannotation braucht eine Künstlerzuweisung (listPerson type="artists" mit person/@corresp). Eintrag: <sch:value-of select="@xml:id"/>.</sch:assert>
    </sch:rule>
  </sch:pattern>

  <sch:pattern id="review-image-miniatures">
    <sch:rule context="tei:list[@type='image-annotations'][@subtype='miniatures']/tei:item[not(@sameAs)]">
      <sch:assert id="image-short-description" role="error" test="tei:note[@type='description'][@subtype='short'][normalize-space(.) != '']">Eine Miniatur braucht eine nicht leere Kurzbeschreibung (note type="description" subtype="short"). Eintrag: <sch:value-of select="@xml:id"/>.</sch:assert>
      <sch:assert id="image-height" role="error" test="tei:dimensions/tei:height[number(.) &gt; 0]">Eine Miniatur braucht eine positive Höhe in Zeilen (dimensions/height). Eintrag: <sch:value-of select="@xml:id"/>.</sch:assert>
    </sch:rule>
  </sch:pattern>

  <sch:pattern id="review-image-artists">
    <sch:rule context="tei:list[@type='image-annotations']/tei:item/tei:listPerson[@type='artists']/tei:person">
      <sch:let name="refs" value="normalize-space(@corresp)"/>
      <sch:let name="tokens" value="1 + string-length($refs) - string-length(translate($refs, ' ', ''))"/>
      <sch:assert id="image-artist-resolves" role="error" test="$refs != '' and count(/tei:TEI/tei:teiHeader//tei:respStmt/tei:persName[@xml:id][contains(concat(' ', $refs, ' '), concat(' #', @xml:id, ' '))]) = $tokens">Jeder Künstlerverweis muss auf eine eigene Sigle (persName/@xml:id in einem respStmt des Headers) zeigen. Gefunden: "<sch:value-of select="@corresp"/>".</sch:assert>
    </sch:rule>
  </sch:pattern>

  <sch:pattern id="review-image-iconclass">
    <sch:rule context="tei:list[@type='image-annotations']/tei:item//tei:ref[@type='iconclass-label']">
      <sch:assert id="iconclass-target" role="error" test="normalize-space(@corresp) != ''">Ein ICONCLASS-Eintrag braucht in @corresp die Notation als URL (https://iconclass.org/...).</sch:assert>
      <sch:assert id="iconclass-label-de" role="error" test="tei:desc[@xml:lang='de'][normalize-space(.) != '']">Ein ICONCLASS-Eintrag braucht eine nicht leere deutsche Bezeichnung (desc xml:lang="de"). Notation: <sch:value-of select="@corresp"/>.</sch:assert>
      <sch:assert id="iconclass-label-en" role="error" test="tei:desc[@xml:lang='en'][normalize-space(.) != '']">Ein ICONCLASS-Eintrag braucht eine nicht leere englische Bezeichnung (desc xml:lang="en"). Notation: <sch:value-of select="@corresp"/>.</sch:assert>
    </sch:rule>
  </sch:pattern>

  <sch:pattern id="review-image-ranges">
    <sch:rule context="tei:list[@type='image-annotations']/tei:item/tei:note[@type='text-relation'][@subtype='statistic'][@corresp]">
      <sch:let name="range" value="normalize-space(@corresp)"/>
      <sch:let name="body" value="substring-before(substring-after($range, '#range('), ')')"/>
      <sch:let name="start" value="normalize-space(substring-before($body, ','))"/>
      <sch:let name="end" value="normalize-space(substring-after($body, ','))"/>
      <sch:assert id="image-range-syntax" role="error" test="starts-with($range, '#range(') and substring($range, string-length($range), 1) = ')' and string-length($range) - string-length(translate($range, '(', '')) = 1 and string-length($range) - string-length(translate($range, ')', '')) = 1 and string-length($body) - string-length(translate($body, ',', '')) = 1 and $start != '' and $end != '' and not(contains($start, ' ')) and not(contains($end, ' '))">Ein statistischer Textbezug braucht die Form #range(Anfangswort-ID, Endwort-ID) mit zwei nicht leeren Wort-IDs. Gefunden: "<sch:value-of select="@corresp"/>".</sch:assert>
    </sch:rule>
  </sch:pattern>
</sch:schema>
