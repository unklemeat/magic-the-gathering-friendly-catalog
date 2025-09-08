# MGT Development Guide

## Project Overview

MGT (Magic: The Gathering) is a web application for managing Magic: The Gathering card collections and decks. The application uses Firebase for backend services and provides a modern, responsive interface for card search, collection management, and deck building.

## Codebase Structure

```
mgt/
├── src/                          # Server-side code
│   └── server.js                 # Express server with environment injection
├── public/                       # Client-side application
│   ├── index.html               # Main HTML file
│   ├── css/
│   │   └── style.css            # Application styles
│   └── js/
│       ├── app.js               # Main application entry point
│       └── modules/             # Modular JavaScript components
│           ├── auth.js          # Authentication management
│           ├── collectionManagement.js  # Collection CRUD operations
│           ├── config.js        # Environment configuration loader
│           ├── events.js        # Event handling and UI interactions
│           ├── firebase.js      # Firebase initialization and services
│           ├── login.js         # Login/logout functionality
│           ├── scryfallApi.js   # Scryfall API integration
│           ├── searchFilter.js  # Card search and filtering
│           ├── state.js         # Application state management
│           ├── translations.js  # Internationalization
│           └── ui.js            # UI utilities and helpers
├── build/                       # Built files for deployment (auto-generated)
├── tests/                       # Unit tests
│   ├── collectionManagement.test.js
│   ├── scryfallApi.test.js
│   ├── searchFilter.test.js
│   └── translations.test.js
├── e2e/                         # End-to-end tests
│   ├── collection.spec.js
│   ├── decks.spec.js
│   ├── search.spec.js
│   └── smoke.spec.js
├── build.js                     # Build script for static hosting
├── firebase.json               # Firebase hosting configuration
├── env.example                 # Environment variables template
└── package.json                # Dependencies and scripts
```

## Environment Configuration

### Setting Up Environment Variables

1. **Copy the environment template:**
   ```bash
   cp env.example .env
   ```

2. **Configure your Firebase project:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or select existing one
   - Go to Project Settings → General → Your apps
   - Add a web app and copy the configuration values

3. **Fill in your `.env` file:**
   ```env
   # Firebase Project Configuration
   FIREBASE_API_KEY=your_actual_api_key
   FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
   FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   FIREBASE_APP_ID=your_app_id
   FIREBASE_MEASUREMENT_ID=your_measurement_id

   # App Configuration
   APP_ID=your-app-identifier

   # Simple Password Authentication (for sharing with friends)
   SHARE_PASSWORD=your_secure_password
   ```

4. **Important Security Notes:**
   - ⚠️ **NEVER commit `.env` to version control**
   - The `.env` file is already in `.gitignore`
   - Firebase API keys are safe to expose in client-side code
   - The `SHARE_PASSWORD` is used for simple authentication

## Development Environment

### Auto-Reloading Development Setup

This project includes an auto-reloading development environment that will:
- Automatically restart the server when you change server-side code
- Automatically refresh the browser when you change client-side code (HTML, CSS, JS)

### Available Scripts

- `npm run dev` - Start the server with nodemon (server auto-restart only)
- `npm run dev:live` - Start both server and browser-sync (full auto-reloading)
- `npm start` - Start the server normally (no auto-reloading)
- `npm test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:e2e:ui` - Run E2E tests with UI
- `npm run test:all` - Run both unit and E2E tests

### How to Use

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables** (see Environment Configuration above)

3. **Start the development environment:**
   ```bash
   npm run dev:live
   ```

4. **The browser will automatically open** to `http://localhost:3000`

5. **Make changes to your code:**
   - Server changes (in `src/`): Server will restart automatically
   - Client changes (in `public/`): Browser will refresh automatically

6. **Stop the development environment:**
   - Press `Ctrl+C` in the terminal

### Configuration Files

- `bs-config.js` - Browser-sync configuration
- `nodemon.json` - Nodemon configuration for server watching
- `.babelrc` - Babel configuration for JavaScript transpilation
- `jest.config.js` - Jest testing configuration
- `playwright.config.js` - Playwright E2E testing configuration

### What Gets Watched

- **Server files**: `src/**/*.js`
- **Client files**: `public/**/*.html`, `public/**/*.css`, `public/**/*.js`
- **Ignored**: `node_modules/`, `tests/`, `*.test.js`, `build/`, `test-results/`, `playwright-report/`

### Troubleshooting

If the browser doesn't open automatically, manually navigate to:
- **Browser-sync (recommended)**: `http://localhost:3000` (with auto-reload, proxies to Express server)
- **Express server (direct)**: `http://localhost:3001` (direct server access, no auto-reload)

### Architecture

- **Express server** runs on port 3001 and serves the application
- **Browser-sync** runs on port 3000 and proxies requests to the Express server
- **Browser-sync UI** runs on port 3002 (for configuration and debugging)
- **Auto-reload** works by browser-sync watching file changes and refreshing the browser

## Deployment to Firebase

### Prerequisites

1. **Install Firebase CLI:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase:**
   ```bash
   firebase login
   ```

3. **Initialize Firebase project** (if not already done):
   ```bash
   firebase init hosting
   ```

### Deployment Process

#### Option 1: Quick Deploy (Recommended)
```bash
npm run build:firebase
```
This command will:
1. Build the application (`npm run build`)
2. Deploy to Firebase (`firebase deploy`)

#### Option 2: Manual Deploy
```bash
# 1. Build the application
npm run build

# 2. Deploy to Firebase
firebase deploy
```

### Build Process

The build process (`build.js`) does the following:

1. **Reads environment variables** from `.env` file
2. **Injects configuration** into the HTML file at build time
3. **Copies all static files** from `public/` to `build/` directory
4. **Creates a production-ready** static site in the `build/` folder

### Firebase Hosting Configuration

The `firebase.json` file configures:
- **Public directory**: `build/` (where built files are served from)
- **Headers**: Proper MIME types for JS and CSS files
- **Ignore patterns**: Excludes development files from deployment

### Environment Variables in Production

- **Development**: Environment variables are injected by the Express server
- **Production**: Environment variables are injected at build time into static files
- **Security**: Firebase API keys are safe to expose in client-side code

### Deployment Checklist

Before deploying:

1. ✅ **Environment variables configured** in `.env`
2. ✅ **Firebase project set up** and configured
3. ✅ **All tests passing**: `npm run test:all`
4. ✅ **Build successful**: `npm run build`
5. ✅ **Firebase CLI authenticated**: `firebase login`

### Post-Deployment

After successful deployment:
- Your app will be available at: `https://your-project-id.web.app`
- Check Firebase Console for deployment status
- Monitor Firebase Analytics for usage data

### Troubleshooting Deployment

**Build fails:**
- Check that all environment variables are set in `.env`
- Ensure `public/index.html` exists and is valid

**Deploy fails:**
- Verify Firebase CLI is logged in: `firebase login`
- Check Firebase project ID in `.firebaserc`
- Ensure Firebase project has hosting enabled

**App doesn't work after deployment:**
- Check browser console for errors
- Verify Firebase configuration in built files
- Check Firebase project settings and API keys
