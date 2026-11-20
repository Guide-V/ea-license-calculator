import { useState } from "react";
import { NODE_RAM_CAP_GB, POOL_LICENSE_GB } from "../calc/rules";
import { Segmented } from "./Segmented";

type Tab = "how" | "versus";

const TILES = [
  { title: "Per-node", short: "1 license per data node", more: `Covers up to ${NODE_RAM_CAP_GB} GB RAM. 384 GB needs 2. Non-prod nodes cost half.` },
  { title: "RAM pool", short: "Buy GB, not nodes", more: `One license covers ${POOL_LICENSE_GB} GB of combined RAM, over any number of nodes. Prod and non-prod RAM count the same.` },
  { title: "Non-prod", short: "Half price per-node", more: "Same 256 GB cap per license. The pool counts non-prod RAM like prod." },
  { title: "Kubernetes", short: "Pool only", more: "Counts pod memory limits, not worker RAM." },
] as const;

const VERSUS = [
  { label: "Counts", node: "Nodes", pool: "Total GB" },
  { label: "Grow a node", node: "Free to 256 GB", pool: "Uses pool" },
  { label: "Add replicas", node: "+1 license each", pool: "+ their RAM" },
  { label: "Non-prod", node: "Half price", pool: "Same as prod" },
  { label: "Kubernetes", node: "Not available", pool: "Only option" },
  { label: "Best for", node: "Few big nodes", pool: "Many small nodes" },
] as const;

export function Learn() {
  const [tab, setTab] = useState<Tab>("how");
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="section no-print" aria-labelledby="learn-title">
      <div className="learn-head">
        <h2 id="learn-title">Learn in 10 seconds</h2>
        <Segmented<Tab>
          label="Learn topic"
          value={tab}
          onChange={setTab}
          options={[
            { value: "how", label: "How it works" },
            { value: "versus", label: "Per-node vs pool" },
          ]}
        />
      </div>

      {tab === "how" ? (
        <div className="tiles">
          {TILES.map((tile, index) => (
            <button
              key={tile.title}
              type="button"
              className={open === index ? "tile tile-open" : "tile"}
              aria-expanded={open === index}
              onClick={() => setOpen(open === index ? null : index)}
            >
              <span className="tile-title">{tile.title}</span>
              <span className="tile-short">{tile.short}</span>
              {open === index && <span className="tile-more">{tile.more}</span>}
            </button>
          ))}
        </div>
      ) : (
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
      )}
    </section>
  );
}
