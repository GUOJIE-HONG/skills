# Jev-assisted question gate

Applies only when a `TYPESAFE_API_KEY` was found. Jev rules the gate; you still write every question, recommendation, and checkpoint. Jev returns typed judgments and probabilities, never prose.

## 1. Build the state

One request per round, covering every candidate branch on the current frontier. This object is the request's `state` value:

```json
{
  "subject": "What is being stress-tested, in one or two sentences",
  "settled": ["Decisions already settled, most recent first"],
  "evidence": ["Each item as `locator` — claim, where locator is a path:line, URL, document section, ticket, or quoted user statement"],
  "candidates": [
    { "branch": "The candidate decision, stated as the thing that would be decided" }
  ]
}
```

Keep `evidence` to what the round actually rests on. Leave `settled` empty on the first round.

## 2. Ask six judgments per candidate

Question ids never reach the model, so every instruction names its candidate by a backticked path into `state`. Emit this block once per candidate, replacing every `0` in the ids and paths with that candidate's index. This is the exact wire format; send it verbatim apart from the index.

```json
{
  "model": "jev-latest",
  "state": { "subject": "...", "settled": [], "evidence": ["..."], "candidates": [{ "branch": "..." }] },
  "questions": {
    "c0_evidence": {
      "type": "noul",
      "instructions": "Is the branch in `candidates[0].branch` supported by a traceable source in `evidence`, `settled`, or `subject`?",
      "criteria": {
        "true": "A named source establishes it.",
        "false": "It rests only on what is imaginable."
      }
    },
    "c0_plausibility": {
      "type": "noul",
      "instructions": "Given `subject`, is there a credible path for the branch in `candidates[0].branch` to occur or be adopted?",
      "criteria": {
        "true": "A realistic route exists.",
        "false": "It would take an implausible chain of events."
      }
    },
    "c0_materiality": {
      "type": "score",
      "instructions": "How much would knowing the answer to the branch in `candidates[0].branch` change what gets built, accepted, or treated as a risk?",
      "criteria": [
        "Knowing the answer changes nothing that is built, tested, or accepted",
        "The answer changes wording or presentation only",
        "The answer changes one acceptance condition or risk treatment",
        "The answer changes a deliverable, a contract, or the shape of the solution"
      ]
    },
    "c0_responsibility": {
      "type": "noul",
      "instructions": "Does the branch in `candidates[0].branch` fall within the responsibility of `subject`, rather than someone else's system, team, or decision?",
      "criteria": {
        "true": "`subject` owns the outcome.",
        "false": "It belongs to a party outside `subject`."
      }
    },
    "c0_class": {
      "type": "choice",
      "instructions": "Classify the branch in `candidates[0].branch` against `subject` and `evidence`.",
      "criteria": {
        "current": "An existing requirement, behaviour, or constraint.",
        "option": "Credibly supported but not adopted.",
        "risk": "A credible path that may need treatment."
      }
    },
    "c0_owner": {
      "type": "choice",
      "instructions": "Who must supply the answer to the branch in `candidates[0].branch`?",
      "criteria": {
        "interviewer": "A fact discoverable from sources, artefacts, or runtime.",
        "user": "Private information, a preference, or a decision only the user can make."
      }
    }
  }
}
```

A `noul` takes `criteria.true` and `criteria.false`, a `choice` takes a map of option to description, and a `score` takes an ordered array of at least two levels. A wrong shape returns `422`.

Ship every candidate in one request. The questions are independent and evaluate in parallel; a second request is warranted only when an answer is needed to fetch evidence or construct new state.

## 3. Send it

Write the full request body to the scratchpad as `request.json`. The key lives in `$HOME/.typesafe/api_key.env`, outside the skill, and is read without sourcing the file, so it never gains the export attribute and no child process inherits it. It reaches `curl` through stdin, so it never appears in the process argument list either. Put `response.json` beside the request and read it only after a successful HTTP response:

macOS and Linux:

