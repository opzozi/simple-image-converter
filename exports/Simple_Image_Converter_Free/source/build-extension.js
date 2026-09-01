import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

const distDir = resolve(process.cwd(), 'dist');
const filesToCopy = [
  'manifest.json',
  'background.js',
  'offscreen.html',
  'offscreen.js',
  'copy-helper.js',
  '_locales',
  'icons'
];

function copyRecursive(src, dest) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }
  
  const entries = readdirSync(src);
  for (const entry of entries) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);
    
    if (stat.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

console.log('Copying extension files to dist...');

filesToCopy.forEach(file => {
  const src = resolve(process.cwd(), file);
  const dest = resolve(distDir, file);
  
  if (!existsSync(src)) {
    console.warn(`Warning: ${file} not found, skipping...`);
    return;
  }
  
  const stat = statSync(src);
  if (stat.isDirectory()) {
    copyRecursive(src, dest);
  } else {
    const destDir = resolve(dest, '..');
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }
    copyFileSync(src, dest);
  }
  console.log(`Copied ${file}`);
});

console.log('Done!');

console.log('Build complete!');

