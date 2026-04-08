const fs = require('fs')
const f = 'app/blog/data.js'
const c = fs.readFileSync(f, 'utf8')
const i = c.indexOf('digital-sat-practice-tests-right-way')
// Show 100 chars before this slug
console.log(JSON.stringify(c.substring(i - 100, i + 50)))
