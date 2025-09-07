/**
 * Login UI Module
 * Handles the login interface and authentication flow
 */

import { authenticate, isAuthenticated } from './auth.js';

/**
 * Show login modal
 */
export function showLoginModal() {
    const modal = document.createElement('div');
    modal.id = 'loginModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content bg-white rounded-xl p-8 shadow-2xl max-w-md w-full mx-4">
            <div class="text-center mb-6">
                <h2 class="text-2xl font-bold text-gray-900 mb-2">Access Required</h2>
                <p class="text-gray-600">Enter the password to access the MTG Collection Tracker</p>
            </div>
            
            <form id="loginForm" class="space-y-4">
                <div>
                    <label for="passwordInput" class="block text-sm font-medium text-gray-700 mb-2">
                        Password
                    </label>
                    <input 
                        type="password" 
                        id="passwordInput" 
                        class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                        placeholder="Enter password"
                        required
                        autocomplete="current-password"
                    >
                </div>
                
                <div id="loginError" class="hidden text-red-600 text-sm text-center"></div>
                
                <button 
                    type="submit" 
                    class="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 hover:scale-105"
                >
                    Access App
                </button>
            </form>
            
            <div class="mt-4 text-center text-sm text-gray-500">
                <p>This app is shared with friends only</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Focus on password input
    setTimeout(() => {
        document.getElementById('passwordInput').focus();
    }, 100);
    
    // Handle form submission
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Handle Enter key
    document.getElementById('passwordInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleLogin(e);
        }
    });
}

/**
 * Handle login form submission
 */
function handleLogin(event) {
    event.preventDefault();
    
    const passwordInput = document.getElementById('passwordInput');
    const errorDiv = document.getElementById('loginError');
    const password = passwordInput.value.trim();
    
    // Clear previous errors
    errorDiv.classList.add('hidden');
    errorDiv.textContent = '';
    
    if (!password) {
        showError('Please enter a password');
        return;
    }
    
    // Attempt authentication
    if (authenticate(password)) {
        // Success - hide modal and show app
        hideLoginModal();
        showApp();
    } else {
        // Failed - show error
        showError('Incorrect password. Please try again.');
        passwordInput.value = '';
        passwordInput.focus();
    }
}

/**
 * Show error message
 */
function showError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

/**
 * Hide login modal
 */
function hideLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.remove();
    }
}

/**
 * Show the main application
 */
function showApp() {
    const app = document.getElementById('app');
    if (app) {
        app.classList.remove('hidden');
    }
}

/**
 * Initialize authentication check
 */
export function initAuth() {
    if (isAuthenticated()) {
        // User is already authenticated, show app
        showApp();
    } else {
        // User needs to login, show login modal
        showLoginModal();
    }
}
