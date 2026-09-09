---
name: implement-task
description: Execute to-tasks tickets by dependency order, one fresh sub-agent per ticket in its own worktree, independent tickets in parallel, each ticket merged back and accepted before its dependents start.
disable-model-invocation: true
---

# Implement Task

Execute the tasks `to-tasks` published. The unit of dispatch is one **ticket** in one fresh context: its worker reads the ticket, `design.md`, and every task once, then works the tasks in number order as its checklist, one validation and one commit per task. [`execute.md`](execute.md) is the whole procedure. The **ticket footprint**, the union of the projects its tasks name, is the only place the worker may write.

Given one task file, this skill runs `execute.md` itself for that task. Given a ticket or a feature directory, it orchestrates the **frontier**: independent ready tickets run concurrently in separate Git worktrees, each in a fresh sub-agent. The orchestrator owns merging, ticket acceptance, and the closing review.

## 1. Resolve the input

Accept one argument:

- **A task file** (`<issues dir>/<NN>-<ticket-slug>/<MM>-<task-slug>.md`) → single-task mode. Follow `execute.md` in direct mode for that task and stop when it reports.
- **A ticket file or its task directory** → orchestrate that ticket.
- **A feature directory** → orchestrate every ticket, in ticket dependency order.

Read the issue tracker convention (`docs/agents/issue-tracker.md` or whatever `/setup-matt-pocock-skills` configured) to locate tickets, task files, and the `Status:` vocabulary. Tickets whose tasks were not published by `to-tasks` (no Boundary section) are out of scope; say so and name `$to-tasks`.

## 2. Work the frontier

The frontier contains tickets not currently dispatched, whose blocking tickets are all `done` on the integration branch, and that still hold at least one task not `done`. A worker's report alone never clears a blocker: its branch must be merged and the ticket accepted first.

Before dispatch, resolve the ticket dependency graph, including blockers outside the requested scope. Stop and identify missing references or cycles; external unfinished blockers remain blocked and do not expand the scope. Confirm pre-existing `done` tickets are present on the integration branch with passing acceptance evidence; rerun the relevant checks when resuming an interrupted run with missing evidence. Keep a ticket with `claimed` tasks out of dispatch until its owner and outcome are known, unless it is a checkpoint this run is resuming (step 5).

Use the current branch as the integration branch and record its commit as the review base for §3. Inspect the worktree and preserve unrelated changes. Worker inputs (tickets, task files, design, and required code) must be available from the chosen base; surface uncommitted prerequisites rather than silently omitting or committing user changes.

The run ends only when the frontier is empty and no worker remains. Do not ask the user whether to continue; the frontier decides. Everything in scope is already authorized by the invocation.

Loop:

1. Fill available sub-agent slots from the frontier, lowest ticket number first. This is launch priority, not a requirement to wait for earlier tickets. Track assignments so a ticket has at most one worker at a time.
2. For each ticket, create a separate worktree and branch from the latest accepted integration commit. Run-created worktrees live only under `<repo>.worktrees/` next to the main checkout — a checkout at `/src/app` puts a ticket's worktree at `/src/app.worktrees/<NN>-<ticket-slug>` — never inside the repository. Give its fresh sub-agent the worktree path, branch and base commit, the ticket path inside that worktree, and the absolute path to this skill's `execute.md`. Tell it to follow the **delegated mode** there and return its report. Keep the brief to these execution coordinates; the worker reads the ticket, its tasks, and the design itself. All its edits, tests, staging, and commits run in that worktree.
3. Run independent tickets concurrently up to the environment's available capacity. Sharing a writable project (including `Tests`) alone does not prevent parallelism. Serialize a concrete shared external resource that cannot be isolated, such as tests mutating the same database; explain that restriction. If worktree isolation or parallel sub-agents are unavailable, report the limitation and run `execute.md` in delegated mode yourself, one frontier ticket at a time, then return to step 4; its closing stop ends that ticket, not the run.
4. Wait for any worker to finish. Merge a `done` report: inspect the branch for edits outside the ticket footprint, then `git merge --no-ff` it onto the integration branch, keeping the worker's per-task commits; record the branch head and the merge commit. Resolve routine merge conflicts within the existing task contracts, preserving both tickets' behavior. A conflict requiring a design or footprint change fails the ticket (failure mode below).
5. A `claimed` report with a checkpoint means the worker ran out of context; it is not a failure. Dispatch a fresh sub-agent to the same worktree and branch with the same coordinates; `execute.md` resumes at the first task not `done`. Merge a ticket only on a `done` report.
6. On the merged tree, run the ticket's acceptance criteria, including any task criterion deferred to ticket acceptance, and rerun previously merged tickets' validation when their shared files or contracts are affected. Keep dispatch paused during merge and acceptance. On success, tick the evidenced criteria in the task and ticket files, set the ticket to `done`, and commit these tracker updates; that commit is the new dispatch base and clears the ticket's dependents. Ticket completion is a report line, not a stopping point; continue to step 7.
7. Recompute the frontier after each accepted ticket and refill available slots without waiting for unrelated running tickets. If the frontier is empty but workers remain, wait for a report. End only when no ticket can be dispatched and no worker remains; distinguish all-done from work blocked by unfinished prerequisites.

