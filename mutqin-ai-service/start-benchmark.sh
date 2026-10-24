#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
export ASR_BENCHMARK_DIR="${ASR_BENCHMARK_DIR:-$(pwd)/data/benchmarks}"
echo "BENCHMARK MODE: every submitted recording and its result will be retained locally."
echo "Capture directory: $ASR_BENCHMARK_DIR"
echo "Stop this server and use dev:backend to return to normal mode."
exec bash ./start-local.sh "$@"
