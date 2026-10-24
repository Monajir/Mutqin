"""Compare labelled captures with Groq. Preview by default; --run uploads speech audio.

No expected verses are sent to Groq. Original captures and live servers are
never modified. Partial results are saved after each request; there are no
automatic retries that could duplicate charges.
"""
import argparse
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
import time

import httpx

from app.audio import decode_audio
from app.benchmark_capture import write_json
from app.scoring import RecognizedWord, aggregate_result, score_session
from app.vad import SileroSpeechDetector
from benchmark import captures

ROOT = Path(__file__).resolve().parent
MODEL = "whisper-large-v3"
ENDPOINT = "https://api.groq.com/openai/v1/audio/transcriptions"
CASES = ["F01", "F02", "F03", "F04", "F05", "F06", "Q01", "Q02", "S01", "V01", "V02"]


def read_key():
    key = os.environ.get("GROQ_API_KEY", "").strip()
    path = ROOT / ".env"
    if not key and path.exists():
        for line in path.read_text(encoding="utf-8-sig").splitlines():
            name, separator, value = line.strip().partition("=")
            if separator and name.strip() == "GROQ_API_KEY":
                key = value.strip().strip("\"'")
    if not key:
        raise SystemExit("GROQ_API_KEY is missing. Set it in the service .env; never put it in a command argument.")
    return key


def score(transcript, metadata):
    canonical = [(a["surahId"], a["ayahNumber"], a["words"]) for a in metadata["canonicalAyahs"]]
    result = aggregate_result(score_session(canonical, [RecognizedWord(w) for w in transcript.split()]))
    target = metadata["annotation"].get("target")
    target_status = None
    flags = []
    for ayah in result.ayahs:
        for word in ayah.words:
            if target and ayah.surah_id == target["surahId"] and ayah.ayah_number == target["ayahNumber"] and word.word_index == target["wordIndex"]:
                target_status = word.status.value
            if word.status.value != "correct":
                flags.append({"surahId": ayah.surah_id, "ayahNumber": ayah.ayah_number,
                              "wordIndex": word.word_index, "word": word.text, "status": word.status.value})
    return {"transcript": transcript, "matched": result.correct_word_count,
            "skipped": result.missed_word_count, "incorrect": result.incorrect_word_count,
            "flaggedWords": flags, "targetStatus": target_status,
            "transcriptWordCount": len(transcript.split())}


def transcribe(client, key, path):
    with path.open("rb") as audio:
        response = client.post(ENDPOINT, headers={"Authorization": "Bearer " + key},
            files={"file": ("recitation.m4a", audio, "audio/mp4")},
            data={"model": MODEL, "language": "ar", "temperature": "0", "response_format": "json"})
    if response.status_code != 200:
        # Do not print server bodies, request headers, or exceptions with secrets.
        return {"httpStatus": response.status_code}
    body = response.json()
    if not isinstance(body, dict) or not isinstance(body.get("text"), str):
        return {"httpStatus": 200, "error": "missing_transcript"}
    return {"httpStatus": 200, "text": body["text"]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run", action="store_true", help="Upload VAD-accepted recordings to Groq")
    parser.add_argument("--cases", nargs="+", choices=CASES, default=CASES)
    args = parser.parse_args()
    key = read_key() if args.run else None
    rows = [(p, m) for p, m in captures(ROOT / "data/benchmarks")
            if m.get("annotation", {}) and m["annotation"]["caseId"] in args.cases]
    if not rows:
        parser.error("No matching labelled captures")
    detector = SileroSpeechDetector()
    report = {"createdAt": datetime.now(timezone.utc).isoformat(), "model": MODEL,
        "mode": "groq_evaluation" if args.run else "preview_no_upload",
        "method": "Local VAD; full original M4A; Arabic; temperature 0; no verse prompt. Current scorer applied to both transcripts. Historical local inference and new API request timings are not directly comparable.",
        "limitations": "User-reported labels, not independent audio annotation. Reference matches are not WER or pronunciation accuracy. Insertions are not separately penalized: review raw transcripts for repetition and deliberate errors.",
        "vad": detector.metadata, "results": []}
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    output = ROOT / "data" / f"groq-evaluation-{stamp}.json"
    hashes = {}
    uploads = 0
    failed = False
    with httpx.Client(timeout=120, follow_redirects=False) as client:
        for meta_path, metadata in rows:
            audio_path = Path(str(meta_path)[:-5])
            baseline_path = meta_path.parent / (metadata["captureId"] + ".result.json")
            for p in (meta_path, audio_path, baseline_path):
                hashes[p] = hashlib.sha256(p.read_bytes()).hexdigest()
            baseline = json.loads(baseline_path.read_text())
            audio = decode_audio(str(audio_path))
            accepted = detector.has_speech(audio)
            row = {"captureId": metadata["captureId"], "caseId": metadata["annotation"]["caseId"],
                   "annotation": metadata["annotation"], "durationSeconds": round(len(audio)/16000, 3),
                   "vadAccepted": accepted, "baselineStatus": baseline["status"],
                   "local": score(baseline["transcript"], metadata) if baseline.get("transcript") else None,
                   "historicalLocalInferenceSeconds": baseline.get("inferenceSeconds")}
            if not accepted:
                row["groq"] = {"status": "not_sent_no_speech"}
            elif not args.run:
                row["groq"] = {"status": "would_upload"}
            else:
                started = time.perf_counter()
                try:
                    response = transcribe(client, key, audio_path)
                    uploads += 1
                    if "text" not in response:
                        row["groq"] = {"status": "failed", **response}
                        failed = True
                    else:
                        row["groq"] = {"status": "completed", "requestSeconds": round(time.perf_counter()-started, 3),
                                       **score(response["text"], metadata)}
                except (httpx.HTTPError, ValueError):
                    row["groq"] = {"status": "failed", "error": "request_or_response_failure"}
                    failed = True
            report["results"].append(row)
            write_json(output, report)
            print(json.dumps({"caseId": row["caseId"], "durationSeconds": row["durationSeconds"],
                "status": row["groq"]["status"],
                "localFlags": len(row["local"]["flaggedWords"]) if row["local"] else None,
                "groqFlags": len(row["groq"]["flaggedWords"]) if "flaggedWords" in row["groq"] else None,
                "targetStatus": row["groq"].get("targetStatus")}), flush=True)
            if failed:
                break
    report["sourceHashes"] = {p.name: h for p, h in hashes.items()}
    report["sourceFilesUnchanged"] = all(hashlib.sha256(p.read_bytes()).hexdigest() == h for p, h in hashes.items())
    report["completed"] = not failed and len(report["results"]) == len(rows)
    report["uploadResponsesReceived"] = uploads
    write_json(output, report)
    print(f"Report: {output}", flush=True)
    if failed:
        raise SystemExit("Evaluation stopped; inspect the saved status. No automatic retry was made.")


if __name__ == "__main__":
    main()
