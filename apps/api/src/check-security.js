import "dotenv/config";
import { randomUUID, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import assert from "node:assert/strict";
import { createStore } from "./store.js";
import { createApp } from "./app.js";
const userId = randomUUID(),
  password = randomBytes(18).toString("base64url") + "Ab1!";
let store, server;
async function start() {
  store = await createStore("mysql");
  server = createApp(store).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
}
async function stop() {
  if (server) await new Promise((r) => server.close(r));
  if (store) await store.close();
  server = null;
  store = null;
}
async function call(path, token, body, expected = 200) {
  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api${path}`,
    {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  );
  assert.equal(response.status, expected);
  return response.json();
}
try {
  await start();
  await store.put("users", {
    id: userId,
    name: "Disposable security fixture",
    email: `${userId}@fixture.local`,
    role: "staff",
    orgId: null,
    schoolIds: [],
    classIds: [],
    passwordHash: await bcrypt.hash(password, 12),
    authVersion: 0,
  });
  const login = await call("/auth/login", null, {
    email: `${userId}@fixture.local`,
    password,
  });
  await stop();
  await start();
  assert.equal((await call("/me", login.token)).user.id, userId);
  const second = await call("/auth/login", null, {
    email: `${userId}@fixture.local`,
    password,
  });
  await call("/auth/revoke-others", second.token, {});
  await call("/me", login.token, null, 401);
  await call("/auth/change-password", second.token, {
    currentPassword: password,
    password: password + "Changed",
  });
  await call("/me", second.token, null, 401);
  process.stdout.write(
    "MySQL security checks passed: restart persistence, other-session revocation and password invalidation.\n",
  );
} finally {
  await stop();
  const cleanup = await createStore("mysql");
  const ids = [
    userId,
    ...(await cleanup.all("securityTokens"))
      .filter((r) => r.userId === userId)
      .map((r) => r.id),
    ...(await cleanup.all("audit"))
      .filter((r) => r.actorId === userId)
      .map((r) => r.id),
  ];
  await cleanup.close();
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "orbit",
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || "orbit_school",
  });
  try {
    await connection.execute("DELETE FROM sg_security_tokens WHERE user_id=?", [
      userId,
    ]);
    for (const fixtureId of ids)
      await connection.execute("DELETE FROM sg_audit WHERE id=?", [fixtureId]);
    await connection.execute("DELETE FROM sg_users WHERE id=?", [userId]);
  } finally {
    await connection.end();
  }
}
