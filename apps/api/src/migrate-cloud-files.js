import "dotenv/config";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createStore } from "./store.js";
import { createR2Storage } from "./file-storage.js";
if (
  process.env.FILE_STORAGE !== "r2" ||
  process.env.CLOUD_MIGRATION_CONFIRMED !== "yes"
)
  throw new Error(
    "Configure target R2 and acknowledge CLOUD_MIGRATION_CONFIRMED=yes after stopping writers and verifying backup",
  );
const store = await createStore("mysql", { migrate: false });
const storage = createR2Storage();
const root = fileURLToPath(new URL("../data/uploads/", import.meta.url));
const digest = (b) => createHash("sha256").update(b).digest("hex");
try {
  const files = await store.all("files");
  // Target DB must already contain the copied metadata; source disk remains untouched.
  const local = [];
  for (const f of files) {
    if (!/^[a-f0-9-]{36}$/.test(f.id)) throw new Error("Invalid file identity");
    const b = await readFile(root + f.id);
    if (b.length !== f.size)
      throw new Error("Local file size differs from metadata");
    local.push([f, b]);
  }
  let migrated = 0;
  for (const [f, b] of local) {
    let existing;
    try {
      existing = await storage.readFile(root + f.id);
    } catch {}
    if (existing) {
      if (digest(existing) !== digest(b))
        throw new Error("Existing cloud object differs; migration stopped");
    } else {
      await storage.writeFile(root + f.id, b);
      if (digest(await storage.readFile(root + f.id)) !== digest(b))
        throw new Error("Cloud checksum differs");
    }
    migrated++;
  }
  console.log(
    JSON.stringify({ filesVerified: migrated, sourceFilesDeleted: 0 }),
  );
} finally {
  await storage.close();
  await store.close();
}
