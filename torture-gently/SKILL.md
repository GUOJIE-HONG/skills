---
name: torture-gently
description: Grill the user about a plan, decision, or idea along grounded, decision-relevant branches. Use when the user wants to stress-test their thinking without speculative or out-of-scope questioning.
---

Interview the user until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Set the **evidence horizon** before building the tree. It contains the current conversation, sources the user provides or names, existing work artefacts, and first-party or official sources for the products, systems, processes, policies, or plans in scope. Expand it to industry research, competitors, communities, or expert sources only when the user asks for broader research. When evidence needs to be shown, identify it with the most precise locator available: a `path:line`, URL, document section, ticket, or concise reference to a user statement.

Classify each candidate branch internally as **Current** (an existing requirement, behaviour, or constraint), **Option** (credibly supported but not adopted), or **Risk** (a credible path that may require treatment). Match authority to the claim: official contracts establish external facts, current artefacts or runtime establish current state, and the user decides the desired direction. Evidence that a capability exists may open an Option branch; it does not make that capability a requirement. When relevant authorities conflict, put the unresolved decision to the user.

Before a question joins the frontier, it must clear the **question gate**:

1. **Evidence** — a credible, traceable source supports the branch.
2. **Plausibility** — there is a credible path for it to occur or be adopted.
3. **Materiality** — the answer would change a decision, risk treatment, acceptance condition, or deliverable.
4. **Responsibility** — it belongs to the responsibility of the product, system, process, policy, plan, or other subject being discussed.

Human behaviour qualifies only when the evidence makes it a material responsibility of that subject. A merely imaginable event, or a question whose answer changes nothing, does not enter the tree. Within the evidence horizon, visit every branch that clears the gate.

Before asking, identify the **decision target**, evidence role and source, effect, and boundary internally. Treat the user's answer as settling only that target. Express the target and any necessary effect naturally in the question; do not expose these checks as a fixed output form. Show an evidence locator only when it aids understanding or verification.

Format a round like so:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier, run the question gate over it again, and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Before the next round, give a compact **checkpoint** containing only what changed: decisions settled in the last answer, earlier decisions reopened or replaced, unresolved facts that block branches, branches the user parked, and the next frontier. Do not repeat unchanged decisions.

When an answer contradicts or replaces an upstream decision, invalidate every downstream conclusion whose premise no longer holds. Name the material consequences, return those branches to the tree, and re-run the question gate before treating them as settled again. A deferred branch is **parked**, not visited; it leaves the session open unless the user removes it from the evidence horizon or explicitly accepts proceeding with it unresolved.

If the user pauses or asks to continue elsewhere, return a resumable checkpoint with the evidence horizon, settled decisions, reopened decisions, unresolved facts, parked branches, and next frontier. On resume, rebuild the tree from that checkpoint, account for any changed evidence, and continue without re-asking a decision unless its premise was invalidated.

Finding _facts_ is your job, never the user's. Use the available environment, tools, and authoritative sources; delegate only when the fact-finding is independently bounded and delegation is useful. Ask the user only for inaccessible private information, preferences, and decisions. An unresolved fact is an unsettled prerequisite, so ask the rest of the frontier while only its downstream questions wait.

The session is done when the frontier is empty and no parked branch remains within the evidence horizon without an explicit decision to leave it unresolved. Every other branch that cleared the question gate has been visited. Do not act on the outcome until the user confirms you have reached a shared understanding.
