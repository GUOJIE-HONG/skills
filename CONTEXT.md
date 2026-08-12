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
