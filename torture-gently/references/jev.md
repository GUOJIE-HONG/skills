# Jev-assisted question gate

§ 0 covers the key file itself, whether or not one exists yet. Everything from § 1 applies only when a `TYPESAFE_API_KEY` was found. Jev rules the gate; you still write every question, recommendation, and checkpoint. Jev returns typed judgments and probabilities, never prose.

## 0. The key file

`$HOME/.typesafe/api_key.env` holds one line, `TYPESAFE_API_KEY=<key>`. It must be readable only by its owner: on a shared POSIX host a file created under the usual `022` umask is world-readable, and any local account can then authenticate as the user.

Create it empty and private first, then have the user paste the key in with their editor — that keeps the value out of argv and shell history. The same command repairs an existing file without changing its contents, so run it whenever the probe reports `wide`.

```sh
umask 077
mkdir -p "$HOME/.typesafe" && chmod 700 "$HOME/.typesafe" &&
  : >>"$HOME/.typesafe/api_key.env" && chmod 600 "$HOME/.typesafe/api_key.env"
```

In `pwsh`:

```powershell
$d = Join-Path $HOME '.typesafe'; $f = Join-Path $d 'api_key.env'
New-Item -ItemType Directory -Force -Path $d | Out-Null
if (-not (Test-Path -LiteralPath $f)) { New-Item -ItemType File -Path $f | Out-Null }
icacls $d /reset | Out-Null; icacls $d /inheritance:r /grant:r "$($env:USERNAME):(OI)(CI)(F)" | Out-Null
icacls $f /reset | Out-Null; icacls $f /inheritance:r /grant:r "$($env:USERNAME):(F)" | Out-Null
```

`/reset` comes first because `/inheritance:r` drops only inherited entries and `/grant:r` replaces only the named user's, so an explicit grant such as `Everyone:(R)` would otherwise survive the repair.

A file that was ever `wide` must be treated as disclosed: tell the user to replace the key at https://console.typesafe.ai/keys after repairing it.

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

