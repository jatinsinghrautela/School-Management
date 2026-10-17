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
    console.log(`Reviewing ${name}`);
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
  await page
    .getByRole("button", { name: "Compare design styles", exact: true })
    .click();
  for (const design of ["glass", "clay", "maximalism"]) {
    const button = page.getByRole("button", {
      name: `Preview ${design}`,
      exact: true,
    });
    if (await button.count()) await button.click();
    await inspect(`design ${design} dark`);
    await page
      .getByRole("button", { name: "Switch to light mode", exact: true })
      .click();
    await inspect(`design ${design} light`);
    await page
      .getByRole("img", { name: "Schoolglass Desk logo", exact: true })
      .evaluate((el) => el.parentElement.scrollIntoView({ block: "start" }));
    await page.screenshot({
      path: `apps/api/data/mobile-design-${design}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Switch to dark mode", exact: true })
      .click();
  }
  await page
    .getByRole("button", { name: "Preview glass", exact: true })
    .click();
  await page.getByRole("button", { name: "Back to app", exact: true }).click();
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
  await page
    .getByRole("button", { name: "School workspace", exact: true })
    .click();
  for (const tab of [
    "Calendar",
    "People",
    "Attendance",
    "Corrections",
    "Marks",
    "Reports",
    "Resources",
    "Homework reviews",
    "Notices",
    "Leave",
    "Gallery",
    "Admissions",
  ]) {
    await page.getByRole("button", { name: tab, exact: true }).click();
    await inspect(`principal ${tab}`);
  }
  await page
    .getByRole("button", { name: "Back to overview", exact: true })
    .click();
  await page
    .getByRole("button", { name: "School services", exact: true })
    .click();
  for (const tab of [
    "Support",
    "Privacy",
    "Fees",
    "Student records",
    "Documents",
    "Messages",
  ]) {
    await page.getByRole("button", { name: tab, exact: true }).click();
    await inspect(`principal service ${tab}`);
  }
  await page
    .getByRole("button", { name: "Back to overview", exact: true })
    .click();
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

  await login("teacher");
  await page
    .getByRole("button", { name: "School workspace", exact: true })
    .click();
  await page.getByRole("button", { name: "Notices", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Mobile teacher notice");
  await page
    .getByLabel("Message", { exact: true })
    .fill("A class-scoped notice published from the mobile workflow.");
  const teacherUser = (await store.all("users")).find(
    (u) => u.role === "teacher",
  );
  const assignedClass = (await store.all("classes")).find((c) =>
    teacherUser.classIds.includes(c.id),
  );
  await page
    .getByRole("button", { name: assignedClass.name, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Review details", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm and save", exact: true })
    .click();
  await page
    .getByText("title: Mobile teacher notice", { exact: true })
    .waitFor();
  const newNotice = (await store.all("notices")).find(
    (n) => n.title === "Mobile teacher notice",
  );
  if (
    newNotice?.audience !== "student" ||
    !newNotice.classIds.includes(assignedClass.id)
  )
    throw Error("Teacher notice class targeting failed");
  await page.getByRole("button", { name: "Attendance", exact: true }).click();
  await page
    .getByRole("button", { name: assignedClass.name, exact: true })
    .click();
  const pupil = (await store.all("users")).find(
    (u) => u.role === "student" && u.classIds.includes(assignedClass.id),
  );
  await page.getByRole("button", { name: pupil.name, exact: true }).click();
  await page.getByLabel("Date YYYY-MM-DD", { exact: true }).fill("2026-10-19");
  await page.getByRole("button", { name: "present", exact: true }).click();
  await page
    .getByRole("button", { name: "Review details", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm and save", exact: true })
    .click();
  await page.getByText("date: 2026-10-19", { exact: true }).waitFor();
  const attendance = (await store.all("attendance")).find(
    (r) => r.studentId === pupil.id && r.date === "2026-10-19",
  );
  if (attendance?.status !== "present")
    throw Error("Mobile attendance write failed");
  await page.getByRole("button", { name: "Marks", exact: true }).click();
  const exam = (await store.all("exams")).find(
    (r) => r.classId === assignedClass.id && r.status === "draft",
  );
  if (exam) {
    await page.getByRole("button", { name: exam.name, exact: true }).click();
    const subject = (await store.all("subjects")).find(
      (r) => r.id === exam.subjects[0].subjectId,
    );
    await page.getByRole("button", { name: subject.name, exact: true }).click();
    await page.getByRole("button", { name: pupil.name, exact: true }).click();
    await page
      .getByLabel(`Score (maximum ${exam.subjects[0].maxScore})`, {
        exact: true,
      })
      .fill("84");
    await page
      .getByRole("button", { name: "Review details", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirm and save", exact: true })
      .click();
    await page.getByText("score: 84", { exact: true }).waitFor();
  }
  await page
    .getByRole("button", { name: "Back to overview", exact: true })
    .click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();

  const dailyLabels = [
    "Notices",
    "Homework & resources",
    "Timetable",
    "Calendar",
    "Attendance",
    "Published results",
    "Fees & receipts",
    "School gallery",
  ];
  await login("student");
  for (const label of dailyLabels) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await page
      .getByRole("button", { name: "Back to overview", exact: true })
      .waitFor();
    await inspect("student " + label);
    await page
      .getByRole("button", { name: "Back to overview", exact: true })
      .click();
  }
  await page
    .getByRole("button", { name: "Homework & resources", exact: true })
    .click();
  await page
    .getByLabel("Your answer (up to 10000 characters)", { exact: true })
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
    throw Error("Student mobile homework submission failed");
  await page
    .getByRole("button", { name: "Back to overview", exact: true })
    .click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await login("parent");
  await page
    .getByRole("button", { name: "Demo child two", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Demo child two", exact: true })
    .click();
  await page.getByText("Viewing Demo child two", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Homework & resources", exact: true })
    .click();
  await page.getByText("Grade nine reading list", { exact: true }).waitFor();
  if (
    await page.getByText("Explore quadratic equations", { exact: true }).count()
  )
    throw Error("Other child homework leaked");
  await inspect("guardian second-child learning");
  await page.screenshot({
    path: "apps/api/data/mobile-family-learning.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Back to overview", exact: true })
    .click();
  await page.getByRole("button", { name: "Rohan Kapoor", exact: true }).click();
  await page.getByText("Viewing Rohan Kapoor", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Fees & receipts", exact: true })
    .click();
  await page.getByText("MOBILE-RECEIPT", { exact: true }).waitFor();
  await inspect("guardian fees");
  await page
    .getByRole("button", { name: "Back to overview", exact: true })
    .click();
  await page.getByRole("button", { name: "Notices", exact: true }).click();
  await page
    .getByRole("button", { name: "Mark as read", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Read", exact: true })
    .first()
    .waitFor();
  await inspect("guardian notice read");
  await page
    .getByRole("button", { name: "Back to overview", exact: true })
    .click();
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
    "Mobile web preview passed: three design styles, principal services, teacher notice/attendance/marks, student homework, guardian child scope, required-password gate, light/dark accessibility and 390px overflow. Native device behavior remains unverified.",
  );
} finally {
  if (browser) await browser.close();
  await new Promise((r) => web.close(r));
  await new Promise((r) => api.close(r));
  await store.close();
}
