# /// script
# requires-python = ">=3.11"
# dependencies = ["lxml>=5"]
# ///
"""Check editorial/wenzelsbibel.sch against its fixtures, or report it over real files.

Regime: single-file script (PEP 723), no first-party imports.

Fixture mode (default) reads fixtures/index.json, compiles the Schematron once per
phase with lxml.isoschematron (the ISO skeleton for XSLT 1.0) and runs every
fixture in its declared phase. A pass fixture must not trigger its rule, a fail
fixture must trigger it. Before running, the manifest is checked against the
schema itself: every assert and report needs an id and a role, and every rule id
needs exactly one pass and one fail fixture whose phase and severity match the
schema. Any mismatch makes the exit code 1.

Data mode (--data FILE ...) runs one phase (default review) over real edition
files and prints the number of findings per rule with one example each, the
input for a dated snapshot under snapshots/ such as
schematron-findings-2026-10-10.md. It never writes files.

List mode (--list) runs the same manifest check and prints the rule table as
Markdown (id, phase, severity, message), so editorial/README.md does not keep a
hand-maintained copy of what the schema already says.

Usage:
  python editorial/check_fixtures.py
  python editorial/check_fixtures.py --list
  python editorial/check_fixtures.py --data codex.xml bild.xml [--phase review]

Design notes: rule ids are taken from the SVRL @id that the skeleton copies from
each sch:assert and sch:report, so a finding is attributed by id and not by
message text. lxml applies XSLT first-match semantics within a pattern; the
schema keeps rule contexts within a pattern disjoint so that the browser runtime,
which evaluates every rule independently, yields the same findings.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

from lxml import etree, isoschematron

HERE = Path(__file__).resolve().parent
SCHEMA_PATH = HERE / "wenzelsbibel.sch"
FIXTURE_DIR = HERE / "fixtures"
SCH = "http://purl.oclc.org/dsdl/schematron"
SVRL = "http://purl.oclc.org/dsdl/svrl"
XML_ID = "{http://www.w3.org/XML/1998/namespace}id"


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


def run_fixtures() -> int:
    schema = etree.parse(str(SCHEMA_PATH))
    rules = _rule_inventory(schema)
    manifest = json.loads((FIXTURE_DIR / "index.json").read_text(encoding="utf-8"))
    problems = _check_manifest(manifest, rules)
    for problem in problems:
        print(f"FEHLER manifest: {problem}", file=sys.stderr)

    validators = {phase: _validator(schema, phase) for phase in ("editing", "review")}
    rows = []
    failures = len(problems)
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
    print(f"\n{len(rules)} rules, {len(rows)} fixtures, {failures} problem(s)")
    return 1 if failures else 0


def run_list() -> int:
    schema = etree.parse(str(SCHEMA_PATH))
    rules = _rule_inventory(schema)
    manifest = json.loads((FIXTURE_DIR / "index.json").read_text(encoding="utf-8"))
    problems = _check_manifest(manifest, rules)
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
    for path in paths:
        if not path.is_file():
            print(f"FEHLER: input file {path} not found", file=sys.stderr)
            return 1
        doc = etree.parse(str(path), etree.XMLParser(huge_tree=True))
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
    args = parser.parse_args()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if args.list:
        return run_list()
    if args.data:
        return run_data(args.data, args.phase)
    return run_fixtures()


if __name__ == "__main__":
    sys.exit(main())
