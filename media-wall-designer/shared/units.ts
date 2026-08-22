/** Inch arithmetic and the feet-inches-sixteenths formatting the trade actually reads. */
import { ROUND_TO } from './types';

export const snap = (v: number, to = ROUND_TO) => Math.round(v / to) * to;

const SIXTEENTHS = ['', '1/16', '1/8', '3/16', '1/4', '5/16', '3/8', '7/16', '1/2', '9/16', '5/8', '11/16', '3/4', '13/16', '7/8', '15/16'];

/** 92.625 → `92-5/8"` — the form that goes on a cut list. */
export function inchesToFraction(value: number, precision = 16): string {
  const neg = value < 0;
  const v = Math.abs(value);
  const whole = Math.floor(v + 1e-9);
  let sixteenths = Math.round((v - whole) * precision);
  let w = whole;
  if (sixteenths >= precision) {
    w += 1;
    sixteenths = 0;
  }
  const frac = precision === 16 ? SIXTEENTHS[sixteenths] : sixteenths ? `${sixteenths}/${precision}` : '';
  const body = frac ? (w ? `${w}-${frac}` : frac) : `${w}`;
  return `${neg ? '-' : ''}${body}"`;
}

/** 92.625 → `7' 8-5/8"` — the form that goes on an elevation. */
export function inchesToFeet(value: number): string {
  const neg = value < 0;
  const v = Math.abs(value);
  const ft = Math.floor(v / 12);
  const rest = v - ft * 12;
  if (ft === 0) return `${neg ? '-' : ''}${inchesToFraction(rest)}`;
  const r = inchesToFraction(rest);
  return `${neg ? '-' : ''}${ft}' ${r === '0"' ? '' : r}`.trim();
}

/** Accepts 96, 96.5, `8'`, `8' 2"`, `8-2`, `92 5/8`, `92-5/8"`, `8ft 2in`. */
export function parseDimension(input: string, fallback = 0): number {
  if (input == null) return fallback;
  const s = String(input).trim().toLowerCase().replace(/["”]/g, '"').replace(/[‘’']/g, "'");
  if (!s) return fallback;
  if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);

  let total = 0;
  let matched = false;

  const feetMatch = s.match(/(-?\d+(?:\.\d+)?)\s*(?:'|ft|feet)/);
  if (feetMatch) {
    total += parseFloat(feetMatch[1]) * 12;
    matched = true;
  }
  let rest = feetMatch ? s.slice(s.indexOf(feetMatch[0]) + feetMatch[0].length) : s;
  rest = rest.replace(/(in|inch|inches|")/g, ' ').trim();

  // 92-5/8  |  92 5/8  |  5/8  |  92
  const mixed = rest.match(/(-?\d+(?:\.\d+)?)\s*[- ]\s*(\d+)\s*\/\s*(\d+)/);
  const fracOnly = rest.match(/^(\d+)\s*\/\s*(\d+)$/);
  const plain = rest.match(/^-?\d+(?:\.\d+)?$/);
  if (mixed) {
    total += parseFloat(mixed[1]) + parseInt(mixed[2], 10) / parseInt(mixed[3], 10);
    matched = true;
  } else if (fracOnly) {
    total += parseInt(fracOnly[1], 10) / parseInt(fracOnly[2], 10);
    matched = true;
  } else if (plain) {
    total += parseFloat(plain[0]);
    matched = true;
  }
  return matched ? total : fallback;
}

export const sqIn2SqFt = (sqIn: number) => sqIn / 144;
export const in2Ft = (i: number) => i / 12;
export const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
export const money0 = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
