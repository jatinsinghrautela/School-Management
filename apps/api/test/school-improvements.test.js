import { test } from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { readFile, unlink, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { createStore } from "../src/store.js";
import { seed } from "../src/seed.js";
import { createApp } from "../src/app.js";
import { PDFDocument } from "pdf-lib";
import { reportPdf } from "../src/report-pdf.js";
function png(width = 256, height = 256) {
  const chunk = (name, data) => {
    const type = Buffer.from(name),
      n = Buffer.alloc(4);
    n.writeUInt32BE(data.length);
    let crc = 0xffffffff;
    for (const byte of Buffer.concat([type, data])) {
      crc ^= byte;
      for (let k = 0; k < 8; k++)
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    const c = Buffer.alloc(4);
    c.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([n, type, data, c]);
  };
  const h = Buffer.alloc(13);
  h.writeUInt32BE(width);
  h.writeUInt32BE(height, 4);
  h[8] = 8;
  h[9] = 6;
  const data = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const nx = x / width,
        ny = y / height;
      const ink =
        nx > 0.16 &&
        nx < 0.84 &&
        ny > 0.24 &&
        ny < 0.76 &&
        (Math.abs(nx - 0.5) < 0.014 ||
          Math.abs(nx - 0.16) < 0.018 ||
          Math.abs(nx - 0.84) < 0.018 ||
          Math.abs(ny - 0.24) < 0.018 ||
          Math.abs(ny - 0.76) < 0.018 ||
          (ny > 0.39 && ny < 0.42 && nx > 0.24 && nx < 0.43) ||
          (ny > 0.52 && ny < 0.55 && nx > 0.57 && nx < 0.76));
      if (ink) {
        const at = y * (width * 4 + 1) + 1 + x * 4;
        data.set([20, 110, 100, 255], at);
      }
    }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", h),
    chunk("tEXt", Buffer.from("Location\0Synthetic private metadata")),
    chunk("IDAT", deflateSync(data)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
async function fixture(scanner = async () => {}) {
  const store = await createStore("demo");
  await seed(store);
  const server = createApp(store, { mailer: null, scanner }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}/api`,
    p = "/schools/school-north";
  async function call(path, token, body) {
    const multi = body instanceof FormData;
    const r = await fetch(base + path, {
      method: body ? "POST" : "GET",
      headers: {
        ...(!multi ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: multi ? body : JSON.stringify(body) } : {}),
    });
    return { status: r.status, data: await r.json() };
  }
  const t = {};
  for (const role of ["principal", "teacher", "student", "director", "owner"])
    t[role] = (
      await call("/auth/login", null, {
        email: `${role}@orbit.local`,
        password: "OrbitDemo123!",
      })
    ).data.token;
  return {
    store,
    call,
    t,
    p,
    close: async () => {
      for (const f of await store.all("files"))
        await unlink(
          fileURLToPath(new URL(`../data/uploads/${f.id}`, import.meta.url)),
        ).catch(() => {});
      await new Promise((r) => server.close(r));
      await store.close();
    },
  };
}
test("multi-section notices enforce teacher assignments and preserve student/parent isolation and legacy targeting", async () => {
  const { store, call, t, p, close } = await fixture();
  try {
    const cls = (await store.all("classes")).find(
      (c) => c.id === "school-north-10",
    );
    await store.put("classes", {
      ...cls,
      id: "notice-section-b",
      name: "Grade 10 · B",
    });
    const teacher = (await store.all("users")).find(
      (u) => u.id === "user-teacher",
    );
    await store.put("users", {
      ...teacher,
      classIds: [...teacher.classIds, "notice-section-b"],
    });
    const b = {
      title: "Multi-section notice",
      body: "Assigned student message",
      audience: "student",
      classIds: [cls.id, "notice-section-b"],
    };
    const n = await call(p + "/notices", t.teacher, b);
    assert.equal(n.status, 201);
    assert.deepEqual(n.data.classIds, b.classIds);
    assert.ok(
      (await call(p + "/workspace", t.teacher)).data.notices.some(
        (x) => x.id === n.data.id,
      ),
    );
    assert.equal(
      (await call(p + "/notices", t.teacher, { ...b, audience: "all" })).status,
      403,
    );
    assert.equal(
      (await call(p + "/notices", t.teacher, { ...b, classIds: [] })).status,
      403,
    );
    assert.equal(
      (
        await call(p + "/notices", t.teacher, {
          ...b,
          classIds: [cls.id, "school-north-9"],
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call(p + "/notices", t.principal, {
          ...b,
          classIds: ["school-west-10"],
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call(p + "/notices", t.principal, {
          ...b,
          classIds: [cls.id, cls.id],
        })
      ).status,
      400,
    );
    assert.equal((await call(p + "/notices", t.student, b)).status, 403);
    assert.ok(
      (await call(p + "/workspace", t.student)).data.notices.some(
        (x) => x.id === n.data.id,
      ),
    );
    const hidden = await call(p + "/notices", t.principal, {
      ...b,
      classIds: ["school-north-9"],
    });
    assert.equal(hidden.status, 201);
    assert.ok(
      !(await call(p + "/workspace", t.student)).data.notices.some(
        (x) => x.id === hidden.data.id,
      ),
    );
    assert.equal(
      (await call(p + `/notices/${hidden.data.id}/download`, t.student)).status,
      404,
    );
    assert.equal(
      (await call(p + `/notices/${n.data.id}/download`, t.student)).status,
      200,
    );
    const old = await call(p + "/notices", t.principal, {
      title: "Legacy",
      body: "Single class",
      audience: "student",
      classId: cls.id,
    });
    assert.equal(old.status, 201);
    await store.put("users", { ...teacher, classIds: [cls.id] });
    assert.equal((await call(p + "/notices", t.teacher, b)).status, 403);
    const student = (await store.all("users")).find(
      (u) => u.id === "user-student",
    );
    await store.put("users", {
      ...student,
      id: "notice-parent",
      email: "notice.parent@fixture.local",
      role: "parent",
      classIds: [],
    });
    await store.put("guardians", {
      id: "notice-guardian",
      schoolId: "school-north",
      name: "Guardian",
    });
    await store.put("studentGuardians", {
      id: "notice-contact",
      schoolId: "school-north",
      studentId: student.id,
      guardianId: "notice-guardian",
      active: true,
    });
    await store.put("parentLinks", {
      id: "notice-link",
      schoolId: "school-north",
      userId: "notice-parent",
      guardianId: "notice-guardian",
      active: true,
    });
    const parent = (
      await call("/auth/login", null, {
        email: "notice.parent@fixture.local",
        password: "OrbitDemo123!",
      })
    ).data.token;
    assert.ok(
      (await call(p + "/family", parent)).data.child.notices.some(
        (x) => x.id === n.data.id,
      ),
    );
    assert.ok(
      !(await call(p + "/family", parent)).data.child.notices.some(
        (x) => x.id === hidden.data.id,
      ),
    );
  } finally {
    await close();
  }
});
test("admission approval atomically onboards student and verified guardian, reuses guardian and rolls back incompatible accounts", async () => {
  const { store, call, t, p, close } = await fixture();
  try {
    async function application(
      email,
      guardianEmail = "admission.guardian@fixture.local",
    ) {
      const r = await call(p + "/admissions", t.principal, {
        studentName: "Admission Fixture",
        loginEmail: email,
        classId: "school-north-10",
        birthDate: "",
        admissionNumber: "",
        address: "",
        guardianConsent: true,
        guardians: [
          {
            name: "Verified Guardian",
            relationship: "Guardian",
            email: guardianEmail,
            phone: "",
          },
        ],
      });
      assert.equal(r.status, 201);
      await call(p + `/admissions/${r.data.id}/decision`, t.principal, {
        status: "reviewing",
        reason: "Reviewed fixture documents",
      });
      return p + `/admissions/${r.data.id}/decision`;
    }
    const path = await application("admit.one@fixture.local");
    const body = {
      status: "admitted",
      reason: "Verified fixture family",
      guardianAccountIndices: [0],
      guardianAccountsVerified: true,
    };
    assert.equal(
      (
        await call(path, t.principal, {
          ...body,
          guardianAccountsVerified: false,
        })
      ).status,
      400,
    );
    const approved = await call(path, t.principal, body);
    assert.equal(approved.status, 200);
    assert.equal(approved.data.parentAccountIds.length, 1);
    const parent = (await store.all("users")).find(
      (u) => u.id === approved.data.parentAccountIds[0],
    );
    assert.equal(parent.role, "parent");
    assert.equal(parent.passwordChangeRequired, true);
    assert.ok(
      !(await call(p + "/student-records", t.principal)).data.students.find(
        (u) => u.id === approved.data.studentId,
      ).passwordHash,
    );
    const second = await call(
      await application("admit.two@fixture.local"),
      t.principal,
      body,
    );
    assert.equal(second.status, 200);
    assert.deepEqual(second.data.parentAccountIds, [parent.id]);
    assert.equal(
      (await store.all("parentLinks")).filter(
        (l) => l.userId === parent.id && l.active,
      ).length,
      2,
    );
    const conflicting = await application(
      "admit.rollback@fixture.local",
      "teacher@orbit.local",
    );
    const before = (await store.all("users")).length;
    assert.equal((await call(conflicting, t.principal, body)).status, 409);
    assert.equal((await store.all("users")).length, before);
    assert.ok(
      !(await store.all("users")).some(
        (u) => u.email === "admit.rollback@fixture.local",
      ),
    );
  } finally {
    await close();
  }
});
test("school logo and private gallery enforce dimensions, scan, metadata removal, scoped images, archive and branded exports", async () => {
  const { store, call, t, p, close } = await fixture();
  try {
    const upload = (bytes = png(), fields = { version: "0" }) => {
      const b = new FormData();
      b.append("file", new Blob([bytes], { type: "image/png" }), "fixture.png");
      for (const [k, v] of Object.entries(fields)) b.append(k, v);
      return b;
    };
    assert.equal(
      (await call(p + "/school-logo", t.teacher, upload())).status,
      403,
    );
    assert.equal(
      (await call(p + "/school-logo", t.principal, upload(png(128, 128))))
        .status,
      400,
    );
    const logo = await call(p + "/school-logo", t.principal, upload());
    assert.equal(logo.status, 200);
    assert.match(logo.data.logoDataUri, /^data:image\/png;base64,/);
    assert.equal(
      (await call(p + "/school-logo", t.principal, upload())).status,
      409,
    );
    const settings = await call(p + "/school-settings", t.principal, {
      version: 1,
      displayName: "Fixture School",
      accent: "#11796f",
      locale: "en-IN",
      timeZone: "Asia/Kolkata",
    });
    assert.equal(settings.status, 200);
    assert.equal(
      (await call(p + "/school-settings", t.student)).data.logoFileId,
      logo.data.logoFileId,
    );
    const raw = await readFile(
      fileURLToPath(
        new URL(`../data/uploads/${logo.data.logoFileId}`, import.meta.url),
      ),
    );
    assert.ok(!raw.includes(Buffer.from("Synthetic private metadata")));
    const n = await call(p + "/notices", t.principal, {
      title: "Branded notice",
      body: "School information",
      audience: "all",
      classIds: [],
    });
    assert.match(
      (await call(p + `/notices/${n.data.id}/download`, t.student)).data.html,
      /<img src="data:image\/png;base64,/,
    );
    const exported = await call(p + "/exports/attendance", t.principal);
    assert.equal(exported.status, 200);
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(Buffer.from(exported.data.base64, "base64"));
    assert.equal(book.getWorksheet("School identity").getImages().length, 1);
    const pdf = await reportPdf({
      schoolName: "Fixture",
      schoolLogo: logo.data.logoDataUri,
      examName: "Fixture exam",
      studentName: "Fixture student",
      academicYear: "2026",
      className: "A",
      version: 1,
      publishedAt: "2026-10-09",
      rows: [],
      totalScore: 0,
      totalMax: 1,
      percentage: 0,
      grade: "F",
      passed: false,
    });
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
    const material = await call(
      p + "/uploads",
      t.teacher,
      upload(png(), {
        classId: "school-north-10",
        title: "Synthetic classroom resource",
        type: "material",
        description:
          "This fixture verifies a school-branded cover and preservation of the uploaded original.",
        dueDate: "",
      }),
    );
    assert.equal(material.status, 201);
    const branded = await call(
      p + `/resources/${material.data.id}/document`,
      t.student,
    );
    assert.equal(branded.status, 200);
    assert.equal(branded.data.mime, "application/pdf");
    const brandedBytes = Buffer.from(branded.data.base64, "base64"),
      brandedDoc = await PDFDocument.load(brandedBytes);
    assert.equal(brandedDoc.getPageCount(), 2);
    assert.deepEqual(
      await readFile(
        fileURLToPath(
          new URL(`../data/uploads/${material.data.fileId}`, import.meta.url),
        ),
      ),
      png(),
    );
    assert.equal(
      (
        await call(
          `/schools/school-west/resources/${material.data.id}/document`,
          t.director,
        )
      ).status,
      404,
    );
    if (process.env.WRITE_DOCUMENT_PREVIEW === "true") {
      await mkdir("output/pdf", { recursive: true });
      await writeFile(
        "output/pdf/school-branded-resource-preview.pdf",
        brandedBytes,
      );
    }
    const fields = {
      title: "Fixture school event",
      caption: "Synthetic illustration, no real children",
      consentVerified: "true",
    };
    assert.equal(
      (await call(p + "/gallery", t.teacher, upload(png(), fields))).status,
      403,
    );
    assert.equal(
      (
        await call(
          p + "/gallery",
          t.principal,
          upload(png(), { ...fields, consentVerified: "false" }),
        )
      ).status,
      400,
    );
    const photo = await call(
      p + "/gallery",
      t.principal,
      upload(png(), fields),
    );
    assert.equal(photo.status, 201);
    assert.equal((await call(p + "/gallery", t.student)).data.total, 1);
    assert.equal(
      (await call(p + `/gallery/${photo.data.id}/image`, t.student)).status,
      200,
    );
    assert.equal(
      (
        await call(
          `/schools/school-west/gallery/${photo.data.id}/image`,
          t.director,
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await call(p + `/gallery/${photo.data.id}/archive`, t.student, {
          reason: "Test removal",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call(p + `/gallery/${photo.data.id}/archive`, t.principal, {
          reason: "Fixture no longer current",
        })
      ).status,
      200,
    );
    assert.equal(
      (await call(p + `/gallery/${photo.data.id}/image`, t.student)).status,
      404,
    );
    assert.equal((await store.all("galleryPhotos")).length, 1);
  } finally {
    await close();
  }
});

test("unavailable scanner prevents logo and gallery writes", async () => {
  const { store, call, t, p, close } = await fixture(async () => {
    throw Object.assign(new Error("Scanner not configured"), { status: 503 });
  });
  try {
    const upload = (gallery) => {
      const b = new FormData();
      b.append("file", new Blob([png()]), "fixture.png");
      if (gallery) {
        b.append("title", "Fixture");
        b.append("caption", "");
        b.append("consentVerified", "true");
      } else b.append("version", "0");
      return b;
    };
    assert.equal(
      (await call(p + "/school-logo", t.principal, upload(false))).status,
      503,
    );
    assert.equal(
      (await call(p + "/gallery", t.principal, upload(true))).status,
      503,
    );
    assert.equal((await store.all("files")).length, 0);
    assert.equal((await store.all("galleryPhotos")).length, 0);
    assert.equal((await store.all("schoolSettings")).length, 0);
  } finally {
    await close();
  }
});
