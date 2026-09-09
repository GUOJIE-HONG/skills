# Execute a ticket's tasks

The procedure for `to-tasks` task files, run by whoever holds them: a fresh sub-agent `$implement-task` dispatched for a whole ticket, or the skill itself for a single task. The task files are the brief; this file is the method.

**Delegated mode:** the orchestrator supplies a worktree, branch, base commit, and a ticket. Verify those coordinates before editing and run all commands there. Work the ticket's tasks in number order, each through §2–§4, then report once (§5). Own the implementation and the task files; the orchestrator owns the integration branch, parent ticket updates, and ticket acceptance.

**Direct mode:** the skill holds one task file in the current checkout. Run §1–§4 for that task only, then perform the acceptance and tracker steps yourself.

## 1. Read the brief

Read once, before the first edit:

1. The parent ticket, for the behaviour the tasks serve and the acceptance criteria.
2. Every task file of the ticket. Each Boundary section names that task's writable projects; the **ticket footprint** is their union. Each Validation section names one command; each Done-when list is that task's completion criterion.
3. `design.md` in the feature directory, for the conventions cited by the tasks and their evidence paths.
4. The repository instruction files that apply to the footprint (path-scoped rules, `AGENTS.md`, `CLAUDE.md`).

Check `git status` and keep any unrelated changes already in the working tree exactly as they are.

In delegated mode, start at the first task that is not `done` on the branch; tasks already `done` are a checkpoint left by an earlier worker. In direct mode, confirm the task is ready and its sibling and parent ticket blockers are complete in the current checkout before claiming it; otherwise report the blockers and stop.

## 2. Hold the boundary

Implementation edits land inside the ticket footprint. Task tracker updates described here are also allowed; parent ticket updates belong to the orchestrator in delegated mode. Read anything anywhere; that is what the rest of the repository is for.

A task's own Boundary says where its edits are expected. An earlier sibling's project is still inside the footprint, so a field, signature, or registration that sibling missed is fixed in place: make the change, note it under that sibling's `## Comments`, and keep it in the current task's commit.

When the work turns out to need a change outside the footprint (a project no task of this ticket names), the ticket is mis-split, and the fix is upstream of you:

1. Leave that outside change unmade. Revert any edit you have already made outside the footprint.
2. Append under `## Comments` in the current task file: the project that needs the change, the file and symbol, and why the task cannot complete without it.
3. Set that task's `Status:` to `needs-triage`.
4. Report (§5) and stop. Tasks already committed stay on the branch.

## 3. Implement

Set the task's `Status:` to `claimed` before its first edit.

Follow the conventions `design.md` cites; those paths are the examples to imitate. When a test project is among the task's writable projects, write the test first and watch it go red before the production change.

Stay on the task: the files and behaviour it names, nothing adjacent. Refactors, cleanups, and improvements you notice on the way go under `## Comments` as observations, unmade.

## 4. Validate and commit

Run the task's Validation command. Fix until it passes, staying inside the footprint; a failure that cannot be fixed inside the footprint is a boundary breach (§2).

Then:

1. Inspect the diff since the last commit for edits outside the footprint, leftover debug output, and files touched by accident.
2. Tick the Done-when boxes that have evidence. Leave the parent ticket acceptance box to whoever runs acceptance.
3. Set `Status:` to `done` when the task-local criteria pass. In delegated mode this clears no blockers until the orchestrator merges and accepts the ticket.
4. Commit the task as one commit, following the repository's commit convention, with the task id (`<NN>.<MM>`) in the message. Include the task file. Use explicit paths to preserve unrelated changes. This commit is the checkpoint: a fresh worker resuming this branch starts after it.

In delegated mode, continue with the next task. When the remaining context is too small to finish and commit the next task, do not start it: report (§5) with the checkpoint. Never leave a task half-edited and uncommitted at the end of a report.

In direct mode, run the parent ticket's acceptance criteria once all sibling tasks are `done`. If siblings remain unfinished, report that prerequisite and stop before touching the ticket file. Each criterion needs an observed result before its box is ticked; on success set the ticket to `done` and commit the ticket update.

## 5. Report

If the orchestrator requests a stop, finish only the current safe operation: commit the current task if it validates, otherwise leave its edits in the worktree with `Status:` `claimed`. Report a checkpoint. A stop request is not a boundary breach and does not make the task `needs-triage`.

Report in exactly this shape, so the orchestrator can read it without opening the code:

- **Ticket:** `<NN>` title
- **Status:** `done` (every task done), `needs-triage` (naming the task), or `claimed` (checkpoint: last task done, next task to start)
- **Tasks:** one line per task, `<NN>.<MM>`, its status, and its commit hash or none
- **Workspace:** worktree path, branch, and base commit (delegated mode)
- **Files changed:** list
- **Validation:** each task's command and its result line
- **Ticket acceptance:** deferred to orchestrator (delegated) / passed / failed, with the failing criterion / not run (siblings incomplete)
- **Open:** boundary breach, checkpoint with remaining tasks and validation state, or observations; otherwise none

Then stop.
