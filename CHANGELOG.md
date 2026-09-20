# Changelog

## 0.8.0

- `torture-gently`: the question gate can now run through TypeSafe's Jev. Before the first round the skill checks `api_key.env` in its own directory for a non-empty `TYPESAFE_API_KEY`; with a key, every candidate branch is judged against the four gates by a model independent of the interviewer's own reading, so branches that change nothing, and questions whose answers the interviewer should be finding itself, are dropped before they reach the user. Without a usable file it asks once whether to enable Jev, says what it buys, and otherwise runs exactly as before. `references/jev.md` carries the state shape, the six judgments per branch, the platform commands, and the thresholds; it is read only when a key is present, and the key never leaves the shell.
- `design-code-implement`: the no-existing-convention exit is now checked at the top of section 4, before any direction is produced. In a repository with nothing to inherit both exits applied at once and the skill took the wrong one, reporting that the existing conventions already determined the approach.

## 0.7.6

- `design-code-implement`: when exploration finds no existing convention to inherit, it now says so and stops instead of reporting that the existing conventions already determine the approach.
- `design-code-implement`: `design.md` now lists changes no diagram shows (migrations, configuration, interface shapes) alongside the Mermaid diagrams, instead of only when neither diagram applies.

## 0.7.5

- `design-code-implement`: `design.md` now records the chosen direction as Mermaid instead of prose: a `sequenceDiagram` with an `alt` branch for every failure path for flows that cross components, a `stateDiagram-v2` for state changes, and a short list only when neither applies. Participants are named after the real modules or files, and the conventions to follow are one line each with their evidence path.
- `design-code-implement` (breaking): the greenfield path is gone. When the repository has no architecture to inherit, the skill no longer researches external sources to build directions; that is what `dont-know-how` is for.
- `design-code-implement`: it now reads only what you point it to, instead of always reading `CONTEXT.md`, ADRs, tickets and the instruction files, and it no longer offers to write an ADR.
- `design-code-implement`, `impl`, `implement-all` (breaking): `design.md` no longer lands beside the spec or under `.scratch/` by default. `design-code-implement` asks where to write it, and `impl` and `implement-all` ask for its path when you have not given it.

## 0.7.0

- New skill `refactor`: classifies a refactor as behavior-preserving or behavior-changing, writes a plan to `.refactor/<refactor-slug>/plan.md`, then either refactors against a green test baseline or goes test-first with Matt's `tdd`, and closes with Matt's `code-review` against the plan. A breaking change waits for your approval of the plan.

## 0.6.2

- `dont-know-how`: once you pick a direction it now continues straight into `torture-gently` instead of stopping, and it no longer aims for at least three directions; it returns what the evidence supports. The question templates no longer repeat rules already stated in the skill.
- `torture-gently`: when how a flow should behave cannot be made clear in words, it calls Matt's `prototype` and asks against the clickable demo.

## 0.6.1

- `implement-small-change`: on hidden scope it now writes the impact brief and asks you to run `/grill-softly`, instead of invoking Matt's `grill-with-docs`, which is user-invoked and could not be reached from a skill.

## 0.6.0

- New skill `impl`: Matt Pocock's `implement` that also reads `design.md`, so the work follows the implementation direction `design-code-implement` recorded.
- New skill `implement-all`: Matt Pocock's `implement-spec` with `design.md` among the context pointers every implementer sub-agent reads, and a merge request opened on whichever host the repository uses (GitHub, GitLab, ...).

## 0.5.0

- Deprecated `to-tasks` and `implement-task`: moved to `deprecated/` and no longer shipped by the Claude Code plugin or `npx skills`. Splitting tickets into two-project tasks did not lower the error rate of small models on cross-project work in practice. Implement tickets with Matt Pocock's `implement` instead.

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
