# Skills

A collection of agent skills. Each skill is a directory the agent loads to perform one kind of task.

## Language

### Skill anatomy

**Skill**:
A directory containing a `SKILL.md` plus whatever resources it needs. The unit this repo distributes.
_Avoid_: command, plugin, tool

**Renderer**:
The bundled HTML asset that owns the mechanical payload schema, limits, validation, and user-interface behavior.
_Avoid_: template, view

**Builder**:
The bundled platform adapter that combines a Payload with the Renderer, writes the Questionnaire to OS temporary storage, and requests a system-browser launch. It contains no questionnaire rules.
_Avoid_: generator, compiler, launcher

### Matt grill questionnaire

**Grill**:
An interview that pushes the user through a design tree until nothing is left silently assumed.

**Payload**:
The JSON value embedded in a questionnaire renderer — its title, recap, and questions. It is per-run content, not a required standalone file.
_Avoid_: config, data file, input

**Questionnaire**:
A self-contained HTML page a user answers. Lives in the OS temp directory, never in a repository.

**Delivery contract**:
The user-visible outcome the skill guarantees: a clickable questionnaire path. Opening it in a browser is a best-effort convenience determined from the current environment.

**Recap**:
Decisions the user has already made, shown as one-line reminders. Never a place to park an open decision.

**待確認**:
A question the user left blank. It stays open — a recommendation counts only once the user clicks it or confirms it in chat.
_Avoid_: pending, unanswered, defaulted

### Design code implement

**Direction**:
One executable implementation route offered for the user to choose between. Always at least three, each carrying its own cost and its own failure condition.
_Avoid_: option, approach, plan

**Baseline**:
Direction 1, fixed by definition: follow every existing convention and open no new seam. It exists so the other Directions have something to be measured against.
_Avoid_: default, safe option

**Tension**:
A point where the new requirement collides with an existing convention. The only legitimate source of Directions beyond the Baseline. No Tension means no real choice.
_Avoid_: conflict, issue, gap

**Architectural convention**:
How the repository cuts layers, moves errors upward, gets data in and out, places tests, and positions its seams. The subject of exploration.
_Avoid_: coding standard, code style

**Surface style**:
Naming case, file placement, formatting. Deliberately out of scope — it is taught by linters and neighbouring code, and never produces a different Direction.

**Design note**:
The `design.md` recording the chosen Direction. Holds only what will be done; a rejected Direction written down reads as an instruction to a downstream agent.
_Avoid_: plan, spec, design doc
