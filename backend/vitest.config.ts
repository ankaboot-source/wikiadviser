import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['dotenv/config'],
    env: {
      DOTENV_CONFIG_PATH: '.env.example'
    },
    coverage: {
      reporter: ['cobertura', 'text']
    }
  }
});
