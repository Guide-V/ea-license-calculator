import { evaluate, recommend, strategicNotes } from "../calc/evaluate";
import { estateNodeCount, totalDeployments } from "../calc/members";
import { poolBreakEvenGB } from "../calc/ramPool";
import { NODE_RAM_CAP_GB, NONPROD_PRICE_FACTOR, POOL_LICENSE_GB, SOURCES } from "../calc/rules";
import { setHosting } from "../calc/topology";
import type { PlanningSignals, Prices, Topology } from "../calc/types";
import { gb, money, plural } from "../ui/format";
import type { View } from "./HostingToggle";

type Props = {
  readonly topology: Topology;
  readonly prices: Prices;
  readonly view: View;
  readonly signals?: PlanningSignals;
};

const VIEW_LABEL: Record<View, string> = {
  vm: "Virtual machines",
  k8s: "Kubernetes",
  both: "Virtual machines and Kubernetes, side by side",
};

const DEFAULT_SIGNALS: PlanningSignals = { k8sPlanned: false, verticalGrowth: false, fleetSprawl: false };

/** Only visible when printing. Records the decision rationale and inputs behind the numbers. */
export function PrintSummary({ topology, prices, view, signals = DEFAULT_SIGNALS }: Props) {
  const active = setHosting(topology, view === "k8s" ? "k8s" : "vm");
  const evaluation = evaluate(active, prices);
  const recommendation = recommend(evaluation);
  const notes = strategicNotes(active, evaluation, signals);
  const breakEven = poolBreakEvenGB(prices);
  const ratio = prices.perNodeLicense > 0 ? (prices.poolLicense / prices.perNodeLicense).toFixed(1) : "n/a";
  const winnerLabel = recommendation.forced
    ? "RAM pool (required on Kubernetes)"
    : recommendation.winner === "ramPool"
      ? "RAM pool"
      : recommendation.winner === "perNode"
        ? "Per-node"
        : "Tie";

  const deployments = totalDeployments(topology);
  const unit = topology.kind === "single" ? "single node" : `replica set (${topology.members.length} members)`;
  const estateParts: string[] = [];
  if (topology.clusters > 0) estateParts.push(`${topology.clusters} prod`);
  if (topology.nonProdClusters > 0) estateParts.push(`${topology.nonProdClusters} non-prod`);

  return (
    <section className="print-only report-inputs" aria-label="Report summary and inputs">
      <h2>Decision summary</h2>
      <div className="print-summary-box">
        <p>
          <strong>Recommended model.</strong> {winnerLabel} at{" "}
          <strong>{money(recommendation.cost, prices.currency)} per year</strong>
          {!recommendation.forced && recommendation.winner !== "tie" && (
            <>
              , saving {money(recommendation.savings, prices.currency)} ({recommendation.savingsPct.toFixed(0)}%) compared to{" "}
              {money(recommendation.otherCost ?? 0, prices.currency)}
            </>
          )}
          .
        </p>
        <p>{recommendation.reason}</p>
        {notes.length > 0 && (
          <ul>
            {notes.map((note) => (
              <li key={note.id}>
                <strong>
                  {note.title} (favors {note.leans === "ramPool" ? "RAM pool" : "Per-node"}).
                </strong>{" "}
                {note.detail}
              </li>
            ))}
          </ul>
        )}
      </div>

      <h2>Inputs</h2>
      <table>
        <tbody>
          <tr>
            <th scope="row">Generated</th>
            <td>{new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}</td>
          </tr>
          <tr>
            <th scope="row">Hosting</th>
            <td>{VIEW_LABEL[view]}</td>
          </tr>
          <tr>
            <th scope="row">Estate &amp; deployment</th>
            <td>
              {deployments === 1
                ? unit
                : `${estateParts.join(" + ")} deployments of ${unit} (${plural(estateNodeCount(topology), "node")}, ${gb(evaluation.pool.totalGB)} total)`}
            </td>
          </tr>
          {view !== "vm" && (
            <tr>
              <th scope="row">Kubernetes workers</th>
              <td>
                {topology.k8s.workerRamGB} GB RAM, {topology.k8s.podsPerWorker} pods per worker (worker RAM not licensed)
              </td>
            </tr>
          )}
          <tr>
            <th scope="row">Prices and ratio (per year)</th>
            <td>
              Per-node {money(prices.perNodeLicense, prices.currency)}; pool{" "}
              {money(prices.poolLicense, prices.currency)} per {POOL_LICENSE_GB} GB ({ratio}x ratio, full-pool break-even about{" "}
              {Number.isFinite(breakEven) ? `${Math.round(breakEven)} GB` : "unbounded"} per node); non-prod node{" "}
              {money(prices.perNodeLicense * NONPROD_PRICE_FACTOR, prices.currency)}
            </td>
          </tr>
        </tbody>
      </table>

      <table className="members-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Role</th>
            <th>Environment (template)</th>
            <th>vCPU</th>
            <th>{view === "k8s" ? "Memory limit (GB)" : "RAM (GB)"}</th>
          </tr>
        </thead>
        <tbody>
          {topology.members.map((member, index) => (
            <tr key={member.id}>
              <td>{index + 1}</td>
              <td>{member.role}</td>
              <td>{member.env === "nonprod" ? "Non-prod" : "Prod"}</td>
              <td>{member.vcpu}</td>
              <td>{member.ramGB}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Key licensing rules</h2>
      <ul>
        <li>
          <strong>Per-node on VMs.</strong> 1 license per data-bearing mongod covering up to {NODE_RAM_CAP_GB} GB RAM. Non-prod nodes cost {Math.round(NONPROD_PRICE_FACTOR * 100)}%.
        </li>
        <li>
          <strong>RAM pool on VMs and Kubernetes.</strong> 1 license covers {POOL_LICENSE_GB} GB of combined data-bearing RAM across any number of nodes or clusters. Prod and non-prod RAM count equally.
        </li>
        <li>
          <strong>Kubernetes.</strong> RAM pool only. Counts container memory limits, not requests or worker RAM.
        </li>
        <li>
          <strong>Not licensed as data-bearing.</strong> mongos routers, config servers (CSRS), and Ops Manager servers.
        </li>
      </ul>

      <h2>Sources</h2>
      <ul>
        {SOURCES.map((source) => (
          <li key={source.title}>
            <strong>{source.title}.</strong> {source.note}
          </li>
        ))}
      </ul>
    </section>
  );
}
