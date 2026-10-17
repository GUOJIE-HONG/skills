---
name: open-course
description: The pages the open-course skill builds (Syllabus, Handout, Slides), set as a film cutting bench.
colors:
  bench: "#0c0b0a"
  bench-line: "#2c2824"
  bench-ink: "#ece6da"
  bench-muted: "#a39a8c"
  tape: "#e8620c"
  tape-fold: "#9c3d08"
  tape-ink: "#120a04"
  tape-deep: "#a8410a"
  paper: "#f5f1ea"
  paper-2: "#ebe5d9"
  ink: "#1a1714"
  muted: "#5f574d"
  line: "#d9d1c3"
  tint: "#fbe6d3"
typography:
  display:
    fontFamily: "Rail, Segoe UI, Noto Sans TC, Noto Sans CJK TC, Microsoft JhengHei, PingFang TC, -apple-system, sans-serif"
    fontSize: "clamp(2.25rem, 1.1rem + 3.6vw, 4.25rem)"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "0.01em"
  numeral:
    fontFamily: "Rail, Bahnschrift, Arial Narrow, Microsoft JhengHei, PingFang TC, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.02em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Rail, Segoe UI, Noto Sans TC, Noto Sans CJK TC, Microsoft JhengHei, PingFang TC, -apple-system, sans-serif"
    fontSize: "clamp(1.75rem, 1.25rem + 1.6vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "Segoe UI, Noto Sans TC, Noto Sans CJK TC, Microsoft JhengHei, PingFang TC, -apple-system, sans-serif"
    fontSize: "1.4rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.02em"
  body:
    fontFamily: "Segoe UI, Noto Sans TC, Noto Sans CJK TC, Microsoft JhengHei, PingFang TC, -apple-system, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.9
    letterSpacing: "0.02em"
  body-ui:
    fontFamily: "Segoe UI, Noto Sans TC, Noto Sans CJK TC, Microsoft JhengHei, PingFang TC, -apple-system, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: "0.02em"
  label:
    fontFamily: "Rail, Bahnschrift, Arial Narrow, Microsoft JhengHei, PingFang TC, sans-serif"
    fontSize: "1.15rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.02em"
    fontFeature: "tnum"
  meta:
    fontFamily: "Segoe UI, Noto Sans TC, Noto Sans CJK TC, Microsoft JhengHei, PingFang TC, -apple-system, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 400
    lineHeight: 1.65
  code:
    fontFamily: "Consolas, Cascadia Mono, Menlo, monospace"
    fontSize: "0.88em"
    letterSpacing: "0"
rounded:
  none: "0px"
spacing:
  rail-gap: "4px"
  rail-pad: "20px"
  gutter: "clamp(1rem, 3vw, 3rem)"
  inset: "max(clamp(1rem, 3vw, 3rem), (100% - 84rem) / 2)"
  window-pad: "clamp(1.25rem, 4vw, 3.25rem)"
  section-gap: "3.25rem"
components:
  rail-cell:
    backgroundColor: "{colors.tape}"
    textColor: "{colors.tape-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.2rem 0.4rem"
    height: "3rem"
  rail-cell-seen:
    backgroundColor: "{colors.bench}"
    textColor: "{colors.tape}"
  rail-cell-current:
    backgroundColor: "#f5f1ea"
    textColor: "#1a1714"
  resume:
    backgroundColor: "{colors.tape}"
    textColor: "{colors.tape-ink}"
    rounded: "{rounded.none}"
    padding: "0.35rem 0.85rem"
  resume-hover:
    backgroundColor: "#f07a2c"
  window:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "{spacing.window-pad}"
  objectives:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.ink}"
    padding: "1rem 1.25rem"
  answer-toggle:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.tape-deep}"
    rounded: "{rounded.none}"
    padding: "0.1rem 0.8rem"
  answer-toggle-open:
    backgroundColor: "{colors.tape}"
    textColor: "{colors.tape-ink}"
  pager-button:
    backgroundColor: "{colors.bench}"
    textColor: "{colors.bench-ink}"
    rounded: "{rounded.none}"
    size: "2.25rem"
  sources-panel:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.muted}"
    padding: "1.5rem"
