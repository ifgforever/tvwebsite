/** Shared SVG defs: material patterns, lighting filters, glass and flame gradients. */
import type { FinishId } from '@shared/types';

export function shade(hex: string, amt: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = Math.min(255, Math.max(0, ((n >> 16) & 255) + amt));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 255) + amt));
  const b = Math.min(255, Math.max(0, (n & 255) + amt));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** Material patterns are drawn in inches so a slat is a real 3" slat at any zoom. */
export function FinishPattern({ id, finish, color }: { id: string; finish: FinishId; color: string }) {
  const light = shade(color, 16);
  const dark = shade(color, -22);
  const darker = shade(color, -38);

  switch (finish) {
    case 'wood_slat':
      return (
        <pattern id={id} width={3} height={12} patternUnits="userSpaceOnUse">
          <rect width={3} height={12} fill={dark} />
          <rect x={0.55} width={1.9} height={12} fill={color} />
          <rect x={0.55} width={0.35} height={12} fill={light} opacity={0.7} />
          <rect x={2.15} width={0.35} height={12} fill={darker} />
        </pattern>
      );
    case 'stone':
      return (
        <pattern id={id} width={16} height={6} patternUnits="userSpaceOnUse">
          <rect width={16} height={6} fill={color} />
          {[0, 1.5, 3, 4.5].map((y, i) => (
            <rect key={i} x={i % 2 ? -3 : 0} y={y} width={16} height={1.3} fill={i % 2 ? shade(color, -14) : shade(color, 10)} />
          ))}
          <rect y={5.7} width={16} height={0.3} fill={darker} opacity={0.6} />
        </pattern>
      );
    case 'tile':
      return (
        <pattern id={id} width={12} height={12} patternUnits="userSpaceOnUse">
          <rect width={12} height={12} fill={color} />
          <rect width={12} height={0.35} fill={dark} />
          <rect width={0.35} height={12} fill={dark} />
          <rect x={0.6} y={0.6} width={10.8} height={10.8} fill={shade(color, 6)} opacity={0.5} />
        </pattern>
      );
    case 'large_format_tile':
      return (
        <pattern id={id} width={48} height={24} patternUnits="userSpaceOnUse">
          <rect width={48} height={24} fill={color} />
          <rect width={48} height={0.25} fill={dark} />
          <rect width={0.25} height={24} fill={dark} />
          <path d="M4 20 Q 18 6 44 3" stroke={shade(color, 14)} strokeWidth={0.5} fill="none" opacity={0.55} />
          <path d="M2 12 Q 22 16 46 9" stroke={shade(color, -10)} strokeWidth={0.35} fill="none" opacity={0.4} />
        </pattern>
      );
    case 'wood_panel':
      return (
        <pattern id={id} width={24} height={96} patternUnits="userSpaceOnUse">
          <rect width={24} height={96} fill={color} />
          <rect x={23.6} width={0.4} height={96} fill={darker} />
          {[8, 20, 33, 47, 61, 74, 88].map((y) => (
            <path key={y} d={`M0 ${y} Q 12 ${y - 2.5} 24 ${y}`} stroke={shade(color, -12)} strokeWidth={0.35} fill="none" opacity={0.5} />
          ))}
        </pattern>
      );
    default:
      return (
        <pattern id={id} width={64} height={64} patternUnits="userSpaceOnUse">
          <rect width={64} height={64} fill={color} />
        </pattern>
      );
  }
}

/** Filters and gradients used by the realistic renderer. */
export function SceneDefs({ uid, wallColor }: { uid: string; wallColor: string }) {
  return (
    <>
      <filter id={`${uid}-glow`} x="-70%" y="-70%" width="240%" height="240%">
        <feGaussianBlur stdDeviation="2.6" />
      </filter>
      <filter id={`${uid}-glow-lg`} x="-120%" y="-120%" width="340%" height="340%">
        <feGaussianBlur stdDeviation="7" />
      </filter>
      <filter id={`${uid}-soft`} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="0.9" />
      </filter>

      <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0%" stopColor="#2A2E35" />
        <stop offset="28%" stopColor="#15171B" />
        <stop offset="70%" stopColor="#0C0D10" />
        <stop offset="100%" stopColor="#151820" />
      </linearGradient>
      <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.11" />
        <stop offset="42%" stopColor="#FFFFFF" stopOpacity="0.03" />
        <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0" />
      </linearGradient>

      <linearGradient id={`${uid}-ember`} x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="#FF6A1A" />
        <stop offset="35%" stopColor="#C4351A" />
        <stop offset="100%" stopColor="#2A0A06" />
      </linearGradient>
      <radialGradient id={`${uid}-fireglow`} cx="0.5" cy="1" r="0.9">
        <stop offset="0%" stopColor="#FF8A3D" stopOpacity="0.85" />
        <stop offset="60%" stopColor="#FF5E1A" stopOpacity="0.18" />
        <stop offset="100%" stopColor="#FF5E1A" stopOpacity="0" />
      </radialGradient>

      <linearGradient id={`${uid}-wallshade`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.07" />
        <stop offset="55%" stopColor="#000000" stopOpacity="0" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.22" />
      </linearGradient>
      <linearGradient id={`${uid}-floor`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={shade(wallColor, -46)} />
        <stop offset="100%" stopColor="#07070A" />
      </linearGradient>
      <radialGradient id={`${uid}-vignette`} cx="0.5" cy="0.42" r="0.78">
        <stop offset="55%" stopColor="#000" stopOpacity="0" />
        <stop offset="100%" stopColor="#000" stopOpacity="0.5" />
      </radialGradient>
    </>
  );
}
