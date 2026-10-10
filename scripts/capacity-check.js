import { createStore } from "../apps/api/src/store.js";
import { seed } from "../apps/api/src/seed.js";
import { createApp } from "../apps/api/src/app.js";
// Always creates an isolated synthetic service; no URL/production data accepted.
const store = await createStore("demo");
await seed(store);
const server = createApp(store, { mailer: null }).listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));
try {
  const origin = `http://127.0.0.1:${server.address().port}`;
  const login = await fetch(origin + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "principal@orbit.local",
      password: "OrbitDemo123!",
    }),
  });
  if (!login.ok) throw new Error("Synthetic login failed");
  const { token } = await login.json();
  const samples = [];
  let failures = 0,
    next = 0;
  const begin = performance.now();
  await Promise.all(
    Array.from({ length: 5 }, async () => {
      while (next++ < 100) {
        const start = performance.now();
        const res = await fetch(
          origin + "/api/schools/school-north/workspace",
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(5000),
          },
        );
        const data = await res.json();
        if (!res.ok || data.school?.id !== "school-north") failures++;
        samples.push(performance.now() - start);
      }
    }),
  );
  samples.sort((a, b) => a - b);
  const result = {
    scope:
      "Synthetic in-memory authenticated reads; not a production/MySQL sizing guarantee",
    requests: samples.length,
    concurrency: 5,
    failures,
    elapsedMs: Math.round(performance.now() - begin),
    p50Ms: Math.round(samples[Math.ceil(samples.length * 0.5) - 1]),
    p95Ms: Math.round(samples[Math.ceil(samples.length * 0.95) - 1]),
    maxMs: Math.round(samples.at(-1)),
  };
  console.log(JSON.stringify(result, null, 2));
  if (failures || samples.length !== 100 || result.p95Ms > 2000)
    process.exitCode = 1;
} finally {
  await new Promise((r) => server.close(r));
  await store.close();
}