---

# Design System: open-course

Scope: only the pages the `open-course` skill builds (`skills/learning/open-course/`): the Syllabus (`index.html`), and per Lesson a Handout and Slides. Every rule below is evidenced by `assets/course.css`, `assets/rail.js`, `assets/progress.js`, `assets/slides.js`, `assets/rail.woff2`, and the page markup in `scripts/build-course.mjs`.

## Overview

**Creative North Star: "The Cutting Bench"**

A Course is a strip of film laid on an editor's bench. The bench is near-black and owns the frame on every page, in both colour modes. The Lessons run along one perforated orange rail as numbered frames; on Slides the same rail carries the slides. Reading happens only inside paper windows punched into the bench, so the long-form text always sits on a calm, warm surface, never on the dark.

State is a mark, not a hue. A paper-filled frame is where you are (or where you last stopped), an inked frame is one opened before, an outlined frame is not opened yet; a folded tape flag tags the marked frame. Numbers are the system's display voice: frame numbers, citation markers, exercise counters, and the slide count all set in one condensed grotesk, while CJK text falls to the system sans.

The pages are dense but quiet: a 30-Lesson Course fits one rail row at 1440px and a two-column contents list, and a Handout reads at a 48rem measure with generous leading. The world refuses the course-platform card grid and the endless document scroll.

**Key Characteristics:**
- Bench black frames every page in both modes; only the paper windows flip in dark mode.
- One perforated orange rail is the navigation on all three page types.
- Square everything: no corner radius anywhere a reader can touch.
- Flat by default: depth comes from bench, rail, and paper planes, not shadows.
- Numerals in the embedded condensed face; CJK in the system sans; no web fetch.

## Colors

A near-black bench, one saturated grain-orange tape, and warm paper; every neutral leans warm (hue ~65–85 in OKLCH).

### Primary
- **Grain Tape Orange** (`tape`): the rail's body, the resume button, the open answer toggle, the 2rem strip above each Handout section heading, `::selection`, focus rings, and the arrival flash on a cited Source. It is the only saturated colour on the bench.
- **Tape Ink** (`tape-ink`): text and outlines that sit on the tape (rail numerals, resume label, open toggle).
- **Folded Tape** (`tape-fold`): the shaded underside of the tape flag and the Syllabus ribbon; also the thumb of a sideways-scrolling rail.

### Secondary
- **Deep Tape** (`tape-deep`): the orange that lives inside the paper window, darkened to clear 4.5:1 on paper (5.45:1). Frame numbers, exercise counters, Source list markers, the Handout/Slides links on the Syllabus, the answer toggle at rest, link hover, bullet markers on Slides. In dark mode it lifts to `#f08a45` (7.0:1 on dark paper).

### Neutral
- **Bench** (`bench`): page ground on every page, both modes. Also the fill of a seen rail cell and the perforation holes.
- **Bench Line** (`bench-line`): the pager button outline and the page scrollbar thumb.
- **Bench Ink** (`bench-ink`): titles, facts, and crumbs set directly on the bench.
- **Bench Muted** (`bench-muted`): fact labels, secondary crumbs, contents links on the bench (7.1:1).
- **Paper** (`paper`): the reading window: Syllabus list, Handout text, each slide.
- **Paper 2** (`paper-2`): the recessed second paper: Sources panel, exercise answers, inline `code`, video placeholder.
- **Ink** (`ink`) and **Muted** (`muted`): running text and secondary text inside the window.
- **Line** (`line`): 1px rules between Syllabus frames, exercises, and above the Lesson nav.
- **Tint** (`tint`): the warm wash behind the objectives box, the hovered answer toggle, and a Source settled after a citation jump.

**Dark mode** (`prefers-color-scheme: dark`) redefines only the window tokens: paper `#1c1916`, paper-2 `#25211d`, ink `#d6cfc2`, muted `#9a9184`, line `#38322b`, tint `#2f2117`, tape-deep `#f08a45`. Bench, bench-*, tape, tape-fold, and tape-ink keep their values.

