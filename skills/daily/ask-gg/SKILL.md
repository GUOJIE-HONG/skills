---
name: ask-gg
description: Answer how to use this repo's skills, reading the latest version from GitHub.
disable-model-invocation: true
---

# Ask GG

Answer the user's question about the skills in [GUOJIE-HONG/skills](https://github.com/GUOJIE-HONG/skills): which skill fits their situation, how to run it, what it needs first, and what it leaves behind. Your deliverable is the **answer**, given in the conversation.

If the user passed an argument, it is the question. Otherwise take the question about these skills in the conversation.

## 1. Read the skills

The `master` branch on GitHub is the single source of truth, so the answer covers every skill, including ones the user has not installed. Read it raw with `curl -sS` (on Windows call `curl.exe`):

- `https://raw.githubusercontent.com/GUOJIE-HONG/skills/master/.claude-plugin/plugin.json`: its `version`, and its `skills` array, the list of shipped skills.
- `https://raw.githubusercontent.com/GUOJIE-HONG/skills/master/<path>/SKILL.md` for each path in that array, with the leading `./` dropped.
- `https://raw.githubusercontent.com/GUOJIE-HONG/skills/master/README.zh-TW.md` when the question is about installing or updating.

Each `SKILL.md` is **documentation** here: you are reading about the skill to explain it, not running it, so its steps stay unexecuted.

When a fetch fails, tell the user which URL failed and stop.

Done when you hold the version and every listed `SKILL.md`.

## 2. Find what answers it

Match the question against every skill's `description` and body, and pick the skills that serve the user's situation. For each, gather from its `SKILL.md`:

- **when** to reach for it
- **how** to run it: `/<name>`, and what its argument means
- **what it needs first**: files, keys, tools, or other skills. A `$name` that is not in the `skills` array comes from [mattpocock-skills](https://github.com/mattpocock/skills), which the README asks to install first.
- **what it leaves**: files it writes and where, or that its answer stays in the conversation
- its **path** in the repo, so the user can read the source

When two skills could serve, say how they differ and which fits the user's situation.

Done when every claim you will make traces to a `SKILL.md` or the README.

## 3. Answer

Answer in the user's language, shortest form that answers the question: the skill, when, how, what it needs, what it leaves. Close with the version you read, so a user on an older install knows to update.

When no skill fits, say so plainly and name the closest one with how far it falls short. Running a skill stays the user's call.
