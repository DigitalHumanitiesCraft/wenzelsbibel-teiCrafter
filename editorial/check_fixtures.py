# /// script
# requires-python = ">=3.11"
# dependencies = ["lxml>=5"]
# ///
"""Check docs/schemas/wenzelsbibel.sch against fixtures and vocabulary, or over real files.

Regime: single-file script (PEP 723), no first-party imports.

Fixture mode (default) reads fixtures/index.json, compiles the Schematron once per
phase with lxml.isoschematron (the ISO skeleton for XSLT 1.0) and runs every
fixture in its declared phase. A pass fixture must not trigger its rule, a fail
fixture must trigger it. The manifest is a contract and is checked before any
fixture runs. An entry that lacks one of rule, phase, severity, expected and file,
or names a phase other than editing or review, stops the run with the entry's
index and file. Then the manifest is checked against the schema itself. Every
assert and report needs an id and a role, and every rule id needs exactly one
pass and one fail fixture whose phase and severity match the schema. A mismatch
found there stops the run before the fixtures, so an entry naming a rule the
schema lacks never runs. The vocabulary check below runs too. Any mismatch makes
the exit code 1.

Vocabulary mode (--vocabulary) runs only the vocabulary check. It compares every
value list the schema encodes in an assert or report test with
docs/schemas/wenzelsbibel-vocabulary.json, the hand-edited source of the
controlled vocabularies. Each JSON list names the rules that encode it, with
scope "all" (the rule enumerates every value) or "data" (only the values with
source data). A rule whose test enumerates values that no list claims is a
mismatch as well, so the comparison runs in both directions. The German messages
repeat value lists for the editor, after "Zulässig nach Handbuch:" or "aus dem
Handbuch:" (the values with source handbook), after "Zulässig:" (every value) and
in "erwartet wird ... in Kleinbuchstaben" (the handbook values of the register
type). Each such list must equal the vocabulary list of its rule, so a ratified
value cannot leave a stale message behind. Messages without one of these markers
are not compared. Every list needs a German caption and every value a German
label, each with a labelSource of handbook, wireframe or working label.

Data mode (--data FILE ...) runs one phase (default review) over real edition
files and prints the number of findings per rule with one example each, the
input for a dated snapshot under snapshots/ such as
schematron-findings-2026-10-10.md. It never writes files. Every missing input
file is named before any file is read, and a file that is not well-formed XML is
reported by name while the other files are still processed.

List mode (--list) runs the same manifest check and prints the rule table as
Markdown (id, phase, severity, message), so editorial/README.md does not keep a
hand-maintained copy of what the schema already says.

Usage:
  python editorial/check_fixtures.py
  python editorial/check_fixtures.py --list
  python editorial/check_fixtures.py --vocabulary
  python editorial/check_fixtures.py --data codex.xml bild.xml [--phase review]

Design notes: rule ids are taken from the SVRL @id that the skeleton copies from
each sch:assert and sch:report, so a finding is attributed by id and not by
message text. lxml applies XSLT first-match semantics within a pattern; the
schema keeps rule contexts within a pattern disjoint so that the browser runtime,
which evaluates every rule independently, yields the same findings. The schema
lives under docs/schemas/ because GitHub Pages serves only docs/ and the editor
loads it from there; it is the single source, with no copy under editorial/.
Value lists are read from the two XPath 1.0 forms the schema uses,
contains(' a b c ', concat(' ', @x, ' ')) and comparisons @x = 'a' or $v = 'a',
after bracketed predicates are removed, so that node tests such as
tei:note[@type='description'] are not taken for vocabularies.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

from lxml import etree, isoschematron

HERE = Path(__file__).resolve().parent
SCHEMA_PATH = HERE.parent / "docs" / "schemas" / "wenzelsbibel.sch"
VOCABULARY_PATH = HERE.parent / "docs" / "schemas" / "wenzelsbibel-vocabulary.json"
FIXTURE_DIR = HERE / "fixtures"
SCH = "http://purl.oclc.org/dsdl/schematron"
SVRL = "http://purl.oclc.org/dsdl/svrl"
XML_ID = "{http://www.w3.org/XML/1998/namespace}id"
CONTAINS_LIST = re.compile(r"contains\(\s*'([^']*)'\s*,\s*concat\(\s*' '\s*,")
COMPARISON = re.compile(r"(?:@[\w:.-]+|\$[\w.-]+)\s*=\s*'([^']*)'")
SOURCES = frozenset({"handbook", "data"})
SCOPES = frozenset({"all", "data"})
LABEL_SOURCES = frozenset({"handbook", "wireframe", "working label"})
# The value lists the German messages repeat, each with the vocabulary values it
# must equal, "handbook" for the values with source handbook and "all" for every value.
MESSAGE_LISTS = (
    (re.compile(r"Zulässig nach Handbuch:\s*(.+?)\.(?:\s|$)"), "handbook"),
    (re.compile(r"aus dem Handbuch:\s*(.+?)\.(?:\s|$)"), "handbook"),
    (re.compile(r"Zulässig:\s*(.+?)\.(?:\s|$)"), "all"),
    (re.compile(r"erwartet wird\s+(.+?)\s+in Kleinbuchstaben"), "handbook"),
)
MESSAGE_SEPARATOR = re.compile(r",\s*|\s+oder\s+")
MANIFEST_KEYS = ("rule", "phase", "severity", "expected", "file")
PHASES = ("editing", "review")
EXPECTED = frozenset({"pass", "fail"})


@dataclass(frozen=True)
class Rule:
    rule_id: str
    phase: str
    severity: str
    message: str


@dataclass(frozen=True)
class Finding:
    rule_id: str
    role: str
    location: str
    text: str


def _rule_inventory(schema: etree._ElementTree) -> dict[str, Rule]:
    """Map each assert/report id to the first phase that activates it and its role."""
    root = schema.getroot()
    editing = {
        a.get("pattern")
        for a in root.iterfind(f"{{{SCH}}}phase[@id='editing']/{{{SCH}}}active")
    }
    rules: dict[str, Rule] = {}
    for pattern in root.iterfind(f"{{{SCH}}}pattern"):
        phase = "editing" if pattern.get("id") in editing else "review"
        for test in pattern.iter(f"{{{SCH}}}assert", f"{{{SCH}}}report"):
            rule_id, role = test.get("id"), test.get("role")
            if not rule_id or not role:
                raise SystemExit(
                    f"FEHLER: {etree.QName(test).localname} in pattern {pattern.get('id')} needs id and role"
                )
            if rule_id in rules:
                raise SystemExit(f"FEHLER: duplicate rule id {rule_id}")
            rules[rule_id] = Rule(rule_id, phase, role, _message(test))
    return rules


def _message(test: etree._Element) -> str:
    """Flatten an assert/report message, with each sch:value-of shown as its select."""
    parts = [test.text or ""]
    for child in test:
        if etree.QName(child).localname == "value-of":
            parts.append(f"{{{child.get('select')}}}")
        parts.append(child.tail or "")
    return " ".join("".join(parts).split())


def _validator(schema: etree._ElementTree, phase: str) -> isoschematron.Schematron:
    return isoschematron.Schematron(schema, phase=phase, store_report=True)


def _findings(
    validator: isoschematron.Schematron, doc: etree._ElementTree
) -> list[Finding]:
    validator.validate(doc)
    report = validator.validation_report
    found = []
    for node in report.iter(f"{{{SVRL}}}failed-assert", f"{{{SVRL}}}successful-report"):
        text = node.findtext(f"{{{SVRL}}}text") or ""
        found.append(
            Finding(
                node.get("id") or "?",
                node.get("role") or "",
                node.get("location") or "",
                " ".join(text.split()),
            )
        )
    return found


def _load_manifest() -> list[dict[str, str]]:
    """Read fixtures/index.json and stop at the first entry that breaks its shape.

    The message names the entry by index and, where present, by file, so a typo
    in the hand-edited manifest never ends in a bare KeyError further down.
    """
    try:
        manifest = json.loads((FIXTURE_DIR / "index.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise SystemExit(f"FEHLER: fixtures/index.json is unreadable: {exc}") from exc
    if not isinstance(manifest, list):
        raise SystemExit("FEHLER: fixtures/index.json must hold a list of entries")
    for index, entry in enumerate(manifest):
        where = f"fixtures/index.json entry {index}"
        if not isinstance(entry, dict):
            raise SystemExit(f"FEHLER: {where} is not an object")
        if isinstance(entry.get("file"), str):
            where += f" ({entry['file']})"
        for key in MANIFEST_KEYS:
            if not isinstance(entry.get(key), str) or not entry[key].strip():
                raise SystemExit(f"FEHLER: {where} lacks {key}")
        if entry["phase"] not in PHASES:
            raise SystemExit(
                f"FEHLER: {where} has phase {entry['phase']}, not editing or review"
            )
        if entry["expected"] not in EXPECTED:
            raise SystemExit(
                f"FEHLER: {where} has expected {entry['expected']}, not pass or fail"
            )
    return manifest


def _check_manifest(
    manifest: list[dict[str, str]], rules: dict[str, Rule]
) -> list[str]:
    problems = []
    seen = Counter((entry["rule"], entry["expected"]) for entry in manifest)
    for rule in rules.values():
        for expected in ("pass", "fail"):
            if seen[(rule.rule_id, expected)] != 1:
                problems.append(
                    f"{rule.rule_id}: needs exactly one {expected} fixture, found {seen[(rule.rule_id, expected)]}"
                )
    for entry in manifest:
        rule = rules.get(entry["rule"])
        if rule is None:
            problems.append(
                f"{entry['file']}: rule {entry['rule']} does not exist in the schema"
            )
        elif (entry["phase"], entry["severity"]) != (rule.phase, rule.severity):
            problems.append(
                f"{entry['file']}: manifest says {entry['phase']}/{entry['severity']}, schema says {rule.phase}/{rule.severity}"
            )
        if entry["file"] != f"{entry['rule']}.{entry['expected']}.xml":
            problems.append(
                f"{entry['file']}: file name does not follow <rule-id>.<expected>.xml"
            )
    return problems


def _without_predicates(expression: str) -> str:
    """Drop every bracketed predicate, nested ones included, from an XPath expression."""
    depth, kept = 0, []
    for char in expression:
        if char == "[":
            depth += 1
        elif char == "]":
            depth = max(depth - 1, 0)
        elif depth == 0:
            kept.append(char)
    return "".join(kept)


def _encoded_values(test: str) -> frozenset[str]:
    """Values an assert or report test enumerates, empty when it enumerates none."""
    expression = _without_predicates(test)
    values = {
        value for match in CONTAINS_LIST.findall(expression) for value in match.split()
    }
    values.update(COMPARISON.findall(expression))
    return frozenset(values)


def _message_lists(message: str) -> list[tuple[str, frozenset[str]]]:
    """Value lists a message repeats, each with the vocabulary scope it must equal.

    Items are separated by commas and "oder". An item such as "ohne @reason" names
    the absent attribute and is no value.
    """
    found = []
    for pattern, scope in MESSAGE_LISTS:
        for match in pattern.finditer(message):
            items = (item.strip() for item in MESSAGE_SEPARATOR.split(match.group(1)))
            values = frozenset(
                item for item in items if item and not item.startswith("ohne @")
            )
            found.append((scope, values))
    return found


def _difference(
    where: str,
    key: str,
    in_schema: frozenset[str],
    in_json: frozenset[str],
    side: str = "schema",
) -> str | None:
    if in_schema == in_json:
        return None
    parts = []
    if only_schema := sorted(in_schema - in_json):
        parts.append(f"only in {side}: {', '.join(only_schema)}")
    if only_json := sorted(in_json - in_schema):
        parts.append(f"only in vocabulary: {', '.join(only_json)}")
    return f"{where} and list {key} differ ({'; '.join(parts)})"


def _check_label(owner: str, item: dict) -> list[str]:
    problems = []
    label = item.get("label")
    if not isinstance(label, str) or not label.strip():
        problems.append(f"{owner} needs a German label")
    if item.get("labelSource") not in LABEL_SOURCES:
        problems.append(
            f"{owner} needs labelSource handbook, wireframe or working label"
        )
    return problems


def _check_list(
    entry: dict, tests: dict[str, str], messages: dict[str, str]
) -> list[str]:
    key = entry.get("key", "?")
    values = entry.get("values", [])
    problems = _check_label(f"list {key}", entry)
    names = [value.get("value") for value in values]
    if len(set(names)) != len(names):
        problems.append(f"list {key} repeats a value")
    for value in values:
        if value.get("source") not in SOURCES:
            problems.append(
                f"list {key}: value {value.get('value')} needs source handbook or data"
            )
        problems.extend(_check_label(f"list {key}: value {value.get('value')}", value))
    if not entry.get("rules"):
        problems.append(f"list {key} names no schema rule")
    for rule_id, scope in entry.get("rules", {}).items():
        if scope not in SCOPES:
            problems.append(
                f"list {key}: rule {rule_id} has scope {scope}, not all or data"
            )
        elif rule_id not in tests:
            problems.append(f"list {key} names rule {rule_id}, which the schema lacks")
        else:
            expected = frozenset(
                value["value"]
                for value in values
                if scope == "all" or value.get("source") == "data"
            )
            found = _encoded_values(tests[rule_id])
            if problem := _difference(f"rule {rule_id}", key, found, expected):
                problems.append(problem)
            for message_scope, listed in _message_lists(messages[rule_id]):
                wanted = frozenset(
                    value["value"]
                    for value in values
                    if message_scope == "all" or value.get("source") == "handbook"
                )
                if problem := _difference(
                    f"message of rule {rule_id}", key, listed, wanted, "message"
                ):
                    problems.append(problem)
    return problems


def _check_vocabulary(schema: etree._ElementTree) -> list[str]:
    """Compare the schema's value lists, in tests and messages, with the vocabulary JSON."""
    try:
        vocabulary = json.loads(VOCABULARY_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return [f"{VOCABULARY_PATH.name} is unreadable: {exc}"]
    asserts = [
        test
        for test in schema.getroot().iter(f"{{{SCH}}}assert", f"{{{SCH}}}report")
        if test.get("id")
    ]
    tests = {test.get("id"): test.get("test") or "" for test in asserts}
    messages = {test.get("id"): _message(test) for test in asserts}
    lists = vocabulary.get("lists", [])
    problems = [
        problem for entry in lists for problem in _check_list(entry, tests, messages)
    ]
    claimed = {rule_id for entry in lists for rule_id in entry.get("rules", {})}
    for rule_id, test in tests.items():
        if rule_id in claimed:
            continue
        if values := _encoded_values(test):
            problems.append(
                f"rule {rule_id} enumerates {', '.join(sorted(values))}, but no vocabulary list claims it"
            )
        if _message_lists(messages[rule_id]):
            problems.append(
                f"the message of rule {rule_id} lists values, but no vocabulary list claims the rule"
            )
    return problems


def run_vocabulary() -> int:
    problems = _check_vocabulary(etree.parse(str(SCHEMA_PATH)))
    for problem in problems:
        print(f"FEHLER vocabulary: {problem}", file=sys.stderr)
    print(f"vocabulary: {len(problems)} problem(s)")
    return 1 if problems else 0


def run_fixtures() -> int:
    schema = etree.parse(str(SCHEMA_PATH))
    rules = _rule_inventory(schema)
    manifest = _load_manifest()
    problems = _check_manifest(manifest, rules)
    for problem in problems:
        print(f"FEHLER manifest: {problem}", file=sys.stderr)
    vocabulary_problems = _check_vocabulary(schema)
    for problem in vocabulary_problems:
        print(f"FEHLER vocabulary: {problem}", file=sys.stderr)
    if problems:
        # A fixture run against a broken manifest would attribute results to the
        # wrong rule or phase, so the contract has to hold first.
        print(
            f"\nmanifest MISMATCH, fixtures not run, {len(problems) + len(vocabulary_problems)} problem(s)"
        )
        return 1

    validators = {phase: _validator(schema, phase) for phase in PHASES}
    rows = []
    failures = len(vocabulary_problems)
    for entry in manifest:
        try:
            doc = etree.parse(str(FIXTURE_DIR / entry["file"]))
        except (OSError, etree.XMLSyntaxError) as exc:
            rows.append((entry, "unreadable", f"MISMATCH ({exc})"))
            failures += 1
            continue
        fired = [
            f
            for f in _findings(validators[entry["phase"]], doc)
            if f.rule_id == entry["rule"]
        ]
        actual = "fail" if fired else "pass"
        status = "OK" if actual == entry["expected"] else "MISMATCH"
        failures += status != "OK"
        rows.append((entry, f"{len(fired)} finding(s)", status))

    print(
        f"{'rule':<26} {'phase':<8} {'severity':<8} {'expected':<8} {'result':<12} status"
    )
    for entry, result, status in rows:
        print(
            f"{entry['rule']:<26} {entry['phase']:<8} {entry['severity']:<8} {entry['expected']:<8} {result:<12} {status}"
        )
    print(
        f"\n{len(rules)} rules, {len(rows)} fixtures, vocabulary {'OK' if not vocabulary_problems else 'MISMATCH'}, {failures} problem(s)"
    )
    return 1 if failures else 0


def run_list() -> int:
    schema = etree.parse(str(SCHEMA_PATH))
    rules = _rule_inventory(schema)
    problems = _check_manifest(_load_manifest(), rules)
    for problem in problems:
        print(f"FEHLER manifest: {problem}", file=sys.stderr)
    if problems:
        return 1
    print("| Rule | Phase | Severity | Message |")
    print("|---|---|---|---|")
    for rule in rules.values():
        message = rule.message.replace("|", r"\|")
        print(f"| `{rule.rule_id}` | {rule.phase} | {rule.severity} | {message} |")
    return 0


def _name(node: etree._Element) -> str:
    return f"{etree.QName(node).localname}[@xml:id='{node.get(XML_ID)}']"


def _example(doc: etree._ElementTree, finding: Finding) -> str:
    """Locate a finding by xml:id: its own, an enclosing w or l, a contained or preceding w."""
    try:
        hits = doc.xpath(finding.location)
    except etree.XPathError:
        return finding.location
    if not hits or not isinstance(hits[0], etree._Element):
        return finding.location or "/"
    node = hits[0]
    local = etree.QName(node).localname
    if node.get(XML_ID):
        return _name(node)
    for ancestor in node.iterancestors():
        if ancestor.get(XML_ID) and etree.QName(ancestor).localname in {
            "w",
            "l",
            "item",
        }:
            return f"{_name(ancestor)} > {local}"
    for xpath, relation in (
        ("descendant::*[local-name()='w'][@xml:id][1]", "containing"),
        ("preceding::*[local-name()='w'][@xml:id][1]", "after"),
    ):
        found = node.xpath(xpath)
        if found:
            return f"{local} {relation} {_name(found[0])}"
    attributes = " ".join(
        f'{etree.QName(k).localname}="{v}"' for k, v in list(node.attrib.items())[:3]
    )
    return f"{local} {attributes}".strip()


def run_data(paths: list[Path], phase: str) -> int:
    schema = etree.parse(str(SCHEMA_PATH))
    rules = _rule_inventory(schema)
    validator = _validator(schema, phase)
    missing = [path for path in paths if not path.is_file()]
    for path in missing:
        print(f"FEHLER: input file {path} not found", file=sys.stderr)
    if missing:
        return 1
    unreadable = []
    for path in paths:
        try:
            doc = etree.parse(str(path), etree.XMLParser(huge_tree=True))
        except (OSError, etree.XMLSyntaxError) as exc:
            print(
                f"FEHLER: input file {path} is not well-formed XML: {exc}",
                file=sys.stderr,
            )
            unreadable.append(path)
            continue
        findings = _findings(validator, doc)
        counts = Counter(f.rule_id for f in findings)
        print(f"== {path.name} (phase {phase}): {len(findings)} finding(s)")
        print(f"{'rule':<26} {'severity':<8} {'count':>6}  example")
        for rule_id, count in counts.most_common():
            first = next(f for f in findings if f.rule_id == rule_id)
            severity = rules[rule_id].severity if rule_id in rules else first.role
            print(
                f"{rule_id:<26} {severity:<8} {count:>6}  {_example(doc, first)} | {first.text[:160]}"
            )
        print()
    if unreadable:
        print(
            f"{len(unreadable)} of {len(paths)} input file(s) not read", file=sys.stderr
        )
        return 1
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--data",
        nargs="+",
        type=Path,
        help="real edition files to report on instead of the fixtures",
    )
    parser.add_argument(
        "--phase",
        default="review",
        choices=["editing", "review"],
        help="phase for --data (default review)",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="print the rule table as Markdown instead of running the fixtures",
    )
    parser.add_argument(
        "--vocabulary",
        action="store_true",
        help="only compare the schema's value lists with the vocabulary JSON",
    )
    args = parser.parse_args()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if args.list:
        return run_list()
    if args.vocabulary:
        return run_vocabulary()
    if args.data:
        return run_data(args.data, args.phase)
    return run_fixtures()


if __name__ == "__main__":
    sys.exit(main())
