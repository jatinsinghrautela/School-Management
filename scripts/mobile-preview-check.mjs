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
const demoStudent = (await store.all("users")).find(
  (u) => u.role === "student",
);
await store.put("users", {
  ...demoStudent,
  id: "bulk-classmate",
  name: "Demo classmate",
  email: "classmate@orbit.local",
});
await store.put("users", {
  ...demoStudent,
  id: "kid-two",
  name: "Demo child two",
  email: "second@orbit.local",
  classIds: ["school-north-9"],
});
await store.put("users", {
  ...demoStudent,
  id: "demo-parent",
  role: "parent",
  name: "Demo guardian",
  email: "parent@orbit.local",
  classIds: [],
});
await store.put("parentLinks", {
  id: "demo-parent-link",
  schoolId: "school-north",
  userId: "demo-parent",
  guardianId: "demo-guardian",
  active: true,
});
for (const studentId of [demoStudent.id, "kid-two"])
  await store.put("studentGuardians", {
    id: "guardian-" + studentId,
    schoolId: "school-north",
    studentId,
    guardianId: "demo-guardian",
    active: true,
  });
await store.put("notices", {
  id: "grade-nine-notice",
  schoolId: "school-north",
  classId: "school-north-9",
  title: "Grade nine announcement",
  body: "For the second child only",
  audience: "all",
  createdAt: new Date().toISOString(),
});
await store.put("resources", {
  id: "grade-nine-resource",
  schoolId: "school-north",
  classId: "school-north-9",
  type: "syllabus",
  title: "Grade nine reading list",
  description: "Only for grade nine students.",
});
await store.put("feeCharges", {
  id: "mobile-charge",
  schoolId: "school-north",
  studentId: demoStudent.id,
  name: "Pilot tuition",
  amountMinor: 100000,
  currency: "INR",
  dueDate: "2026-10-31",
});
await store.put("feePayments", {
  id: "mobile-payment",
  schoolId: "school-north",
  chargeId: "mobile-charge",
  studentId: demoStudent.id,
  amountMinor: 20000,
  currency: "INR",
  name: "Pilot tuition",
  receiptNumber: "MOBILE-RECEIPT",
  paidOn: "2026-10-15",
  createdAt: new Date().toISOString(),
  method: "cash",
});
await store.put("attendance", {
  id: "attendance-mobile",
  schoolId: "school-north",
  studentId: demoStudent.id,
  classId: "school-north-10",
  date: "2026-10-15",
  status: "present",
});

