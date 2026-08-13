# sheet-input-2 — drop NEW PDFs here to build tutor test sheets

**How to use:** put one or more question PDFs in this folder, then tell Claude "process sheet-input-2".

**What Claude does per PDF (100% verified — 0 mistakes, checked 4×, images included):**
1. Reads the PDF and extracts every question, its options, and the intended answer.
2. Solves each question with 3 independent solvers → reconciles (answers pinned to the printed content) → an independent verifier re-solves. Only agreed, correct keys are used. Broken-source questions are skipped and reported.
3. **Recreates every figure/graph/table as a clean SVG → PNG (never cropped from the PDF)**, served from `public/uploads/questions/`. Each image is checked against the source **4 times** — right shape, right values/labels, right question — before it ships.
4. Escapes LaTeX safely (literal `$` → `\$`, no bare `$` in prose, all `$...$` render in KaTeX; no plain-text `x^2`/`sqrt()`/`root` shorthand).
5. Creates a **tutor test sheet** (a Test with `isTutorTest=true` referencing the questions in order) via `scripts/create-tutor-sheet.cjs` — **not** a bank-only import.
6. Runs the full audit suite 4× (placeholders / LaTeX / plain-text math / **figure-vs-source** / answer-key resolve) on the created sheet and verifies it renders live before it's marked done.

**Naming & timing (agreed):** each sheet's **title = the PDF's file name** (cleaned), and the **timer is auto-computed from the question count** (~1.5 min/question, rounded to sensible SAT pacing — e.g. 5 Q → 10 min, 11 Q → 18 min, 20 Q → 30 min). Name your PDFs however you want the sheets titled.

PDFs in this folder are git-ignored (not committed).
