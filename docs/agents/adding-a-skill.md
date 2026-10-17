# Adding a skill and releasing

## Adding a skill

- A skill lives in `skills/<category>/<name>/` with `SKILL.md` and `agents/openai.yaml`; copy the shape of a sibling.
- Register its path in the `skills` list of `.claude-plugin/plugin.json`. That list is the skill index: `ask-gg` reads it from `master`, so neither README lists skills. The READMEs cover installation only.
- Tests go in `tests/<name>/`, outside the skill folder, so installing the skill does not copy them. Run every skill's tests with `node --test` from the repo root.
- A skill that writes pages for people to read: before release, open one real output in a browser and read it, in Chinese on Windows. The tests check that pages build, not that they read well. Claude in Chrome cannot open `file://`; serve the folder with `python -m http.server` and stop the server afterwards.

## Releasing

1. Bump `version` in `.claude-plugin/plugin.json`, the only file that holds it. A new skill bumps the minor version; ask the user when unsure.
2. Add the entry at the top of `CHANGELOG.md`, in English, written for someone using the skill.
3. Open a PR from `develop` to `master`.
4. After the user merges it: `gh release create vX.Y.Z --target master`, with notes in Traditional Chinese like the earlier releases. `--target` rejects a short commit SHA.
