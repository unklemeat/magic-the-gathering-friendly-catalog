# Development Environment

## Auto-Reloading Development Setup

This project includes an auto-reloading development environment that will:
- Automatically restart the server when you change server-side code
- Automatically refresh the browser when you change client-side code (HTML, CSS, JS)

### Available Scripts

- `npm run dev` - Start the server with nodemon (server auto-restart only)
- `npm run dev:live` - Start both server and browser-sync (full auto-reloading)
- `npm start` - Start the server normally (no auto-reloading)
- `npm test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode

### How to Use

1. **Start the development environment:**
   ```bash
   npm run dev:live
   ```

2. **The browser will automatically open** to `http://localhost:3000`

3. **Make changes to your code:**
   - Server changes (in `src/`): Server will restart automatically
   - Client changes (in `public/`): Browser will refresh automatically

4. **Stop the development environment:**
   - Press `Ctrl+C` in the terminal

### Configuration Files

- `bs-config.js` - Browser-sync configuration
- `nodemon.json` - Nodemon configuration for server watching

### What Gets Watched

- **Server files**: `src/**/*.js`
- **Client files**: `public/**/*.html`, `public/**/*.css`, `public/**/*.js`
- **Ignored**: `node_modules/`, `tests/`, `*.test.js`

### Troubleshooting

If the browser doesn't open automatically, manually navigate to:
- **Browser-sync (recommended)**: `http://localhost:3000` (with auto-reload, proxies to Express server)
- **Express server (direct)**: `http://localhost:3001` (direct server access, no auto-reload)

### Architecture

- **Express server** runs on port 3001 and serves the application
- **Browser-sync** runs on port 3000 and proxies requests to the Express server
- **Browser-sync UI** runs on port 3002 (for configuration and debugging)
- **Auto-reload** works by browser-sync watching file changes and refreshing the browser
