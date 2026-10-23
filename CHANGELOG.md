# Changelog

## 1.8.1

- `implement-small-change`: on hidden scope it still pauses and writes the impact brief, but no longer tells you to run `/grill-softly`. It asks you to resolve the open decisions with whichever grilling or planning skill you use, such as `grill-with-docs`.

## 1.8.0

- New skill `clean-comments` under `engineering/`: it rewrites the comments that already exist in a repo, or under a path you give, so each says only what the code is for, and lists in an HTML report what only you can decide. A comment is rewritten when it sends the reader elsewhere (a document, spec section, ticket, meeting, or date), says something the code does not do, records history or discussion, or refers vaguely to other code. The new comment is written from the code alone, never from the documents it pointed to, as short as it can be and in its original language; a doc comment that only restates a name and a pointer to other code such as `<see cref>` or `{@link}` are kept. It changes comments only: no code, no names, no new comments. Generated and third-party files (`Migrations/`, `*.Designer.cs`, `*.pb.go`, `node_modules/`, `vendor/`, license-headed files) are skipped. It stops first when the repo has uncommitted changes, and never commits, so you review every rewrite with `git diff`. Four things go to the report instead of being decided for you: a comment that disagreed with its code (rewritten to match, with the old comment shown, since the code may be the bug), an unclear name, a `TODO`/`FIXME`, and commented-out code. A bundled script, `scripts/build-report.mjs` (Node 20 or later), builds the report from a findings file the agent writes, reading the code from the files itself so what you judge is the real code; it refuses a findings file with problems, listing every one, and writes nothing. The report is one offline HTML file in the system temp folder, named after the repo and the run time: each kind of finding gets a sticky yellow sign stating the decision and its count (a kind with none is shown with 0), items are grouped by file, and each row opens to the method it belongs to, syntax-highlighted with a bundled highlight.js (BSD-3-Clause) at build time, with line numbers and the finding's lines marked. Its interface is in Traditional Chinese or English, following most of the comments it read; it follows the system's light or dark mode, works at phone width, and embeds a Latin subset of Fira Sans (OFL) for letters and digits. The report contains no script. User-invoked only.
- `GLOSSARY.md`: adds Outside reference.

## 1.7.4

- `open-course`: the Course project now goes to `<topic>/` under the current folder, not `courses/<topic>/`. Run it inside the folder you keep Courses in and the Course lands right there, without an extra `courses/` level. Naming another path works as before, and a folder that already exists still stops the run.

## 1.7.3

- `ptns`: on Claude Code, a handoff no longer ends when the prompt is sent. The prompt now asks the receiving session to send back, before it starts, the goal and the next step in its own words plus every question it has, replying to the `from` address on the handoff message, which reaches the sending session on any Claude Code version with session messaging, even when two sessions share a name. The sending session checks that synthesis against its own conversation, corrects each misreading, and answers every question the conversation already settled, in one message; only questions the conversation never settled come to you, and your answers go back in that same message. It then tells you in one line that the receiver is ready, naming any decision you made along the way. Before, a detail lost in a large handoff surfaced later as a surprise question in the new session, about something already decided. Other agents, such as Codex, still get the copyable block, unchanged.

## 1.7.2

- `open-course`: a point no Source backs, and none contradicts, no longer drops out of the Course. It is now an Unverified point, listed on its Lesson's Handout in its own section between the Exercises and the Sources, with a note that no credible Source read for the Course backs it, and linked from the Handout's contents; a Lesson with none shows no such section. Handout text, Exercises, Slides, and Explainer videos still say only what the Sources back, and a point a Source contradicts is corrected or dropped, never listed. The Syllabus and Slides show neither the points nor their number. In the course data file, the top-level `evidenceGaps` is replaced by an optional `unverifiedPoints` list of strings on each Lesson, and a blank or non-text point is refused naming its Lesson and number. A claim that cites no Source is now refused with a pointer to make it an Unverified point. A successful build prints how many Unverified points the Course holds, and the skill ends by reporting them Lesson by Lesson. In `GLOSSARY.md`, Evidence gap now belongs to `cloud-architect` only, and Unverified point is added.

## 1.7.1

