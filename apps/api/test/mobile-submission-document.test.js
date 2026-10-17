import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { createStore } from "../src/store.js";
import { seed } from "../src/seed.js";
import { createApp } from "../src/app.js";
test("mobile homework files enforce student ownership, teacher class scope, scan and staged state", async () => {
  const store = await createStore("demo");
  await seed(store);
  const fileId = "a885da2d-237f-4c41-a44c-c194510365cb";
  const path = new URL(`../data/uploads/${fileId}`, import.meta.url);
  const root = new URL("../data/uploads/", import.meta.url);
  const student = (await store.all("users")).find((u) => u.role === "student");
  await store.put("users", {
    ...student,
    id: "mobile-other",
    email: "mobile-other@orbit.local",
    classIds: ["school-north-9"],
  });
  await store.put("submissions", {
    id: "mobile-submission",
    schoolId: "school-north",
    classId: student.classIds[0],
    studentId: student.id,
    attachmentId: fileId,
  });
  const file = {
    id: fileId,
    schoolId: "school-north",
    classId: student.classIds[0],
    studentId: student.id,
    submissionId: "mobile-submission",
    name: "answer.pdf",
    mime: "application/pdf",
    scanStatus: "clean",
    staged: false,
  };
  await store.put("files", file);
  await mkdir(root, { recursive: true });
  await writeFile(path, "%PDF-test", { flag: "wx" });
  const server = createApp(store).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const login = async (email) =>
    (
      await (
        await fetch(`${origin}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: "OrbitDemo123!" }),
        })
      ).json()
    ).token;
  const get = (token, school = "school-north") =>
    fetch(
      `${origin}/api/schools/${school}/homework/submissions/mobile-submission/attachment-document`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  try {
    const pupil = await login(student.email),
      teacher = await login("teacher@orbit.local"),
      other = await login("mobile-other@orbit.local");
    const response = await get(pupil);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.equal(
      Buffer.from((await response.json()).base64, "base64").toString(),
      "%PDF-test",
    );
    assert.equal((await get(teacher)).status, 200);
    assert.equal((await get(other)).status, 404);
    assert.equal((await get(pupil, "school-west")).status, 403);
    await store.put("files", { ...file, staged: true });
    assert.equal((await get(teacher)).status, 404);
    await store.put("files", { ...file, scanStatus: "infected" });
    assert.equal((await get(pupil)).status, 404);
    await store.put("files", { ...file, deleted: true });
    assert.equal((await get(pupil)).status, 404);
  } finally {
    await new Promise((r) => server.close(r));
    await store.close();
    await unlink(path);
  }
});
