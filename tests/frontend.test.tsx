// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { useResource } from "../src/hooks/useResource";
import { Records } from "../src/components/Records";
import { moneyToCents } from "../src/services/api";
import { Pagination } from "../src/components/ui";
import App from "../src/App";
import { RecordEditor } from "../src/components/RecordEditor";
import { IntegrationLab } from "../src/components/IntegrationLab";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function Harness({
  revision = 0,
  path = "/customers",
}: {
  revision?: number;
  path?: string;
}) {
  const s = useResource<{ value: string }>(path, revision);
  return (
    <div>
      {s.loading ? "Loading" : s.error ? "Error: " + s.error : s.data?.value}
    </div>
  );
}
describe("Regression 03 — loading and error recovery", () => {
  it("finishes loading on failure and supports a successful retry", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error("Offline"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ value: "Recovered" })),
      );
    vi.stubGlobal("fetch", fetcher);
    const { rerender } = render(<Harness />);
    expect(screen.getByText("Loading")).toBeInTheDocument();
    await screen.findByText("Error: Offline");
    rerender(<Harness revision={1} />);
    await screen.findByText("Recovered");
    expect(screen.queryByText("Loading")).not.toBeInTheDocument();
  });
  it("prevents a stale response from replacing a newer filter", async () => {
    let oldResolve: (r: Response) => void = () => {};
    const fetcher = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((r) => {
            oldResolve = r;
          }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ value: "Current" })),
      );
    vi.stubGlobal("fetch", fetcher);
    const { rerender } = render(<Harness path="/old" />);
    rerender(<Harness path="/new" />);
    await screen.findByText("Current");
    await act(async () =>
      oldResolve(new Response(JSON.stringify({ value: "Stale" }))),
    );
    expect(screen.queryByText("Stale")).not.toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
  });
});
it("converts form amounts to cents without floating point drift", () => {
  expect(moneyToCents("1234.56")).toBe(123456);
  expect(moneyToCents("0.29")).toBe(29);
  expect(() => moneyToCents("12.345")).toThrow();
  expect(() => moneyToCents("-1")).toThrow();
});
it("disables pagination beyond the first and last page", () => {
  render(
    <Pagination
      meta={{ page: 1, pages: 1, total: 3, pageSize: 8 }}
      onPage={vi.fn()}
    />,
  );
  expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
});
it("resets a later page when a customer filter changes", async () => {
  const fetcher = vi.fn().mockImplementation(
    async () =>
      new Response(
        JSON.stringify({
          data: [
            {
              id: "1",
              name: "Alex Morgan",
              email: "alex@example.com",
              company: "Acme",
              status: "active",
              createdAt: "2026-09-11",
            },
          ],
          meta: { page: 1, pages: 3, total: 24, pageSize: 8 },
        }),
      ),
  );
  vi.stubGlobal("fetch", fetcher);
  render(<Records kind="customers" role="admin" notify={vi.fn()} />);
  await screen.findByText("Alex Morgan");
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  await waitFor(() =>
    expect(String(fetcher.mock.calls.at(-1)?.[0])).toContain("page=2"),
  );
  fireEvent.change(screen.getByRole("combobox", { name: "Filter status" }), {
    target: { value: "inactive" },
  });
  await waitFor(() =>
    expect(String(fetcher.mock.calls.at(-1)?.[0])).toContain(
      "status=inactive&page=1",
    ),
  );
});
it("shows an empty result and read-only permissions for viewers", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [],
          meta: { page: 1, pages: 1, total: 0, pageSize: 8 },
        }),
      ),
    ),
  );
  render(<Records kind="customers" role="user" notify={vi.fn()} />);
  await screen.findByText("No matching records");
  expect(screen.getByRole("button", { name: "New customer" })).toBeDisabled();
  expect(screen.getByText(/Viewer access/)).toBeInTheDocument();
});

