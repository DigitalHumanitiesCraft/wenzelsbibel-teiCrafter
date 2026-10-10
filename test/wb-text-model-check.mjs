// Fork proof for the Wenzelsbibel comment model reading the project vocabulary, run
// on the tracked fol. 1r excerpt by npm run check:fork:
//   node test/wb-text-model-check.mjs
// It asserts the exact bytes createWenzelsComment writes for a comment on one whole
// word and on two words, and that the comment type is written escaped, so no type
// value can add an attribute to the raw XML. The inherited proof
// test/proofs/wenzels_text_model_check.mjs covers calls without the vocabulary.
import { readFileSync } from "node:fs";
import { parseDocument } from "../docs/js/editor/tei-document.js";
import {
  createWenzelsComment, offeredCommentTypes, readWenzelsComments,
} from "../docs/js/projects/wenzelsbibel/wenzels-text-model.js";
import { check, finish, section } from "./proofs/_assert.mjs";

const raw = readFileSync(new URL("../prototypes/d-flow/fixture/fol1r.xml", import.meta.url), "utf8");
const vocabulary = JSON.parse(readFileSync(new URL("../docs/schemas/wenzelsbibel-vocabulary.json", import.meta.url), "utf8"));
const doc = parseDocument(raw);
function refuses(action) { try { action(); return false; } catch { return true; } }

// Three of the opening words of fol. 1r, "Hie hebt ſich an die voꝛ rede".
const hie = { id: "region_1639399488602_10l3_0", xml: '<w norm="Hie" orig="Hie" xml:id="region_1639399488602_10l3_0">Hie</w>' };
const hebt = { id: "region_1639399488602_10l1_0", xml: '<w norm="hebt" orig="hebt" xml:id="region_1639399488602_10l1_0">hebt</w>' };
const sich = { id: "region_1639399488602_10l1_1", xml: '<w norm="sich" orig="ſich" xml:id="region_1639399488602_10l1_1">ſich</w>' };
const notes = [{ text: "Notiz", lang: "de" }];
const noteXml = '<note xml:lang="de">Notiz</note>';

/** The excerpt with a new standOff after its header and the comment's anchors around the words. */
function expectedBytes(first, last, type) {
  const headerEnd = raw.indexOf("</teiHeader>") + "</teiHeader>".length;
  const start = raw.indexOf(first.xml);
  const end = raw.indexOf(last.xml) + last.xml.length;
  const app = `<app xml:id="wb-comment" type="${type}" from="#wb-comment-from" to="#wb-comment-to">${noteXml}</app>`;
  return `${raw.slice(0, headerEnd)}<standOff><listApp>${app}</listApp></standOff>${raw.slice(headerEnd, start)}`
    + `<anchor xml:id="wb-comment-from"/>${raw.slice(start, end)}<anchor xml:id="wb-comment-to"/>${raw.slice(end)}`;
}

section("Comment types offered by the project vocabulary");
const list = vocabulary.lists.find((entry) => entry.key === "apparatus-type");
const offered = offeredCommentTypes(vocabulary);
check("the offered types are the vocabulary's offered apparatus types with their labels, in list order",
  JSON.stringify(offered) === JSON.stringify(list.values.filter((entry) => entry.offered).map((entry) => [entry.value, entry.label])));
check("every offered type has a German label of its own", offered.length > 0 && offered.every(([value, label]) => label && label !== value));
check("a vocabulary that offers no apparatus type is refused",
  refuses(() => offeredCommentTypes({ lists: [{ ...list, values: list.values.map(({ offered: _, ...entry }) => entry) }] })));
const types = offered.map(([value]) => value);

section("Comments on fol. 1r with the offered types");
check("the excerpt holds each chosen word once", [hie, hebt, sich].every((word) => raw.indexOf(word.xml) >= 0 && raw.indexOf(word.xml) === raw.lastIndexOf(word.xml)));
const one = createWenzelsComment(doc, { from: hie.id, to: hie.id }, { types, notes });
check("a comment on one whole word anchors that word and takes the first offered type", one.raw === expectedBytes(hie, hie, types[0]));
const two = createWenzelsComment(doc, { from: hebt.id, to: sich.id }, { types, type: types.at(-1), notes });
check("a comment on two words anchors both and writes the chosen offered type", two.raw === expectedBytes(hebt, sich, types.at(-1)));
const [read] = readWenzelsComments(two);
check("the two-word comment reads back with its type and covers exactly both words",
  read.type === types.at(-1) && two.raw.slice(read.start, read.end) === raw.slice(raw.indexOf(hebt.xml), raw.indexOf(sich.xml) + sich.xml.length));
const unoffered = list.values.find((entry) => !entry.offered).value;
check("a vocabulary type that is not offered is refused", refuses(() => createWenzelsComment(doc, { from: hie.id, to: hie.id }, { types, type: unoffered, notes })));
check("creating a comment leaves the source document unchanged", doc.raw === raw);

section("Escaping of the comment type");
const quoted = 'comment_edition" onload="x';
const escaped = "comment_edition&quot; onload=&quot;x";
const withQuote = createWenzelsComment(doc, { from: hie.id, to: hie.id }, { types: [...types, quoted], type: quoted, notes });
check("an offered type containing a quote is written escaped", withQuote.raw === expectedBytes(hie, hie, escaped));
check("the escaped type reads back as the chosen value", readWenzelsComments(parseDocument(withQuote.raw))[0].type === quoted);
const withoutTypes = createWenzelsComment(doc, { from: hie.id, to: hie.id }, { type: quoted, notes });
check("a call without the vocabulary's types writes the same escaped bytes", withoutTypes.raw === withQuote.raw);

finish("wb-text-model-check passed");
