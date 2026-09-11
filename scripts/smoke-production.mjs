// Public demo only: creates its own disposable workspace, never uses infrastructure secrets.
import assert from "node:assert/strict";
const origin = "https://fullstack-api-dashboard-demo.pages.dev";
let cookie = "",
  csrf = "",
  checks = 0;
async function request(
  path,
  { method = "GET", body, expected = 200, headers = {} } = {},
) {
  const res = await fetch(origin + "/api" + path, {
    method,
    signal: AbortSignal.timeout(20000),
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      Cookie: cookie,
      "X-CSRF-Token": csrf,
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  assert.equal(res.status, expected, method + " " + path + " HTTP status");
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  return { data, res };
}
function pass(label) {
  checks++;
  console.log("PASS " + label);
}
async function login(email, password) {
  cookie = "";
  csrf = "";
  const r = await request("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  const setCookie = r.res.headers.get("set-cookie");
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Secure/i);
  assert.match(setCookie, /SameSite=Strict/i);
  cookie = setCookie.split(";")[0];
  csrf = r.data.csrfToken;
  return r.data;
}
try {
  assert.equal((await request("/health")).data.database, "connected");
  pass("Public gateway and PostgreSQL readiness");
  await request("/customers", { expected: 401 });
  pass("Anonymous access rejected");
  const admin = await login("admin@atlas.demo", "DemoAdmin2026!");
  assert.equal(admin.user.role, "admin");
  pass("Admin login and protected session cookie");
  assert.equal(
    (await request("/auth/session")).data.workspaceId,
    admin.workspaceId,
  );
  pass("Session restoration");
  const baseCustomer = {
    name: "Smoke Test",
    email: "smoke@example.com",
    company: "Verification Studio",
    status: "active",
  };
  await request("/customers", {
    method: "POST",
    body: baseCustomer,
    headers: { Origin: "https://example.com" },
    expected: 403,
  });
  await request("/customers", {
    method: "POST",
    body: baseCustomer,
    headers: { "X-CSRF-Token": "" },
    expected: 403,
  });
  pass("Origin and CSRF checks");
  await request("/customers", {
    method: "POST",
    body: { ...baseCustomer, company: "x".repeat(17000) },
    expected: 413,
  });
  pass("Request size protection");
  const customer = (
    await request("/customers", {
      method: "POST",
      body: baseCustomer,
      expected: 201,
    })
  ).data.data;
  await request("/customers", {
    method: "POST",
    body: baseCustomer,
    expected: 409,
  });
  await request("/customers/" + customer.id, {
    method: "PUT",
    body: { ...baseCustomer, company: "Updated Studio" },
  });
  const search = (await request("/customers?search=Updated%20Studio&page=9"))
    .data;
  assert.equal(search.meta.total, 1);
  assert.equal(search.meta.page, 1);
  assert.equal(search.data[0].id, customer.id);
  pass("Customer create/update, duplicate check, filtered pagination");
  const orderBody = {
    customerId: customer.id,
    description: "Live API verification",
    amountCents: 123456,
    status: "pending",
  };
  await request("/orders", {
    method: "POST",
    body: { ...orderBody, amountCents: -50 },
    expected: 400,
  });
  const order = (
    await request("/orders", { method: "POST", body: orderBody, expected: 201 })
  ).data.data;
  assert.equal(order.customerName, baseCustomer.name);
  assert.equal(order.amountCents, 123456);
  const updated = (
    await request("/orders/" + order.id, {
      method: "PUT",
      body: { ...orderBody, status: "completed" },
    })
  ).data.data;
  assert.equal(updated.customerName, baseCustomer.name);
  assert.equal(updated.status, "completed");
  const orders = (await request("/orders?search=" + order.reference)).data;
  assert.equal(orders.data[0].amountCents, 123456);
  pass("Order create/update, monetary validation and consistent mapping");
  await request("/customers/" + customer.id, {
    method: "DELETE",
    expected: 409,
  });
  await request("/orders/" + order.id, { method: "DELETE", expected: 204 });
  await request("/customers/" + customer.id, {
    method: "DELETE",
    expected: 204,
  });
  assert.equal((await request("/audit")).data.meta.total, 6);
  pass("Referential protection, deletes and six matching audit events");
  const live = (await request("/integrations/rates?scenario=live")).data;
  assert.ok(
    ["live", "cached"].includes(live.status),
    "Real provider must return verified rates for this check",
  );
  assert.ok(live.rates.USD > 0);
  pass("Real Frankfurter REST API: " + live.status);
  for (const scenario of ["timeout", "bad-response"]) {
    const r = (await request("/integrations/rates?scenario=" + scenario)).data;
    assert.equal(r.status, "fallback");
    assert.deepEqual(r.rates, live.rates);
    pass("Verified fallback for simulated " + scenario);
  }
  const oldCookie = cookie;
  await request("/auth/logout", { method: "POST", expected: 204 });
  await request("/auth/session", { expected: 401 });
  pass("Logout invalidates session");
  const viewer = await login("viewer@atlas.demo", "DemoViewer2026!");
  assert.equal(viewer.user.role, "user");
  assert.notEqual(viewer.workspaceId, admin.workspaceId);
  assert.equal((await request("/customers")).data.meta.total, 24);
  await request("/customers", {
    method: "POST",
    body: baseCustomer,
    expected: 403,
  });
  await request("/audit", { expected: 403 });
  pass("Viewer read-only role and fresh isolated workspace");
  await request("/auth/logout", { method: "POST", expected: 204 });
  cookie = oldCookie;
  console.log(
    `Completed ${checks} live check groups. Session tokens were never logged.`,
  );
} catch (error) {
  console.error("Live verification failed:", error.message);
  process.exitCode = 1;
}
