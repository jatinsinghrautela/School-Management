import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createStore } from "../src/store.js";
import { createApp } from "../src/app.js";
import { seed } from "../src/seed.js";
test("fee ledger enforces scoped assignments, exact balances, retry safety, receipts and reasoned voids", async () => {
  const store = await createStore("demo");
  await seed(store);
  const server = createApp(store, { mailer: null }).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function call(path, token, body) {
    const r = await fetch(base + path, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: r.status, data: await r.json() };
  }
  try {
    const tokens = {};
    for (const role of ["principal", "teacher", "student", "director", "owner"])
      tokens[role] = (
        await call("/auth/login", null, {
          email: `${role}@orbit.local`,
          password: "OrbitDemo123!",
        })
      ).data.token;
    const prefix = "/schools/school-north",
      scheduleBody = {
        classId: "school-north-10",
        name: "Tuition",
        amountMinor: 10001,
        currency: "INR",
        dueDate: "2026-10-15",
      };
    assert.equal((await call(prefix + "/fees", tokens.teacher)).status, 403);
    assert.equal(
      (await call(prefix + "/fee-schedules", tokens.student, scheduleBody))
        .status,
      403,
    );
    assert.equal(
      (
        await call(prefix + "/fee-schedules", tokens.principal, {
          ...scheduleBody,
          amountMinor: 10.1,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call(prefix + "/fee-schedules", tokens.principal, {
          ...scheduleBody,
          classId: "school-west-10",
        })
      ).status,
      400,
    );
    const schedule = await call(
      prefix + "/fee-schedules",
      tokens.principal,
      scheduleBody,
    );
    assert.equal(schedule.status, 201);
    const path = prefix + `/fee-schedules/${schedule.data.id}/assign`;
    assert.equal(
      (
        await call(path, tokens.principal, {
          studentIds: ["user-student", "missing"],
        })
      ).status,
      400,
    );
    assert.equal((await store.all("feeCharges")).length, 0);
    assert.equal(
      (await call(path, tokens.principal, { studentIds: ["user-student"] }))
        .data.created,
      1,
    );
    assert.equal(
      (await call(path, tokens.principal, { studentIds: ["user-student"] }))
        .data.created,
      0,
    );
    const charge = (await store.all("feeCharges"))[0];
    const concession = await call(
      prefix + `/fee-charges/${charge.id}/concessions`,
      tokens.principal,
      {
        amountMinor: 1001,
        reason: "Approved scholarship",
        requestKey: randomUUID(),
      },
    );
    assert.equal(concession.status, 200);
    const paymentBody = {
      amountMinor: 4000,
      paidOn: "2026-10-09",
      method: "bank",
      reference: "SYNTHETIC-ONLY",
      requestKey: randomUUID(),
    };
    const payPath = prefix + `/fee-charges/${charge.id}/payments`;
    const payments = await Promise.all([
      call(payPath, tokens.principal, paymentBody),
      call(payPath, tokens.principal, paymentBody),
    ]);
    assert.ok(payments.every((p) => p.status === 200));
    assert.equal(payments[0].data.id, payments[1].data.id);
    assert.equal((await store.all("feePayments")).length, 1);
    assert.equal(
      (
        await call(payPath, tokens.principal, {
          ...paymentBody,
          amountMinor: 1,
        })
      ).status,
      409,
    );
    let ledger = await call(prefix + "/fees", tokens.student);
    assert.equal(ledger.data.charges[0].outstandingMinor, 5000);
    assert.equal(ledger.data.schedules.length, 0);
    assert.equal(
      (
        await call(payPath, tokens.principal, {
          ...paymentBody,
          amountMinor: 5001,
          requestKey: randomUUID(),
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await call(payPath, tokens.principal, {
          ...paymentBody,
          reference: "",
          requestKey: randomUUID(),
        })
      ).status,
      400,
    );
    const overpay = await Promise.all([
      call(payPath, tokens.principal, {
        ...paymentBody,
        amountMinor: 5000,
        requestKey: randomUUID(),
      }),
      call(payPath, tokens.principal, {
        ...paymentBody,
        amountMinor: 5000,
        requestKey: randomUUID(),
      }),
    ]);
    assert.deepEqual(overpay.map((p) => p.status).sort(), [200, 409]);
    const receiptPath = prefix + `/fee-payments/${payments[0].data.id}/receipt`;
    const receipt = await call(receiptPath, tokens.student);
    assert.equal(receipt.status, 200);
    assert.ok(receipt.data.html.includes(payments[0].data.receiptNumber));
    assert.equal(
      (
        await call(
          `/schools/school-west/fee-payments/${payments[0].data.id}/receipt`,
          tokens.director,
        )
      ).status,
      404,
    );
    const user = (await store.all("users")).find(
      (u) => u.id === "user-student",
    );
    await store.put("users", {
      ...user,
      id: "other-student",
      email: "other@fixture.local",
    });
    const otherToken = (
      await call("/auth/login", null, {
        email: "other@fixture.local",
        password: "OrbitDemo123!",
      })
    ).data.token;
    assert.equal(
      (await call(prefix + "/fees", otherToken)).data.charges.length,
      0,
    );
    assert.equal((await call(receiptPath, otherToken)).status, 404);
    assert.equal(
      (
        await call(
          prefix + `/fee-payments/${payments[0].data.id}/void`,
          tokens.student,
          { reason: "Try modifying ledger" },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await call(
          prefix + `/fee-payments/${payments[0].data.id}/void`,
          tokens.principal,
          { reason: "Duplicate manual entry" },
        )
      ).status,
      200,
    );
    assert.ok(
      (await call(receiptPath, tokens.student)).data.html.includes("VOIDED"),
    );
    assert.equal(
      (
        await call(
          prefix + `/fee-payments/${payments[0].data.id}/void`,
          tokens.principal,
          { reason: "Repeated void attempt" },
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await call(
          prefix + `/fee-concessions/${concession.data.id}/void`,
          tokens.principal,
          { reason: "Scholarship withdrawn" },
        )
      ).status,
      200,
    );
    ledger = await call(prefix + "/fees", tokens.student);
    assert.equal(ledger.data.charges[0].outstandingMinor, 5001);
    const escapedPayment = await call(payPath, tokens.principal, {
      ...paymentBody,
      amountMinor: 1,
      reference: "<script>alert('fixture')</script>",
      requestKey: randomUUID(),
    });
    const escapedReceipt = await call(
      prefix + `/fee-payments/${escapedPayment.data.id}/receipt`,
      tokens.student,
    );
    assert.equal(escapedReceipt.status, 200);
    assert.ok(!escapedReceipt.data.html.includes("<script>"));
    assert.ok(escapedReceipt.data.html.includes("&lt;script&gt;"));
    const support = (
      await call("/platform/support", tokens.owner, {
        userId: "user-principal",
        reason: "Reproduce fee ledger issue",
        acknowledge: true,
      })
    ).data.token;
    assert.equal(
      (
        await call(payPath, support, {
          ...paymentBody,
          requestKey: randomUUID(),
        })
      ).status,
      403,
    );
    assert.ok(
      (await store.all("audit")).some(
        (a) => a.action === "fee.payments-voided",
      ),
    );
  } finally {
    await new Promise((r) => server.close(r));
    await store.close();
  }
});
