# GUOJIE-HONG Skills

**English** | [繁體中文](./README.zh-TW.md)

Eight agent skills for the stage *before* code is written and the first steps into it: finding a direction when you cannot start, interviewing along evidenced branches, choosing an implementation direction, splitting tickets into tasks that stay inside two projects, and landing each change with proportionate validation.

They are built on top of [Matt Pocock's skills](https://github.com/mattpocock/skills) and extend that set rather than replace it. Two of them call his skills directly, so install his set first (see [Prerequisite](#prerequisite-mattpocock-skills)).

Every skill follows one rule: **evidence, never guesswork**. Claims carry a locator (`path:line`, URL, document section, or a user statement), and anything not established is reported as unknown.

## Prerequisite: mattpocock-skills

Install [mattpocock-skills](https://github.com/mattpocock/skills) before this set. The dependencies are:

| This skill | Calls | From mattpocock-skills |
| --- | --- | --- |
| `grill-softly` | `domain-modeling` | glossary and ADR writing during the interview |
| `implement-small-change` | `grill-with-docs`, `diagnosing-bugs` | hand-off when a "small" change turns out to have hidden scope or an uncertain cause |

`to-tasks` and `implement-task` do not call his skills, but they consume what they produce: the tickets `to-tickets` publishes and the issue tracker `setup-matt-pocock-skills` configures.

The other four (`dont-know-how`, `torture-gently`, `show-grill-clearly`, `design-code-implement`) run on their own.

## Install

Pick **one** route. Installing both leaves you with every skill twice.

### Claude Code plugin

This repo is its own single-plugin marketplace. It is not listed in Claude Code's official marketplace, so add the marketplace once, then install:

```text
/plugin marketplace add GUOJIE-HONG/skills
/plugin install guojie-skills@guojie-hong
```

From the terminal:

```bash
claude plugin marketplace add GUOJIE-HONG/skills
claude plugin install guojie-skills@guojie-hong
```

The plugin is a managed, read-only bundle. Pull new releases with:

```bash
claude plugin update guojie-skills@guojie-hong
```

### skills.sh (Claude Code, Codex, and other agents)

[skills.sh](https://skills.sh) copies the skill files into your project or home directory as ordinary files you own and can edit:

```bash
npx skills@latest add GUOJIE-HONG/skills
```

The installer lists the eight skills under the heading **Guojie Skills**. Take the ones you want, or one by name:

```bash
npx skills@latest add GUOJIE-HONG/skills --skill grill-softly
```

Nothing updates behind your back. Pull the latest with `npx skills update`.

## How the skills fit together

```mermaid
flowchart LR
    A["/dont-know-how<br/>I cannot start this task"] --> B["/grill-softly<br/>settle the decisions,<br/>write the glossary and ADRs"]
    B --> C["/design-code-implement<br/>pick how to build it"]
    C --> D["/implement-small-change<br/>land it with focused checks"]
    C -- tickets over two projects --> G["/to-tasks<br/>split each ticket into<br/>two-project tasks"]
    G --> H["/implement-task<br/>one ticket per fresh sub-agent,<br/>tasks as its checklist"]
    B -. interview stalls .-> E["/show-grill-clearly<br/>answer in the browser,<br/>paste the reply back"]
    E -.-> B
    B -. uses .-> F["torture-gently<br/>the interview engine"]
    D -. hidden scope .-> B
```

Every skill here is **user-invoked**: you type it, it orchestrates. The one exception is `torture-gently`, which is **model-invoked**: the agent may reach for it on its own when you ask to stress-test a plan, and `grill-softly` calls it as its interview engine.

You do not have to run the whole chain. Each skill accepts its input in whatever form it arrives (a file, a hand-off from the previous skill, or prose in the conversation) and stops at a clear boundary so the next step is your call.

## The skills

### `/dont-know-how`

**Use it when** you face a task you cannot start: an unfamiliar system, protocol, library, or integration.

**What it does.** Scans the repo for what the project already owns that touches the task. Asks only for inaccessible information that could change a direction, its feasibility, or a material risk: counterpart documents, sample code, test environments, credential availability, and constraints. It asks how access is obtained, never for secret values. Then it gathers evidence itself, in order of authority (project dependencies, official sources, then community sources cross-checked against something official). It returns every real direction the evidence supports—normally at least three, but fewer when another would be manufactured—with each direction's evidence, strengths and weaknesses, fit, unknowns, and a recommendation.

**What it does not do.** Implement anything. Choosing is your decision.

**Hands off to** `/grill-softly` once you have picked a direction and need to settle the details.

### `/grill-softly`

**Use it when** you have a plan or design and want it sharpened, with the resulting vocabulary and decisions written down as you go.

**What it does.** Runs `torture-gently` and `domain-modeling` together. You get a bounded interview that only follows branches the repo or your sources show evidence for, and a glossary (`CONTEXT.md`) and ADRs that are updated the moment a term or decision crystallises.

**What it does not do.** Speculate. A branch without evidence does not get a question.

**Hands off to** `/design-code-implement` when the *what* is settled and the *how* is open.

### `torture-gently`

**Use it when** you want to stress-test your thinking without being dragged into hypothetical or out-of-scope questioning. This is the interview engine behind `grill-softly`, and the only model-invoked skill in the set.

**What it does.** Maps the decision as a design tree and asks in rounds: every question whose prerequisites are settled goes into the current round, numbered, with a recommended answer. Before a question is asked it must clear a four-part gate: evidence, plausibility, materiality, and responsibility. Fact-finding is the agent's job; you are asked only for private information, preferences, and decisions. After each round it checkpoints changed decisions, blockers, parked branches, and the next frontier. Changing an upstream decision reopens every dependent conclusion, and a paused session returns a checkpoint that can be resumed without re-asking decisions whose premises still hold. The session ends only when no gated branch remains unvisited and every parked branch has been resolved, removed from scope, or explicitly accepted as open.

**What it does not do.** Act on the outcome until you confirm a shared understanding has been reached.

### `/show-grill-clearly`

**Use it when** a grilling session has left unresolved decisions that are easier to answer in a form than in chat, or that someone else has to answer.

**What it does.** Turns the open decisions into a self-contained HTML questionnaire in your temp directory and opens it in the browser. Each question keeps its original wording plus one scenario, up to three context facts, and two to four options, each stating its concrete cost. Prose is Traditional Chinese; technical text is preserved verbatim. When you are done, the page produces a reply prompt you paste back into the conversation. Builders are provided for Windows (PowerShell) and macOS (sh).

**What it does not do.** Discover facts, decide for you, or reopen a confirmed decision. Blank questions stay open.

### `/design-code-implement`

**Use it when** a spec already says *what* to build and you need to decide *how*, before any code is written.

**What it does.** Reads `CONTEXT.md` and relevant ADRs, then sends at most five parallel sub-agents to map the repo's real architectural conventions in the areas the spec touches. Each finding names the existing convention, its evidence path, and where the new requirement is in tension with it. From those tensions it presents at least three directions: a conservative baseline that follows every convention, plus alternatives grown from the actual friction. Each direction states its positioning, footprint, cost, and the condition under which it is the wrong choice. The chosen direction is written to `design.md` next to the spec, containing only what will be done.

When the spec came with `to-tickets` tickets, it finishes by reading the repo's project definitions, mapping the chosen direction's footprint onto each ticket, and marking which tickets write to more than two projects.

**What it does not do.** Write production code, split tickets, pad the list with contrived variants, or record rejected directions in `design.md`. If the conventions already determine the approach, it says so and points you to `/implement-small-change`.

**Hands off to** `/to-tasks` when any ticket is over the two-project line, `/implement-task` when every ticket is within it, and otherwise `/implement-small-change` for a bounded change or Matt's `/implement` for a larger one.

### `/implement-small-change`

**Use it when** you need a small bug fix, tweak, or feature landed with the smallest workflow that still proves the behavior.

**What it does.** Discovers the affected symbols and blast radius first, preferring a code knowledge graph or other repo-aware tool over plain search. Applies a scope gate: one clear behavior, understood callers, one module or seam, a focused check that can detect it, easy to reverse. Makes the smallest coherent change, runs the narrowest checks that could catch a mistake, and reports the observable result, the files touched, the exact validation run, and what was deliberately not run.

**What it does not do.** Classify a change as small by file count, run the full suite by default, or commit unless asked. When a hard stop appears (a cross-layer decision, a public contract, security or payments, a new domain term, or ambiguous interpretations) it pauses and hands off to Matt's `grill-with-docs`. When the cause is uncertain rather than ambiguous, it hands off to `diagnosing-bugs`.

### `/to-tasks`

**Use it when** `/design-code-implement` has reported tickets whose footprint spans more than two projects, and you want each ticket cut into short, verifiable steps a small model can follow without drifting across the codebase.

**What it does.** Reads `design.md`, the tickets, and the repo's project definitions (`*.csproj` references, workspace globs, `go.mod`) to build the dependency chain. For each ticket it lists the projects the chosen direction writes to, each cited to a `design.md` convention, then cuts that footprint into tasks: at most two writable projects per task, the test project counting as one, ordered inner-most first with blocking edges among siblings, one grounded validation command each. A ticket that already fits in two projects becomes a single task. It shows you the whole tree and writes nothing until you approve it; then it publishes one file per task under the ticket (`issues/01-slug/01-task.md`), or sub-issues on a real tracker. Every task file opens with its boundary: the projects this step writes to, inside the ticket's overall footprint; a change needed in a project no task of the ticket names stops the work with a `needs-triage` note.

**What it does not do.** Touch the ticket files, invent a validation command it cannot ground, or split a ticket when `design.md` is missing; it points you back to `/design-code-implement` instead.

**Hands off to** `/implement-task`.

### `/implement-task`

**Use it when** `/to-tasks` has published a tree and you want independent ready tickets implemented in parallel, each ticket in one fresh context that works its tasks in order.

**What it does.** Given a single task file, it follows `execute.md` directly, checking blockers, implementing within the boundary, validating, and committing the task. Given a ticket or feature directory, it dispatches ready tickets to fresh sub-agents in separate worktrees, up to available capacity; each worker reads the ticket, `design.md`, and every task once, then does the tasks in order with one validation and one commit per task, so a worker that runs out of context is replaced by a fresh one resuming from the last commit. The orchestrator merges each finished ticket branch back with `git merge --no-ff`, runs ticket acceptance on the merged tree, marks the ticket done, and recomputes the frontier without asking. Sharing a project such as `Tests` does not by itself serialize tickets. When the run ends normally it runs `/code-review` once over the merged change set and has one fix worker fix every finding inside the run's footprint. Failed or unmerged work is retained with paths and commits for resumption.

**What it does not do.** Write outside a ticket's footprint. A task that needs a change in a project no task of its ticket names reverts that edit, records the project and reason under Comments, sets `needs-triage`, and fails that ticket; other running tickets finish and merge, no new ones start, and widening the footprint is a `design.md` or split decision, and that is yours. Review findings outside the run's footprint are reported, not fixed; each becomes a follow-up task or a `design.md` change on your say.

## Versioning

The `version` field in [.claude-plugin/plugin.json](./.claude-plugin/plugin.json) is what Claude Code uses to decide that installed users have an update. It is bumped by hand on release, and each release gets a line in [CHANGELOG.md](./CHANGELOG.md).

## License

[MIT](./LICENSE)
