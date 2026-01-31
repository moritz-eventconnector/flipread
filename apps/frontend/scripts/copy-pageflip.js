const fs = require('fs')
const path = require('path')

const src = path.join(__dirname, '..', 'node_modules', 'page-flip', 'dist')
const dest = path.join(__dirname, '..', 'public', 'lib')

if (fs.existsSync(src)) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }
  
  const files = fs.readdirSync(src)
  files.forEach(file => {
    const srcPath = path.join(src, file)
    const destPath = path.join(dest, file)
    if (fs.statSync(srcPath).isFile()) {
      fs.copyFileSync(srcPath, destPath)
      console.log(`Copied ${file} to public/lib/`)
    }
  })
  console.log('Successfully copied page-flip library to public/lib')
} else {
  console.warn('page-flip dist directory not found at:', src)
}

