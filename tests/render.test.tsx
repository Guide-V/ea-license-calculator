import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "../src/App";
import { BreakEvenChart } from "../src/components/BreakEvenChart";
import { LicenseBoundaryDiagram } from "../src/components/LicenseBoundaryDiagram";
import { Scoreboard } from "../src/components/Scoreboard";
import { SideBySide } from "../src/components/SideBySide";
import { TopologyBuilder } from "../src/components/TopologyBuilder";
import { DEFAULT_PRICES } from "../src/calc/rules";
import { setHosting } from "../src/calc/topology";
import { PRESETS } from "../src/presets";

const preset = (id: string) => {
  const found = PRESETS.find((entry) => entry.id === id);
  if (!found) throw new Error(`Missing preset ${id}`);
  return found;
};

const noop = () => undefined;

describe("render smoke tests", () => {
  it("renders the app with the default preset and a score", () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("License calculator");
    expect(html).toContain("Indicative only");
    expect(html).toContain("Break-even");
    expect(html).toContain("Best deal");
    expect(html).toContain("Pin as baseline");
  });

  it("renders the VM diagram with free arbiters and tap controls", () => {
    const html = renderToStaticMarkup(<LicenseBoundaryDiagram topology={preset("rs-arbiter").topology} onChange={noop} />);
    expect(html).toContain("Free");
    expect(html).toContain("1 license");
    expect(html).toContain("Add node");
    expect(html).toContain("Arbiter");
  });

  it("hides editing controls when the diagram is read-only", () => {
    const html = renderToStaticMarkup(<LicenseBoundaryDiagram topology={preset("rs-arbiter").topology} />);
    expect(html).not.toContain("Add node");
  });

  it("renders the Kubernetes diagram with worker RAM not counted", () => {
    const html = renderToStaticMarkup(<LicenseBoundaryDiagram topology={preset("k8s-3pods").topology} onChange={noop} />);
    expect(html).toContain("Worker 1");
    expect(html).toContain("224 GB not counted");
    expect(html).toContain("Add pod");
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

  it("offers quick RAM chips", () => {
    const html = renderToStaticMarkup(<TopologyBuilder topology={preset("rs-small").topology} showK8s={false} onChange={noop} />);
    expect(html).toContain("512 GB");
    expect(html).toContain('aria-pressed="true"');
  });
});

describe("scoreboard", () => {
  it("shows the golden path score, winner, and meters for 3 x 16 GB", () => {
    const html = renderToStaticMarkup(<Scoreboard topology={preset("rs-small").topology} prices={DEFAULT_PRICES} />);
    expect(html).toContain("$250");
    expect(html).toContain("RAM pool");
    expect(html).toContain("Saves $50 (17%)");
    expect(html).toContain("1 x 256 GB");
    expect(html).toContain("Idle · 19%");
    expect(html).toContain("208 GB free in the pool");
  });

  it("shows an improvement chip only when below the pinned baseline", () => {
    const topology = preset("rs-small").topology;
    const below = renderToStaticMarkup(<Scoreboard topology={topology} prices={DEFAULT_PRICES} baseline={300} />);
    const above = renderToStaticMarkup(<Scoreboard topology={topology} prices={DEFAULT_PRICES} baseline={200} />);
    expect(below).toContain("$50 below baseline");
    expect(above).toContain("$50 above baseline");
    expect(above).not.toContain("below baseline");
  });

  it("disables the deal meter and locks per-node on Kubernetes", () => {
    const html = renderToStaticMarkup(<Scoreboard topology={preset("k8s-3pods").topology} prices={DEFAULT_PRICES} />);
    expect(html).toContain("No choice on Kubernetes");
    expect(html).toContain("Not available");
    expect(html).toContain("RAM pool only");
  });

  it("compact mode drops the pin button and badges", () => {
    const html = renderToStaticMarkup(<Scoreboard topology={preset("rs-small").topology} prices={DEFAULT_PRICES} compact />);
    expect(html).not.toContain("Pin as baseline");
    expect(html).not.toContain("Badges");
  });

  it("lists badges with locked and unlocked state in text", () => {
    const html = renderToStaticMarkup(<Scoreboard topology={preset("rs-arbiter").topology} prices={DEFAULT_PRICES} />);
    expect(html).toContain("Free rider");
    expect(html).toContain("(unlocked)");
    expect(html).toContain("(locked:");
  });
});

describe("chart", () => {
  it("shows the scrub slider and jump chip only when interactive", () => {
    const topology = preset("rs-small").topology;
    const interactive = renderToStaticMarkup(<BreakEvenChart topology={topology} prices={DEFAULT_PRICES} onRamChange={noop} />);
    const readOnly = renderToStaticMarkup(<BreakEvenChart topology={topology} prices={DEFAULT_PRICES} />);
    expect(interactive).toContain("Jump to break-even (86 GB)");
    expect(interactive).toContain("scrub-ram");
    expect(readOnly).not.toContain("Jump to break-even");
  });
});