- `open-course`: the pages have a new look. Every page is set on a black bench with the Lessons as numbered frames on one perforated orange rail, and the reading happens in a paper-coloured column. The Syllabus shows the whole rail at once, every Lesson in view on a phone too, so a 30-Lesson Course is one click from any Lesson instead of a long scroll; below it, a compact two-column list gives each Lesson's sections and links, with its objectives folded until opened. Each Handout shows the rail with its own Lesson marked, reads in three columns on a wide screen (contents, text, Sources beside the text), and ends with links to the previous and next Lesson. Slides show the rail along the bottom with the current slide marked; its frames jump to a slide, and the address remembers which slide you are on. The browser remembers which Lessons you opened, on that device only, and the Syllabus marks them and offers to take you back to the last one. Exercise answers still fold without script, light and dark mode are both supported, and pages still load nothing from the network: the condensed face for numbers (Barlow Condensed, OFL) is embedded in each page.
- `open-course`: Explainer videos no longer need the `answer-me-with-html` skill. The skill now bundles that project's MIT-licensed `am` CLI (upstream commit 7e71bc0, version 0.5.5) under `vendor/answer-me-with-html/` with its licenses, and its own video guide in `references/video.md`. Videos are made with `node scripts/am.mjs`, the same command on Windows and macOS; it keeps the CLI's settings in the temp directory and never checks GitHub for updates, so a separate answer-me-with-html install and its settings do not affect the videos. Narration still needs `ELEVENLABS_API_KEY`; without it, macOS narrates with the system voice and Windows shows captions only. When narration is expected, a key the shell cannot see now fails the video instead of silently dropping the voice. An embedded video now fills the width of the Handout's text column instead of sitting between black bars, its frame sized to leave room for the player's controls.

## 1.7.0

- New skill `open-course` under a new `learning/` category: give it a topic and it builds a Course project you can teach from, where every factual claim cites a Source read while building it. It first asks for whichever of the learners, their level, and the total length you left out, since a wrong guess there reshapes the whole Syllabus. It then researches, accepting primary works and credible secondary ones (university course material, well-known textbooks, signed and edited media) but not blogs without a named author, forum replies, or AI-generated content, and citing only what it opened and read in this run, never what it only remembers. A fetched page is treated as data; one that gives instructions backs nothing and is reported. A point no Source backs stays out of the Course and is reported as an Evidence gap. It drafts the Syllabus in the conversation, marking sections hard to follow from prose as suggested for an Explainer video, and writes no Lesson until you confirm the structure and the video picks. A bundled script, `scripts/build-course.mjs`, needing only Node 20 or later, builds the pages from one course data file: `index.html` (the Syllabus) and, per Lesson, a Handout whose citation markers link to its Source list and whose Exercises end it with answers folded until opened, plus Slides drawn from that Handout that change with the arrow keys or Page Up/Down and open offline. Every page is a single HTML file that loads nothing from the network, in light and dark mode. The script refuses the whole Course when a claim, an Exercise answer, or a slide point cites no Source or an unlisted one, when a slide cites a Source its Handout does not, when a Source lacks its author, URL, or read date, or when a confirmed video file is missing; it lists every problem with where it sits, writes nothing, and never builds over an existing folder. The Course project goes to `courses/<topic>/` under the current folder unless you name another path. Explainer videos are made with `am video` from [answer-me-with-html](https://github.com/QingYunA/answer-me-with-html), narrate only what the Lesson's Sources back, and are embedded in the Handout at the section they explain; without that skill the Course is built without videos, and without an ElevenLabs key videos on Windows carry captions but no voice. User-invoked only.
- `GLOSSARY.md`: adds Course, Syllabus, Lesson, Handout, Slides, Exercise, Source, Explainer video, and Course project; Evidence gap is now shared across skills.
- `ask-jev`: the packing script's tests moved out of the skill folder to `tests/ask-jev/`, so installing the skill no longer copies them. Run every skill's tests with `node --test` from the repo root.

## 1.6.0

- `ask-jev`: no longer only for Figma designs. Any source that leaves Open questions, such as a design, a spec, a ticket, or the code, can now put them to Jev. Before, every step assumed a design had been read and only figwright could supply screenshots, so any other tool made the run text-only. A question now carries an image only when the agent's own judgment on it rests on that image, from whatever tool shows it, and a question without one goes as text with its options, as before. What is specific to Figma (the Caption box, the state keys a design calls for, and screenshots from figwright or the official Figma MCP's `get_screenshot`) moved to `references/figma.md`, read only when the source is a design. The question set's `design_facts` is now `facts`, each image names its `source` instead of a Figma `node`, and the state needs `product` and `context`. Questions Jev cannot settle go to the run's Decider: the PM unless the question set's `decider` names someone else, such as the tech lead; the fixed `ask_pm` option is now `ask_decider` and names that person, and the questionnaire is addressed to them, one file per Decider (`jev/questionnaire/<topic>-<date>-<decider>.md`), so a second run of the same topic with a different Decider never adds its questions to the first one's questionnaire. Turning adopted rulings into code happens only when the run is part of writing code.
- `ask-jev`: an image with a side of 256 to 279 px passed the packing script but was refused by Jev, failing the whole request; the script now holds images to Jev's documented minimum of 280 px.
- `GLOSSARY.md`: Open question is now shared across skills, and Decider is defined for Ask Jev.

