# Changelog

## 1.2.1

- Deprecated `design-code-implement`, `impl`, and `implement-all`: moved to `deprecated/`, marked `metadata.internal`, and no longer shipped by the Claude Code plugin or `npx skills`. Every implementer had to load the whole `design.md`, which inflated its context, and the conventions it recorded came from sub-agent exploration and were not reliably accurate, yet implementers treated them as settled, so code reviews kept turning up edits to `design.md`. Run Matt Pocock's `to-spec` → `to-tickets` → `implement` or `implement-spec` instead: the spec's Implementation Decisions carry the architectural choices, and `implement-spec` covers GitLab through the issue tracker that `setup-matt-pocock-skills` configures. The plugin description no longer mentions choosing an implementation direction.
- `torture-gently`: when a frontier question needs a fact from the environment, tools, or authoritative sources, it now dispatches a sub-agent to find it within the evidence horizon, instead of looking it up itself and delegating only when the work was independently bounded. The sub-agent reports each fact with its locator, so the branch can clear the question gate's Evidence check. Only the questions downstream of a running sub-agent wait; the rest of the frontier is asked now, as in Matt's `grilling`.

## 1.2.0

- New skill `winget-upgrade` under `daily/`: lists the programs winget can upgrade as a numbered list of name, ID, and current → available version, then upgrades only the numbers the user picks. Each pick is upgraded on its own by exact ID from the source it was listed under, accepting the package's agreements, since picking a number is the user's consent. Source agreements are never accepted silently: when winget reports one not yet accepted, the skill shows the terms and asks first. A failed upgrade does not stop the rest, and the run ends with a table of what succeeded and the reason for each failure. User-invoked only.
- Skills now live under `skills/<category>/`: `engineering/`, `pm/` (`scrum`), and `daily/` (`sib`, `ptns`). Skill names are unchanged, so `--skill <name>` and plugin invocations keep working, and `npx skills update` follows the move. The deprecated `to-tasks` and `implement-task` are marked `metadata.internal`, so `npx skills` no longer installs them, even by direct path or with `--full-depth`.
- `README.md` and `README.zh-TW.md` now cover installation only.

## 1.1.1

- `torture-gently`: existing artefacts now only describe how things are now, and the user's goal sets which directions the questions explore. Before, when a repo's code or docs were poor, they steered the questions and the session followed the bad code instead of the goal. The evidence horizon is unchanged, so it still does not reach out to industry or community sources.

## 1.1.0

- New skill `cloud-architect`: plans how a repo should be deployed, to the cloud or on-premises, securely and with good performance, and writes the result to `deploy-plan.md` where the user chooses. It reads every deployable unit and dependency from the repo, asks in one round for the constraints the repo cannot show, chooses the target and platform, and covers security and performance for each unit. Every recommendation cites evidence: a `path:line` in the repo, a source actually read in the session, or the user's own statement; what it only remembers does not count. A point it cannot back becomes an Evidence gap, put to the user as a question. A constraint that could flip the choice between cloud and on-premises or between platforms is blocking: it follows up until it is answered or the user names an assumption, which the plan records as one. It names cost drivers instead of estimating prices, linking the platform's official pricing calculator when one exists. An existing deployment setup is the starting point. User-invoked only.
- `GLOSSARY.md`: adds Deployment plan and Evidence gap, kept apart from the Scrum Open question.
- `design-code-implement`, `implement-all`: the `short_description` in `agents/openai.yaml` is shortened to Codex's 25–64 character limit.

## 1.0.1

- `design-code-implement`: in `design.md`, each flow that crosses components is now an ASCII flowchart, one per trigger, instead of a Mermaid `sequenceDiagram`, whose participants and stacked `alt` branches grew too wide to read once a feature got complex. Steps run top to bottom, numbered, each followed by a `↳` line naming the real function and file. Only the success path is drawn; every failure the requirement implies is listed under the diagram as "step N fails → what happens", and a step that is a flow of its own gets its own diagram, referenced as "→ Flow N". State changes stay a Mermaid `stateDiagram-v2`. The layout now lives in `references/template.md`. `impl` and `implement-all` read `design.md` as text, so designs already written in Mermaid still work.
- `implement-all`: the orchestrator now merges each finished implementer's branch into the merge request's branch itself instead of dispatching a merger subagent. No dedicated agent fits that role, so the subagent ran the orchestrator's own model at extra cost. Each implementer already merges the branch's tip before reporting done, so the merge is usually a fast-forward; on a conflict the orchestrator aborts it and sends that implementer back to merge the new tip into its own.

