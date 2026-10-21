---
version: 1
slug: "ineering-clean-comments-assets-report-css-ee615d70"
primary_target: "skills/engineering/clean-comments/assets/report.css"
related_targets: ["skills/engineering/clean-comments/scripts/build-report.mjs"]
---

# clean-comments report

Mode: Operate. One HTML report per run, written by the skill's script from a findings list. The CSS lives in `assets/report.css`; the markup is written by `scripts/build-report.mjs`.

Audience and job: a developer who just ran `clean-comments`, judging the items the skill could not decide (mismatch, bad name, TODO/FIXME, commented-out code), beside their editor and `git diff`. Read once, then thrown away. Hundreds of items possible.

Constraints: single offline file, nothing fetched; highlight.js vendored and inlined; light/dark follow the system; zh-TW or English labels; native `<details>` rows, no expand-all, no done-state; the design is not part of DESIGN.md.

## Direction contract

THESIS: Each kind of finding is a junction in an airport: a yellow overhead sign states the one decision ahead and how many items wait there; below it, the rows are the routes. Refuses the GitHub-style gray report with colored pill labels.

OWN-WORLD: Signage yellow (#ffcc00) owns every decision band, with sign-black (#0b0b0b) type; black inset squares carry white/yellow drawn pictograms and the row chevrons; the black page header holds repo facts and the four counts. The work area is white rows on surface gray (#e6e6e6); dark mode keeps the yellow bands over a near-black ground. One humanist sans for every label, bold and large where a sign would be; code in a monospace face only.

STORY: The developer reads the counts, scrolls into the first junction, reads its question, opens a row, sees the old comment and the real code with the lines marked, decides, and moves on; the sign above always says which junction they are in.

FIRST VIEWPORT: Black header bar (repo, path, time, four count links). Directly beneath, the first yellow band at full width: pictogram square left, the question large (about 30px bold) with one explanatory line, the count monumental at right (about 84px). Under it, file path headings and one-line rows (chevron square, line range, sentence); the first mismatch row open showing "改之前" and the code. Primary action: open a row.

FORM: Airport yellow wayfinding (catalog challenger wayfinding-cartography-signage-terminal-yellow-wayfinding), chosen by the user over the assigned card-catalog direction (position 6 on the grounded list); seed: seed:ed55aecec9029c8f

Signature interaction: each band is sticky; scrolling into the next kind slides the next sign over the last one, like re-signing at each turn. An empty kind shows its band in gray with 0.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Built state (finish review: ship)

- Each sticky band reads kind name + question at weight 400 (e.g. 註解與程式碼不一致　程式碼是不是有 bug？) + monumental count. Below it, the `.ask` line holds the explanation; at 720px and below the band shows only the kind name and `.ask` carries the bold question too. No kicker above any heading.
- Header: top row (repo, path, time); under it a full-width four-cell count strip (36px yellow tabular numerals, label, down-arrow jump link); 2x2 on phones.
- Latin and digits in Fira Sans (OFL) Latin subset 400/600/700, inlined as base64 WOFF2; CJK uses system faces. The skill must vendor the font files with their OFL license, as open-course does with `rail-font-OFL.txt`.
- Pictograms are 3.2-stroke or filled silhouettes in a black square.
- Detector ignores are file-scoped in `.impeccable/config.json` to `assets/report.css` and `scripts/build-report.mjs`.

## Unresolved

- DESIGN.md stays open-course's (user decision); the documenter step records this design in this brief and the template CSS instead.