## 1.5.2

- `ask-jev`: Jev now sees the design, not just the agent's summary of it. Before, Jev judged from text alone while the agent judged from the screen, so its confidence could rest on something other than what the agent saw. Each question now carries a screenshot of the part of the design it asks about, exported with figwright and cropped when the subject sits inside a larger mockup; a question carries a second image only when it compares two screens. Requests are written in English, the language Jev reads most accurately, with on-screen text quoted verbatim and glossed in English so a wording conflict survives translation; the record headings and the questionnaire stay in your language. What every question shares (the product, how to read the design, each Caption box, the numbered spec-notes panel beside a mockup, and what the design does not draw) is sent once, while each question's own facts and screenshots travel with that question only. A new script, `scripts/pack-requests.mjs`, needing only the Node that figwright already requires, crops the images, rejects one Jev cannot take with its question and size, keeps an image from being duplicated by text that happens to match its reference, and splits the questions into as few requests as Jev accepts; a question too large on its own is reported so you can drop or shrink its screenshots. A failed request stops the run, names the questions it held, and writes nothing. Each run keeps its crops and a readable copy of every request in its own `jev/record/<topic>-<date>/run-<n>/` folder, and each record entry lists its screenshots, so a surprising ruling can be traced to the picture behind it. Without an image exporter the run goes text-only, sent with the same `curl` command as before, and says so. The report adds how many requests were sent and their total input tokens. The confidence thresholds are unchanged.

## 1.5.1

- `ask-jev`: an answer with confidence 0.7 or above is now adopted without asking the PM; before, it took 0.9. Only 0.5 up to, but not including, 0.7 is still adopted and put to the PM to confirm. In the first real run, nothing at 0.7 or above was overturned when checked against the meeting notes, and the one ruling the meeting overturned had 0.62, so it still reaches the PM.

## 1.5.0

- New skill `ask-gg` under `daily/`: answers how to use this repo's skills: which one fits your situation, how to run it and what its argument means, what it needs first (files, keys, tools, or other skills), and what it leaves behind. It reads the latest `master` from GitHub every time, `plugin.json` for the skill list and version and each listed `SKILL.md`, plus `README.zh-TW.md` for installation questions, so it covers every skill, including ones you have not installed, and no skill list is kept by hand to go stale. It reads each `SKILL.md` as documentation and runs none of them. A `$name` outside the repo is pointed to mattpocock-skills. When two skills could serve, it says how they differ; when none fits, it says so and names the closest. The answer ends with the version it read, so an older install knows to update. User-invoked only.

## 1.4.0