describe("Portfolio workflow recovery", () => {
  const json = (body: unknown) => new Response(JSON.stringify(body));
  it("prefills the selected viewer account and recovers from failed sign-in", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "Sign in" } }), {
          status: 401,
        }),
      )
      .mockRejectedValueOnce(new Error("Temporarily offline"));
    vi.stubGlobal("fetch", fetcher);
    render(<App />);
    fireEvent.click(
      await screen.findByRole("button", { name: /Viewer Read-only access/ }),
    );
    expect(screen.getByLabelText("Email address")).toHaveValue(
      "viewer@atlas.demo",
    );
    expect(
      screen.getByRole("button", { name: /Viewer Read-only access/ }),
    ).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Enter workspace" }));
    await screen.findByText("Temporarily offline");
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({
      email: "viewer@atlas.demo",
      password: "DemoViewer2026!",
    });
    expect(
      screen.getByRole("button", { name: "Enter workspace" }),
    ).toBeEnabled();
  });
  it("clears search and status together after an empty result", async () => {
    const fetcher = vi
      .fn()
      .mockImplementation(async () =>
        json({ data: [], meta: { page: 1, pages: 1, total: 0, pageSize: 8 } }),
      );
    vi.stubGlobal("fetch", fetcher);
    render(<Records kind="customers" role="admin" notify={vi.fn()} />);
    await screen.findByText("No matching records");
    fireEvent.change(screen.getByRole("combobox", { name: "Filter status" }), {
      target: { value: "inactive" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "Search customers" }),
      { target: { value: "no-match" } },
    );
    await waitFor(() =>
      expect(String(fetcher.mock.calls.at(-1)?.[0])).toContain(
        "search=no-match",
      ),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Clear filters" }),
    );
    await waitFor(() =>
      expect(String(fetcher.mock.calls.at(-1)?.[0])).toBe(
        "/api/customers?search=&status=all&page=1&pageSize=8",
      ),
    );
    expect(
      screen.getByRole("textbox", { name: "Search customers" }),
    ).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Filter status" })).toHaveValue(
      "all",
    );
  });
  it("retries customer options without losing an unfinished order", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error("Offline"))
      .mockResolvedValueOnce(
        json({
          data: [
            { id: "customer-1", name: "Taylor Reed", company: "Northline" },
          ],
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    render(<RecordEditor kind="orders" onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Integration review" },
    });
    fireEvent.change(screen.getByLabelText("Amount (EUR)"), {
      target: { value: "1250.50" },
    });
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    await screen.findByRole("option", { name: "Taylor Reed · Northline" });
    expect(screen.getByLabelText("Description")).toHaveValue(
      "Integration review",
    );
    expect(screen.getByLabelText("Amount (EUR)")).toHaveValue("1250.50");
    expect(screen.getByRole("button", { name: "Create record" })).toBeEnabled();
  });
  it("does not request order-only options in a customer editor", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    render(
      <RecordEditor kind="customers" onClose={vi.fn()} onSaved={vi.fn()} />,
    );
    expect(screen.getByLabelText("Full name")).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not present a previous response as current after an API error and retries the chosen scenario", async () => {
    const verified = {
      base: "EUR",
      date: "2026-09-11",
      fetchedAt: "2026-09-11T10:00:00Z",
      rates: { USD: 1.17, GBP: 0.87 },
      status: "live",
      source: "Frankfurter",
      scenario: "live",
      processingMs: 230,
    };
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json(verified))
      .mockRejectedValueOnce(new Error("Connection interrupted"))
      .mockResolvedValueOnce(
        json({
          ...verified,
          status: "fallback",
          scenario: "timeout",
          reason: "Provider timed out",
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    render(<IntegrationLab />);
    fireEvent.click(screen.getByRole("button", { name: /Normal response/ }));
    await screen.findByText("Verified live response");
    fireEvent.click(screen.getByRole("button", { name: /Simulate a timeout/ }));
    await screen.findByText("Connection interrupted");
    expect(
      screen.queryByText("Verified live response"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("1.1700")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByText("Fallback: last verified rates");
    expect(String(fetcher.mock.calls.at(-1)?.[0])).toBe(
      "/api/integrations/rates?scenario=timeout",
    );
    expect(
      screen.getByText(/not a fresh provider response/),
    ).toBeInTheDocument();
  });
});