### Named Rules
**The Bench Stays Rule.** Dark mode dims the paper window and nothing else. The bench and the rail are the same in both modes; the current rail cell is hard-set to light paper (`#f5f1ea` on `#1a1714`) so it still reads as a lit frame on the tape in dark mode.

**The One Tape Rule.** Orange is the only hue. On the bench it is `tape`; inside a window it is `tape-deep`. Never introduce a second accent; distinguish states by fill, outline, and flag instead.

**The Soft Ink Rule.** Text on a dark surface is a step softer than white (`bench-ink`, dark-mode `ink` `#d6cfc2`), because near-white on near-black glares over a long read.

## Typography

**Display / Numeral Font:** Rail (Barlow Condensed 600, Latin subset, OFL), embedded as a base64 `@font-face` in every page; fallback `Bahnschrift, Arial Narrow`.
**Body Font:** the system sans stack `Segoe UI, Noto Sans TC, Noto Sans CJK TC, Microsoft JhengHei, PingFang TC, -apple-system, sans-serif`.
**Code Font:** `Consolas, Cascadia Mono, Menlo, monospace`, for inline `code` only.

**Character:** a tall condensed grotesk for every numeral, the way edge numbers are printed on film stock, against a plain, highly legible CJK-first sans for reading. Headings that mix both (`30 天自學`) set their Latin and digits condensed and their CJK in the sans, from one `font-family: "Rail", var(--sans)` declaration.

### Hierarchy
- **Display** (700, `clamp(2.25rem, 1.1rem + 3.6vw, 4.25rem)`, 1.12, max 16em): the Course title in the Syllabus masthead, on the bench.
- **Numeral** (Rail 600, 2.25rem, 1, tabular): frame numbers in the Syllabus list. The Handout and title-slide number scales to `clamp(3.25rem, 2.2rem + 3vw, 5rem)` at line-height 0.8, sitting beside the title.
- **Headline** (700, `clamp(1.75rem, 1.25rem + 1.6vw, 2.5rem)`, 1.25): the Lesson title on a Handout and title slide.
- **Title** (700, 1.4rem, 1.3): Handout section headings; Syllabus Lesson titles at 1.25rem/1.4; slide headings at 1.6em.
- **Body** (400, 1.125rem, 1.9, max 48rem column): Handout running text; 1.0625rem/1.85 below 640px. Page default is 1.0625rem/1.75. Letter-spacing 0.02em throughout, which opens CJK slightly for long reads.
- **Label** (Rail 600, 1.15rem, 1, tabular): rail cells (1rem on Handout, 1.25rem on Slides, up to 1.6rem on the Syllabus); the slide count; citation markers at 0.62em.
- **Meta** (400, 0.875–0.95rem, 1.65): topics, frame actions, crumbs, facts, the Sources panel.

### Named Rules
**The Edge Number Rule.** Every numeral that counts or locates (Lesson, slide, exercise, citation, Source marker, Course scope) sets in Rail with tabular figures. Numbers are padded to the width of the largest (`01`–`30`, but `1`–`9`).

**The No system-ui Rule.** CJK text never resolves through `system-ui`: on Windows in Chinese it falls back to PMingLiU, a thin serif that tires the eyes. Use the named sans stack. This is a product constraint, not taste.

**The Embedded Face Rule.** The only non-system face is Rail, inlined as a data URI so every page renders its numerals offline. Never link a web font or CDN; never extend Rail to CJK.

## Layout

Three planes stack top to bottom: bench (masthead or crumb bar), rail, paper window(s).

