// Jest setup file for browser API mocks
// This file is loaded before each test file to provide consistent mocks

// Mock fetch API
global.fetch = jest.fn();

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL = {
  createObjectURL: jest.fn(() => 'mock-blob-url'),
  revokeObjectURL: jest.fn()
};

// Mock Blob constructor
global.Blob = jest.fn().mockImplementation((content, options) => ({
  content,
  options,
  size: content ? content.reduce((acc, item) => acc + (item.length || 0), 0) : 0,
  type: options?.type || ''
}));

// Mock FileReader
class MockFileReader {
  constructor() {
    this.readyState = 0;
    this.result = null;
    this.error = null;
    this.onload = null;
    this.onerror = null;
    this.onloadend = null;
  }

  readAsText(file) {
    // Simulate async file reading
    setTimeout(() => {
      this.readyState = 2; // DONE
      this.result = 'Lightning Bolt;DOM\nFireball;DOM';
      if (this.onload) this.onload({ target: this });
      if (this.onloadend) this.onloadend({ target: this });
    }, 0);
  }

  readAsDataURL(file) {
    setTimeout(() => {
      this.readyState = 2;
      this.result = 'data:text/plain;base64,bW9jayBmaWxlIGNvbnRlbnQ=';
      if (this.onload) this.onload({ target: this });
      if (this.onloadend) this.onloadend({ target: this });
    }, 0);
  }
}

global.FileReader = MockFileReader;

// Mock webkitSpeechRecognition
class MockSpeechRecognition {
  constructor() {
    this.continuous = false;
    this.lang = 'en-US';
    this.interimResults = false;
    this.onstart = null;
    this.onresult = null;
    this.onend = null;
    this.onerror = null;
  }

  start() {
    // Simulate speech recognition start
    setTimeout(() => {
      if (this.onstart) this.onstart();
    }, 0);
  }

  stop() {
    // Simulate speech recognition end
    setTimeout(() => {
      if (this.onend) this.onend();
    }, 0);
  }
}

// Mock webkitSpeechRecognition - only available when explicitly set
// This allows tests to control whether voice recognition is available
// We need to make it undefined by default but allow tests to override it
delete window.webkitSpeechRecognition;

// Mock document methods
const originalGetElementById = document.getElementById;
document.getElementById = jest.fn((id) => {
  // Return a mock element for common IDs used in tests
  if (id === 'setSelect') {
    return {
      innerHTML: '',
      appendChild: jest.fn(),
      value: '',
      addEventListener: jest.fn()
    };
  }
  return originalGetElementById.call(document, id);
});

// Mock document.createElement for anchor elements (used in file downloads)
const originalCreateElement = document.createElement;
document.createElement = jest.fn((tagName) => {
  if (tagName === 'a') {
    return {
      href: '',
      download: '',
      click: jest.fn(),
      style: {}
    };
  }
  return originalCreateElement.call(document, tagName);
});

// Mock document.body methods
document.body.appendChild = jest.fn();
document.body.removeChild = jest.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock window.location for any location-based tests
// Note: jsdom provides a basic location object, so we don't need to mock it

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true
});

// Mock IntersectionObserver (used by some UI libraries)
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn();

// Mock performance.now
global.performance = {
  now: jest.fn(() => Date.now())
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset fetch mock
  if (fetch.mockClear) fetch.mockClear();
  
  // Reset URL mocks
  if (URL.createObjectURL.mockClear) URL.createObjectURL.mockClear();
  if (URL.revokeObjectURL.mockClear) URL.revokeObjectURL.mockClear();
  
  // Reset console mocks
  if (console.log.mockClear) console.log.mockClear();
  if (console.warn.mockClear) console.warn.mockClear();
  if (console.error.mockClear) console.error.mockClear();
  
  // Reset localStorage mocks
  if (window.localStorage.getItem.mockClear) window.localStorage.getItem.mockClear();
  if (window.localStorage.setItem.mockClear) window.localStorage.setItem.mockClear();
  if (window.localStorage.removeItem.mockClear) window.localStorage.removeItem.mockClear();
  if (window.localStorage.clear.mockClear) window.localStorage.clear.mockClear();
  
  // Reset sessionStorage mocks
  if (window.sessionStorage.getItem.mockClear) window.sessionStorage.getItem.mockClear();
  if (window.sessionStorage.setItem.mockClear) window.sessionStorage.setItem.mockClear();
  if (window.sessionStorage.removeItem.mockClear) window.sessionStorage.removeItem.mockClear();
  if (window.sessionStorage.clear.mockClear) window.sessionStorage.clear.mockClear();
});
