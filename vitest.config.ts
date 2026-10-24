import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

// Real Chromium (Playwright): the component relies on CSS animations and pointer events.
const browser = (name: string) => ({
  enabled: true,
  headless: true,
  provider: playwright(),
  instances: [{ browser: 'chromium' as const, name }],
});

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
          typecheck: { enabled: true, include: ['tests/types/**/*.test-d.ts'] },
        },
      },
      {
        test: { name: 'browser', include: ['tests/browser/**/*.test.ts'], browser: browser('browser') },
      },
      {
        plugins: [storybookTest({ configDir: '.storybook' })],
        test: { name: 'stories', browser: browser('stories') },
      },
    ],
  },
});