```sh
key_file="$HOME/.typesafe/api_key.env"
if [ ! -f "$key_file" ]; then
  printf '%s is missing\n' "$key_file" >&2
  exit 1
fi
key=$(sed -n 's/^[[:space:]]*TYPESAFE_API_KEY[[:space:]]*=[[:space:]]*//p' "$key_file" | head -n 1 | tr -d '\r"')
if [ -z "$(printf '%s' "$key" | tr -d '[:space:]')" ]; then
  printf 'TYPESAFE_API_KEY is missing from %s\n' "$key_file" >&2
  exit 1
fi
request_json="/absolute/path/to/request.json"
response_json="$(dirname "$request_json")/response.json"
http_status=$(printf 'header = "Authorization: Bearer %s"\n' "$key" | curl -K - -sS \
  -o "$response_json" -w '%{http_code}' \
  -X POST https://api.typesafe.ai/v1/systemone \
  -H "Content-Type: application/json" \
  --data-binary "@$request_json")
curl_exit=$?
unset key
printf 'HTTP %s (curl exit %s)\n' "$http_status" "$curl_exit"
```

Windows:

```powershell
$keyFile = Join-Path $HOME '.typesafe\api_key.env'
if (-not (Test-Path -LiteralPath $keyFile)) { throw "$keyFile is missing" }
$entry = Select-String -LiteralPath $keyFile -Pattern '^\s*TYPESAFE_API_KEY\s*=\s*(.*)$' | Select-Object -First 1
if (-not $entry) { throw "TYPESAFE_API_KEY is missing from $keyFile" }
$key = $entry.Matches[0].Groups[1].Value.Trim().Trim('"')
if ([string]::IsNullOrWhiteSpace($key)) { throw "TYPESAFE_API_KEY is missing from $keyFile" }
$requestJson = '<absolute path to request.json>'
$responseJson = Join-Path (Split-Path -Parent $requestJson) 'response.json'
$httpStatus = "header = `"Authorization: Bearer $key`"" | curl.exe -K - -sS `
  -o $responseJson -w '%{http_code}' `
  -X POST https://api.typesafe.ai/v1/systemone `
  -H "Content-Type: application/json" `
  --data-binary "@$requestJson"
$curlExit = $LASTEXITCODE
Remove-Variable key
"HTTP $httpStatus (curl exit $curlExit)"
```

Call `curl.exe` by name: bare `curl` is an alias for `Invoke-WebRequest` in Windows PowerShell 5.1, which does not accept these flags.

Never echo the key, never pass it as a command argument, never export it, and never copy it into the skill directory or a repository. A nonzero curl exit means the request failed before a usable response; use the unassisted gate. Treat `response.json` as Jev answers only on `2xx`. On `401` either the key is wrong or `api_key.env` was saved with CRLF line endings; say which you suspect and use the unassisted gate. On `429` or `529`, wait briefly and retry once, then use the unassisted gate if it still fails. On `422`, inspect the error in `response.json` and correct the request against the shape in step 2; use the unassisted gate if it cannot be corrected.


## 4. Read the result

A branch joins the frontier when all four gates pass: `_evidence` and `_plausibility` and `_responsibility` above `0.5`, and `_materiality` at or above `1.5`.

A `noul` carries no confidence field; its distance from `0.5` is the signal. Treat `0.35`–`0.65` as undecided, and `_materiality` as undecided when its `confidence` is below `0.5`. An undecided gate never drops a branch — asking one unnecessary question costs a round, silently dropping a real one costs the session.

Use `_owner` to check who should answer, not to bypass the fact-finding rule in `SKILL.md`. A Choice has `choice`, `probabilities`, and `confidence`; the Noul undecided band does not apply to it. If `_owner` favors `interviewer`, find the fact. If it favors `user`, first check whether the answer really requires private information, a preference, or a decision; find accessible facts yourself. When its `confidence` is low, check available sources before routing. If a factual prerequisite remains unresolved, hold only its dependent branches; ask the rest of the frontier. Carry `_class` through as the branch's Current, Option, or Risk classification.

These thresholds are starting points. Watch the first few rounds against your own reading and move them before trusting them.

Report nothing of this to the user. The round they see is the format `SKILL.md` defines, unchanged.
