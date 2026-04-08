const fs = require('fs')
const f = 'app/blog/data.js'
let c = fs.readFileSync(f, 'utf8')

c = c.replace(
  '  },\n },\r\n  {\n    slug: \'10-common-digital-sat-math-mistakes\'',
  '  },\r\n  {\n    slug: \'10-common-digital-sat-math-mistakes\''
)

if (c.includes(' },\r\n  {\n    slug: \'10-common-digital-sat-math-mistakes\'')) {
  console.log('still broken')
} else {
  fs.writeFileSync(f, c, 'utf8')
  console.log('Done')
}
