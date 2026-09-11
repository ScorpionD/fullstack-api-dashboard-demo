import { useState, useEffect, useCallback } from "react";
import {
  Layers3,
  LayoutDashboard,
  Users,
  ShoppingBag,
  PlugZap,
  ClipboardList,
  Bug,
  ArrowUpRight,
  ArrowRight,
  LockKeyhole,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Database,
  Zap,
  LoaderCircle,
  Network,
} from "lucide-react";
import type { Session, View } from "./types";
import { api, setCsrf } from "./services/api";
import { Overview } from "./components/Overview";
import { Records } from "./components/Records";
import { IntegrationLab } from "./components/IntegrationLab";
import { AuditLog } from "./components/AuditLog";
import { Debugging } from "./components/Debugging";
import { ProjectDetails } from "./components/ProjectDetails";
import { Toast } from "./components/ui";
const nav = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "customers", label: "Customers", icon: Users },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "integrations", label: "Integration lab", icon: PlugZap },
  { id: "audit", label: "Audit log", icon: ClipboardList },
  { id: "debugging", label: "Debugging cases", icon: Bug },
  { id: "architecture", label: "Architecture", icon: Network },
] as const;
function Login({
  onLogin,
  notice,
}: {
  onLogin: (s: Session) => void;
  notice: string;
}) {
  const [email, setEmail] = useState("admin@atlas.demo"),
    [password, setPassword] = useState("DemoAdmin2026!"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      onLogin(
        await api<Session>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-story">
        <a className="brand" href="#">
          <span className="brand-mark">
            <Layers3 size={22} />
          </span>
          <span>
            atlas<span className="brand-small">OPERATIONS</span>
          </span>
        </a>
        <div className="login-story-content">
          <span className="eyebrow">FULL-STACK API / DEBUGGING DASHBOARD</span>
          <h1>
            Good operations.
            <br />
            <em>Great foundations.</em>
          </h1>
          <p>
            Customer and order management for service businesses and sales
            teams. Explore a complete workflow, from a new customer to an
            audited order.
          </p>
          <div className="demo-purpose">
            <strong>What this demo demonstrates</strong>
            <p>
              Full-stack operations dashboard demonstrating real-world React,
              Node.js, REST API, PostgreSQL, role-based access and debugging
              workflows.
            </p>
          </div>
          <div className="login-pillars">
            <div>
              <Database />
              <span>
                <strong>Real data, real workflows</strong>
                <small>Customers, orders and a PostgreSQL audit trail.</small>
              </span>
            </div>
            <div>
              <ShieldCheck />
              <span>
                <strong>Access with intention</strong>
                <small>
                  Admin and viewer roles. Server-enforced permissions.
                </small>
              </span>
            </div>
            <div>
              <Zap />
              <span>
                <strong>Reliability you can test</strong>
                <small>External API fallbacks and five documented fixes.</small>
              </span>
            </div>
          </div>
        </div>
        <div className="login-footer">
          REACT + TYPESCRIPT <span>→</span> NODE.JS + REST API <span>→</span>{" "}
          POSTGRESQL
        </div>
      </section>
      <section className="login-form-section">
        <div className="login-form-wrap">
          <span className="small-chip">
            <span className="green-dot" />
            Interactive live demo
          </span>
          <h2>Choose a role. Try the workflow.</h2>
          <p>
            No sign-up needed. Select a public demo account below; its
            credentials are already filled in.
          </p>
          <div
            className="role-picker"
            role="group"
            aria-label="Choose demo role"
          >
            <button
              type="button"
              aria-pressed={email === "admin@atlas.demo"}
              disabled={busy}
              className={email === "admin@atlas.demo" ? "selected" : ""}
              onClick={() => {
                setEmail("admin@atlas.demo");
                setPassword("DemoAdmin2026!");
              }}
            >
              <ShieldCheck size={19} /> Admin{" "}
              <small>Create, edit & delete</small>
            </button>
            <button
              type="button"
              aria-pressed={email === "viewer@atlas.demo"}
              disabled={busy}
              className={email === "viewer@atlas.demo" ? "selected" : ""}
              onClick={() => {
                setEmail("viewer@atlas.demo");
                setPassword("DemoViewer2026!");
              }}
            >
              <LockKeyhole size={19} /> Viewer <small>Read-only access</small>
            </button>
          </div>
          <p className="credential-note">
            Demo credentials are prefilled. Just select{" "}
            <strong>Enter workspace</strong>.
          </p>
          <form onSubmit={submit}>
            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
                maxLength={160}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                maxLength={128}
              />
            </label>
            {(error || notice) && (
              <p className="inline-error" role="alert">
                {error || notice}
              </p>
            )}
            <button className="button primary login-submit" disabled={busy}>
              {busy ? (
                <>
                  <LoaderCircle className="spin" size={17} />
                  Preparing your workspace…
                </>
              ) : (
                <>
                  Enter workspace
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          <div className="login-note">
            <LockKeyhole size={17} />
            <p>
              Public demo accounts · fictional data only.
              <br />
              Each login creates an isolated workspace. Records expire after 24
              hours; sessions last up to 8 hours.
            </p>
          </div>
          <a
            className="text-button"
            href="https://github.com/ScorpionD/fullstack-api-dashboard-demo"
            target="_blank"
            rel="noreferrer"
          >
            Explore the source code
            <ArrowUpRight size={15} />
          </a>
        </div>
        <span className="login-credit">
          Built as a portfolio demo to showcase production-style full-stack
          development, API integration and troubleshooting.
        </span>
      </section>
    </main>
  );
}
export default function App() {
  const [session, setSession] = useState<Session | null>(null),
    [boot, setBoot] = useState(true),
    [view, setView] = useState<View>("overview"),
    [mobile, setMobile] = useState(false),
    [toast, setToast] = useState(""),
    [notice, setNotice] = useState("");
  const clearToast = useCallback(() => setToast(""), []);
  useEffect(() => {
    api<Session>("/auth/session")
      .then((s) => {
        setCsrf(s.csrfToken);
        setSession(s);
      })
      .catch(() => {})
      .finally(() => setBoot(false));
    const expire = () => {
      setSession(null);
      setCsrf("");
      setNotice("Your session ended. Sign in to open a new workspace.");
    };
    window.addEventListener("atlas-session-expired", expire);
    return () => window.removeEventListener("atlas-session-expired", expire);
  }, []);
  const navigate = (next: View) => {
    setView(next);
    setMobile(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
      setCsrf("");
      setSession(null);
      setNotice("");
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  if (boot)
    return (
      <div className="boot">
        <Layers3 />
        <p>Opening Atlas Operations…</p>
      </div>
    );
  if (!session)
    return (
      <Login
        notice={notice}
        onLogin={(s) => {
          setCsrf(s.csrfToken);
          setSession(s);
          setNotice("");
          setView("overview");
        }}
      />
    );
  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={"sidebar " + (mobile ? "open" : "")}>
        <div className="sidebar-top">
          <a className="brand" href="#" onClick={() => navigate("overview")}>
            <span className="brand-mark">
              <Layers3 size={21} />
            </span>
            <span>
              atlas<span className="brand-small">OPERATIONS</span>
            </span>
          </a>
          <button
            className="mobile-close icon-button"
            aria-label="Close menu"
            onClick={() => setMobile(false)}
          >
            <X />
          </button>
        </div>
        <div className="workspace-switch">
          <span className="workspace-avatar">A</span>
          <span>
            Atlas workspace<small>Private demo sandbox</small>
          </span>
          <LockKeyhole size={13} />
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          {nav.map((item, i) => (
            <button
              key={item.id}
              className={
                (view === item.id ? "active " : "") +
                (i === 3 ? "nav-separated" : "")
              }
              onClick={() => navigate(item.id)}
              aria-current={view === item.id ? "page" : undefined}
              disabled={item.id === "audit" && session.user.role !== "admin"}
              title={
                item.id === "audit" && session.user.role !== "admin"
                  ? "Audit log requires admin access"
                  : undefined
              }
            >
              <item.icon size={18} />
              {item.label}
              {item.id === "debugging" && <span className="nav-count">5</span>}
              {item.id === "audit" && session.user.role !== "admin" && (
                <LockKeyhole size={12} />
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="stack-note">
            <span className="green-dot" />
            <strong>Built to be inspected.</strong>
            <p>
              Real APIs. Clear contracts.
              <br />
              Thoughtful failure handling.
            </p>
            <a
              href="https://github.com/ScorpionD/fullstack-api-dashboard-demo"
              target="_blank"
              rel="noreferrer"
            >
              View GitHub
              <ArrowUpRight size={14} />
            </a>
          </div>
          <div className="profile">
            <span className="profile-avatar">
              {session.user.name
                .split(" ")
                .map((s) => s[0])
                .join("")}
            </span>
            <span>
              {session.user.name}
              <small>
                {session.user.role === "admin" ? "Administrator" : "Viewer"}
              </small>
            </span>
            <button aria-label="Sign out" title="Sign out" onClick={logout}>
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div>
            <button
              className="mobile-toggle icon-button"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu />
            </button>
            <span className="breadcrumb">
              Workspace <span>/</span>{" "}
              <strong>{nav.find((n) => n.id === view)?.label}</strong>
            </span>
          </div>
          <div className="topbar-status">
            <span className="live-dot" />
            Live demo
            <span className="role-tag">
              {session.user.role === "admin" ? "Admin" : "Viewer"}
            </span>
          </div>
        </header>
        <main className="main-content" id="main">
          {view === "overview" ? (
            <Overview navigate={navigate} role={session.user.role} />
          ) : view === "customers" || view === "orders" ? (
            <Records
              key={view}
              kind={view}
              role={session.user.role}
              notify={setToast}
            />
          ) : view === "integrations" ? (
            <IntegrationLab />
          ) : view === "audit" ? (
            <AuditLog />
          ) : view === "debugging" ? (
            <Debugging />
          ) : (
            <ProjectDetails />
          )}
          <footer className="app-footer">
            <span>Atlas Operations · Full-Stack API Dashboard</span>
            <span>Fictional data. Real engineering.</span>
          </footer>
        </main>
      </div>
      {toast && <Toast message={toast} onClose={clearToast} />}
    </div>
  );
}
