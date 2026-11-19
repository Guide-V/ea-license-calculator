import { PRESETS, type Preset } from "../presets";

type Props = { readonly activeId: string | null; readonly onPick: (preset: Preset) => void };

export function Presets({ activeId, onPick }: Props) {
  return (
    <div className="presets no-print" role="group" aria-label="Preset scenarios">
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          title={preset.blurb}
          className={preset.id === activeId ? "preset preset-on" : "preset"}
          onClick={() => onPick(preset)}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
