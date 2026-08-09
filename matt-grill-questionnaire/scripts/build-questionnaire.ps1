# Build, validate, and open one Matt grill questionnaire.
# Usage: powershell.exe -File scripts/build-questionnaire.ps1 -Data <payload.json> [-Out <file.html>]
# Windows PowerShell 5.1 syntax only.
param(
  [Parameter(Mandatory = $true)][string]$Data,
  [string]$Out
)

$ErrorActionPreference = 'Stop'
$problems = New-Object System.Collections.Generic.List[string]

function Add-Problem([string]$message) { $script:problems.Add($message) }
function Has-Field($object, [string]$name) {
  return $null -ne $object -and $null -ne $object.PSObject.Properties[$name]
}
function Is-Object($value) {
  return $null -ne $value -and $value -is [psobject] -and
    -not ($value -is [string]) -and -not ($value -is [System.Collections.IEnumerable])
}
function Check-Fields($object, [string[]]$allowed, [string]$path) {
  if ($null -eq $object) { return }
  foreach ($property in $object.PSObject.Properties) {
    if ($allowed -notcontains $property.Name) { Add-Problem "$path 有未知欄位 $($property.Name)。" }
  }
}
function Check-Text($object, [string]$name, [string]$path, [int]$limit) {
  if (-not (Has-Field $object $name) -or -not ($object.$name -is [string]) -or
      [string]::IsNullOrWhiteSpace($object.$name)) {
    Add-Problem "$path.$name 必須是非空白字串。"
    return $false
  }
  if ($limit -gt 0 -and $object.$name.Length -gt $limit) {
    Add-Problem "$path.$name 超過 $limit 字（目前 $($object.$name.Length) 字）。"
  }
  return $true
}

try {
  $dataPath = (Resolve-Path -LiteralPath $Data).Path
  $json = [System.IO.File]::ReadAllText($dataPath)
  $payload = ConvertFrom-Json -InputObject $json -ErrorAction Stop
} catch {
  [Console]::Error.WriteLine("VALIDATION_FAILED`n- payload 無法讀取或不是合法 JSON：$($_.Exception.Message)")
  exit 2
}

