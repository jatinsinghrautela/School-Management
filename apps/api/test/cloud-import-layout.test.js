import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sameMigrationVersions,
  writableColumns,
} from "../src/cloud-import-layout.js";
test("cloud release comparison ignores new install timestamps but rejects schema version differences", () => {
  assert.equal(
    sameMigrationVersions(
      [{ version: 1, applied_at: "old" }, { version: 2 }],
      [{ version: 2 }, { version: 1, applied_at: "new" }],
    ),
    true,
  );
  assert.equal(
    sameMigrationVersions([{ version: 1 }], [{ version: 2 }]),
    false,
  );
});
test("cloud inserts omit stored and virtual generated columns while retaining defaults and writable fields", () => {
  assert.deepEqual(
    writableColumns(
      ["id", "payload", "computed", "computed_stored", "created_at"],
      [
        { Field: "id", Extra: "" },
        { Field: "payload", Extra: "" },
        { Field: "computed", Extra: "VIRTUAL GENERATED" },
        { Field: "computed_stored", Extra: "STORED GENERATED" },
        { Field: "created_at", Extra: "DEFAULT_GENERATED" },
      ],
    ),
    ["id", "payload", "created_at"],
  );
});
