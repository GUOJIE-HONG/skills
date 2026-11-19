---
version: 1
slug: "skills-engineering-why-change-assets-report-css"
primary_target: "skills/engineering/why-change/assets/report.css"
related_targets: ["skills/engineering/why-change/scripts/build-report.mjs"]
---

# why-change Change report

Mode: Read. One HTML report per run, written by the skill's script from the agent's report file. The CSS lives in `assets/report.css`; the markup is written by `scripts/build-report.mjs`.

Audience and job: the person who asked an agent for a bug fix or refactor, reading once, top to bottom, to understand what was wrong, how it changed, why, and what to watch for. Not always an engineer.

Constraints: single offline file, nothing fetched, no script; highlight.js vendored and inlined; light/dark follow the system; zh-TW or English labels; the design is not part of DESIGN.md.

## Direction contract

THESIS: The category standard played straight: a GitHub PR / GitHub Docs page, so there is nothing to learn before reading. Refuses any invented world.

OWN-WORLD: GitHub's Primer palette and system sans (never system-ui), gray subtle bars, 6px radii, green/red diff rows with two line-number columns, blue hunk headers; risks as full-border callouts, amber solid for evidence, gray dashed for 待確認. Kind pills: red bug fix, purple refactor.

STORY: The reader scans the overview table (changes, kinds, risk counts), jumps to a change, reads the four questions in order with the real diff under "how", and leaves knowing which risk to check first.

FIRST VIEWPORT: Sticky subtle top bar (why-change, repo, range, time). Left sticky contents (overview + numbered changes). Main: "Change report" h1, count line, summary table; the first change's heading begins below.

FORM: the category standard (standing exit), chosen by the user over the rolled aviation-investigation direction on re-roll 1; seed: seed:6f8116eb445a4435. Quality bar: GitHub PR Files changed, GitHub Docs, Google SRE postmortem overview table.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- DESIGN.md stays open-course's (same decision as clean-comments); this brief and the CSS record this design.
