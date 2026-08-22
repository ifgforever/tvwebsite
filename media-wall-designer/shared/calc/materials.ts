/**
 * Bill of materials.
 *
 * Every line traces back to a number in the design — the `derivedFrom` field is
 * printed on the installer package so a quantity can always be argued with.
 */
import type { BomCategory, BomLine, Design, EstimateSettings, FireplaceComponent, NicheComponent } from '../types';
import { CATALOG, FINISHES, SLAT_PANEL_SQFT } from '../catalog';
import { calcDrywall, type DrywallResult } from './drywall';
import { calcElectrical, type ElectricalResult } from './electrical';
import { calcCutList, type CutListResult } from './cutlist';
import { calcCasework, type CaseworkResult } from './casework';
import { generateFraming, type FramingResult } from './framing';
import { sqIn2SqFt } from '../units';

export interface TakeOff {
  framing: FramingResult;
  drywall: DrywallResult;
  electrical: ElectricalResult;
  cutList: CutListResult;
  casework: CaseworkResult;
  bom: BomLine[];
  finishSqFt: number;
}

interface LineSpec {
  sku: string;
  qty: number;
  derivedFrom: string;
  wastePct?: number;
  name?: string;
  spec?: string;
  unit?: string;
  unitCost?: number;
  category?: BomCategory;
  optional?: boolean;
}

