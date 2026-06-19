---
name: full-audit
description: Run all seven audit agents (QA, Product, UI/UX, Security, Production Readiness, Code Review, DSAT Domain), merge their findings into Critical/High/Medium/Low, produce an impact-ordered action plan, and gate "Production Ready" on zero Critical issues. Use for a full end-to-end project audit.
---

# Full Audit (orchestrator)

You are the **lead engineer** running a complete audit of DSATGURU by combining seven specialist reviews. Goal: one authoritative, deduplicated, prioritized report ending in a Production-Ready verdict.

## The seven auditors (each defined in `.claude/skills/<name>/SKILL.md`)
1. `qa-engineer` — functionality, integration, edge cases
2. `product-manager` — flows, missing features, UX gaps
3. `ui-ux-auditor` — responsiveness, states, a11y, design
4. `security-auditor` — auth, JWT, permissions, API, secrets
5. `production-readiness` — runtime, errors, scale, perf, deploy
6. `code-reviewer` — quality, architecture, debt
7. `dsat-domain-expert` — question bank, scoring, analytics, timing

## How to run
1. **Fan out in parallel.** In a single message, spawn the seven auditors concurrently using the Agent tool (general-purpose agent). Give each agent this instruction:
   > "Read `.claude/skills/<persona>/SKILL.md` and perform that audit on this repo. Investigate the actual code (read files, grep, curl GET APIs on http://localhost:3000 where safe — never mutate data). Return ONLY your findings as a list; each item: `{severity, area, title, location (file:line), evidence, fix}`. Be specific and cite files."
   - If the Workflow tool is available and the user has opted in, you may run them via a workflow instead (same prompts, `phase('Audit')`), which gives live progress.
2. **Collect** all findings. If any auditor fails, note it and continue.
3. **Deduplicate & merge**: collapse the same issue reported by multiple agents into one entry, keeping the highest severity and citing which agents flagged it.
4. **Re-classify** every issue into one bucket using this rubric:
   - **Critical** — broken core flow, data loss, auth/security hole, crash, wrong SAT scoring, or any release blocker.
   - **High** — major feature wrong/broken or real security/UX risk; no easy workaround.
   - **Medium** — edge case, inconsistency, minor gap; workaround exists.
   - **Low** — cosmetic / polish.

## Output (save to `audit-report.md` at repo root AND summarize in chat)
1. **Executive summary** — counts per severity, one-paragraph health statement.
2. **Critical Issues** — table: `# | Title | Area | Location | Why critical | Fix | Flagged by`.
3. **High Priority Issues** — same columns.
4. **Medium Issues** — same columns.
5. **Low Issues** — same columns.
6. **Action Plan** — ordered by impact (Critical→High→Medium→Low; within a tier, highest impact ÷ effort first). Each step: what to change, which file(s), and how to verify (e.g. "GET route → 200", "modal closes on Esc").
7. **Production Readiness verdict** — score out of 100 (from `production-readiness`) and a clear gate:
   - ✅ **PRODUCTION READY** only if **zero Critical** issues remain.
   - ❌ **NOT PRODUCTION READY** otherwise — list the exact Critical blockers that must be cleared.

After presenting, offer to run `/audit-fixes` to start clearing Critical→High items.

## Rules
- Be evidence-based: every issue cites a file/line or a reproduction. Drop speculation that can't be substantiated.
- Don't modify code in this skill — this is assessment only. Fixing is `/audit-fixes`.
