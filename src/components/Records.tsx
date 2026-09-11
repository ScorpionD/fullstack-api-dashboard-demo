import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Filter,
  LockKeyhole,
} from "lucide-react";
import type { Customer, Order, List, Role } from "../types";
import { useResource } from "../hooks/useResource";
import { api } from "../services/api";
import {
  Badge,
  Loading,
  Empty,
  ErrorPanel,
  Pagination,
  Modal,
  currency,
  date,
} from "./ui";
import { RecordEditor } from "./RecordEditor";
export function Records({
  kind,
  role,
  notify,
}: {
  kind: "customers" | "orders";
  role: Role;
  notify: (m: string) => void;
}) {
  const [search, setSearch] = useState(""),
    [query, setQuery] = useState({ search: "", status: "all", page: 1 }),
    [revision, setRevision] = useState(0),
    [editor, setEditor] = useState<{ record?: Customer | Order } | null>(null),
    [remove, setRemove] = useState<Customer | Order | null>(null),
    [busy, setBusy] = useState(false),
    [deleteError, setDeleteError] = useState("");
  useEffect(() => {
    if (search === query.search) return;
    const timer = setTimeout(
      () => setQuery((q) => ({ ...q, search, page: 1 })),
      250,
    );
    return () => clearTimeout(timer);
  }, [search]);
  const { data, loading, error } = useResource<List<Customer | Order>>(
    "/" +
      kind +
      "?" +
      new URLSearchParams({
        search: query.search,
        status: query.status,
        page: String(query.page),
        pageSize: "8",
      }),
    revision,
  );
  const closeEditor = useCallback(() => setEditor(null), []),
    closeDelete = useCallback(() => {
      if (!busy) setRemove(null);
    }, [busy]);
  const isOrders = kind === "orders";
  async function deleteRecord() {
    setBusy(true);
    setDeleteError("");
    try {
      await api("/" + kind + "/" + remove!.id, { method: "DELETE" });
      setRemove(null);
      setRevision((v) => v + 1);
      notify("Record deleted. Audit trail updated.");
    } catch (e) {
      setDeleteError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="section-header">
        <div>
          <span className="eyebrow">
            {isOrders ? "REVENUE OPERATIONS" : "YOUR BUSINESS NETWORK"}
          </span>
          <h1>{isOrders ? "Orders" : "Customers"}</h1>
          <p>
            {isOrders
              ? "Track every order from request to completion."
              : "Keep customer relationships organized and up to date."}
          </p>
        </div>
        <button
          className="button primary"
          disabled={role !== "admin"}
          onClick={() => setEditor({})}
        >
          {role === "admin" ? <Plus size={17} /> : <LockKeyhole size={17} />}New{" "}
          {isOrders ? "order" : "customer"}
        </button>
      </div>
      {role !== "admin" && (
        <div className="info-banner">
          <LockKeyhole size={15} />
          Viewer access · you can browse records. Create, edit and delete
          require an admin.
        </div>
      )}
      <div className="panel">
        <div className="table-toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              aria-label={`Search ${kind}`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isOrders
                  ? "Search order, customer or company…"
                  : "Search name, email or company…"
              }
            />
          </div>
          <label className="filter">
            <Filter size={15} />
            <span className="sr-only">Filter status</span>
            <select
              aria-label="Filter status"
              value={query.status}
              onChange={(e) =>
                setQuery((q) => ({ ...q, status: e.target.value, page: 1 }))
              }
            >
              {[
                "all",
                ...(isOrders
                  ? ["pending", "processing", "completed", "cancelled"]
                  : ["active", "inactive"]),
              ].map((s) => (
                <option key={s} value={s}>
                  {s === "all"
                    ? "All statuses"
                    : s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorPanel message={error} retry={() => setRevision((v) => v + 1)} />
        ) : !data?.data.length ? (
          <Empty title="No matching records" />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {(isOrders
                    ? [
                        "Order",
                        "Customer",
                        "Amount",
                        "Status",
                        "Created",
                        "Actions",
                      ]
                    : ["Customer", "Company", "Status", "Created", "Actions"]
                  ).map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.data.map((item) => (
                  <tr key={item.id}>
                    {isOrders ? (
                      <>
                        <td>
                          <strong>{(item as Order).reference}</strong>
                          <small>{(item as Order).description}</small>
                        </td>
                        <td>
                          <strong>{(item as Order).customerName}</strong>
                          <small>{(item as Order).company}</small>
                        </td>
                        <td className="money">
                          {currency((item as Order).amountCents)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <div className="person">
                            <span className="avatar">
                              {(item as Customer).name
                                .split(" ")
                                .map((x) => x[0])
                                .slice(0, 2)
                                .join("")}
                            </span>
                            <div>
                              <strong>{(item as Customer).name}</strong>
                              <small>{(item as Customer).email}</small>
                            </div>
                          </div>
                        </td>
                        <td>{(item as Customer).company}</td>
                      </>
                    )}
                    <td>
                      <Badge value={item.status} />
                    </td>
                    <td className="muted nowrap">{date(item.createdAt)}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          disabled={role !== "admin"}
                          aria-label={`Edit ${isOrders ? (item as Order).reference : (item as Customer).name}`}
                          onClick={() => setEditor({ record: item })}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          disabled={role !== "admin"}
                          aria-label={`Delete ${isOrders ? (item as Order).reference : (item as Customer).name}`}
                          onClick={() => {
                            setDeleteError("");
                            setRemove(item);
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && (
          <Pagination
            meta={data.meta}
            onPage={(page) => setQuery((q) => ({ ...q, page }))}
          />
        )}
      </div>
      {editor && (
        <RecordEditor
          kind={kind}
          record={editor.record}
          onClose={closeEditor}
          onSaved={() => {
            setEditor(null);
            setRevision((v) => v + 1);
            notify("Record saved. Audit trail updated.");
          }}
        />
      )}
      {remove && (
        <Modal title="Delete this record?" onClose={closeDelete}>
          <p>
            This removes{" "}
            <strong>
              {isOrders
                ? (remove as Order).reference
                : (remove as Customer).name}
            </strong>{" "}
            from your demo workspace. The action will be recorded in the audit
            log.
          </p>
          {deleteError && (
            <p className="inline-error" role="alert">
              {deleteError}
            </p>
          )}
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={closeDelete}
              disabled={busy}
            >
              Keep record
            </button>
            <button
              className="button danger"
              onClick={deleteRecord}
              disabled={busy}
            >
              {busy ? "Deleting…" : "Delete record"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
