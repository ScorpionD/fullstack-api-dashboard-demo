import { useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  PlugZap,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { api } from "../services/api";
import type { Rates } from "../types";
export function IntegrationLab() {
  const [data, setData] = useState<Rates | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function run(scenario: string) {
    setBusy(true);
    setError("");
    try {
      setData(await api<Rates>("/integrations/rates?scenario=" + scenario));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="section-header">
        <div>
          <span className="eyebrow">BUILT FOR THE UNEXPECTED</span>
          <h1>
            Integration lab<span className="heading-dot">.</span>
          </h1>
          <p>
            A real external API. Clear handling when things don’t go to plan.
          </p>
        </div>
        <span className="small-chip">
          <PlugZap size={14} />
          REST integration
        </span>
      </div>
      <div className="integration-grid">
        <div className="panel integration-controls">
          <div className="provider-logo">
            F<span>↗</span>
          </div>
          <h2>Currency reference rates</h2>
          <p>
            EUR to USD and GBP from Frankfurter. Rates are informational and are
            never used to alter order amounts.
          </p>
          <a
            className="text-button"
            href="https://frankfurter.dev/"
            target="_blank"
            rel="noreferrer"
          >
            Provider documentation
            <ArrowUpRight size={15} />
          </a>
          <div className="scenario-list">
            <button disabled={busy} onClick={() => run("live")}>
              <CheckCircle2 />
              <span>
                <strong>Live request</strong>
                <small>Fetch verified rates, cached for 15 minutes</small>
              </span>
              <ArrowUpRight size={16} />
            </button>
            <button disabled={busy} onClick={() => run("timeout")}>
              <Clock3 />
              <span>
                <strong>Simulate a timeout</strong>
                <small>Test the adapter’s fallback response</small>
              </span>
              <ArrowUpRight size={16} />
            </button>
            <button disabled={busy} onClick={() => run("bad-response")}>
              <AlertTriangle />
              <span>
                <strong>Simulate a bad response</strong>
                <small>Reject an invalid provider payload</small>
              </span>
              <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="info-banner">
            <ShieldCheck size={17} />
            Simulations affect only this request. They do not change production
            settings.
          </div>
        </div>
        <div className="panel integration-result">
          <div className="panel-title">
            <div>
              <span className="eyebrow">RESPONSE INSPECTOR</span>
              <h2>Readable. Traceable. Resilient.</h2>
            </div>
            <span className={"status-indicator " + (busy ? "working" : "")}>
              {busy ? "Processing" : "Ready"}
            </span>
          </div>
          {busy ? (
            <div className="state">
              <RefreshCw className="spin" />
              <strong>Contacting the adapter…</strong>
              <span>A request has a bounded timeout and one retry.</span>
            </div>
          ) : error ? (
            <p className="inline-error" role="alert">
              {error}
            </p>
          ) : data ? (
            <>
              <div className={"result-banner " + data.status}>
                <strong>
                  {data.status === "live"
                    ? "Verified live response"
                    : data.status === "cached"
                      ? "Verified cached response"
                      : data.status === "fallback"
                        ? "Fallback: last verified rates"
                        : "Provider data unavailable"}
                </strong>
                <p>
                  {data.reason ||
                    "The provider payload passed server-side validation."}
                </p>
              </div>
              <div className="rates-grid">
                <div>
                  <span>1 EUR → USD</span>
                  <strong>{data.rates?.USD.toFixed(4) || "—"}</strong>
                </div>
                <div>
                  <span>1 EUR → GBP</span>
                  <strong>{data.rates?.GBP.toFixed(4) || "—"}</strong>
                </div>
              </div>
              <dl className="response-details">
                <div>
                  <dt>Source</dt>
                  <dd>{data.source}</dd>
                </div>
                <div>
                  <dt>Rate date</dt>
                  <dd>{data.date || "No verified data yet"}</dd>
                </div>
                <div>
                  <dt>Adapter processing</dt>
                  <dd>{data.processingMs} ms</dd>
                </div>
                <div>
                  <dt>Scenario</dt>
                  <dd>
                    {data.scenario === "live"
                      ? "Real provider request"
                      : `Simulated ${data.scenario}`}
                  </dd>
                </div>
              </dl>
              <details className="json-details">
                <summary>View normalized API response</summary>
                <pre>{JSON.stringify(data, null, 2)}</pre>
              </details>
            </>
          ) : (
            <div className="state">
              <PlugZap size={30} />
              <strong>See the contract in action</strong>
              <span>
                Start with a live request, then test a failure scenario.
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
