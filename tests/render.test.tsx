import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "../src/App";
import { BreakEvenChart } from "../src/components/BreakEvenChart";
import { DecisionChecklist } from "../src/components/DecisionChecklist";
import { LicenseBoundaryDiagram } from "../src/components/LicenseBoundaryDiagram";
import { Scoreboard } from "../src/components/Scoreboard";
import { SideBySide } from "../src/components/SideBySide";
import { TopologyBuilder } from "../src/components/TopologyBuilder";
import { DEFAULT_PRICES, MAX_MEMBERS } from "../src/calc/rules";
import { addMember, setHosting, singleNode, updateMember } from "../src/calc/topology";
import { PRESETS } from "../src/presets";

const preset = (id: string) => {
  const found = PRESETS.find((entry) => entry.id === id);
  if (!found) throw new Error(`Missing preset ${id}`);
  return found;
};

const noop = () => undefined;

describe("render smoke tests", () => {
  it("renders the app with the default preset, comparison table, ratio rule, and decision summary", () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("License calculator");
    expect(html).toContain("Indicative only");
    expect(html).toContain("Break-even");
    expect(html).toContain("Best deal");
    expect(html).toContain("Pin as baseline");
    expect(html).toContain("Per-node vs pool");
    expect(html).toContain("mongos, config servers, Ops Manager");
    expect(html).toContain("pool-to-node ratio");
    expect(html).toContain("6.4x");
    expect(html).toContain("~40 GB");
    expect(html).toContain("Decision summary");
    expect(html).toContain("Beyond Day-1 cost");
    expect(html).toContain("MongoDB Enterprise Advanced pricing guidance");
    expect(html.toLowerCase()).not.toContain("internal");
    expect(html).not.toContain("Pricing Guide");
    expect(html).not.toContain("Licensing Clarification");
    // Active preset blurb is visible text, not only a hover tooltip
    expect(html).toContain("Four small replica sets (12 nodes, 192 GB total)");
  });

  it("renders the VM diagram with tap controls, environment count badge, and no arbiter option", () => {
    const html = renderToStaticMarkup(<LicenseBoundaryDiagram topology={preset("rs-fleet").topology} onChange={noop} />);
    expect(html).toContain("1 license");
    expect(html).toContain("4 prod replica sets, 12 nodes total");
    expect(html).toContain("Add node");
    expect(html).toContain("Add node (non-prod, 50%)");
    expect(html).toContain("Non-prod");
    expect(html).not.toContain("Arbiter");
  });

  it("marks non-prod VMs and shows prod and non-prod licenses on the scoreboard", () => {
    const estateTopology = preset("estate-nonprod").topology;
    const score = renderToStaticMarkup(<Scoreboard topology={estateTopology} prices={DEFAULT_PRICES} />);
    expect(score).toContain("6 prod + 9 non-prod");
    expect(score).toContain("$1,050");

    const perMemberNonProd = updateMember(preset("rs-single").topology, 3, { env: "nonprod" });
    const diagram = renderToStaticMarkup(<LicenseBoundaryDiagram topology={perMemberNonProd} />);
    expect(diagram).toContain("mongod · non-prod");
    expect(diagram).toContain("1 license x 0.5");
  });

  it("offers only a plain add button for Kubernetes pods", () => {
    const html = renderToStaticMarkup(<LicenseBoundaryDiagram topology={preset("k8s-3pods").topology} onChange={noop} />);
    expect(html).toContain("Add pod");
    expect(html).not.toContain("non-prod, 50%");
  });

  it("hides editing controls when the diagram is read-only", () => {
    const html = renderToStaticMarkup(<LicenseBoundaryDiagram topology={preset("rs-single").topology} />);
    expect(html).not.toContain("Add node");
  });

  it("renders the Kubernetes diagram with worker RAM not counted", () => {
    const html = renderToStaticMarkup(<LicenseBoundaryDiagram topology={preset("k8s-3pods").topology} onChange={noop} />);
    expect(html).toContain("Worker 1");
    expect(html).toContain("224 GB not counted");
    expect(html).toContain("Add pod");
    expect(html).toContain("Only dashed pod memory limits count, not requests or worker RAM");
  });

  it("renders side by side with per-node unavailable on Kubernetes", () => {
    const html = renderToStaticMarkup(<SideBySide topology={preset("rs-large").topology} prices={DEFAULT_PRICES} />);
    expect(html).toContain("On virtual machines");
    expect(html).toContain("On Kubernetes");
    expect(html).toContain("Not available");
    expect(html).toContain("RAM pool only");
  });

  it("shows Kubernetes worker controls only when requested", () => {
    const topology = setHosting(preset("k8s-3pods").topology, "k8s");
    const withK8s = renderToStaticMarkup(<TopologyBuilder topology={topology} showK8s onChange={noop} />);
    const withoutK8s = renderToStaticMarkup(<TopologyBuilder topology={topology} showK8s={false} onChange={noop} />);
    expect(withK8s).toContain("Kubernetes workers");
    expect(withoutK8s).not.toContain("Kubernetes workers");
  });

  it("offers quick RAM chips and environment count steppers", () => {
    const html = renderToStaticMarkup(<TopologyBuilder topology={preset("rs-fleet").topology} showK8s={false} onChange={noop} />);
    expect(html).toContain("512 GB");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Environment count (4 replica sets, 12 nodes)");
  });

  it("sizes the members slider to MAX_MEMBERS and the real count", () => {
    let topology = preset("rs-single").topology;
    while (topology.members.length < 20) topology = addMember(topology);
    const html = renderToStaticMarkup(<TopologyBuilder topology={topology} showK8s={false} onChange={noop} />);
    expect(html).toContain('aria-label="Members slider"');
    expect(html).toContain(`max="${MAX_MEMBERS}"`);
    expect(html).not.toContain('max="15"');
    expect(html).toMatch(/aria-label="Members slider"[^>]*value="20"/);
  });

  it("offers no arbiter role or button in the builder", () => {
    const html = renderToStaticMarkup(<TopologyBuilder topology={preset("rs-single").topology} showK8s={false} onChange={noop} />);
    expect(html.toLowerCase()).not.toContain("arbiter");
    expect(html).toContain("Add non-prod member");
  });
});

