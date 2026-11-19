import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

/**
 * Returns a counter that increases when cost goes DOWN (a genuine improvement).
 * Debounced, so rapid slider drags only celebrate where the drag settles lower.
 * Never fires for an increase and never fires with reduced motion.
 */
export function useImprovementBurst(cost: number): number {
  const reduce = useReducedMotion();
  const previous = useRef(cost);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const improved = cost < previous.current;
    previous.current = cost;
    if (!improved || reduce) return undefined;
    const timer = setTimeout(() => setCount((value) => value + 1), 180);
    return () => clearTimeout(timer);
  }, [cost, reduce]);

  return count;
}

type Winner = "perNode" | "ramPool" | "tie";

/** Message for a few seconds when the cheaper model flips. */
export function useWinnerFlip(winner: Winner, enabled: boolean, label: (winner: Winner) => string): string | null {
  const previous = useRef<Winner>(winner);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = winner;
    const flipped = enabled && before !== "tie" && winner !== "tie" && before !== winner;
    if (!flipped) return undefined;
    setMessage(`${label(winner)} takes the lead`);
    const timer = setTimeout(() => setMessage(null), 2600);
    return () => clearTimeout(timer);
  }, [winner, enabled, label]);

  return message;
}
