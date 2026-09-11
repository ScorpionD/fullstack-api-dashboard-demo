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
import { ErrorPanel } from "./ui";
export function IntegrationLab() {
  const [data, setData] = useState<Rates | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [scenario, setScenario] = useState("live");
  async function run(scenario: string) {
    setScenario(scenario);
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
            Keep operations moving when an external provider slows down or sends
            unusable data.
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
            <button
              aria-pressed={!!data && scenario === "live"}
              disabled={busy}
              onClick={() => run("live")}
            >
              <CheckCircle2 />
              <span>
                <strong>Normal response</strong>
                <small>
                  Real API request · verified data cached for 15 minutes
                </small>
              </span>
              <ArrowUpRight size={16} />
            </button>
            <button
              aria-pressed={!!data && scenario === "timeout"}
              disabled={busy}
              onClick={() => run("timeout")}
            >
              <Clock3 />
              <span>
                <strong>Simulate a timeout</strong>
                <small>
                  Provider is too slow · use last verified data if available
                </small>
              </span>
              <ArrowUpRight size={16} />
            </button>
            <button
              aria-pressed={!!data && scenario === "bad-response"}
              disabled={busy}
              onClick={() => run("bad-response")}
            >
              <AlertTriangle />
              <span>
                <strong>Simulate a bad response</strong>
                <small>
                  Unusable data · reject it instead of displaying it as valid
                </small>
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
              <span className="eyebrow">WHAT YOUR TEAM SEES</span>
              <h2>A clear outcome for every request.</h2>
            </div>
            <span className={"status-indicator " + (busy ? "working" : "")}>
              {busy ? "Processing" : "Ready"}
            </span>
          </div>
          {busy ? (
            <div className="state" role="status">
              <RefreshCw className="spin" />
              <strong>Contacting the adapter…</strong>
              <span>A request has a bounded timeout and one retry.</span>
            </div>
          ) : error ? (
            <ErrorPanel message={error} retry={() => run(scenario)} />
          ) : data ? (
            <>
              <div className={"result-banner " + data.status} role="status">
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
                {data.status === "fallback" && (
                  <p>
                    Showing previously validated data, not a fresh provider
                    response. Check the rate date before using it.
                  </p>
                )}
                {data.status === "unavailable" && (
                  <p>
                    No verified data is available yet. Run a normal request to
                    try again.
                  </p>
                )}
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
                  <dt>Last verified</dt>
                  <dd>
                    {data.fetchedAt
                      ? new Date(data.fetchedAt).toLocaleString("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "No verified response"}
                  </dd>
                </div>
                <div>
                  <dt>Adapter processing</dt>
                  <dd>{data.processingMs} ms</dd>
                </div>
                <div>
                  <dt>Scenario</dt>
                  <dd>
                    {data.scenario === "live"
                      ? "Live API / verified cache"
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
      <div className="integration-promises">
        <div>
          <ShieldCheck size={19} />
          <strong>Validate before display</strong>
          <p>Only checked provider data can become a verified result.</p>
        </div>
        <div>
          <Clock3 size={19} />
          <strong>Bound the waiting time</strong>
          <p>Timeout handling and one retry keep requests under control.</p>
        </div>
        <div>
          <RefreshCw size={19} />
          <strong>Label every fallback</strong>
          <p>Show the last verified result or an explicit unavailable state.</p>
        </div>
      </div>
    </>
  );
}
