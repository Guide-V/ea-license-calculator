import { evaluate, strategicNotes } from "../calc/evaluate";
import type { PlanningSignals, Prices, Topology } from "../calc/types";

type Props = {
  readonly topology: Topology;
  readonly prices: Prices;
  readonly signals: PlanningSignals;
  readonly onChange: (signals: PlanningSignals) => void;
};

const QUESTIONS: readonly {
  readonly key: keyof PlanningSignals;
  readonly label: string;
  readonly hint: string;
}[] = [
  {
    key: "k8sPlanned",
    label: "Moving to Kubernetes or OpenShift in the next 12 to 24 months?",
    hint: "Containers require the RAM pool",
  },
  {
    key: "verticalGrowth",
    label: "Expecting RAM per node to grow toward 128 to 256 GB?",
    hint: "Per-node gives free headroom up to 256 GB per node",
  },
  {
    key: "fleetSprawl",
    label: "Planning many small microservice clusters or shards?",
    hint: "The RAM pool shares unused 256 GB buckets across clusters",
  },
] as const;

export function DecisionChecklist({ topology, prices, signals, onChange }: Props) {
  const evaluation = evaluate(topology, prices);
  const notes = strategicNotes(topology, evaluation, signals);

  return (
    <section className="section strategy-section no-print" aria-labelledby="strategy-title">
      <div className="strategy-grid">
        <div className="panel">
          <h2 id="strategy-title">Beyond Day-1 cost</h2>
          <p className="hint">Select what applies to the next 12 to 24 months to see how each model holds up.</p>
          <ul className="check-list">
            {QUESTIONS.map((q) => (
              <li key={q.key}>
                <label className="check-item">
                  <input
                    type="checkbox"
                    checked={signals[q.key]}
                    onChange={(event) => onChange({ ...signals, [q.key]: event.target.checked })}
                  />
                  <span>
                    <strong>{q.label}</strong>
                    <small>{q.hint}</small>
                  </span>
                </label>
              </li>
            ))}
          </ul>

          {notes.length > 0 && (
            <ul className="strategy-notes" aria-label="Planning considerations">
              {notes.map((note) => (
                <li key={note.id} className={note.leans === "ramPool" ? "strategy-note note-pool" : "strategy-note note-node"}>
                  <div className="note-head">
                    <strong>{note.title}</strong>
                    <span className="note-pill">Favors {note.leans === "ramPool" ? "RAM pool" : "Per-node"}</span>
                  </div>
                  <p>{note.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="panel free-box" aria-labelledby="free-title">
          <h2 id="free-title">Not counted as data-bearing</h2>
          <p className="hint">
            These MongoDB Enterprise Advanced components do not consume per-node or RAM pool data licenses. Confirm exact entitlements on your order form.
          </p>
          <ul className="free-list">
            <li>
              <strong>mongos query routers.</strong> Stateless routers for sharded clusters.
            </li>
            <li>
              <strong>Config servers (CSRS).</strong> Metadata replica set for sharded clusters.
            </li>
            <li>
              <strong>Ops Manager servers.</strong> Servers that run management, backup, and automation.
            </li>
            <li>
              <strong>vCPU and Kubernetes worker RAM.</strong> Neither vCPU count nor unused worker host RAM affects license counts.
            </li>
          </ul>
        </aside>
      </div>
    </section>
  );
}
