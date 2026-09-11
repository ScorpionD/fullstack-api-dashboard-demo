import { z } from "zod";
const payload = z.object({
  base: z.literal("EUR"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rates: z.object({
    USD: z.number().positive().max(100),
    GBP: z.number().positive().max(100),
  }),
});
export function createRatesAdapter(fetcher = fetch) {
  let cached = null;
  let inflight = null;
  const fetchRates = async () => {
    let last;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetcher(
          "https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD,GBP",
          { signal: AbortSignal.timeout(1800) },
        );
        if (!res.ok) throw new Error("HTTP_ERROR");
        const raw = await res.text();
        if (raw.length > 10000) throw new Error("INVALID_RESPONSE");
        const parsed = payload.safeParse(JSON.parse(raw));
        if (!parsed.success) throw new Error("INVALID_RESPONSE");
        cached = { ...parsed.data, fetchedAt: new Date().toISOString() };
        return cached;
      } catch (e) {
        last = e;
        if (e.message === "INVALID_RESPONSE" || e instanceof SyntaxError) break;
      }
    }
    throw last;
  };
  return async (scenario = "live") => {
    const start = performance.now();
    try {
      if (scenario === "timeout") {
        await new Promise((r) => setTimeout(r, 120));
        throw new Error("TIMEOUT");
      }
      if (scenario === "bad-response") throw new Error("INVALID_RESPONSE");
      if (cached && Date.now() - Date.parse(cached.fetchedAt) < 15 * 60 * 1000)
        return {
          ...cached,
          status: "cached",
          source: "Frankfurter",
          scenario,
          processingMs: Math.round(performance.now() - start),
        };
      if (!inflight)
        inflight = fetchRates().finally(() => {
          inflight = null;
        });
      const data = await inflight;
      return {
        ...data,
        status: "live",
        source: "Frankfurter",
        scenario,
        processingMs: Math.round(performance.now() - start),
      };
    } catch (e) {
      return {
        ...(cached || {
          base: "EUR",
          date: null,
          rates: null,
          fetchedAt: null,
        }),
        status: cached ? "fallback" : "unavailable",
        source: "Frankfurter",
        scenario,
        reason:
          scenario === "timeout" || e.name === "TimeoutError"
            ? "Provider timed out"
            : "Provider response could not be verified",
        processingMs: Math.round(performance.now() - start),
      };
    }
  };
}
