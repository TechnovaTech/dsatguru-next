# bank-input — Question Bank population

Drop the **question-bank PDFs** here. I read each PDF and import its questions into the
admin **Question Bank** (dsatguru.com/admin/question-bank):

- **Math** PDFs → **Math Database** bank
- **Reading & Writing** PDFs → **Reading & Writing Database** bank

## What happens to each question

1. **Rewording (copyright-safe):** the wording AND the context/names/scenario are changed
   (e.g. "a store / Maria" → "a workshop / Ravi") so nothing is copied verbatim — but
   **every number, the math, the option values, and the correct answer stay identical.**
2. **Wrong options fixed:** any incorrect answer choice is corrected.
3. **Region tag (US / International):** read per-question from the PDF itself and stored on
   the question. In the bank UI you can **filter by Region** and **edit it via a dropdown**
   on each question.
4. Imported with `isTutor: false` (these are admin bank questions, not tutor-sheet questions).

## Notes

- PDFs are git-ignored (`.gitignore`); only this README is tracked.
- Figures/graphs are recreated as clean SVG→PNG (never cropped from the source PDF).
- LaTeX is validated before import (literal `$` written as `\$`, no plain-text math outside `$…$`).
