---
name: show-grill-clearly
description: Turn the unresolved decisions of a grilling session into a temporary browser questionnaire, so questions that are hard to follow in chat become clear, while preserving the original questions and producing a copyable reply prompt.
disable-model-invocation: true
---

# Show Grill Clearly

Turn an established grill decision set into a browser handoff. The aid collects decisions; it does not discover facts or decide for the user.

## 1. Confirm the handoff

Use the established grill handoff as the evidence boundary. Proceed only when at least one unresolved user-owned decision can change behavior, contracts, data, or workflow, and the handoff already supports honest choices and consequences. If evidence is missing, return one consolidated list of gaps to the owning grill and stop.

Accept direct chat answers at any time; reconcile them against the same decision set instead of forcing a browser aid.

## 2. Shape the decision set

Keep confirmed facts in `recap` and every unresolved material matter in `questions`. Never reopen a confirmed decision or hide an open one in context. Order dependent questions coherently and split questions that carry separate decisions.

For each question:

- Rewrite the grill's question as a `sourceQuestion` the reader can decide from without the transcript. Keep everything that can change the answer — the stake, the binding constraint, the worst case — and drop narration, restatement, and background the other fields already carry. When decision-bearing content still does not fit, the question is carrying more than one decision: split it rather than compress it away.
- Add one concrete `scenario`, up to three decision-relevant `context` facts, and two to four distinguishable options. They explain the decision; they never replace or redefine it.
- State a concrete effect or cost in every option `note`.
- Include `recommendation` only when established evidence supports it. It is advisory and never preselected.

Use Traditional Chinese for user-facing prose while preserving exact technical text. Keep supporting text scannable without weakening the original questions or consequences.

## 3. Build and open

`assets/questionnaire-template.html` is the renderer and interaction contract. Its embedded validation is the single source of truth for payload fields, identifiers, limits, and structural completeness; do not restate those mechanical rules here.

Write the decision data as a JSON payload file in the operating system's temporary directory, using a file-writing tool, then run the builder that matches the current operating system. Paths are relative to this skill directory.

The builder accepts a file path only. Never inline the payload into a shell command through a heredoc, `echo`, or `-c`: a shell command over roughly 8 KB is truncated in transit and dies with a shell syntax error, while the same command run outside the tool succeeds. Never hand-edit the template, and never copy an earlier questionnaire as a template, in place of a builder.

Windows:

```powershell
powershell.exe -NoProfile -File scripts/build-questionnaire.ps1 -Data <payload.json>
```

macOS:

```sh
sh scripts/build-questionnaire.sh <payload.json>
```

Each builder writes one self-contained HTML questionnaire to a unique temporary path, outside repositories, installed skills, and shared state, then opens it in the default browser. Treat the printed `ARTIFACT=<path>` as the delivery guarantee and `LAUNCH=accepted|failed` as the final browser observation for that artifact. A failed launch degrades to the clickable artifact path instead of failing the handoff.

## 4. Hand back and pause

Return the clickable artifact path and the builder's launch result. Ask the user to answer, select **整理回復 prompt**, and paste the result into the originating conversation. Pause the owning grill.

On return:

- Honor explicit choices and qualifications.
- Interpret a note-only response on its own terms; if it states no unambiguous decision, keep that question open. Never substitute displayed guidance.
- Keep every blank question open, regardless of `required`, recommendation, or urgency.
- Confirm all remaining open questions together. Resume the original workflow only when none remain, or when the user explicitly accepts the remaining displayed recommendations.
