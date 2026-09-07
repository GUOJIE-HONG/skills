# Execute one task

The procedure for a single `to-tasks` task file, run by whoever holds it: the `$implement-task` skill itself, or a fresh sub-agent it dispatched. The task file is the brief; this file is the method.

**Delegated mode:** the orchestrator supplies a worktree, branch, and base commit. Verify those coordinates before editing and run all commands there. Own only this task's implementation and task file; the orchestrator owns the integration branch, parent ticket updates, and ticket acceptance. In direct single-task mode, perform the acceptance and tracker steps yourself.

## 1. Read the brief

1. The task file. Its Boundary section names the **writable projects**; its Validation section names the one command; its Done-when list is the completion criterion.
2. The parent ticket, for the behaviour the task serves and, on the last task, the acceptance criteria to run.
3. `design.md` in the feature directory, for the conventions cited by the task and their evidence paths.
4. The repository instruction files that apply to the writable projects (path-scoped rules, `AGENTS.md`, `CLAUDE.md`).

Check `git status` and keep any unrelated changes already in the working tree exactly as they are.

In direct mode, confirm the task is ready and its sibling and parent ticket blockers are complete in the current checkout before claiming it; otherwise report the blockers and stop.

Set the task's `Status:` to `claimed` before the first edit.

## 2. Hold the boundary

Implementation edits land inside the writable projects. Task tracker updates described here are also allowed; parent ticket updates belong to the orchestrator in delegated mode. Read anything anywhere; that is what the rest of the repository is for.

When the work turns out to need a change outside them (a missing model field, a signature in an upstream project, a registration in a host project), the task is mis-split, and the fix is upstream of you:

1. Leave that outside change unmade. Revert any edit you have already made outside the boundary.
2. Append under `## Comments` in the task file: the project that needs the change, the file and symbol, and why the task cannot complete without it.
3. Set `Status:` to `needs-triage`.
4. Report (§5) and stop.

## 3. Implement

Follow the conventions `design.md` cites; those paths are the examples to imitate. When a test project is among the writable projects, write the test first and watch it go red before the production change.

Stay on the task: the files and behaviour it names, nothing adjacent. Refactors, cleanups, and improvements you notice on the way go under `## Comments` as observations, unmade.

## 4. Validate

Run the task's Validation command. Fix until it passes, staying inside the boundary; a failure that cannot be fixed inside the boundary is a boundary breach (§2).

In direct mode, run the parent ticket's acceptance criteria once all sibling tasks are complete. If this task requires ticket acceptance but siblings remain unfinished, report that prerequisite with status `claimed` and a checkpoint, and stop before the completion steps below. Each criterion needs an observed result before its box is ticked.

In delegated mode, defer parent ticket acceptance and its associated task checkbox to the orchestrator, even if this is the task designated as last. Its worktree may not contain other workers' results. Report that deferral explicitly.

Then:

1. Inspect the final diff for edits outside the boundary, leftover debug output, and files touched by accident.
2. Tick the Done-when boxes that have evidence.
3. In direct mode, set `Status:` to `done` only when all required criteria pass. In delegated mode, set it to `done` when task-local criteria pass; this worker result clears no blockers until integration and validation by the orchestrator.
4. Commit the task as one commit, following the repository's commit convention, with the task id (`<NN>.<MM>`) in the message. Include the task file; include parent ticket updates only in direct mode after acceptance passes, setting that ticket to `done`. Use explicit paths to preserve unrelated changes.

## 5. Report

Report in exactly this shape, so the orchestrator can read it without opening the code:

If the orchestrator requests a stop, finish only the current safe operation and report a checkpoint with the actual task status (`claimed` if incomplete). Preserve unfinished changes in the assigned worktree. A stop request is not a boundary breach and does not make the task `needs-triage`.

- **Task:** `<NN>.<MM>` title
- **Status:** actual tracker status (`done`, `needs-triage`, or `claimed` for incomplete work)
- **Commit:** hash, or none
- **Workspace:** worktree path, branch, and base commit (delegated mode)
- **Files changed:** list
- **Validation:** the command and its result line
- **Ticket acceptance:** passed / deferred to orchestrator / not run (siblings incomplete) / failed, with the failing criterion
- **Open:** boundary breach, unfinished prerequisite, or checkpoint with remaining work and validation state; otherwise observations or none

Then stop.
