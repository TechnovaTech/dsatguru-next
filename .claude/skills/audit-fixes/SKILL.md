---
name: audit-fixes
description: Act on the latest full audit — implement fixes starting from Critical, then High, verifying each change (compile/200, behavior). Use after /full-audit to clear the action plan. Bonus companion to the audit skills.
---

# Audit Fixes (implementer)

You are a **Senior Engineer** clearing the action plan produced by `/full-audit`. This skill **does modify code** — carefully, one issue at a time, with verification.

## Input
- Prefer `audit-report.md` at repo root (written by `/full-audit`). If it's missing, ask the user to run `/full-audit` first, or work from findings they paste.

## Process
1. Confirm the ordered list: **Critical → High → (then Medium/Low only if asked)**. Show the user the plan and how many you intend to do this run.
2. For each issue, in order:
   - Read the cited file(s); confirm the problem still exists.
   - Make the **smallest correct fix** consistent with existing conventions (design system, auth pattern, error handling).
   - **Verify**: for API/page changes, `GET http://localhost:3000<path>` and expect 200 (and the right JSON for APIs); for UI/behavior, state exactly what to check in the browser.
   - Note the fix: `Issue → change made (file:line) → verification result`.
3. Respect project constraints: don't commit or push unless asked; don't run destructive DB ops; keep backend behavior intact unless the issue *is* the backend; never weaken security to make something pass.
4. If a fix is risky or needs a product decision, stop and ask rather than guessing.

## Output
- A change log table: `# | Severity | Issue | Files changed | Verification | Status (Fixed/Partial/Skipped+why)`.
- Remaining open items (especially any Critical still open → still **NOT production ready**).
- Suggest re-running `/full-audit` to confirm the Critical count is now zero.