if (-not (Is-Object $payload)) {
  Add-Problem 'payload 根節點必須是物件。'
} else {
  Check-Fields $payload @('title', 'lede', 'recap', 'questions') 'payload'
  [void](Check-Text $payload 'title' 'payload' 0)
  if (Check-Text $payload 'lede' 'payload' 40) {
    $sentenceMarks = ([regex]::Matches($payload.lede, '[。！？!?]')).Count
    if ($sentenceMarks -gt 1 -or ($sentenceMarks -eq 1 -and $payload.lede -notmatch '[。！？!?]\s*$')) {
      Add-Problem 'payload.lede 必須只有一句。'
    }
  }

  if (-not (Has-Field $payload 'recap') -or -not ($payload.recap -is [System.Array])) {
    Add-Problem 'payload.recap 必須是字串陣列。'
  } else {
    if ($payload.recap.Count -gt 6) { Add-Problem "payload.recap 最多 6 則（目前 $($payload.recap.Count) 則）。" }
    for ($i = 0; $i -lt $payload.recap.Count; $i++) {
      $item = $payload.recap[$i]
      if (-not ($item -is [string]) -or [string]::IsNullOrWhiteSpace($item)) {
        Add-Problem "payload.recap[$i] 必須是非空白字串。"
      } elseif ($item.Length -gt 30) {
        Add-Problem "payload.recap[$i] 超過 30 字（目前 $($item.Length) 字）。"
      }
    }
  }

  if (-not (Has-Field $payload 'questions') -or -not ($payload.questions -is [System.Array]) -or
      $payload.questions.Count -eq 0) {
    Add-Problem 'payload.questions 必須是至少含一題的陣列。'
  } else {
    $seenIds = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
    $totalChars = $payload.title.Length + $payload.lede.Length
    foreach ($item in $payload.recap) { if ($item -is [string]) { $totalChars += $item.Length } }

    for ($i = 0; $i -lt $payload.questions.Count; $i++) {
      $q = $payload.questions[$i]
      $path = "questions[$i]"
      if (-not (Is-Object $q)) { Add-Problem "$path 必須是物件。"; continue }
      Check-Fields $q @('id', 'title', 'sourceQuestion', 'required', 'context', 'scenario', 'recommendation', 'options') $path
      if (Check-Text $q 'id' $path 64) {
        $totalChars += $q.id.Length
        if ($q.id -notmatch '^[A-Za-z][A-Za-z0-9_-]{0,63}$') { Add-Problem "$path.id 格式不合法。" }
        if (-not $seenIds.Add($q.id)) { Add-Problem "$path.id 與另一題重複（不分大小寫）。" }
      }
      if (Check-Text $q 'title' $path 30) { $totalChars += $q.title.Length }
      [void](Check-Text $q 'sourceQuestion' $path 0)
      if (-not (Has-Field $q 'required') -or -not ($q.required -is [bool])) { Add-Problem "$path.required 必須是 boolean。" }
      if (Check-Text $q 'scenario' $path 80) { $totalChars += $q.scenario.Length }

      if (-not (Has-Field $q 'context') -or -not ($q.context -is [System.Array]) -or $q.context.Count -eq 0) {
        Add-Problem "$path.context 必須是含 1–3 則事實的字串陣列。"
      } else {
        if ($q.context.Count -gt 3) { Add-Problem "$path.context 最多 3 則（目前 $($q.context.Count) 則）。" }
        for ($j = 0; $j -lt $q.context.Count; $j++) {
          $fact = $q.context[$j]
          if (-not ($fact -is [string]) -or [string]::IsNullOrWhiteSpace($fact)) {
            Add-Problem "$path.context[$j] 必須是非空白字串。"
          } else {
            $totalChars += $fact.Length
            if ($fact.Length -gt 40) { Add-Problem "$path.context[$j] 超過 40 字（目前 $($fact.Length) 字）。" }
          }
        }
      }

      if (-not (Has-Field $q 'options') -or -not ($q.options -is [System.Array]) -or
          $q.options.Count -lt 2 -or $q.options.Count -gt 4) {
        $count = if ($q.options -is [System.Array]) { $q.options.Count } else { 0 }
        Add-Problem "$path.options 必須有 2–4 個選項（目前 $count 個）。"
      }
      if ($q.options -is [System.Array]) {
        $seenKeys = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
        for ($j = 0; $j -lt $q.options.Count; $j++) {
          $option = $q.options[$j]
          $optionPath = "$path.options[$j]"
          if (-not (Is-Object $option)) { Add-Problem "$optionPath 必須是物件。"; continue }
          Check-Fields $option @('key', 'title', 'note') $optionPath
          if (Check-Text $option 'key' $optionPath 64) {
            $totalChars += $option.key.Length
            if ($option.key -notmatch '^[A-Za-z][A-Za-z0-9_-]{0,63}$') { Add-Problem "$optionPath.key 格式不合法。" }
            if (-not $seenKeys.Add($option.key)) { Add-Problem "$optionPath.key 在本題重複（不分大小寫）。" }
          }
          if (Check-Text $option 'title' $optionPath 20) { $totalChars += $option.title.Length }
          if (Check-Text $option 'note' $optionPath 40) { $totalChars += $option.note.Length }
        }
        if (Has-Field $q 'recommendation') {
          if (-not ($q.recommendation -is [string]) -or [string]::IsNullOrWhiteSpace($q.recommendation)) {
            Add-Problem "$path.recommendation 若提供，必須是非空白字串。"
          } elseif (-not $seenKeys.Contains($q.recommendation)) {
            Add-Problem "$path.recommendation 必須對應本題的一個 option key。"
          }
        }
      }
    }
    if ($payload.questions.Count -eq 5 -and $totalChars -gt 2000) {
      Add-Problem "五題問卷的動態文字超過 2,000 字（目前 $totalChars 字）；請拆分或縮短。"
    }
  }
}

if ($problems.Count) {
  [Console]::Error.WriteLine("VALIDATION_FAILED`n" + (($problems | ForEach-Object { '- ' + $_ }) -join "`n"))
  exit 2
}

$template = Join-Path $PSScriptRoot '../assets/questionnaire-template.html'
$html = [System.IO.File]::ReadAllText((Resolve-Path -LiteralPath $template))
$escape = [string][char]0x5C + 'u003c'
$safeJson = $json.Trim().Replace('<', $escape)
$openTag = '<script id="questionnaire-data" type="application/json">'
$start = $html.IndexOf($openTag)
if ($start -lt 0) { throw "template marker not found in $template" }
$bodyStart = $start + $openTag.Length
$end = $html.IndexOf('</script>', $bodyStart)
if ($end -lt 0) { throw "template data block is never closed in $template" }
$result = $html.Substring(0, $bodyStart) + "`n" + $safeJson + "`n" + $html.Substring($end)

if (-not $Out) {
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $Out = Join-Path ([System.IO.Path]::GetTempPath()) "grill-questionnaire-$stamp-$PID.html"
}
$Out = [System.IO.Path]::GetFullPath($Out)
if ([System.IO.File]::Exists($Out)) { throw "output already exists: $Out" }
[System.IO.File]::WriteAllText($Out, $result, (New-Object System.Text.UTF8Encoding $false))
"ARTIFACT=$Out"

# One request, for this exact artifact. Acceptance is not an observed window.
try {
  Start-Process -FilePath $Out
  'LAUNCH=accepted'
} catch {
  'LAUNCH=failed'
  Write-Warning 'browser launch request failed; use the artifact path above'
}
