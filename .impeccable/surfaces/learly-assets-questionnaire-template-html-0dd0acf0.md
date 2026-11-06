---
version: 1
slug: "learly-assets-questionnaire-template-html-0dd0acf0"
primary_target: "skills/engineering/show-grill-clearly/assets/questionnaire-template.html"
related_targets: ["skills/engineering/show-grill-clearly/scripts/build-questionnaire.ps1","skills/engineering/show-grill-clearly/scripts/build-questionnaire.sh"]
---

# show-grill-clearly questionnaire

Mode: Operate. One HTML questionnaire per grill round, built from `assets/questionnaire-template.html` by the builders. The template holds markup, CSS, renderer, interaction, and payload validation in one file.

Audience and job: a developer mid-grill, desktop browser beside the chat, often six or more decisions per round. Decide each, maybe add a note, copy the reply prompt back. Pain points the user named: the old page looked like a template, many questions were hard to find, options were hard to compare, and generating the prompt at the bottom was clumsy.

Constraints: payload fields, limits, validation messages, and the reply prompt text stay as they are; single offline file, nothing fetched; light/dark follow the system; zh-TW labels; every answer reachable by keyboard; the design is not part of DESIGN.md (open-course only).

## Direction contract

THESIS: One decision fills the screen at a time, while a black status strip above holds every question as a cell, so focus and overview live together. Refuses the long scroll of white survey cards with an accent colour.

