---
name: ask-jev
description: Let TypeSafe's Jev settle the open questions a Figma spec leaves, and collect the rest into a questionnaire for the PM.
disable-model-invocation: true
---

# Ask Jev

Reading a Figma design (through figwright or another Figma tool) leaves **Open questions**: points of user experience or behaviour the design does not settle, such as what an empty state shows or what happens on a failed submit. Instead of stopping to ask the PM about each one, put them to **Jev**, TypeSafe's System One model, which picks one of the options you give it and reports how sure it is. Adopt the answers Jev is sure of, and send the rest to the PM in one questionnaire.

Your deliverables are a **Jev ruling** for every Open question, recorded in the project, the code changes the adopted rulings call for, and a questionnaire when anything still needs the PM.

If the user passed an argument, it names the screen or feature in question. Otherwise take the design being implemented in the conversation.

## 1. Check the key

The API key lives in `~/.config/typesafe/typesafe-key.header`, a one-line file of the form `Authorization: Bearer <key>`. Check only that the file exists; its contents stay out of the conversation, so never open, print, or echo it.

When it is missing, tell the user to copy `typesafe-key.header.example` from this skill's folder to that path, replace the placeholder with their key, and run the skill again. Stop there.

Done when the file exists.

## 2. Write the questions

Turn every Open question from the design into one Choice question:

- **One narrow judgment** per question, with enough context in its wording to stand alone: the screen, the component, and the situation.
- **2–4 options** drawn from what the design, the project's existing behaviour, and common UX practice support. Each option is a concrete behaviour a developer could build.
- **`ask_pm`** as a fixed last option, described as: "Only the PM can settle this: it depends on a business rule, a product decision, or information the design and common UX practice do not determine." This lets Jev route questions it cannot answer.

Number the questions Q1, Q2, … . Pick a short kebab-case **topic** for the screen or feature (`checkout-address-form`) and take today's date as `YYYY-MM-DD`. When `jev/record/<topic>-<date>.md` already exists, continue numbering from its highest Q.

Done when every Open question is a numbered question with its options and `ask_pm`.

## 3. Ask Jev

Build one request holding every question. Read `https://docs.typesafe.ai/api.md` for the current contract when a call fails or the shape below looks out of date.

```json
{
  "model": "jev-latest",
  "state": {
    "screen": "<what the screen is for, its main components and annotations>",
    "context": {
      "q1": "<the design facts this question rests on: node id, text, states, nearby components>"
    }
  },
  "questions": {
    "q1": {
      "type": "choice",
      "instructions": "<the question; refer to its context as `context.q1`>",
      "criteria": {
        "<option_id>": "<the behaviour, in one sentence>",
        "ask_pm": "<the fixed ask_pm description>"
      }
    }
  }
}
```

The state holds design facts only: what Figma and the project show, never credentials or personal data. Write the request to a file in the system temp directory, outside the repo, and send it:

```sh
curl -sS https://api.typesafe.ai/v1/systemone \
  -H @"$HOME/.config/typesafe/typesafe-key.header" \
  -H "Content-Type: application/json" \
  --data-binary @"<request file>"
```

The same command runs in zsh, bash, and PowerShell; on Windows call `curl.exe`, so PowerShell's `curl` alias stays out of the way.

The response carries, per question id, `choice`, `probabilities` over every option, and `confidence` from 0 to 1. When the call fails, show the user the status and error body, write nothing, and stop.

Done when every question has an answer.

## 4. Sort the rulings

Each answer gets one outcome:

| Jev's answer | Outcome |
| --- | --- |
| `confidence` ≥ 0.7, choice is not `ask_pm` | **Adopted** |
| 0.5 ≤ `confidence` < 0.7, choice is not `ask_pm` | **Adopted, PM to confirm** |
| `confidence` < 0.5, or choice is `ask_pm` | **PM question** |

Then carry the outcomes into the code you are writing: build each adopted behaviour. Where a PM question blocks a piece, leave that piece out and mark the spot with `TODO(ask-jev <topic> Qn): <the question in a few words>`, and keep building the rest.

Done when every question has an outcome and every PM question that touches code has its `TODO`.

## 5. Record the rulings

Write `jev/record/<topic>-<date>.md` at the repo root (the current directory when there is no repo), appending when it exists. Under a `# <topic> <date>` title, give each question its own entry:

```markdown
## Q1 · <the question>

- Figma node: <node id>
- Options: <option_id>: <behaviour>; …; ask_pm
- Jev (<model from the response>): <choice>, confidence <confidence>
- Probabilities: <option_id> <p>, …
- Outcome: Adopted | Adopted, PM to confirm | PM question
```

Done when every question from this run has an entry.

## 6. Write the questionnaire

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

Each question is one idea, headed `### Qn · <question>` so it matches its record entry and `TODO`, with an answer stub (`>`) directly beneath. Lay out the options Jev weighed as possible answers, and add a one-line _why this matters_ only where the question could be misread or invite a throwaway answer. Leave out a section that has no questions.

Done when every question needing the PM appears exactly once.

## 7. Report

Tell the user, in their language:

- how many questions came out Adopted, Adopted with PM to confirm, and as PM questions
- the paths of the record and the questionnaire
- each `TODO` left in the code, with its file and line

Leave committing to the user.
