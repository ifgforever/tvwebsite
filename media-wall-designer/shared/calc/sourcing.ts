/**
 * Material sourcing — turns the bill of materials into a shopping run.
 *
 * Lines are grouped by supplier so the list matches the stops you actually make,
 * with a deep search link per line where the supplier has a public search.
 */
import type { BomLine } from '../types';
import { CATEGORY_LABEL, SUPPLIERS, DEFAULT_SUPPLIER, searchUrlFor, type SupplierId } from '../catalog';

export interface SourcingLine extends BomLine {
  supplier: SupplierId;
  searchUrl: string | null;
  extended: number;
  categoryLabel: string;
}

export interface SupplierGroup {
  supplier: SupplierId;
  name: string;
  short: string;
  accent: string;
  notes: string;
  lines: SourcingLine[];
  subtotal: number;
  itemCount: number;
  unitCount: number;
}

export interface SourcingResult {
  groups: SupplierGroup[];
  grandTotal: number;
  lineCount: number;
  stops: number;
}

export function buildSourcing(
  bom: BomLine[],
  overrides: Record<string, SupplierId> = {},
  excluded: string[] = [],
): SourcingResult {
  const skip = new Set(excluded);
  const lines: SourcingLine[] = bom
    .filter((l) => !skip.has(l.sku))
    .map((l) => ({
      ...l,
      supplier: overrides[l.sku] ?? (DEFAULT_SUPPLIER[l.sku]?.supplier ?? 'other'),
      searchUrl: searchUrlFor(l.sku, l.name),
      extended: Math.round(l.purchaseQty * l.unitCost * 100) / 100,
      categoryLabel: CATEGORY_LABEL[l.category],
    }));

  const map = new Map<SupplierId, SupplierGroup>();
  for (const line of lines) {
    const s = SUPPLIERS[line.supplier];
    const g = map.get(line.supplier) || {
      supplier: line.supplier, name: s.name, short: s.short, accent: s.accent, notes: s.notes,
      lines: [], subtotal: 0, itemCount: 0, unitCount: 0,
    };
    g.lines.push(line);
    g.subtotal += line.extended;
    g.itemCount += 1;
    g.unitCount += line.purchaseQty;
    map.set(line.supplier, g);
  }

  const groups = [...map.values()]
    .map((g) => ({ ...g, subtotal: Math.round(g.subtotal * 100) / 100, unitCount: Math.round(g.unitCount * 10) / 10 }))
    .sort((a, b) => b.subtotal - a.subtotal);

  return {
    groups,
    grandTotal: Math.round(groups.reduce((s, g) => s + g.subtotal, 0) * 100) / 100,
    lineCount: lines.length,
    stops: groups.length,
  };
}

/** Plain-text purchase list — pastes into a text message or a pro-desk email. */
export function sourcingToText(result: SourcingResult, projectName: string): string {
  const out: string[] = [`MATERIAL LIST — ${projectName}`, ''];
  for (const g of result.groups) {
    out.push(`== ${g.name} — ${g.itemCount} items — $${g.subtotal.toFixed(2)} ==`);
    for (const l of g.lines) {
      out.push(`  [ ] ${l.purchaseQty} ${l.unit}  ${l.name}  (${l.spec})`);
    }
    out.push('');
  }
  out.push(`TOTAL MATERIAL: $${result.grandTotal.toFixed(2)} across ${result.stops} suppliers`);
  return out.join('\n');
}
