import "dotenv/config";
import { createStore } from "./store.js";
import { seed } from "./seed.js";
import { createApp } from "./app.js";
import { maintenance } from "./maintenance.js";
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
process.on("SIGINT", () =>
  server.close(async () => {
    await store.close();
    process.exit(0);
  }),
);
