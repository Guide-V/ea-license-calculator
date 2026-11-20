import { estateNodeCount, totalDeployments } from "../calc/members";
import { MAX_CLUSTERS, MAX_MEMBERS, MAX_RAM_GB, MAX_VCPU, MIN_RAM_GB } from "../calc/rules";
import {
  addMember,
  removeMember,
  setAllSizes,
  setClusters,
  setK8s,
  setKind,
  setMemberCount,
  setMemberCountFromSlider,
  setNonProdClusters,
  updateMember,
} from "../calc/topology";
import type { Environment, Role, Topology } from "../calc/types";
import { plural } from "../ui/format";
import { Segmented } from "./Segmented";
import { SizeControl } from "./SizeControl";

type Props = {
  readonly topology: Topology;
  readonly showK8s: boolean;
  readonly onChange: (topology: Topology) => void;
};

const ROLES: readonly { readonly value: Role; readonly label: string }[] = [
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
  { value: "hidden", label: "Hidden" },
  { value: "delayed", label: "Delayed" },
];

const ENVS: readonly { readonly value: Environment; readonly label: string }[] = [
  { value: "prod", label: "Prod" },
  { value: "nonprod", label: "Non-prod" },
];

const QUICK_RAM = [8, 16, 32, 64, 128, 256, 512] as const;

const average = (values: readonly number[]): number =>
  values.length === 0 ? 0 : Math.round(values.reduce((a, b) => a + b, 0) / values.length);

