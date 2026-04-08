const fs = require('fs')
const f = 'app/blog/data.js'
let c = fs.readFileSync(f, 'utf8')

c = c.replace(
  "This feels more natural for today's students who are already comfortable using digital devices.",
  "This feels more natural for today\\'s students who are already comfortable using digital devices."
)

fs.writeFileSync(f, c, 'utf8')
console.log('Done')
