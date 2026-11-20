import { AnimatePresence, motion } from "framer-motion";
import { layoutWorkers } from "../calc/k8s";
import { estateNodeCount, isNonProd, totalDeployments } from "../calc/members";
import { licensesForNode } from "../calc/perNode";
import { MAX_MEMBERS, NODE_RAM_CAP_GB, NONPROD_PRICE_FACTOR } from "../calc/rules";
import { addMember, removeMember, toggleEnv } from "../calc/topology";
import type { Member, Role, Topology } from "../calc/types";
import { plural } from "../ui/format";

const ROLE_LABEL: Record<Role, string> = {
  primary: "Primary",
  secondary: "Secondary",
  hidden: "Hidden",
  delayed: "Delayed",
};

const spring = { type: "spring", stiffness: 220, damping: 28 } as const;

type EditProps = { readonly onChange?: (topology: Topology) => void };

type ActionsProps = {
  readonly topology: Topology;
  readonly member: Member;
  readonly index: number;
  readonly onChange: (topology: Topology) => void;
};

/**
 * Tap actions for one member: toggle non-prod, drop.
 * The first member is the anchor: it can switch environment but never moves.
 * Environment only matters per-node (VMs), so Kubernetes pods hide it.
 */
function Actions({ topology, member, index, onChange }: ActionsProps) {
  const anchor = topology.kind === "single" || index === 0;
  const showEnv = topology.hosting === "vm";
  if (anchor && !showEnv) return null;
  return (
    <div className="node-actions no-print">
      {showEnv && (
        <button
          type="button"
          className="mini"
          aria-pressed={isNonProd(member)}
          aria-label={`Non-prod, member ${index + 1}`}
          onClick={() => onChange(toggleEnv(topology, member.id))}
        >
          Non-prod
        </button>
      )}
      {!anchor && (
        <button
          type="button"
          className="mini mini-x"
          aria-label={`Remove ${ROLE_LABEL[member.role]} member ${index + 1}`}
          onClick={() => onChange(removeMember(topology, member.id))}
        >
          x
        </button>
      )}
    </div>
  );
}

type AddGhostProps = {
  readonly topology: Topology;
  readonly onChange: (t: Topology) => void;
  readonly label: string;
  /** Offer a second, half-price non-prod button. Only meaningful per-node. */
  readonly nonProd?: boolean;
};

function AddGhost({ topology, onChange, label, nonProd = false }: AddGhostProps) {
  if (topology.kind === "single" || topology.members.length >= MAX_MEMBERS) return null;
  return (
    <li className={nonProd ? "ghost ghost-split no-print" : "ghost no-print"}>
      <button type="button" onClick={() => onChange(addMember(topology, "secondary", "prod"))}>
        <span aria-hidden="true">+</span> {label}
      </button>
      {nonProd && (
        <button type="button" onClick={() => onChange(addMember(topology, "secondary", "nonprod"))}>
          <span aria-hidden="true">+</span> {label} (non-prod, {Math.round(NONPROD_PRICE_FACTOR * 100)}%)
        </button>
      )}
    </li>
  );
}

type VmBoxProps = EditProps & { readonly topology: Topology; readonly member: Member; readonly index: number };

function VmBox({ topology, member, index, onChange }: VmBoxProps) {
  const licenses = licensesForNode(member.ramGB);
  const capacity = licenses * NODE_RAM_CAP_GB;
  const nonProd = isNonProd(member);
  const tag = nonProd ? `${plural(licenses, "license")} x ${NONPROD_PRICE_FACTOR}` : plural(licenses, "license");
  return (
    <motion.li
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={spring}
      className={nonProd ? "vm vm-billed vm-nonprod" : "vm vm-billed"}
      aria-label={`${ROLE_LABEL[member.role]} VM, ${member.ramGB} GB, ${nonProd ? "non-prod, " : ""}${plural(licenses, "license")}`}
    >
      <div className="vm-head">
        <span className="vm-role">{ROLE_LABEL[member.role]}</span>
        <span className="vm-tag">{tag}</span>
      </div>
      <div className="vm-specs">
        {member.vcpu} vCPU, {member.ramGB} GB
      </div>
      <div className="ram-bar" aria-hidden="true">
        <motion.div
          className="ram-fill"
          initial={false}
          animate={{ width: `${Math.min(100, (member.ramGB / capacity) * 100)}%` }}
          transition={spring}
        />
        {licenses > 1 && (
          <div className="ram-notches">
            {Array.from({ length: licenses - 1 }, (_, i) => (
              <span key={i} style={{ left: `${((i + 1) / licenses) * 100}%` }} />
            ))}
          </div>
        )}
      </div>
      <div className="vm-foot">
        <span className="vm-chip">{nonProd ? "mongod · non-prod" : "mongod"}</span>
        {onChange && <Actions topology={topology} member={member} index={index} onChange={onChange} />}
      </div>
    </motion.li>
  );
}

