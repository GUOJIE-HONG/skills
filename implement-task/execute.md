# Execute one task

The procedure for a single `to-tasks` task file, run by whoever holds it: the `$implement-task` skill itself, or a fresh sub-agent it dispatched. The task file is the brief; this file is the method.

## 1. Read the brief

1. The task file. Its Boundary section names the **writable projects**; its Validation section names the one command; its Done-when list is the completion criterion.
2. The parent ticket, for the behaviour the task serves and, on the last task, the acceptance criteria to run.
3. `design.md` in the feature directory, for the conventions cited by the task and their evidence paths.
4. The repository instruction files that apply to the writable projects (path-scoped rules, `AGENTS.md`, `CLAUDE.md`).

Check `git status` and keep any unrelated changes already in the working tree exactly as they are.

Set the task's `Status:` to `claimed` before the first edit.

## 2. Hold the boundary

Every edit lands inside the writable projects. Read anything anywhere; that is what the rest of the repository is for.

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

On the last task of a ticket, also run the parent ticket's acceptance criteria. Each criterion needs an observed result, a command output or an interaction, before its box is ticked.

Then:

1. Inspect the final diff for edits outside the boundary, leftover debug output, and files touched by accident.
2. Tick the Done-when boxes that have evidence.
3. Set `Status:` to `done`.
4. Commit the task as one commit, following the repository's commit convention, with the task id (`<NN>.<MM>`) in the message. Task file and ticket file updates go in the same commit.

## 5. Report

Report in exactly this shape, so the orchestrator can read it without opening the code:

- **Task:** `<NN>.<MM>` title
- **Status:** `done` or `needs-triage`
- **Commit:** hash, or none
- **Files changed:** list
- **Validation:** the command and its result line
- **Ticket acceptance:** passed / not run (not last task) / failed, with the failing criterion
- **Open:** the boundary breach or observations left under Comments, or none

Then stop.
