---
name: ask-jev
description: Let TypeSafe's Jev settle the Open questions your sources leave, and collect the rest into a questionnaire for the person who decides.
disable-model-invocation: true
---

# Ask Jev

The sources for a piece of work (a design, a spec, a ticket, the code) often leave **Open questions**: judgment calls they do not settle, such as what an empty state shows or what happens on a failed submit. Instead of stopping to ask about each one, put them to **Jev**, TypeSafe's System One model, which picks one of the options you give it and reports how sure it is. Adopt the answers Jev is sure of, and send the rest in one questionnaire to the **Decider**: the one person this run names to settle what Jev cannot, the PM unless the user names someone else.

Your deliverables are a **Jev ruling** for every Open question, recorded in the project; when you are writing code, the code changes the adopted rulings call for; and a questionnaire when anything still needs the Decider.

If the user passed an argument, it names the work or the Open questions in question. Otherwise take the work in progress in the conversation.

When the source is a Figma design, read `references/figma.md` in this skill's folder before step 2: it covers the facts, the state, and the screenshots a design calls for.

Keep this run's working files in one **run folder**: a new folder in the system temp directory, outside the repo, named `ask-jev-<topic>-<date>-<suffix>/`, with the topic and date from step 2 and a short random suffix. Every run creates its own, so an earlier run of the same topic, or a run in another repo, never leaves files in it.

## 1. Check the key

The API key lives in `~/.config/typesafe/typesafe-key.header`, a one-line file of the form `Authorization: Bearer <key>`. Check only that the file exists; its contents stay out of the conversation, so never open, print, or echo it.

When it is missing, tell the user to copy `typesafe-key.header.example` from this skill's folder to that path, replace the placeholder with their key, and run the skill again. Stop there.

Done when the file exists.

## 2. Write the questions

Turn every Open question into one Choice question:

- **One narrow judgment** per question, with enough context in its wording to stand alone: where the question arises and the situation it covers.
- **2–4 options** drawn from what the sources, the project's existing behaviour, and common practice support. Each option is a concrete outcome someone could carry out, such as a behaviour to build or a wording to use, keyed by a short snake_case id.
- **Facts**: what this question rests on, and only this question: what each source says, where it says it, and where the sources disagree.

The packing script in step 4 appends a fixed `ask_decider` option to every question, so Jev can route a question only the Decider can settle; your options are the concrete outcomes alone.

Write the question, its options, and its facts in **English**, the language Jev reads most accurately. Quote source text verbatim in its own language with an English **gloss** in parentheses, `「剩餘」 (remaining)`, so a wording conflict such as 「剩餘」 against 「倒數」 survives translation.

Number the questions Q1, Q2, … . Pick a short kebab-case **topic** for the work (`checkout-address-form`) and take today's date as `YYYY-MM-DD`. When `jev/record/<topic>-<date>.md` already exists, continue numbering from its highest Q.

Done when every Open question is a numbered question with its options and facts.

## 3. Pick the images

Attach an image to a question only when your own judgment on it rests on that image, such as a mockup, a screenshot, or a photo, so Jev judges from what you saw. A question you settle from text alone goes without images.

- Save each image as a PNG or JPEG file in the run folder, from whatever tool shows it. Take **the smallest region that shows the subject**; when the subject is part of a larger image, give a **crop** as well: `[x, y, width, height]` in that file's pixels. Only PNGs can be cropped.
- Give each image its **source**: where it came from, such as a Figma node id, a URL, or a file path.
- Use one image per question; attach a second only when the question compares two things, such as the fill page against the view page.

The packing script checks every image against Jev's size limits and reports any that misses with its question and its size, so you fix that crop.

When no question has an image, the run is **text-only**, and the report says so.

Done when every question has its images listed with path, source, and crop where needed, or has none.

## 4. Pack the requests

Write the **state**, the context every question shares, in English:

- `product`: the product and its audience, in one or two sentences;
- `context`: the work in progress, and how to read the sources;
- any further keys the sources call for, such as what they leave out on purpose (`references/figma.md` lists the keys a design calls for).

Per-question facts stay in that question's facts, so they cost tokens for that question only. The state holds facts only: what the sources and the project show, never credentials or personal data.

Write the **question set** to `questions.json` in the run folder:

```json
{
  "model": "jev-latest",
  "decider": "the PM",
  "state": {
    "product": "<product and audience>",
    "context": "<the work in progress, and how to read the sources>"
  },
  "questions": [
    {
      "id": "q1",
      "question": "<the question>",
      "facts": "<the facts>",
      "options": { "<option_id>": "<the outcome, in one sentence>" },
      "images": [{ "path": "<image file>", "source": "<where it came from>", "crop": [0, 0, 1024, 600] }]
    }
  ]
}
```

`decider` names the Decider by role, such as `"the tech lead"`, and defaults to `"the PM"`. `images` and `crop` are optional; image paths may be relative to `questions.json`. Then run, with Node, from any shell:

