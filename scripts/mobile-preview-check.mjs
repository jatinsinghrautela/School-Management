// Isolated web-rendering check for the native app; never sends requests to the live API.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createStore } from "../apps/api/src/store.js";
import { seed } from "../apps/api/src/seed.js";
import { createApp } from "../apps/api/src/app.js";
const root = resolve("apps/mobile/dist");
const store = await createStore("demo");
await seed(store);
const api = createApp(store, { mailer: null, scanner: async () => {} }).listen(
  0,
  "127.0.0.1",
);
await new Promise((r) => api.once("listening", r));
const web = createServer(async (req, res) => {
  try {
    const path = resolve(
      root,
      "." + decodeURIComponent(new URL(req.url, "http://local").pathname),
    );
    if (path !== root && !path.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    let file = path;
    let data;
    try {
      data = await readFile(file);
    } catch {
      file = resolve(root, "index.html");
      data = await readFile(file);
    }
    res.setHeader(
      "Content-Type",
      {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".png": "image/png",
        ".ttf": "font/ttf",
      }[extname(file)] || "application/octet-stream",
    );
    res.end(data);
  } catch {
    res.writeHead(500);
    res.end();
  }
}).listen(0, "127.0.0.1");
await new Promise((r) => web.once("listening", r));
let browser;
try {
  browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(
    "https://schoolglass.jatinsinghrautela.com/api/**",
    async (route) => {
      const req = route.request();
      const target = `http://127.0.0.1:${api.address().port}${new URL(req.url()).pathname}`;
      const response = await fetch(target, {
        method: req.method(),
        headers: {
          "Content-Type": "application/json",
          ...(req.headers().authorization
            ? { Authorization: req.headers().authorization }
            : {}),
        },
        ...(["GET", "HEAD"].includes(req.method())
          ? {}
          : { body: req.postData() }),
      });
      await route.fulfill({
        status: response.status,
        contentType: "application/json",
        body: await response.text(),
      });
    },
  );
  await page.goto(`http://127.0.0.1:${web.address().port}`);
  const login = async (role) => {
    await page
      .getByLabel("Email address", { exact: true })
      .fill(`${role}@orbit.local`);
    await page.getByLabel("Password", { exact: true }).fill("OrbitDemo123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page
      .getByRole("button", { name: "Account & appearance", exact: true })
      .waitFor();
  };
  const inspect = async (name) => {
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    )
      throw Error(`${name}: horizontal overflow`);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    if (result.violations.length)
      throw Error(
        `${name}: ${JSON.stringify(result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })))}`,
      );
  };
  await inspect("login");
  await login("principal");
  await page.getByText("A clearer school day.", { exact: true }).waitFor();
  await inspect("dark overview");
  await page.screenshot({
    path: "apps/api/data/mobile-overview-dark.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Account & appearance" }).click();
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await inspect("light settings");
  await page.getByRole("button", { name: "Back to overview" }).click();
  await inspect("light overview");
  await page.screenshot({
    path: "apps/api/data/mobile-overview-light.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await login("director");
  await page.getByText("Choose your school", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Schoolglass Desk Demo West", exact: true })
    .click();
  await page
    .getByText("Schoolglass Desk Demo West", { exact: true })
    .first()
    .waitFor();
  await inspect("school switch");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  const student = (await store.all("users")).find((u) => u.role === "student");
  await store.put("users", { ...student, passwordChangeRequired: true });
  await page.getByLabel("Email address", { exact: true }).fill(student.email);
  await page.getByLabel("Password", { exact: true }).fill("OrbitDemo123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByText("Make your account yours.", { exact: true }).waitFor();
  await inspect("required password");
  if (errors.length) throw Error(JSON.stringify(errors));
  console.log(
    "Mobile web preview passed: principal login/logout, director school switch, required-password gate, light/dark readability, accessibility and 390px overflow. Native device behavior remains unverified.",
  );
} finally {
  if (browser) await browser.close();
  await new Promise((r) => web.close(r));
  await new Promise((r) => api.close(r));
  await store.close();
}
