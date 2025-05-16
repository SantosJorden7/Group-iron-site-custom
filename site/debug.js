/**
 * Debug utility for fixing black screen issues
 * Run this script to identify and fix critical rendering issues
 */

const fs = require('fs');
const path = require('path');

// Check if the public directory exists
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
    console.log('Created missing public directory');
}

// Check the build output file
const appJsPath = path.join(publicDir, 'app.js');
if (!fs.existsSync(appJsPath)) {
    console.log('app.js is missing in the public directory, this is likely why you see a black screen');
    console.log('Try running the build again after fixing errors');
} else {
    console.log('app.js exists but might have errors.');
    
    // Check for React initialization
    try {
        const content = fs.readFileSync(appJsPath, 'utf8');
        if (!content.includes('React.createElement') && !content.includes('react')) {
            console.log('WARNING: React might not be properly initialized in the bundle!');
        }
        
        if (content.length < 1000) {
            console.log('WARNING: app.js seems too small, likely an incomplete build!');
        }
        
        console.log(`app.js size: ${(content.length / 1024).toFixed(2)}KB`);
    } catch (err) {
        console.error('Error checking app.js:', err);
    }
}

// Check index.html for proper script loading
const indexHtmlPath = path.join(publicDir, 'index.html');
if (!fs.existsSync(indexHtmlPath)) {
    console.log('Warning: index.html is missing from public directory.');
} else {
    try {
        const content = fs.readFileSync(indexHtmlPath, 'utf8');
        if (!content.includes('<script src="app.js"></script>')) {
            console.log('WARNING: index.html might not be loading app.js correctly!');
        }
    } catch (err) {
        console.error('Error checking index.html:', err);
    }
}

// Check the features directory to ensure all required features are present
const featuresDir = path.join(__dirname, 'src', 'features');
if (!fs.existsSync(featuresDir)) {
    console.log('ERROR: features directory is missing!');
} else {
    const requiredFeatures = [
        'activities',
        'boss-strategy',
        'collection-log',
        'dps-calculator',
        'group-challenges',
        'group-milestones',
        'shared-calendar',
        'slayer-tasks',
        'valuable-drops'
    ];
    
    const missingFeatures = requiredFeatures.filter(feature => {
        return !fs.existsSync(path.join(featuresDir, feature));
    });
    
    if (missingFeatures.length > 0) {
        console.log('Missing required features:', missingFeatures.join(', '));
    } else {
        console.log('All required features are present in the features directory');
    }
}

console.log('\nRecommended fix for black screen:');
console.log('1. Run: npm run clean');
console.log('2. Run: node build.js');
console.log('3. Check if there are any errors in the console');
console.log('4. Make sure public/app.js and public/index.html exist');
console.log('5. Start the server with: npm run start');
