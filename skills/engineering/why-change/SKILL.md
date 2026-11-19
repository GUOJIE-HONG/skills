---
name: why-change
description: After a bug fix or refactor, write an HTML Change report that answers, for each change, what was wrong, how it was changed, why that way, and what risks the change brings.
disable-model-invocation: true
---

# Why Change

The user calls this after an agent finished fixing bugs or refactoring, to understand the work without reading the diff. For every change the report answers four questions: what was wrong (for a refactor, what was wrong with the old code), how it was changed, why that way, and what risks the change brings.

## Where the facts come from

Use this conversation first: what was found, what was tried, why the fix took its shape. When the conversation does not hold the work, because this is a new session or the work happened elsewhere, tell the user in one sentence that running this in the conversation where the work was done gives a better report, then go on from the diff without waiting.

The range is what the user names. Otherwise use the uncommitted changes (`HEAD`) when there are any, else the latest commit (`HEAD~1 HEAD`), and tell the user which you used.

Do not run tests or checks to look for risks; a risk is something to tell the user, not to verify. Cite only tests already run in this conversation; with only the diff to go on, cite none.

## Risks

Each risk says what it affects, how the user would notice it (or confirm it), and, when you know, how to fix it. A risk you can pin to the line of code that shows it carries that line as `at`. A risk you reason toward but cannot pin to a line is a Suspected risk: leave out `at`, say in `reason` why you suspect it, and keep it in the report; the page marks it 待確認. Never give an `at` that does not itself show the risk.

## Build the report

Write the report file as JSON to the system temp directory with a file-writing tool. Text fields take plain text: a blank line between paragraphs, a paragraph of `- ` lines for a list, backticks for code. `lang` is `zh-TW` or `en`, following the user's language, and the text you write follows it too.

```json
{
  "repo": "shop-api",
  "range": "HEAD",
  "lang": "zh-TW",
  "changes": [
    {
      "kind": "bugfix",
      "title": "台灣晚上 8 點後的訂單，報表日期少一天",
      "wrong": "`parseDate` 把 `\"2026-11-19\"` 當成 UTC 午夜，換成台灣時間就落到前一天。",
      "how": "改成以 `Asia/Taipei` 解析。",
      "tests": [{ "command": "npm test -- date.test.ts", "result": "修之前 1 failed，修完 1 passed" }],
      "diffs": [{ "file": "src/utils/date.ts", "lines": [7, 14] }],
      "why": "- 專案已經裝了 `date-fns-tz`，不用加新套件。\n- 只改解析入口，所有呼叫端一次修好。",
      "risks": [
        { "title": "匯出 CSV 的時間可能晚 8 小時", "at": "src/report/export.ts:5", "impact": "報表匯出會重複加 8 小時。", "check": "匯出一筆晚上 9 點的訂單看時間。", "remedy": "拿掉 `exportRow` 裡的 8 小時。" },
        { "title": "已存的舊訂單日期可能本來就錯", "reason": "寫入時很可能也經過舊的 `parseDate`，但沒找到寫入那一行。", "impact": "修之前寫入的訂單。", "check": "查晚上 8 點後建立的舊訂單日期。" }
      ]
    }
  ]
}
```

- `kind` is `bugfix` or `refactor`; one entry per change, as the user would name it.
- `range` is what goes after `git diff`. Each `diffs` entry names a changed file and, optionally, the lines of the file after the change that this entry is about; the report shows the hunks touching them. The code shown comes from `git diff` itself, never from you.
- `tests` is optional; `risks` is `[]` when there are none.

From the repo root, pass the file by its path:

```sh
node "<this skill's folder>/scripts/build-report.mjs" "<report file>"
```

It needs Node 20 or later. When the script lists problems instead, it writes no report; fix every one and run it again. On success it prints the report's path and opens it in the browser. Finish by giving the user that path.
