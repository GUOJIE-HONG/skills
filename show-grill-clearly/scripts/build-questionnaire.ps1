# Materialize and open one grill questionnaire on Windows.
# Usage: powershell.exe -File scripts/build-questionnaire.ps1 -Data <payload.json> [-Out <file.html>]
param(
  [Parameter(Mandatory = $true)][string]$Data,
  [string]$Out
)

$ErrorActionPreference = 'Stop'

$templatePath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../assets/questionnaire-template.html')).Path
$dataPath = (Resolve-Path -LiteralPath $Data).Path
$template = [System.IO.File]::ReadAllText($templatePath)
$safeJson = [System.IO.File]::ReadAllText($dataPath).Trim().Replace('<', '\u003c')

$openTag = '<script id="questionnaire-data" type="application/json">'
$start = $template.IndexOf($openTag)
if ($start -lt 0) { throw "template marker not found in $templatePath" }

$bodyStart = $start + $openTag.Length
$end = $template.IndexOf('</script>', $bodyStart)
if ($end -lt 0) { throw "template data block is never closed in $templatePath" }

$result = $template.Substring(0, $bodyStart) + "`n" + $safeJson + "`n" + $template.Substring($end)

if (-not $Out) {
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $token = [System.Guid]::NewGuid().ToString('N').Substring(0, 8)
  $Out = Join-Path ([System.IO.Path]::GetTempPath()) "grill-questionnaire-$stamp-$token.html"
}

$Out = [System.IO.Path]::GetFullPath($Out)
$outDirectory = [System.IO.Path]::GetDirectoryName($Out)
if (-not [System.IO.Directory]::Exists($outDirectory)) { throw "output directory not found: $outDirectory" }
if ([System.IO.File]::Exists($Out)) { throw "output already exists: $Out" }

[System.IO.File]::WriteAllText($Out, $result, (New-Object System.Text.UTF8Encoding $false))
"ARTIFACT=$Out"

# Acceptance means the OS accepted the request, not that a visible window was observed.
try {
  Start-Process -FilePath $Out
  'LAUNCH=accepted'
} catch {
  'LAUNCH=failed'
  Write-Warning 'browser launch failed; use the artifact path above'
}
