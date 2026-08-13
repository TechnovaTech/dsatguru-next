# reword/output — upload-ready JSON lands here

One `<name>.json` per processed PDF, in the exact upload format used by the importers
(`question`, `option a`–`option d`, `correct answer`, `difficulty`, `subject`, `tags`,
`shortexplanation`, `longexplanation`, `remark`).

- Generated files are git-ignored.
- When you say **"upload reword live"**, Claude imports every `*.json` here into the live DB
  and verifies it rendered.
