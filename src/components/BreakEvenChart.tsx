import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { breakEvenPoints, costCurve, winRegions } from "../calc/breakEven";
import { evaluate } from "../calc/evaluate";
import { billableMembers, isNonProd } from "../calc/members";
import { MAX_RAM_GB } from "../calc/rules";
import type { Prices, Topology } from "../calc/types";
import { nearestCrossover } from "../game/presentation";
import { gb, money } from "../ui/format";
import { Segmented } from "./Segmented";

const COLORS = {
  grid: "#1F3A47",
  axis: "#C1C7CD",
  perNode: "#FAFBFC",
  pool: "#00ED64",
  marker: "#B1FF05",
} as const;

const RANGES = [128, 256, 512, 1024] as const;
type RangeKey = `${(typeof RANGES)[number]}`;

type Props = {
  readonly topology: Topology;
  readonly prices: Prices;
  /** Sets every data-bearing member to this RAM. Makes the chart interactive. */
  readonly onRamChange?: (ramGB: number) => void;
};

/** Maps a pointer position over the plot area to RAM per node (x domain is 0..maxGB). */
const pickFromPointer = (
  event: { readonly clientX: number },
  wrap: Element,
  maxGB: number,
  setRam: (ramGB: number) => void,
): void => {
  const grid = wrap.querySelector(".recharts-cartesian-grid");
  if (!grid) return;
  const rect = grid.getBoundingClientRect();
  const t = (event.clientX - rect.left) / rect.width;
  if (rect.width > 0 && t >= 0 && t <= 1) setRam(t * maxGB);
};

const modelLabel = (winner: string): string => (winner === "ramPool" ? "RAM pool" : "Per-node");

