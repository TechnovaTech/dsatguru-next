const fs = require('fs')
const f = 'app/blog/data.js'
const c = fs.readFileSync(f, 'utf8')

const fixed = c.replace(
  '  },\n},\r\n  {\r\n    slug: \'digital-sat-reading-writing-strategies\'',
  '  },\r\n  {\r\n    slug: \'digital-sat-reading-writing-strategies\''
)

if (fixed === c) { console.log('NO MATCH') } else { fs.writeFileSync(f, fixed, 'utf8'); console.log('Done') }
