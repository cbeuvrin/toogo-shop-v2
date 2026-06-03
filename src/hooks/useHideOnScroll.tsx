import { useEffect, useRef, useState } from "react";

/**
 * Hide-on-scroll header behavior shared by every storefront template.
 *
 * Returns `true` when the header should be hidden (user scrolled DOWN past the
 * threshold) and `false` when it should show (user scrolled UP, or is near the
 * top). Pair it with a sticky header and a `-translate-y-full` transform.
 *
 * @param threshold px to scroll before hiding kicks in (header stays put near top)
 * @param delta     min px of movement to count as a direction change (anti-jitter)
 */
export function useHideOnScroll(threshold = 80, delta = 6): boolean {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      const diff = y - lastY.current;
      if (Math.abs(diff) < delta) return; // ignore tiny scrolls

      if (y <= threshold) {
        setHidden(false); // always reveal near the top
      } else if (diff > 0) {
        setHidden(true); // scrolling down → hide
      } else {
        setHidden(false); // scrolling up → show
      }
      lastY.current = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold, delta]);

  return hidden;
}