Question ids never reach the model, so every instruction names its candidate by a backticked path into `state`. One request carries the whole round: `state.candidates` lists every candidate on the frontier in order, and `questions` holds six entries for each of them. The block below is that request for a frontier of one. This is the exact wire format; send it verbatim apart from the indices.

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
      "instructions": "How much would answering the branch in `candidates[0].branch` change a decision, risk treatment, acceptance condition, or deliverable for `subject`? Count changes to wording or presentation as deliverable changes when those are the subject's deliverable.",
      "criteria": [
        "The answer changes no decision, risk treatment, acceptance condition, deliverable, or explanation",
        "Only optional explanatory wording or cosmetic display changes; the decision, risk treatment, acceptance condition, and deliverable stay the same",
        "The answer changes one decision, acceptance condition, or risk treatment",
        "The answer changes a deliverable, a contract, or the overall shape of the solution"
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

For a longer frontier, extend `state.candidates` and repeat those six entries once per candidate — replacing every `0` in the ids and paths with that candidate's index — inside the same `questions` object. Never emit a second top-level block: `candidates[1]` resolves only against the array you actually send, so a split request drops candidates or returns `422`. Two candidates give a twelve-entry `questions`:

```json
{
  "model": "jev-latest",
  "state": {
    "subject": "...",
    "settled": [],
    "evidence": ["..."],
    "candidates": [{ "branch": "First candidate" }, { "branch": "Second candidate" }]
  },
  "questions": {
    "c0_evidence": {}, "c0_plausibility": {}, "c0_materiality": {},
    "c0_responsibility": {}, "c0_class": {}, "c0_owner": {},
    "c1_evidence": {}, "c1_plausibility": {}, "c1_materiality": {},
    "c1_responsibility": {}, "c1_class": {}, "c1_owner": {}
  }
}
```

That skeleton shows ids and placement only. Each `{}` stands for the full entry of the same name above, with its `0` replaced by the candidate's index; an empty object on the wire returns `422`.

The questions are independent and evaluate in parallel, so the whole round is one request. Never send a second one for the same round; the only resends are the ones § 3 prescribes for `422`, `429` and `529`, which replace a request that returned no answers. Evidence you find while acting on this round's results goes into `evidence` for the next round.

## 3. Send it

Write the full request body to the scratchpad as `request.json`. The key lives in `$HOME/.typesafe/api_key.env`, outside the skill, and is read without sourcing the file, so it never gains the export attribute. A `TYPESAFE_API_KEY` the calling shell already exports is removed first, so no child process inherits the key from either place. It reaches `curl` through stdin, so it never appears in the process argument list either. `-q` comes first on both commands: without it curl reads the user's `~/.curlrc`, and a `verbose` or `trace` setting there prints the whole `Authorization` header to stderr. `-q` has this effect only as the first argument. `set +x` and `Set-PSDebug -Off` come before the key is read, because shell tracing would echo it and `-q` does not reach the shell. The timeouts bound a server that accepts the connection and then stops responding, so the fallback below still runs instead of the interview hanging. Put `response.json` beside the request and read it only after a successful HTTP response:

macOS and Linux:

```sh
set +x
set +a
unset typesafe_api_key TYPESAFE_API_KEY
key_file="$HOME/.typesafe/api_key.env"
if [ ! -f "$key_file" ]; then
  printf '%s is missing\n' "$key_file" >&2
  exit 1
fi
typesafe_api_key=$(sed -n 's/^[[:space:]]*TYPESAFE_API_KEY[[:space:]]*=[[:space:]]*//p' "$key_file" | head -n 1 | tr -d '\r"')
if [ -z "$(printf '%s' "$typesafe_api_key" | tr -d '[:space:]')" ]; then
  printf 'TYPESAFE_API_KEY is missing from %s\n' "$key_file" >&2
  exit 1
fi
request_json="/absolute/path/to/request.json"
response_json="$(dirname "$request_json")/response.json"
http_status=$(printf 'header = "Authorization: Bearer %s"\n' "$typesafe_api_key" | curl -q -K - -sS --connect-timeout 10 --max-time 120 \
  -o "$response_json" -w '%{http_code}' \
  -X POST https://api.typesafe.ai/v1/systemone \
  -H "Content-Type: application/json" \
  --data-binary "@$request_json")
curl_exit=$?
unset typesafe_api_key TYPESAFE_API_KEY
printf 'HTTP %s (curl exit %s)\n' "$http_status" "$curl_exit"
```

Windows (PowerShell 7 or newer, run with `pwsh`):

```powershell
Set-PSDebug -Off
Remove-Item Env:TYPESAFE_API_KEY -ErrorAction Ignore
if ($PSVersionTable.PSVersion.Major -lt 7) { throw 'PowerShell 7 or newer is required' }
$keyFile = Join-Path $HOME '.typesafe\api_key.env'
if (-not (Test-Path -LiteralPath $keyFile)) { throw "$keyFile is missing" }
$entry = Select-String -LiteralPath $keyFile -Pattern '^\s*TYPESAFE_API_KEY\s*=\s*(.*)$' | Select-Object -First 1
if (-not $entry) { throw "TYPESAFE_API_KEY is missing from $keyFile" }
$key = $entry.Matches[0].Groups[1].Value.Trim().Trim('"')
if ([string]::IsNullOrWhiteSpace($key)) { throw "TYPESAFE_API_KEY is missing from $keyFile" }
$requestJson = '<absolute path to request.json>'
$responseJson = Join-Path (Split-Path -Parent $requestJson) 'response.json'
$httpStatus = "header = `"Authorization: Bearer $key`"" | curl.exe -q -K - -sS --connect-timeout 10 --max-time 120 `
  -o $responseJson -w '%{http_code}' `
  -X POST https://api.typesafe.ai/v1/systemone `
  -H "Content-Type: application/json" `
  --data-binary "@$requestJson"
$curlExit = $LASTEXITCODE
Remove-Variable key
"HTTP $httpStatus (curl exit $curlExit)"
```

Run the Windows command in `pwsh` and call `curl.exe` by name.

Never echo the key, never pass it as a command argument, never export it, and never copy it into the skill directory or a repository. A nonzero curl exit means the request failed before a usable response, including exit `28` when a timeout fires; use the unassisted gate. Treat `response.json` as Jev answers only on `2xx`. On `401`, check the key and use the unassisted gate. On `429` or `529`, wait briefly and retry once, then use the unassisted gate if it still fails. On `422`, inspect the error in `response.json` and correct the request against the shape in step 2; use the unassisted gate if it cannot be corrected. On any other status, use the unassisted gate. curl exits `0` on every HTTP status it receives, so the status code, not the exit code, decides these cases.


## 4. Read the result

Answers come back under the ids you sent, in an `answers` map. A `noul` carries its probability in `noul` and has no confidence field; a `score` carries a probability-weighted number in `score`, which can land between levels, with `legend` mapping level indices back to their descriptions; a `choice` carries the winning option in `choice`. This is the shape to parse:

```json
{
  "model": "jev-1.13.0",
  "answers": {
    "c0_evidence": { "type": "noul", "noul": 0.94 },
    "c0_plausibility": { "type": "noul", "noul": 0.58 },
    "c0_materiality": {
      "type": "score",
      "score": 2.15,
      "legend": { "0": "The answer changes no decision, risk treatment, acceptance condition, deliverable, or explanation", "1": "Only optional explanatory wording or cosmetic display changes; the decision, risk treatment, acceptance condition, and deliverable stay the same", "2": "The answer changes one decision, acceptance condition, or risk treatment", "3": "The answer changes a deliverable, a contract, or the overall shape of the solution" },
      "probabilities": { "0": 0.0, "1": 0.05, "2": 0.75, "3": 0.2 },
      "confidence": 0.71
    },
    "c0_responsibility": { "type": "noul", "noul": 0.88 },
    "c0_class": {
      "type": "choice",
      "choice": "risk",
      "probabilities": { "current": 0.06, "option": 0.22, "risk": 0.72 },
      "confidence": 0.64
    },
    "c0_owner": {
      "type": "choice",
      "choice": "user",
      "probabilities": { "interviewer": 0.19, "user": 0.81 },
      "confidence": 0.77
    }
  },
  "usage": { "input_tokens": 1120, "output_tokens": 0 }
}
```

A branch joins the frontier unless a gate clearly fails; an undecided gate never fails. Asking one unnecessary question costs a round, silently dropping a real one costs the session.

A Noul's distance from `0.5` is its only certainty signal, so treat `0.35`–`0.65` as undecided. `_evidence`, `_plausibility` and `_responsibility` therefore fail only below `0.35`; at `0.35` or above, the undecided band included, they pass. `_materiality` fails only when its `score` is below `1.5` **and** its `confidence` is at least `0.5`; a `confidence` under `0.5` is undecided and passes whatever its score.

Use `_owner` to check who should answer, not to bypass the fact-finding rule in `SKILL.md`. The Noul undecided band does not apply to a Choice, which carries its own `confidence`. If `_owner` favors `interviewer`, find the fact. If it favors `user`, first check whether the answer really requires private information, a preference, or a decision; find accessible facts yourself. When its `confidence` is low, check available sources before routing. If a factual prerequisite remains unresolved, hold only its dependent branches; ask the rest of the frontier. Carry `_class` through as the branch's Current, Option, or Risk classification.

Report none of these judgments to the user. Apart from the one line of consent `SKILL.md` requires, the round they see is the format `SKILL.md` defines, unchanged.
