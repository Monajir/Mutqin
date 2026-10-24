"""Inspect and label local captures. Never sends audio to an external provider."""

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from app.benchmark_capture import write_json

ROOT = Path(__file__).resolve().parent


def load_cases():
    return {case["id"]: case for case in json.loads((ROOT / "benchmark-cases.json").read_text())}


def captures(directory):
    rows = []
    for path in sorted(directory.glob("rec-*.*.json")):
        if path.name.endswith(".result.json"):
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        if "captureId" in data:
            rows.append((path, data))
    return rows


def summarize(path, metadata):
    capture_id = metadata["captureId"]
    result_path = path.parent / (capture_id + ".result.json")
    report = json.loads(result_path.read_text(encoding="utf-8")) if result_path.exists() else {}
    annotation = metadata.get("annotation") or {}
    result = report.get("response", {}).get("result", {})
    flags = [
        {**ayah["ayah"], **word}
        for ayah in result.get("ayahs", []) for word in ayah["words"]
        if word["status"] != "correct"
    ]
    target = annotation.get("target")
    target_status = None
    if target:
        target_status = next((
            word["status"]
            for ayah in result.get("ayahs", [])
            if ayah["ayah"] == {"surahId": target["surahId"], "ayahNumber": target["ayahNumber"]}
            for word in ayah["words"] if word["wordIndex"] == target["wordIndex"]
        ), None)
    return {
        "captureId": capture_id,
        "caseId": annotation.get("caseId"),
        "labelSource": annotation.get("source"),
        "notes": annotation.get("notes"),
        "recordingEnvironment": annotation.get("recordingEnvironment"),
        "status": report.get("status", "missing_report"),
        "rejectionReason": report.get("reason"),
        "expectedAyahs": metadata["expectedAyahs"],
        "modelVersion": metadata["modelVersion"],
        "inferenceSeconds": report.get("inferenceSeconds"),
        "transcript": report.get("transcript"),
        "matched": result.get("correctWordCount"),
        "notDetected": result.get("missedWordCount"),
        "possibleMismatches": result.get("incorrectWordCount"),
        "flaggedWords": flags,
        "targetStatus": target_status,
        # Labels describe the user's report, not independently annotated truth.
        "flagsOnUserReportedCorrect": len(flags) if annotation.get("kind") == "correct" and report.get("status") == "completed" else None,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", type=Path, default=ROOT / "data/benchmarks")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("cases")
    commands.add_parser("list")
    report = commands.add_parser("report")
    report.add_argument("--output", type=Path)
    label = commands.add_parser("label")
    label.add_argument("capture_id", help="Full recording ID from list; latest is deliberately not accepted")
    label.add_argument("case_id", choices=list(load_cases()))
    label.add_argument("--notes", default="")
    args = parser.parse_args()
    cases = load_cases()

    if args.command == "cases":
        for case in cases.values():
            print(f"{case['id']} | {case['surahId']}:{case['startAyah']}-{case['endAyah']} | {case['instruction']}")
        return
    rows = captures(args.directory)
    if args.command == "label":
        matches = [(p, m) for p, m in rows if m["captureId"] == args.capture_id]
        if len(matches) != 1:
            parser.error("Recording ID not found. Run list and copy its full ID.")
        path, metadata = matches[0]
        if metadata.get("annotation"):
            parser.error("Recording is already labelled; existing annotations are preserved.")
        case = cases[args.case_id]
        expected = [{"surahId": case["surahId"], "ayahNumber": n} for n in range(case["startAyah"], case["endAyah"] + 1)]
        if metadata["expectedAyahs"] != expected:
            parser.error("Selected passage does not match this test case; do not label this recording as that case.")
        metadata["annotation"] = {
            "caseId": case["id"], "kind": case["kind"], "target": case.get("target"),
            "source": "user_reported_not_independently_verified",
            "labelledAt": datetime.now(timezone.utc).isoformat(), "notes": args.notes,
        }
        write_json(path, metadata)
        print(f"Labelled {args.capture_id} as {args.case_id}")
        return
    summaries = [summarize(p, m) for p, m in rows]
    if args.command == "report":
        output = {
            "note": "Reference-word flags and user-reported labels; not WER, pronunciation accuracy, or general model accuracy. Extra transcript words are not separately penalized by the app scorer. Inference time includes decoding; it excludes upload and network time. Unlabelled captures are not assumed correct.",
            "recordings": summaries,
        }
        if args.output:
            write_json(args.output, output)
            print(f"Report saved to {args.output}")
        else:
            print(json.dumps(output, ensure_ascii=False, indent=2))
        return
    if not summaries:
        print("No benchmark captures yet.")
    for row in summaries:
        refs = row["expectedAyahs"]
        passage = f"{refs[0]['surahId']}:{refs[0]['ayahNumber']}-{refs[-1]['ayahNumber']}"
        print(f"{row['captureId']} | {row['caseId'] or 'UNLABELLED'} | {passage} | {row['status']} | {len(row['flaggedWords'])} flagged")


if __name__ == "__main__":
    main()
