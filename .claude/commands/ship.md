---
description: Stage and commit all current changes with a concise message; pass --push to also push to the remote.
argument-hint: [--push] [optional commit message]
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git rev-parse:*), Bash(git branch:*), Bash(git log:*)
---

Ship the current work. Arguments: `$ARGUMENTS`

- If the arguments contain `--push`, push after committing. Strip `--push` before treating
  the rest as the commit message.
- Whatever remains is the commit message. If nothing remains, write one from the diff: a
  short subject saying what changed for the site, and a body saying why when it is not
  obvious (`docs/guidelines/11-code-style.md`).

Steps:
1. `git status` and `git diff --stat`, and skim `git diff`.
   - Never commit credentials, dumps, zips, builds or `node_modules`.
   - If any are staged, stop and say so.
2. `git add -A` (it respects `.gitignore`).
3. Commit, ending the message with the attribution lines this session asks for, if any.
4. **Only with `--push`:**
   - with an upstream, `git push`;
   - otherwise, `git push -u origin <branch>`;
   - never force-push.
5. Report the commit hash, the branch, and whether it was pushed.

If the working tree is clean, say so and stop.
