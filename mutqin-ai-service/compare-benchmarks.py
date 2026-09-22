"""Compare decoding/segmentation on saved audio without changing production ASR."""
import copy
import json
import time
from pathlib import Path

import numpy as np
import torch
from transformers import WhisperForConditionalGeneration, WhisperProcessor

from app.asr import SAMPLE_RATE, split_audio_at_quiet_points
from app.audio import decode_audio
from app.quran_repository import QuranRepository
from app.schemas import AyahReferenceDto
from app.scoring import RecognizedWord, aggregate_result, score_session


def legacy_chunks(audio):
    """Frozen pre-benchmark splitter, retained only for regression comparison."""
    chunks = []
    start = 0
    window = int(0.25 * SAMPLE_RATE)
    while start < len(audio):
        search_end = min(start + 10 * SAMPLE_RATE, len(audio) - int(1.5 * SAMPLE_RATE))
        reference = float(np.median(np.abs(audio[start:min(start + 10 * SAMPLE_RATE, len(audio))])))
        split = None
        if reference > 0:
            for offset in range(start + 2 * SAMPLE_RATE, search_end - window + 1, int(0.05 * SAMPLE_RATE)):
                if float(np.mean(np.abs(audio[offset:offset + window]))) <= reference * 0.7:
                    split = offset + window // 2
                    break
        if split is None and len(audio) - start <= 25 * SAMPLE_RATE:
            chunks.append(audio[start:])
            break
        if split is None:
            candidates = range(start + 15 * SAMPLE_RATE, min(start + 25 * SAMPLE_RATE, len(audio)) - window + 1, window)
            split = min(candidates, key=lambda i: float(np.mean(np.abs(audio[i:i + window])))) + window // 2
        chunks.append(audio[start:split])
        start = split
    return chunks


def main():
    root = Path(__file__).resolve().parent
    model_id = "basharalrfooh/whisper-small-quran"
    device = "cuda" if torch.cuda.is_available() else "cpu"
    processor = WhisperProcessor.from_pretrained(model_id, local_files_only=True, clean_up_tokenization_spaces=False)
    model = WhisperForConditionalGeneration.from_pretrained(model_id, local_files_only=True).to(device).eval()
    repository = QuranRepository(str(root.parent / "assets/db/quran-content.db"))
    variants = [("baseline", False, 3, False), ("arabic", True, 3, False), ("arabic-beam5", True, 5, False), ("longer-context-arabic", True, 3, True)]
    results = []
    for path in sorted((root / "data/benchmarks").glob("*.m4a")):
        metadata = json.loads(Path(str(path) + ".json").read_text(encoding="utf-8"))
        canonical = repository.fetch_canonical_ayahs([AyahReferenceDto(**ref) for ref in metadata["expectedAyahs"]])
        audio = decode_audio(str(path))
        for name, arabic, beams, longer in variants:
            chunks = split_audio_at_quiet_points(audio) if longer else legacy_chunks(audio)
            config = copy.deepcopy(model.generation_config)
            if arabic:
                config.language = None
                config.task = None
                config.forced_decoder_ids = processor.get_decoder_prompt_ids(language="ar", task="transcribe")
            started = time.perf_counter()
            transcripts = []
            for chunk in chunks:
                inputs = processor(chunk, sampling_rate=SAMPLE_RATE, return_tensors="pt", return_attention_mask=True)
                with torch.inference_mode():
                    ids = model.generate(inputs.input_features.to(device), attention_mask=inputs.attention_mask.to(device), generation_config=config, num_beams=beams)
                transcripts.append(processor.batch_decode(ids, skip_special_tokens=True, clean_up_tokenization_spaces=False)[0].strip())
            recognized = [RecognizedWord(text=w) for t in transcripts for w in t.split()]
            score = aggregate_result(score_session(canonical, recognized))
            row = {"recording": path.stem, "variant": name, "seconds": round(time.perf_counter() - started, 2), "chunks": [round(len(c) / SAMPLE_RATE, 2) for c in chunks], "transcript": " ".join(transcripts), "matched": score.correct_word_count, "missed": score.missed_word_count, "incorrect": score.incorrect_word_count, "review": [{"ayah": a.ayah_number, "word": w.text, "status": w.status.value} for a in score.ayahs for w in a.words if w.status.value != "correct"]}
            results.append(row)
            print(json.dumps(row, ensure_ascii=False), flush=True)
    report_path = root / "data/benchmark-comparison.json"
    report_path.write_text(json.dumps({"model": model_id, "device": device, "results": results}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"COMPARISON_COMPLETE: {report_path}", flush=True)


if __name__ == "__main__":
    main()
