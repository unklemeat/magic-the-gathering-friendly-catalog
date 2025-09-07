/**
 * Environment Configuration Module
 * Handles loading configuration from environment variables
 */

// Default configuration (fallback values)
const defaultConfig = {
    firebase: {
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: '',
        measurementId: ''
    },
    app: {
        appId: 'default-app-id'
    },
    auth: {
        sharePassword: ''
    }
};

/**
 * Get configuration from environment variables
 * In production, these would be injected by the build process
 * In development, they come from the server
 */
export function getConfig() {
    // Try to get config from window object (injected by server)
    if (typeof window !== 'undefined' && window.__APP_CONFIG__) {
        return window.__APP_CONFIG__;
    }
    
    // Fallback to default config
    console.warn('Using default configuration. Make sure environment variables are properly set.');
    return defaultConfig;
}

/**
 * Validate that required configuration is present
 */
export function validateConfig(config) {
    const required = [
        'firebase.apiKey',
        'firebase.authDomain', 
        'firebase.projectId',
        'firebase.storageBucket',
        'firebase.messagingSenderId',
        'firebase.appId'
    ];
    
    const missing = required.filter(path => {
        const value = path.split('.').reduce((obj, key) => obj?.[key], config);
        return !value || value.trim() === '';
    });
    
    if (missing.length > 0) {
        console.error('Missing required configuration:', missing);
        return false;
    }
    
    return true;
}
