import { useState } from "react";
import { ShieldCheck, Plus, Pencil, Trash2 } from "lucide-react";
import { useResource } from "../hooks/useResource";
import type { Audit, List } from "../types";
import { Empty, Loading, ErrorPanel, Pagination } from "./ui";
export function AuditLog() {
  const [page, setPage] = useState(1),
    [revision, setRevision] = useState(0);
  const { data, loading, error } = useResource<List<Audit>>(
    "/audit?page=" + page + "&pageSize=10",
    revision,
  );
  return (
    <>
      <div className="section-header">
        <div>
          <span className="eyebrow">ACCOUNTABILITY BY DEFAULT</span>
          <h1>
            Audit log<span className="heading-dot">.</span>
          </h1>
          <p>
            A traceable record of every create, update and delete in your
            workspace.
          </p>
        </div>
        <span className="small-chip">
          <ShieldCheck size={14} />
          Admin access
        </span>
      </div>
      <div className="panel">
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorPanel message={error} retry={() => setRevision((v) => v + 1)} />
        ) : !data?.data.length ? (
          <Empty
            title="Your workspace starts with a clean slate"
            text="Create, edit or delete a customer or order to see the audit trail here."
          />
        ) : (
          <div className="audit-list">
            {data.data.map((a) => {
              const Icon =
                a.action === "create"
                  ? Plus
                  : a.action === "update"
                    ? Pencil
                    : Trash2;
              return (
                <div className="audit-row" key={a.id}>
                  <span className={"audit-icon " + a.action}>
                    <Icon size={17} />
                  </span>
                  <div>
                    <strong>{a.summary}</strong>
                    <small>
                      {a.actor} · {a.entity}
                    </small>
                  </div>
                  <time>
                    {new Date(a.created_at).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
              );
            })}
          </div>
        )}
        {data && <Pagination meta={data.meta} onPage={setPage} />}
      </div>
      <p className="footnote">
        Record changes and their audit entry are committed in one database
        transaction. The API does not expose an audit edit or delete operation.
      </p>
    </>
  );
}
