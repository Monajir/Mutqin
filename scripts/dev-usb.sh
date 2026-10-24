#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
if ! command -v adb >/dev/null; then
  echo "ADB is missing. Install Ubuntu's adb package first." >&2
  exit 1
fi
if [[ ! -d node_modules ]]; then
  echo "Run npm ci from the project root first." >&2
  exit 1
fi

# Reuse the installed development client; never uninstall or replace it.
device=(-d)
if [[ -n "${ANDROID_SERIAL:-}" ]]; then
  device=(-s "$ANDROID_SERIAL")
fi
if ! adb "${device[@]}" get-state; then
  echo "Connect and unlock your phone, enable USB debugging, and accept its authorization prompt." >&2
  echo "For multiple phones, set ANDROID_SERIAL to the intended device." >&2
  exit 1
fi
adb "${device[@]}" reverse tcp:8081 tcp:8081
adb "${device[@]}" reverse tcp:8000 tcp:8000
export EXPO_PUBLIC_API_BASE_URL="${EXPO_PUBLIC_API_BASE_URL:-http://127.0.0.1:8000/v1}"
exec npx --no-install expo start --dev-client --localhost "$@"
