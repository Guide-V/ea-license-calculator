import { setHosting } from "../calc/topology";
import type { Prices, Topology } from "../calc/types";
import { LicenseBoundaryDiagram } from "./LicenseBoundaryDiagram";
import { Scoreboard } from "./Scoreboard";

type Props = {
  readonly topology: Topology;
  readonly prices: Prices;
  readonly onChange?: (topology: Topology) => void;
};

export function SideBySide({ topology, prices, onChange }: Props) {
  return (
    <div className="side-by-side">
      <div className="side">
        <h3 className="side-title">On virtual machines</h3>
        <LicenseBoundaryDiagram topology={setHosting(topology, "vm")} onChange={onChange} />
        <Scoreboard topology={setHosting(topology, "vm")} prices={prices} compact />
      </div>
      <div className="side">
        <h3 className="side-title">On Kubernetes</h3>
        <LicenseBoundaryDiagram topology={setHosting(topology, "k8s")} onChange={onChange} />
        <Scoreboard topology={setHosting(topology, "k8s")} prices={prices} compact />
      </div>
    </div>
  );
}
