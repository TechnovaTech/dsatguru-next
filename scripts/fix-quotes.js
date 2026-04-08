const fs = require('fs')
const f = 'app/blog/data.js'
const c = fs.readFileSync(f, 'utf8')

// Fix unescaped apostrophes in the psat FAQ answers
const fixed = c
  .replace("It evaluates a student's skills in Reading, Writing, and Math. Colleges use SAT scores to assess a student's academic readiness", "It evaluates a student\\'s skills in Reading, Writing, and Math. Colleges use SAT scores to assess a student\\'s academic readiness")

fs.writeFileSync(f, fixed, 'utf8')
console.log('Done')
