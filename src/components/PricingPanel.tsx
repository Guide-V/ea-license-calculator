import { poolBreakEvenGB } from "../calc/ramPool";
import { DEFAULT_PRICES, NONPROD_PRICE_FACTOR, POOL_LICENSE_GB, PRICE_RATIO_PRESETS } from "../calc/rules";
import type { Prices } from "../calc/types";

type Props = { readonly prices: Prices; readonly onChange: (prices: Prices) => void };

const toNumber = (raw: string, fallback: number): number => {
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

export function PricingPanel({ prices, onChange }: Props) {
  const ratio = prices.perNodeLicense > 0 ? prices.poolLicense / prices.perNodeLicense : 0;
  const breakEven = poolBreakEvenGB(prices);
  const breakEvenText = Number.isFinite(breakEven) ? `~${Math.round(breakEven)} GB` : "any size";

  return (
    <details className="panel no-print pricing" open>
      <summary>
        <h2>Prices &amp; ratio (placeholders)</h2>
      </summary>

      <p className="ratio-rule">
        At a <strong>{ratio > 0 ? `${ratio.toFixed(1)}x` : "n/a"}</strong> pool-to-node ratio, a full {POOL_LICENSE_GB} GB
        pool beats per-node below <strong>{breakEvenText}</strong> average RAM per prod node. Enter your MongoDB quote below.
      </p>

      <div className="quick" role="group" aria-label="Price ratio presets">
        {PRICE_RATIO_PRESETS.map((preset) => {
          const active =
            prices.perNodeLicense === preset.perNodeLicense && prices.poolLicense === preset.poolLicense;
          return (
            <button
              key={preset.id}
              type="button"
              className={active ? "quick-chip quick-on" : "quick-chip"}
              aria-pressed={active}
              onClick={() =>
                onChange({
                  ...prices,
                  perNodeLicense: preset.perNodeLicense,
                  poolLicense: preset.poolLicense,
                })
              }
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <div className="price-grid">
        <label>
          Currency
          <input
            type="text"
            maxLength={4}
            value={prices.currency}
            onChange={(event) => onChange({ ...prices, currency: event.target.value })}
          />
        </label>
        <label>
          Per-node license / year
          <input
            type="number"
            min={0}
            value={prices.perNodeLicense}
            onChange={(event) => onChange({ ...prices, perNodeLicense: toNumber(event.target.value, prices.perNodeLicense) })}
          />
        </label>
        <label>
          RAM pool license ({POOL_LICENSE_GB} GB) / year
          <input
            type="number"
            min={0}
            value={prices.poolLicense}
            onChange={(event) => onChange({ ...prices, poolLicense: toNumber(event.target.value, prices.poolLicense) })}
          />
        </label>
      </div>
      <p className="hint">
        Non-prod node license: {Math.round(NONPROD_PRICE_FACTOR * 100)}% of the per-node price ({prices.currency}
        {Math.round(prices.perNodeLicense * NONPROD_PRICE_FACTOR).toLocaleString("en-US")}). The RAM pool counts prod and
        non-prod RAM the same.
      </p>
      <button type="button" className="btn" onClick={() => onChange(DEFAULT_PRICES)}>
        Reset
      </button>
    </details>
  );
}
