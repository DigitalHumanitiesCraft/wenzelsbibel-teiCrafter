import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.config.js";

// Fork-only Playwright configuration. The inherited suites in test/e2e/ drive the
// base editor shell and stay valid in the base only, so the fork runs an
// allow-list of its own demo suites instead of an ignore list. Keeping this in a
// separate file leaves playwright.config.js identical to the base for merges.
export default defineConfig({
  ...baseConfig,
  testMatch: /wb-demo-.*\.spec\.js/,
});
