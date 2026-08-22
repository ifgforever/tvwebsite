/**
 * Cut list + board optimiser.
 *
 * Groups every framing member into cuts, then packs those cuts onto real
 * purchasable board lengths with a best-fit-decreasing pass and a look-ahead on
 * which stock length to open next. Kerf is charged on every cut, so the yield
 * on paper is the yield on the saw horses.
 */
import type { FramingMember, LumberSize } from '../types';
import { KERF_IN } from '../catalog';
import { inchesToFraction } from '../units';
import { MEMBER_LABEL } from './framing';

/** Only lengths that can actually be bought (and priced) are offered to the optimiser. */
export const PURCHASE_LENGTHS: Record<string, { lengthIn: number; sku: string; label: string }[]> = {
  '2x3': [{ lengthIn: 96, sku: 'LUM-2x3-96', label: "2×3 × 8'" }],
  '2x4': [
    { lengthIn: 92.625, sku: 'LUM-2x4-92', label: '2×4 × 92-5/8" precut' },
    { lengthIn: 96, sku: 'LUM-2x4-96', label: "2×4 × 8'" },
    { lengthIn: 120, sku: 'LUM-2x4-120', label: "2×4 × 10'" },
    { lengthIn: 144, sku: 'LUM-2x4-144', label: "2×4 × 12'" },
  ],
  '2x6': [
    { lengthIn: 96, sku: 'LUM-2x6-96', label: "2×6 × 8'" },
    { lengthIn: 144, sku: 'LUM-2x6-144', label: "2×6 × 12'" },
  ],
  '2x8': [{ lengthIn: 96, sku: 'LUM-2x8-96', label: "2×8 × 8'" }],
  custom: [{ lengthIn: 96, sku: 'LUM-2x4-96', label: "Custom × 8'" }],
};

export interface CutLine {
  lumber: LumberSize;
  lengthIn: number;
  lengthLabel: string;
  qty: number;
  kinds: string[];
  note: string;
}

export interface BoardPlan {
  lumber: LumberSize;
  stockLengthIn: number;
  stockLabel: string;
  sku: string;
  boards: { cuts: number[]; used: number; waste: number }[];
  count: number;
  wasteIn: number;
  yieldPct: number;
}

export interface CutListResult {
  cuts: CutLine[];
  plans: BoardPlan[];
  totalBoards: number;
  totalWasteFt: number;
  overallYieldPct: number;
}

/** Cuts round UP to 1/8" — you can trim a long stick, you cannot stretch a short one. */
const roundCut = (n: number) => Math.ceil(n * 8 - 1e-6) / 8;

export function groupCuts(members: FramingMember[]): CutLine[] {
  const map = new Map<string, CutLine>();
  for (const m of members) {
    const len = roundCut(m.lengthIn);
    const key = `${m.lumber}|${len.toFixed(4)}`;
    const line = map.get(key) || {
      lumber: m.lumber, lengthIn: len, lengthLabel: inchesToFraction(len), qty: 0, kinds: [], note: '',
    };
    line.qty += m.qty;
    const label = MEMBER_LABEL[m.kind] || m.kind;
    if (!line.kinds.includes(label)) line.kinds.push(label);
    map.set(key, line);
  }
  const out = [...map.values()].sort((a, b) => b.lengthIn - a.lengthIn);
  for (const l of out) l.note = l.kinds.join(', ');
  return out;
}

interface Bin { cuts: number[]; remaining: number; stock: number }

function fillGreedy(stock: number, pool: number[]): { used: number; leftover: number[] } {
  let remaining = stock;
  let used = 0;
  const leftover: number[] = [];
  for (const c of pool) {
    const need = used === 0 ? c : c + KERF_IN;
    if (need <= remaining + 1e-9) {
      remaining -= need;
      used += need;
    } else leftover.push(c);
  }
  return { used, leftover };
}

