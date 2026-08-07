# Build a Matt grill questionnaire from a JSON payload and open it in the browser.
# Usage: pwsh -File scripts/build-questionnaire.ps1 -Data <payload.json> [-Out <file.html>] [-NoOpen]
param(
  [Parameter(Mandatory = $true)][string]$Data,
  [string]$Out,
  [switch]$NoOpen
)

$ErrorActionPreference = 'Stop'

$template = Join-Path $PSScriptRoot '../assets/questionnaire-template.html'
$html = [System.IO.File]::ReadAllText((Resolve-Path -LiteralPath $template))
$json = [System.IO.File]::ReadAllText((Resolve-Path -LiteralPath $Data)).Trim()

# Fail fast on malformed payloads instead of shipping a broken or unanswerable questionnaire.
$parsed = $json | ConvertFrom-Json
if (-not $parsed.questions -or @($parsed.questions).Count -eq 0) { throw 'payload has no questions' }
if ($json -match '</script') { throw 'payload contains "</script"; rewrite the text to avoid it' }

$seen = @{}
foreach ($q in @($parsed.questions)) {
  $id = $q.id
  if (-not $id) { throw 'every question needs an id' }
  if ($seen.ContainsKey($id)) { throw "duplicate question id: $id" }
  $seen[$id] = $true
  # A decision without a concrete situation is not answerable — this is the point of the questionnaire.
  if (-not $q.scenario) { throw "$id has no scenario; give a concrete situation showing what each choice leads to" }
  if (@($q.options).Count -lt 2) { throw "$id needs at least two distinguishable options" }
  foreach ($o in @($q.options)) {
    if (-not $o.key -or -not $o.title) { throw "$id has an option missing key or title" }
  }
  if ($q.recommendation -and -not (@($q.options) | Where-Object { $_.key -eq $q.recommendation })) {
    throw "$id recommends '$($q.recommendation)' but no option has that key"
  }
}

$openTag = '<script id="questionnaire-data" type="application/json">'
$start = $html.IndexOf($openTag)
if ($start -lt 0) { throw 'template marker not found' }
$bodyStart = $start + $openTag.Length
$end = $html.IndexOf('</script>', $bodyStart)

$result = $html.Substring(0, $bodyStart) + "`n" + $json + "`n" + $html.Substring($end)

if (-not $Out) {
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $Out = Join-Path ([System.IO.Path]::GetTempPath()) "grill-questionnaire-$stamp.html"
}
[System.IO.File]::WriteAllText($Out, $result, (New-Object System.Text.UTF8Encoding $false))

if (-not $NoOpen) { Start-Process -FilePath $Out }
$Out
