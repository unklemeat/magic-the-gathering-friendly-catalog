/**
 * Build script for static hosting
 * Injects environment variables at build time
 * and ensures a clean build directory.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const buildDir = path.join(__dirname, 'build');
const publicDir = path.join(__dirname, 'public');

// --- 1. Clean the build directory ---
if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true, force: true });
}
fs.mkdirSync(buildDir);

console.log('🧹 Cleaned build directory.');

// --- 2. Process and inject config into index.html ---
const indexPath = path.join(publicDir, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

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

const configScript = `
    <script>
        window.__APP_CONFIG__ = ${JSON.stringify(config)};
    </script>
`;

html = html.replace('</head>', `${configScript}</head>`);
fs.writeFileSync(path.join(buildDir, 'index.html'), html);

console.log('📄 Processed index.html.');

// --- 3. Copy all other static files from public to build ---
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

console.log('🎨 Copied static assets.');
console.log('\n✅ Build completed successfully!');
console.log('📁 Built files are in the "build" directory');
console.log('🔐 Environment variables injected at build time');