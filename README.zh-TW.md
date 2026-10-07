# GUOJIE-HONG Skills

[English](./README.md) | **繁體中文**

## 安裝

先裝 [mattpocock-skills](https://github.com/mattpocock/skills)，再裝這套。沒裝的話，會呼叫他 skill 的那幾個跑不起來。

接著兩條路線挑一條就好。兩條都裝，每個 skill 會出現兩份。

### Claude Code plugin

這個 repo 本身就是一個 plugin marketplace，裡面只有一個 plugin。它沒有上架到 Claude Code 官方的 marketplace，所以要先加入這個 marketplace 再安裝：

```text
/plugin marketplace add GUOJIE-HONG/skills
/plugin install guojie-skills@guojie-hong
```

在終端機的話：

```bash
claude plugin marketplace add GUOJIE-HONG/skills
claude plugin install guojie-skills@guojie-hong
```

plugin 是唯讀的，由 Claude Code 管理。要更新：

```bash
claude plugin update guojie-skills@guojie-hong
```

### skills.sh（Claude Code、Codex 與其他 agent）

[skills.sh](https://skills.sh) 會把檔案複製到你的專案或家目錄，之後那些檔案是你的，想改就改：

```bash
npx skills@latest add GUOJIE-HONG/skills
```

安裝器會在 **Guojie Skills** 底下列出所有 skill，勾你要的。只要一個也行：

```bash
npx skills@latest add GUOJIE-HONG/skills --skill grill-softly
```

檔案不會自己更新。想拉新版就跑 `npx skills update`。

## 動手之前

第一行程式還沒落下，\
第一個大膽的猜測還沒出口，\
每句話都要先交代它從哪來：\
哪個檔案、第幾行，或是你說過的話。

輕輕地追問，溫柔地拷問，\
畫出三條路，而不是一條；\
路由你挑，每一步\
做完自己的份就停下。

起步也許慢了一點，\
但這裡沒有東西蓋在沙上：\
每句話都指得出它從哪來，\
「我不知道」也可以大方說出口。
