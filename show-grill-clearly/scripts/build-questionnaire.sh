#!/bin/sh
# Materialize and open one grill questionnaire on macOS.
# Usage: sh scripts/build-questionnaire.sh <payload.json> [out.html]
set -eu

DATA=${1-}
OUT=${2-}
[ -n "$DATA" ] || { echo 'usage: build-questionnaire.sh <payload.json> [out.html]' >&2; exit 1; }
[ -f "$DATA" ] || { echo "payload not found: $DATA" >&2; exit 1; }

DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
TEMPLATE="$DIR/../assets/questionnaire-template.html"

if [ -z "$OUT" ]; then
  OUT="${TMPDIR:-/tmp}/grill-questionnaire-$(date +%Y%m%d-%H%M%S)-$$.html"
fi

OUT_DIR=$(dirname -- "$OUT")
OUT_NAME=$(basename -- "$OUT")
OUT_DIR=$(CDPATH= cd -- "$OUT_DIR" && pwd) || { echo "output directory not found: $OUT_DIR" >&2; exit 1; }
OUT="$OUT_DIR/$OUT_NAME"
[ ! -e "$OUT" ] || { echo "output already exists: $OUT" >&2; exit 1; }

STAGING="$OUT.tmp.$$"
trap 'rm -f "$STAGING"' EXIT HUP INT TERM

if ! awk -v datafile="$DATA" '
  BEGIN { BS = sprintf("%c", 92) }
  function escape(text, parts, count, i, out) {
    count = split(text, parts, "<"); out = parts[1]
    for (i = 2; i <= count; i++) out = out BS "u003c" parts[i]
    return out
  }
  state == 0 && /<script id="questionnaire-data"/ {
    print
    while ((getline line < datafile) > 0) print escape(line)
    close(datafile); state = 1; next
  }
  state == 1 { if ($0 ~ /<\/script>/) { print; state = 2 }; next }
  { print }
  END { if (state != 2) exit 3 }
' "$TEMPLATE" > "$STAGING"; then
  echo 'build failed: questionnaire data marker is missing' >&2
  exit 1
fi

mv "$STAGING" "$OUT"
trap - EXIT HUP INT TERM
echo "ARTIFACT=$OUT"

# Acceptance means the OS accepted the request, not that a visible window was observed.
if open "$OUT"; then
  echo 'LAUNCH=accepted'
else
  echo 'LAUNCH=failed'
  echo 'browser launch failed; use the artifact path above' >&2
fi
