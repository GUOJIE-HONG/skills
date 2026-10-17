# Explainer videos

This skill bundles the `am` CLI from [Answer me with HTML](https://github.com/QingYunA/answer-me-with-html). Run it through `scripts/am.mjs`, the same command on Windows and macOS; below, `am` means:

```sh
node "<this skill's folder>/scripts/am.mjs"
```

It keeps the CLI's settings and voice-over cache in the system temp directory, away from any separate answer-me-with-html install, and turns off the CLI's update check, since this copy updates with the skill. Never run `vendor/answer-me-with-html/am.mjs` directly.

## Voice

Before making the first video, tell the user what they will hear. Narration needs `ELEVENLABS_API_KEY` as an environment variable of the shell running `am`; a key limited to Text to Speech is enough. A newly set key reaches only terminals started afterwards: on Windows, set it as a user environment variable; on macOS, export it in `~/.zshrc`. Without the key, a video made on macOS is narrated by the system voice (`say`), and one made on Windows has captions only.

- When the user expects narration, pass `--voice elevenlabs`, so a key the shell cannot see fails the video instead of silently dropping the voice.
- When the user wants no sound, pass `--voice off`.

## The draft

Write each video's draft to a file in the system temp directory with a file-writing tool, then render it to the player page that the section's `video` points to:

```sh
am video "<draft file>" --no-open -o "<system temp>/<lesson id>-section-<N>.html"
```

````markdown
---
title: 為什麼一天有兩次漲潮
lang: zh-TW
---
> Title-card narration (optional).

## 月球拉著海水
```flow
月球 -> 海水: 引力
海水 -> 漲潮: 隆起
```
> 你看，月球的引力會拉動海水。
> 被拉起的[海水]在這一側隆起，就是漲潮。
````

- Set `lang:` to the Course's `language` tag; without it, short Traditional Chinese narration can be read as Simplified.
- One `## ` is one scene: one component, table or list as the picture, and 2–5 narration lines starting with `>` below it, one beat per line. Use 3–6 scenes per video, one or two sentences per line.
- When the Nth narration line plays, the picture shows step N. In `flow`, `er`, `sequence` and `tree` every source line is one step; `timeline`, `limits`, `chart` rows, table rows and list items step by entry. So write the component's lines in the order of the explanation. Extra narration lines come first and show nothing new.
- `[name]` in narration zooms the camera onto the node or actor written with exactly that name and highlights it. A node with the same name in the next scene moves smoothly to its new place, so reuse a name to keep the viewer on one object.
- Narration is spoken: write it as you would explain it face to face, with transitions such as `你看` or `那問題來了`, not as manual prose.
- Video takes no math. Write `theme: 3b1b` in the frontmatter only when the user asks for the dark 3Blue1Brown look.

| Shape of the picture | Component |
|---|---|
| What connects to what, branches | `flow` |
| Messages between actors over time | `sequence` |
| Hierarchy, taxonomy | `tree` |
| Entities and their relations | `er` |
| History, phases | `timeline` |
| A value against its limit | `limits` |
| Numbers compared, over time, or as shares | `chart bar`, `chart line`, `chart pie` |

Syntax of a component: `am help <component>`; the whole video format: `am help video`.

## Reading the output

- `✓ <path>`: the player page is written; its next line names the voice used. Check that the voice is the one you told the user.
- `✗ L<line> … Correct example:`: no page was written. Fix that line as the example shows and render again.
- `STE n warnings`: rewrite the flagged narration lines as suggested and render again, at most twice.

To change a video, edit its draft and render again to the same `-o` path; the page is overwritten in place.
