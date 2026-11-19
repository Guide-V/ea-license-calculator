import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect } from "react";

type Props = { readonly value: number; readonly format: (value: number) => string };

/** Counts up to `value`. Jumps straight to it for reduced motion and for print. */
export function AnimatedNumber({ value, format }: Props) {
  const reduce = useReducedMotion();
  const motionValue = useMotionValue(value);
  const text = useTransform(motionValue, (latest) => format(latest));

  useEffect(() => {
    if (reduce) {
      motionValue.set(value);
      return undefined;
    }
    const controls = animate(motionValue, value, { duration: 0.5, ease: "easeOut" });
    const snap = () => motionValue.set(value);
    window.addEventListener("beforeprint", snap);
    return () => {
      controls.stop();
      window.removeEventListener("beforeprint", snap);
    };
  }, [value, reduce, motionValue]);

  return <motion.span>{text}</motion.span>;
}
