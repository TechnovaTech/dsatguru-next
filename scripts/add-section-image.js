const fs = require('fs')
const f = 'app/blog/data.js'
let c = fs.readFileSync(f, 'utf8')

c = c.replace(
  "heading: 'Quick Tips to Score Better in Digital SAT Math',\n        body: 'Along with avoiding mistakes, follow these simple habits:',\n        bullets: [",
  "heading: 'Quick Tips to Score Better in Digital SAT Math',\n        sectionImage: '/b22.png',\n        body: 'Along with avoiding mistakes, follow these simple habits:',\n        bullets: ["
)

if (c.includes("sectionImage: '/b22.png'")) {
  fs.writeFileSync(f, c, 'utf8')
  console.log('Done')
} else {
  console.log('NO MATCH')
}
