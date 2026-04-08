const fs = require('fs')
const f = 'app/blog/data.js'
let c = fs.readFileSync(f, 'utf8')

// exact sequence: },\n    ],\n  },\n },\r\n  {\n    slug: '10-common...
// fix to:         },\n    ],\n  },\r\n  {\n    slug: '10-common...
const broken = "      },\n    ],\n  },\n },\r\n  {\n    slug: '10-common-digital-sat-math-mistakes'"
const fixed  = "      },\n    ],\n  },\r\n  {\n    slug: '10-common-digital-sat-math-mistakes'"

if (c.includes(broken)) {
  c = c.replace(broken, fixed)
  fs.writeFileSync(f, c, 'utf8')
  console.log('Done')
} else {
  console.log('NO MATCH - trying alternate')
  // try without leading spaces on },
  const b2 = "    ],\n  },\n },\r\n  {\n    slug: '10-common-digital-sat-math-mistakes'"
  const f2 = "    ],\n  },\r\n  {\n    slug: '10-common-digital-sat-math-mistakes'"
  if (c.includes(b2)) {
    c = c.replace(b2, f2)
    fs.writeFileSync(f, c, 'utf8')
    console.log('Done with alternate')
  } else {
    console.log('STILL NO MATCH')
  }
}