export function buildBom(design: Design, settings: EstimateSettings, parts: {
  framing: FramingResult; drywall: DrywallResult; electrical: ElectricalResult; cutList: CutListResult; casework: CaseworkResult;
}): { bom: BomLine[]; finishSqFt: number } {
  const { wall } = design;
  const waste = wall.wasteFactorPct;
  const specs: LineSpec[] = [];

  /* ---------------------------------------------------------- framing */
  for (const plan of parts.cutList.plans) {
    specs.push({
      sku: plan.sku,
      qty: plan.count,
      // Boards are already the optimised count — waste lives in the cut plan.
      wastePct: 0,
      derivedFrom: `${plan.count} × ${plan.stockLabel} @ ${plan.yieldPct}% yield, ${plan.boards.reduce((s, b) => s + b.cuts.length, 0)} cuts`,
    });
  }
  const memberCount = parts.framing.members.length;
  specs.push({ sku: 'FST-SCREW-3', qty: Math.ceil(memberCount / 90), derivedFrom: `${memberCount} members × ~6 screws each`, wastePct: 0 });
  specs.push({ sku: 'FST-NAIL-16', qty: 1, derivedFrom: 'Framing nails, one box per wall', wastePct: 0 });
  if (wall.ptBottomPlate) specs.push({ sku: 'FST-TAPCON', qty: Math.max(1, Math.ceil(wall.widthIn / 24 / 75)), derivedFrom: `Bottom plate anchored @ 24" O.C. over ${wall.widthIn}"`, wastePct: 0 });
  specs.push({ sku: 'FST-SHIM', qty: 1, derivedFrom: 'Shimming plates and boxes', wastePct: 0 });

  /* ---------------------------------------------------------- drywall */
  const dw = parts.drywall;
  specs.push({ sku: wall.drywallThickness === 0.5 ? 'DW-12-4x8' : 'DW-58-4x8', qty: dw.sheets, wastePct: 0, derivedFrom: `${dw.totalSqFt} sf incl. returns ÷ 32 sf, waste applied to small pieces` });
  specs.push({ sku: 'DW-SCREW', qty: dw.screwLb, wastePct: 0, derivedFrom: `${dw.screwCount} screws ÷ 320 per lb` });
  specs.push({ sku: 'DW-BEAD', qty: dw.beadSticks, wastePct: 0, derivedFrom: `${dw.cornerBeadLf} lf outside corner ÷ 8' stick` });
  specs.push({ sku: 'DW-TAPE', qty: dw.tapeRolls, wastePct: 0, derivedFrom: `${dw.tapeLf} lf of seam and inside corner` });
  specs.push({ sku: 'DW-MUD', qty: dw.mudBuckets, wastePct: 0, derivedFrom: `${dw.mudGal} gal for ${dw.totalSqFt} sf, 3 coats` });
  specs.push({ sku: 'DW-PRIMER', qty: Math.ceil(dw.primerGal), wastePct: 0, derivedFrom: `${dw.totalSqFt} sf ÷ 350 sf per gal` });
  const niches = design.components.filter((c): c is NicheComponent => c.type === 'niche');
  if (niches.length) specs.push({ sku: 'DW-CLIP', qty: 1, wastePct: 0, derivedFrom: `${niches.length} niches — corner-back clips`, optional: true });

  /* -------------------------------------------------------- electrical */
  const el = parts.electrical;
  if (el.boxes.newWork) specs.push({ sku: 'EL-BOX-NEW', qty: el.boxes.newWork, wastePct: 0, derivedFrom: `${el.boxes.newWork} line-voltage devices in new framing` });
  if (el.boxes.recessed) specs.push({ sku: 'EL-BOX-REC', qty: el.boxes.recessed, wastePct: 0, derivedFrom: 'Recessed box behind the panel' });
  if (el.boxes.junction) specs.push({ sku: 'EL-BOX-JCT', qty: el.boxes.junction, wastePct: 0, derivedFrom: 'LED driver / junction locations' });
  specs.push({ sku: 'EL-ROMEX-12', qty: el.romexFt, wastePct: waste, derivedFrom: `${el.circuits.length} circuit(s) + device runs` });
  const recepCount = el.devices.filter((d) => d.props.kind === 'receptacle' || d.props.kind === 'recessed_receptacle' || d.props.kind === 'quad_receptacle').length;
  if (recepCount) specs.push({ sku: 'EL-RECEP', qty: recepCount, wastePct: 0, derivedFrom: `${recepCount} receptacles in the design` });
  const switchCount = el.devices.filter((d) => d.props.kind === 'switch').length;
  const dimmerCount = el.devices.filter((d) => d.props.kind === 'dimmer').length;
  if (switchCount) specs.push({ sku: 'EL-SWITCH', qty: switchCount, wastePct: 0, derivedFrom: 'Switch locations' });
  if (dimmerCount) specs.push({ sku: 'EL-DIMMER', qty: dimmerCount, wastePct: 0, derivedFrom: 'Dimmer locations' });
  specs.push({ sku: 'EL-PLATE', qty: recepCount + switchCount + dimmerCount, wastePct: 0, derivedFrom: 'One plate per line-voltage device' });
  if (el.puckCount) specs.push({ sku: 'EL-PUCK', qty: el.puckCount, wastePct: 0, derivedFrom: `${el.puckCount} niche pucks` });
  if (el.stripReels) {
    const rgb = design.lighting.some((z) => z.colorMode === 'rgb' || z.colorMode === 'rgbw');
    specs.push({ sku: rgb ? 'EL-STRIP-RGBW' : 'EL-STRIP-W', qty: el.stripReels, wastePct: 0, derivedFrom: `${el.stripFt} lf of strip ÷ 16.4' reel` });
    specs.push({ sku: 'EL-CHANNEL', qty: el.channelSticks, wastePct: 0, derivedFrom: 'Recessed channel + diffuser at niche openings', optional: true });
    specs.push({ sku: 'EL-CONN', qty: Math.max(1, Math.ceil(el.stripFt / 40)), wastePct: 0, derivedFrom: 'Strip jumpers between niches' });
  }
  if (el.drivers) specs.push({ sku: 'EL-DRIVER', qty: el.drivers, wastePct: 0, derivedFrom: `${el.driverWatts} W connected load` });
  if (el.controllers) specs.push({ sku: 'EL-CONTROLLER', qty: el.controllers, wastePct: 0, derivedFrom: 'RGBW zones' });

  /* ------------------------------------------------------- low voltage */
  if (el.hdmiCount) specs.push({ sku: 'LV-HDMI', qty: el.hdmiCount, wastePct: 0, derivedFrom: 'TV to equipment location' });
  specs.push({ sku: 'LV-CAT6', qty: el.cat6Ft, wastePct: waste, derivedFrom: 'One drop to the TV location' });
  specs.push({ sku: 'LV-KEYSTONE', qty: 2, wastePct: 0, derivedFrom: 'Ethernet + HDMI terminations' });
  specs.push({ sku: 'LV-PLATE', qty: Math.max(1, el.devices.filter((d) => !d.props.lineVoltage && d.type === 'lowvolt').length), wastePct: 0, derivedFrom: 'Low-voltage plates' });
  specs.push({ sku: 'LV-BRACKET', qty: Math.max(1, el.devices.filter((d) => !d.props.lineVoltage && d.type === 'lowvolt').length), wastePct: 0, derivedFrom: 'Low-voltage brackets' });
  specs.push({ sku: 'LV-CONDUIT', qty: el.conduitFt, wastePct: waste, derivedFrom: 'TV location down to equipment' });
  specs.push({ sku: 'LV-VELCRO', qty: 1, wastePct: 0, derivedFrom: 'Cable dress-out' });

  /* ------------------------------------------------------------ finish */
  const finish = FINISHES[wall.finish];
  const paintSqFt = parts.drywall.totalSqFt;
  let finishSqFt = 0;
  if (wall.finish === 'painted_drywall') {
    specs.push({ sku: 'FIN-PAINT', qty: Math.ceil((paintSqFt / 350) * 2), wastePct: 0, derivedFrom: `${paintSqFt} sf, 2 coats ÷ 350 sf per gal` });
  } else {
    // Finish material covers the wall face; niche interiors stay painted.
    const faceSqFt = parts.drywall.faceSqFt;
    finishSqFt = faceSqFt;
    const qty = finish.coverage > 1 ? Math.ceil((faceSqFt * (1 + waste / 100)) / finish.coverage) : faceSqFt;
    specs.push({ sku: finish.sku, qty, wastePct: finish.coverage > 1 ? 0 : waste, derivedFrom: `${faceSqFt} sf of wall face — ${finish.note}` });
    specs.push({ sku: 'FIN-ADHESIVE', qty: Math.max(1, Math.ceil(faceSqFt / 40)), wastePct: 0, derivedFrom: 'Adhesive coverage' });
    if (wall.finish === 'tile' || wall.finish === 'large_format_tile' || wall.finish === 'stone') {
      specs.push({ sku: 'FIN-GROUT', qty: Math.max(1, Math.ceil(faceSqFt / 90)), wastePct: 0, derivedFrom: 'Grout coverage' });
    }
    specs.push({ sku: 'FIN-TRIM', qty: Math.ceil((wall.heightIn * 2 + wall.widthIn * 2) / 12), wastePct: waste, derivedFrom: 'Perimeter reveal / trim', optional: true });
    // Niches and returns are still painted even with a face finish.
    const paintedSqFt = parts.drywall.nicheReturnSqFt + parts.drywall.sideReturnSqFt;
    if (paintedSqFt > 0) specs.push({ sku: 'FIN-PAINT', qty: Math.ceil((paintedSqFt / 350) * 2), wastePct: 0, derivedFrom: `${Math.round(paintedSqFt)} sf of niche + return, 2 coats` });
  }
  specs.push({ sku: 'FIN-CAULK', qty: Math.max(2, Math.ceil(parts.drywall.cornerBeadLf / 40)), wastePct: 0, derivedFrom: `${parts.drywall.cornerBeadLf} lf of corner` });
  if (wall.baseboardKeep && wall.baseboardHeightIn > 0) {
    specs.push({ sku: 'FIN-BASE', qty: Math.ceil((wall.widthIn + wall.featureDepthIn * 2) / 12), wastePct: waste, derivedFrom: `${wall.widthIn}" wall + returns` });
  }

  /* --------------------------------------------------------- casework */
  const cw = parts.casework;
  for (const plan of cw.plans) {
    specs.push({
      sku: plan.sku, qty: plan.sheetCount, wastePct: 0,
      derivedFrom: `${plan.sheets.reduce((n, sh) => n + sh.parts.length, 0)} parts nested at ${plan.yieldPct}% yield`,
    });
  }
  if (cw.edgeBandingLf > 0) specs.push({ sku: 'CW-EDGE', qty: Math.ceil(cw.edgeBandingLf / 250), wastePct: 0, derivedFrom: `${cw.edgeBandingLf} lf of exposed edge` });
  if (cw.hardware.hinges) specs.push({ sku: 'CW-HINGE', qty: cw.hardware.hinges, wastePct: 0, derivedFrom: `${cw.doorCount} doors` });
  if (cw.hardware.slidePairs) specs.push({ sku: 'CW-SLIDE', qty: cw.hardware.slidePairs, wastePct: 0, derivedFrom: `${cw.drawerCount} drawers` });
  if (cw.hardware.pulls) specs.push({ sku: 'CW-PULL', qty: cw.hardware.pulls, wastePct: 0, derivedFrom: 'One per door and drawer' });
  if (cw.hardware.pushLatches) specs.push({ sku: 'CW-PUSH', qty: cw.hardware.pushLatches, wastePct: 0, derivedFrom: 'Handleless fronts' });
  if (cw.hardware.shelfPins) specs.push({ sku: 'CW-PIN', qty: Math.max(1, Math.ceil(cw.hardware.shelfPins / 100)), wastePct: 0, derivedFrom: `${cw.hardware.shelfPins} pins for ${cw.shelfCount} adjustable shelves` });
  if (cw.hardware.levelers) specs.push({ sku: 'CW-LEVEL', qty: Math.ceil(cw.hardware.levelers / 8), wastePct: 0, derivedFrom: `${cw.hardware.levelers} levelers on floor-standing cabinets` });
  if (cw.parts.length) {
    specs.push({ sku: 'CW-SCREW', qty: 1, wastePct: 0, derivedFrom: `${cw.parts.length} carcass parts` });
    specs.push({ sku: 'CW-GLUE', qty: 1, wastePct: 0, derivedFrom: 'Carcass assembly' });
    specs.push({ sku: 'CW-FILLER', qty: Math.max(1, Math.ceil(cw.cabinetLf / 8)), wastePct: 0, derivedFrom: `${cw.cabinetLf} lf of run scribed to the wall` });
  }
  if (cw.slatCount > 0) {
    specs.push({ sku: 'CW-SLAT', qty: Math.ceil((cw.panelSqFt * (1 + waste / 100)) / SLAT_PANEL_SQFT), wastePct: 0, derivedFrom: `${cw.panelSqFt} sf of panelling ÷ ${SLAT_PANEL_SQFT} sf per panel, ${cw.slatCount} slats` });
    if (cw.backerSheets) specs.push({ sku: 'CW-BACKER', qty: cw.backerSheets, wastePct: 0, derivedFrom: `${cw.panelSqFt} sf of backer behind the slats` });
  }
  if (cw.inlayLf > 0) specs.push({ sku: 'CW-INLAY', qty: Math.ceil(cw.inlayLf / 8), wastePct: 0, derivedFrom: `${cw.inlayLf} lf of reveal between slats` });
  if (cw.hearthSqFt > 0) specs.push({ sku: 'CW-HEARTH', qty: Math.ceil(cw.hearthSqFt * (1 + waste / 100)), wastePct: 0, derivedFrom: `${cw.hearthSqFt} sf of hearth top, ${cw.hearthLf} lf` });

  /* -------------------------------------------------------- equipment */
  const tv = design.components.find((c) => c.type === 'tv');
  if (tv) specs.push({ sku: 'EQ-MOUNT', qty: 1, wastePct: 0, derivedFrom: `${tv.label} — ${(tv as any).props.weightLb} lb`, optional: true });
  const sb = design.components.find((c) => c.type === 'soundbar');
  if (sb) specs.push({ sku: 'EQ-SB-MOUNT', qty: 1, wastePct: 0, derivedFrom: sb.label, optional: true });
  const fp = design.components.find((c): c is FireplaceComponent => c.type === 'fireplace');
  if (fp) specs.push({ sku: 'EQ-FIREPLACE', qty: 1, wastePct: 0, derivedFrom: `${fp.label}${fp.props.model ? ` — ${fp.props.model}` : ''}`, optional: true });
  specs.push({ sku: 'EQ-PROTECT', qty: 1, wastePct: 0, derivedFrom: 'Floor and furniture protection' });
  specs.push({ sku: 'EQ-DISPOSAL', qty: 1, wastePct: 0, derivedFrom: 'Debris haul-away' });

  /* --------------------------------------------------- assemble lines */
  const merged = new Map<string, LineSpec>();
  for (const s of specs) {
    const prev = merged.get(s.sku);
    if (prev) {
      prev.qty += s.qty;
      prev.derivedFrom = `${prev.derivedFrom}; ${s.derivedFrom}`;
    } else merged.set(s.sku, { ...s });
  }

  const bom: BomLine[] = [];
  for (const s of merged.values()) {
    const cat = CATALOG[s.sku];
    if (!cat && !s.name) continue;
    const override = settings.priceOverrides[s.sku] || {};
    const wastePct = override.wastePct ?? s.wastePct ?? waste;
    const qty = Math.round(s.qty * 1000) / 1000;
    const isWhole = (cat?.unit ?? s.unit) !== 'ft' && (cat?.unit ?? s.unit) !== 'sq ft' && (cat?.unit ?? s.unit) !== 'lb';
    const withWaste = qty * (1 + wastePct / 100);
    bom.push({
      id: s.sku,
      category: s.category ?? cat?.category ?? 'equipment',
      sku: s.sku,
      name: s.name ?? cat.name,
      spec: s.spec ?? cat.spec,
      unit: s.unit ?? cat.unit,
      qty,
      wastePct,
      purchaseQty: isWhole ? Math.ceil(withWaste - 1e-9) : Math.round(withWaste * 10) / 10,
      unitCost: override.unitCost ?? s.unitCost ?? cat.unitCost,
      markupPct: override.markupPct ?? settings.materialMarkupPct,
      derivedFrom: s.derivedFrom,
      optional: s.optional,
    });
  }

  const order: BomCategory[] = ['framing', 'drywall', 'casework', 'electrical', 'low_voltage', 'finish', 'equipment'];
  bom.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) || a.name.localeCompare(b.name));
  return { bom, finishSqFt: Math.round(finishSqFt * 10) / 10 };
}

/** One call, everything downstream of the design. */
export function computeTakeOff(design: Design, settings: EstimateSettings): TakeOff {
  const framing = generateFraming(design);
  const drywall = calcDrywall(design);
  const electrical = calcElectrical(design);
  const cutList = calcCutList(framing.members);
  const casework = calcCasework(design);
  const { bom, finishSqFt } = buildBom(design, settings, { framing, drywall, electrical, cutList, casework });
  return { framing, drywall, electrical, cutList, casework, bom, finishSqFt };
}

export const wallFaceSqFt = (design: Design) => sqIn2SqFt(design.wall.widthIn * design.wall.heightIn);
