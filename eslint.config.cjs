const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  location: 'readonly',
  history: 'readonly',
  URLSearchParams: 'readonly',
  FormData: 'readonly',
  fetch: 'readonly',
  alert: 'readonly',
  requestAnimationFrame: 'readonly',
  cancelAnimationFrame: 'readonly',
  getComputedStyle: 'readonly',
  localStorage: 'readonly',
  performance: 'readonly',
  setTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  IntersectionObserver: 'readonly',
  toggleMobileNav: 'readonly',
};

const nodeGlobals = {
  module: 'readonly',
  require: 'readonly',
  process: 'readonly',
  console: 'readonly',
  setTimeout: 'readonly',
  Buffer: 'readonly',
  __dirname: 'readonly',
};

module.exports = [
  {
    ignores: [
      '**/node_modules/**',
      '.firebase/**',
      'frontend/assets/js/runtime-config.js',
    ],
  },
  {
    files: ['backend/**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'script',
      globals: nodeGlobals,
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
    },
  },
  {
    files: ['frontend/assets/js/**/*.js', 'frontend/scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'script',
      globals: { ...browserGlobals, ...nodeGlobals },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
    },
  },
];
