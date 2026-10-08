import bcrypt from "bcryptjs";
import { id } from "./domain.js";
export async function seed(store) {
  if ((await store.all("users")).length) return;
  const email =
    store.mode === "demo" ? "owner@orbit.local" : process.env.BOOTSTRAP_EMAIL;
  const password =
    store.mode === "demo" ? "OrbitDemo123!" : process.env.BOOTSTRAP_PASSWORD;
  if (!email || !password || password.length < 12)
    throw new Error(
      "Set BOOTSTRAP_EMAIL and BOOTSTRAP_PASSWORD (12+ characters)",
    );
  await store.put("users", {
    id: id(),
    name: "Platform owner",
    email,
    role: "owner",
    orgId: null,
    schoolIds: [],
    classIds: [],
    passwordHash: await bcrypt.hash(password, 12),
  });
  if (store.mode !== "demo") return;
  await store.put("organizations", {
    id: "org-demo",
    name: "Schoolglass Desk Demo Collective",
  });
  for (const [sid, name, city] of [
    ["school-north", "Schoolglass Desk Demo North", "Bengaluru"],
    ["school-west", "Schoolglass Desk Demo West", "Pune"],
  ]) {
    await store.put("schools", {
      id: sid,
      orgId: "org-demo",
      name,
      city,
      code: sid === "school-north" ? "HIR" : "HAC",
    });
    const year = new Date().getUTCFullYear();
    await store.put("academicYears", {
      id: `${sid}-year`,
      schoolId: sid,
      name: `${year}–${year + 1}`,
      startDate: `${year}-04-01`,
      endDate: `${year + 1}-03-31`,
      isCurrent: true,
    });
    for (const label of ["Grade 10 · A", "Grade 9 · A"])
      await store.put("classes", {
        id: `${sid}-${label.includes("10") ? "10" : "9"}`,
        schoolId: sid,
        name: label,
        academicYearId: `${sid}-year`,
        grade: label.includes("10") ? "Grade 10" : "Grade 9",
        section: "A",
      });
  }
  for (const [subjectId, name] of [
    ["math", "Mathematics"],
    ["science", "Science"],
  ])
    await store.put("subjects", {
      id: `subject-${subjectId}`,
      schoolId: "school-north",
      classId: "school-north-10",
      name,
      teacherIds: ["user-teacher"],
    });
  const year = new Date().getUTCFullYear();
  await store.put("exams", {
    id: "exam-demo",
    schoolId: "school-north",
    academicYearId: "school-north-year",
    classId: "school-north-10",
    name: "Midterm assessment",
    startDate: `${year}-10-15`,
    endDate: `${year}-10-22`,
    subjects: [
      { subjectId: "subject-math", maxScore: 100, weight: 1, passPercent: 40 },
      {
        subjectId: "subject-science",
        maxScore: 100,
        weight: 1,
        passPercent: 40,
      },
    ],
    gradingBands: [
      { label: "A", minPercent: 80 },
      { label: "B", minPercent: 60 },
      { label: "C", minPercent: 40 },
      { label: "F", minPercent: 0 },
    ],
    status: "draft",
    version: 0,
  });
  for (const [role, name] of [
    ["director", "Aarav Mehta"],
    ["principal", "Priya Sharma"],
    ["teacher", "Ananya Rao"],
    ["student", "Rohan Kapoor"],
  ])
    await store.put("users", {
      id: `user-${role}`,
      name,
      email: `${role}@orbit.local`,
      role,
      orgId: "org-demo",
      schoolIds:
        role === "director"
          ? ["school-north", "school-west"]
          : ["school-north"],
      classIds: ["school-north-10"],
      passwordHash: await bcrypt.hash("OrbitDemo123!", 12),
    });
  await store.put("notices", {
    id: id(),
    schoolId: "school-north",
    title: "A new chapter starts here",
    body: "Welcome to your connected campus. Find class updates, learning resources and announcements in one place.",
    audience: "all",
    classId: null,
    createdAt: new Date().toISOString(),
  });
  await store.put("resources", {
    id: id(),
    schoolId: "school-north",
    classId: "school-north-10",
    type: "homework",
    title: "Explore quadratic equations",
    description:
      "Create two quadratic equations with roots of your choice. Expand each equation, then explain how its coefficients relate to the roots.",
    url: "",
    dueDate: "2026-10-12",
    createdAt: new Date().toISOString(),
  });
}
