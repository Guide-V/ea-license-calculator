import { useState } from "react";
import { NODE_RAM_CAP_GB, POOL_LICENSE_GB } from "../calc/rules";
import { Segmented } from "./Segmented";

type Tab = "versus" | "rules";

const RULES = [
  {
    title: "Per-node",
    short: "1 license per data-bearing mongod",
    detail: `Covers up to ${NODE_RAM_CAP_GB} GB RAM per node (257 to 512 GB needs 2). Vertical RAM growth is free up to 256 GB.`,
  },
  {
    title: "RAM pool",
    short: "Buy 256 GB buckets and pool across clusters",
    detail: `One license covers ${POOL_LICENSE_GB} GB of combined data-bearing RAM across any number of nodes or clusters.`,
  },
  {
    title: "Non-prod",
    short: "Half price per-node, full weight in pool",
    detail: "Non-prod nodes cost half under per-node with the same 256 GB cap. The RAM pool counts prod and non-prod RAM the same.",
  },
  {
    title: "Kubernetes",
    short: "RAM pool only, based on pod limits",
    detail: "Per-node is not available for containers. The pool counts each data-bearing container's memory limit, not requests or worker RAM.",
  },
  {
    title: "Not licensed (free)",
    short: "mongos, config servers, and Ops Manager",
    detail: "Query routers (mongos), sharded config servers (CSRS), and Ops Manager application servers do not need data-bearing licenses.",
  },
] as const;

const VERSUS = [
  { label: "Licensed unit", node: "Data-bearing mongod nodes", pool: "Combined data-bearing GB" },
  { label: "Grow RAM per node", node: "Free up to 256 GB per node", pool: "Uses pool GB" },
  { label: "Add nodes or clusters", node: "+1 license per node", pool: "Shares unused pool GB" },
  { label: "Non-prod environments", node: "Half price (50%)", pool: "Same weight as prod" },
  { label: "Kubernetes and containers", node: "Not available", pool: "Only option, counts pod memory limits" },
  { label: "Free components", node: "mongos, config servers, Ops Manager", pool: "mongos, config servers, Ops Manager" },
  { label: "Best fit", node: "Few large VM nodes or many non-prod clusters", pool: "Many small nodes, microservice fleets, or Kubernetes" },
] as const;

export function Learn() {
  const [tab, setTab] = useState<Tab>("versus");

  return (
    <section className="section no-print" aria-labelledby="learn-title">
      <div className="learn-head">
        <h2 id="learn-title">How to choose</h2>
        <Segmented<Tab>
          label="Learn topic"
          value={tab}
          onChange={setTab}
          options={[
            { value: "versus", label: "Per-node vs pool" },
            { value: "rules", label: "Rules & free components" },
          ]}
        />
      </div>

      {tab === "versus" ? (
        <div className="table-wrap">
          <table className="compare">
            <thead>
              <tr>
                <th scope="col"> </th>
                <th scope="col">Per-node</th>
                <th scope="col">RAM pool</th>
              </tr>
            </thead>
            <tbody>
              {VERSUS.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td className={row.node === "Not available" ? "cell-warn" : undefined}>{row.node}</td>
                  <td>{row.pool}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="tiles">
          {RULES.map((rule) => (
            <article key={rule.title} className="tile tile-static">
              <span className="tile-title">{rule.title}</span>
              <span className="tile-short">{rule.short}</span>
              <span className="tile-more">{rule.detail}</span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