export function TopologyBuilder({ topology, showK8s, onChange }: Props) {
  const isReplicaSet = topology.kind === "replicaSet";
  const avgRam = average(topology.members.map((member) => member.ramGB));
  const ramLabel = showK8s ? "Pod memory limit (not requests)" : "RAM";
  const count = topology.members.length;
  const deployments = totalDeployments(topology);
  const totalNodes = estateNodeCount(topology);
  const unitName = isReplicaSet ? "replica set" : "single node";

  return (
    <section className="panel no-print" aria-labelledby="builder-title">
      <h2 id="builder-title">Topology</h2>

      <Segmented<Topology["kind"]>
        label="Deployment type"
        value={topology.kind}
        onChange={(kind) => onChange(setKind(topology, kind))}
        options={[
          { value: "single", label: "Single node" },
          { value: "replicaSet", label: "Replica set" },
        ]}
      />

      {isReplicaSet && (
        <div className="stepper" role="group" aria-label="Members per deployment">
          <button type="button" className="step-btn" aria-label="Remove a member" onClick={() => onChange(setMemberCount(topology, count - 1))}>
            -
          </button>
          <span className="step-value">
            <strong>{count}</strong> nodes per set
          </span>
          <button type="button" className="step-btn" aria-label="Add a member" onClick={() => onChange(setMemberCount(topology, count + 1))}>
            +
          </button>
          <input
            aria-label="Members slider"
            type="range"
            min={1}
            max={MAX_MEMBERS}
            value={Math.min(count, MAX_MEMBERS)}
            onChange={(event) => onChange(setMemberCountFromSlider(topology, Number(event.target.value)))}
          />
        </div>
      )}

      <fieldset className="estate-fields">
        <legend>Environment count ({plural(deployments, unitName)}, {plural(totalNodes, "node")})</legend>
        <div className="estate-row">
          <div className="stepper stepper-compact" role="group" aria-label="Prod deployments">
            <button
              type="button"
              className="step-btn"
              aria-label="Fewer prod deployments"
              disabled={topology.clusters <= (topology.nonProdClusters > 0 ? 0 : 1)}
              onClick={() => onChange(setClusters(topology, topology.clusters - 1))}
            >
              -
            </button>
            <span className="step-value">
              <strong>{topology.clusters}</strong> prod
            </span>
            <button
              type="button"
              className="step-btn"
              aria-label="More prod deployments"
              disabled={topology.clusters >= MAX_CLUSTERS}
              onClick={() => onChange(setClusters(topology, topology.clusters + 1))}
            >
              +
            </button>
          </div>
          <div className="stepper stepper-compact" role="group" aria-label="Non-prod deployments">
            <button
              type="button"
              className="step-btn"
              aria-label="Fewer non-prod deployments"
              disabled={topology.nonProdClusters <= (topology.clusters > 0 ? 0 : 1)}
              onClick={() => onChange(setNonProdClusters(topology, topology.nonProdClusters - 1))}
            >
              -
            </button>
            <span className="step-value">
              <strong>{topology.nonProdClusters}</strong> non-prod
            </span>
            <button
              type="button"
              className="step-btn"
              aria-label="More non-prod deployments"
              disabled={topology.nonProdClusters >= MAX_CLUSTERS}
              onClick={() => onChange(setNonProdClusters(topology, topology.nonProdClusters + 1))}
            >
              +
            </button>
          </div>
        </div>
        <p className="hint">
          RAM pool shares 256 GB across all deployments. Separate non-prod deployments cost 50% per-node.
        </p>
      </fieldset>

      <div className="quick" role="group" aria-label={`Quick ${ramLabel}`}>
        {QUICK_RAM.map((ram) => (
          <button
            key={ram}
            type="button"
            className={ram === avgRam ? "quick-chip quick-on" : "quick-chip"}
            aria-pressed={ram === avgRam}
            onClick={() => onChange(setAllSizes(topology, { ramGB: ram }))}
          >
            {ram} GB
          </button>
        ))}
      </div>

      <SizeControl
        id="all-ram"
        label={isReplicaSet ? `${ramLabel} per node` : ramLabel}
        unit="GB"
        value={avgRam}
        min={MIN_RAM_GB}
        max={MAX_RAM_GB}
        onChange={(ramGB) => onChange(setAllSizes(topology, { ramGB }))}
      />
      <SizeControl
        id="all-vcpu"
        label="vCPU (no license impact)"
        unit="vCPU"
        value={average(topology.members.map((member) => member.vcpu))}
        min={1}
        max={MAX_VCPU}
        onChange={(vcpu) => onChange(setAllSizes(topology, { vcpu }))}
      />

      {showK8s && (
        <fieldset className="k8s-fields">
          <legend>Kubernetes workers</legend>
          <SizeControl
            id="worker-ram"
            label="Worker RAM (not licensed)"
            unit="GB"
            value={topology.k8s.workerRamGB}
            min={8}
            max={2048}
            onChange={(workerRamGB) => onChange(setK8s(topology, { workerRamGB }))}
          />
          <div className="stepper" role="group" aria-label="Pods per worker">
            <button
              type="button"
              className="step-btn"
              aria-label="Fewer pods per worker"
              onClick={() => onChange(setK8s(topology, { podsPerWorker: topology.k8s.podsPerWorker - 1 }))}
            >
              -
            </button>
            <span className="step-value">
              <strong>{topology.k8s.podsPerWorker}</strong> pods per worker
            </span>
            <button
              type="button"
              className="step-btn"
              aria-label="More pods per worker"
              onClick={() => onChange(setK8s(topology, { podsPerWorker: topology.k8s.podsPerWorker + 1 }))}
            >
              +
            </button>
          </div>
        </fieldset>
      )}

      {isReplicaSet && (
        <details className="members-detail">
          <summary>Fine-tune each member</summary>
          <ul className="member-list">
            {topology.members.map((member, index) => (
              <li key={member.id} className="member-row">
                <span className="member-index">#{index + 1}</span>
                <select
                  aria-label={`Role of member ${index + 1}`}
                  value={member.role}
                  onChange={(event) => onChange(updateMember(topology, member.id, { role: event.target.value as Role }))}
                >
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={`Environment of member ${index + 1}`}
                  value={member.env}
                  onChange={(event) => onChange(updateMember(topology, member.id, { env: event.target.value as Environment }))}
                >
                  {ENVS.map((env) => (
                    <option key={env.value} value={env.value}>
                      {env.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Remove member ${index + 1}`}
                  onClick={() => onChange(removeMember(topology, member.id))}
                >
                  x
                </button>
                <span className="member-sizes">
                <input
                  aria-label={`${ramLabel} of member ${index + 1}`}
                  type="number"
                  min={MIN_RAM_GB}
                  max={MAX_RAM_GB}
                  value={member.ramGB}
                  onChange={(event) => onChange(updateMember(topology, member.id, { ramGB: Number(event.target.value) }))}
                />
                <span className="unit">GB</span>
                <input
                  aria-label={`vCPU of member ${index + 1}`}
                  type="number"
                  min={1}
                  max={MAX_VCPU}
                  value={member.vcpu}
                  onChange={(event) => onChange(updateMember(topology, member.id, { vcpu: Number(event.target.value) }))}
                />
                <span className="unit">vCPU</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="row-actions">
            <button type="button" className="btn" disabled={count >= MAX_MEMBERS} onClick={() => onChange(addMember(topology, "secondary"))}>
              Add member
            </button>
            <button type="button" className="btn" disabled={count >= MAX_MEMBERS} onClick={() => onChange(addMember(topology, "secondary", "nonprod"))}>
              Add non-prod member
            </button>
          </div>
        </details>
      )}
    </section>
  );
}
