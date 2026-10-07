---
name: refactor
description: Restructure code under a plan, test-first when behavior changes, against a green baseline when it must stay the same.
disable-model-invocation: true
---
# Refactor

1. **Classify** the request against the current code. Read the code in scope and its callers, then decide:

   - **Behavior-preserving**: every observable result stays the same (return values, errors, side effects, public interfaces, stored data). Only the structure changes. Follow [`references/preserve.md`](references/preserve.md).
   - **Behavior-changing**: any observable result differs. Follow [`references/change.md`](references/change.md). It is **breaking** when an existing caller, stored data, or public contract stops working as it did.

   When the request mixes both, split it into two passes: the behavior-preserving pass first, then the behavior change on top of it. When the code cannot settle the classification, ask the user. Tell the user the classification and the evidence for it before planning.
2. **Plan.** Write `.refactor/<refactor-slug>/plan.md`:

   - Goal: the observable result. For a behavior-preserving pass, "behavior unchanged" plus the target structure.
   - Scope: what changes, and what stays untouched.
   - Test coverage: the tests that exercise this area today, and the gaps.
   - Steps: the smallest steps you can make, each leaving the code working.

   For a breaking change, also list every affected caller and contract, and wait for the user's approval of the plan before editing.
3. **Execute** the plan along the path file. When the code contradicts the plan, stop and update the plan with the user before continuing.
4. **Review.** Run `$code-review` with the plan as the spec, pointing it at the review focus in the path file. Fix what it finds.
5. **Report**: the classification, the steps done, the exact test commands and their results, the review findings and how each was resolved, and every deviation from the plan.
