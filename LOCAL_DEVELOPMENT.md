# Local development on Ubuntu

Run commands from the repository root unless stated otherwise. The normal USB
workflow reuses the Mutqin development client already installed on the phone.
It does not require Android Studio, a native rebuild, or an app uninstall.

## Verified restoration: 22 October 2026

- Node 22.22.1, npm 9.2.0, and ADB 34.0.5 installed.
- Python 3.11.17 environment with PyTorch 2.4.1+cu121 and Transformers 4.44.2.
- NVIDIA RTX 4050 Laptop GPU available with driver 595.99.02.
- Existing `com.mutqin.app` development client reused without reinstalling.
- Metro served the Android bundle and the app opened successfully on the phone.
- Backend readiness returned both database and model ready.
- A new 11.5-second phone recording returned HTTP 200 and visible word-level
  feedback. This verifies connectivity and inference, not general ASR accuracy.
- TypeScript passed; all 12 frontend regression tests and 19 backend tests passed.
- Backend dependency consistency check passed for all 62 installed packages.
- ESLint configuration and resolver dependencies were restored. Lint now runs
  but reports 9 existing code errors and 1 warning (unused imports, dynamic
  require/namespace rules, feature boundaries, and a hook dependency warning).

The private benchmark set and historical JSON reports have not been restored.
Java 17 is installed, but `java` still defaults to Java 25. Before a future
native build, select Java 17 in that terminal:

```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH="$JAVA_HOME/bin:$PATH"
```

Android SDK platforms, build tools, and NDK for native builds were not installed
as part of this Metro/USB restoration.

## Daily session

Connect and unlock the phone, enable USB debugging, and accept the computer's
authorization prompt. Check `adb devices -l`: the status must be `device`.

Terminal 1, Hifz backend:

```bash
npm run dev:backend
```

Terminal 2, Metro and USB forwarding:

```bash
npm run dev:usb
```

The backend now defaults to **Groq Whisper Large V3**. Keep `GROQ_API_KEY`
in `mutqin-ai-service/.env` (already configured on this computer) or the
backend environment. Only the key is read from that file; provider overrides
are shell environment variables. The key never belongs in Expo configuration.
Speech goes through local Silero VAD before upload to Groq, followed by our
existing word comparison. Internet access is required on the backend computer.
`/health/ready` identifies `asrProvider: groq` and
`modelVersion: groq/whisper-large-v3`; readiness does not probe Groq's network
or account quota. API failures return an error without an evaluation score.

To resume local Whisper work, stop the backend with Ctrl+C and run:

```bash
ASR_PROVIDER=local npm run dev:backend
# Or retain new local-model test recordings:
ASR_PROVIDER=local npm run dev:benchmark
```

Restart with plain `npm run dev:backend` to use Groq again. There is no automatic
provider fallback. No app rebuild is required when changing backend providers.

Open the installed Mutqin development app and select the local development
server. The USB launcher forwards ports 8081 and 8000 and sets
`EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/v1`. If several phones are
connected, run `ANDROID_SERIAL=PHONE_SERIAL npm run dev:usb`.

Optional phone mirroring in another terminal:

```bash
scrcpy -d --stay-awake
```

Stop each server with Ctrl+C. After reconnecting USB, restart `dev:usb` to
restore forwarding. For stale Metro modules/assets, use `npm run dev:usb -- --clear`.

To collect new ASR test recordings, use `npm run dev:benchmark` instead of
`dev:backend`. This explicitly retains every recording, its raw transcript, and
the response locally. Follow the one-case-at-a-time plan in
[`BENCHMARK_RECORDING_GUIDE.md`](mutqin-ai-service/BENCHMARK_RECORDING_GUIDE.md).

## Restore dependencies

Use Node 22 for the app and its existing regression tests (which use
`node:sqlite`), and Python 3.11 for the pinned backend dependencies. Java 17 is
needed when making a new native Android build, not for serving Metro to an
existing client.

```bash
sudo apt update
sudo apt install -y nodejs npm adb android-sdk-platform-tools-common openjdk-17-jdk curl scrcpy libsndfile1
node --version
npm ci
```

On distributions whose Node package is not version 22, install Node 22 using a
version manager instead. Do not copy Windows `node_modules` or `.venv` folders.

Install uv using its [official instructions](https://docs.astral.sh/uv/getting-started/installation/),
then create the backend environment:

```bash
cd mutqin-ai-service
uv venv --python 3.11 .venv
uv pip install --python .venv/bin/python torch==2.4.1 --index-url https://download.pytorch.org/whl/cu121
uv pip install --python .venv/bin/python -r requirements.txt
```

The CUDA packages require a multi-gigabyte download. Verify GPU access with
`nvidia-smi` and:

```bash
.venv/bin/python -c "import torch; print(torch.__version__); print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU')"
```

Download the existing Quran ASR model once while online:

```bash
.venv/bin/python -c "from transformers import WhisperProcessor, WhisperForConditionalGeneration; m='basharalrfooh/whisper-small-quran'; WhisperProcessor.from_pretrained(m); WhisperForConditionalGeneration.from_pretrained(m); print('Model cached')"
```

The Linux backend launcher finds the bundled Quran database and binds only to
localhost for the USB workflow. In `ASR_PROVIDER=local` mode it selects CUDA when
available and uses the cached Whisper model in offline mode; set `ASR_DEVICE=cpu`
to explicitly use CPU inference. Groq mode uses the CPU for VAD and needs no GPU
or local Whisper model download.
It does not enable debug audio retention by default. Existing personal
recordings and metadata must be restored separately from a backup.

## Verification

From the repository root:

```bash
npm run typecheck
npm test
npm run lint
```

From `mutqin-ai-service`:

```bash
.venv/bin/python -m pytest tests -q
```

With both servers running:

```bash
curl http://127.0.0.1:8000/health/ready
curl http://127.0.0.1:8081/status
adb reverse --list
```

Finally open Quran and Hifz on the phone and evaluate a short passage. Backend
readiness confirms the model and database loaded; it does not establish ASR
accuracy. Replaying the original benchmarks additionally requires the missing
private audio, matching JSON metadata, and historical comparison reports.

## Native builds and phone data

EAS Android builds run `npm run eas-build-post-install` automatically to seed
the SQLite 3.45.3 source cache. This avoids the `sqlite.org` download that failed
with `Network is unreachable` in the 23 October build. See
[`vendor/sqlite/README.md`](vendor/sqlite/README.md). The archive is build input,
not a replacement for the Quran database. A retry uses the same command:

```bash
npx eas-cli@latest build --platform android --profile development
```

The hook and source archive must travel with the project. Archive inspection
confirmed both are included; unit checks and archive integrity checks passed.
A successful cloud build remains to be verified by the next EAS run.

Only generate a new native build when the installed client is missing or native
dependencies have changed. That requires the Android SDK and Java 17 described
in the local Ubuntu setup notes. Preserve the existing app's signing key when
updating an installation. Do not uninstall the app as a routine recovery step:
its bookmarks, settings, and memorization progress are stored on the phone.
