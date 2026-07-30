module.exports = {
  root: true,
  extends: ['expo', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'boundaries'],
  settings: {
    'boundaries/elements': [
      { type: 'core', pattern: 'src/{types,constants,config}/*' },
      { type: 'design-system', pattern: 'src/design-system/*' },
      { type: 'components', pattern: 'src/components/*' },
      { type: 'services', pattern: 'src/services/*' },
      { type: 'stores', pattern: 'src/stores/*' },
      { type: 'lib', pattern: 'src/lib/*' },
      { type: 'hooks', pattern: 'src/hooks/*' },
      { type: 'feature', pattern: 'src/features/*', capture: ['feature'] },
      { type: 'app', pattern: 'app/*' },
    ],
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@/features/*/screens/*', '@/features/*/components/*', '@/features/*/hooks/*', '@/features/*/store/*'],
            message:
              'Do not import feature internals directly. Import only from the feature public API (features/<name>/index.ts).',
          },
        ],
      },
    ],
    'boundaries/element-types': [
      'error',
      {
        default: 'disallow',
        rules: [
          { from: 'core', allow: ['core'] },
          { from: 'design-system', allow: ['design-system', 'core'] },
          { from: 'components', allow: ['design-system', 'components', 'core'] },
          { from: 'services', allow: ['services', 'core', 'lib'] },
          { from: 'stores', allow: ['stores', 'services', 'core', 'lib'] },
          { from: 'lib', allow: ['lib', 'core'] },
          { from: 'hooks', allow: ['hooks', 'services', 'stores', 'lib', 'core'] },
          { from: 'feature', allow: ['design-system', 'components', 'services', 'stores', 'hooks', 'lib', 'core', 'feature'] },
          { from: 'app', allow: ['feature', 'design-system', 'components', 'core'] },
        ],
      },
    ],
  },
};
