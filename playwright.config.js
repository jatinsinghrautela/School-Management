import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4100",
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node apps/api/src/server.js",
    url: "http://127.0.0.1:4100/api/ready",
    reuseExistingServer: false,
    env: {
      NODE_ENV: "test",
      DATA_MODE: "demo",
      PORT: "4100",
      HOST: "127.0.0.1",
      SMTP_HOST: "",
      SMTP_USER: "",
      SMTP_PASSWORD: "",
      SMTP_FROM: "",
      PUBLIC_APP_URL: "",
      CLAMAV_COMMAND: "",
      TRUST_PROXY: "",
    },
  },
});
