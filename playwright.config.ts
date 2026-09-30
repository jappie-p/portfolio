import { defineConfig, devices } from "@playwright/test";

// Runs against a production build on PORT (default 3000), or reuses a server
// already listening there. Desktop specs run in all three engines; phone specs
// on an iPhone-sized WebKit. The live-WebGL cyber spec needs installed Chrome.
const PORT = Number(process.env.PORT) || 3000;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  // every test runs the WebGL scenes; more than two browsers at once starves
  // the GPU and makes smooth-scroll timing flaky (seen in Firefox)
  workers: 2,
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }, testIgnore: /mobile\.spec/ },
    { name: "firefox", use: { ...devices["Desktop Firefox"], viewport: { width: 1440, height: 900 } }, testIgnore: /mobile\.spec|cyber-gpu/ },
    { name: "webkit", use: { ...devices["Desktop Safari"], viewport: { width: 1440, height: 900 } }, testIgnore: /mobile\.spec|cyber-gpu/ },
    { name: "mobile", use: { ...devices["iPhone 13"] }, testMatch: /mobile\.spec/ },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    port: PORT,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
  },
});
