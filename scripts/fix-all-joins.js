const fs = require('fs')
const f = 'app/blog/data.js'
let c = fs.readFileSync(f, 'utf8')

// Fix all broken joins - stray }, between blog entries
const slugs = [
  '10-common-digital-sat-math-mistakes',
  'digital-sat-reading-writing-strategies',
  'psat-vs-digital-sat-prep-strategy',
  'digital-sat-practice-tests-right-way',
]

for (const slug of slugs) {
  // Match any variant of broken join before this slug
  const patterns = [
    `  },\n},\r\n  {\r\n    slug: '${slug}'`,
    `  },\r\n},\r\n  {\r\n    slug: '${slug}'`,
    `  },\n},\n  {\n    slug: '${slug}'`,
    `  },\n\n},\r\n  {\r\n    slug: '${slug}'`,
    `  },\r\n\n},\r\n  {\r\n    slug: '${slug}'`,
    `    ],\n    {\n    slug: '${slug}'`,
    `    ],\r\n    {\r\n    slug: '${slug}'`,
  ]
  for (const p of patterns) {
    if (c.includes(p)) {
      c = c.replace(p, `  },\r\n  {\r\n    slug: '${slug}'`)
      console.log('Fixed:', slug)
    }
  }
}

fs.writeFileSync(f, c, 'utf8')
console.log('All done')
