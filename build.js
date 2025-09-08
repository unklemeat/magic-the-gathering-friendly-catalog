/**
 * Build script for static hosting
 * Injects environment variables at build time
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Read the HTML file
const indexPath = path.join(__dirname, 'public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Create configuration object
const config = {
    firebase: {
        apiKey: process.env.FIREBASE_API_KEY || '',
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
        projectId: process.env.FIREBASE_PROJECT_ID || '',
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
        appId: process.env.FIREBASE_APP_ID || '',
        measurementId: process.env.FIREBASE_MEASUREMENT_ID || ''
    },
    app: {
        appId: process.env.APP_ID || 'default-app-id'
    },
    auth: {
        sharePassword: process.env.SHARE_PASSWORD || ''
    }
};

// Inject config before closing head tag
const configScript = `
    <script>
        window.__APP_CONFIG__ = ${JSON.stringify(config)};
    </script>
    `;

html = html.replace('</head>', `${configScript}</head>`);

// Write the built HTML file
const buildDir = path.join(__dirname, 'build');
if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir);
}

fs.writeFileSync(path.join(buildDir, 'index.html'), html);

// Copy all static files to build directory
const copyRecursive = (src, dest) => {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            copyRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
};

// Copy public files directly to build directory (excluding index.html which we already processed)
const publicDir = path.join(__dirname, 'public');

if (fs.existsSync(publicDir)) {
    const entries = fs.readdirSync(publicDir, { withFileTypes: true });
    
    for (let entry of entries) {
        if (entry.name !== 'index.html') {
            const srcPath = path.join(publicDir, entry.name);
            const destPath = path.join(buildDir, entry.name);
            
            if (entry.isDirectory()) {
                copyRecursive(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
}

console.log('✅ Build completed successfully!');
console.log('📁 Built files are in the "build" directory');
console.log('🔐 Environment variables injected at build time');
