---
name: impl
description: Implement a piece of work from a spec or tickets in the current session, following the direction recorded in design.md.
disable-model-invocation: true
---

# Impl

Implement the work the user points at: a spec, one or more tickets, or a description.

1. Read the spec and tickets, then `design.md`: it sits beside the spec file, or at `.scratch/<feature-slug>/design.md` when the spec lives on an issue tracker. It records the chosen implementation direction and the conventions to follow, each with an evidence path. Treat its decisions as settled, and raise any that the code contradicts with the user.
2. Use `$tdd` where possible, at the seams the spec agreed on.
3. Run typechecking and single test files as you go, and the full test suite once at the end.
4. Run `$code-review` on the work and fix what it finds.
5. Commit to the current branch.
