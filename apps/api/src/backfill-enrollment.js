import "dotenv/config";
import { createStore } from "./store.js";
import { assignEnrollmentNumber } from "./enrollment-numbers.js";
import { id } from "./domain.js";
const store = await createStore();
try {
  const users = await store.all("users");
  const owner = users.find((u) => u.role === "owner");
  let count = 0;
  for (const school of await store.all("schools")) {
    const selected = users.filter(
      (u) =>
        u.schoolIds.includes(school.id) &&
        ["student", "teacher"].includes(u.role),
    );
    if (!selected.length) continue;
    await store.transaction(school.id, async (tx) => {
      await tx.lockUsers(selected.map((u) => u.id).sort());
      for (const u of selected)
        await assignEnrollmentNumber(tx, school, u, { convert: true });
      await tx.put("audit", {
        id: id(),
        actorId: owner?.id || "system",
        schoolId: school.id,
        action: "enrollment-numbers.backfilled",
        count: selected.length,
        createdAt: new Date().toISOString(),
      });
    });
    count += selected.length;
  }
  console.log(JSON.stringify({ processed: count, deletedRecords: 0 }));
} finally {
  await store.close();
}