- New skill `ask-jev` under `engineering/`: when reading a Figma design leaves Open questions about user experience or behaviour, it puts them to Jev, TypeSafe's System One model, instead of stopping to ask the PM about each one. Every Open question becomes one Choice question with 2–4 concrete behaviours drawn from the design, the project, and common UX practice, plus a fixed `ask_pm` option so Jev can route questions only the PM can settle. All questions go out in one `curl` call that runs unchanged in zsh, bash, and PowerShell. Each answer is sorted by its confidence: 0.9 or above is adopted; 0.5 to 0.9 is adopted and put to the PM to confirm; below 0.5, or `ask_pm`, becomes a PM question, and the code it blocks is left out behind a `TODO(ask-jev <topic> Qn)` while the rest is built. Every ruling, with its options, probabilities, and confidence, is recorded in `jev/record/<topic>-<date>.md` at the repo root, and the questions for the PM go into `jev/questionnaire/<topic>-<date>.md`, written on Matt's `to-questionnaire` template. The API key lives in `~/.config/typesafe/typesafe-key.header`, outside the skill folder so plugin and `npx skills` updates leave it alone; `curl` reads it with `-H @file`, so the key never enters the conversation or a command line. The skill ships `typesafe-key.header.example` to copy and fill in. It leaves committing to you. User-invoked only.
- `.gitignore`: ignores `typesafe-key.header`, so a key filled in inside the repo is never committed.

## 1.3.0

- New skill `seen-it-before` under `engineering/`: for a problem you are stuck on, names the Classic problems it is a Variant of and brings their known solutions, in the spirit of Pólya's "have you seen it before?". It first strips the problem to a one-sentence skeleton with every domain noun replaced by its role, so a misreading shows before anything else, then looks across every field for Classic problems with that shape. Each candidate comes with the correspondence (your X is its Y), the departures where your problem differs and the known solutions may break, and each solution with what it needs changed to fit. An unknown that decides between candidates is written as a condition instead of asked up front. A sub-agent checks every candidate against textbooks, papers, Wikipedia, or course notes: whether the source's definition of the Classic problem matches the skeleton as the correspondence claims, since a real Classic problem can still be the wrong analogy, and whether each solution is documented for it and survives the departures. A candidate that does not fit and a solution no source backs are dropped, as is a candidate left with no solution; a solution a departure breaks stays with that departure named, and the change it needs is labelled as unverified reasoning, since no source checked it; the best three candidates remain. Since a web page can carry injected instructions, the sub-agent gets only the skeleton, correspondence, departures, and solutions in the skeleton's role terms, never your own wording, domain nouns, files, or conversation; it only searches and reads pages; it returns a fixed name, locator, and verdict for each claim and quotes nothing from the pages; and a page that gives it instructions is marked suspicious, backs nothing, and is listed in the reply. When nothing fits, it says so and points to `dont-know-how` instead of forcing a match. It stops at the mapping and waits for you to pick. User-invoked only.
- `GLOSSARY.md`: adds Classic problem and Variant.

## 1.2.2

- `ptns`: the handoff prompt now replaces every API key, password, token, and piece of personal data with a placeholder such as `<API_KEY>`, as Matt's `handoff` does. The prompt goes straight to another session or gets copied out, and the exact commands it keeps could otherwise carry a secret along.

## 1.2.1

- Deprecated `design-code-implement`, `impl`, and `implement-all`: moved to `deprecated/`, marked `metadata.internal`, and no longer shipped by the Claude Code plugin or `npx skills`. Every implementer had to load the whole `design.md`, which inflated its context, and the conventions it recorded came from sub-agent exploration and were not reliably accurate, yet implementers treated them as settled, so code reviews kept turning up edits to `design.md`. Run Matt Pocock's `to-spec` → `to-tickets` → `implement` or `implement-spec` instead: the spec's Implementation Decisions carry the architectural choices, and `implement-spec` covers GitLab through the issue tracker that `setup-matt-pocock-skills` configures. The plugin description no longer mentions choosing an implementation direction.
- `torture-gently`: when a frontier question needs a fact from the environment, tools, or authoritative sources, it now dispatches a sub-agent to find it within the evidence horizon, instead of looking it up itself and delegating only when the work was independently bounded. The sub-agent reports each fact with its locator, so the branch can clear the question gate's Evidence check. Only the questions downstream of a running sub-agent wait; the rest of the frontier is asked now, as in Matt's `grilling`.

## 1.2.0

