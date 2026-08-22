/** One stroke-based icon set, drawn on a 24 grid. */
const P: Record<string, string> = {
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20c0-3.3 3.6-5 8-5s8 1.7 8 5',
  camera: 'M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  layout: 'M4 4h16v16H4zM4 10h16M10 10v10',
  eye: 'M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  ruler: 'M3 15 15 3l6 6L9 21zM7 11l2 2M10 8l2 2M13 5l2 2',
  frame: 'M4 4h16v16H4zM8 4v16M16 4v16M4 9h16M4 15h16',
  bolt: 'm13 2-9 12h7l-1 8 9-12h-7z',
  box: 'M3 8 12 3l9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v10',
  cart: 'M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 8H6M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  saw: 'M3 17h18M3 17l3-9 3 3 3-6 3 8 3-4 3 8',
  dollar: 'M12 2v20M17 6.5C17 4.6 14.8 3.5 12 3.5S7 4.6 7 6.5 9 9.5 12 10.5s5 2 5 4-2.2 3.5-5 3.5-5-1.1-5-3',
  layers: 'm12 3 9 5-9 5-9-5zM3 13l9 5 9-5M3 18l9 5 9-5',
  print: 'M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M6 14h12v7H6z',
  plus: 'M12 5v14M5 12h14',
  check: 'm4 12 5 5L20 6',
  x: 'M6 6l12 12M18 6 6 18',
  undo: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  redo: 'm15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3',
  copy: 'M9 9h10v10H9zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  trash: 'M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13',
  lock: 'M6 11h12v10H6zM9 11V7a3 3 0 0 1 6 0v4',
  unlock: 'M6 11h12v10H6zM9 11V7a3 3 0 0 1 5.8-1',
  center: 'M12 3v18M3 12h18M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  alignL: 'M4 3v18M8 7h11M8 13h7',
  alignC: 'M12 3v18M6 7h12M8 13h8',
  alignR: 'M20 3v18M5 7h11M9 13h7',
  distribute: 'M4 3v18M20 3v18M12 7v10',
  grid: 'M4 4h16v16H4zM4 9h16M4 14h16M9 4v16M14 4v16',
  chevron: 'm9 6 6 6-6 6',
  back: 'm15 6-6 6 6 6',
  warn: 'M12 3 2 20h20zM12 9v5M12 17.5v.5',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v6M12 7.5v.5',
  wifi: 'M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0M12 19h.01',
  sparkle: 'm12 3 2 6 6 2-6 2-2 6-2-6-6-2 6-2zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
  download: 'M12 3v12M7 11l5 5 5-5M4 20h16',
  refresh: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5',
  link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
  clipboard: 'M9 4h6v3H9zM7 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1',
  tv: 'M3 5h18v11H3zM8 21h8M12 16v5',
  flame: 'M12 22c4 0 6-2.7 6-6 0-4-3-5-3-9 0 0-2 2-3 5-1-1.4-1-3-1-4-2 1.5-5 4.6-5 8 0 3.3 2 6 6 6Z',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 1 4 10.5V16H8v-2.5A6 6 0 0 1 12 3Z',
};

export function Icon({ name, size = 18, style }: { name: keyof typeof P | string; size?: number; style?: React.CSSProperties }) {
  const d = P[name] || P.info;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}
      strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden>
      <path d={d} />
    </svg>
  );
}
