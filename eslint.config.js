import js from '@eslint/js';
import ts from 'typescript-eslint';
export default ts.config({ ignores: ['dist/**', '**/.next/**', '**/next-env.d.ts', 'test-results/**', 'playwright-report/**'] }, js.configs.recommended, ...ts.configs.recommended, { languageOptions: { globals: { window: 'readonly', document: 'readonly', console: 'readonly', process: 'readonly', queueMicrotask: 'readonly', MutationObserver: 'readonly', URL: 'readonly', Request: 'readonly', Response: 'readonly', Headers: 'readonly', fetch: 'readonly', setTimeout: 'readonly' } } });
