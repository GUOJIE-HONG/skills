# When the source is a Figma design

Reading a Figma design leaves Open questions about user experience or behaviour the design does not settle, such as what an empty state shows or what happens on a failed submit. This file adds what a design calls for to steps 2–4 of `SKILL.md`.

## Facts

A question's facts give the node ids of the screen and component it is about, what the spec note says, under its note number, what the mockup shows, and where the two disagree. Its record entry's `Source` is the screen's node id.

## State

Besides `product` and `context`, where `context` names the screen or feature being built, the state of a design run carries:

- `how_to_read_the_design`: the numbered notes and the pointers on the mockup, and whether the mockup is one flat image or real components;
- `screens`: every screen's Caption box (the numbered spec-notes panel next to a mockup in the Figma file), translated, under its original note numbers and with each screen's node id;
- `not_drawn`: an explicit list of what the design does not draw, such as empty, error, or loading states.

```json
"state": {
  "product": "<product and audience>",
  "context": "<the screen or feature being built>",
  "how_to_read_the_design": "<notes, pointers, flat image or components>",
  "screens": { "<screen name> (<node id>)": { "<note number> <note title>": "<the note, in English>" } },
  "not_drawn": ["<a state or screen the design does not draw>"]
}
```

## Screenshots

Export **the smallest node that shows the subject** (a card, a dialog, a section) as a PNG into the run folder, and give its node id as the image's `source`. A node export is sharp and needs no cropping. When the subject is part of a flat mockup image, or of a node too large for Jev, export the containing node and give a crop.

- **figwright**: `save_screenshots` with the node ids and the run folder as `outDir`.
- **The official Figma MCP**: `get_screenshot` with the file key and node id returns a short-lived URL and the `curl` command that downloads the PNG; download it into the run folder. Its `maxDimension` defaults to 1024; keep it at 1568 or below, Jev's largest side.

When neither tool is connected, every question goes without images, and the run is text-only.

In the questionnaire's Context, say where in the Figma file the screen lives.
