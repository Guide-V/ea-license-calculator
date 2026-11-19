import { fromSlider, SLIDER_STEPS, toSlider } from "../ui/scale";

type Props = {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly onChange: (value: number) => void;
};

/** Log-scale slider plus a number input, so any value is reachable. */
export function SizeControl({ id, label, unit, value, min, max, onChange }: Props) {
  return (
    <div className="size-control">
      <label htmlFor={`${id}-num`}>{label}</label>
      <input
        aria-label={`${label} slider`}
        type="range"
        min={0}
        max={SLIDER_STEPS}
        value={toSlider(value, min, max)}
        onChange={(event) => onChange(fromSlider(Number(event.target.value), min, max))}
      />
      <span className="num-wrap">
        <input
          id={`${id}-num`}
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next) && event.target.value !== "") onChange(next);
          }}
        />
        <span className="unit">{unit}</span>
      </span>
    </div>
  );
}