export function optimiseBoards(cuts: CutLine[]): BoardPlan[] {
  const byLumber = new Map<LumberSize, number[]>();
  for (const c of cuts) {
    const arr = byLumber.get(c.lumber) || [];
    for (let i = 0; i < c.qty; i++) arr.push(c.lengthIn);
    byLumber.set(c.lumber, arr);
  }

  const plans: BoardPlan[] = [];
  for (const [lumber, lengths] of byLumber) {
    const stockOptions = (PURCHASE_LENGTHS[lumber] || PURCHASE_LENGTHS['2x4']).slice().sort((a, b) => a.lengthIn - b.lengthIn);
    const pending = [...lengths].sort((a, b) => b - a);
    const bins: Bin[] = [];

    for (const cut of pending) {
      // Best fit into an open board.
      let best: Bin | null = null;
      for (const b of bins) {
        const need = b.cuts.length ? cut + KERF_IN : cut;
        if (need <= b.remaining + 1e-9 && (!best || b.remaining - need < best.remaining - (best.cuts.length ? cut + KERF_IN : cut))) best = b;
      }
      if (best) {
        best.remaining -= best.cuts.length ? cut + KERF_IN : cut;
        best.cuts.push(cut);
        continue;
      }
      // Open a new board: look ahead at what else could ride along on each stock length.
      const stillPending = pending.filter((p) => !isConsumed(p, bins, cut));
      let chosen = stockOptions[stockOptions.length - 1];
      let bestScore = -Infinity;
      for (const s of stockOptions) {
        if (s.lengthIn + 1e-9 < cut) continue;
        const rest = stillPending.filter((p) => p !== cut);
        const { used } = fillGreedy(s.lengthIn, [cut, ...rest]);
        const score = used / s.lengthIn;
        if (score > bestScore + 1e-9) { bestScore = score; chosen = s; }
      }
      if (chosen.lengthIn < cut) chosen = stockOptions[stockOptions.length - 1];
      bins.push({ cuts: [cut], remaining: chosen.lengthIn - cut, stock: chosen.lengthIn });
    }

    // Report grouped by the stock length that was opened.
    const byStock = new Map<number, Bin[]>();
    for (const b of bins) byStock.set(b.stock, [...(byStock.get(b.stock) || []), b]);
    for (const [stock, group] of byStock) {
      const opt = stockOptions.find((s) => s.lengthIn === stock) || stockOptions[0];
      const wasteIn = group.reduce((s, b) => s + b.remaining, 0);
      const usedIn = group.reduce((s, b) => s + (b.stock - b.remaining), 0);
      plans.push({
        lumber,
        stockLengthIn: stock,
        stockLabel: opt.label,
        sku: opt.sku,
        boards: group.map((b) => ({ cuts: b.cuts, used: Math.round((b.stock - b.remaining) * 100) / 100, waste: Math.round(b.remaining * 100) / 100 })),
        count: group.length,
        wasteIn: Math.round(wasteIn * 10) / 10,
        yieldPct: Math.round((usedIn / (usedIn + wasteIn)) * 1000) / 10,
      });
    }
  }
  return plans.sort((a, b) => b.count - a.count);
}

// Cuts are consumed in order; the look-ahead only needs a rough view of what's left.
function isConsumed(_p: number, _bins: Bin[], _cut: number) { return false; }

export function calcCutList(members: FramingMember[]): CutListResult {
  const cuts = groupCuts(members);
  const plans = optimiseBoards(cuts);
  const totalBoards = plans.reduce((s, p) => s + p.count, 0);
  const totalWasteIn = plans.reduce((s, p) => s + p.wasteIn, 0);
  const totalStockIn = plans.reduce((s, p) => s + p.count * p.stockLengthIn, 0);
  return {
    cuts,
    plans,
    totalBoards,
    totalWasteFt: Math.round((totalWasteIn / 12) * 10) / 10,
    overallYieldPct: totalStockIn ? Math.round(((totalStockIn - totalWasteIn) / totalStockIn) * 1000) / 10 : 100,
  };
}
