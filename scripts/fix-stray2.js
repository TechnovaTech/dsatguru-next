const fs = require('fs')
const f = 'app/blog/data.js'
const c = fs.readFileSync(f, 'utf8')
// exact match: \n  },\n\n},\r\n  {  -> \n  },\r\n  {
const fixed = c.replace('  },\n\n},\r\n  {\r\n    slug: \'digital-sat-practice-tests-right-way\'', '  },\r\n  {\r\n    slug: \'digital-sat-practice-tests-right-way\'')
if (fixed === c) { console.log('NO MATCH'); } else { fs.writeFileSync(f, fixed, 'utf8'); console.log('Done'); }
