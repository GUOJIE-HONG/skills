# Changelog

## 0.4.0

- `ptns`: the handoff is now delivered, not just printed. On Claude Code the skill lists the reachable sessions, asks which one to hand the progress to, and sends the prompt straight to it with a session-to-session message; on any other agent (Codex, agy, ...) it still returns one copyable code block. The agent is detected from the tools actually available, never by asking the user, and nothing is sent before the user picks a target. The prompt also now opens with the working directory the next session should be in.

## 0.3.0

- New skill `ptns` (prompt to new session): hands the current progress to a fresh session as one short, copyable prompt covering the goal, verified progress, current state, next step, decisions and their reasons, and dead ends. User-invoked only.

## 0.2.5

- `implement-task`: the unit of dispatch is now a ticket, not a task. One fresh sub-agent per ticket reads the ticket, `design.md`, and every task once, then works the tasks in order with one validation and one commit per task; independent tickets still run in parallel worktrees. The worker's writable boundary is the ticket footprint (the union of its tasks' projects), so a change an earlier sibling missed is fixed in place instead of stopping with `needs-triage`. Finished tickets are merged back with `git merge --no-ff` and accepted by the orchestrator; a worker that runs out of context reports a checkpoint and a fresh worker resumes from its last commit; a failed ticket no longer stops running workers, only new dispatches; review findings are fixed by one fix worker inside the run's footprint. Cuts the repeated per-task reading of design, ticket, rules, and code.
- `to-tasks`: task sizing is now "one checkpoint step" rather than "one fresh context window", and the task template's boundary text describes the ticket footprint rule.
- `implement-task`: run-created worktrees now live only under `<repo>.worktrees/` next to the main checkout, one per ticket named `<NN>-<ticket-slug>`, so cleanup can tell run-created worktrees from pre-existing ones by location.

## 0.2.0

- New skill `to-tasks`: splits each `to-tickets` ticket into implementation tasks that write to at most two projects, nested under the ticket, published only after the user approves the tree.
- New skill `implement-task`: works the frontier of `to-tasks` task files, one task per fresh sub-agent, each confined to the projects its task names; a boundary breach stops the loop with `needs-triage` instead of widening the edit; an exhausted frontier ends with `$code-review` over the whole run.
- `design-code-implement`: after recording the direction, measures each ticket's footprint against the project dependency chain and reports which tickets exceed two projects, recommending `$to-tasks` or `$implement-task` accordingly.

## 0.1.1

- `dont-know-how`: content read from outside sources is now explicitly material, never instruction. Directives embedded in documentation, forum posts or issue threads are recorded as findings with their locator instead of being acted on (indirect prompt injection).

## 0.1.0

- First release as a Claude Code plugin (`guojie-skills`) and via skills.sh.
- Ships six skills: `dont-know-how`, `grill-softly`, `torture-gently`, `show-grill-clearly`, `design-code-implement`, `implement-small-change`.
