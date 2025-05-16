/**
 * Import Path Fixer Script
 * 
 * This script scans files in the features directory and automatically
 * fixes common import path issues to ensure correct paths after
 * migration from client to site.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Maps for import path replacements
const importPathMap = {
  // Fix relative paths that should be absolute
  '"../base-element/base-element.js"': '"../../base-element/base-element.js"',
  '"../router.js"': '"../../router.js"',
  '"../react-utils/react-to-html.js"': '"../../react-utils/react-to-html.js"',
  
  // Fix service imports
  "'../../services/event-bus'": "'../../services/event-bus.js'",
  
  // Fix context imports
  "'../contexts/GroupContext'": "'../../contexts/GroupContext.js'",
  "'../contexts/SyncContext'": "'../../contexts/SyncContext.js'",
  "'../../contexts/GroupContext'": "'../../contexts/GroupContext.js'",
  "'../../contexts/SyncContext'": "'../../contexts/SyncContext.js'",
  
  // Fix store imports
  "'../../store/store'": "'../../store/store.js'",
  "'../../store/actions/notificationActions'": "'../../store/actions/notificationActions.js'"
};

// Paths to look for files in
const featureDirs = [
  './src/features/*/*.js',
  './src/features/*/*.jsx'
];

// Process files
let filesProcessed = 0;
let filesChanged = 0;

function processFiles() {
  // Get all the files matching our paths
  const files = [];
  featureDirs.forEach(pattern => {
    const matches = glob.sync(pattern);
    files.push(...matches);
  });
  
  console.log(`Found ${files.length} files to process`);
  
  // Process each file
  files.forEach(filePath => {
    filesProcessed++;
    const content = fs.readFileSync(filePath, 'utf8');
    let updatedContent = content;
    
    // Replace imports
    Object.entries(importPathMap).forEach(([oldPath, newPath]) => {
      updatedContent = updatedContent.replace(
        new RegExp(`import\\s+.*\\s+from\\s+${oldPath}`, 'g'),
        match => match.replace(oldPath, newPath)
      );
    });
    
    // Write back if changed
    if (content !== updatedContent) {
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      filesChanged++;
      console.log(`Fixed imports in: ${filePath}`);
    }
  });
  
  console.log(`\nSummary:`);
  console.log(`- Files processed: ${filesProcessed}`);
  console.log(`- Files changed: ${filesChanged}`);
}

// Run the processor
processFiles();
