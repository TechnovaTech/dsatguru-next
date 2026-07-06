# pdf-input

Drop your question PDFs here. One PDF = one tutor test sheet.

- Put the PDF(s) in this folder (any name — the sheet is named from the file/title).
- Tell me when they're in, and I'll OCR → build JSON → verify 3× → write the result
  to `../json-output/` → then upload to the live tutor test sheets.
- If a figure/diagram exists in a question, see the "images" note in
  `../PDF_TO_JSON_SPEC.md`.

PDFs in this folder are git-ignored (not committed).