const currentYear = new Date().getFullYear();
const holidayDate = `${currentYear}-10-21`;
await store.put("calendar", {
  id: "mobile-holiday",
  schoolId: "school-north",
  title: "School foundation holiday",
  description: "The campus is closed for the foundation celebration.",
  startDate: holidayDate,
  endDate: holidayDate,
  kind: "holiday",
  audience: "all",
});
const examFixture = (await store.all("exams")).find(
  (e) => e.id === "exam-demo",
);
await store.put("exams", { ...examFixture, status: "published", version: 1 });
await store.put("reports", {
  id: "mobile-report",
  schoolId: "school-north",
  classId: demoStudent.classIds[0],
  studentId: demoStudent.id,
  examId: "exam-demo",
  version: 1,
  studentName: demoStudent.name,
  schoolName: "Schoolglass Desk Demo North",
  schoolCity: "Bengaluru",
  className: "Grade 10",
  academicYear: "2026–2027",
  examName: examFixture.name,
  rows: [
    { name: "Mathematics", score: 86, maxScore: 100, weight: 1, passed: true },
    { name: "Science", score: 91, maxScore: 100, weight: 1, passed: true },
  ],
  totalScore: 177,
  totalMax: 200,
  percentage: 88.5,
  grade: "A",
  passed: true,
  publishedAt: new Date().toISOString(),
  publishedBy: "Priya Sharma",
  reportStyle: { principal: "Priya Sharma", classTeacher: "Demo teacher" },
});
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
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(
    "https://schoolglass.jatinsinghrautela.com/api/**",
    async (route) => {
      const req = route.request();
      const requestUrl = new URL(req.url());
      const target = `http://127.0.0.1:${api.address().port}${requestUrl.pathname}${requestUrl.search}`;
      if (req.method() === "POST" && requestUrl.pathname.endsWith("/notices"))
        await new Promise((resolve) => setTimeout(resolve, 2800));
      if (
        req.method() === "POST" &&
        requestUrl.pathname.endsWith("/auth/login")
      )
        await new Promise((resolve) => setTimeout(resolve, 400));
      const response = await fetch(target, {
        method: req.method(),
        headers: {
          "Content-Type": req.headers()["content-type"] || "application/json",
          ...(req.headers().authorization
            ? { Authorization: req.headers().authorization }
            : {}),
        },
        ...(["GET", "HEAD"].includes(req.method())
          ? {}
          : { body: req.postDataBuffer() }),
      });
      await route.fulfill({
        status: response.status,
        contentType: "application/json",
        body: await response.text(),
      });
    },
  );
  await page.goto(`http://127.0.0.1:${web.address().port}`);
  const inspect = async (name) => {
    console.log(`Reviewing ${name}`);
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    ) {
      await page.screenshot({
        path: "apps/api/data/mobile-review-failure.png",
      });
      throw Error(`${name}: horizontal overflow`);
    }
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    if (result.violations.length) {
      await page.screenshot({
        path: "apps/api/data/mobile-review-failure.png",
      });
      throw Error(
        `${name}: ${JSON.stringify(result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })))}`,
      );
    }
  };
  const header = (title) =>
    page.getByRole("heading", { name: title, exact: true });
  const login = async (role) => {
    await page
      .getByLabel("Email address", { exact: true })
      .fill(`${role}@orbit.local`);
    await page.getByLabel("Password", { exact: true }).fill("OrbitDemo123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page
      .getByRole("progressbar", { name: "Logging in", exact: true })
      .waitFor();
    if (
      await page
        .getByRole("progressbar", { name: "Loading", exact: true })
        .count()
    )
      throw Error("Login still uses generic loading text");
    if (role === "director") await header("Choose your school").waitFor();
    else
      await page
        .getByRole("button", { name: "Open profile tab", exact: true })
        .waitFor();
  };
  const home = () =>
    page.getByRole("button", { name: "Open home tab", exact: true }).click();
  const action = async (label) => {
    await page
      .getByRole("button", { name: "Open services tab", exact: true })
      .click();
    await header("Services").waitFor();
    await page
      .getByRole("textbox", { name: "Search services", exact: true })
      .fill(label);
    await page.getByRole("button", { name: label, exact: true }).click();
    if (
      page.url().includes("/service/section-") &&
      (await page.getByRole("button", { name: label, exact: true }).count())
    )
      await page.getByRole("button", { name: label, exact: true }).click();
    if (label === "Yearly fee planning") {
      await page
        .getByText("Available on the website", { exact: true })
        .first()
        .waitFor();
      return;
    }
    await header(label).waitFor();
  };
  await header("Schoolglass Desk").waitFor();
  await inspect("branded login top bar");
  await page
    .getByRole("button", { name: "Switch to light mode", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Switch to dark mode", exact: true })
    .click();
  await page.getByTestId("login-logo-glow").waitFor();
  const scrollOverflow = await page.evaluate(() =>
    [...document.querySelectorAll("div")].some(
      (el) =>
        ["auto", "scroll"].includes(getComputedStyle(el).overflowY) &&
        el.clientHeight > 0 &&
        el.scrollHeight > el.clientHeight + 2,
    ),
  );
  if (scrollOverflow) throw Error("Normal-height login still needs scrolling");
  await page.screenshot({ path: "apps/api/data/mobile-login-compact.png" });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const loginGradient = page.getByTestId("login-logo-glow-gradient");
  const logoBounds = await page.getByTestId("login-logo-glow").boundingBox();
  if (!logoBounds || logoBounds.y < 80)
    throw Error("Animated login logo is not in the central content");
  const gradientBefore = await loginGradient.evaluate(
    (el) => getComputedStyle(el).transform,
  );
  await page.waitForTimeout(180);
  const gradientAfter = await loginGradient.evaluate(
    (el) => getComputedStyle(el).transform,
  );
  if (gradientBefore === gradientAfter)
    throw Error("Central logo gradient is not running");
  await page.screenshot({ path: "apps/api/data/mobile-login-gradient.png" });

  const ambient = page
    .getByTestId("ambient-flow")
    .filter({ visible: true })
    .last();
  const aurora = page
    .getByTestId("ambient-aurora")
    .filter({ visible: true })
    .last();
  const glowBefore = await aurora.evaluate(
    (el) => getComputedStyle(el).transform,
  );
  const still = await ambient.evaluate((el) => getComputedStyle(el).transform);
  await page.waitForTimeout(180);
  const moving = await ambient.evaluate((el) => getComputedStyle(el).transform);
  if (still === moving)
    throw Error("Ambient motion is not running on a focused screen");
  const glowAfter = await aurora.evaluate(
    (el) => getComputedStyle(el).transform,
  );
  if (glowBefore === glowAfter) throw Error("Aurora glow is not moving");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 568 });
  await inspect("compact login at 320px");
  await page
    .getByRole("button", { name: "Request password reset", exact: true })
    .scrollIntoViewIfNeeded();
  await page.setViewportSize({ width: 390, height: 844 });

  await login("principal");
  await header("Schoolglass Desk Demo North").waitFor();
  await inspect("dark glass dashboard");
  await page
    .getByRole("button", { name: "Open school day tab", exact: true })
    .click();
  await header("School day").waitFor();
  await page.mouse.move(280, 112);
  await page.mouse.down();
  await page.mouse.move(65, 112, { steps: 12 });
  await page.mouse.up();
  await header("Services").waitFor();
  await page.mouse.move(65, 112);
  await page.mouse.down();
  await page.mouse.move(280, 112, { steps: 12 });
  await page.mouse.up();
  await header("School day").waitFor();
  const lens = await page.getByTestId("liquid-tab-indicator").boundingBox();
  const profileTarget = await page
    .getByRole("button", { name: "Open profile tab", exact: true })
    .boundingBox();
  await page.mouse.move(lens.x + lens.width / 2, lens.y + lens.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    profileTarget.x + profileTarget.width / 2,
    profileTarget.y + profileTarget.height / 2,
    { steps: 16 },
  );
  await page.mouse.up();
  await header("Profile").waitFor();
  await page
    .getByRole("button", { name: "Open home tab", exact: true })
    .click();
  await header("Schoolglass Desk Demo North").waitFor();

  await page.screenshot({ path: "apps/api/data/mobile-overview-dark.png" });
  await page
    .getByRole("button", { name: "Open profile tab", exact: true })
    .click();
  await header("Profile").waitFor();
  await page.getByText("Priya Sharma", { exact: true }).last().waitFor();
  await inspect("logged-in profile");
  await page
    .getByRole("button", { name: "Switch to light mode", exact: true })
    .click();
  await inspect("light profile");
  const extraLogin = await fetch(
    `http://127.0.0.1:${api.address().port}/api/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Isolated extra browser",
      },
      body: JSON.stringify({
        email: "principal@orbit.local",
        password: "OrbitDemo123!",
      }),
    },
  ).then((r) => r.json());
  if (!extraLogin.token) throw Error("Could not create isolated extra session");
  await page
    .getByRole("button", { name: "Active sessions", exact: true })
    .click();
  await header("Active sessions").waitFor();
  await page.getByText("Current sign-in", { exact: true }).waitFor();
  await inspect("active sessions account security");
  await page
    .getByRole("button", { name: "Sign out other sessions", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Cancel session sign-out", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Sign out other sessions", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Confirm sign out other sessions",
      exact: true,
    })
    .click();
  await page
    .getByText("1 other session signed out.", { exact: true })
    .waitFor();
  const revoked = await fetch(`http://127.0.0.1:${api.address().port}/api/me`, {
    headers: { Authorization: `Bearer ${extraLogin.token}` },
  });
  if (revoked.status !== 401)
    throw Error("Other demo session still authorized");
  await inspect("session revocation confirmation");

  await home();
  await inspect("light glass dashboard");
  await page.screenshot({ path: "apps/api/data/mobile-overview-light.png" });
  await page
    .getByRole("button", { name: "Open services tab", exact: true })
    .click();
  for (const title of [
    "Overview",
    "People",
    "Fees",
    "Staff",
    "Academics",
    "Attendance",
    "Timetable",
    "Calendar",
    "Results",
    "Learning",
    "Notices",
    "Library",
    "Transport",
    "Operations",
    "Inbox",
    "Gallery",
    "Family",
    "Settings",
    "Security",
  ]) {
    await page.getByRole("button", { name: title, exact: true }).waitFor();
  }
  await inspect("website sidebar service directory");
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await header("Library").waitFor();
  await page.getByText("Library catalogue", { exact: true }).waitFor();
  if (await page.getByText("School transport", { exact: true }).count())
    throw Error("Library screen includes unrelated transport content");
  await inspect("dedicated library screen");
  if (
    (await page
      .getByRole("button", { name: "Open services tab", exact: true })
      .getAttribute("aria-current")) !== "page"
  )
    throw Error("A page opened from Services did not keep Services active.");

  await action("Yearly fee planning");
  await page
    .getByText("Available on the website", { exact: true })
    .first()
    .waitFor();
  await inspect("website-only popup");
  await page
    .getByRole("button", { name: "Stay in the app", exact: true })
    .click();
  await header("Yearly fee planning").waitFor();
  await inspect("website-only dedicated screen");
  await page.setViewportSize({ width: 320, height: 568 });
  await page
    .getByRole("button", { name: "Use this feature", exact: true })
    .click();
  await inspect("320px website popup");
  await page.keyboard.press("Escape");
  await home();
  await inspect("320px top bar and floating dock");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const label of [
    "Class directory",
    "Record attendance",
    "Attendance corrections",
    "Exam marks",
    "Student reports",
    "Publish learning material",
    "Homework reviews",
    "Publish notices",
    "Staff leave",
    "Support tickets",
    "Privacy & data",
    "Fee management",
    "Student records",
    "School documents",
    "Messages",
  ]) {
    await action(label);
    await inspect("principal " + label);
  }
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await login("director");
  if (await page.getByText("A clearer school day.", { exact: true }).count())
    throw Error("Director dashboard loaded before school selection");
  await inspect("director mandatory school chooser");
  await page
    .getByRole("button", {
      name: "Open Schoolglass Desk Demo West",
      exact: true,
    })
    .click();
  await header("Schoolglass Desk Demo West").waitFor();
  await inspect("director west dashboard");
  await page
    .getByRole("button", { name: "Open profile tab", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Switch school", exact: true })
    .click();
  await header("Choose your school").waitFor();
  await page
    .getByRole("button", {
      name: "Open Schoolglass Desk Demo North",
      exact: true,
    })
    .click();
  await header("Schoolglass Desk Demo North").waitFor();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await login("teacher");
  await action("Exam marks");
  await page
    .getByRole("button", { name: examFixture.name, exact: true })
    .click();
  await page.getByRole("button", { name: "Mathematics", exact: true }).click();
  await page.getByText("Class marks register", { exact: true }).waitFor();
  await page
    .getByRole("textbox", { name: "Search students in marks register" })
    .fill(demoStudent.name);
  await inspect("filtered teacher marks register");
  await page.screenshot({ path: "apps/api/data/mobile-marks-register.png" });

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await action("Publish notices");
  await page
    .getByRole("button", { name: "Open school day tab", exact: true })
    .click();
  await header("School day").waitFor();
  await page
    .getByRole("button", { name: "Student reports", exact: true })
    .click();
  await header("Student reports").waitFor();
  await page
    .getByRole("button", { name: examFixture.name, exact: true })
    .click();
  await page
    .getByRole("button", { name: demoStudent.name, exact: true })
    .click();
  await page.getByText("86 / 100", { exact: true }).waitFor();
  await inspect("teacher in-app report table");
  await page.screenshot({ path: "apps/api/data/mobile-report-card.png" });
  await action("Publish notices");
  await page
    .getByLabel("Title", { exact: true })
    .filter({ visible: true })
    .fill("Mobile teacher notice");
  await page
    .getByLabel("Message", { exact: true })
    .filter({ visible: true })
    .fill("A class-scoped notice published from the mobile workflow.");
  const teacher = (await store.all("users")).find((u) => u.role === "teacher");
  const cls = (await store.all("classes")).find((c) =>
    teacher.classIds.includes(c.id),
  );
  await page.getByRole("button", { name: cls.name, exact: true }).click();
  await page
    .getByRole("button", { name: "Review details", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm and save", exact: true })
    .click();
  await page
    .getByRole("progressbar", { name: "Saving your changes…", exact: true })
    .waitFor();
  const ring = page
    .getByRole("progressbar", { name: "Saving your changes…", exact: true })
    .locator('div[style*="rotate"]')
    .first();
  const before = await ring.evaluate((el) => getComputedStyle(el).transform);
  await page.waitForTimeout(150);
  const after = await ring.evaluate((el) => getComputedStyle(el).transform);
  if (before === after)
    throw Error("Submission orbit did not animate with motion enabled");
  const shard = page
    .getByRole("progressbar", { name: "Saving your changes…", exact: true })
    .getByTestId("schoolglass-logo-motion-shard-0");
  const shardBefore = await shard.evaluate(
    (el) => getComputedStyle(el).transform,
  );
  await page.waitForTimeout(850);
  const shardAfter = await shard.evaluate(
    (el) => getComputedStyle(el).transform,
  );
  if (shardBefore === shardAfter)
    throw Error("Logo loader fragments did not separate/reassemble");

  await page.screenshot({ path: "apps/api/data/mobile-saving-motion.png" });
  await inspect("animated submission loader");
  await page
    .getByText("Title: Mobile teacher notice", { exact: true })
    .waitFor();
  // The title also exists in the pre-submit review. Wait for the actual write
  // and its workspace refresh before starting another school form.
  await page
    .getByRole("progressbar", { name: "Saving your changes…", exact: true })
    .waitFor({ state: "hidden" });
  await page.waitForFunction(() => {
    const refresh = document.querySelector(
      '[aria-label="Refresh school records"]',
    );
    return refresh && refresh.getAttribute("aria-disabled") !== "true";
  });
  await action("Record attendance");
  await page.getByRole("button", { name: cls.name, exact: true }).click();
  const chosenDate = page.getByLabel("Attendance date", { exact: true });
  const today = new Date();
  const expectedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if ((await chosenDate.inputValue()) !== expectedToday)
    throw Error("Attendance date does not default to today");
  await chosenDate.fill("2026-10-19");
  if (
    await page
      .getByRole("button", { name: "Review class attendance", exact: true })
      .isEnabled()
  )
    throw Error("Unmarked roster allowed review");
  await page
    .getByRole("button", { name: "Mark remaining present", exact: true })
    .click();
  await page
    .getByRole("radio", { name: "Absent for Demo classmate", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Review class attendance", exact: true })
    .click();
  await inspect("class-wide attendance review");
  await page.setViewportSize({ width: 320, height: 568 });
  await inspect("320px class attendance review");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "apps/api/data/mobile-attendance-review.png" });
  await page
    .getByRole("button", { name: "Edit class attendance", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Review class attendance", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm class attendance", exact: true })
    .click();
  await page
    .getByText("Class attendance saved for 2026-10-19: 2 students.", {
      exact: true,
    })
    .waitFor();
  const savedRows = (await store.all("attendance")).filter(
    (r) => r.classId === cls.id && r.date === "2026-10-19",
  );
  if (
    savedRows.length !== 2 ||
    !savedRows.some(
      (r) => r.studentId === "bulk-classmate" && r.status === "absent",
    )
  )
    throw Error("Class attendance was not saved together");
  await page
    .getByRole("button", { name: "Refresh school records", exact: true })
    .click();
  await page.getByRole("button", { name: cls.name, exact: true }).click();
  await page.getByLabel("Attendance date", { exact: true }).fill("2026-10-19");
  await page
    .getByText(
      "All students are already recorded. Use Attendance corrections for changes.",
      { exact: true },
    )
    .waitFor();
  if (
    await page
      .getByRole("button", { name: "Review class attendance", exact: true })
      .isEnabled()
  )
    throw Error("Saved class attendance allowed direct overwrite");

  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await login("student");
  for (const label of [
    "Notices",
    "Homework & resources",
    "Timetable",
    "Calendar",
    "Attendance",
    "Published results",
    "Fees & receipts",
    "School gallery",
  ]) {
    await action(label);
    await inspect("student " + label);
  }
  await action("Calendar");
  // Move from the current month to the seeded October using real month controls.
  const currentMonth = new Date().getMonth();
  for (let i = currentMonth; i < 9; i++)
    await page.getByRole("button", { name: "Next month", exact: true }).click();
  for (let i = currentMonth; i > 9; i--)
    await page
      .getByRole("button", { name: "Previous month", exact: true })
      .click();
  await page
    .getByRole("button", { name: new RegExp(`^${holidayDate}, Holiday`) })
    .click();
  await page
    .getByText("The campus is closed for the foundation celebration.", {
      exact: true,
    })
    .filter({ visible: true })
    .first()
    .waitFor();
  await inspect("month calendar and holiday details");
  await page.screenshot({ path: "apps/api/data/mobile-month-calendar.png" });
  await action("Published results");

  await page
    .getByText("91 / 100", { exact: true })
    .filter({ visible: true })
    .first()
    .waitFor();
  await inspect("student in-app result table");
  await action("Homework & resources");
  await page
    .getByLabel("Your answer (up to 10000 characters)", { exact: true })
    .filter({ visible: true })
    .first()
    .fill("My mobile homework answer.");
  await page
    .getByRole("button", { name: "Review details", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Confirm and save", exact: true })
    .click();
  await page
    .getByText(
      "Saved successfully. Refresh records to see the latest details.",
      { exact: true },
    )
    .waitFor();
  if (
    !(await store.all("submissions")).some(
      (r) =>
        r.studentId === demoStudent.id &&
        r.answer === "My mobile homework answer.",
    )
  )
    throw Error("Student homework failed");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await login("parent");
  await action("Homework & resources");
  await page
    .getByRole("button", { name: "Demo child two", exact: true })
    .click();
  await page.getByText("Grade nine reading list", { exact: true }).waitFor();
  if (
    await page.getByText("Explore quadratic equations", { exact: true }).count()
  )
    throw Error("Other child homework leaked");
  await inspect("guardian child-scoped service");
  await page.screenshot({ path: "apps/api/data/mobile-family-learning.png" });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  const student = (await store.all("users")).find((u) => u.role === "student");
  await store.put("users", { ...student, passwordChangeRequired: true });
  await page.getByLabel("Email address", { exact: true }).fill(student.email);
  await page.getByLabel("Password", { exact: true }).fill("OrbitDemo123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByText("Make your account yours.", { exact: true }).waitFor();
  await inspect("required password with top signout");
  if (errors.length) throw Error(JSON.stringify(errors));
  console.log(
    "Mobile browser review passed: branded top bars/signout, sidebar Services, dedicated pages, profile, explicit director school selection, light/dark glass, 320px layout, teacher writes, student homework and guardian isolation. Native materials remain device acceptance.",
  );
} finally {
  if (browser) await browser.close();
  await new Promise((r) => web.close(r));
  await new Promise((r) => api.close(r));
  await store.close();
}
