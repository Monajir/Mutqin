"""Replay a preserved recording against the running backend, without rerecording."""
import argparse
import json
import time
from pathlib import Path

import httpx

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("name", help="Benchmark name used with save-benchmark.ps1")
args = parser.parse_args()
if not args.name or any(c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-" for c in args.name):
    parser.error("Use only letters, numbers, underscores and hyphens in the benchmark name.")
audio = Path(__file__).parent / "data" / "benchmarks" / f"{args.name}.m4a"
metadata = json.loads(Path(str(audio) + ".json").read_text(encoding="utf-8"))
started = time.perf_counter()
with audio.open("rb") as recording:
    response = httpx.post(
        "http://127.0.0.1:8000/v1/hifz/evaluate",
        files={"audio": (audio.name, recording, "audio/m4a")},
        data={"expectedAyahs": json.dumps(metadata["expectedAyahs"])},
        timeout=90,
    )
response.raise_for_status()
print(json.dumps(response.json(), ensure_ascii=False, indent=2))
print(f"Elapsed: {time.perf_counter() - started:.2f} seconds")
