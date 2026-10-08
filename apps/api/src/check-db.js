import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createStore } from "./store.js";
const first = await createStore("mysql");
const owners = (await first.all("users")).filter((u) => u.role === "owner");
assert.equal(owners.length, 1, "Exactly one bootstrap owner expected");
const marker = {
  id: randomUUID(),
  actorId: owners[0].id,
  action: "verification.mysql-persistence",
  schoolId: null,
  createdAt: new Date().toISOString(),
};
await first.put("audit", marker);
await first.close();
const second = await createStore("mysql");
assert.deepEqual(
  (await second.all("audit")).find((a) => a.id === marker.id),
  marker,
);
await second.close();
console.log(
  "MySQL verified: bootstrap owner and persistence across independent connections. Audit marker retained.",
);
