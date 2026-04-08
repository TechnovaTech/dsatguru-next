const fs = require('fs')
const f = 'app/blog/data.js'
let c = fs.readFileSync(f, 'utf8')

// Fix all stray " }," between blog entries (space + }, pattern)
const slugs = [
  'digital-sat-vs-paper-sat',
  '10-common-digital-sat-math-mistakes',
  'digital-sat-reading-writing-strategies',
  'psat-vs-digital-sat-prep-strategy',
  'digital-sat-practice-tests-right-way',
]

for (const slug of slugs) {
  const broken = `  },\n },\r\n  {\n    slug: '${slug}'`
  const fixed  = `  },\r\n  {\n    slug: '${slug}'`
  if (c.includes(broken)) {
    c = c.replace(broken, fixed)
    console.log('Fixed:', slug)
  }
}

fs.writeFileSync(f, c, 'utf8')
console.log('Done')
