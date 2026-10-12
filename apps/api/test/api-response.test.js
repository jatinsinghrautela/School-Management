import { test } from "node:test";
import assert from "node:assert/strict";
import { readApiResponse } from "../../web/src/api-response.js";
test("API responses preserve JSON and explain empty/proxy/size failures", async () => {
  assert.deepEqual(
    await readApiResponse(new Response('{"previewId":"valid"}')),
    { previewId: "valid" },
  );
  assert.deepEqual(
    await readApiResponse(
      new Response('{"error":"Invalid workbook"}', { status: 400 }),
    ),
    { error: "Invalid workbook" },
  );
  await assert.rejects(
    readApiResponse(new Response("", { status: 500 })),
    /backend is running/,
  );
  await assert.rejects(
    readApiResponse(new Response("<html>Bad gateway</html>", { status: 502 })),
    /HTTP 502/,
  );
  await assert.rejects(
    readApiResponse(new Response("", { status: 413 })),
    /size limit/,
  );
  await assert.rejects(
    readApiResponse(new Response("Too many requests", { status: 429 })),
    /Too many requests/,
  );
});
