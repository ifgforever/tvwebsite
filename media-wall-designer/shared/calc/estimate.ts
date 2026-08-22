/**
 * Labor hours and price.
 *
 * Hours are DERIVED from the model — wall area, opening count, niche returns,
 * device count, finish type — so a bigger wall or two more niches re-prices
 * itself. Any line the user edits stops being auto-calculated and is left alone.
 */
import type { Design, EstimateSettings, LaborCategory, LaborLine, FireplaceComponent, NicheComponent } from '../types';
import { LABOR_RATES } from '../catalog';
import type { TakeOff } from './materials';

export interface LaborEstimateLine {
  category: LaborCategory;
  label: string;
  hours: number;
  /** Billed rate. */
  rate: number;
  mode: 'hourly' | 'fixed';
  /** What the customer is charged for this line. */
  price: number;
  /** Burdened internal cost — never printed on a customer proposal. */
  cost: number;
  auto: boolean;
  subcontracted: boolean;
  basis: string;
}

export interface EstimateResult {
  materialCost: number;
  materialWithMarkup: number;
  materialMarkup: number;
  laborLines: LaborEstimateLine[];
  laborHours: number;
  /** Billed labor. */
  laborPrice: number;
  /** Burdened internal labor cost. */
  laborCost: number;
  laborWithMarkup: number;
  subtotal: number;
  overhead: number;
  preTax: number;
  discountAmount: number;
  taxableBase: number;
  tax: number;
  total: number;
  deposit: number;
  balance: number;
  /** Internal only — never printed on a customer proposal. */
  directCost: number;
  profit: number;
  marginPct: number;
  pricePerSqFt: number;
  crewDays: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const roundH = (n: number) => Math.round(n * 4) / 4; // quarter hours

/** The hour model. Every number here is a shop rate you can tune in one place. */
export function autoLaborHours(design: Design, take: TakeOff): Record<LaborCategory, { hours: number; basis: string }> {
  const { wall } = design;
  const niches = design.components.filter((c): c is NicheComponent => c.type === 'niche');
  const fireplaces = design.components.filter((c): c is FireplaceComponent => c.type === 'fireplace');
  const tv = design.components.find((c) => c.type === 'tv');
  const soundbar = design.components.find((c) => c.type === 'soundbar');
  const faceSqFt = take.drywall.faceSqFt;
  const totalSqFt = take.drywall.totalSqFt;
  const openings = take.framing.openings.length;
  const lineV = take.electrical.lineVoltageDevices;
  const isPaint = wall.finish === 'painted_drywall';
  const heavyFinish = wall.finish === 'stone' || wall.finish === 'tile' || wall.finish === 'large_format_tile';

  const design_h = 2 + (niches.length > 0 ? 0.75 : 0) + (fireplaces.length ? 0.5 : 0);
  const demo_h = 1 + (wall.baseboardKeep ? 0.5 : 0.25) + faceSqFt * 0.006;
  const framing_h = 3 + faceSqFt * 0.06 + openings * 0.75 + fireplaces.length * 1.5 + (tv ? 0.75 : 0) + (soundbar ? 0.25 : 0) + take.framing.stats.crippleCount * 0.03;
  const electrical_h = lineV ? 2 + lineV * 0.75 + take.electrical.circuits.length * 1.5 : 0;
  const low_voltage_h = 1 + take.electrical.lowVoltageDevices * 0.5 + take.electrical.conduitFt * 0.02;
  const drywall_h = take.drywall.sheets * 0.75 + niches.length * 1.25 + fireplaces.length * 1 + take.drywall.cornerBeadLf * 0.05 + 2;

  // Casework is shop time plus install time, and it is the slowest trade on the
  // wall: a door that hangs badly is visible from the sofa forever.
  const cw = take.casework;
  const casework_h = cw.parts.length
    ? 2 + cw.totalSheets * 1.4 + cw.doorCount * 0.85 + cw.drawerCount * 1.1 + cw.shelfCount * 0.35
      + cw.cabinetLf * 1.2 + cw.shelfColumnCount * 1.5 + (cw.hearthSqFt > 0 ? 2.5 : 0) + cw.edgeBandingLf * 0.02
    : 0;
  const paneling_h = cw.panelSqFt > 0
    ? 1.5 + cw.panelSqFt * 0.11 + cw.slatCount * 0.03 + cw.inlayLf * 0.14
    : 0;
  const finishing_h = isPaint ? 0 : take.finishSqFt * (heavyFinish ? 0.22 : 0.14) + 2;
  const painting_h = 1 + totalSqFt * 0.016 + niches.length * 0.35;
  const tv_install_h = tv ? 1.5 + ((tv as any).props.recessedBox ? 0.5 : 0) + ((tv as any).props.weightLb > 80 ? 0.5 : 0) : 0;
  const fireplace_install_h = fireplaces.length * 1.5;
  const lighting_install_h = niches.length * 0.5 + take.electrical.stripFt * 0.05 + (take.electrical.controllers ? 1 : 0) + (take.electrical.drivers ? 0.5 : 0);
  const cleanup_h = 1.5 + faceSqFt * 0.008;

  const mk = (hours: number, basis: string) => ({ hours: roundH(hours), basis });
  return {
    design: mk(design_h, 'Measure, design, proposal'),
    demo: mk(demo_h, `Prep + baseboard over ${Math.round(faceSqFt)} sf`),
    framing: mk(framing_h, `${Math.round(faceSqFt)} sf face, ${openings} openings, ${take.framing.stats.studCount} studs`),
    electrical: mk(electrical_h, `${lineV} line-voltage devices, ${take.electrical.circuits.length} circuit(s)`),
    low_voltage: mk(low_voltage_h, `${take.electrical.lowVoltageDevices} LV devices + ${take.electrical.conduitFt}' conduit`),
    drywall: mk(drywall_h, `${take.drywall.sheets} sheets, ${niches.length} niche returns, ${take.drywall.cornerBeadLf} lf bead`),
    casework: mk(casework_h, cw.parts.length ? `${cw.totalSheets} sheets, ${cw.parts.length} parts, ${cw.doorCount} doors, ${cw.drawerCount} drawers` : 'No built-in casework'),
    paneling: mk(paneling_h, cw.panelSqFt > 0 ? `${cw.panelSqFt} sf of panelling, ${cw.slatCount} slats` : 'No panelling'),
    finishing: mk(finishing_h, isPaint ? 'Painted drywall — no separate finish trade' : `${take.finishSqFt} sf of ${wall.finish.replace(/_/g, ' ')}`),
    painting: mk(painting_h, `${Math.round(totalSqFt)} sf incl. returns, 2 coats`),
    tv_install: mk(tv_install_h, tv ? `${tv.label}, ${(tv as any).props.weightLb} lb` : 'No TV'),
    fireplace_install: mk(fireplace_install_h, fireplaces.length ? 'Set, connect and test' : 'No fireplace'),
    lighting_install: mk(lighting_install_h, `${niches.length} niches, ${take.electrical.stripFt} lf strip`),
    cleanup: mk(cleanup_h, 'Haul-away and final clean'),
  };
}

export function computeEstimate(design: Design, settings: EstimateSettings, take: TakeOff): EstimateResult {
  const excluded = new Set(settings.excludedSkus);
  const materialCost = take.bom
    .filter((l) => !excluded.has(l.sku))
    .reduce((s, l) => s + l.purchaseQty * l.unitCost, 0);
  const materialWithMarkup = take.bom
    .filter((l) => !excluded.has(l.sku))
    .reduce((s, l) => s + l.purchaseQty * l.unitCost * (1 + l.markupPct / 100), 0);

  const auto = autoLaborHours(design, take);
  const laborLines: LaborEstimateLine[] = settings.labor.map((line: LaborLine) => {
    const a = auto[line.category];
    const hours = line.autoCalculated ? a.hours : line.hours;
    const price = line.mode === 'fixed' ? line.fixed : hours * line.rate;
    const cost = line.mode === 'fixed'
      ? (line.fixedCost || line.fixed * 0.55)
      : hours * (line.costRate || line.rate * 0.5);
    return {
      category: line.category,
      label: line.description || LABOR_RATES[line.category].label,
      hours,
      rate: line.rate,
      mode: line.mode,
      price: round2(price),
      cost: round2(cost),
      auto: line.autoCalculated,
      subcontracted: line.subcontracted,
      basis: line.autoCalculated ? a.basis : 'Manual override',
    };
  }).filter((l) => l.price > 0 || l.hours > 0);

  const laborHours = laborLines.reduce((s, l) => s + (l.mode === 'hourly' ? l.hours : 0), 0);
  const laborPrice = laborLines.reduce((s, l) => s + l.price, 0);
  const laborCost = laborLines.reduce((s, l) => s + l.cost, 0);
  const laborWithMarkup = laborPrice * (1 + settings.laborMarkupPct / 100);

  const subtotal = materialWithMarkup + laborWithMarkup;
  const overhead = subtotal * (settings.overheadPct / 100);
  const preDiscount = subtotal + overhead;
  const discountAmount = settings.discountIsPct ? preDiscount * (settings.discount / 100) : settings.discount;
  const preTax = Math.max(0, preDiscount - discountAmount);

  const materialShare = preDiscount > 0 ? materialWithMarkup / preDiscount : 0;
  const taxableBase = settings.taxOnLabor ? preTax : preTax * materialShare;
  const tax = taxableBase * (settings.taxRatePct / 100);
  const total = preTax + tax;

  const directCost = materialCost + laborCost;
  const profit = preTax - directCost;

  return {
    materialCost: round2(materialCost),
    materialWithMarkup: round2(materialWithMarkup),
    materialMarkup: round2(materialWithMarkup - materialCost),
    laborLines,
    laborHours: Math.round(laborHours * 4) / 4,
    laborPrice: round2(laborPrice),
    laborCost: round2(laborCost),
    laborWithMarkup: round2(laborWithMarkup),
    subtotal: round2(subtotal),
    overhead: round2(overhead),
    preTax: round2(preTax),
    discountAmount: round2(discountAmount),
    taxableBase: round2(taxableBase),
    tax: round2(tax),
    total: round2(total),
    deposit: round2(total * (settings.depositPct / 100)),
    balance: round2(total - total * (settings.depositPct / 100)),
    directCost: round2(directCost),
    profit: round2(profit),
    marginPct: preTax > 0 ? Math.round((profit / preTax) * 1000) / 10 : 0,
    // Benchmarked against the gross wall face, which is how the market quotes it.
    pricePerSqFt: take.drywall.grossFaceSqFt > 0 ? round2(total / take.drywall.grossFaceSqFt) : 0,
    // Two-person crew, 8-hour days.
    crewDays: Math.round((laborHours / 2 / 8) * 10) / 10,
  };
}

/** Price needed to hit a target margin — the "what should I charge?" answer. */
export function priceForMargin(result: EstimateResult, targetMarginPct: number): number {
  if (targetMarginPct >= 100) return result.directCost * 4;
  return round2(result.directCost / (1 - targetMarginPct / 100));
}
