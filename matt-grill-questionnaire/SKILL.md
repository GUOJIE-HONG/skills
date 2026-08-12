---
name: matt-grill-questionnaire
description: Turn unresolved Matt grill decisions into a temporary browser questionnaire that preserves the original questions and produces a copyable reply prompt.
disable-model-invocation: true
---

# Matt Grill Questionnaire

Turn an established Matt grill decision set into a compact browser handoff. The aid collects decisions; it does not discover facts or decide for the user.

## 1. Confirm the handoff

Use the established grill handoff as the evidence boundary. Proceed only when at least one unresolved user-owned decision can change behavior, contracts, data, or workflow, and the handoff already supports honest choices and consequences. If evidence is missing, return one consolidated list of gaps to the owning grill and stop.

Accept direct chat answers at any time. Reconcile them against the same decision set instead of forcing a browser aid.

## 2. Shape the decision set

Keep confirmed facts in `recap`; keep every unresolved material matter in `questions`. Never reopen a confirmed decision or hide an open one in context. Give dependent questions a coherent order and split questions that contain separate decisions.

For each question:

- Preserve the grill's complete original question body verbatim. Carry it forward as immutable input instead of retyping it from memory.
- Provide one concrete `scenario`, up to three decision-relevant `context`
  facts, and two to four distinguishable options after the original question.
  They explain the decision; they never replace or redefine it.
- State a concrete effect or cost in every option `note`.
- Include `recommendation` only when established evidence supports it. It is advisory and never preselected.
- Treat a blank answer as unresolved regardless of urgency or recommendation.

Use Traditional Chinese for user-facing prose while preserving exact technical text. Keep supporting text compact enough to scan without weakening the original questions or consequences.

## 3. Deliver the questionnaire

Use `assets/questionnaire-template.html` as the stable renderer and interaction contract. Its embedded validation is the single source of truth for payload fields, identifiers, limits, and structural completeness. Supply the decision data it requires without duplicating those mechanical rules in this file.

Delegate materialization and browser launch to the matching bundled `Builder` in `scripts/`. The `Builder` writes one self-contained HTML questionnaire to a unique path in the operating system's temporary directory, outside repositories, installed skills, and shared state.

Treat the `Builder`'s `ARTIFACT` path as the delivery guarantee and its `LAUNCH` result as the final browser observation for that artifact. A failed launch degrades to the clickable artifact path instead of failing the questionnaire handoff.

## 4. Hand back and pause

Return the clickable artifact path and the `Builder`'s launch result. Ask the user to answer, select **整理回復 prompt**, and paste the result into the originating conversation. Pause the owning grill.

On return:

- Honor explicit choices and qualifications.
- Keep a note-only response distinct. Interpret its note; if it states no
  unambiguous decision, keep that question open. Never substitute displayed guidance.
- Keep every completely blank question open, regardless of `required`, recommendation, or confidence.
- Confirm all remaining open questions together. Resume the original workflow only when none remain, or when the user explicitly accepts the remaining displayed recommendations.
