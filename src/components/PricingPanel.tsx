import { DEFAULT_PRICES, NONPROD_PRICE_FACTOR, POOL_LICENSE_GB } from "../calc/rules";
import type { Prices } from "../calc/types";

type Props = { readonly prices: Prices; readonly onChange: (prices: Prices) => void };

const toNumber = (raw: string, fallback: number): number => {
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

export function PricingPanel({ prices, onChange }: Props) {
  return (
    <details className="panel no-print pricing">
      <summary>
        <h2>Prices (placeholders)</h2>
      </summary>
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
