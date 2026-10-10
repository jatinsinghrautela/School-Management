import "dotenv/config";
import { requireDeployment } from "./deployment-config.js";
import { existsSync } from "node:fs";
import { createStore } from "./store.js";
import { seed } from "./seed.js";
import { createApp } from "./app.js";
import { maintenance } from "./maintenance.js";
requireDeployment();
if (
  process.env.NODE_ENV === "production" &&
  !existsSync(new URL("../../web/dist/index.html", import.meta.url))
)
  throw new Error("Build the web application before production startup");
const store = await createStore();
await seed(store);
const app = createApp(store);
const sweep = setInterval(
  () =>
    maintenance(store).catch(() =>
      console.error("Scheduled storage cleanup failed"),
    ),
  30 * 60 * 1000,
);
sweep.unref();
const server = app.listen(
  Number(process.env.PORT || 4000),
  process.env.HOST || "127.0.0.1",
  () =>
    console.log(
      `Orbit API: http://${process.env.HOST || "127.0.0.1"}:${process.env.PORT || 4000} (${store.mode})`,
    ),
);
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  app.locals.readiness.stop();
  clearInterval(sweep);
  const deadline = setTimeout(() => {
    server.closeAllConnections();
    process.exit(1);
  }, 10000);
  deadline.unref();
  server.close(async () => {
    try {
      await store.close();
    } finally {
      clearTimeout(deadline);
    }
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