- New skill `winget-upgrade` under `daily/`: lists the programs winget can upgrade as a numbered list of name, ID, and current → available version, then upgrades only the numbers the user picks. Each pick is upgraded on its own by exact ID from the source it was listed under, accepting the package's agreements, since picking a number is the user's consent. Source agreements are never accepted silently: when winget reports one not yet accepted, the skill shows the terms and asks first. A failed upgrade does not stop the rest, and the run ends with a table of what succeeded and the reason for each failure. User-invoked only.
- Skills now live under `skills/<category>/`: `engineering/`, `pm/` (`scrum`), and `daily/` (`sib`, `ptns`). Skill names are unchanged, so `--skill <name>` and plugin invocations keep working, and `npx skills update` follows the move. The deprecated `to-tasks` and `implement-task` are marked `metadata.internal`, so `npx skills` no longer installs them, even by direct path or with `--full-depth`.
- `README.md` and `README.zh-TW.md` now cover installation only.

## 1.1.1

- `torture-gently`: existing artefacts now only describe how things are now, and the user's goal sets which directions the questions explore. Before, when a repo's code or docs were poor, they steered the questions and the session followed the bad code instead of the goal. The evidence horizon is unchanged, so it still does not reach out to industry or community sources.

## 1.1.0

- New skill `cloud-architect`: plans how a repo should be deployed, to the cloud or on-premises, securely and with good performance, and writes the result to `deploy-plan.md` where the user chooses. It reads every deployable unit and dependency from the repo, asks in one round for the constraints the repo cannot show, chooses the target and platform, and covers security and performance for each unit. Every recommendation cites evidence: a `path:line` in the repo, a source actually read in the session, or the user's own statement; what it only remembers does not count. A point it cannot back becomes an Evidence gap, put to the user as a question. A constraint that could flip the choice between cloud and on-premises or between platforms is blocking: it follows up until it is answered or the user names an assumption, which the plan records as one. It names cost drivers instead of estimating prices, linking the platform's official pricing calculator when one exists. An existing deployment setup is the starting point. User-invoked only.
- `GLOSSARY.md`: adds Deployment plan and Evidence gap, kept apart from the Scrum Open question.
- `design-code-implement`, `implement-all`: the `short_description` in `agents/openai.yaml` is shortened to Codex's 25–64 character limit.

## 1.0.1

- `design-code-implement`: in `design.md`, each flow that crosses components is now an ASCII flowchart, one per trigger, instead of a Mermaid `sequenceDiagram`, whose participants and stacked `alt` branches grew too wide to read once a feature got complex. Steps run top to bottom, numbered, each followed by a `↳` line naming the real function and file. Only the success path is drawn; every failure the requirement implies is listed under the diagram as "step N fails → what happens", and a step that is a flow of its own gets its own diagram, referenced as "→ Flow N". State changes stay a Mermaid `stateDiagram-v2`. The layout now lives in `references/template.md`. `impl` and `implement-all` read `design.md` as text, so designs already written in Mermaid still work.
- `implement-all`: the orchestrator now merges each finished implementer's branch into the merge request's branch itself instead of dispatching a merger subagent. No dedicated agent fits that role, so the subagent ran the orchestrator's own model at extra cost. Each implementer already merges the branch's tip before reporting done, so the merge is usually a fast-forward; on a conflict the orchestrator aborts it and sends that implementer back to merge the new tip into its own.

## 1.0.0

- New skill `scrum`: starts a human team on Scrum from a spec or incomplete material. Acting as the Product Owner, it writes three files into the repository's `scrum/` folder, creating it when missing: `product-backlog.md` (the Product Goal, then ordered items, each with a User Story, acceptance criteria, an ordering reason, its source, and Open questions tagged PM or Engineer), `sprint-01.md` (a proposed Sprint Goal and suggested items), and `definition-of-done.md` (a draft for the team to adopt). Gaps in the material become Open questions instead of stopping the run. Sizing, the Sprint Goal, and Sprint selection stay with the team, per the Scrum Guide 2020. It reads documents only, never source code. It checks each of the three files on its own, writing a missing one and keeping an existing one. An existing Product Backlog only gains the items new material introduces, keeping existing items and their ids. A new id is always above every PBI id the `scrum/` files mention, so a gap left by a removed item stays empty. The run reports where the new material contradicts an existing item, and flags a kept Sprint 1 draft that cites an earlier backlog. User-invoked only.
- New `GLOSSARY.md`, separating a Product Backlog item from a Task.

