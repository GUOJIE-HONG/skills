---
name: to-tasks
description: Split each ticket into implementation tasks that write to at most two projects, nested under the ticket. Use after to-tickets and design-code-implement, before any code is written.
disable-model-invocation: true
---

# To Tasks

A ticket from `to-tickets` is a tracer bullet: one end-to-end behaviour, deliberately layer-agnostic. Implementing it usually means creating or editing files across several projects at once, and that is where a small model in a long session drifts. This skill turns each ticket into **tasks**: implementation slices whose **footprint** (the projects they write to) is at most two projects, ordered along the dependency graph, each sized for one fresh context window.

Tasks nest under their ticket:

```text
ticket 01
├─ task 01
├─ task 02
└─ task 03
```

This skill writes task files only. It ends when the tree is published.

## 1. Establish the input

The input is a feature directory holding the tickets and `design.md`. Accept it as a path or infer it from the conversation; when the conversation already holds the tickets and the design, work from that.

Read, in this order:

1. The issue tracker convention (`docs/agents/issue-tracker.md` or whatever `/setup-matt-pocock-skills` configured). It decides where tasks land in §6.
2. `design.md` in the feature directory. It carries the chosen direction and the conventions to follow, each with an evidence path. Those paths are the raw material for task footprints.
3. Every ticket file. Note each ticket's number, blocking edges, and acceptance criteria.
4. `spec.md`, when present, for the behaviour the acceptance criteria refer to.

`design.md` missing means the direction is undecided. Say so, name `$design-code-implement` as the next step, and stop; splitting an undecided design produces tasks that will be thrown away.

Do not ask the user for facts discoverable from the repository or these files.

## 2. Map the project graph

Read the repository's project definitions once and record two things: the list of projects, and the dependency direction between them.

Where to look, by ecosystem:

- .NET: every `*.csproj` and its `ProjectReference` entries; the `.sln` for the full set.
- JavaScript / TypeScript monorepos: the workspace globs in `package.json` or `pnpm-workspace.yaml`, then each package's dependencies on sibling packages.
- Go: `go.mod` modules and `go.work`.
- Anything else: the build system's unit of compilation that has its own dependency declaration.

A **project** is a unit that declares its own dependencies. Test projects are projects. When the repository is a single project, the boundary is the top-level directory that a module system or the build treats as a unit; say which rule you applied.

Record the graph in the report as a short chain or list, inner-most (no dependencies) first. Every later step orders tasks along it.

## 3. Compute each ticket's footprint

For each ticket, list the projects that must be created in or edited to deliver its acceptance criteria under the direction in `design.md`. For every project in the footprint, cite the convention in `design.md` (with its evidence path) or the ticket line that puts it there. A project with no citation is not in the footprint.

Include the test project that proves each production change. The test project counts toward the footprint like any other.

Sort the footprint inner-most first, following the graph from §2.

## 4. Split into tasks

Walk each ticket's sorted footprint and cut it into tasks:

- **Footprint limit**: each task writes to at most two projects. A production project and the test project that proves it is the usual pair.
- **Dependency order**: an earlier task never depends on a later one. Give each task its **blocking edges** among tasks of the same ticket. Cross-ticket order is already carried by the ticket's own blocking edges; tasks reference only siblings.
- **One validation**: each task names the single narrowest command that proves it: a build of the affected project, one test file or filter, one migration command, one HTTP call. Take the commands from `design.md`, the repository's instruction files, or the test project's own documentation; a command you cannot ground stays out.
- **Fresh-context size**: each task must be finishable, validated, and committed within one fresh context window. When a two-project slice is still too large, split it by behaviour inside the same footprint.
- **Concrete**: tasks name files, symbols, and behaviour. This is the reverse of the ticket rule; tickets avoid paths because they outlive the code, tasks are executed next and their paths come straight from `design.md`.

A ticket whose whole footprint already fits in two projects becomes exactly one task, carrying the same concrete detail. Downstream then sees one shape for every piece of work.

The last task of a ticket is the one that makes the ticket's acceptance criteria observable; say so in that task so the executor knows to run the ticket's criteria after its own validation.

## 5. Quiz the user

Present the tree as a nested list. For each task show:

- **Title**
- **Writes to**: the one or two projects
- **Blocked by**: sibling task numbers, or none
- **Validation**: the one command

Ask:

- Does any task's footprint look wrong: a project missing, or one that should not be there?
- Are the blocking edges the real dependencies?
- Should any task be merged or split further?

Iterate until the user approves the tree. Nothing is written before that approval.

## 6. Publish the tasks

Publish in the shape the configured tracker uses:

- **Local files** → one file per task under `<issues dir>/<NN>-<ticket-slug>/<MM>-<task-slug>.md`, numbered from `01` in dependency order. The directory name matches the ticket file's basename, so the ticket and its tasks sit side by side.
- **A real tracker** → one sub-issue per task under the ticket's issue, in dependency order, using the platform's native blocking relationship; otherwise set "Blocked by" to the sibling issues. Apply `ready-for-agent`.

Leave the ticket files untouched.

<task-template>

# <NN>.<MM>: <Task title>

**Parent ticket:** <NN>-<ticket-slug>
**Blocked by:** <sibling task numbers>, or "None (can start immediately)"
**Status:** ready-for-agent

## Boundary

Every edit lands in these projects: `<Project A>`, `<Project B>`. Read any project; write only here. When the work turns out to need a change elsewhere, stop, record which project and why under Comments, set Status to needs-triage, and leave the change unmade.

## What to change

Files to create or edit, the symbols involved, and the behaviour each must have. Cite the `design.md` convention (with its evidence path) behind each non-obvious choice.

## Validation

One command.

## Done when

- [ ] Validation passes
- [ ] <observable outcome specific to this task>
- [ ] (last task only) Parent ticket's acceptance criteria pass

</task-template>

## 7. Hand back and stop

Report:

- The project graph from §2, in one line.
- The tree: tickets and their tasks, with each task's footprint.
- Where the files landed.
- The next command: `$implement-task` on the feature directory to work the frontier, or on one task file to do just that task.

Then stop.
