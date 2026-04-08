const fs = require('fs')
const f = 'app/blog/data.js'
let c = fs.readFileSync(f, 'utf8')

c = c.replace('export const blogPosts =  {\n', 'export const blogPosts = [\n  {\n')

fs.writeFileSync(f, c, 'utf8')
console.log('Done')
