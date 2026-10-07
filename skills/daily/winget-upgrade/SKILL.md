---
name: winget-upgrade
description: List the Windows programs winget can upgrade as a numbered list, then upgrade only the ones the user picks by number.
disable-model-invocation: true
---

# Winget Upgrade

Upgrade only the programs the user picks. Run every command in PowerShell.

## 1. List the upgrades

```powershell
winget upgrade --disable-interactivity
```

If winget says a source's agreements are not accepted, show the user those terms and ask before rerunning with `--accept-source-agreements`. Keep each package's source from the table; step 2 needs it.

Show each package as one numbered line: name, ID, current version → available version.

```
4. Google Chrome (Google.Chrome.EXE) 154.0.8037.98 → 155.0.8059.40
```

If nothing can be upgraded, say so and stop. Otherwise ask which numbers to upgrade, and end the turn.

## 2. Upgrade the picks

Tell the user that some installers raise a Windows admin (UAC) prompt they need to approve. Then upgrade the picked packages one at a time:

```powershell
winget upgrade --id "<ID>" --exact --source "<source>" --accept-package-agreements --disable-interactivity
```

Picking a number is the user's consent to that package's agreements. An upgrade can run for many minutes, so give each command enough time to finish instead of the shell's default timeout. A failed upgrade does not stop the rest.

## 3. Report

Show one table: each package, whether it succeeded, and for a failure the one-line reason winget gave.
