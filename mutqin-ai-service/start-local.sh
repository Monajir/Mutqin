#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
if [[ ! -x .venv/bin/python ]]; then
  echo "Create the backend environment first: uv venv --python 3.11 .venv" >&2
  echo "Then install the pinned requirements as described in LOCAL_DEVELOPMENT.md." >&2
  exit 1
fi

export QURAN_DB_PATH="${QURAN_DB_PATH:-$(pwd)/../assets/db/quran-content.db}"
if [[ ! -f "$QURAN_DB_PATH" ]]; then
  echo "Quran database not found: $QURAN_DB_PATH" >&2
  exit 1
fi
export ASR_PROVIDER="${ASR_PROVIDER:-groq}"
if [[ "$ASR_PROVIDER" == "local" && -z "${ASR_DEVICE:-}" ]]; then
  ASR_DEVICE="$(.venv/bin/python -c 'import torch; print("cuda" if torch.cuda.is_available() else "cpu")')"
fi
export ASR_DEVICE
# Cache the model once before starting. Normal sessions need no model download.
export HF_HUB_OFFLINE="${HF_HUB_OFFLINE:-1}"
export TRANSFORMERS_OFFLINE="${TRANSFORMERS_OFFLINE:-1}"
echo "Starting Hifz backend with $ASR_PROVIDER at http://127.0.0.1:8000"
exec .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 "$@"
