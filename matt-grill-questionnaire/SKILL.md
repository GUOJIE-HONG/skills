---
name: matt-grill-questionnaire
description: Create and automatically open a temporary browser questionnaire that preserves each unresolved Matt grill question verbatim, then adds context and a concrete scenario to help the user understand the professional decision. Use for an explicit request or Matt grill handoff when honest choices and consequences are already established; do not use for general forms, research or diagnosis, implementation, already-answered decisions, or when no material decision remains.
disable-model-invocation: true
---

# Matt Grill Questionnaire

Turn an established Matt grill decision set into a compact browser handoff. The aid collects decisions; it does not discover facts or decide for the user.

## 1. Check the handoff boundary

Proceed only when at least one unresolved user-owned decision can change behavior, contracts, data, or workflow, and the grill already contains enough evidence to state honest choices and consequences. If evidence is missing, return one consolidated list of gaps to the owning grill and stop. Do not inspect the repository or external sources for this skill.

Accept direct chat answers at any time. Reconcile them against the same decision set instead of forcing a browser aid.

## 2. Build the decision set

Keep confirmed facts in `recap`; keep every unresolved material matter in `questions`. Never reopen a confirmed decision or hide an open one in context. Give dependent questions a coherent order and split questions that contain separate decisions.

Write a UTF-8 JSON payload in the OS temp directory. Its root fields are `title`,
`lede`, `recap`, and `questions`. A question contains `id`, `title`,
`sourceQuestion`, `required`, `context`, `scenario`, `options`, and optionally `recommendation`; an option
contains `key`, `title`, and `note`. The builders reject missing, mistyped,
unknown, over-budget, or structurally incomplete fields before creating or
launching an artifact.

For each question:

- Use a stable unique `id` matching `[A-Za-z][A-Za-z0-9_-]{0,63}` and unique
  option keys matching the same pattern. Treat identities case-insensitively.
- Use the grill's complete original question body directly as the
  `sourceQuestion` value while constructing the payload. Treat that string as
  immutable input data instead of retyping it from memory. This is a
  single-copy operation even when the grill contains many long questions.
- Provide one concrete `scenario`, up to three decision-relevant `context`
  facts, and two to four distinguishable options after the original question.
  They explain the decision; they never replace or redefine it.
- State a concrete effect or cost in every option `note`.
- Set `required: false` only to mark lower urgency. A blank answer remains unresolved either way.
- Include `recommendation` only when established evidence supports it. It is advisory and never preselected.

Use Traditional Chinese for user-facing prose while preserving exact technical text. Rendered text has these hard budgets:

| Field | Limit |
| --- | --- |
| `lede` | one sentence, 40 characters |
| each `recap` item | 30 characters; at most 6 items |
| question `title` | 30 characters |
| `sourceQuestion` | unlimited; verbatim original question |
| each `context` item | 40 characters; at most 3 items |
| `scenario` | 80 characters |
| option `title` | 20 characters |
| option `note` | 40 characters |

Keep the supporting text for a five-question aid near 2,000 total characters;
exclude verbatim `sourceQuestion` text from that budget. Build immediately
after the payload is structurally complete; do not add a second manual
comparison or rereading pass. The builder preserves the supplied string
without transformation and validates that every question has one. Every
payload string is inert text; use separate `context` items instead of
formatting markup.

## 3. Build and open once

Run the matching script once, using this skill directory's absolute path:

- Windows: `powershell.exe -File "<skill-dir>\scripts\build-questionnaire.ps1" -Data "<payload.json>"`
- macOS: `sh "<skill-dir>/scripts/build-questionnaire.sh" "<payload.json>"`

Respect an environment-provided browser launcher or launch observer as the
authoritative delivery path. On Windows, when the environment intercepts
`Start-Process`, invoke the script in that same PowerShell session with the
call operator (`& "<skill-dir>\scripts\build-questionnaire.ps1" ...`); a nested
`powershell.exe -File` process would bypass the interceptor. Send the exact
artifact to the harness once, record its observed result, and use no native or
alternate launcher afterward. Without a harness, use the commands above so the
builder performs its native automatic launch.

The script writes a unique artifact in the OS temp directory, prints `ARTIFACT=<absolute-path>`, then makes exactly one automatic browser-launch attempt. `LAUNCH=accepted` means the OS launcher accepted that request; it does not prove a visible tab. `LAUNCH=failed` is an honest degraded delivery: give the user the artifact link and do not retry or switch launchers. Use an explicit output path only when the user requested one.

The builder validates the complete payload before creating an artifact and reports all structural problems together. The page repeats the check before rendering as a defense against later tampering. Fix the payload and run one new build only after a validation failure; never hand-edit generated HTML.

## 4. Hand back and pause

Return the clickable artifact path and the exact launch state. Ask the user to answer, select **整理回復 prompt**, and paste the result into the originating conversation. Pause the owning grill.

On return:

- Honor explicit choices and qualifications.
- Keep a note-only response distinct. Interpret its note; if it states no
  unambiguous decision, keep that question open. Never substitute displayed guidance.
- Keep every completely blank question open, regardless of `required`, recommendation, or confidence.
- Confirm all remaining open questions together. Resume the original workflow only when none remain, or when the user explicitly accepts the remaining displayed recommendations.

Generated questionnaires and payloads belong in the OS temp directory, outside repositories, installed skills, and shared state.
