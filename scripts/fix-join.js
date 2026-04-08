const fs = require('fs')
const f = 'app/blog/data.js'
const c = fs.readFileSync(f, 'utf8')
// Fix: replace the broken join between RW blog end and PSAT blog start
const fixed = c.replace('],\r\n    {\n    slug: \'psat-vs-digital-sat-prep-strategy\'', '],\r\n  },\r\n  {\n    slug: \'psat-vs-digital-sat-prep-strategy\'')
fs.writeFileSync(f, fixed, 'utf8')
console.log('Done')
