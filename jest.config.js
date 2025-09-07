module.exports = {
  testEnvironment: 'jsdom',
  
  // Setup files to run before each test file
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Transform ES6 modules to CommonJS for testing
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  
  // Coverage settings
  collectCoverageFrom: [
    'public/js/modules/**/*.js',
    '!public/js/modules/**/*.test.js'
  ]
};
