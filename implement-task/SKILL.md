---
name: implement-task
description: Work the frontier of to-tasks task files, one task per fresh sub-agent, each confined to the projects its task names. Use after to-tasks has published the tree.
disable-model-invocation: true
---

# Implement Task

Execute the tasks `to-tasks` published. The unit of work is one task in one fresh context: the task file is the whole brief, [`execute.md`](execute.md) is the whole procedure, and the boundary in the task file is the only thing the executor may write inside.

Given one task file, this skill runs `execute.md` itself. Given a ticket or a feature directory, it orchestrates: it works the **frontier**, dispatching each ready task to a fresh sub-agent, one at a time, and keeps only their reports in its own context.

## 1. Resolve the input

Accept one argument:

- **A task file** (`<issues dir>/<NN>-<ticket-slug>/<MM>-<task-slug>.md`) → single-task mode. Follow `execute.md` directly and stop when it reports.
- **A ticket file or its task directory** → orchestrate that ticket's tasks.
- **A feature directory** → orchestrate every ticket's tasks, in ticket dependency order.

Read the issue tracker convention (`docs/agents/issue-tracker.md` or whatever `/setup-matt-pocock-skills` configured) to locate task files and the `Status:` vocabulary. Tasks not published by `to-tasks` (no Boundary section) are out of scope; say so and name `$to-tasks`.

## 2. Work the frontier

The frontier is every task whose `Status:` is `ready-for-agent` and whose blockers (sibling tasks listed under Blocked by, plus the parent ticket's own blockers) are all `done`. Scan the task files, lowest ticket number then lowest task number first.

Record the current commit before the first dispatch; it is the base for the review in §3.

Loop:

1. Pick the first task on the frontier. An empty frontier ends the loop.
2. Dispatch a fresh sub-agent with a brief of exactly three lines: the task file path, the path to `execute.md`, and the instruction to follow `execute.md` for that task and report back in its format. The sub-agent reads everything else itself; the brief carries no implementation detail, no summary of the design, no prior reports.
3. Wait for the report. Tasks share one working tree and one branch, so the next dispatch starts only after the previous report arrives.
4. Read the report's status line:
   - `done` → record the commit hash and move on.
   - `needs-triage` → stop the loop. The task hit its boundary; the design or the split needs a human before anything else proceeds.
   - anything else → stop the loop and surface the report verbatim.
5. When the task just completed was the last task of its ticket and the report confirms the ticket's acceptance criteria passed, tick those criteria in the ticket file and set the ticket's `Status:` to `done`.

## 3. Review the whole run

When the loop ended because the frontier is exhausted, invoke `$code-review` with the commit recorded in §2 as the fixed point, so it covers every task's commit as one change set. Each task was validated alone inside its own boundary; this is the first time the pieces are read together, against the repository's standards and the spec.

Carry the review's findings into the report unchanged. Fixing them is a new piece of work: a finding inside one task's boundary becomes a follow-up task under that ticket, and a finding that crosses boundaries goes back to `design.md`. Both are the user's call.

A loop that stopped on `needs-triage` skips the review; the run is incomplete and the breach comes first.

## 4. Hand back and stop

Report:

- Each task attempted, its final status, and its commit hash.
- The `$code-review` findings, when §3 ran, and where each would be fixed.
- For a `needs-triage` stop: the task, the project it needed to write to, and the reason, copied from the task's Comments.
- Tickets completed in this run.
- What remains on the frontier, or that the tree is exhausted.

Then stop. Do not pick up a task that came back `needs-triage`, and do not widen a boundary to get past it; the fix belongs in `design.md` or in the split, and that is the user's call.
