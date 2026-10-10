import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../src/store.js";
import { seed } from "../src/seed.js";
import { createApp } from "../src/app.js";
import {
  runtimeMigrations,
  requireCurrentSchema,
} from "../src/schema-policy.js";
import { runtimeGrants } from "../src/database-grants.js";
async function fixture() {
  const store = await createStore("demo");
  await seed(store);
  const server = createApp(store, { mailer: null }).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function request(path, token, body) {
    const response = await fetch(base + path, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json() };
  }
  const login = async (role) =>
    (
      await request("/auth/login", null, {
        email: `${role}@orbit.local`,
        password: "OrbitDemo123!",
      })
    ).data.token;
  return {
    store,
    request,
    login,
    close: async () => {
      await new Promise((r) => server.close(r));
      await store.close();
    },
  };
}
test("audit records are append-only in direct and transactional writes, including caught rejections", async () => {
  const store = await createStore("demo");
  await store.put("schools", { id: "s", name: "Synthetic" });
  const entry = { id: "audit-proof", schoolId: "s", action: "original" };
  await store.put("audit", entry);
  await assert.rejects(
    store.put("audit", { ...entry, action: "changed" }),
    /append-only/,
  );
  await assert.rejects(store.remove("audit", entry.id), /append-only/);
  await store.transaction("s", async (tx) => {
    await assert.rejects(
      tx.put("audit", { ...entry, action: "changed" }),
      /append-only/,
    );
    await assert.rejects(tx.remove("audit", entry.id), /append-only/);
  });
  assert.deepEqual(await store.all("audit"), [entry]);
  await store.close();
});
test("production runtime requires existing release schema and generated grants exclude DDL and audit mutations", async () => {
  assert.equal(
    runtimeMigrations({ NODE_ENV: "production", MYSQL_AUTO_MIGRATE: "yes" }),
    false,
  );
  assert.equal(
    runtimeMigrations({ NODE_ENV: "development", MYSQL_AUTO_MIGRATE: "no" }),
    false,
  );
  assert.equal(runtimeMigrations({ NODE_ENV: "development" }), true);
  await requireCurrentSchema({
    query: async () => [
      Array.from({ length: 9 }, (_, i) => ({ version: i + 1 })),
    ],
  });
  await assert.rejects(
    requireCurrentSchema({ query: async () => [[{ version: 8 }]] }),
    /schema/,
  );
  const grants = runtimeGrants("schoolglass", "schoolglass_app", "127.0.0.1");
  assert.equal(grants.length, 57);
  assert.equal(
    grants
      .find((s) => s.includes("`sg_audit`"))
      .startsWith("GRANT SELECT, INSERT ON"),
    true,
  );
  assert.equal(
    grants.some((s) => /ALL|CREATE|ALTER|DROP|GRANT OPTION/.test(s)),
    false,
  );
  assert.throws(() =>
    runtimeGrants("school; DROP DATABASE x", "app", "localhost"),
  );
  assert.throws(() => runtimeGrants("school", "app", "%"));
});
test("account administration rechecks target school access after waiting for its transaction", async () => {
  const f = await fixture();
  try {
    const principal = await f.login("principal");
    const target = (await f.store.all("users")).find(
      (u) => u.role === "student",
    );
    const transaction = f.store.userTransaction.bind(f.store);
    for (const [path, body] of [
      ["status", { active: false }],
      ["profile", { name: "Unauthorized rename", phone: "" }],
      ["recovery", {}],
      [
        "access",
        {
          role: "student",
          schoolIds: ["school-north"],
          classIds: target.classIds,
        },
      ],
    ]) {
      await f.store.put("users", target);
      f.store.userTransaction = async (uid, work) => {
        await f.store.put("users", {
          ...target,
          schoolIds: ["school-west"],
          classIds: [],
        });
        return transaction(uid, work);
      };
      const response = await f.request(
        `/users/${target.id}/${path}`,
        principal,
        body,
      );
      assert.equal(response.status, 403, path);
      const after = await f.store.findUser("id", target.id);
      assert.equal(after.active, target.active);
      assert.notEqual(after.name, "Unauthorized rename");
      assert.deepEqual(after.schoolIds, ["school-west"]);
    }
    assert.equal(
      (await f.store.all("securityTokens")).some(
        (t) => t.type === "reset" && t.userId === target.id,
      ),
      false,
    );
  } finally {
    await f.close();
  }
});
test("independent school isolation rejects guessed IDs and support expires when its owner loses that role", async () => {
  const f = await fixture();
  try {
    const users = await f.store.all("users"),
      original = users.find((u) => u.role === "teacher");
    await f.store.put("schools", {
      id: "independent-a",
      name: "Synthetic A",
      orgId: null,
    });
    await f.store.put("schools", {
      id: "independent-b",
      name: "Synthetic B",
      orgId: null,
    });
    await f.store.put("classes", {
      id: "class-independent-a",
      schoolId: "independent-a",
      name: "A",
    });
    await f.store.put("classes", {
      id: "class-independent-b",
      schoolId: "independent-b",
      name: "B",
    });
    await f.store.put("users", {
      ...original,
      orgId: null,
      schoolIds: ["independent-a"],
      classIds: ["class-independent-a"],
    });
    await f.store.put("notices", {
      id: "private-b",
      schoolId: "independent-b",
      classIds: ["class-independent-b"],
      title: "Private B marker",
      body: "Private B content",
      audience: "all",
    });
    const teacher = await f.login("teacher");
    for (const path of [
      "workspace",
      "family",
      "fees",
      "admissions",
      "gallery",
      "school-logo",
      "notices/private-b/download",
      "files/guessed",
    ])
      assert.equal(
        (await f.request(`/schools/independent-b/${path}`, teacher)).status,
        403,
        path,
      );
    const own = await f.request(
      "/schools/independent-a/workspace?schoolId=independent-b",
      teacher,
    );
    assert.equal(own.status, 200);
    assert.equal(JSON.stringify(own.data).includes("Private B marker"), false);
    assert.equal(
      (
        await f.request(
          "/schools/independent-a/notices/private-b/download",
          teacher,
        )
      ).status,
      404,
    );
    const before = (await f.store.all("notices")).length;
    const injection = await f.request(
      "/schools/independent-a/notices",
      teacher,
      {
        title: "Injected",
        body: "Unauthorized class",
        audience: "student",
        classIds: ["class-independent-b"],
        schoolId: "independent-b",
      },
    );
    assert.ok([400, 403].includes(injection.status));
    assert.equal((await f.store.all("notices")).length, before);
    const ownerToken = await f.login("owner"),
      owner = users.find((u) => u.role === "owner");
    const session = await f.request("/platform/support", ownerToken, {
      userId: original.id,
      reason: "Synthetic security review of school isolation",
      acknowledge: true,
    });
    assert.equal(session.status, 200);
    await f.store.put("users", { ...owner, role: "staff" });
    assert.equal((await f.request("/me", session.data.token)).status, 401);
  } finally {
    await f.close();
  }
});
