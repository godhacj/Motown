// rename-boardwalk-images.js
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../public/assets/Boardwalk and Fishing Pier images');
const files = fs.readdirSync(dir)
  .filter(f => f.match(/\.jpe?g$/i) && !f.startsWith('__MACOSX'))
  .sort();

files.forEach((file, i) => {
  const ext = path.extname(file);
  const newName = `image${i + 1}${ext.toLowerCase()}`;
  const oldPath = path.join(dir, file);
  const newPath = path.join(dir, newName);
  if (file !== newName) {
    fs.renameSync(oldPath, newPath);
    console.log(`Renamed: ${file} -> ${newName}`);
  }
});

// Print new galleryImages array
const galleryImages = files.map((_, i) =>
  `/assets/Boardwalk and Fishing Pier images/image${i + 1}.jpeg`
);
console.log('\nCopy this into galleryImages.js:\n');
console.log('export const galleryImages = [');
galleryImages.forEach(img => console.log(`  '${img}',`));
console.log('];');