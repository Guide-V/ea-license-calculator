import { PRESETS, type Preset } from "../presets";

type Props = { readonly activeId: string | null; readonly onPick: (preset: Preset) => void };

export function Presets({ activeId, onPick }: Props) {
  const active = PRESETS.find((preset) => preset.id === activeId);
  return (
    <div className="presets-wrap no-print">
      <div className="presets" role="group" aria-label="Preset scenarios">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            title={preset.blurb}
            aria-pressed={preset.id === activeId}
            className={preset.id === activeId ? "preset preset-on" : "preset"}
            onClick={() => onPick(preset)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {active && <p className="preset-takeaway">{active.blurb}</p>}
    </div>
  );
}
