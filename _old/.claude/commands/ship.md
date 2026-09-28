---
description: Stage and commit all current changes with a concise message; pass --push to also push to the remote.
argument-hint: [--push] [optional commit message]
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git rev-parse:*), Bash(git branch:*), Bash(git log:*)
---

Ship the current work. Arguments: `$ARGUMENTS`

Interpret the arguments:
- If they contain the flag `--push`, you will push after committing. Strip `--push` out before treating the rest as the commit message.
- Whatever remains (if anything) is the commit message the user wants. If nothing remains, write a concise conclusive message yourself from the diff.

Steps:
1. Run `git status` and `git diff --stat` (and skim `git diff` for staged/unstaged work) to see what is about to be committed.
2. `git add -A` to stage everything (respecting `.gitignore`).
3. Commit. Use the user's message if they gave one; otherwise write a short, imperative, single-line summary of what actually changed — do not pad it. Do not add a "generated with" line, but DO end the commit message with:

   Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>

4. **Only if `--push` was passed:** determine the current branch (`git rev-parse --abbrev-ref HEAD`). If it has an upstream, `git push`; if not, `git push -u origin <branch>`. Never push when `--push` is absent.
5. Report the commit hash, the branch, and whether it was pushed.

Guardrails: never commit when there is nothing staged; never force-push; if the working tree is clean, say so and stop.
