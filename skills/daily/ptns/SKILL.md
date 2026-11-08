---
name: ptns
description: Prompt to new session — hand current progress to an existing Claude Code or Codex session, confirm its understanding before it starts, or provide a copyable prompt when messaging is unavailable.
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

Choose the delivery route from the tools actually available:

- **Claude Code** — the `ListAgents` and `SendMessage` tools exist. Follow 3a.
- **Codex** — the `list_threads`, `send_message_to_thread`, `read_thread`, and `wait_threads` tools exist (possibly with a namespace prefix). Follow 3b.
- **Without those session tools** — follow 3c.

Use existing sessions only; creating or forking a session is outside this skill. Codex's subagent collaboration tools are not substitutes for cross-session tools.

### 3a. Claude Code — send it to a live session

1. Call `ListAgents` to list the sessions that can be reached.
2. Show the user the reachable sessions as a short numbered list: name, kind, and working directory when known. Leave out this session itself.
3. Ask which one to send to, using `AskUserQuestion` when there are 2–4 choices. Always include a **"Do not send — just show me the prompt"** option; if the user picks it, fall back to 3c.
4. If the list is empty, say so in one line and fall back to 3c.
5. After the user answers, `SendMessage` the handoff prompt to the chosen session, using the name exactly as `ListAgents` printed it. End the prompt with a **synthesis** request: before starting the next step, the receiver replies to the `from` address on the handoff message it received with the goal and the next step in its own words, plus every question it has; then it waits for your reply.
6. Reply with one line naming which session it went to and saying you are waiting for its synthesis. Do not reprint the whole prompt.
7. When the synthesis arrives, check it against this conversation. Answer each question that this conversation settled, and correct each misreading, all in one `SendMessage`. Put to the user only the questions this conversation never settled, then pass their answers on in that same message.
8. Done when the receiver has a reply to every misreading and question. Tell the user in one line that the receiver is ready for the next step, and name any decision the user made along the way.

Never send before the user has answered, and never guess the target session.

### 3b. Codex — send it to an existing session

1. Use `list_threads` to show reachable sessions, excluding this one: title and working directory when available, with enough of the ID to distinguish duplicate titles. Ask the user to choose, including **"Do not send — just show me the prompt"**. If they choose that option or no other session is listed, follow 3c. Send only after they choose; retain the selected `threadId` rather than resolving its title again.
2. Read the selected thread before sending and retain the message boundary so its old replies cannot be mistaken for this handoff's response. Add a **synthesis** request to the handoff: the receiver must first read the entire handoff, reply in its own thread with the goal and next step in its own words plus every question it has, then end its turn without starting the work and await your explicit go-ahead. If a handoff file is unreadable, it must report that instead of guessing.
3. Send with `send_message_to_thread` to the selected `threadId`, using the size rule below. Tell the user which session it was sent to and that you are waiting for its synthesis; do not reprint the prompt.
4. Use `wait_threads` and `read_thread` to collect the new synthesis from that thread. A successful send, a timeout, or completion of unrelated work is not evidence that the receiver understood this handoff. If it cannot proceed, report the specific blocker instead of claiming readiness.
5. Check the synthesis against this conversation. Answer questions already settled here and correct misreadings; ask the user only about unresolved decisions. Send any consolidated clarification to the same thread, using the same size rule, asking it to confirm its understanding and report remaining questions, then end its turn and wait. Read that reply before proceeding, including confirmation that it read any clarification file. Repeat for unresolved questions or misreadings. Once understanding is confirmed, send a separate, short, explicit go-ahead; do this even when the initial synthesis needs no corrections.
6. Done when the receiver has demonstrated understanding of the handoff and any clarifications, every question and misreading is resolved, and the separate go-ahead has been sent successfully. Tell the user the receiver is ready for the next step, naming any decision made along the way. This confirms the handoff, not completion of the underlying work.

**Message size and files.** Check the tool's current limit for every outgoing message, including clarifications (currently 1,000 UTF-8 bytes for `send_message_to_thread`, not 1,000 characters). Send the full text directly when it fits. Otherwise, write the complete, redacted text, including its reply-and-wait instructions, to a uniquely named UTF-8 file in the system temporary directory, outside the repo. Send its absolute path and a short instruction to read the entire file and follow those instructions, or report a read failure; keep this message within the limit too. Keep the file available throughout the handoff; the receiver's reply must establish that it read the content, not merely that it received a path. A shared working-directory name alone does not establish shared file access.

If delivery fails or the receiver cannot read the file, report the failure and follow 3c with the full text, not just the file path. If delivery is uncertain, inspect the selected thread before retrying; report any remaining uncertainty and do not claim the handoff is complete.

### 3c. Without messaging — hand over a copyable block

Put the whole prompt in one fenced code block so it copies in one go.

Reply with the code block and nothing else, unless something the prompt depends on is uncertain; then add one line after the block naming it.
