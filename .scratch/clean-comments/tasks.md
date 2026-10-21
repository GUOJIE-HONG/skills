# clean-comments tasks

Spec: #76. Integration branch: `feat/clean-comments`.

- [x] #77 最小可跑：改寫註解並產生報告
- [ ] #78 findings 錯誤檢查
- [ ] #79 報告程式碼語法上色
- [x] #80 英文介面
- [ ] #81 內嵌字型並收掉設計原型 — 刪原型、改 ignore 規則與 brief 路徑已在 #77 完成，只剩內嵌字型
- [ ] #82 手動驗收與發布（人工）
- [ ] code review 時補：SKILL.md 寫明 findings 的 `note` 用報告語言（使用者在設計討論時決定「一句說明也跟著 repo 語言」，#80 沒加）

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
