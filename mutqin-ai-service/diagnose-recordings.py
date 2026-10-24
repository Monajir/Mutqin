"""Offline, read-only replay of captured audio, with per-chunk ASR evidence.

Writes a separate diagnostic directory; never calls the running API or changes
captures. Prefix probes are context experiments, not replacement transcripts.
This raw chunk diagnostic bypasses VAD; use validate-vad.py for the speech gate.
"""
import argparse
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path

os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

import numpy as np
import torch

from app.asr import SAMPLE_RATE, WhisperRecitationTranscriber, split_audio_at_quiet_points
from app import asr as asr_module
from app.audio import decode_audio
from app.benchmark_capture import write_json
from app.scoring import _levenshtein_alignment
from benchmark import captures


def dbfs(value):
    return round(float(20 * np.log10(max(float(value), 1e-12))), 2)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", type=Path, default=Path(__file__).parent / "data/benchmarks")
    parser.add_argument("--cases", nargs="*")
    parser.add_argument("--prefix-seconds", nargs="*", type=float, default=[8, 12])
    parser.add_argument("--min-chunk-seconds", type=int, default=15)
    parser.add_argument("--max-chunk-seconds", type=int, default=25)
    args = parser.parse_args()
    if not 1 <= args.min_chunk_seconds < args.max_chunk_seconds <= 25:
        parser.error("Chunk bounds must satisfy 1 <= min < max <= 25")
    if any(not 0 < seconds <= 25 for seconds in args.prefix_seconds):
        parser.error("Prefix probes must be between 0 and 25 seconds")
    # Only this standalone process is affected; application source and the
    # user's running backend keep their original chunking settings.
    asr_module.MIN_CHUNK_SECONDS = args.min_chunk_seconds
    asr_module.MAX_CHUNK_SECONDS = args.max_chunk_seconds
    rows = [(p, m) for p, m in captures(args.directory)
            if m.get("annotation") and (not args.cases or m["annotation"]["caseId"] in args.cases)]
    if not rows:
        parser.error("No labelled recordings selected")
    if not torch.cuda.is_available():
        parser.error("CUDA unavailable; run with host GPU access")
    output = args.directory / "diagnostics" / datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    output.mkdir(parents=True, exist_ok=False)
    print(f"Output: {output}", flush=True)
    transcriber = WhisperRecitationTranscriber(rows[0][1]["modelVersion"], "cuda")
    digest = hashlib.sha256()
    for name in ("asr.py", "audio.py", "arabic_normalize.py", "scoring.py", "vad.py"):
        digest.update(name.encode())
        digest.update((Path(__file__).parent / "app" / name).read_bytes())

    def recognize(samples):
        inputs = transcriber.processor(samples, sampling_rate=SAMPLE_RATE,
                                       return_tensors="pt", return_attention_mask=True)
        with torch.inference_mode():
            tokens = transcriber.model.generate(
                inputs.input_features.to("cuda"),
                attention_mask=inputs.attention_mask.to("cuda"), num_beams=3)
        return {"transcript": transcriber.processor.batch_decode(
            tokens, skip_special_tokens=True, clean_up_tokenization_spaces=False)[0].strip(),
            "tokenCount": tokens.shape[-1]}

    index = []
    for path, metadata in rows:
        case = metadata["annotation"]["caseId"]
        audio_path = Path(str(path)[:-5])
        baseline_path = path.parent / (metadata["captureId"] + ".result.json")
        before = {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                  for p in (path, audio_path, baseline_path)}
        baseline = json.loads(baseline_path.read_text())
        audio = decode_audio(str(audio_path))
        frames = [audio[i:i+320] for i in range(0, len(audio), 320)]
        rms = np.array([np.sqrt(np.mean(f ** 2)) for f in frames])
        record = {"caseId": case, "captureId": metadata["captureId"],
                  "sourceHashes": before, "pipelineSha256": digest.hexdigest(),
                  "samePipeline": digest.hexdigest() == metadata["pipelineSha256"],
                  "modelRevision": transcriber.model.config._commit_hash,
                  "sameModelRevision": transcriber.model.config._commit_hash == metadata["modelRevision"],
                  "chunkBoundsSeconds": [args.min_chunk_seconds, args.max_chunk_seconds],
                  "sameChunkingSettings": (args.min_chunk_seconds, args.max_chunk_seconds) == (15, 25),
                  "durationSeconds": round(len(audio) / SAMPLE_RATE, 3),
                  "rmsDbfs": dbfs(np.sqrt(np.mean(audio ** 2))),
                  "peakDbfs": dbfs(np.max(np.abs(audio))),
                  "frameRmsDbfsPercentiles": {str(p): dbfs(np.percentile(rms, p)) for p in (10, 50, 90, 99)},
                  "fractionNearClipping": float(np.mean(np.abs(audio) >= .99)),
                  "firstSecondRmsDbfs": dbfs(np.sqrt(np.mean(audio[:SAMPLE_RATE] ** 2))),
                  "chunks": [], "prefixProbes": []}
        start = 0
        for chunk in split_audio_at_quiet_points(audio):
            part = {"startSeconds": round(start / SAMPLE_RATE, 3),
                    "endSeconds": round((start + len(chunk)) / SAMPLE_RATE, 3), **recognize(chunk)}
            record["chunks"].append(part)
            start += len(chunk)
        transcript = " ".join(c["transcript"] for c in record["chunks"] if c["transcript"])
        record["sameBaselineTranscript"] = transcript == baseline["transcript"]
        canonical = [w for a in metadata["canonicalAyahs"] for w in a["words"]]
        words = transcript.split()
        record["alignment"] = [{"canonical": canonical[c], "recognized": words[r] if r is not None else None}
                               for c, r in _levenshtein_alignment(canonical, words)]
        if case in ("F01", "F02", "F05", "F06"):
            for seconds in args.prefix_seconds:
                record["prefixProbes"].append({"seconds": seconds, **recognize(audio[:int(seconds*SAMPLE_RATE)])})
        if case == "S01":
            record["digitalZeroProbe"] = recognize(np.zeros_like(audio))
        record["sourceFilesUnchanged"] = all(hashlib.sha256(p.read_bytes()).hexdigest() == before[p.name]
                                             for p in (path, audio_path, baseline_path))
        write_json(output / f"{case}.json", record)
        index.append({k: record[k] for k in ("caseId", "durationSeconds", "rmsDbfs", "sameBaselineTranscript",
                                           "samePipeline", "sameModelRevision", "sourceFilesUnchanged")})
        print(json.dumps({**index[-1], "chunks": record["chunks"], "prefixProbes": record["prefixProbes"]},
                         ensure_ascii=False), flush=True)
    write_json(output / "index.json", {"recordings": index})


if __name__ == "__main__":
    main()