- **Edges:** `--gutter` (`clamp(1rem, 3vw, 3rem)`) is the side margin everywhere. On the Syllabus the masthead, rail, and window all start at `--inset` (the gutter, or centred at 84rem max), so their left edges align.
- **Syllabus:** masthead grid `title | facts` (single column under 760px). The rail is a wrapping grid of `minmax(2.75rem, 1fr)` cells (2.5rem from 1200px) so every Lesson stays visible at any width; 30 fit one row at 1440px. The window holds a two-column list (`columns: 2 26rem`, gap 3rem) that fills down the first column then the second, like a printed contents page.
- **Handout:** from 1100px, three columns `12rem contents | 48rem text | 15–21rem Sources`, with contents and Sources sticky at `top: 1.5rem`. Below 1100px the contents become a sideways-scrolling strip on the bench and Sources follow the text. Below 640px the window goes edge to edge.
- **Slides:** without script, slides stack at 72rem max. With `slides.js`, the page locks to `100dvh` as `crumb bar | one slide | rail`, the slide fills the space with type at `clamp(1.25rem, 0.8rem + 1.7vw, 2.5rem)` and content capped at 42em.
- **Rail strip on Handout and Slides:** one row that scrolls sideways rather than wrapping; script centres the marked cell.
- **Rhythm:** tight inside a group (rail gap 4px, frame action gap 0.25rem × 1.1rem), generous between groups (3.25rem above a Handout section heading, 0.9rem below; 3.5rem above the Lesson nav).
- **Breakpoints:** 640px (phone), 760px (masthead stacks), 1100px (three-column Handout), 1200px (denser Syllabus rail).

## Elevation & Depth

Flat. Depth is three opaque planes in a fixed order: bench below, tape rail across, paper windows on top. No surface casts a shadow. The second paper (`paper-2`) recesses a panel inside or beside the window by tone alone. The one `box-shadow` in the system is a zero-blur spread on a targeted Source (`0 0 0 0.35rem var(--tint)`) that extends its highlight past the text box; it is a highlight bleed, not elevation.

### Named Rules
**The Three Planes Rule.** Bench, tape, paper, in that order; never a card floating on paper, never a shadow to lift something. A new surface is either a window (paper), a recess (paper-2 or tint), or a mark on the tape.

## Shapes

