import { useState } from "react";
import { BreakEvenChart } from "./components/BreakEvenChart";
import { DecisionChecklist } from "./components/DecisionChecklist";
import { HostingToggle, type View } from "./components/HostingToggle";
import { Learn } from "./components/Learn";
import { LicenseBoundaryDiagram } from "./components/LicenseBoundaryDiagram";
import { PricingPanel } from "./components/PricingPanel";
import { PrintSummary } from "./components/PrintSummary";
import { Presets } from "./components/Presets";
import { Scoreboard } from "./components/Scoreboard";
import { SideBySide } from "./components/SideBySide";
import { TopologyBuilder } from "./components/TopologyBuilder";
import { DEFAULT_PRICES } from "./calc/rules";
import { setAllSizes, setHosting } from "./calc/topology";
import type { PlanningSignals, Prices, Topology } from "./calc/types";
import { DEFAULT_PRESET, type Preset } from "./presets";

const DISCLAIMER = "Indicative only. Prices are placeholders. Enter your MongoDB quote and confirm terms with your account team.";

const INITIAL_SIGNALS: PlanningSignals = {
  k8sPlanned: false,
  verticalGrowth: false,
  fleetSprawl: false,
};

export function App() {
  const [topology, setTopology] = useState<Topology>(DEFAULT_PRESET.topology);
  const [prices, setPrices] = useState<Prices>(DEFAULT_PRICES);
  const [view, setView] = useState<View>("vm");
  const [presetId, setPresetId] = useState<string | null>(DEFAULT_PRESET.id);
  const [baseline, setBaseline] = useState<number | null>(null);
  const [signals, setSignals] = useState<PlanningSignals>(INITIAL_SIGNALS);

  const pickPreset = (preset: Preset) => {
    setTopology(preset.topology);
    setPresetId(preset.id);
    setView(preset.topology.hosting === "k8s" ? "k8s" : "vm");
  };

  const edit = (next: Topology) => {
    setTopology(next);
    setPresetId(null);
  };

  const active = setHosting(topology, view === "k8s" ? "k8s" : "vm");
  const chartTopology = view === "both" ? setHosting(topology, "vm") : active;
  const chartScopeNote =
    view === "both" ? "Showing VM break-even curve (Kubernetes is RAM pool only)." : undefined;

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">MongoDB Enterprise Advanced</p>
          <h1>License calculator</h1>
          <p className="lede">Compare per-node and RAM pool licensing across VMs, Kubernetes, and multi-cluster estates.</p>
        </div>
        <button type="button" className="btn btn-hero no-print" onClick={() => window.print()}>
          Export PDF
        </button>
      </header>

      <p className="banner" role="note">
        {DISCLAIMER}
      </p>

      <Learn />

      <section className="section" aria-labelledby="calc-title">
        <h2 id="calc-title" className="no-print">
          Configure &amp; compare
        </h2>
        <h2 className="print-only">Result</h2>
        <Presets activeId={presetId} onPick={pickPreset} />

        <div className="calc-grid">
          <div className="calc-left">
            <TopologyBuilder topology={topology} showK8s={view !== "vm"} onChange={edit} />
            <PricingPanel prices={prices} onChange={setPrices} />
          </div>

          <div className="calc-right">
            <div className="no-print">
              <HostingToggle view={view} onChange={setView} />
            </div>
            {view === "both" ? (
              <SideBySide topology={topology} prices={prices} onChange={edit} />
            ) : (
              <>
                <Scoreboard
                  topology={active}
                  prices={prices}
                  baseline={baseline}
                  onPin={setBaseline}
                  onClearBaseline={() => setBaseline(null)}
                />
                <LicenseBoundaryDiagram topology={active} onChange={edit} />
              </>
            )}
          </div>
        </div>
      </section>

      <PrintSummary topology={topology} prices={prices} view={view} signals={signals} />

      <BreakEvenChart
        topology={chartTopology}
        prices={prices}
        scopeNote={chartScopeNote}
        onRamChange={(ramGB) => edit(setAllSizes(topology, { ramGB }))}
      />

      <DecisionChecklist topology={active} prices={prices} signals={signals} onChange={setSignals} />

      <footer className="footer">
        <p>{DISCLAIMER}</p>
      </footer>
    </div>
  );
}
