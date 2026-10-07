# Behavior-changing path

1. **Test first.** Use `$tdd` for each behavior the plan changes: a red test for the new behavior, then the code that turns it green.
2. **Old tests.** Update a test that asserts the old behavior only where the plan says that behavior changes. Any other test turning red is a regression to fix.
3. **Breaking changes.** Update every caller and contract the plan lists in the same change. Keep a compatibility path only where the plan calls for one.
4. **Close** with the full test suite plus typecheck or build.

**Review focus**: the new behavior matches the plan, and nothing outside the plan's scope changed behavior.
