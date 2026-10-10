# Schematron findings in the edition data, 2026-10-10

This snapshot records a run of `wenzelsbibel.sch` over the public TEI of the codex (`o:wen.codex-2759`) and of the image annotations (`o:wen.bildannotationen--codex-2759`), both downloaded from edition.onb.ac.at on 2026-10-10. The run used `check_fixtures.py --data` with lxml 5.3.0 (ISO Schematron skeleton for XSLT 1.0) on Python 3.11. The review phase took just under three minutes for both files, most of it in the anchor lookups of the apparatus rules. The figures describe this state of the data and this version of the schema and will change with either.

## Result per phase

The editing phase reports no finding for either file, so a save gate on that phase accepts both files as published. `w-id` and `register-pointer` belong to the review phase, where they count among the codex errors below.

The review phase reports 277 findings for the image annotations, all errors, and 30,929 findings for the codex, of which 30,791 are warnings on values outside the handbook and 138 are errors.

## Counts per rule

| Rule | Severity | Codex | Image annotations |
|---|---|---:|---:|
| `tei-root` | error | 0 | 0 |
| `w-id` | error | 31 | 0 |
| `app-from-to` | error | 0 | 0 |
| `register-type` | error | 0 | 0 |
| `register-pointer` | error | 28 | 0 |
| `hi-rend-known` | error | 0 | 0 |
| `hi-rend-data-only` | warning | 11,320 | 0 |
| `supplied-reason-known` | error | 2 | 0 |
| `supplied-reason-data-only` | warning | 19,027 | 0 |
| `surplus-reason-known` | error | 0 | 0 |
| `del-type-known` | error | 0 | 0 |
| `del-type-data-only` | warning | 7 | 0 |
| `foreign-lang-known` | error | 0 | 0 |
| `num-type-known` | error | 0 | 0 |
| `note-type-known` | error | 0 | 0 |
| `fw-ana-known` | error | 0 | 0 |
| `seg-ana-known` | error | 0 | 0 |
| `seg-ana-data-only` | warning | 328 | 0 |
| `app-type-known` | error | 20 | 0 |
| `app-sameas-unanchored` | warning | 108 | 0 |
| `app-anchors-resolve` | error | 16 | 0 |
| `app-order` | error | 1 | 0 |
| `register-pointer-syntax` | error | 40 | 0 |
| `register-type-case` | warning | 1 | 0 |
| `image-title` | error | 0 | 0 |
| `image-description` | error | 0 | 66 |
| `image-folio` | error | 0 | 0 |
| `image-artist` | error | 0 | 66 |
| `image-short-description` | error | 0 | 66 |
| `image-height` | error | 0 | 0 |
| `image-artist-resolves` | error | 0 | 12 |
| `iconclass-target` | error | 0 | 0 |
| `iconclass-label-de` | error | 0 | 0 |
| `iconclass-label-en` | error | 0 | 0 |
| `image-range-syntax` | error | 0 | 67 |

The warning counts agree with an independent inventory of attribute values over the same files (for example 10,845 `ligature`, 326 `textStyle`, 93 `decoration`, 54 `full_page` and one each of `marginalia` and `italic` make the 11,320 `hi` warnings).

## The five most frequent findings

`supplied-reason-data-only` (19,027, warning). Added punctuation is encoded throughout as `supplied[@reason='additionalPunctuation']`, a value the handbook does not list. The first occurrence follows `w[@xml:id='region_1639399488602_10l2_3']` in the prologue heading:

```xml
<supplied reason="additionalPunctuation"><pc>,</pc></supplied>
```

`hi-rend-data-only` (11,320, warning). Almost all are ligatures, for example in `w[@xml:id='region_1639399488602_10l1_7']` on fol. 1r:

```xml
<w norm="der" orig="der" xml:id="region_1639399488602_10l1_7"><hi rend="ligature">de</hi>r</w>
```

`seg-ana-data-only` (328, warning). Every text region other than the header is a `seg`, as the guidelines describe. The first one is a marginal note on fol. 1r containing `w[@xml:id='line_1639405016730_271_0']`:

```xml
<seg ana="marginalia" facs="#region_1639399585108_22"><anchor xml:id="start_43578"/><hi rend="marginalia">…
```

`app-sameas-unanchored` (108, warning). Apparatus entries that consist only of `@sameAs` and `@type`, for example the 40th `app` of `listApp`:

```xml
<app sameAs="#d3c_vsn_qbc" type="comment_translation"/>
```

Every `@sameAs` resolves to an existing `app/@xml:id`, but these entries name no text position of their own.

`image-range-syntax` (67, error). All 67 are the empty range `#range(,)`. 39 of them have an empty note, two state that the miniature has no recognisable text relation, and the rest carry an unfilled template with only the Bible reference, for example `WB: f. Z. bis f. Z., Bibel: Jos 2`. The first is in `item[@xml:id='miniatures_139']`:

```xml
<note anchored="true" corresp="#range(,)" resp="editor" subtype="statistic" type="text-relation">Diese Miniatur weist keinen erkennbaren Textbezug auf.</note>
```

## Findings the editorial guidelines do not yet mention

- The codex uses 14 `app/@type` values beyond the seven in the guidelines, together on 19 entries, and one entry has no type. Some read as typing errors (`comment_understandning`, `comment_unerstanding`, `comment_comment_translation_ses`, `edition`, `translation`), others as further categories (`comment_participle`, `comment_AcI`, `comment_Abl.abs.`, `comment_exegesis`, `comment_adaption`, `comment_V-addition`, `comment_painting_instruction`, `comment_vulgate_template`, `comment_tb`).
- 108 apparatus entries carry only `@sameAs` and no anchors, and a further 17 carry both `@sameAs` and anchors. The guidelines describe neither form.
- 16 apparatus entries have 19 pointers that resolve to no anchor. Nine of the pointers lack the leading `#` (for example `to="end_ykf_msd_nzb"`), and none of those IDs exists in the file either. One entry has `to="#"`, and another points `@from` and `@to` at the same start anchor (`#start_96783`). 14 anchors in the text are referenced by no entry.
- 31 `w` elements with `@orig` and `@norm` lack an `xml:id`. 18 of them stand inside `supplied` and 12 inside `choice/corr`, for example `<corr><w norm="schreibit" orig="ſchreibit">ſchreibit</w></corr>`, which suggests that words added during editorial or historical correction were not given IDs.
- 40 `ref/@target` values contain spaces or a trailing space, for example `Sodomit, Sodomiten`, `König Wenzel`, `Arpachschad ` and `Peleg `. Whether multi-word IDs are intended or need normalising belongs to the register decision.
- 382 typed `ref` elements lie inside another typed `ref`. The schema does not check nesting, which matters for how the inspector shows and edits register chips.
- Two `supplied` elements have no `@reason`, one around a word (`<supplied><w>volke</w></supplied>` in `l[@xml:id='Exodus.30.33']`), one around a punctuation mark.
- The items `miniatures_191` to `miniatures_256`, 66 in all, have a title, height and folio but empty descriptions and no artist attribution, which suggests that annotation of the later folios is in progress.
- All statistical ranges that fail the syntax check are the empty form `#range(,)`. No other malformed range occurs in this version of the file. Whether well-formed ranges name existing word IDs is a cross-file check that the Schematron cannot make.
- The guidelines name the artist sigla `#STW` as undeclared, and the run counts 12 occurrences.
