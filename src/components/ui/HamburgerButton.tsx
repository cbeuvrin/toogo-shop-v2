import React from 'react';

/**
 * Animated hamburger button with 4 visual variants. Each transitions
 * smoothly between closed (menu) and open (close) states using CSS
 * transforms — no JS animation library needed.
 *
 * Variants:
 *   - classic: three horizontal bars → top/bottom rotate into X, middle fades
 *   - dots:    three vertical dots → rotate + scale to form X
 *   - plus:    + sign → rotates 45° to become X
 *   - grid:    2x2 grid of squares → collapses into X
 */

export type HamburgerVariant = 'classic' | 'dots' | 'plus' | 'grid';

interface HamburgerButtonProps {
  isOpen: boolean;
  onClick: () => void;
  variant?: HamburgerVariant;
  color?: string;
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export const HamburgerButton = ({
  isOpen,
  onClick,
  variant = 'classic',
  color = 'currentColor',
  size = 24,
  className = '',
  ariaLabel = 'Abrir menú',
}: HamburgerButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-expanded={isOpen}
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {variant === 'classic' && <ClassicHamburger isOpen={isOpen} color={color} size={size} />}
      {variant === 'dots' && <DotsHamburger isOpen={isOpen} color={color} size={size} />}
      {variant === 'plus' && <PlusHamburger isOpen={isOpen} color={color} size={size} />}
      {variant === 'grid' && <GridHamburger isOpen={isOpen} color={color} size={size} />}
    </button>
  );
};

// ─── Variant 1: Classic three-line hamburger ─────────────────────────────
const ClassicHamburger = ({ isOpen, color, size }: { isOpen: boolean; color: string; size: number }) => {
  const lineStyle: React.CSSProperties = {
    position: 'absolute',
    left: '15%',
    right: '15%',
    height: 2,
    backgroundColor: color,
    transition: 'transform 250ms ease, opacity 200ms ease',
  };
  return (
    <span aria-hidden="true" style={{ position: 'relative', width: size, height: size }}>
      <span style={{ ...lineStyle, top: '30%', transform: isOpen ? `translateY(${size * 0.2}px) rotate(45deg)` : 'none' }} />
      <span style={{ ...lineStyle, top: '50%', transform: 'translateY(-50%)', opacity: isOpen ? 0 : 1 }} />
      <span style={{ ...lineStyle, bottom: '30%', transform: isOpen ? `translateY(-${size * 0.2}px) rotate(-45deg)` : 'none' }} />
    </span>
  );
};

// ─── Variant 2: Three stacked dots → X ───────────────────────────────────
const DotsHamburger = ({ isOpen, color, size }: { isOpen: boolean; color: string; size: number }) => {
  // Three vertically stacked dots with wide spacing so they read as dots.
  const dotR = size * 0.13;
  const dot: React.CSSProperties = {
    position: 'absolute',
    width: dotR * 2,
    height: dotR * 2,
    borderRadius: '50%',
    backgroundColor: color,
    transition: 'transform 280ms ease, opacity 200ms ease, border-radius 280ms ease',
    left: '50%',
    marginLeft: -dotR,
  };
  return (
    <span aria-hidden="true" style={{ position: 'relative', width: size, height: size }}>
      <span style={{ ...dot, top: '12%', transform: isOpen ? `translateY(${size * 0.38}px) rotate(45deg) scaleX(2.8)` : 'none', borderRadius: isOpen ? 0 : '50%' }} />
      <span style={{ ...dot, top: '50%', marginTop: -dotR, opacity: isOpen ? 0 : 1 }} />
      <span style={{ ...dot, bottom: '12%', transform: isOpen ? `translateY(-${size * 0.38}px) rotate(-45deg) scaleX(2.8)` : 'none', borderRadius: isOpen ? 0 : '50%' }} />
    </span>
  );
};

// ─── Variant 3: Plus → X (rotate 45°) ────────────────────────────────────
const PlusHamburger = ({ isOpen, color, size }: { isOpen: boolean; color: string; size: number }) => {
  const stroke = 2;
  return (
    <span
      aria-hidden="true"
      style={{
        position: 'relative',
        width: size,
        height: size,
        transition: 'transform 300ms ease',
        transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
        display: 'inline-block',
      }}
    >
      <span style={{ position: 'absolute', left: '20%', right: '20%', top: '50%', height: stroke, marginTop: -stroke / 2, backgroundColor: color }} />
      <span style={{ position: 'absolute', top: '20%', bottom: '20%', left: '50%', width: stroke, marginLeft: -stroke / 2, backgroundColor: color }} />
    </span>
  );
};

// ─── Variant 4: 2x2 grid → X ─────────────────────────────────────────────
const GridHamburger = ({ isOpen, color, size }: { isOpen: boolean; color: string; size: number }) => {
  // Smaller squares with bigger gap between them so they read as a grid,
  // not as one big block.
  const sqSize = size * 0.2;
  const sq: React.CSSProperties = {
    position: 'absolute',
    width: sqSize,
    height: sqSize,
    backgroundColor: color,
    transition: 'transform 300ms ease, border-radius 300ms ease',
  };
  // Each square offsets by ~half the grid to converge into the center on open.
  const offset = size * 0.3;
  return (
    <span aria-hidden="true" style={{ position: 'relative', width: size, height: size }}>
      <span style={{ ...sq, top: '15%', left: '15%', transform: isOpen ? `translate(${offset}px, ${offset}px) rotate(45deg)` : 'none' }} />
      <span style={{ ...sq, top: '15%', right: '15%', transform: isOpen ? `translate(-${offset}px, ${offset}px) rotate(-45deg)` : 'none' }} />
      <span style={{ ...sq, bottom: '15%', left: '15%', transform: isOpen ? `translate(${offset}px, -${offset}px) rotate(-45deg)` : 'none' }} />
      <span style={{ ...sq, bottom: '15%', right: '15%', transform: isOpen ? `translate(-${offset}px, -${offset}px) rotate(45deg)` : 'none' }} />
    </span>
  );
};
