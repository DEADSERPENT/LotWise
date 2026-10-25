import { useEffect, useRef, useState } from "react";

const reducedMotion = () => typeof window === "undefined" || !window.matchMedia || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Eases a number from its previous value to `target`. Skips straight to the value when motion is reduced. */
export function useCountUp(target: number, ms = 800) {
  const instant = reducedMotion();
  const [value, setValue] = useState(instant ? target : 0);
  const from = useRef(instant ? target : 0);

  useEffect(() => {
    if (instant) return;
    const start = performance.now();
    const base = from.current;
    let raf = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / ms);
      const next = Math.round(base + (target - base) * (1 - (1 - t) ** 3));
      from.current = next;
      setValue(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [target, ms, instant]);

  return instant ? target : value;
}
