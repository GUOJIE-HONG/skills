---
name: ptns
description: Prompt to new session — hand the current progress to a fresh session as one short, copyable prompt.
disable-model-invocation: true
---

# Prompt to New Session

Write a **handoff** prompt: the user pastes it into a fresh session, and that session starts with nothing but these words. Write for that **cold reader**.

If the user passed an argument, it names the focus of the next session; shape the prompt around it.

## 1. Gather the state

Collect from this conversation, and check the environment for anything it can confirm:

- The goal, in one sentence.
- What is done, and how each piece was verified. Mark anything unverified as unverified.
- The current state: branch, uncommitted changes, anything running or half-finished.
- The next step, concrete enough to start on.
- Decisions made and the reason for each, so the next session does not reopen them.
- Dead ends already tried, and gotchas found the hard way.
- The exact files, symbols, and commands the next step touches.

Leave out what the next session can find in one lookup (git log, file contents, `--help`). Keep what it cannot: the reasons, the dead ends, the unwritten conventions.

## 2. Write the prompt

Put the whole prompt in one fenced code block so it copies in one go. Write it in the language the user is using.

- Address the next session directly, in the imperative ("Continue…", "Next, …").
- Keep paths, symbols, and commands exact.
- Keep it short: every line is something the next session would otherwise have to rediscover or ask.
- End with the next step and how to tell it is done.

Done when a cold reader could start the next step without asking a single question.

## 3. Hand it over

Reply with the code block and nothing else, unless something the prompt depends on is uncertain; then add one line after the block naming it.
