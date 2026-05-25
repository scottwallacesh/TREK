import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import gitignore from 'eslint-config-flat-gitignore'

export default defineConfig([
  gitignore({ strict: false }),
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  // Route files always export both `Route` (non-component) and the page component — expected pattern.
  {
    files: ['src/routes/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  // shadcn UI primitives export variant helpers alongside components — generated files, don't modify.
  // ThemeProvider exports both the provider component and the useTheme hook — standard pattern.
  {
    files: ['src/components/ui/**/*.{ts,tsx}', 'src/components/theme/ThemeProvider.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
