const fs = require('fs')
const f = 'app/blog/data.js'
let c = fs.readFileSync(f, 'utf8')

// Fix unescaped apostrophe in math blog
c = c.replace(
  "body: 'Parents play an important role in a student's preparation.",
  "body: 'Parents play an important role in a student\\'s preparation."
)

fs.writeFileSync(f, c, 'utf8')
console.log('Done')
