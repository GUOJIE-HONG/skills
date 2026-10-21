# clean-comments tasks

Spec: #76. Integration branch: `feat/clean-comments`.

- [x] #77 最小可跑：改寫註解並產生報告
- [x] #78 findings 錯誤檢查
- [x] #79 報告程式碼語法上色
- [x] #80 英文介面
- [x] #81 內嵌字型並收掉設計原型 — 刪原型、改 ignore 規則與 brief 路徑已在 #77 完成，只剩內嵌字型
- [ ] #82 手動驗收與發布（人工）
- [x] code review 時補：SKILL.md 寫明 findings 的 `note` 用報告語言（使用者在設計討論時決定「一句說明也跟著 repo 語言」，#80 沒加）

## Decisions

- 設計原型在 #77 就刪除：CSS 與 markup 已搬進 skill，照 #76「搬完刪掉，不留兩份」；`.impeccable/config.json` 的 ignore 規則與 brief 路徑一併改指新檔。（#77 agent）
- 字型清單在 #81 內嵌前不寫 "Fira Sans Report"，避免指向不存在的字型。（#77 agent）
- 原型的 `.hljs-*` 顏色規則先留在 `report.css`，#79 只需改 script。（#77 agent）
- #80 前 script 一律用 zh-TW 介面文字；SKILL.md 先寫好 `lang` 的完整用法。（#77 agent）
- 報告檔名裡的 repo 名稱，把檔名不允許的字元與空白換成 `-`，避免執行失敗。（#77 agent）
- agent 改完所有註解後才寫 findings，因為改寫會移動行號、script 執行時才讀檔。（#77 agent）
- 沒給路徑時 `scope` 寫 `.`。（#77 agent）
- 0 筆區塊用 spec 的「這次沒有找到。」，不用原型較長的寫法。（#77 agent）
- zh-TW 報告的 `<html lang>` 用 `zh-Hant`，跟原型和 #77 一致；英文用 `en`。（#80 agent）
- findings 錯誤訊息用 `findings[i]`（從 0 起算），跟 JSON 陣列索引一致。（#78 agent）
- 驗證測試放獨立測試檔，避免跟 #79、#80 合併衝突；測試 repo 名加 `Refused` 前綴避免平行測試互相誤判。（#78 agent）
- 另外擋下型別錯、JSON 讀不到或解析失敗、沒給參數、所有欄位的空字串；不擋會 crash 或產生錯的報告。（#78 agent）
- `show` 段落相鄰算合法；`lines` 必須整個落在其中一段。行數不把檔尾換行算成多一行（含 `\r\n`）。（#78 agent）
- highlight.js 用 `@highlightjs/cdn-assets@11.12.0` 的 ESM 常用語言單檔（36 種），改名 `.mjs` 讓 Node 直接 import；不在裡面的副檔名不上色。（#79 agent）
- 整個檔案一起上色再取顯示的行，跨範圍的區塊註解顏色才正確；加 `ignoreIllegals: true` 避免無法解析時失敗。（#79 agent）
- `report.css` 補兩條 C# 選擇器（highlight.js 對 C# 輸出 `.hljs-title`、`.hljs-function .hljs-title`），沿用原型的顏色變數。自訂型別名稱 highlight.js 不上色，跟原型手工上色不同。（#79 agent）
- 字型檔命名 `fira-sans-<weight>.woff2`、`fira-sans-OFL.txt`，沿用 open-course `rail.woff2`／`rail-font-OFL.txt` 的寫法。（#81 agent）
- `@font-face` 由 script 產生（要在產生報告時讀檔轉 base64），不放在 `report.css`，跟 open-course 的 `RAIL_FONT` 一樣。（#81 agent）
- C# 專用的 `.hljs-title` 顏色規則限定在 `.language-cs` 底下：報告的 `<code>` 帶 `language-<副檔名>`（highlight.js 認得的副檔名才加）；Go、PHP、Lua、C++ 等也輸出光禿的 `.hljs-title`，不限定會被染成型別色。（code review）
- SKILL.md 拿掉 script 會檢查的「行號從 1 起算」「`file` 相對於 repo 根目錄」，錯了 script 的訊息會說怎麼改。（code review）
