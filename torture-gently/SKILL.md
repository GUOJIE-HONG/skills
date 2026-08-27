---
name: torture-gently
description: Grill the user about a plan, decision, or idea — but only along branches the repo shows evidence for. Use when the user wants to stress-test their thinking without the questioning sprawling past the original requirement.
---

Interview the user until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Before a question joins a round it must clear the **evidence gate**. Search the repo and find the concrete artefact showing this branch can actually occur: code, config, schemas, migrations, tests, docs, or design assets committed to the repo. Name that artefact as `path` or `path:line` in the question itself. Something the repo does not already reach for is out of scope no matter how plausible it sounds — a third party offering a capability is not evidence that this project uses it, and "integrations like this usually need X" is not evidence at all. A branch with no repo artefact behind it does not exist: drop it silently. No parking lot, no list of what you skipped, no mention in a later round, no caveat in your summary. Reason only from the branches that survived the gate.

Format a round like so:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

📎 <the repo artefact this question rests on: `path` or `path:line`, and what it shows>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

📎 <the repo artefact this question rests on: `path` or `path:line`, and what it shows>

➡️ <your recommended answer>
```

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier, run the evidence gate over it again, and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent to find it; don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.

The session is done when the frontier is empty: every evidenced branch of the design tree visited. Do not act on it until the user confirms you have reached a shared understanding.
