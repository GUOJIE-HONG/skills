# GUOJIE-HONG Skills

**English** | [繁體中文](./README.zh-TW.md)

## Install

Install [mattpocock-skills](https://github.com/mattpocock/skills) first. The skills here that call his will not run without it.

Then pick **one** route. Installing both leaves you with every skill twice.

### Claude Code plugin

This repo is its own single-plugin marketplace. It is not listed in Claude Code's official marketplace, so add the marketplace once, then install:

```text
/plugin marketplace add GUOJIE-HONG/skills
/plugin install guojie-skills@guojie-hong
```

From the terminal:

```bash
claude plugin marketplace add GUOJIE-HONG/skills
claude plugin install guojie-skills@guojie-hong
```

The plugin is a managed, read-only bundle. Pull new releases with:

```bash
claude plugin update guojie-skills@guojie-hong
```

### skills.sh (Claude Code, Codex, and other agents)

[skills.sh](https://skills.sh) copies the skill files into your project or home directory as ordinary files you own and can edit:

```bash
npx skills@latest add GUOJIE-HONG/skills
```

The installer lists every skill under the heading **Guojie Skills**. Take the ones you want, or one by name:

```bash
npx skills@latest add GUOJIE-HONG/skills --skill grill-softly
```

Nothing updates behind your back. Pull the latest with `npx skills update`.

## Before the Code

Before a single line is written,\
before the first bold guess is made,\
each claim must show where it was found:\
a path, a line, a thing you said.

We grill it softly, torture gently,\
then lay three roads out, never one;\
you pick the road, and every step\
stops once its own small part is done.

It's slower at the start, perhaps,\
but nothing here is built on sand:\
each claim can show you where it came from,\
and "I don't know" is allowed to stand.
