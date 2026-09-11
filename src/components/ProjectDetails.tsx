import {
  ArrowUpRight,
  Check,
  Cloud,
  Code2,
  Database,
  Server,
  PlugZap,
  ShieldCheck,
} from "lucide-react";

const repo = "https://github.com/ScorpionD/fullstack-api-dashboard-demo";
const features = [
  "Role-based access",
  "Server-side authorization",
  "PostgreSQL",
  "Audit logging",
  "Centralized error handling",
  "Request validation",
  "Rate limiting",
  "CSRF / origin protection",
  "Dockerized backend",
  "External API resilience",
  "Automated tests",
];

export function ProjectDetails() {
  return (
    <>
      <div className="section-header">
        <div>
          <span className="eyebrow">FROM INTERFACE TO INFRASTRUCTURE</span>
          <h1>
            Built on solid foundations<span className="heading-dot">.</span>
          </h1>
          <p>
            A working full-stack demo for customer, order and service
            operations.
          </p>
        </div>
        <a
          href={repo}
          target="_blank"
          rel="noreferrer"
          className="button secondary"
        >
          Explore GitHub <ArrowUpRight size={16} />
        </a>
      </div>
      <section
        className="panel architecture-panel"
        aria-labelledby="architecture-title"
      >
        <div className="panel-title">
          <div>
            <h2 id="architecture-title">One connected system</h2>
            <p>Real requests, persistent records and clear boundaries.</p>
          </div>
          <ShieldCheck size={21} />
        </div>
        <div className="architecture-flow">
          {[
            {
              icon: Code2,
              title: "React / TypeScript",
              text: "Responsive customer & order workspace",
            },
            {
              icon: Cloud,
              title: "Cloudflare",
              text: "Pages frontend + protected Worker gateway",
            },
            {
              icon: Server,
              title: "Node.js / Express",
              text: "Authorized REST API in isolated Docker",
            },
            {
              icon: Database,
              title: "PostgreSQL",
              text: "Private database · no public port",
            },
          ].map((step, i) => (
            <div className="architecture-step" key={step.title}>
              <span className="architecture-index">0{i + 1}</span>
              <step.icon size={24} />
              <strong>{step.title}</strong>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
        <div className="architecture-external">
          <PlugZap size={19} />
          <div>
            <strong>Node.js API ↔ External REST API</strong>
            <p>
              Frankfurter reference rates: validated responses, bounded timeouts
              and explicit fallback.
            </p>
          </div>
        </div>
      </section>
      <section
        className="panel features-panel"
        aria-labelledby="features-title"
      >
        <div className="panel-title">
          <div>
            <h2 id="features-title">Production-ready features</h2>
            <p>
              Production-style engineering patterns, demonstrated with fictional
              business data.
            </p>
          </div>
        </div>
        <ul className="feature-list">
          {features.map((feature) => (
            <li key={feature}>
              <Check size={16} />
              {feature}
            </li>
          ))}
        </ul>
      </section>
      <section
        className="verification-strip"
        aria-label="Recorded release verification"
      >
        <div>
          <strong>47</strong>
          <span>Automated tests passed</span>
        </div>
        <div>
          <strong>14</strong>
          <span>Public API check groups passed</span>
        </div>
        <div>
          <strong>Passed</strong>
          <span>Production build</span>
        </div>
        <div>
          <strong>0 known</strong>
          <span>Dependency vulnerabilities</span>
        </div>
        <p>
          Verified: 11 September 2026. Test and audit results describe that
          verification, not a permanent guarantee.{" "}
          <a
            href={repo + "/blob/main/docs/verification.md"}
            target="_blank"
            rel="noreferrer"
          >
            View the verification record <ArrowUpRight size={13} />
          </a>
        </p>
      </section>
      <p className="footnote">
        Frontend on Cloudflare Pages. Backend in isolated Docker containers.
        Database not exposed publicly. No infrastructure credentials are
        included in this demo.
      </p>
    </>
  );
}
