import {
  Check,
  ArrowUpRight,
  GitCommitHorizontal,
  ShieldCheck,
} from "lucide-react";
export const cases = [
  {
    id: "01",
    title: "API response mapping",
    layer: "API CONTRACT",
    cause: "The UI and database used different field names and amount units.",
    commit: "55ac1f6",
    before:
      "Database fields were passed directly to the UI, producing missing amounts and customer names.",
    after:
      "Explicit snake_case → camelCase mapping preserves integer cents and joined customer metadata.",
    test: "A €1,234.56 order renders as €1,234.56, not €123,456 or an empty value.",
  },
  {
    id: "02",
    title: "Session expiry & authorization",
    layer: "AUTHENTICATION",
    cause:
      "Authentication checked token existence without checking its expiry timestamp.",
    commit: "44801a3",
    before:
      "An expired session could be treated as valid because its existence was checked without its expiry.",
    after:
      "The server checks expiry on every request. The client returns to login on 401; mutations also require CSRF and admin access.",
    test: "Expired sessions return 401. Viewer writes and invalid CSRF tokens return 403.",
  },
  {
    id: "03",
    title: "Loading state recovery",
    layer: "REACT STATE",
    cause: "The rejected promise never transitioned the view out of loading.",
    commit: "0baa71c",
    before:
      "A rejected request could leave the loading indicator active indefinitely.",
    after:
      "Success and failure both complete the loading state. Superseded requests are aborted so stale data cannot replace a newer view.",
    test: "A failed fetch renders an error and retry action. A successful retry restores the table.",
  },
  {
    id: "04",
    title: "Pagination after filtering",
    layer: "QUERY LOGIC",
    cause: "The page offset belonged to the old, larger result set.",
    commit: "05110df",
    before:
      "Changing filters on a later page could produce an empty list despite matching records.",
    after:
      "Filter changes reset the page. The server clamps out-of-range pages and calculates totals with the same search conditions.",
    test: "An out-of-range filtered request returns the last valid page with consistent totals.",
  },
  {
    id: "05",
    title: "Monetary input validation",
    layer: "DATA INTEGRITY",
    cause: "Permissive number coercion bypassed the monetary data contract.",
    commit: "072c732",
    before:
      "Coercion admitted zero, negative or fractional cents into order updates.",
    after:
      "Strict schemas require a bounded positive integer in cents. PostgreSQL constraints reinforce validation; failed writes leave no audit entry.",
    test: "Negative, zero, fractional and excessively large amounts are rejected before persistence.",
  },
];
export function Debugging() {
  return (
    <>
      <div className="section-header">
        <div>
          <span className="eyebrow">THE ENGINEERING BEHIND THE INTERFACE</span>
          <h1>
            Five bugs. Five verified fixes<span className="heading-dot">.</span>
          </h1>
          <p>Real debugging scenarios demonstrated in Git history.</p>
        </div>
        <a
          href="https://github.com/ScorpionD/fullstack-api-dashboard-demo/blob/main/docs/debugging.md"
          target="_blank"
          rel="noreferrer"
          className="button secondary"
        >
          Read docs/debugging.md
          <ArrowUpRight size={16} />
        </a>
      </div>
      <div className="info-banner">
        <ShieldCheck size={17} />
        Intentional engineering exercises with reproducible tests. This demo
        runs the corrected main branch; the original regressions remain in a
        separate, undeployed branch.
      </div>
      <div className="case-grid">
        {cases.map((c) => (
          <article className="panel case-card" key={c.id}>
            <div className="case-top">
              <span className="case-number">{c.id}</span>
              <span className="eyebrow">{c.layer}</span>
              <span className="fixed">
                <Check size={13} />
                Fixed
              </span>
            </div>
            <h2>{c.title}</h2>
            <div className="case-story">
              <div>
                <h3>Bug</h3>
                <p>{c.before}</p>
              </div>
              <div>
                <h3>Root cause</h3>
                <p>{c.cause}</p>
              </div>
              <div>
                <h3>Fix</h3>
                <p>{c.after}</p>
              </div>
            </div>
            <div className="test-proof">
              <GitCommitHorizontal size={18} />
              <p>{c.test}</p>
              <a
                href={`https://github.com/ScorpionD/fullstack-api-dashboard-demo/commit/${c.commit}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`View fix commit ${c.commit}`}
              >
                {c.commit}
                <ArrowUpRight size={13} />
              </a>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
