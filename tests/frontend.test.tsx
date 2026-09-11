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
  const fetcher = vi
    .fn()
    .mockImplementation(
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
    vi
      .fn()
      .mockResolvedValue(
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
