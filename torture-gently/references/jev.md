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

For candidate index `i`, emit six questions keyed `c<i>_evidence`, `c<i>_plausibility`, `c<i>_materiality`, `c<i>_responsibility`, `c<i>_class`, and `c<i>_owner`. Question ids never reach the model, so every instruction must name its candidate by backticked path — `` `candidates[0].branch` `` — and repeat nothing the state already carries.

| Key | Type | Instruction | Criteria |
| --- | --- | --- | --- |
| `_evidence` | `noul` | Is `candidates[i].branch` supported by a traceable source in `evidence`, `settled`, or `subject`? | `true`: a named source establishes it. `false`: it rests only on what is imaginable. |
| `_plausibility` | `noul` | Is there a credible path for `candidates[i].branch` to occur or be adopted, given `subject`? | `true`: a realistic route exists. `false`: it would take an implausible chain of events. |
| `_materiality` | `score` | How much would knowing the answer to `candidates[i].branch` change what gets built, accepted, or treated as a risk? | See levels below. |
| `_responsibility` | `noul` | Does `candidates[i].branch` fall within the responsibility of `subject`, rather than someone else's system, team, or decision? | `true`: `subject` owns the outcome. `false`: it belongs to a party outside `subject`. |
| `_class` | `choice` | Classify `candidates[i].branch` against `subject` and `evidence`. | `current`: an existing requirement, behaviour, or constraint. `option`: credibly supported but not adopted. `risk`: a credible path that may need treatment. |
| `_owner` | `choice` | Who must supply the answer to `candidates[i].branch`? | `interviewer`: a fact discoverable from sources, artefacts, or runtime. `user`: private information, a preference, or a decision only the user can make. |

`_materiality` levels, in order:

```json
["Knowing the answer changes nothing that is built, tested, or accepted",
 "The answer changes wording or presentation only",
 "The answer changes one acceptance condition or risk treatment",
 "The answer changes a deliverable, a contract, or the shape of the solution"]
```

Ship every candidate in one request. The questions are independent and evaluate in parallel; a second request is warranted only when an answer is needed to fetch evidence or construct new state.

## 3. Send it

Write the full request body to the scratchpad as `request.json` — the `state` object from step 1, the `questions` map from step 2, and `"model": "jev-latest"` — then send it from the skill root using only the non-empty key in `api_key.env`. Put `response.json` beside the request and read it only after a successful HTTP response:

macOS and Linux:

```sh
if [ ! -f ./api_key.env ]; then
  printf 'api_key.env is missing\n' >&2
  exit 1
fi
unset TYPESAFE_API_KEY
set -a
. ./api_key.env
set +a
TYPESAFE_API_KEY=$(printf '%s' "${TYPESAFE_API_KEY-}" | tr -d '\r')
if [ -z "$(printf '%s' "${TYPESAFE_API_KEY-}" | tr -d '[:space:]')" ]; then
  printf 'TYPESAFE_API_KEY is missing\n' >&2
  exit 1
fi
export TYPESAFE_API_KEY
request_json="/absolute/path/to/request.json"
response_json="$(dirname "$request_json")/response.json"
http_status=$(curl -sS -o "$response_json" -w '%{http_code}' \
  -X POST https://api.typesafe.ai/v1/systemone \
  -H "Authorization: Bearer $TYPESAFE_API_KEY" \
  -H "Content-Type: application/json" \
  --data-binary "@$request_json")
curl_exit=$?
printf 'HTTP %s (curl exit %s)\n' "$http_status" "$curl_exit"
```

Windows:

```powershell
if (-not (Test-Path -LiteralPath './api_key.env')) { throw 'api_key.env is missing' }
$entry = Select-String -LiteralPath './api_key.env' -Pattern '^\s*TYPESAFE_API_KEY\s*=\s*(.*)$' | Select-Object -First 1
if (-not $entry) { throw 'TYPESAFE_API_KEY is missing from api_key.env' }
$key = $entry.Matches[0].Groups[1].Value.Trim().Trim('"')
if ([string]::IsNullOrWhiteSpace($key)) { throw 'TYPESAFE_API_KEY is missing' }
$requestJson = '<absolute path to request.json>'
$responseJson = Join-Path (Split-Path -Parent $requestJson) 'response.json'
$httpStatus = curl.exe -sS -o $responseJson -w '%{http_code}' -X POST https://api.typesafe.ai/v1/systemone `
  -H "Authorization: Bearer $key" `
  -H "Content-Type: application/json" `
  --data-binary "@$requestJson"
"HTTP $httpStatus (curl exit $LASTEXITCODE)"
```

Call `curl.exe` by name: bare `curl` is an alias for `Invoke-WebRequest` in Windows PowerShell 5.1, which does not accept these flags.

Never echo the key or put its value directly in a command. A nonzero curl exit means the request failed before a usable response; use the unassisted gate. Treat `response.json` as Jev answers only on `2xx`. On `401`, check the key and use the unassisted gate. On `429` or `529`, wait briefly and retry once, then use the unassisted gate if it still fails. On `422`, inspect the error in `response.json` and correct the request; use the unassisted gate if it cannot be corrected.

## 4. Read the result

A branch joins the frontier when all four gates pass: `_evidence` and `_plausibility` and `_responsibility` above `0.5`, and `_materiality` at or above `1.5`.

A `noul` carries no confidence field; its distance from `0.5` is the signal. Treat `0.35`–`0.65` as undecided, and `_materiality` as undecided when its `confidence` is below `0.5`. An undecided gate never drops a branch — asking one unnecessary question costs a round, silently dropping a real one costs the session.

Use `_owner` to check who should answer, not to bypass the fact-finding rule in `SKILL.md`. A Choice has `choice`, `probabilities`, and `confidence`; the Noul undecided band does not apply to it. If `_owner` favors `interviewer`, find the fact. If it favors `user`, first check whether the answer really requires private information, a preference, or a decision; find accessible facts yourself. When its `confidence` is low, check available sources before routing. If a factual prerequisite remains unresolved, hold only its dependent branches; ask the rest of the frontier. Carry `_class` through as the branch's Current, Option, or Risk classification.

These thresholds are starting points. Watch the first few rounds against your own reading and move them before trusting them.

Report nothing of this to the user. The round they see is the format `SKILL.md` defines, unchanged.
