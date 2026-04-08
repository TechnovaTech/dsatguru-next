const fs = require('fs')
const f = 'app/blog/data.js'
const c = fs.readFileSync(f, 'utf8')

// Fix stray closing brace between psat and practice-tests entries
const fixed = c.replace('  },\n\n\n},\n\n  {\n    slug: \'digital-sat-practice-tests-right-way\'', '  },\n\n  {\n    slug: \'digital-sat-practice-tests-right-way\'')

fs.writeFileSync(f, fixed, 'utf8')
console.log('Done')
