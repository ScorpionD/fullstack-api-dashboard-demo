import { useState } from "react";
import {
  ArrowUpRight,
  Users,
  ShoppingBag,
  Wallet,
  Clock3,
  Activity,
  ArrowRight,
  ClipboardList,
  Bug,
} from "lucide-react";
import { useResource } from "../hooks/useResource";
import type {
  Overview as OverviewData,
  View,
  Role,
  Audit,
  List,
} from "../types";
import { Loading, ErrorPanel, Badge, Empty, currency, date } from "./ui";
function RecentActivity({ navigate }: { navigate: (v: View) => void }) {
  const [revision, setRevision] = useState(0);
  const { data, loading, error } = useResource<List<Audit>>(
    "/audit?page=1&pageSize=3",
    revision,
  );
  return (
    <section className="panel recent-activity">
      <div className="panel-title">
        <div>
          <h2>Recent changes</h2>
          <p>Who changed what, recorded with every saved operation.</p>
        </div>
        <button className="text-button" onClick={() => navigate("audit")}>
          Audit log <ArrowRight size={16} />
        </button>
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorPanel message={error} retry={() => setRevision((v) => v + 1)} />
      ) : !data?.data.length ? (
        <div className="activity-empty">
          <ClipboardList size={22} />
          <p>
            <strong>Your next change starts the trail.</strong> Create or update
            a record to see its actor, action and timestamp here.
          </p>
          <button
            className="button secondary"
            onClick={() => navigate("customers")}
          >
            Try customer CRUD
          </button>
        </div>
      ) : (
        <div className="activity-summary">
          {data.data.map((item) => (
            <div key={item.id}>
              <span className={"action-label " + item.action}>
                {item.action}
              </span>
              <p>
                <strong>{item.summary}</strong>
                <small>
                  {item.actor} · {date(item.created_at)}
                </small>
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
export function Overview({
  navigate,
  role,
}: {
  navigate: (v: View) => void;
  role: Role;
}) {
  const [revision, setRevision] = useState(0);
  const { data, loading, error } = useResource<OverviewData>(
    "/overview",
    revision,
  );
  if (loading) return <Loading />;
  if (error || !data)
    return (
      <ErrorPanel
        message={error || "No data"}
        retry={() => setRevision((v) => v + 1)}
      />
    );
  const max = Math.max(...data.trend.map((t) => t.totalCents), 1);
  const points = data.trend
    .map(
      (t, i) =>
        `${(i * 600) / (data.trend.length - 1)},${150 - (t.totalCents / max) * 125}`,
    )
    .join(" ");
  return (
    <>
      <div className="section-header">
        <div>
          <span className="eyebrow">THE BIG PICTURE</span>
          <h1>
            Operations overview<span className="heading-dot">.</span>
          </h1>
          <p>
            Customers, orders and completed revenue — one workspace for your
            operations team.
          </p>
        </div>
        <button className="button secondary" onClick={() => navigate("orders")}>
          View orders
          <ArrowUpRight size={17} />
        </button>
      </div>
      <div className="stats-grid">
        {[
          {
            label: "Completed order revenue",
            value: currency(data.revenueCents),
            detail: "EUR · completed orders",
            icon: Wallet,
          },
          {
            label: "Total customers",
            value: data.customers,
            detail: "In your workspace",
            icon: Users,
          },
          {
            label: "Total orders",
            value: data.orders,
            detail: "Across all statuses",
            icon: ShoppingBag,
          },
          {
            label: "Open orders",
            value: data.openOrders,
            detail: "Pending + processing",
            icon: Clock3,
          },
        ].map((s, i) => (
          <div className={"stat-card stat-" + i} key={s.label}>
            <div className="stat-top">
              <span>{s.label}</span>
              <s.icon size={19} />
            </div>
            <strong>{s.value}</strong>
            <small>{s.detail}</small>
          </div>
        ))}
      </div>
      <div className="overview-charts">
        <div className="panel chart-panel">
          <div className="panel-title">
            <div>
              <h2>Completed revenue over time</h2>
              <p>Completed orders · last 28 days</p>
            </div>
            <span className="small-chip">EUR</span>
          </div>
          <div className="chart">
            <div className="chart-grid">
              <span>{currency(max)}</span>
              <span>{currency(max / 2)}</span>
              <span>€0</span>
            </div>
            <svg
              role="img"
              aria-label="Daily revenue from completed orders over the past 28 days"
              viewBox="0 0 600 165"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop stopColor="#788ef5" stopOpacity=".25" />
                  <stop offset="1" stopColor="#788ef5" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={`M0,165 L${points.replaceAll(" ", " L")} L600,165 Z`}
                fill="url(#chart-fill)"
              />
              <polyline
                points={points}
                fill="none"
                stroke="#6578d9"
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
          <div className="chart-labels">
            <span>{data.trend[0]?.label}</span>
            <span>{data.trend[13]?.label}</span>
            <span>{data.trend[27]?.label}</span>
          </div>
        </div>
        <div className="panel pipeline-panel">
          <div className="panel-title">
            <div>
              <h2>Orders by status</h2>
              <p>Completed work and what still needs attention</p>
            </div>
            <Activity size={20} />
          </div>
          <div className="pipeline-total">
            <strong>{data.orders}</strong>
            <span>total orders</span>
          </div>
          <div className="segmented-bar">
            {["completed", "processing", "pending", "cancelled"]
              .map((status) => ({
                status,
                count:
                  data.statuses.find((s) => s.status === status)?.count || 0,
              }))
              .filter((s) => s.count > 0)
              .map((s) => (
                <span
                  key={s.status}
                  className={s.status}
                  style={{ flex: s.count }}
                  title={`${s.status}: ${s.count}`}
                />
              ))}
          </div>
          <div className="pipeline-list">
            {["completed", "processing", "pending", "cancelled"].map(
              (status) => (
                <div key={status}>
                  <span>
                    <i className={status} />
                    {status[0].toUpperCase() + status.slice(1)}
                  </span>
                  <strong>
                    {data.statuses.find((s) => s.status === status)?.count || 0}
                  </strong>
                </div>
              ),
            )}
          </div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-title">
          <div>
            <h2>Recent orders</h2>
            <p>The latest activity in your workspace</p>
          </div>
          <button className="text-button" onClick={() => navigate("orders")}>
            All orders
            <ArrowRight size={16} />
          </button>
        </div>
        {!data.recentOrders.length ? (
          <Empty
            title="No orders yet"
            text="New orders will appear here as your workspace grows."
          />
        ) : (
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Recent orders table"
          >
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <strong>{o.reference}</strong>
                      <small>{o.description}</small>
                    </td>
                    <td>{o.customerName}</td>
                    <td className="money">{currency(o.amountCents)}</td>
                    <td>
                      <Badge value={o.status} />
                    </td>
                    <td className="muted">{date(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="bottom-note">
        <span>
          <span className="green-dot" />
          Live PostgreSQL data
        </span>
        <span>Isolated demo workspace · fictional records</span>
      </div>
      {role === "admin" && <RecentActivity navigate={navigate} />}
      <section className="engineering-teaser">
        <div>
          <span className="eyebrow">BUILT TO BE INSPECTED</span>
          <h2>More than a dashboard.</h2>
          <p>
            Follow five real debugging exercises in Git history, then explore
            the architecture behind the workflow.
          </p>
        </div>
        <div className="teaser-actions">
          <button
            className="button primary"
            onClick={() => navigate("debugging")}
          >
            <Bug size={16} />
            Explore 5 fixes
          </button>
          <button
            className="button secondary"
            onClick={() => navigate("architecture")}
          >
            Architecture & features <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </>
  );
}
