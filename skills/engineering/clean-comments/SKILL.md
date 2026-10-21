---
name: clean-comments
description: Rewrite the existing code comments in a repo or path so each says only what the code is for, and list what needs the user's judgement (comments that disagreed with the code, unclear names, TODO/FIXME, commented-out code) in an HTML report.
disable-model-invocation: true
---

# Clean Comments

The user treats the code and its comments as the project's spec, and so do the agents that work on it. A comment that sends the reader elsewhere, or says what the code does not do, misleads both. You rewrite the comments that already exist, in place, and hand the user a report of what only they can decide.

If the user passed a path, work only under it; otherwise the whole repo.

## Before you start

If `git status` shows uncommitted changes, stop and ask the user to commit or stash them, so your rewrites land in a diff of their own. Never commit when you finish.

## Which comments to rewrite

Rewrite a comment that:

- carries an **Outside reference**: it points the reader to a document, spec section, ticket, meeting, discussion, or date instead of saying what the code is for;
- says something the code does not do;
- records history or discussion;
- refers vaguely to other code ("same as the service above"): name the class.

Keep a doc comment that only restates the name (`/// <summary>日期格式。</summary>`, `/** Date format. */`), and keep pointers to other code such as `<see cref="..."/>` or `{@link Mailer}`.

Do not open the documents a comment points to. Write the new comment from the code alone: why it exists and what its flow is, as short as it can be (`SMTP寄信通用服務`, `查詢BPM表的審核狀態`), in the comment's original language. When nothing is worth saying, delete the comment.

Change comments only: no code, no names, and no new comments where there were none.

Skip generated and third-party files: `Migrations/`, `*.Designer.cs`, `*.pb.go`, `node_modules/`, `vendor/`, and files that open with a license.

## Findings

Four things are the user's call. Record each in the findings file; an ordinary rewrite is not recorded, since `git diff` shows it.

- `mismatch`: a comment disagreed with the code. Rewrite it to match the code and keep the old comment's exact text as `oldComment`; the code may be what is wrong.
- `naming`: a method, variable, or class whose name does not say what it is for. Leave the name; the note says why it is unclear.
- `todo`: a `TODO` or `FIXME`. Leave it as is.
- `commented-out`: code that was commented out. Leave it as is.

Write the findings file to the system temp directory with a file-writing tool, after you finish editing, so its line numbers match the files as you leave them:

```json
{
  "repo": "ErpPortal",
  "scope": "src/",
  "lang": "zh-TW",
  "findings": [
    {
      "kind": "mismatch",
      "file": "src/Mail/SmtpMailService.cs",
      "lines": [45, 45],
      "show": [[40, 47]],
      "note": "舊註解說失敗會重試 3 次，程式只寄一次就拋出例外。",
      "oldComment": "// 寄信失敗時自動重試三次，每次間隔 5 秒"
    },
    {
      "kind": "naming",
      "file": "src/Bpm/Helper.cs",
      "lines": [9, 9],
      "show": [[8, 10], [14, 14], [19, 19], [32, 32], [44, 44]],
      "note": "Helper 看不出負責什麼；它只查詢 BPM 表的審核狀態。"
    }
  ]
}
```

- `scope` is the path the user gave, or `.` for the whole repo.
- Ranges include both ends. `lines` are the lines the finding is about; the report marks them. `show` is what the row shows when opened: the whole method or property as one range, or, for a long class or interface, its declaration plus each member's signature.
- `note` is the one sentence the user reads before opening the row, written in the report's language.
- `lang` is the report's language: `zh-TW` when most of the comments you read are Traditional Chinese, otherwise `en`.

## The report

From the repo root, pass the findings file by its path:

```sh
node "<this skill's folder>/scripts/build-report.mjs" "<findings file>"
```

It needs Node 20 or later. The report shows code the script reads from the files itself. When the script reports problems instead, it writes no report; fix the findings file as each message says and run it again.

Finish by giving the user the report path it prints, and remind them to review the rewrites with `git diff`.
