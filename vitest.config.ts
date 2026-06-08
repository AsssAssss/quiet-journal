import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/**/__tests__/**',
        'src/**/*.test.{ts,tsx}',
        // 富文本编辑器集成层与 Page 编排，依赖浏览器渲染，由 Playwright 覆盖
        'src/presentation/components/Editor/**',
        'src/presentation/pages/EditorPage.tsx',
        'src/presentation/pages/UnlockPage.tsx',
        'src/presentation/pages/SettingsPage.tsx',
        'src/presentation/pages/TimelinePage.tsx',
        // 仅类型/接口的文件
        'src/domain/repositories/**',
        'src/domain/services/**',
      ],
      thresholds: {
        branches: 83,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    },
  },
});
