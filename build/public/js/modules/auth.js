/**
 * Simple Password Authentication Module
 * Provides basic password protection for sharing with friends
 */

import { getConfig } from './config.js';

const AUTH_STORAGE_KEY = 'mgt_auth_token';
const AUTH_EXPIRY_HOURS = 24; // Token expires after 24 hours

/**
 * Generate a simple auth token
 */
function generateAuthToken() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return btoa(`${timestamp}:${random}`).replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Check if current auth token is valid
 */
function isAuthTokenValid(token) {
    if (!token) return false;
    
    try {
        const decoded = atob(token);
        const [timestamp] = decoded.split(':');
        const tokenTime = parseInt(timestamp, 10);
        const now = Date.now();
        const expiryTime = tokenTime + (AUTH_EXPIRY_HOURS * 60 * 60 * 1000);
        
        return now < expiryTime;
    } catch (error) {
        return false;
    }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
    const token = localStorage.getItem(AUTH_STORAGE_KEY);
    return isAuthTokenValid(token);
}

/**
 * Authenticate user with password
 */
export function authenticate(password) {
    const config = getConfig();
    const correctPassword = config.auth.sharePassword;
    
    if (!correctPassword) {
        console.error('No password configured in environment variables');
        return false;
    }
    
    if (password === correctPassword) {
        const token = generateAuthToken();
        localStorage.setItem(AUTH_STORAGE_KEY, token);
        return true;
    }
    
    return false;
}

/**
 * Logout user
 */
export function logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
}

/**
 * Get stored auth token
 */
export function getAuthToken() {
    return localStorage.getItem(AUTH_STORAGE_KEY);
}
