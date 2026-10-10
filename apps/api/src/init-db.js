import "dotenv/config";
import { createStore } from "./store.js";
import { seed } from "./seed.js";
const store = await createStore(process.env.DATA_MODE || "mysql", {
  migrate: true,
});
await seed(store);
await store.close();
console.log("Database initialized.");
