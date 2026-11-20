import { NONPROD_PRICE_FACTOR, POOL_LICENSE_GB, SOURCES } from "../calc/rules";
import type { Prices, Topology } from "../calc/types";
import { money } from "../ui/format";
import type { View } from "./HostingToggle";

type Props = { readonly topology: Topology; readonly prices: Prices; readonly view: View };

const VIEW_LABEL: Record<View, string> = {
  vm: "Virtual machines",
  k8s: "Kubernetes",
  both: "Virtual machines and Kubernetes, side by side",
};

/** Only visible when printing. Records the inputs behind the numbers. */
export function PrintSummary({ topology, prices, view }: Props) {
  return (
    <section className="print-only report-inputs" aria-label="Report inputs">
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
            <th scope="row">Deployment</th>
            <td>{topology.kind === "single" ? "Single node" : `Replica set, ${topology.members.length} members`}</td>
          </tr>
          {view !== "vm" && (
            <tr>
              <th scope="row">Kubernetes workers</th>
              <td>
                {topology.k8s.workerRamGB} GB RAM, {topology.k8s.podsPerWorker} pods per worker
              </td>
            </tr>
          )}
          <tr>
            <th scope="row">Prices (per year)</th>
            <td>
              Per-node {money(prices.perNodeLicense, prices.currency)}; pool{" "}
              {money(prices.poolLicense, prices.currency)} per {POOL_LICENSE_GB} GB; non-prod node {money(prices.perNodeLicense * NONPROD_PRICE_FACTOR, prices.currency)}
            </td>
          </tr>
        </tbody>
      </table>

      <table className="members-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Role</th>
            <th>Environment</th>
            <th>vCPU</th>
            <th>{view === "k8s" ? "Memory limit (GB)" : "RAM (GB)"}</th>
            <th>Counted</th>
          </tr>
        </thead>
        <tbody>
          {topology.members.map((member, index) => (
            <tr key={member.id}>
              <td>{index + 1}</td>
              <td>{member.role}</td>
              <td>{member.role === "arbiter" ? "n/a" : member.env === "nonprod" ? "Non-prod" : "Prod"}</td>
              <td>{member.vcpu}</td>
              <td>{member.ramGB}</td>
              <td>{member.role === "arbiter" ? "No (free)" : "Yes"}</td>
            </tr>
          ))}
        </tbody>
      </table>

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
