import { readdir, lstat, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../data/uploads/", import.meta.url));
export async function maintenance(store, now = Date.now()) {
  let removedTokens = 0,
    removedPreviews = 0,
    removedFiles = 0;
  for (const token of await store.all("securityTokens"))
    if (token.expires < now - 7 * 86400000) {
      await store.remove("securityTokens", token.id);
      removedTokens++;
    }
  for (const school of await store.all("schools"))
    await store.transaction(school.id, async (tx) => {
      for (const kind of [
        "calendarImports",
        "promotionPreviews",
        "peopleImports",
      ])
        for (const row of await tx.all(kind))
          if (
            row.schoolId === school.id &&
            (row.expiresAt || row.expires || Infinity) < now - 86400000
          ) {
            await tx.remove(kind, row.id);
            removedPreviews++;
          }
      const linked = new Set(
        (await tx.all("submissions"))
          .map((s) => s.attachmentId)
          .filter(Boolean),
      );
      for (const file of await tx.all("files"))
        if (
          file.schoolId === school.id &&
          file.staged &&
          !linked.has(file.id) &&
          Date.parse(file.createdAt) < now - 86400000
        ) {
          await tx.remove("files", file.id);
          removedFiles++;
        }
    });
  const referenced = new Set((await store.all("files")).map((f) => f.id));
  for (const name of await readdir(root).catch(() => []))
    if (/^[a-f0-9-]{36}$/.test(name) && !referenced.has(name)) {
      const path = root + name,
        stat = await lstat(path).catch(() => null);
      if (stat?.isFile() && stat.mtimeMs < now - 86400000)
        await unlink(path).catch(() => {});
    }
  return { removedTokens, removedPreviews, removedFiles };
}
