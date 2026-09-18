# Behavior-preserving path

The tests are the proof that behavior did not move, so they are green before the first edit and green after the last.

1. **Baseline.** Run the tests that cover the scope on the untouched code. All green is the baseline. A test already red is reported to the user and left out of this refactor.
2. **Close the gaps.** For each coverage gap in the plan, add characterization tests that pin the current behavior, quirks included, and pass on the untouched code.
3. **Refactor** step by step along the plan, rerunning the baseline tests after each step. Their assertions stay as they are; a test changes only when it reached into internals the refactor moved, and it still asserts the same behavior afterwards.
4. **Close** with the full test suite plus typecheck or build.

**Review focus**: behavior drift, such as changed error handling, ordering, defaults, empty or null handling, and side effects.
