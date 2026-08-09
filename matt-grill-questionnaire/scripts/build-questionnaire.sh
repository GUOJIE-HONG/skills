#!/bin/sh
# Build, validate, and open one Matt grill questionnaire on macOS.
# Usage: sh scripts/build-questionnaire.sh <payload.json> [out.html]
set -eu

DATA=${1-}
OUT=${2-}
[ -n "$DATA" ] || { echo "usage: build-questionnaire.sh <payload.json> [out.html]" >&2; exit 1; }
[ -f "$DATA" ] || { echo "payload not found: $DATA" >&2; exit 1; }
command -v osascript >/dev/null 2>&1 || {
  echo 'validation failed: osascript is required on macOS; no artifact was created' >&2
  exit 2
}

# Validate before writing or launching. JXA is built into the supported platform.
if ! osascript -l JavaScript - "$DATA" <<'JXA'
function run(argv) {
  var app = Application.currentApplication();
  app.includeStandardAdditions = true;
  var problems = [];
  var data;
  try { data = JSON.parse(app.read(Path(argv[0]))); }
  catch (error) { throw new Error('VALIDATION_FAILED\n- payload 無法讀取或不是合法 JSON：' + error.message); }

  function own(object, key) { return Object.prototype.hasOwnProperty.call(object, key); }
  function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
  function fields(value, allowed, path) {
    Object.keys(value).forEach(function (key) {
      if (allowed.indexOf(key) < 0) problems.push(path + ' 有未知欄位 ' + key + '。');
    });
  }
  function text(value, key, path, limit) {
    if (!own(value, key) || typeof value[key] !== 'string' || !value[key].trim()) {
      problems.push(path + '.' + key + ' 必須是非空白字串。'); return false;
    }
    if (limit && value[key].length > limit) {
      problems.push(path + '.' + key + ' 超過 ' + limit + ' 字（目前 ' + value[key].length + ' 字）。');
    }
    return true;
  }

  if (!object(data)) {
    problems.push('payload 根節點必須是物件。');
  } else {
    fields(data, ['title', 'lede', 'recap', 'questions'], 'payload');
    text(data, 'title', 'payload', 0);
    if (text(data, 'lede', 'payload', 40)) {
      var marks = data.lede.match(/[。！？!?]/g) || [];
      if (marks.length > 1 || (marks.length === 1 && !/[。！？!?]\s*$/.test(data.lede))) {
        problems.push('payload.lede 必須只有一句。');
      }
    }
    if (!Array.isArray(data.recap)) {
      problems.push('payload.recap 必須是字串陣列。');
    } else {
      if (data.recap.length > 6) problems.push('payload.recap 最多 6 則（目前 ' + data.recap.length + ' 則）。');
      data.recap.forEach(function (item, i) {
        if (typeof item !== 'string' || !item.trim()) problems.push('payload.recap[' + i + '] 必須是非空白字串。');
        else if (item.length > 30) problems.push('payload.recap[' + i + '] 超過 30 字（目前 ' + item.length + ' 字）。');
      });
    }
    if (!Array.isArray(data.questions) || !data.questions.length) {
      problems.push('payload.questions 必須是至少含一題的陣列。');
    } else {
      var ids = Object.create(null);
      var total = (typeof data.title === 'string' ? data.title.length : 0)
        + (typeof data.lede === 'string' ? data.lede.length : 0);
      if (Array.isArray(data.recap)) data.recap.forEach(function (x) { if (typeof x === 'string') total += x.length; });
      data.questions.forEach(function (q, i) {
        var path = 'questions[' + i + ']';
        if (!object(q)) { problems.push(path + ' 必須是物件。'); return; }
        fields(q, ['id', 'title', 'sourceQuestion', 'required', 'context', 'scenario', 'recommendation', 'options'], path);
        if (text(q, 'id', path, 64)) {
          total += q.id.length;
          if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(q.id)) problems.push(path + '.id 格式不合法。');
          var foldedId = q.id.toLowerCase();
          if (ids[foldedId]) problems.push(path + '.id 與另一題重複（不分大小寫）。');
          ids[foldedId] = true;
        }
        if (text(q, 'title', path, 30)) total += q.title.length;
        text(q, 'sourceQuestion', path, 0);
        if (!own(q, 'required') || typeof q.required !== 'boolean') problems.push(path + '.required 必須是 boolean。');
        if (text(q, 'scenario', path, 80)) total += q.scenario.length;
        if (!Array.isArray(q.context) || q.context.length < 1 || q.context.length > 3) {
          problems.push(path + '.context 必須是含 1–3 則事實的字串陣列。');
        }
        if (Array.isArray(q.context)) q.context.forEach(function (fact, j) {
          if (typeof fact !== 'string' || !fact.trim()) problems.push(path + '.context[' + j + '] 必須是非空白字串。');
          else { total += fact.length; if (fact.length > 40) problems.push(path + '.context[' + j + '] 超過 40 字（目前 ' + fact.length + ' 字）。'); }
        });

        var options = Array.isArray(q.options) ? q.options : [];
        if (options.length < 2 || options.length > 4) problems.push(path + '.options 必須有 2–4 個選項（目前 ' + options.length + ' 個）。');
        var keys = Object.create(null);
        options.forEach(function (option, j) {
          var optionPath = path + '.options[' + j + ']';
          if (!object(option)) { problems.push(optionPath + ' 必須是物件。'); return; }
          fields(option, ['key', 'title', 'note'], optionPath);
          if (text(option, 'key', optionPath, 64)) {
            total += option.key.length;
            if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(option.key)) problems.push(optionPath + '.key 格式不合法。');
            var foldedKey = option.key.toLowerCase();
            if (keys[foldedKey]) problems.push(optionPath + '.key 在本題重複（不分大小寫）。');
            keys[foldedKey] = true;
          }
          if (text(option, 'title', optionPath, 20)) total += option.title.length;
          if (text(option, 'note', optionPath, 40)) total += option.note.length;
        });
        if (own(q, 'recommendation')) {
          if (typeof q.recommendation !== 'string' || !q.recommendation.trim()) {
            problems.push(path + '.recommendation 若提供，必須是非空白字串。');
          } else if (!keys[q.recommendation.toLowerCase()]) {
            problems.push(path + '.recommendation 必須對應本題的一個 option key。');
          }
        }
      });
      if (data.questions.length === 5 && total > 2000) {
        problems.push('五題問卷的動態文字超過 2,000 字（目前 ' + total + ' 字）；請拆分或縮短。');
      }
    }
  }
  if (problems.length) throw new Error('VALIDATION_FAILED\n' + problems.map(function (x) { return '- ' + x; }).join('\n'));
  return 'VALIDATION_OK';
}
JXA
then
  echo 'validation failed; no artifact was created or launched' >&2
  exit 2
fi

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
    while ((getline line < datafile) > 0) { print escape(line); lines++ }
    close(datafile); state = 1; next
  }
  state == 1 { if ($0 ~ /<\/script>/) { print; state = 2 }; next }
  { print }
  END { if (state != 2 || lines == 0) exit 3 }
' "$TEMPLATE" > "$STAGING"; then
  echo 'build failed: template marker missing, or payload empty/unreadable' >&2
  exit 1
fi
mv "$STAGING" "$OUT"
trap - EXIT HUP INT TERM
echo "ARTIFACT=$OUT"

# Exactly one request for the artifact. Acceptance does not prove a visible tab.
if open "$OUT"; then
  echo 'LAUNCH=accepted'
else
  echo 'LAUNCH=failed'
  echo 'browser launch request failed; use the artifact path above' >&2
fi
