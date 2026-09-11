import { describe, it, expect, vi } from "vitest";
import {
  orderSchema,
  customerSchema,
  listSchema,
  mapOrder,
  pageMeta,
  escapeLike,
} from "../shared/contracts.mjs";
import {
  validSession,
  passwordHash,
  passwordMatches,
  secretEqual,
} from "../server/security.mjs";
import { createRatesAdapter } from "../server/rates.mjs";
it("rejects malformed UTF-8 secret comparisons without throwing", () => {
  expect(secretEqual("é", "a")).toBe(false);
  expect(secretEqual(undefined, "expected")).toBe(false);
  expect(secretEqual("exact", "exact")).toBe(true);
});
const order = {
  customerId: "e8d5a900-644f-4c69-8e61-168124c0c034",
  description: "API integration",
  amountCents: 123456,
  status: "pending",
};
describe("Regression 01 — API mapping", () => {
  it("maps joined metadata and integer cents without rescaling", () => {
    expect(
      mapOrder({
        id: "order-1",
        customer_id: "customer-1",
        customer_name: "Alex",
        company: "Acme",
        amount_cents: 123456,
        reference: "AT-100",
        description: "API",
        status: "pending",
        created_at: "2026-09-11",
      }),
    ).toMatchObject({
      customerId: "customer-1",
      customerName: "Alex",
      amountCents: 123456,
    });
  });
});
describe("Regression 02 — session expiry", () => {
  it("rejects expired sessions instead of accepting any existing row", () => {
    expect(
      validSession({ expires_at: "2026-01-01" }, Date.parse("2026-09-11")),
    ).toBe(false);
    expect(
      validSession({ expires_at: "2027-01-01" }, Date.parse("2026-09-11")),
    ).toBe(true);
    expect(validSession(null)).toBe(false);
  });
  it("hashes passwords with unique salts and verifies them", async () => {
    const h = await passwordHash("sample-password");
    expect(h).not.toContain("sample-password");
    expect(await passwordMatches("sample-password", h)).toBe(true);
    expect(await passwordMatches("wrong", h)).toBe(false);
  });
});
describe("Regression 04 — bounded pagination", () => {
  it("clamps a later page after a restrictive filter", () => {
    expect(pageMeta(3, 8, 8)).toEqual({
      total: 3,
      page: 1,
      pageSize: 8,
      pages: 1,
    });
  });
  it("keeps empty pagination usable", () =>
    expect(pageMeta(0, 3, 8).page).toBe(1));
  it("rejects invalid query bounds", () => {
    expect(listSchema.safeParse({ page: -1 }).success).toBe(false);
    expect(listSchema.safeParse({ pageSize: 1000 }).success).toBe(false);
  });
  it("treats SQL wildcard input as literal search text", () =>
    expect(escapeLike("100%_")).toBe("100\\%\\_"));
});
describe("Regression 05 — monetary validation", () => {
  it.each([0, -100, 1.2, 100000001, "12", NaN])(
    "rejects invalid cents: %s",
    (value) => {
      expect(
        orderSchema.safeParse({ ...order, amountCents: value }).success,
      ).toBe(false);
    },
  );
  it("accepts bounded integer cents and rejects unknown properties", () => {
    expect(orderSchema.safeParse(order).success).toBe(true);
    expect(
      orderSchema.safeParse({ ...order, workspaceId: "forged" }).success,
    ).toBe(false);
  });
  it("normalizes customer email and rejects blank names", () => {
    expect(
      customerSchema.parse({
        name: " Alex ",
        email: "alex@EXAMPLE.COM",
        company: "Demo",
        status: "active",
      }).email,
    ).toBe("alex@example.com");
    expect(
      customerSchema.safeParse({
        name: " ",
        email: "x",
        company: "x",
        status: "active",
      }).success,
    ).toBe(false);
  });
});
describe("External API reliability", () => {
  const response = {
    base: "EUR",
    date: "2026-09-10",
    rates: { USD: 1.17, GBP: 0.86 },
  };
  it("validates live rates, caches them and retains verified values on timeout", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(response)));
    const rates = createRatesAdapter(fetcher);
    expect((await rates()).status).toBe("live");
    expect((await rates()).status).toBe("cached");
    const fallback = await rates("timeout");
    expect(fallback.status).toBe("fallback");
    expect(fallback.rates).toEqual(response.rates);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("rejects invalid provider data and never invents fallback rates", async () => {
    const rates = createRatesAdapter(
      vi.fn().mockResolvedValue(new Response('{"rates":{"USD":"wrong"}}')),
    );
    const result = await rates();
    expect(result.status).toBe("unavailable");
    expect(result.rates).toBeNull();
  });
  it("bounds retries on upstream errors", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("network down"));
    expect((await createRatesAdapter(fetcher)()).status).toBe("unavailable");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
