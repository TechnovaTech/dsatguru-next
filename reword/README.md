# reword — PDF → reworded, answer-locked, upload-ready JSON

A ready-to-go pipeline: drop PDFs, get original-worded questions whose **correct answer never
changes**, saved as upload-format JSON — then upload to the live DB on command.

## You do
1. Put question PDFs in **`reword/input/`**.
2. Say **"process reword"** → Claude builds `reword/output/<name>.json` for each PDF.
3. Later, say **"upload reword live"** → Claude imports every `reword/output/*.json` to the live DB.

## What Claude does per PDF (multi-agent workflow — exhaustive, verified)

1. **Extract** every question: full stem/passage, the four options, and the correct answer —
   taken from the PDF's printed answer key when present, otherwise solved. Scanned PDFs are
   rendered to page images and read; data tables are reproduced inline (markdown), real
   graphs redrawn/tabulated; LaTeX is safe-escaped (`$` → `\$`).

2. **REWORD (answer-locked)** — rewrite each question in fresh, original wording: reworded
   sentences, different phrasing/context, restructured passages, new synonyms — while
   preserving the exact tested concept, the meaning of all four choices, and **the same
   correct answer**. Numbers/facts that would change the answer are never altered. For grammar
   items the tested error/rule is preserved; for reading items the passage is paraphrased, not
   replaced with different content.

3. **4× RE-CHECK (the answer is the invariant)** — the reworded question is independently
   re-solved **four times** by separate agents. All four must land on the **same correct answer
   letter as the original**. Any question where a check disagrees is re-worded and re-checked,
   or dropped and reported. Broken-source questions are skipped and reported. The answer key
   is never allowed to drift.

4. **Save** an upload-format JSON per PDF to `reword/output/<name>.json`:
   ```json
   [{ "question": "...", "option a": "...", "option b": "...", "option c": "...",
      "option d": "...", "correct answer": "A", "difficulty": "Medium",
      "subject": "Reading and Writing", "tags": "", "shortexplanation": "...",
      "longexplanation": "...", "remark": "<source>" }]
   ```

## Upload (on command)
- **Question bank (default):** `node scripts/import-bank-questions.cjs reword/output/<name>.json "<tag>"`
  (isTutor bank question, no sheet; `remark` per question kept).
- **Tutor sheet (if asked):** `node scripts/create-tutor-sheet.cjs reword/output/<name>.json "<title>" <mins> "<subject>"`.
- Then a live audit (structure / answer-resolves / renders) confirms it.

Deploy/upload runs on the VPS (Node + MONGO_URI there); output JSON is scp'd up first.

## Invariants
- **Correct answer never changes.** Rewording changes wording, never the key.
- Verified 4×. LaTeX-safe. Figures recreated, not cropped.