## 0.9.0

- New skill `sib` (say it back): before any work starts, restates in its own words what you want and why: the goal as distinct from the literal ask (naming both when the ask is only a means to it), the problem behind it, and what it could not tell. Each sentence carries its basis (your words, a `path:line`, or `(inferred)`), and it then waits for you to confirm or correct. User-invoked only.

## 0.8.6

- `implement-all`: each implementer now confirms its worktree is based on the merge request's branch before starting, resetting onto it if not, and merges that branch's tip into its own before reporting done. Conflicts are resolved by the implementer that knows the ticket, so the merger's merge is usually a fast-forward. This matches the implementer rules in upstream `implement-spec`.

## 0.8.5

- `implement-all`: implementers no longer each read the whole spec. While building the task graph, the orchestrator notes by heading the spec sections each ticket depends on, and points each implementer at its ticket, `design.md`, and only those sections. Pointers are paths and headings, never the orchestrator's own summary, so nothing is lost in retelling; an implementer that needs a section it was not pointed at reads it.

## 0.8.1

- `torture-gently`: the Jev question gate from 0.8.0 is removed. In practice it did not noticeably change which questions reached the user, so the skill is back to judging every branch against the four gates itself. It no longer checks for `$HOME/.typesafe/api_key.env`, asks to enable Jev, or sends anything off the machine; `references/jev.md` is gone. A key file you created for it is no longer read and can be deleted.

## 0.8.0

- `torture-gently`: the question gate can now run through TypeSafe's Jev. Before the first round the skill checks `$HOME/.typesafe/api_key.env` for a non-empty `TYPESAFE_API_KEY`; with a key, it first says in one line what leaves the machine and lets you decline — a key created for earlier work is not consent to disclose this session's material — and on consent every candidate branch is judged against the four gates by a model independent of the interviewer's own reading, so branches that change nothing, and questions whose answers the interviewer should be finding itself, are dropped before they reach the user. Without a usable file it asks once whether to enable Jev, says what it buys, and otherwise runs exactly as before. `references/jev.md` carries the state shape, the literal request and response formats, the six judgments per branch, the platform commands, and the thresholds; it is read only when a key is present. The key file sits outside the skill so it works whether the skill was installed as a read-only plugin bundle or copied into a project, and it is never inside a repository; the file's presence is probed with a status-only command that never prints its contents, and the key itself is parsed without sourcing, never exported, and passed to curl through stdin, so no child process inherits it and it never reaches a process argument list.
- `design-code-implement`: the no-existing-convention exit is now checked at the top of section 4, before any direction is produced. In a repository with nothing to inherit both exits applied at once and the skill took the wrong one, reporting that the existing conventions already determined the approach.

## 0.7.6

- `design-code-implement`: when exploration finds no existing convention to inherit, it now says so and stops instead of reporting that the existing conventions already determine the approach.
- `design-code-implement`: `design.md` now lists changes no diagram shows (migrations, configuration, interface shapes) alongside the Mermaid diagrams, instead of only when neither diagram applies.

## 0.7.5

- `design-code-implement`: `design.md` now records the chosen direction as Mermaid instead of prose: a `sequenceDiagram` with an `alt` branch for every failure path for flows that cross components, a `stateDiagram-v2` for state changes, and a short list only when neither applies. Participants are named after the real modules or files, and the conventions to follow are one line each with their evidence path.
- `design-code-implement` (breaking): the greenfield path is gone. When the repository has no architecture to inherit, the skill no longer researches external sources to build directions; that is what `dont-know-how` is for.
- `design-code-implement`: it now reads only what you point it to, instead of always reading `CONTEXT.md`, ADRs, tickets and the instruction files, and it no longer offers to write an ADR.
- `design-code-implement`, `impl`, `implement-all` (breaking): `design.md` no longer lands beside the spec or under `.scratch/` by default. `design-code-implement` asks where to write it, and `impl` and `implement-all` ask for its path when you have not given it.

## 0.7.0

- New skill `refactor`: classifies a refactor as behavior-preserving or behavior-changing, writes a plan to `.refactor/<refactor-slug>/plan.md`, then either refactors against a green test baseline or goes test-first with Matt's `tdd`, and closes with Matt's `code-review` against the plan. A breaking change waits for your approval of the plan.

