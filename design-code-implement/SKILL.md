---
name: design-code-implement
description: Turn a settled requirement into at least three grounded implementation directions, then record the chosen one. Use after the requirement is settled and before any code is written.
disable-model-invocation: true
---

# Design Code Implement

Decide *how* to build something whose *what* is already settled. Explore the repository's real architectural conventions with parallel sub-agents, surface where the new requirement is in tension with them, and offer at least three directions the user picks from.

This skill does not write production code. It ends when a direction is chosen and recorded.

## 1. Establish the input

Accept the requirement in whatever form it arrives: a file path, an upstream skill's handoff, or prose in the conversation. Never demand a file. Read what the user points to, and restate the requested outcome in one sentence; get it confirmed if it is at all ambiguous.

Do not ask the user for facts discoverable from the repository, runtime, or tools.

## 2. Scope the exploration

Decide the aspects yourself, from the requirement confirmed in §1. Do not send a scout sub-agent first, and do not ask the user to approve the aspect list — they cannot judge it before seeing the repository's reality, and a wrong aspect exposes itself in the reports.

Constraints on the aspect list:

- **Always include domain language**: what the existing concepts are called, and whether the requirement introduces a term the codebase does not have.
- **Architectural convention only**: how layers are cut, how errors travel upward, how data enters and leaves, where tests live, where the existing seams are. Exclude surface style — naming case, file placement, formatting. Linters and neighbouring code already teach those, and nobody picks a different implementation direction because of camelCase.
- **At most five sub-agents.** If the requirement seems to need more, merge aspects. A requirement genuinely spanning eight architectural aspects should be split before it is designed.
- **Bounded blast radius.** Explore only the areas the requirement touches, plus recent hotspots from `git log --oneline`. Do not sweep the whole repository; irrelevant conventions dilute the real tensions.

## 3. Dispatch and collect

Give every sub-agent the same tool preference:

- If a codebase knowledge-graph MCP is available, use it first; complete its indexing if the repository is not indexed yet.
- Otherwise prefer any other repository-aware navigation tool.
- Fall back to built-in search for string literals, configuration, scripts, and non-code files, or when the above return stale or inapplicable results.

Require every sub-agent to report exactly three things per finding:

1. **The existing convention** — what this repository already does for this aspect.
2. **The evidence** — file and line (`path/to/file.ts:42`). A claim without a path is not usable.
3. **The tension** — where the new requirement collides with that convention. If there is none, say so explicitly.

The tension field is the point of the exercise. Conventions with no tension are context; tensions are where directions come from.

## 4. Produce the directions

Present **at least three** directions in the conversation, sequentially, so each is absorbed before the comparison.

- **Direction 1 is always the baseline**: follow every existing convention, open no new seam, take the most conservative path. It costs almost nothing to produce and it is what the other directions are measured against — without it the user cannot judge whether the extra cost is worth paying.
- **Directions 2 and 3 grow out of the reported tensions**, not from a template. Do not assign directions predetermined constraints; let the repository's actual friction decide where they diverge.

Give each direction exactly four fields:

1. **Positioning** — one sentence.
2. **Footprint** — which files and which seams it touches.
3. **Cost** — what it charges, concretely.
4. **When this is the wrong choice** — the condition under which this direction is a mistake.

The fourth field is mandatory and forces honesty. A direction with no failure condition has not been thought through.

Close with a **recommendation**: the direction you would pick and the tension or requirement that decides it. The choice stays the user's.

**When the tensions cannot support three real directions**, say so plainly: report that the existing conventions already determine the approach, and stop. Never pad the list with contrived variants — a user who cannot tell a real choice from a manufactured one stops trusting all of them.

**When exploration finds no existing convention for the requirement to inherit**, say so and stop; this skill has nothing to ground directions in.

**Mixing is allowed.** If the user wants one direction's overall shape with another's error handling, take it — then restate the combined direction in full and get it confirmed before writing anything. A mix understood differently by each side is worse than no mix.

## 5. Record the decision

Write `design.md`.

**Placement**: ask the user where it goes before writing it.

**Contents** — only what will be done:

- The chosen direction as Mermaid, not prose. Name participants after the real modules or files it touches.
  - Each flow that crosses components: a `sequenceDiagram` with an `alt` branch for every failure the requirement implies.
  - Each entity that changes state: a `stateDiagram-v2`.
  - Changes no diagram shows (migrations, configuration, interface shapes): a short list.
- The conventions this work must follow, one line each with its evidence path.
- Nothing else. **Do not write the rejected directions, and do not write their rationale.** A downstream implementing agent reads this file as instructions; describing an approach that is not being taken invites it to be taken.

**If `design.md` already exists**: read it first, then update it — carry forward whatever still holds. Never overwrite it unseen.

## 6. Hand back and stop

Report:

- The chosen direction in a short summary.
- The path to `design.md`.

Then stop. How and with what to implement is the user's call; do not start implementing or name a next command.