function VmDiagram({ topology, onChange }: { readonly topology: Topology } & EditProps) {
  return (
    <ul className="vm-grid">
      <AnimatePresence initial={false}>
        {topology.members.map((member, index) => (
          <VmBox key={member.id} topology={topology} member={member} index={index} onChange={onChange} />
        ))}
      </AnimatePresence>
      {onChange && <AddGhost topology={topology} onChange={onChange} label="Add node" nonProd />}
    </ul>
  );
}

function K8sDiagram({ topology, onChange }: { readonly topology: Topology } & EditProps) {
  const workers = layoutWorkers(topology);
  const indexOf = (member: Member) => topology.members.findIndex((entry) => entry.id === member.id);
  return (
    <ul className="worker-grid">
      {workers.map((worker) => {
        const total = Math.max(worker.ramGB, worker.pods.reduce((sum, pod) => sum + pod.ramGB, 0));
        return (
          <motion.li key={worker.index} layout transition={spring} className="worker">
            <div className="worker-head">
              <span>Worker {worker.index + 1}</span>
              <span className="worker-ram">{worker.ramGB} GB, not licensed</span>
            </div>
            <div className="worker-bar" aria-hidden="true">
              {worker.pods.map((pod) => (
                <motion.div
                  key={pod.id}
                  layout
                  transition={spring}
                  className="seg-pod seg-counted"
                  style={{ width: `${(pod.ramGB / total) * 100}%` }}
                  title={`${ROLE_LABEL[pod.role]} pod, limit ${pod.ramGB} GB`}
                />
              ))}
              {worker.notCountedGB > 0 && (
                <div className="seg-rest" style={{ width: `${(worker.notCountedGB / total) * 100}%` }} />
              )}
            </div>
            <ul className="pod-list">
              {worker.pods.map((pod) => (
                <li key={pod.id} className="pod pod-counted">
                  <span>
                    {ROLE_LABEL[pod.role]}
                    <small> {pod.ramGB} GB</small>
                  </span>
                  <span className="pod-right">
                    <span className="vm-tag">counts</span>
                    {onChange && <Actions topology={topology} member={pod} index={indexOf(pod)} onChange={onChange} />}
                  </span>
                </li>
              ))}
            </ul>
            <p className="worker-note">
              {worker.overCommitted ? "Limits exceed worker RAM" : `${worker.notCountedGB} GB not counted`}
            </p>
          </motion.li>
        );
      })}
      {onChange && <AddGhost topology={topology} onChange={onChange} label="Add pod" />}
    </ul>
  );
}

const estateBadge = (topology: Topology): string | null => {
  const total = totalDeployments(topology);
  if (total <= 1) return null;
  const parts: string[] = [];
  if (topology.clusters > 0) parts.push(`${topology.clusters} prod`);
  if (topology.nonProdClusters > 0) parts.push(`${topology.nonProdClusters} non-prod`);
  const unit = topology.kind === "single" ? "deployments" : "replica sets";
  return `${parts.join(" + ")} ${unit}, ${plural(estateNodeCount(topology), "node")} total`;
};

type Props = { readonly topology: Topology } & EditProps;

export function LicenseBoundaryDiagram({ topology, onChange }: Props) {
  const badge = estateBadge(topology);
  return (
    <figure className="diagram" aria-label="License boundary diagram">
      <figcaption className="diagram-head">
        <span>
          {topology.hosting === "vm"
            ? "Each dashed VM box is a licensed unit"
            : "Only dashed pod memory limits count, not requests or worker RAM"}
        </span>
        {badge && <span className="chip chip-strong">{badge}</span>}
      </figcaption>
      {topology.hosting === "vm" ? (
        <VmDiagram topology={topology} onChange={onChange} />
      ) : (
        <K8sDiagram topology={topology} onChange={onChange} />
      )}
    </figure>
  );
}