export function BreakEvenChart({ topology, prices, onRamChange }: Props) {
  const [chosen, setChosen] = useState<RangeKey>("256");
  const members = billableMembers(topology);
  const count = members.length;
  const avgRam = count === 0 ? 0 : members.reduce((sum, m) => sum + m.ramGB, 0) / count;
  const perNodeAvailable = topology.hosting === "vm";

  const nonProdCount = members.filter(isNonProd).length;
  const full = useMemo(() => costCurve(count, prices, { maxGB: 1024, nonProdCount }), [count, prices, nonProdCount]);
  const crossovers = useMemo(() => breakEvenPoints(full), [full]);
  const regions = useMemo(() => winRegions(full), [full]);

  const fitted = RANGES.find((range) => range >= avgRam * 1.25) ?? 1024;
  const maxGB = Math.max(Number(chosen), fitted);
  const data = full.filter((point) => point.ramGB <= maxGB);
  const visibleRegions = regions
    .map((region, i) => ({ ...region, toGB: regions[i + 1]?.fromGB ?? region.toGB }))
    .filter((region) => region.fromGB <= maxGB)
    .map((region) => ({ ...region, toGB: Math.min(region.toGB, maxGB) }));
  const decided = regions.filter((region) => region.winner !== "tie");

  const evaluation = evaluate(topology, prices);
  const firstRam = members[0]?.ramGB;
  const sizesDiffer = members.length > 1 && members.some((member) => member.ramGB !== firstRam);
  const dotX = Math.min(Math.max(1, avgRam), maxGB);
  const nearest = nearestCrossover(avgRam, crossovers);
  const fmt = (value: number) => money(value, prices.currency);
  const setRam = (ramGB: number) => onRamChange?.(Math.min(MAX_RAM_GB, Math.max(1, Math.round(ramGB))));

  return (
    <section className="panel chart-panel" aria-labelledby="chart-title">
      <div className="chart-head">
        <div>
          <h2 id="chart-title">Break-even</h2>
          <p className="hint on-dark">
            {count} {count === 1 ? "node" : "nodes"}. {onRamChange ? "Click the chart or drag the slider." : "Cost as RAM per node grows."}
          </p>
        </div>
        <div className="no-print">
          <Segmented<RangeKey>
            label="Chart range"
            value={chosen}
            onChange={setChosen}
            options={RANGES.map((range) => ({ value: `${range}` as RangeKey, label: `${range} GB` }))}
          />
        </div>
      </div>

      <div
        className={onRamChange ? "chart-wrap chart-live" : "chart-wrap"}
        onPointerDown={onRamChange ? (event) => pickFromPointer(event, event.currentTarget, maxGB, setRam) : undefined}
        onPointerMove={
          onRamChange
            ? (event) => event.buttons === 1 && pickFromPointer(event, event.currentTarget, maxGB, setRam)
            : undefined
        }
      >
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={data} margin={{ top: 24, right: 24, bottom: 24, left: 8 }}>
            <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
            {visibleRegions.map((region) =>
              region.winner === "tie" ? null : (
                <ReferenceArea
                  key={`${region.fromGB}-${region.winner}`}
                  x1={region.fromGB}
                  x2={region.toGB}
                  fill={region.winner === "ramPool" ? COLORS.pool : COLORS.perNode}
                  fillOpacity={region.winner === "ramPool" ? 0.14 : 0.06}
                  ifOverflow="hidden"
                />
              ),
            )}
            <XAxis
              dataKey="ramGB"
              type="number"
              domain={[0, maxGB]}
              ticks={Array.from({ length: 9 }, (_, i) => (i * maxGB) / 8)}
              allowDataOverflow
              stroke={COLORS.axis}
              tick={{ fill: COLORS.axis }}
              label={{ value: "RAM per node (GB)", position: "insideBottom", offset: -12, fill: COLORS.axis }}
            />
            <YAxis stroke={COLORS.axis} tick={{ fill: COLORS.axis }} tickFormatter={(value: number) => fmt(value)} width={72} />
            <Tooltip
              contentStyle={{ background: "#001E2B", border: "1px solid #B1FF05", color: "#FAFBFC" }}
              labelFormatter={(label) => `${label} GB per node`}
              formatter={(value, name) => [fmt(Number(value)), name === "perNode" ? "Per-node" : "RAM pool"]}
            />
            <Line
              dataKey="perNode"
              name="perNode"
              type="stepAfter"
              stroke={COLORS.perNode}
              strokeWidth={2.5}
              strokeDasharray={perNodeAvailable ? undefined : "6 6"}
              strokeOpacity={perNodeAvailable ? 1 : 0.45}
              dot={false}
              isAnimationActive={false}
            />
            <Line dataKey="ramPool" name="ramPool" type="stepAfter" stroke={COLORS.pool} strokeWidth={2.5} dot={false} isAnimationActive={false} />
            {crossovers
              .filter((point) => point.ramGB <= maxGB)
              .map((point) => (
                <ReferenceLine
                  key={point.ramGB}
                  x={point.ramGB}
                  stroke={COLORS.marker}
                  strokeDasharray="4 4"
                  label={{ value: `${point.ramGB} GB`, position: "top", fill: COLORS.marker }}
                />
              ))}
            {perNodeAvailable && evaluation.perNode.available && (
              <ReferenceDot x={dotX} y={evaluation.perNode.cost} r={6} fill={COLORS.perNode} stroke="#001E2B" strokeWidth={2} />
            )}
            <ReferenceDot
              x={dotX}
              y={evaluation.pool.cost}
              r={7}
              fill={COLORS.marker}
              stroke="#001E2B"
              strokeWidth={2}
              label={{ value: "You", position: "bottom", fill: COLORS.marker }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {sizesDiffer && (
        <p className="hint on-dark chart-mixed-note">
          Members differ in size. The curve assumes equal-size members at the average RAM. The dot shows the real cost.
        </p>
      )}

      {onRamChange && (
        <div className="scrub no-print">
          <label htmlFor="scrub-ram">RAM per node: {gb(avgRam)}</label>
          <input
            id="scrub-ram"
            type="range"
            min={1}
            max={maxGB}
            value={Math.min(maxGB, Math.round(avgRam))}
            onChange={(event) => setRam(Number(event.target.value))}
          />
        </div>
      )}

      <ul className="chart-legend">
        <li>
          <span className="key key-node" /> Per-node{perNodeAvailable ? "" : " (VMs only)"}
        </li>
        <li>
          <span className="key key-pool" /> RAM pool
        </li>
        <li>
          <span className="key key-here" /> You, {gb(avgRam)}
        </li>
      </ul>

      <div className="chip-row">
        {decided.slice(0, 4).map((region) => (
          <span key={`${region.fromGB}-${region.winner}`} className={region.winner === "ramPool" ? "chip chip-pool" : "chip"}>
            {modelLabel(region.winner)}: {region.fromGB} to {region.toGB} GB
          </span>
        ))}
        {onRamChange && nearest && (
          <button type="button" className="chip chip-hero chip-btn no-print" onClick={() => setRam(nearest.ramGB)}>
            Jump to break-even ({nearest.ramGB} GB)
          </button>
        )}
      </div>
    </section>
  );
}
