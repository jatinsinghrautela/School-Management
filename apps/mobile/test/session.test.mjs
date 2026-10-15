import { test } from "node:test";
import assert from "node:assert/strict";
import { createApi, apiBase, ApiError } from "../src/core/api.ts";
import { Session } from "../src/core/session.ts";
const identity = {
  user: {
    id: "u",
    name: "Demo user",
    role: "principal",
    email: "test@school.local",
  },
  schools: [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
  ],
  mode: "demo",
};
function setup(overrides = {}, saved = null) {
  let token = saved;
  let calls = [];
  const api = {
    login: async () => ({ token: "issued", user: identity.user, mode: "demo" }),
    me: async () => identity,
    workspace: async (_, id) => ({ school: { id, name: id }, notices: [] }),
    logout: async () => {},
    changePassword: async () => {},
    ...overrides,
  };
  const vault = {
    read: async () => token,
    write: async (value) => {
      token = value;
      calls.push(["write", value]);
    },
    clear: async () => {
      token = null;
      calls.push(["clear"]);
    },
  };
  const session = new Session(api, vault, () => {});
  return {
    session,
    api,
    vault,
    calls,
    get token() {
      return token;
    },
  };
}
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
test("restored expired session clears token; network error locks instead of showing private data", async () => {
  for (const [status, expected] of [
    [401, "signedOut"],
    [0, "locked"],
  ]) {
    const x = setup(
      {
        me: async () => {
          throw new ApiError("unavailable", status);
        },
      },
      "saved",
    );
    await x.session.restore();
    assert.equal(x.session.state.status, expected);
    assert.equal(x.session.state.identity, null);
    assert.equal(x.token, status === 401 ? null : "saved");
  }
});
test("school switching clears old data and rejects stale school responses", async () => {
  const x = setup();
  await x.session.login("a", "b");
  const slow = deferred();
  x.api.workspace = async (_, id) =>
    id === "b" ? slow.promise : { school: { id: "a", name: "A" } };
  const pending = x.session.selectSchool("b");
  assert.equal(x.session.state.workspace, null);
  await x.session.selectSchool("a");
  slow.resolve({ school: { id: "b", name: "B" } });
  await pending;
  assert.equal(x.session.state.workspace.school.id, "a");
  assert.equal(x.session.state.schoolId, "a");
});
test("logout wins over pending login and revokes the late-issued token", async () => {
  const pending = deferred();
  let revoked = [];
  const x = setup({
    login: () => pending.promise,
    logout: async (t) => revoked.push(t),
  });
  const work = x.session.login("a", "b");
  await x.session.logout();
  pending.resolve({ token: "late" });
  await work;
  assert.equal(x.session.state.status, "signedOut");
  assert.equal(x.token, null);
  assert.deepEqual(revoked, ["late"]);
});
test("required password change never fetches a workspace and success requires re-login", async () => {
  let count = 0;
  const x = setup({
    me: async () => ({
      ...identity,
      user: { ...identity.user, passwordChangeRequired: true },
    }),
    workspace: async () => {
      count++;
    },
  });
  await x.session.login("a", "b");
  assert.equal(count, 0);
  await x.session.selectSchool("a");
  assert.equal(count, 0);
  await x.session.changePassword("temporary12345", "NewPassword12345");
  assert.equal(x.session.state.status, "signedOut");
  assert.equal(x.token, null);
});
test("secure-store failure revokes login and does not expose account data", async () => {
  let revoked = false;
  const x = setup({
    logout: async () => {
      revoked = true;
    },
  });
  x.vault.write = async () => {
    throw Error("Storage unavailable");
  };
  await x.session.login("a", "b");
  assert.equal(x.session.state.status, "signedOut");
  assert.equal(x.session.state.identity, null);
  assert.equal(revoked, true);
});
test("private data stays cleared when secure-store logout cleanup fails", async () => {
  const x = setup();
  await x.session.login("a", "b");
  x.vault.clear = async () => {
    throw Error("locked");
  };
  await x.session.logout();
  assert.equal(x.session.state.status, "locked");
  assert.equal(x.session.state.identity, null);
  assert.equal(x.session.state.workspace, null);
});
test("API handles HTML challenges, empty responses and timeout without repeating writes", async () => {
  for (const raw of ["", "<html>challenge</html>"]) {
    const api = createApi(
      "https://example.test/api",
      async () => new Response(raw, { status: 503 }),
    );
    await assert.rejects(
      api.me("secret"),
      (e) => e.status === 503 && e.message.includes("unexpected"),
    );
  }
  let count = 0;
  const api = createApi("https://example.test/api", async (_, options) => {
    count++;
    assert.equal(options.headers.Authorization, "Bearer secret");
    return new Response(JSON.stringify({ error: "No access" }), {
      status: 403,
    });
  });
  await assert.rejects(
    api.changePassword("secret", "old", "new"),
    (e) => e.status === 403,
  );
  assert.equal(count, 1);
  const slow = createApi(
    "https://example.test/api",
    async (_, options) =>
      new Promise((_, reject) =>
        options.signal.addEventListener("abort", () =>
          reject(Error("aborted")),
        ),
      ),
    5,
  );
  await assert.rejects(slow.me("secret"), /too long/);
});
test("release API configuration requires HTTPS and rejects embedded credentials", () => {
  assert.equal(
    apiBase("https://school.test/", false),
    "https://school.test/api",
  );
  assert.throws(() => apiBase("http://school.test", false));
  assert.throws(() => apiBase("https://u:p@school.test", true));
  assert.equal(
    apiBase("http://192.168.1.3:4100", true),
    "http://192.168.1.3:4100/api",
  );
});

test("stored sessions are scoped to the exact API endpoint", async () => {
  const { sessionStorageKey } = await import("../src/core/api.ts");
  const live = sessionStorageKey("https://school.test/api");
  assert.match(live, /^[a-zA-Z0-9._-]+$/);
  assert.notEqual(live, sessionStorageKey("http://192.168.1.3:4100/api"));
  assert.notEqual(
    sessionStorageKey("https://a-b.test/api"),
    sessionStorageKey("https://a.b.test/api"),
  );
});
