$serviceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $serviceRoot

$env:QURAN_DB_PATH = Join-Path $serviceRoot "..\assets\db\quran-content.db"
$env:ASR_DEVICE = "cuda"
$env:ASR_DEBUG_AUDIO_PATH = Join-Path $serviceRoot "data\last-recitation.m4a"
$env:HF_HUB_OFFLINE = "1"
$env:TRANSFORMERS_OFFLINE = "1"

& (Join-Path $serviceRoot ".venv\python.exe") -m uvicorn app.main:app --host 0.0.0.0 --port 8000
