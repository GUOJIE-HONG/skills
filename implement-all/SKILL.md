---
name: implement-all
description: Implement a whole spec on one branch, its tickets in parallel sub-agents following design.md, ending in a merge request on the repository's own host.
disable-model-invocation: true
---

# Implement All

You have been provided a spec with tickets describing how to implement it. The goal is one merge request that implements the entire spec on a single branch.

The tickets are a **task graph** with blocking relationships, so there is always a **frontier** of tickets ready to be grabbed.

Communicate with subagents through **context pointers**: the spec, the tickets, `design.md`, research notes, and previous commits. `design.md` sits beside the spec file, or at `.scratch/<feature-slug>/design.md` when the spec lives on an issue tracker; it records the chosen implementation direction and the conventions every implementer follows. Keep messages sparse and let the pointers carry the content.

Run **implementer subagents** in the background for maximum concurrency.

## Steps

1. Read the spec, the tickets, and `design.md`. Read enough to understand the task graph.
2. (optional) Use an **exploration subagent** for the exploration the tickets require: relevant code or external documentation. It saves markdown notes in a directory outside the repo that every later subagent can read, so implementers focus on implementing.
3. Create a branch and a draft merge request on the repository's host, found from `git remote -v`: a pull request on GitHub, a merge request on GitLab, through that host's CLI (`gh`, `glab`). When the spec and tickets live on the same host, link them so merging closes them.
4. Use **implementer subagents** to implement each frontier ticket, each in its own worktree on its own branch, with `$tdd` at the seams the spec agreed on. Treat `design.md` decisions as settled; an implementer that finds one contradicted by the code reports it rather than choosing a new direction.
5. When an implementer completes, merge its work into the merge request's branch with a **merger subagent**.
6. When a merge changes the frontier, start implementers on the newly ready tickets.
7. Once every ticket is complete, run `$code-review` on the branch. Fix everything it raises in a single implementer subagent.
8. Mark the merge request ready for review.
9. Clean up every implementer worktree.

Done when every ticket is merged, the review findings are fixed, and the merge request is ready for review. Report any `design.md` decision an implementer found contradicted.
