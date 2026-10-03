"""Compare Groq transcription with preserved local benchmark transcripts.

Uploads the four Furqan benchmark recordings to Groq. No expected verse text
is sent. Reads GROQ_API_KEY from the environment or the adjacent ignored .env.
Reports use the current production scorer for both providers. Local timings
are historical GPU inference timings, not end-to-end API timings.
"""
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx

from app.arabic_normalize import arabic_words_match
from app.quran_repository import QuranRepository
from app.schemas import AyahReferenceDto
from app.scoring import RecognizedWord, aggregate_result, score_session

ROOT = Path(__file__).resolve().parent
NAMES = [
    "furqan-61-63-correct-own-voice",
    "furqan-61-63-correct-own-voice-02",
    "furqan-61-63-qari-01",
    "furqan-61-63-deliberate-skip-01",
]


def read_key():
    key = os.environ.get("GROQ_API_KEY", "").strip()
    if not key and (ROOT / ".env").exists():
        candidates = []
        for line in (ROOT / ".env").read_text(encoding="utf-8-sig").splitlines():
            name, separator, value = line.strip().partition("=")
            if separator and name.strip() == "GROQ_API_KEY":
                key = value.strip().strip("\"'")
            elif separator and value.strip().strip("\"'").startswith("gsk_"):
                candidates.append(value.strip().strip("\"'"))
        if not key and len(candidates) == 1:
            print("Using the single Groq-format key stored under an alternate variable name.")
            key = candidates[0]
    if not key:
        raise SystemExit("GROQ_API_KEY is missing; configure it in the service .env.")
    return key


def score(transcript, canonical):
    result = aggregate_result(score_session(
        canonical, [RecognizedWord(text=w) for w in transcript.split()]
    ))
    review = [
        {"ayah": a.ayah_number, "index": w.word_index,
         "word": w.text, "status": w.status.value}
        for a in result.ayahs for w in a.words if w.status.value != "correct"
    ]
    target = [w.status.value for a in result.ayahs if a.ayah_number == 63
              for w in a.words if arabic_words_match(w.text, "وإذا")]
    return {"matched": result.correct_word_count,
            "missed": result.missed_word_count,
            "incorrect": result.incorrect_word_count,
            "review": review, "wa_idha_status": target}


def main():
    key = read_key()
    baseline = json.loads((ROOT / "data/benchmark-comparison.json").read_text(encoding="utf-8"))
    repository = QuranRepository(str(ROOT.parent / "assets/db/quran-content.db"))
    report = {"created_utc": datetime.now(timezone.utc).isoformat(),
              "model": "whisper-large-v3", "local_model": baseline["model"],
              "local_source": "Historical longer-context-arabic transcripts; rescored with current scorer",
              "method": "Full original audio; language=ar; temperature=0; no verse prompt",
              "results": []}
    output = ROOT / "data" / ("groq-benchmark-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ") + ".json")
    with httpx.Client(timeout=180) as client:
        for name in NAMES:
            path = ROOT / "data/benchmarks" / (name + ".m4a")
            metadata = json.loads(Path(str(path) + ".json").read_text(encoding="utf-8"))
            canonical = repository.fetch_canonical_ayahs([AyahReferenceDto(**r) for r in metadata["expectedAyahs"]])
            local = next(r for r in baseline["results"] if r["recording"] == name and r["variant"] == "longer-context-arabic")
            print("Transcribing " + name, flush=True)
            started = time.perf_counter()
            with path.open("rb") as recording:
                response = client.post(
                    "https://api.groq.com/openai/v1/audio/transcriptions",
                    headers={"Authorization": "Bearer " + key},
                    files={"file": (path.name, recording, "audio/mp4")},
                    data={"model": "whisper-large-v3", "language": "ar",
                          "temperature": "0", "response_format": "json"},
                )
            if response.status_code != 200:
                raise SystemExit(f"Groq returned HTTP {response.status_code}; no credentials logged. Partial report: {output}")
            elapsed = round(time.perf_counter() - started, 2)
            transcript = response.json()["text"]
            row = {"recording": name,
                   "local": {"transcript": local["transcript"], "historical_inference_seconds": local["seconds"], **score(local["transcript"], canonical)},
                   "groq": {"transcript": transcript, "request_seconds": elapsed, **score(transcript, canonical)}}
            report["results"].append(row)
            output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
            print(json.dumps(row, ensure_ascii=False), flush=True)
    print("REPORT: " + str(output), flush=True)


if __name__ == "__main__":
    main()