```sh
node "<this skill's folder>/scripts/pack-requests.mjs" "<run folder>/questions.json" "<run folder>/out"
```

The script crops the images, checks them against Jev's limits, gives each image a unique reference, estimates tokens, and packs the questions in order into as few requests as fit the budget. It writes `out/crops/`, `out/request-<n>.json` ready to send, and `out/request-<n>.readable.json` with every image replaced by its crop file and source, then prints one **summary line** per request: its question ids, image count, estimated tokens, and how to send it. It writes only into a new or empty folder.

When it fails, it names the question and the problem (an image's size, a question over the budget, a reference found in other text, a missing field) and writes nothing: fix the crop, drop or shrink that question's images, or reword the text, and run it again.

Done when the script has printed a line for every request.

## 5. Ask Jev

Send every `request-<n>.json`, in order. Read `https://docs.typesafe.ai/api.md` for the current contract when a call fails or the request shape looks out of date, and `https://docs.typesafe.ai/images` when an image is refused.

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
| `confidence` ≥ 0.7, choice is not `ask_decider` | **Adopted** |
| 0.5 ≤ `confidence` < 0.7, choice is not `ask_decider` | **Adopted, Decider to confirm** |
| `confidence` < 0.5, or choice is `ask_decider` | **Decider question** |

When you are writing code, carry the outcomes into it: build each adopted outcome. Where a Decider question blocks a piece, leave that piece out and mark the spot with `TODO(ask-jev <topic> Qn): <the question in a few words>`, and keep building the rest.

Done when every question has an outcome and, when you are writing code, every Decider question that touches it has its `TODO`.

## 7. Record the rulings

Write `jev/record/<topic>-<date>.md` at the repo root (the current directory when there is no repo), appending when it exists. Under a `# <topic> <date>` title, give each question its own entry:

```markdown
## Q1 · <the question, in the user's language>

- Source: <where the question arises, such as a Figma node id or a file path>
- Options: <option_id>: <outcome>; …; ask_decider (<the Decider>)
- Images: <crop file name> (<source>), … | none
- Jev (<model from the response>): <choice>, confidence <confidence>
- Probabilities: <option_id> <p>, …
- Outcome: Adopted | Adopted, Decider to confirm | Decider question
```

The record and the questionnaire are for people, so each `Qn` heading gives the question in the user's language, worded the same in both files so the two match each other and any `TODO`. Only the English text goes to Jev.

Beside the record, give this run its own folder `jev/record/<topic>-<date>/run-<n>/`, with `n` the next number not yet taken there, and copy `out/crops/` and every readable request (`out/request-*.readable.json`) into it, so anyone can see afterwards exactly what Jev was given. The `request-<n>.json` files stay in the run folder.

Done when every question from this run has an entry and every readable request and crop it used sits in this run's `run-<n>/` folder.

## 8. Write the questionnaire

Skip this step when no question came out as **Adopted, Decider to confirm** or **Decider question**.

Write `jev/questionnaire/<topic>-<date>-<decider>.md` in the user's language, with `<decider>` the Decider's role in kebab-case without its article (`pm`, `tech-lead`), so each questionnaire goes to one Decider only. When it exists, it is addressed to the same Decider: add the new questions under its existing sections instead. Fill this template:

<questionnaire-template>

# <topic>: open questions

**Purpose:** the sources leave these points open; your answers decide what we do about them.

**From:** <the user>, **To:** <the Decider>, **How your answers will be used:** each answer replaces the matching `TODO` or confirms what we already chose.

## Context

One paragraph orienting a Decider who wasn't in the session: the work, what it is for, and where its sources live.

## How to answer

Deadline: <the user fills this in>. Rough effort: <about a minute per question>. Partial answers and "I don't know" are useful: flag anything you're unsure of rather than skipping it.

## Needs your decision

One question per **Decider question**, most-important-first.

## Please confirm

One question per **Adopted, Decider to confirm**, phrased as "We chose <the adopted outcome>. Is that right?"

## Anything else?

A closing catch-all: anything we didn't ask that we should know?

</questionnaire-template>

Each question is one idea, headed `### Qn · <question>` with the wording of its record heading, with an answer stub (`>`) directly beneath. Lay out the options Jev weighed as possible answers, and add a one-line _why this matters_ only where the question could be misread or invite a throwaway answer. Leave out a section that has no questions.

Done when every question needing the Decider appears exactly once.

## 9. Report

Tell the user, in their language:

- how many questions came out Adopted, Adopted with the Decider to confirm, and as Decider questions
- how many requests were sent and their total input tokens, and that the run was text-only when it was
- the paths of the record, this run's `run-<n>/` folder of crops and readable requests, and the questionnaire, with the Decider it is addressed to
- each `TODO` left in the code, with its file and line

Leave committing to the user.
