#!/bin/sh
# Build a Matt grill questionnaire from a JSON payload and open it in the browser.
# Usage: sh scripts/build-questionnaire.sh <payload.json> [out.html]
set -e

DATA="$1"
OUT="$2"
[ -n "$DATA" ] || { echo "usage: build-questionnaire.sh <payload.json> [out.html]" >&2; exit 1; }

DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
TEMPLATE="$DIR/../assets/questionnaire-template.html"

if grep -q '</script' "$DATA"; then
  echo 'payload contains "</script"; rewrite the text to avoid it' >&2
  exit 1
fi

# Same checks as build-questionnaire.ps1; keep the two in sync when either changes.
if command -v python3 >/dev/null 2>&1; then
  python3 - "$DATA" <<'PY'
import json, sys
d = json.load(open(sys.argv[1], encoding='utf-8'))
qs = d.get('questions') or []
if not qs: sys.exit('payload has no questions')
seen = set()
for q in qs:
    qid = q.get('id')
    if not qid: sys.exit('every question needs an id')
    if qid in seen: sys.exit('duplicate question id: %s' % qid)
    seen.add(qid)
    # A decision without a concrete situation is not answerable.
    if not q.get('scenario'):
        sys.exit('%s has no scenario; give a concrete situation showing what each choice leads to' % qid)
    opts = q.get('options') or []
    if len(opts) < 2: sys.exit('%s needs at least two distinguishable options' % qid)
    for o in opts:
        if not o.get('key') or not o.get('title'):
            sys.exit('%s has an option missing key or title' % qid)
    rec = q.get('recommendation')
    if rec and not any(o.get('key') == rec for o in opts):
        sys.exit("%s recommends '%s' but no option has that key" % (qid, rec))
PY
else
  echo 'python3 not found; payload validation skipped' >&2
fi

if [ -z "$OUT" ]; then
  OUT="${TMPDIR:-/tmp}/grill-questionnaire-$(date +%Y%m%d-%H%M%S).html"
fi

awk -v datafile="$DATA" '
  state == 0 && /<script id="questionnaire-data"/ {
    print
    while ((getline line < datafile) > 0) print line
    state = 1
    next
  }
  state == 1 { if ($0 ~ /<\/script>/) { print; state = 2 } ; next }
  { print }
' "$TEMPLATE" > "$OUT"

if command -v open >/dev/null 2>&1; then open "$OUT"
elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$OUT"
else echo "no launcher found; open manually: $OUT" >&2
fi

echo "$OUT"
