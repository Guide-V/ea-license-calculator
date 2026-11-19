import { motion } from "framer-motion";
import { getIntensity, type Level } from "../game/presentation";

type Props = {
  readonly label: string;
  readonly value: number;
  readonly levels: readonly Level[];
  readonly detail?: string;
  readonly disabledText?: string;
};

/** Segmented intensity meter. The level is also spelled out, so color is never the only signal. */
export function Meter({ label, value, levels, detail, disabledText }: Props) {
  const segments = levels.length - 1;
  const level = getIntensity(value, levels);
  return (
    <div className={disabledText ? "meter meter-off" : `meter meter-${level.id}`}>
      <div className="meter-head">
        <span>{label}</span>
        <strong>{disabledText ?? `${level.label} · ${Math.round(value)}%`}</strong>
      </div>
      <div className="meter-bar" aria-hidden="true">
        {Array.from({ length: segments }, (_, i) => (
          <motion.span
            key={i}
            className={!disabledText && i < level.index ? "seg-lit" : "seg-dim"}
            initial={false}
            animate={{ scaleY: !disabledText && i < level.index ? 1 : 0.6 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: i * 0.04 }}
          />
        ))}
      </div>
      {detail && !disabledText && <p className="meter-detail">{detail}</p>}
    </div>
  );
}
