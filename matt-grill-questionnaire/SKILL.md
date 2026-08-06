---
name: matt-grill-questionnaire
description: Create a clear HTML questionnaire with a copyable reply prompt when Matt grill needs user decisions.
---

# Matt Grill Questionnaire

Use this skill as the question surface whenever a Matt grill skill reaches unresolved decisions. Keep the grill context, but move the actual questions into a self-contained HTML file that the user can open, answer, and copy back.

## Workflow

1. Establish the questionnaire context.

   - Read the applicable repository instructions and inspect the current Git status. Preserve unrelated user changes.
   - Resolve the repository root from the active working directory or the repository named by the user.
   - Inspect relevant source, specs, prior decisions, and any existing questionnaire or handoff artifacts referenced by the context. Use repo-aware discovery when available; use built-in search for HTML, Markdown, configuration, and other non-code files.
   - Extract only decisions that are still unresolved in the active Matt grill. Keep confirmed decisions as a short recap instead of asking them again.

2. Design the questions.

   - Separate behavior or contract decisions that must be answered from implementation preferences that may safely use a recommendation.
   - For every question, provide a stable ID, a precise title, the concrete situation, why the choice matters, two to four mutually distinguishable options, and the consequence of each option.
   - Mark one recommendation when evidence supports it. Phrase it as a recommendation, not as a hidden default.
   - Add an optional free-text note to every question that may need domain context. Make dependencies explicit and place dependent questions after the decision that unlocks them.
   - Write questionnaire prose in Traditional Chinese by default. Keep identifiers, paths, commands, API names, and other technical terms in their original form.

3. Create the HTML artifact.

   - Resolve the user's OS temporary directory and save outside the current workspace: on Windows, use `[System.IO.Path]::GetTempPath()`; on macOS, use `NSTemporaryDirectory()` or `FileManager.default.temporaryDirectory`; on Linux and other POSIX systems, use `$TMPDIR` when set, otherwise `/tmp`.
   - Start from [`assets/questionnaire-template.html`](assets/questionnaire-template.html), then replace every sample question, placeholder, title, topic, and storage key with the current grill context.
   - Use a unique lowercase kebab-case filename such as `<topic>-questionnaire-YYYYMMDD-HHmmss.html`. Add a numeric suffix instead of overwriting an existing questionnaire.
   - Keep the file self-contained: inline CSS and JavaScript, no network dependency, responsive question cards, a visible progress indicator, browser-side draft persistence, a reset action, and a copy action that has a fallback when Clipboard API access is unavailable.
   - Preserve a clear distinction between confirmed recap, required decisions, optional engineering decisions, and the generated reply area.

4. Make the reply prompt complete.

   - The generated text must include the questionnaire topic, every question ID and title, the selected option, free-text notes, unanswered required decisions, and the recommendation used for unanswered optional decisions.
   - End the generated text with explicit handoff rules: treat selected answers and notes as confirmed, do not guess unanswered required decisions, and continue the active Matt workflow only after the unresolved list is empty or the user has explicitly accepted the remaining recommendations.
   - Make `整理回復 prompt` generate the text and make `複製回復 prompt` copy it. A user should be able to paste the result into the same conversation without editing the HTML output.

5. Validate the artifact.

   - Verify the target file exists under the resolved OS temp directory, contains one valid HTML document, has no leftover template placeholders, and has unique question IDs/radio groups.
   - Verify every question has options, a title, and a generated-output path; verify the buttons, progress counter, reset behavior, localStorage key, and copy fallback are wired to existing elements.

6. Open the questionnaire automatically.

   - Open the validated file in the user's default browser as soon as validation passes. Do not wait for the user to ask.
   - Use the platform launcher: on Windows, `Start-Process <path>` in PowerShell or `cmd /c start "" "<path>"`; on macOS, `open "<path>"`; on Linux and other POSIX systems, `xdg-open "<path>"`. Always quote the path.
   - If the launcher fails, is unavailable, or the environment is headless, say so in one sentence and fall back to the manual path handoff instead of retrying with other launchers.

7. Hand off.

   - Return the file path as a clickable link, state that it was opened automatically, and tell the user to answer the questions, click `整理回復 prompt`, then paste the copied prompt back into the conversation.
   - Pause the grill workflow after the handoff. If the user replies directly in chat instead, reconcile that reply with the questionnaire output and continue only from the resulting decisions.

The only bundled resource is the reusable HTML scaffold in `assets/`; keep each generated questionnaire in the user's OS temp directory, never in the repository or the skill directory.
