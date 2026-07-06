# PDF → Question JSON — Spec & Process (DSATGURU)

This is the exact format our platform renders, plus the verification process for
converting PDFs into upload-ready tutor-test JSON. Goal: **zero errors**.

## 1. JSON shape (tutor / module / admin test-sheet upload format)

A test sheet is a JSON **array** of question objects, in order:

```json
[
  {
    "question": "The value of $x$ in $2x + 6 = 14$ is?",
    "option a": "2",
    "option b": "4",
    "option c": "6",
    "option d": "8",
    "correct answer": "B",
    "difficulty": "Easy",
    "subject": "Math",
    "tags": "Algebra, Linear equations",
    "shortexplanation": "Subtract 6, divide by 2 → $x=4$.",
    "longexplanation": "$2x+6=14 \\Rightarrow 2x=8 \\Rightarrow x=4$.",
    "remark": ""
  }
]
```

- **difficulty**: `Easy` | `Medium` | `Hard`
- **subject**: `Math` | `Reading and Writing`
- **correct answer**: the LETTER for MCQ (`A`/`B`/`C`/`D`).

## 2. Fill-in-the-blank (grid-in / student-produced response)

No answer choices. **Omit the `option a`–`option d` fields entirely** (or leave them
empty). `correct answer` is the typed value.

```json
{
  "question": "$3x^2 - 2x - 7 = 0$. What is the sum of the solutions?\n\n| Acceptable answers |\n| --- |\n| 0.667<br>0.6667<br>2/3 |",
  "correct answer": "2/3",
  "difficulty": "Medium",
  "subject": "Math",
  "tags": "Quadratics",
  "shortexplanation": "Sum of roots $= -b/a = 2/3$."
}
```

- Put the **acceptable forms** (e.g. `0.667 / 0.6667 / 2/3`) inside the question as a
  small table, using `<br>` to stack them (that's exactly how College Board shows them).
- The stored `correct answer` is ONE canonical value; grading is space/case-insensitive.

## 3. Math — LaTeX via KaTeX (from `LatexRenderer.js`)

- Inline math: `$ ... $` **or** `\( ... \)`
- Display math: `$$ ... $$` **or** `\[ ... \]`
- Escape backslashes in JSON: `\\Rightarrow`, `\\frac{1}{2}`, `\\sqrt{k}`, etc.

## 4. Images / figures

Embedded as markdown: `![alt](https://image-url)`. The renderer shows the URL as an
`<img>`. **A figure therefore needs a real hosted image URL** — see the images note
in the process below.

## 5. Tables — GitHub-flavored markdown

```
| Year | Value |
| --- | --- |
| 2020 | 5 |
| 2021 | 8 |
```

- A header row + a `---` separator row are required.
- Cells may contain LaTeX and `<br>` for line breaks.

## 6. Line breaks

Use `<br>` (or `\n` in text) for line breaks inside a field.

---

## 7. Conversion process (per PDF) — checked 3×

1. **OCR / read** the PDF page by page (text, math, tables, and note every figure).
2. **Transcribe** each question into the JSON shape above.
3. **Solve the answer myself** (don't trust the printed key blindly) and compare.
4. **Verify 3×:**
   - Pass 1 — question text, options, and LaTeX render correctly.
   - Pass 2 — I independently re-solve → the `correct answer` is right.
   - Pass 3 — full re-read vs the PDF; difficulty/subject/tags sane.
5. Anything I'm not 100% sure about is **flagged in `remark`**, never silently guessed.
6. Final JSON lands in `json-output/<sheet-name>.json`, then uploads to live.

## 8. Naming & existing sheets

- Each PDF → one sheet, named from the PDF (or its title on page 1).
- If a sheet with that name already exists live, I **update via the JSON edit
  (customQuestions overlay)** — I do **not** delete it, so students keep their data.
