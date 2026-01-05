import { renameSync, existsSync, readdirSync, statSync, rmdirSync } from 'fs';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const distDir = resolve(process.cwd(), 'dist');

// Find and move HTML files recursively
function findAndMoveHtml(dir, targetName) {
  if (!existsSync(dir)) return false;
  
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = resolve(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (findAndMoveHtml(fullPath, targetName)) {
        return true;
      }
    } else if (entry === 'index.html') {
      const targetPath = resolve(distDir, targetName);
      renameSync(fullPath, targetPath);
      console.log(`Moved ${fullPath} to ${targetName}`);
      // Update HTML to reference correct paths (relative paths for Chrome extension)
      let content = readFileSync(targetPath, 'utf-8');
      content = content.replace(/src="\//g, 'src="');
      content = content.replace(/href="\//g, 'href="');
      writeFileSync(targetPath, content);
      return true;
    }
  }
  return false;
}

// Move JS and CSS files to root
function moveFilesToRoot(dir) {
  if (!existsSync(dir)) return;
  
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = resolve(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isFile() && (entry.endsWith('.js') || entry.endsWith('.css'))) {
      const targetPath = resolve(distDir, entry);
      if (fullPath !== targetPath && !existsSync(targetPath)) {
        renameSync(fullPath, targetPath);
        console.log(`Moved ${entry} to root`);
      }
    } else if (stat.isDirectory()) {
      moveFilesToRoot(fullPath);
    }
  }
}

// Clean up empty directories
function cleanupEmptyDirs(dir) {
  if (!existsSync(dir)) return;
  
  const entries = readdirSync(dir);
  if (entries.length === 0 && dir !== distDir) {
    try {
      rmdirSync(dir);
      console.log(`Removed empty directory: ${dir}`);
    } catch (e) {
      // Ignore errors
    }
    return;
  }
  
  for (const entry of entries) {
    const fullPath = resolve(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      cleanupEmptyDirs(fullPath);
    }
  }
  
  // Check again after cleaning subdirectories
  if (existsSync(dir)) {
    const remainingEntries = readdirSync(dir);
    if (remainingEntries.length === 0 && dir !== distDir) {
      try {
        rmdirSync(dir);
        console.log(`Removed empty directory: ${dir}`);
      } catch (e) {
        // Ignore errors
      }
    }
  }
}

// Process files
console.log('Post-build cleanup...');
findAndMoveHtml(distDir, 'options.html');
findAndMoveHtml(distDir, 'popup.html');

moveFilesToRoot(resolve(distDir, 'src'));
moveFilesToRoot(distDir);

cleanupEmptyDirs(resolve(distDir, 'src'));
cleanupEmptyDirs(distDir);

console.log('Post-build cleanup complete!');