describe("scoreboard", () => {
  it("shows the golden path score, winner, reason, and meters for the 4-RS fleet", () => {
    const html = renderToStaticMarkup(<Scoreboard topology={preset("rs-fleet").topology} prices={DEFAULT_PRICES} />);
    expect(html).toContain("$640");
    expect(html).toContain("RAM pool");
    expect(html).toContain("Saves $560 (47%)");
    expect(html).toContain("1 x 256 GB");
    expect(html).toContain("Good · 75%");
    expect(html).toContain("64 GB free in the pool (fits 1 more deployment at $0)");
    expect(html).toContain("12 nodes averaging 16 GB share 1 256 GB pool license");
  });

  it("renders a 256 GB step-cliff alert when a node just crosses 256 GB", () => {
    const html = renderToStaticMarkup(<Scoreboard topology={singleNode(8, 260)} prices={DEFAULT_PRICES} />);
    expect(html).toContain("Each 260 GB node exceeds the 256 GB cap");
    expect(html).toContain("Trimming to 256 GB saves 1 license per node");
  });

  it("shows an improvement chip only when below the pinned baseline", () => {
    const topology = preset("rs-fleet").topology;
    const below = renderToStaticMarkup(<Scoreboard topology={topology} prices={DEFAULT_PRICES} baseline={1200} />);
    const above = renderToStaticMarkup(<Scoreboard topology={topology} prices={DEFAULT_PRICES} baseline={500} />);
    expect(below).toContain("$560 below baseline");
    expect(above).toContain("$140 above baseline");
    expect(above).not.toContain("below baseline");
  });

  it("disables the deal meter and locks per-node on Kubernetes", () => {
    const html = renderToStaticMarkup(<Scoreboard topology={preset("k8s-3pods").topology} prices={DEFAULT_PRICES} />);
    expect(html).toContain("No choice on Kubernetes");
    expect(html).toContain("Not available");
    expect(html).toContain("RAM pool only");
    expect(html).toContain("Kubernetes deployments require RAM pool licensing");
  });

  it("compact mode drops the pin button and badges", () => {
    const html = renderToStaticMarkup(<Scoreboard topology={preset("rs-fleet").topology} prices={DEFAULT_PRICES} compact />);
    expect(html).not.toContain("Pin as baseline");
    expect(html).not.toContain("Badges");
  });

  it("lists badges with locked and unlocked state in text", () => {
    const html = renderToStaticMarkup(<Scoreboard topology={preset("rs-large").topology} prices={DEFAULT_PRICES} />);
    expect(html).not.toContain("Free rider");
    expect(html).toContain("(unlocked)");
    expect(html).toContain("(locked:");
  });
});

describe("chart", () => {
  it("shows the scrub slider and jump chip only when interactive on VMs", () => {
    const topology = preset("rs-fleet").topology;
    const interactive = renderToStaticMarkup(<BreakEvenChart topology={topology} prices={DEFAULT_PRICES} onRamChange={noop} />);
    const readOnly = renderToStaticMarkup(<BreakEvenChart topology={topology} prices={DEFAULT_PRICES} />);
    expect(interactive).toContain("Jump to break-even (22 GB)");
    expect(interactive).toContain("scrub-ram");
    expect(readOnly).not.toContain("Jump to break-even");
  });

  it("hides per-node win regions and break-even jumps on Kubernetes", () => {
    const html = renderToStaticMarkup(
      <BreakEvenChart topology={preset("k8s-3pods").topology} prices={DEFAULT_PRICES} onRamChange={noop} />,
    );
    expect(html).toContain("RAM pool cost curve (Kubernetes)");
    expect(html).toContain("RAM pool only on Kubernetes");
    expect(html).toContain("Next 256 GB pool step at 86 GB per pod");
    expect(html).not.toContain("Jump to break-even");
    expect(html).not.toContain("Per-node,");
  });

  it("explains the You dot when data-bearing members differ in size", () => {
    const even = preset("rs-single").topology;
    const mixed = {
      ...even,
      members: even.members.map((member, index) => ({ ...member, ramGB: index === 0 ? 512 : 16 })),
    };
    const mixedHtml = renderToStaticMarkup(<BreakEvenChart topology={mixed} prices={DEFAULT_PRICES} />);
    const evenHtml = renderToStaticMarkup(<BreakEvenChart topology={even} prices={DEFAULT_PRICES} />);
    expect(mixedHtml).toContain("equal-size members");
    expect(mixedHtml).toContain("The dot shows the real cost.");
    expect(evenHtml).not.toContain("equal-size members");
  });
});

describe("decision checklist", () => {
  it("renders strategic notes for checked roadmap signals and free components", () => {
    const html = renderToStaticMarkup(
      <DecisionChecklist
        topology={preset("rs-fleet").topology}
        prices={DEFAULT_PRICES}
        signals={{ k8sPlanned: true, verticalGrowth: true, fleetSprawl: true }}
        onChange={noop}
      />,
    );
    expect(html).toContain("Kubernetes migration ahead");
    expect(html).toContain("Growing RAM per node");
    expect(html).toContain("Growing to many small clusters");
    expect(html).toContain("mongos query routers");
    expect(html).toContain("Config servers (CSRS)");
    expect(html).toContain("Ops Manager servers");
  });
});
