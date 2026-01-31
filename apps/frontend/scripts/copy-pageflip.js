const fs = require('fs')
const path = require('path')

const src = path.join(__dirname, '..', 'node_modules', 'page-flip', 'dist')
const dest = path.join(__dirname, '..', 'public', 'lib')

function copyRecursive(srcDir, destDir, flatten = false) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true })
  }
  
  const entries = fs.readdirSync(srcDir, { withFileTypes: true })
  
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name)
    let destPath
    
    if (flatten && entry.isDirectory()) {
      // Flatten: copy files from subdirectories directly to destDir
      copyRecursive(srcPath, destDir, true)
      continue
    } else {
      destPath = path.join(destDir, entry.name)
    }
    
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath, flatten)
    } else {
      fs.copyFileSync(srcPath, destPath)
      console.log(`Copied ${entry.name} to ${path.relative(path.join(__dirname, '..', 'public'), destPath)}`)
    }
  }
}

if (fs.existsSync(src)) {
  // Check if files are in a subdirectory (like dist/js/)
  const jsDir = path.join(src, 'js')
  if (fs.existsSync(jsDir)) {
    console.log('Found js subdirectory, copying files from there...')
    copyRecursive(jsDir, dest, true) // Flatten structure
  } else {
    copyRecursive(src, dest)
  }
  console.log('Successfully copied page-flip library to public/lib')
} else {
  console.warn('page-flip dist directory not found at:', src)
  process.exit(1)
}

