---
name: sib
description: Say it back — restate the user's goal and the problem they are solving in your own words, then wait for them to confirm before any work.
disable-model-invocation: true
---

# Say It Back

Play back your understanding before the work starts, so the user can catch where you and they diverge. Your deliverable is the **playback**, given in the conversation.

If the user passed an argument, it is the request to restate. Otherwise restate the request currently in play.

## 1. Separate the ask from the goal

Work from the conversation and what the user pointed to. Open a file only when the request names it and its meaning depends on it.

Pull apart three things:

- the **ask**: what the user literally requested
- the **goal**: what is true for the user once this is done
- the **problem**: what is wrong or missing today, the reason the goal matters

The ask is often a means to the goal. When it is, the gap between them is an **XY problem** waiting to happen, and naming it is the most useful thing the playback can do.

## 2. Play it back

Write in the language the user is using, labels included. Use your own words: copied phrasing hides a misunderstanding, recast phrasing exposes it.

- **Goal**: one or two sentences, what done looks like. When the ask differs from the goal, name both: "You asked for X; what it serves is Y."
- **Problem**: one or two sentences, what hurts now.
- **Unsure**: each thing you could not tell, one short line each. Write "none" when nothing is.

End each sentence under Goal and Problem with its basis: a short quote of the user, a `path:line`, or `(inferred)`.

Close with one line asking whether this is right.

Done when every sentence under Goal and Problem carries a basis.

## 3. Wait for the verdict

End the turn on the playback; the task waits for the user.

- The user corrects it: revise and play back the whole thing again, so they confirm one complete picture.
- The user confirms: the confirmed goal and problem are the reference for the work that follows. If Unsure still holds points that would change how the work is done, say so in one line and suggest `$torture-gently`.
