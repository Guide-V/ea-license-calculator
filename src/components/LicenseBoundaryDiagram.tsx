import { AnimatePresence, motion } from "framer-motion";
import { layoutWorkers } from "../calc/k8s";
import { isDataBearing } from "../calc/members";
import { licensesForNode } from "../calc/perNode";
import { MAX_MEMBERS, NODE_RAM_CAP_GB } from "../calc/rules";
import { addMember, removeMember, toggleArbiter } from "../calc/topology";
import type { Member, Role, Topology } from "../calc/types";
import { plural } from "../ui/format";

const ROLE_LABEL: Record<Role, string> = {
  primary: "Primary",
  secondary: "Secondary",
  hidden: "Hidden",
  delayed: "Delayed",
  arbiter: "Arbiter",
};

const spring = { type: "spring", stiffness: 220, damping: 28 } as const;

type EditProps = { readonly onChange?: (topology: Topology) => void };

type ActionsProps = {
  readonly topology: Topology;
  readonly member: Member;
  readonly index: number;
  readonly onChange: (topology: Topology) => void;
};

/** Tap actions for one member: toggle arbiter, drop. The first member is the anchor and stays put. */
function Actions({ topology, member, index, onChange }: ActionsProps) {
  if (topology.kind === "single" || index === 0) return null;
  return (
    <div className="node-actions no-print">
      <button
        type="button"
        className="mini"
        aria-pressed={member.role === "arbiter"}
        onClick={() => onChange(toggleArbiter(topology, member.id))}
      >
        Arbiter
      </button>
      <button
        type="button"
        className="mini mini-x"
        aria-label={`Remove ${ROLE_LABEL[member.role]} member ${index + 1}`}
        onClick={() => onChange(removeMember(topology, member.id))}
      >
        x
      </button>
    </div>
  );
}

function AddGhost({ topology, onChange, label }: { readonly topology: Topology; readonly onChange: (t: Topology) => void; readonly label: string }) {
  if (topology.kind === "single" || topology.members.length >= MAX_MEMBERS) return null;
  return (
    <li className="ghost no-print">
      <button type="button" onClick={() => onChange(addMember(topology, "secondary"))}>
        <span aria-hidden="true">+</span> {label}
      </button>
    </li>
  );
}

type VmBoxProps = EditProps & { readonly topology: Topology; readonly member: Member; readonly index: number };

function VmBox({ topology, member, index, onChange }: VmBoxProps) {
  const billed = isDataBearing(member);
  const licenses = licensesForNode(member.ramGB);
  const capacity = licenses * NODE_RAM_CAP_GB;
  return (
    <motion.li
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: billed ? 1 : 0.75, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={spring}
      className={billed ? "vm vm-billed" : "vm vm-free"}
      aria-label={`${ROLE_LABEL[member.role]} VM, ${member.ramGB} GB, ${billed ? plural(licenses, "license") : "not counted"}`}
    >
      <div className="vm-head">
        <span className="vm-role">{ROLE_LABEL[member.role]}</span>
        <span className="vm-tag">{billed ? plural(licenses, "license") : "Free"}</span>
      </div>
      <div className="vm-specs">
        {member.vcpu} vCPU, {member.ramGB} GB
      </div>
      <div className="ram-bar" aria-hidden="true">
        <motion.div
          className="ram-fill"
          initial={false}
          animate={{ width: `${billed ? Math.min(100, (member.ramGB / capacity) * 100) : 100}%` }}
          transition={spring}
        />
        {billed && licenses > 1 && (
          <div className="ram-notches">
            {Array.from({ length: licenses - 1 }, (_, i) => (
              <span key={i} style={{ left: `${((i + 1) / licenses) * 100}%` }} />
            ))}
          </div>
        )}
      </div>
      <div className="vm-foot">
        <span className="vm-chip">mongod</span>
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
      {onChange && <AddGhost topology={topology} onChange={onChange} label="Add node" />}
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
                  className={isDataBearing(pod) ? "seg-pod seg-counted" : "seg-pod seg-free"}
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
                <li key={pod.id} className={isDataBearing(pod) ? "pod pod-counted" : "pod pod-free"}>
                  <span>
                    {ROLE_LABEL[pod.role]}
                    <small> {pod.ramGB} GB</small>
                  </span>
                  <span className="pod-right">
                    <span className="vm-tag">{isDataBearing(pod) ? "counts" : "Free"}</span>
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

type Props = { readonly topology: Topology } & EditProps;

export function LicenseBoundaryDiagram({ topology, onChange }: Props) {
  return (
    <figure className="diagram" aria-label="License boundary diagram">
      <figcaption>
        {topology.hosting === "vm" ? "VMs: the dashed box is the license" : "Kubernetes: only dashed pod limits count"}
      </figcaption>
      {topology.hosting === "vm" ? (
        <VmDiagram topology={topology} onChange={onChange} />
      ) : (
        <K8sDiagram topology={topology} onChange={onChange} />
      )}
    </figure>
  );
}
