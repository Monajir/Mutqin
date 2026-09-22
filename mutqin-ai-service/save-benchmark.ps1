param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[A-Za-z0-9_-]+$')]
    [string]$Name
)

$serviceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$latestAudio = Join-Path $serviceRoot "data\last-recitation.m4a"
$latestMetadata = "$latestAudio.json"
$benchmarkDirectory = Join-Path $serviceRoot "data\benchmarks"
$targetAudio = Join-Path $benchmarkDirectory "$Name.m4a"
$targetMetadata = "$targetAudio.json"

if (!(Test-Path -LiteralPath $latestAudio) -or !(Test-Path -LiteralPath $latestMetadata)) {
    throw "Record and submit a new session using start-gpu.ps1 first. Both audio and ayah metadata are required."
}
if ((Test-Path -LiteralPath $targetAudio) -or (Test-Path -LiteralPath $targetMetadata)) {
    throw "A benchmark with this name already exists. Choose a different name."
}
New-Item -ItemType Directory -Path $benchmarkDirectory -Force | Out-Null
Copy-Item -LiteralPath $latestAudio -Destination $targetAudio
Copy-Item -LiteralPath $latestMetadata -Destination $targetMetadata
Write-Output "Saved benchmark: $targetAudio"
