import { useState, useCallback } from "react";
import { LoaderCircle } from "lucide-react";
import { api, moneyToCents } from "../services/api";
import { useResource } from "../hooks/useResource";
import { Modal, ErrorPanel } from "./ui";
import type { Customer, Order } from "../types";
export function RecordEditor({
  kind,
  record,
  onClose,
  onSaved,
}: {
  kind: "customers" | "orders";
  record?: Customer | Order;
  onClose: () => void;
  onSaved: () => void;
}) {
  const order = record as Order | undefined,
    customer = record as Customer | undefined;
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [optionsRevision, setOptionsRevision] = useState(0);
  const [form, setForm] = useState({
    name: customer?.name || "",
    email: customer?.email || "",
    company: customer?.company || "",
    customerId: order?.customerId || "",
    description: order?.description || "",
    amount: order?.amountCents ? String(order.amountCents / 100) : "",
    status: record?.status || (kind === "orders" ? "pending" : "active"),
  });
  const options = useResource<{
    data: { id: string; name: string; company: string }[];
  }>(kind === "orders" ? "/customer-options" : null, optionsRevision);
  const field = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));
  const close = useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body =
        kind === "customers"
          ? {
              name: form.name,
              email: form.email,
              company: form.company,
              status: form.status,
            }
          : {
              customerId: form.customerId,
              description: form.description,
              amountCents: moneyToCents(form.amount),
              status: form.status,
            };
      await api("/" + kind + (record ? "/" + record.id : ""), {
        method: record ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`${record ? "Edit" : "New"} ${kind === "customers" ? "customer" : "order"}`}
      onClose={close}
    >
      <form onSubmit={save}>
        <p className="muted">
          Changes apply only to your isolated demo workspace.
        </p>
        {kind === "customers" ? (
          <>
            <label>
              Full name
              <input
                required
                minLength={2}
                maxLength={80}
                value={form.name}
                onChange={(e) => field("name", e.target.value)}
                placeholder="Alex Morgan"
              />
            </label>
            <label>
              Email address
              <input
                required
                type="email"
                maxLength={160}
                value={form.email}
                onChange={(e) => field("email", e.target.value)}
                placeholder="alex@example.com"
              />
            </label>
            <label>
              Company
              <input
                required
                minLength={2}
                maxLength={100}
                value={form.company}
                onChange={(e) => field("company", e.target.value)}
                placeholder="Northstar Studio"
              />
            </label>
          </>
        ) : (
          <>
            <label>
              Customer
              <select
                required
                value={form.customerId}
                onChange={(e) => field("customerId", e.target.value)}
                disabled={options.loading || !!options.error}
              >
                <option value="">
                  {options.loading ? "Loading customers…" : "Select a customer"}
                </option>
                {options.data?.data.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.company}
                  </option>
                ))}
              </select>
            </label>
            {options.error && (
              <ErrorPanel
                message="Customer list unavailable. Retry without losing your form details."
                retry={() => setOptionsRevision((v) => v + 1)}
              />
            )}
            {!options.loading &&
              !options.error &&
              options.data?.data.length === 0 && (
                <p className="info-banner">
                  Add a customer first, then return here to create their order.
                </p>
              )}
            <label>
              Description
              <input
                required
                minLength={2}
                maxLength={120}
                value={form.description}
                onChange={(e) => field("description", e.target.value)}
                placeholder="API integration sprint"
              />
            </label>
            <label>
              Amount (EUR)
              <input
                required
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => field("amount", e.target.value)}
                placeholder="2400.00"
              />
            </label>
          </>
        )}
        <label>
          Status
          <select
            value={form.status}
            onChange={(e) => field("status", e.target.value)}
          >
            {(kind === "orders"
              ? ["pending", "processing", "completed", "cancelled"]
              : ["active", "inactive"]
            ).map((s) => (
              <option key={s} value={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p role="alert" className="inline-error">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button
            type="button"
            className="button secondary"
            onClick={close}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            className="button primary"
            disabled={
              busy ||
              (kind === "orders" &&
                (options.loading ||
                  !!options.error ||
                  !options.data?.data.length))
            }
          >
            {busy ? (
              <>
                <LoaderCircle size={16} className="spin" />
                Saving…
              </>
            ) : record ? (
              "Save changes"
            ) : (
              "Create record"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