OWN-WORLD: Ink-black strip (#0d100f) of outlined square-cornered cells; emerald (#0b7a55) means decided, amber (#f0a30a) means a required question still blank; cool grey-green ground (#e9ece8) with white work surfaces and 1.5px rules; no rounded cards, no shadows except keycaps. Huge tabular numeral in emerald; options are keycaps (2px ink border, 3px ink bottom edge) labelled 1–4. CJK in system faces; numerals and keycaps in Fira Sans Bold (Latin subset, OFL, inlined as base64 WOFF2) because a system face may not carry the display numeral and the mono stack depends on what is installed; payload ids and option keys stay in a mono stack.

STORY: The developer lands on the overview, reads what is confirmed and how blanks are treated, presses Enter, then answers with number keys and Enter; cells turn emerald as they go; N jumps to the next blank; C copies the live reply prompt from any question.

FIRST VIEWPORT: Strip across the top: title at left, then one cell per question (overview cell first). Below, three columns: the giant question number (~160px) at left; title (~40px), required tag, source question (~19px), and the option keycap rows in the middle; context, scenario, and the note field in a ruled right column. Sticky footer: shortcut hints at left, status, then previous, next (primary, black), and copy.

FORM: user-pinned after two re-rolls (no metaphor, a precise tool with a bold identity): grounded direction "focus" from round 3, not from the rolled list; seed: seed:053a7cbb2a2e34b1

Signature interaction: pressing a number key presses its keycap down and fills the matching strip cell emerald in the same beat.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Built state (finish review: ship)

- Tokens, light / dark (dark follows `prefers-color-scheme`): strip #0d100f / #050706, strip rule #3a403e / #303634, strip ink #ffffff both, strip soft #b4bbb8 / #a3aba7; ground #e9ece8 / #111413; work surface #ffffff / #191d1c; ink #0d100f / #e9ece9; mid #464c49 / #b3bab6; soft #5f6663 / #959d99; rule #d2d7d3 / #2e3532. Emerald #0b7a55 / #3cbf8a with deep #064a33 / #1d7a55 (keycap edge when chosen), wash #e1f2ea / #13281f (chosen option row), on-emerald #ffffff / #04140d. Amber #f0a30a / #f2b33d with amber ink #0d100f / #111413 (text on amber) and amber text #8a5a00 / #f2b33d (amber used as text on the ground). Warn #a3321f / #f08a74 for the no-persist notice and payload errors. Selection, caret, and every focus ring are emerald.
- Type: CJK body in system faces (Microsoft JhengHei, PingFang TC, Noto Sans TC, ...) at 16px/1.75. Numerals, keycaps, cell numbers, counter, and `kbd` use the "Grill Num" face, Fira Sans Bold 700 Latin subset inlined as base64 WOFF2 with `font-display: block`; its OFL text ships as `assets/fira-sans-OFL.txt` and the `@font-face` comment points to it. Payload ids and option keys in the mono stack (Cascadia Mono, SFMono-Regular, Consolas, ...). Ramp: question numeral 700 160px/.8, -0.04em, tabular, emerald; overview h1 44px; question title 700 40px/1.25, balanced; source question 19px/1.75, 52ch; option title 700 20px; side column 15px; labels and hints 13–14px; reply prompt textarea mono 13.5px.
- Form: square corners everywhere (textarea sets `border-radius: 0`), 1.5px rules for every border except the keycap's 2px ink border. The only drop shadow is the keycap's 3px ink bottom edge; the current strip cell carries a 4px inset underline and focused textareas a 2px emerald ring, which are state marks, not elevation. Motion: one ease `cubic-bezier(.16, 1, .3, 1)`; views slide 18px in the travel direction over .26s; all of it switches off under `prefers-reduced-motion`.
- Strip (sticky top): title (15px, truncates), a row of square cells (40px tall, 56–132px wide, overview cell 總覽 first), then the answered counter "n / total". Cell states: blank optional = outlined; required blank = amber outline with 必; note only = dashed outline with 註; decided = filled emerald showing the chosen option key; current = ink border plus inset underline.
- Question view: three columns (180px numeral, main up to 780px, 340px side column ruled on the left with a 1.5px line). Main: title, tags (必答 amber block or 選答 outlined, explanation, uppercase mono id), source question, option rows. Option row: white surface, 1.5px rule, 44px keycap labelled 1–4, title with an outlined 建議 tag on the recommended option, note, mono key at right; hover darkens the rule to ink; chosen = emerald border, emerald wash, keycap filled emerald with deep-emerald edge. The underlined "取消選擇" link appears only after a choice. Side column: 背景 list, 實際情境, then the note textarea.
- Signature interaction as built: a number key adds `.pressed` to the option for 120ms, so the keycap drops 3px and loses its edge, while the matching strip cell turns emerald in the same refresh.
- Overview: two columns (72px gap). Left: h1, one-line lede, ruled rules list with keyboard instructions, warn-bordered no-persist notice, 目前已確認 recap. Right: 需要你的決定 index (ink top rule, rows of Fira numeral, title, state in emerald / amber text / soft), then the live read-only reply prompt and 清空答案.
- Dock (sticky bottom, white, top rule): kbd hints at left, status (emerald; amber text and bold when required questions are missing), then 上一題 / 回總覽, the primary button (ink fill, emerald on hover, arrow icon; reads 開始作答, 下一題, or 回總覽), and 複製回復 prompt. Buttons are 1.5px ink outlines, ground fill on hover, 40% opacity when disabled.
- Keyboard: 1–n selects option n and 0 clears (question views only); Enter goes to the next question (from the last question, back to the overview) unless focus is on a button; ArrowRight / ArrowLeft go next / previous unless focus is on a radio; N jumps to the next question with neither a choice nor a note, wrapping, or returns to the overview when none is left; C copies the reply prompt from anywhere. Keys pass through with Ctrl/Meta/Alt or during IME composition; inside a textarea only Escape acts, blurring it and focusing the view heading.
- Breakpoints: at 1179px and below the question view becomes two columns (main + 280px side), the numeral drops to 72px above the title, and the 1–n / 0 hints hide. At 860px and below the strip title hides and cells shrink to 34px showing only numbers (the overview cell keeps 總覽); the question stacks with the side column ruled on top; title 28px, source 17px, keycaps 40px, option keys hidden; the overview stacks; the dock wraps with status on its own row, buttons share the full width, hints hide, and copy reads 複製. Hints also hide on `hover: none` devices.
- Detector ignores are file-scoped in `.impeccable/config.json` to `assets/questionnaire-template.html` for `design-system-font`, `design-system-color`, and `design-system-font-size`, because PRODUCT.md keeps DESIGN.md for open-course only.

## Unresolved

- DESIGN.md stays open-course's; like clean-comments, the documenter records this design in this brief instead.
