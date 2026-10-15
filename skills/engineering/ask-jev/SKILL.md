---
name: ask-jev
description: Let TypeSafe's Jev settle the open questions a Figma spec leaves, and collect the rest into a questionnaire for the PM.
disable-model-invocation: true
---

# Ask Jev

Reading a Figma design (through figwright or another Figma tool) leaves **Open questions**: points of user experience or behaviour the design does not settle, such as what an empty state shows or what happens on a failed submit. Instead of stopping to ask the PM about each one, put them to **Jev**, TypeSafe's System One model, which picks one of the options you give it and reports how sure it is. Adopt the answers Jev is sure of, and send the rest to the PM in one questionnaire.

Your deliverables are a **Jev ruling** for every Open question, recorded in the project, the code changes the adopted rulings call for, and a questionnaire when anything still needs the PM.

If the user passed an argument, it names the screen or feature in question. Otherwise take the design being implemented in the conversation.

Keep this run's working files in one **run folder**: a new folder in the system temp directory, outside the repo, named `ask-jev-<topic>-<date>-<suffix>/`, with the topic and date from step 2 and a short random suffix. Every run creates its own, so an earlier run of the same topic, or a run in another repo, never leaves files in it.

## 1. Check the key

The API key lives in `~/.config/typesafe/typesafe-key.header`, a one-line file of the form `Authorization: Bearer <key>`. Check only that the file exists; its contents stay out of the conversation, so never open, print, or echo it.

When it is missing, tell the user to copy `typesafe-key.header.example` from this skill's folder to that path, replace the placeholder with their key, and run the skill again. Stop there.

Done when the file exists.

## 2. Write the questions

Turn every Open question from the design into one Choice question:

- **One narrow judgment** per question, with enough context in its wording to stand alone: the screen, the component, and the situation.
- **2–4 options** drawn from what the design, the project's existing behaviour, and common UX practice support. Each option is a concrete behaviour a developer could build, keyed by a short snake_case id.
- **Design facts**: what this question rests on, and only this question: the node ids, what the spec note says, what the mockup shows, and where the two disagree.

The packing script in step 4 appends a fixed `ask_pm` option to every question, so Jev can route a question only the PM can settle; your options are the buildable behaviours alone.

Write the question, its options, and its design facts in **English**, the language Jev reads most accurately. Quote on-screen text verbatim in its own language with an English **gloss** in parentheses, `「剩餘」 (remaining)`, so a wording conflict such as 「剩餘」 against 「倒數」 survives translation.

Number the questions Q1, Q2, … . Pick a short kebab-case **topic** for the screen or feature (`checkout-address-form`) and take today's date as `YYYY-MM-DD`. When `jev/record/<topic>-<date>.md` already exists, continue numbering from its highest Q.

Done when every Open question is a numbered question with its options and design facts.

## 3. Pick the screenshots

Give each question the picture of exactly the part of the design it asks about, so Jev judges from what you see:

- Export **the smallest node that shows the subject** (a card, a dialog, a section) with figwright's `save_screenshots` into the run folder. A node export is sharp and needs no cropping.
- When the subject is part of a flat mockup image, or of a node too large for Jev, export the containing node and give a **crop**: `[x, y, width, height]` in that export's pixels.
- Use one image per question; attach a second only when the question compares two screens, such as the fill page against the view page.

The packing script checks every image against Jev's size limits and reports any that misses with its question and its size, so you fix that crop.

When no image export is available (another Figma tool, or figwright not connected), the run is **text-only**: every question gets no images, and the report says so.

Done when every question has its images listed with path, Figma node, and crop where needed, or the run is text-only.

## 4. Pack the requests

Write the **state**, the spec every question shares, in English:

- the product and its audience, in one or two sentences;
- how to read the design: numbered notes and the pointers on the mockup, and whether the mockup is one flat image or real components;
- every screen's Caption box (the numbered spec-notes panel next to a mockup in the Figma file), translated, under its original note numbers and with each screen's node id;
- an explicit list of what the design does not draw, such as empty, error, or loading states.

Per-question facts stay in that question's design facts, so they cost tokens for that question only. The state holds design facts only: what Figma and the project show, never credentials or personal data.

Write the **question set** to `questions.json` in the run folder:

```json
{
  "model": "jev-latest",
  "state": {
    "product": "<product and audience>",
    "how_to_read_the_design": "<notes, pointers, flat image or components>",
    "screens": { "<screen name> (<node id>)": { "<note number> <note title>": "<the note, in English>" } },
    "not_drawn": ["<a state or screen the design does not draw>"]
  },
  "questions": [
    {
      "id": "q1",
      "question": "<the question>",
      "design_facts": "<the design facts>",
      "options": { "<option_id>": "<the behaviour, in one sentence>" },
      "images": [{ "path": "<export file>", "node": "<node id>", "crop": [0, 0, 1024, 600] }]
    }
  ]
}
```

`crop` is optional; image paths may be relative to `questions.json`. Then run, with Node, from any shell:

```sh
node "<this skill's folder>/scripts/pack-requests.mjs" "<run folder>/questions.json" "<run folder>/out"
```