For example, with `01 → 03`, `02 → 04`, and `03 + 04 → 05`, dispatch `01` and `02` together, `03` as soon as `01` is accepted, `04` as soon as `02` is accepted, and `05` only after both `03` and `04` are accepted.

**Failure mode.** On `needs-triage`, another unsuccessful report, a merge conflict needing a design change, or a failed acceptance, that ticket is not merged: retain its worktree and branch with every task commit already on it, and mark it failed for the rest of the run. Dispatch no new tickets. Let running workers finish, and merge and accept their tickets through steps 4–6; their work is unrelated to the failure and already paid for. Dependents of a failed ticket are blocked, not failed. When no worker remains, report (§4) without the review. Preserve the failing evidence and surface the blocker rather than widening a footprint. Do not end the run with unaccounted workers still writing.

## 3. Review the whole run

When the loop ends normally and changes were merged, invoke `$code-review` with the commit recorded in §2 as the fixed point. Review the merged change set against the repository's standards and the spec.

Findings are fixed in this run by one **fix worker**: a fresh sub-agent in a run-created worktree and branch from the integration head, whose writable boundary is the union of every merged ticket's footprint. Brief it with the findings, the worktree coordinates as in step 2, that boundary, and the Validation commands of the tickets whose files each finding touches. It fixes every finding inside the boundary, runs those Validation commands, commits once following the repository's commit convention, and reports in the shape of `execute.md` §5 with the findings in place of tasks. Merge its branch as in step 4 and rerun the acceptance of every ticket whose files it touched.

A finding that needs a change outside that union is not fixed: report it with where it would go, a follow-up task under its ticket or `design.md`. Both are the user's call.

A run that ended in failure mode skips the review; report the incomplete run first.

## 4. Hand back and stop

Report:

- Each ticket attempted, its branch head and merge commit, and whether it was merged and accepted, resumed from a checkpoint, failed, or blocked.
- The `$code-review` findings, when §3 ran: fixed ones with the fix worker's merge commit, unfixed ones with where each would be fixed.
- For a `needs-triage` failure: the task, the project it needed to write to, and the reason, copied from the task's Comments.
- Tickets completed in this run.
- On a normal end nothing remains ready; say all done. List ready or blocked tickets, with their unfinished prerequisites, only when the run ended in failure mode or on an external blocker.
- Retained worktree paths, branches, and checkpoints needed to resume.

Remove only run-created worktrees and branches whose work is merged, accepted, and clean. A worktree is run-created only when this run created it under `<repo>.worktrees/`; a worktree anywhere else is pre-existing and stays untouched. Preserve failed, unmerged, or dirty work; never force cleanup or remove pre-existing worktrees.

Then stop. Do not pick up a ticket that came back `needs-triage`, and do not widen a footprint to get past it; the fix belongs in `design.md` or in the split, and that is the user's call.
