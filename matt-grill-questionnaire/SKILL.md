---
name: matt-grill-questionnaire
description: Turn unresolved Matt grill decisions into an HTML questionnaire and open it in the browser.
disable-model-invocation: true
user-invocable: true
---

# Matt Grill Questionnaire

Question surface for a Matt grill. Take the decisions that are still open, write them as a JSON payload, and let the bundled script render and open the questionnaire.

**Do not re-investigate the codebase for this skill.** Everything you need is already in the grill conversation. No git status, no repo scan, no post-build audit — the build script validates the payload and fails loudly if it is wrong.

## Workflow

1. **Collect the open decisions.** Use only what the grill has already established. Decisions the user already made go in `recap` as one-line reminders, not as questions.

   `recap` is for what the user confirmed — never park an open decision there because the answer looks obvious to you. If it changes behavior, contract, data, or flow and the user has not ruled on it, it is a question. What you may leave out entirely is anything that changes none of those.

2. **Write the payload.** Save JSON to the scratchpad or temp directory. Traditional Chinese prose; keep identifiers, paths, commands, and API names as-is. Never let any string contain `</script`.

   ```json
   {
     "title": "問卷標題",
     "lede": "這次 grill 的背景與為什麼需要使用者決定",
     "storageKey": "matt-grill-questionnaire:<topic>-<YYYYMMDD-HHmmss>",
     "recap": ["已確認的前提，一行一則；沒有就給空陣列"],
     "questions": [
       {
         "id": "q1",
         "title": "一個具體、可判斷的決策問題？",
         "required": true,
         "context": "目前已知的行為與限制，以及這個選擇會改變什麼。",
         "scenario": "一個最小、具體、可想像的案例，說明不同選擇會走向什麼結果。",
         "recommendation": "B",
         "options": [
           { "key": "A", "title": "選項 A", "note": "影響、代價、適用條件。" },
           { "key": "B", "title": "選項 B", "note": "為什麼建議這個，它避開了什麼風險。" }
         ]
       }
     ]
   }
   ```

   Per question: a stable `id`, two to four mutually distinguishable options, and a `scenario` that makes the trade-off concrete — a question without a situation is not answerable. Set `required: false` for implementation preferences. Omit `recommendation` when the evidence does not support one. Order dependent questions after the decision that unlocks them.

   `recommendation` is display-only. **A blank question is never auto-resolved**, whatever `required` says — a recommendation only counts once the user clicks it or confirms it in chat. `required` controls how loudly the blank is reported, not whether you may decide it yourself.

3. **Build and open.** One command; it validates the payload, renders the page, and launches the browser.

   Use the **absolute path of this skill's own directory** — the grill runs from the user's project, not from here, so a relative `scripts/...` path will not resolve.

   - Windows: `pwsh -File "<skill-dir>\scripts\build-questionnaire.ps1" -Data "<payload.json>"`
   - macOS / Linux: `sh "<skill-dir>/scripts/build-questionnaire.sh" "<payload.json>"`

   It writes to the OS temp directory with a timestamped filename and prints the path. Pass an explicit output path (`-Out` on Windows, second argument on POSIX) only when the user asks for one.

   The script rejects a payload with no questions, a question missing `scenario` or `options`, duplicate ids, or a `</script` sequence. Fix the payload and re-run — do not hand-patch the generated HTML. If the launcher fails or the environment is headless, say so in one sentence and hand over the path instead of retrying other launchers.

4. **Hand off and stop.** Return the printed path as a clickable link, state that it was opened, and tell the user to answer, click `整理回復 prompt`, then paste the result back. Pause the grill until they reply. If they answer in chat instead, reconcile that with the questionnaire and continue from the resulting decisions.

   When the reply comes back: answers and notes are confirmed. Anything the prompt marks 待確認 stays open — ask about it (one round, batched) rather than assuming; a question answered only by a note means judge from that note, not from your recommendation. Resume the grill once nothing is left open or the user has explicitly accepted the remaining recommendations.

## Files

- `assets/questionnaire-template.html` — the renderer: styling, progress bar, draft persistence, reply-prompt generation, copy fallback. It is **generic and never edited**; the build script only swaps the `questionnaire-data` JSON block.
- `scripts/build-questionnaire.ps1`, `scripts/build-questionnaire.sh` — inject the payload, write to temp, open the browser.

Generated questionnaires live in the OS temp directory — never in the repository or the skill directory.
