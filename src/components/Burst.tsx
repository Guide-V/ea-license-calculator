import type { CSSProperties } from "react";

const PARTICLES = 14;

/** Small CSS particle burst. Remount with a new `burstKey` to replay. */
export function Burst({ burstKey }: { readonly burstKey: number }) {
  if (burstKey === 0) return null;
  return (
    <span key={burstKey} className="burst no-print" aria-hidden="true">
      {Array.from({ length: PARTICLES }, (_, i) => (
        <i
          key={i}
          style={
            {
              "--angle": `${(360 / PARTICLES) * i}deg`,
              "--dist": `${46 + (i % 3) * 16}px`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}
