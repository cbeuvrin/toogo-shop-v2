import React from 'react';

/**
 * Classic line-based hamburger button — the icon everyone already knows.
 * Configurable count (2..5), thickness and overall size. On open, the
 * outermost two lines rotate to form an X and any middle lines fade out.
 */

// Kept as an alias for compatibility with stored values from earlier iterations.
export type HamburgerVariant = 'classic' | 'dots' | 'plus' | 'grid';

interface HamburgerButtonProps {
  isOpen: boolean;
  onClick: () => void;
  /** Number of horizontal bars in the closed state (2..5). Defaults to 3. */
  count?: number;
  /** Bar height in px. Defaults to 2. */
  thickness?: number;
  color?: string;
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export const HamburgerButton = ({
  isOpen,
  onClick,
  count = 3,
  thickness = 2,
  color = 'currentColor',
  size = 24,
  className = '',
  ariaLabel = 'Abrir menú',
}: HamburgerButtonProps) => {
  // Clamp count into a sensible range so previous data (or accidental values)
  // can't break the layout.
  const n = Math.max(2, Math.min(5, count || 3));
  const lineWidth = '70%';   // distance from each side as a fraction of the box

  // Build vertical positions evenly between ~20% and ~80% of the box.
  const positions = Array.from({ length: n }, (_, i) => {
    if (n === 1) return 50;
    const start = 22;
    const end = 78;
    return start + (i * (end - start)) / (n - 1);
  });

  // For the open state, top line becomes one diagonal of the X, bottom becomes
  // the other. Middle bars fade out. Translate each end-line toward the center.
  const centerY = 50;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-expanded={isOpen}
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <span aria-hidden="true" style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}>
        {positions.map((topPct, i) => {
          const isFirst = i === 0;
          const isLast = i === n - 1;
          const baseStyle: React.CSSProperties = {
            position: 'absolute',
            left: `${(100 - parseInt(lineWidth)) / 2}%`,
            right: `${(100 - parseInt(lineWidth)) / 2}%`,
            height: thickness,
            backgroundColor: color,
            top: `${topPct}%`,
            marginTop: -thickness / 2,
            transition: 'transform 260ms ease, opacity 200ms ease',
            transformOrigin: 'center',
          };
          let transform = 'none';
          let opacity = 1;
          if (isOpen) {
            if (isFirst) {
              // Move down to center then rotate 45°.
              const dy = ((centerY - topPct) / 100) * size;
              transform = `translateY(${dy}px) rotate(45deg)`;
            } else if (isLast) {
              const dy = ((centerY - topPct) / 100) * size;
              transform = `translateY(${dy}px) rotate(-45deg)`;
            } else {
              opacity = 0;
            }
          }
          return (
            <span
              key={i}
              style={{ ...baseStyle, transform, opacity }}
            />
          );
        })}
      </span>
    </button>
  );
};