## 0.6.2

- `dont-know-how`: once you pick a direction it now continues straight into `torture-gently` instead of stopping, and it no longer aims for at least three directions; it returns what the evidence supports. The question templates no longer repeat rules already stated in the skill.
- `torture-gently`: when how a flow should behave cannot be made clear in words, it calls Matt's `prototype` and asks against the clickable demo.

## 0.6.1

- `implement-small-change`: on hidden scope it now writes the impact brief and asks you to run `/grill-softly`, instead of invoking Matt's `grill-with-docs`, which is user-invoked and could not be reached from a skill.

## 0.6.0

- New skill `impl`: Matt Pocock's `implement` that also reads `design.md`, so the work follows the implementation direction `design-code-implement` recorded.
- New skill `implement-all`: Matt Pocock's `implement-spec` with `design.md` among the context pointers every implementer sub-agent reads, and a merge request opened on whichever host the repository uses (GitHub, GitLab, ...).

## 0.5.0

- Deprecated `to-tasks` and `implement-task`: moved to `deprecated/` and no longer shipped by the Claude Code plugin or `npx skills`. Splitting tickets into two-project tasks did not lower the error rate of small models on cross-project work in practice. Implement tickets with Matt Pocock's `implement` instead.

## 0.4.0

- `ptns`: the handoff is now delivered, not just printed. On Claude Code the skill lists the reachable sessions, asks which one to hand the progress to, and sends the prompt straight to it with a session-to-session message; on any other agent (Codex, agy, ...) it still returns one copyable code block. The agent is detected from the tools actually available, never by asking the user, and nothing is sent before the user picks a target. The prompt also now opens with the working directory the next session should be in.

## 0.3.0

- New skill `ptns` (prompt to new session): hands the current progress to a fresh session as one short, copyable prompt covering the goal, verified progress, current state, next step, decisions and their reasons, and dead ends. User-invoked only.

## 0.2.5

- `implement-task`: the unit of dispatch is now a ticket, not a task. One fresh sub-agent per ticket reads the ticket, `design.md`, and every task once, then works the tasks in order with one validation and one commit per task; independent tickets still run in parallel worktrees. The worker's writable boundary is the ticket footprint (the union of its tasks' projects), so a change an earlier sibling missed is fixed in place instead of stopping with `needs-triage`. Finished tickets are merged back with `git merge --no-ff` and accepted by the orchestrator; a worker that runs out of context reports a checkpoint and a fresh worker resumes from its last commit; a failed ticket no longer stops running workers, only new dispatches; review findings are fixed by one fix worker inside the run's footprint. Cuts the repeated per-task reading of design, ticket, rules, and code.
- `to-tasks`: task sizing is now "one checkpoint step" rather than "one fresh context window", and the task template's boundary text describes the ticket footprint rule.
- `implement-task`: run-created worktrees now live only under `<repo>.worktrees/` next to the main checkout, one per ticket named `<NN>-<ticket-slug>`, so cleanup can tell run-created worktrees from pre-existing ones by location.

## 0.2.0

- New skill `to-tasks`: splits each `to-tickets` ticket into implementation tasks that write to at most two projects, nested under the ticket, published only after the user approves the tree.
- New skill `implement-task`: works the frontier of `to-tasks` task files, one task per fresh sub-agent, each confined to the projects its task names; a boundary breach stops the loop with `needs-triage` instead of widening the edit; an exhausted frontier ends with `$code-review` over the whole run.
- `design-code-implement`: after recording the direction, measures each ticket's footprint against the project dependency chain and reports which tickets exceed two projects, recommending `$to-tasks` or `$implement-task` accordingly.

## 0.1.1

- `dont-know-how`: content read from outside sources is now explicitly material, never instruction. Directives embedded in documentation, forum posts or issue threads are recorded as findings with their locator instead of being acted on (indirect prompt injection).

## 0.1.0

- First release as a Claude Code plugin (`guojie-skills`) and via skills.sh.
- Ships six skills: `dont-know-how`, `grill-softly`, `torture-gently`, `show-grill-clearly`, `design-code-implement`, `implement-small-change`.