Square film geometry. Windows, rail cells, buttons, the objectives box, answers, and badges all have 0 radius. Rail cells carry a 1.5px outline; outlined toggles carry a 1.5px border in their own colour. The only curved form is the sprocket hole, baked into the perforation image (10×6 rounded rect, rx 1.5, repeated every 20px along both edges of the rail). Two clipped forms mark position: the tape flag (a 0.9rem corner folded back in `tape` over `tape-fold`, on the current Handout/Slides cell) and the Syllabus ribbon (a `tape-fold` swallowtail hanging from the last-opened cell's top edge).

### Named Rules
**The Square Frame Rule.** Nothing a reader touches is rounded. The sprocket hole is the world's own material and the only exception.

## Components

### Rail
The signature component, the same perforated strip on all three pages.
- **Body:** `tape` with two rows of `bench` sprocket holes along top and bottom edges, padding 20px × gutter.
- **Cell (not opened):** 1.5px outline in tape-ink at 45%, Rail numeral bottom-left in `tape-ink`; hover washes tape-ink at 14%.
- **Seen:** filled `bench`, numeral in `tape` (on the Syllabus, set by `progress.js` from the Syllabus's own `localStorage`; on Slides, every slide before the current one; a Handout's rail marks only its own Lesson).
- **Current / last opened:** filled light paper with dark ink in both modes, plus the tape flag (Handout, Slides) or ribbon (Syllabus).
- **Focus:** 3px `bench` outline at 1px offset. Background transition 0.2s on the system ease.
- **Without script or storage:** cells render unmarked; the rail still links every Lesson or slide.

### Buttons
- **Resume (Syllabus):** `tape` fill, `tape-ink` 600 label, square, padding 0.35rem × 0.85rem; hover lightens to `#f07a2c`. Hidden until `progress.js` knows a last-opened Lesson; reads "上次讀到　第 13 課：…".
- **Pager (Slides):** 2.25rem square (2.75rem under 640px), 1.5px `bench-line` outline, `bench-ink` drawn SVG chevron (stroke 2); hover turns border and icon `tape`. Shown only once `slides.js` runs.
- **Answer toggle (Exercises):** a `<summary>` set as an outlined tag, 1.5px `tape-deep` border and label; hover adds `tint`; open fills `tape` with `tape-ink`. Native `<details>`, no script.

### Windows / Containers
- **Window:** `paper` fill, `ink` text, square, padding `clamp(1.25rem, 4vw, 3.25rem)` on a Handout. The only surface that carries running text.
- **Objectives:** `tint` wash, 1rem × 1.25rem padding, a bold title line then a bulleted list.
- **Sources panel:** `paper-2`, 1.5rem padding, 0.875rem/1.65 `muted` text, Rail markers in `tape-deep`, URLs break anywhere.
- **Exercise answer:** `paper-2` block under the open toggle.

### Syllabus frame
A Lesson entry in the contents list: Rail numeral in a 3.25rem column, then the title (1.25rem), its section topics joined by middle dots in `muted` (clamped to one line on phones), then Handout and Slides links in `tape-deep` 600, an exercise count, and a native `<details>` for objectives with a border-drawn chevron that turns down when open. 1px `line` rule above each frame. The last-opened frame's numeral sits on a `tape` block. A "影片" tag (Rail/sans 600 0.72rem, `tape` fill) follows any topic with an Explainer video.

### Navigation
- **Crumb bar:** Course title (`bench-ink`, 600) then the sibling page (Slides or Handout) in `bench-muted`; hover `tape`.
- **Contents (Handout):** on the bench; `bench-muted` links, hover `bench-ink`; a small `tape` Rail heading names the column from 1100px.
- **Lesson nav:** two links at the window's foot, Previous left and Next right (stacked under 640px); each names its direction in a small `tape-deep` line above the Lesson title. At either end of the Course the missing side links back to the Syllabus.

### Section heading (Handout)
Each section `h2` opens with a strip of tape: a 2rem × 4px `tape` bar 0.8rem above the heading.

### Citation
A superscript Rail marker `[n]` at 0.62em in `muted`, hover `tape-deep`, linking to `#source-n`. Arriving at a Source flashes it `tape` with `tape-ink` text, then settles to `tint` over 1.4s on `cubic-bezier(0.16, 1, 0.3, 1)`; reduced motion skips the flash. On Slides, markers link to the Handout's Source entry.

## Do's and Don'ts

### Do:
- **Do** keep bench black (`#0c0b0a`) as the page ground on every page in both modes, and flip only the window tokens in dark mode.
- **Do** put every Lesson (or slide) on one perforated rail and mark position with fill and flag: paper = here, bench = seen, outline = not yet.
- **Do** set every counting or locating numeral in Rail 600 with tabular figures, padded to the widest number.
- **Do** keep running text inside a paper window at a 48rem measure with 1.9 line-height.
- **Do** use `tape` on the bench and `tape-deep` inside the window, so orange text clears 4.5:1 on paper.
- **Do** fold Exercise answers in native `<details>`, and keep Slides fully readable with script off.
- **Do** theme the browser surfaces from the palette: `::selection` in tape, 2px `tape` focus ring at 2px offset, bench scrollbars.
- **Do** ship every page as one file that fetches nothing: CSS, script, and the Rail face inlined.

### Don't:
- **Don't** use `system-ui` anywhere in a font stack; CJK on Windows would fall to PMingLiU.
- **Don't** link a web font, CDN, or any network asset; don't extend Rail beyond Latin and numerals.
- **Don't** round corners on windows, cells, buttons, or panels; the sprocket hole is the only curve.
- **Don't** add shadows for depth or float cards on the paper; use the three planes.
- **Don't** introduce a second accent hue or signal state by colour change alone.
- **Don't** set paragraphs, claims, or Sources on the bench; the bench carries titles, facts, crumbs, and navigation only.
- **Don't** add a small label above a heading; the heading carries its own weight. The tape strip above a section heading is a mark, not text.
- **Don't** turn the Syllabus into a card grid or a single long scroll; it is the rail plus a two-column contents list.
