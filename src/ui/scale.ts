/**
 * Log-scale mapping for sliders, so 8 vs 16 vs 32 GB are easy to hit
 * while 512 or 1024 GB stay reachable on the same slider.
 */
export const SLIDER_STEPS = 1000;

export const toSlider = (value: number, min: number, max: number): number => {
  const clamped = Math.min(max, Math.max(min, value));
  return Math.round((Math.log(clamped / min) / Math.log(max / min)) * SLIDER_STEPS);
};

export const fromSlider = (position: number, min: number, max: number): number =>
  Math.round(min * Math.pow(max / min, position / SLIDER_STEPS));
