const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Route for the main page with environment variables injection
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, '../public/index.html');
    
    // Read the HTML file
    let html = fs.readFileSync(indexPath, 'utf8');
    
    // Inject environment variables into the HTML
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
    
    res.send(html);
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📁 Serving static files from: ${path.join(__dirname, '../public')}`);
    console.log('🔐 Environment variables loaded from .env file');
});

module.exports = app;
