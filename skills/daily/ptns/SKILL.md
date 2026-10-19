---
name: ptns
description: Prompt to new session — hand the current progress to a fresh session as one short prompt, delivered by session-to-session message on Claude Code, or as a copyable block elsewhere.
disable-model-invocation: true
---

# Prompt to New Session

Write a **handoff** prompt: another session starts with nothing but these words. Write for that **cold reader**.

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

Write it in the language the user is using.

- Address the next session directly, in the imperative ("Continue…", "Next, …").
- Keep paths, symbols, and commands exact.
- Redact secrets: replace every API key, password, token, and piece of personal data with a placeholder such as `<API_KEY>`.
- Keep it short: every line is something the next session would otherwise have to rediscover or ask.
- Start with the working directory the next session should be in.
- End with the next step and how to tell it is done.

Done when a cold reader could start the next step without asking a single question.

## 3. Deliver it

First decide which agent is running this skill:

- **Claude Code** — the `ListAgents` and `SendMessage` tools exist. Follow 3a.
- **Anything else** (Codex, agy, or any agent without those tools) — follow 3b.

Do not ask the user which agent they are on; check the tools you actually have.

### 3a. Claude Code — send it to a live session

1. Call `ListAgents` to list the sessions that can be reached.
2. Show the user the reachable sessions as a short numbered list: name, kind, and working directory when known. Leave out this session itself.
3. Ask which one to send to, using `AskUserQuestion` when there are 2–4 choices. Always include a **"Do not send — just show me the prompt"** option; if the user picks it, fall back to 3b.
4. If the list is empty, say so in one line and fall back to 3b.
5. After the user answers, `SendMessage` the handoff prompt to the chosen session, using the name exactly as `ListAgents` printed it. End the prompt with a **synthesis** request: before starting the next step, the receiver sends this session, under the name and `[ref]` from the `This session is …` line `ListAgents` printed, the goal and the next step in its own words, plus every question it has; then it waits for your reply.
6. Reply with one line naming which session it went to and saying you are waiting for its synthesis. Do not reprint the whole prompt.
7. When the synthesis arrives, check it against this conversation. Answer each question that this conversation settled, and correct each misreading, all in one `SendMessage`. Put to the user only the questions this conversation never settled, then pass their answers on in that same message.
8. Done when the receiver has a reply to every misreading and question. Tell the user in one line that the receiver is ready for the next step, and name any decision the user made along the way.

Never send before the user has answered, and never guess the target session.

### 3b. Other agents — hand over a copyable block

Put the whole prompt in one fenced code block so it copies in one go.

Reply with the code block and nothing else, unless something the prompt depends on is uncertain; then add one line after the block naming it.
