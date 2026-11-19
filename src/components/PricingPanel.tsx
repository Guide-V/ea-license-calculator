import { DEFAULT_PRICES, POOL_LICENSE_GB } from "../calc/rules";
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
      <button type="button" className="btn" onClick={() => onChange(DEFAULT_PRICES)}>
        Reset
      </button>
    </details>
  );
}