## 1.0.0

- New skill `scrum`: starts a human team on Scrum from a spec or incomplete material. Acting as the Product Owner, it writes three files into the repository's `scrum/` folder, creating it when missing: `product-backlog.md` (the Product Goal, then ordered items, each with a User Story, acceptance criteria, an ordering reason, its source, and Open questions tagged PM or Engineer), `sprint-01.md` (a proposed Sprint Goal and suggested items), and `definition-of-done.md` (a draft for the team to adopt). Gaps in the material become Open questions instead of stopping the run. Sizing, the Sprint Goal, and Sprint selection stay with the team, per the Scrum Guide 2020. It reads documents only, never source code. It checks each of the three files on its own, writing a missing one and keeping an existing one. An existing Product Backlog only gains the items new material introduces, keeping existing items and their ids. A new id is always above every PBI id the `scrum/` files mention, so a gap left by a removed item stays empty. The run reports where the new material contradicts an existing item, and flags a kept Sprint 1 draft that cites an earlier backlog. User-invoked only.
- New `GLOSSARY.md`, separating a Product Backlog item from a Task.

## 0.9.0

- New skill `sib` (say it back): before any work starts, restates in its own words what you want and why: the goal as distinct from the literal ask (naming both when the ask is only a means to it), the problem behind it, and what it could not tell. Each sentence carries its basis (your words, a `path:line`, or `(inferred)`), and it then waits for you to confirm or correct. User-invoked only.

## 0.8.6

- `implement-all`: each implementer now confirms its worktree is based on the merge request's branch before starting, resetting onto it if not, and merges that branch's tip into its own before reporting done. Conflicts are resolved by the implementer that knows the ticket, so the merger's merge is usually a fast-forward. This matches the implementer rules in upstream `implement-spec`.

## 0.8.5

- `implement-all`: implementers no longer each read the whole spec. While building the task graph, the orchestrator notes by heading the spec sections each ticket depends on, and points each implementer at its ticket, `design.md`, and only those sections. Pointers are paths and headings, never the orchestrator's own summary, so nothing is lost in retelling; an implementer that needs a section it was not pointed at reads it.

## 0.8.1

- `torture-gently`: the Jev question gate from 0.8.0 is removed. In practice it did not noticeably change which questions reached the user, so the skill is back to judging every branch against the four gates itself. It no longer checks for `$HOME/.typesafe/api_key.env`, asks to enable Jev, or sends anything off the machine; `references/jev.md` is gone. A key file you created for it is no longer read and can be deleted.

## 0.8.0

- `torture-gently`: the question gate can now run through TypeSafe's Jev. Before the first round the skill checks `$HOME/.typesafe/api_key.env` for a non-empty `TYPESAFE_API_KEY`; with a key, it first says in one line what leaves the machine and lets you decline — a key created for earlier work is not consent to disclose this session's material — and on consent every candidate branch is judged against the four gates by a model independent of the interviewer's own reading, so branches that change nothing, and questions whose answers the interviewer should be finding itself, are dropped before they reach the user. Without a usable file it asks once whether to enable Jev, says what it buys, and otherwise runs exactly as before. `references/jev.md` carries the state shape, the literal request and response formats, the six judgments per branch, the platform commands, and the thresholds; it is read only when a key is present. The key file sits outside the skill so it works whether the skill was installed as a read-only plugin bundle or copied into a project, and it is never inside a repository; the file's presence is probed with a status-only command that never prints its contents, and the key itself is parsed without sourcing, never exported, and passed to curl through stdin, so no child process inherits it and it never reaches a process argument list.
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
