"""Validate the speech gate locally without changing captures or live servers."""
import argparse
from dataclasses import replace
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import time

os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

import numpy as np

from app.audio import decode_audio
from app.benchmark_capture import write_json
from app.vad import SileroSpeechDetector, NoSpeechDetected
from benchmark import captures


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--with-asr", action="store_true", help="Also replay production ASR on CUDA and check the API")
    args = parser.parse_args()
    root = Path(__file__).parent
    directory = root / "data/benchmarks"
    rows = [(p, m) for p, m in captures(directory) if m.get("annotation")]
    if not rows:
        parser.error("No labelled benchmark captures found")
    output = directory / "vad-validation" / datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    output.mkdir(parents=True, exist_ok=False)
    detector = SileroSpeechDetector()
    report = {"vad": detector.metadata, "note": "User-reported labels; attenuated audio and synthetic noise are stress checks, not independent real-world validation.",
              "checks": [], "asrReplays": [], "apiChecks": []}
    hashes = {}
    decoded = []

    def check(name, audio, expected):
        original = audio.copy()
        started = time.perf_counter()
        actual = detector.has_speech(audio)
        record = {"name": name, "expectedSpeech": expected, "detectedSpeech": actual,
                  "seconds": round(time.perf_counter() - started, 4),
                  "inputUnchanged": bool(np.array_equal(original, audio))}
        record["passed"] = actual == expected and record["inputUnchanged"]
        report["checks"].append(record)
        print(json.dumps(record), flush=True)

    for path, metadata in rows:
        audio_path = Path(str(path)[:-5])
        baseline_path = directory / (metadata["captureId"] + ".result.json")
        for p in (path, audio_path, baseline_path):
            hashes[p] = hashlib.sha256(p.read_bytes()).hexdigest()
        case = metadata["annotation"]["caseId"]
        audio = decode_audio(str(audio_path))
        expected = metadata["annotation"]["kind"] not in ("silence", "background_noise")
        check(case, audio, expected)
        if expected:
            for gain in (.1, .01):
                check(f"{case}:gain={gain}", audio * gain, True)
        decoded.append((audio_path, metadata, baseline_path))

    rng = np.random.default_rng(20261023)
    length = 5 * 16000
    noise = rng.normal(0, .025, length).astype(np.float32)
    hum = (.03 * np.sin(2 * np.pi * 50 * np.arange(length) / 16000)).astype(np.float32)
    click = np.zeros(length, dtype=np.float32)
    click[length // 2:length // 2 + 160] = .5
    for name, audio in [("digital_silence", np.zeros(length, dtype=np.float32)),
                        ("seeded_white_noise", noise), ("50hz_hum", hum), ("brief_click", click)]:
        check(name, audio, False)

    if args.with_asr:
        import torch
        from app.asr import WhisperRecitationTranscriber
        if not torch.cuda.is_available():
            parser.error("CUDA unavailable for --with-asr")
        transcriber = WhisperRecitationTranscriber(rows[0][1]["modelVersion"], "cuda")
        for audio_path, metadata, baseline_path in decoded:
            case = metadata["annotation"]["caseId"]
            baseline = json.loads(baseline_path.read_text())
            try:
                words = transcriber.transcribe(str(audio_path))
                same = " ".join(w.text for w in words) == baseline.get("transcript")
                row = {"caseId": case, "status": "accepted", "sameTranscript": same,
                       "passed": same and metadata["annotation"]["kind"] not in ("silence", "background_noise")}
            except NoSpeechDetected:
                row = {"caseId": case, "status": "no_speech",
                       "passed": metadata["annotation"]["kind"] in ("silence", "background_noise")}
            report["asrReplays"].append(row)
            print(json.dumps(row), flush=True)

        # Exercise the actual HTTP handler in-process, without touching port
        # 8000 or creating duplicate benchmark captures.
        from fastapi.testclient import TestClient
        from app import main as main_module
        main_module.settings = replace(main_module.settings,
            quran_db_path=str(root.parent / "assets/db/quran-content.db"),
            asr_benchmark_dir=None, asr_debug_audio_path=None)
        main_module.app.state.transcriber = transcriber
        with TestClient(main_module.app) as client:
            for audio_path, metadata, baseline_path in decoded:
                case = metadata["annotation"]["caseId"]
                if case not in ("F01", "S01"):
                    continue
                with audio_path.open("rb") as audio_file:
                    response = client.post("/v1/hifz/evaluate",
                        files={"audio": (audio_path.name, audio_file, "audio/m4a")},
                        data={"expectedAyahs": json.dumps(metadata["expectedAyahs"])})
                body = response.json()
                if case == "S01":
                    passed = response.status_code == 422 and body == {
                        "code": "no_speech", "detail": "No speech detected. Please record again."}
                else:
                    baseline = json.loads(baseline_path.read_text())
                    passed = response.status_code == 200 and body.get("result") == baseline["response"]["result"]
                report["apiChecks"].append({"caseId": case, "httpStatus": response.status_code, "passed": passed})
    report["sourceFilesUnchanged"] = all(hashlib.sha256(p.read_bytes()).hexdigest() == h for p, h in hashes.items())
    report["sourceHashes"] = {p.name: h for p, h in hashes.items()}
    report["passed"] = report["sourceFilesUnchanged"] and all(
        r["passed"] for key in ("checks", "asrReplays", "apiChecks") for r in report[key])
    write_json(output / "report.json", report)
    print(f"Report: {output / 'report.json'}", flush=True)
    if not report["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