The script crops the images, checks them against Jev's limits, gives each image a unique reference, estimates tokens, and packs the questions in order into as few requests as fit the budget. It writes `out/crops/`, `out/request-<n>.json` ready to send, and `out/request-<n>.readable.json` with every image replaced by its crop file and Figma node, then prints one **summary line** per request: its question ids, image count, estimated tokens, and how to send it. It writes only into a new or empty folder.

When it fails, it names the question and the problem (an image's size, a question over the budget, a reference found in other text) and writes nothing: fix the crop, drop or shrink that question's screenshots, or reword the text, and run it again.

Done when the script has printed a line for every request.

## 5. Ask Jev

Send every `request-<n>.json`, in order. Read `https://docs.typesafe.ai/api.md` for the current contract when a call fails or the request shape looks out of date.

```sh
curl -sS https://api.typesafe.ai/v1/systemone \
  -H @"$HOME/.config/typesafe/typesafe-key.header" \
  -H "Content-Type: application/json" \
  --data-binary @"<run folder>/out/request-<n>.json"
```

A summary line ending in `text only` sends this command as it stands. A summary line ending in `add -H "…"` names a header the request needs: add exactly that `-H` argument to the command. The same command runs in zsh, bash, and PowerShell; on Windows call `curl.exe`, so PowerShell's `curl` alias stays out of the way.

Each response carries, per question id, `choice`, `probabilities` over every option, and `confidence` from 0 to 1, plus `usage.input_tokens`. Merge the answers of every request by question id, and add up the input tokens.

When a call fails, send no further requests: show the user the status, the error body, and the question ids that request held, write nothing, and stop.

Done when every question has an answer.

## 6. Sort the rulings

Each answer gets one outcome:

| Jev's answer | Outcome |
| --- | --- |
| `confidence` ≥ 0.7, choice is not `ask_pm` | **Adopted** |
| 0.5 ≤ `confidence` < 0.7, choice is not `ask_pm` | **Adopted, PM to confirm** |
| `confidence` < 0.5, or choice is `ask_pm` | **PM question** |

Then carry the outcomes into the code you are writing: build each adopted behaviour. Where a PM question blocks a piece, leave that piece out and mark the spot with `TODO(ask-jev <topic> Qn): <the question in a few words>`, and keep building the rest.

Done when every question has an outcome and every PM question that touches code has its `TODO`.

## 7. Record the rulings

Write `jev/record/<topic>-<date>.md` at the repo root (the current directory when there is no repo), appending when it exists. Under a `# <topic> <date>` title, give each question its own entry:

```markdown
## Q1 · <the question, in the user's language>

- Figma node: <node id>
- Options: <option_id>: <behaviour>; …; ask_pm
- Screenshots: <crop file name> (<node id>), … | none
- Jev (<model from the response>): <choice>, confidence <confidence>
- Probabilities: <option_id> <p>, …
- Outcome: Adopted | Adopted, PM to confirm | PM question
```

The record and the questionnaire are for people, so each `Qn` heading gives the question in the user's language, worded the same in both files so the two match each other and the `TODO`. Only the English text goes to Jev.

Beside the record, give this run its own folder `jev/record/<topic>-<date>/run-<n>/`, with `n` the next number not yet taken there, and copy `out/crops/` and every readable request (`out/request-*.readable.json`) into it, so anyone can see afterwards exactly what Jev was given. The `request-<n>.json` files stay in the run folder.

Done when every question from this run has an entry and every readable request and crop it used sits in this run's `run-<n>/` folder.

## 8. Write the questionnaire

Skip this step when no question came out as **Adopted, PM to confirm** or **PM question**.

Write `jev/questionnaire/<topic>-<date>.md` in the user's language. When it exists, add the new questions under its existing sections instead. Fill this template:

<questionnaire-template>

# <topic>: open questions from the design

**Purpose:** the design leaves these points open; your answers decide what we build for them.

**From:** <the user>, **To:** PM, **How your answers will be used:** each answer goes into the code and replaces the matching `TODO` or confirms what we already built.

## Context

One paragraph orienting a PM who wasn't in the session: the screen, what it is for, and where in the Figma file it lives.

## How to answer

Deadline: <the user fills this in>. Rough effort: <about a minute per question>. Partial answers and "I don't know" are useful: flag anything you're unsure of rather than skipping it.

## Needs your decision

One question per **PM question**, most-important-first.

## Please confirm

One question per **Adopted, PM to confirm**, phrased as "We built <the adopted behaviour>. Is that right?"

## Anything else?

A closing catch-all: anything we didn't ask that we should know?

</questionnaire-template>

Each question is one idea, headed `### Qn · <question>` with the wording of its record heading, with an answer stub (`>`) directly beneath. Lay out the options Jev weighed as possible answers, and add a one-line _why this matters_ only where the question could be misread or invite a throwaway answer. Leave out a section that has no questions.

Done when every question needing the PM appears exactly once.

## 9. Report

Tell the user, in their language:

- how many questions came out Adopted, Adopted with PM to confirm, and as PM questions
- how many requests were sent and their total input tokens, and that the run was text-only when it was
- the paths of the record, this run's `run-<n>/` folder of crops and readable requests, and the questionnaire
- each `TODO` left in the code, with its file and line

Leave committing to the user.
