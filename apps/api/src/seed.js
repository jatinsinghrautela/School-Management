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
    name: "Horizon Education Group",
  });
  for (const [sid, name, city] of [
    ["school-north", "Horizon International", "Bengaluru"],
    ["school-west", "Horizon Academy", "Pune"],
  ]) {
    await store.put("schools", {
      id: sid,
      orgId: "org-demo",
      name,
      city,
      code: sid === "school-north" ? "HIR" : "HAC",
    });
    for (const label of ["Grade 10 · A", "Grade 9 · A"])
      await store.put("classes", {
        id: `${sid}-${label.includes("10") ? "10" : "9"}`,
        schoolId: sid,
        name: label,
      });
  }
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
    description: "Complete exercises 4.1 and 4.2 before our next class.",
    url: "",
    dueDate: "2026-10-12",
    createdAt: new Date().toISOString(),
  });
}
