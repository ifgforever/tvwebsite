/**
 * Casework and paneling take-off.
 *
 * Explodes every built-in into the actual parts a shop would cut — carcass
 * sides, tops, bottoms, shelves, backs, doors, drawer boxes, slats — then nests
 * those parts onto 4×8 sheets with a guillotine packer that charges saw kerf.
 * The result is a parts list you can cut from and a sheet count you can buy.
 *
 * Same rule as everything else here: parts come from the dimensioned model, so
 * widening a cabinet re-cuts the list and re-counts the sheets.
 */
import type {
  CabinetComponent, CaseMaterial, Design, HearthComponent, PanelComponent, ShelfColumnComponent,
} from '../types';
import { SHEET_H_IN, SHEET_KERF_IN, SHEET_MATERIAL, SHEET_W_IN } from '../catalog';
import { snap } from '../units';

export interface Part {
  id: string;
  label: string;
  /** Long dimension first, as a shop would write it. */
  lengthIn: number;
  widthIn: number;
  qty: number;
  material: CaseMaterial;
  /** Which edges get banding — drives the edge-banding footage. */
  bandedEdges: number;
  fromComponent: string;
  /** Grain runs along the length; parts that must not be rotated when nesting. */
  grainSensitive: boolean;
}

export interface PlacedPart { partId: string; label: string; x: number; y: number; w: number; h: number; rotated: boolean }
export interface SheetLayout { index: number; parts: PlacedPart[]; usedSqIn: number; wastePct: number }
export interface SheetPlan {
  material: CaseMaterial;
  label: string;
  sku: string;
  sheets: SheetLayout[];
  sheetCount: number;
  yieldPct: number;
}

export interface HardwareCount {
  hinges: number;
  slidePairs: number;
  pulls: number;
  pushLatches: number;
  shelfPins: number;
  levelers: number;
}

export interface CaseworkResult {
  parts: Part[];
  plans: SheetPlan[];
  totalSheets: number;
  edgeBandingLf: number;
  hardware: HardwareCount;
  doorCount: number;
  drawerCount: number;
  shelfCount: number;
  cabinetLf: number;
  shelfColumnCount: number;
  /** Slat paneling. */
  slatCount: number;
  slatLf: number;
  panelSqFt: number;
  backerSheets: number;
  inlayLf: number;
  hearthSqFt: number;
  hearthLf: number;
  hasCasework: boolean;
  notes: string[];
}

const T = (m: CaseMaterial) => SHEET_MATERIAL[m]?.thicknessIn ?? 0.75;

let partSeq = 0;
const mkPart = (p: Omit<Part, 'id'>): Part => ({ id: `p${++partSeq}`, ...p });

/* ------------------------------------------------------------ explosion */

function shelfColumnParts(c: ShelfColumnComponent): Part[] {
  const p = c.props;
  const t = T(p.material);
  const d = Math.max(4, c.depthIn);
  const inner = Math.max(1, c.w - t * 2);
  const parts: Part[] = [
    mkPart({ label: `${c.label} — side`, lengthIn: snap(c.h), widthIn: snap(d), qty: 2, material: p.material, bandedEdges: 1, fromComponent: c.id, grainSensitive: true }),
    mkPart({ label: `${c.label} — top/bottom`, lengthIn: snap(inner), widthIn: snap(d), qty: 2, material: p.material, bandedEdges: 1, fromComponent: c.id, grainSensitive: false }),
  ];
  if (p.shelfCount > 0) {
    parts.push(mkPart({
      label: `${c.label} — shelf`,
      // Adjustable shelves are cut shy so they drop in without scraping.
      lengthIn: snap(inner - (p.adjustable ? 0.125 : 0)),
      widthIn: snap(d - (p.backPanel ? 0.25 : 0) - 0.25),
      qty: p.shelfCount, material: p.material, bandedEdges: 1, fromComponent: c.id, grainSensitive: false,
    }));
  }
  if (p.backPanel) {
    parts.push(mkPart({ label: `${c.label} — back`, lengthIn: snap(c.h), widthIn: snap(c.w), qty: 1, material: 'ply_1_2', bandedEdges: 0, fromComponent: c.id, grainSensitive: true }));
  }
  return parts;
}

function cabinetParts(c: CabinetComponent): Part[] {
  const p = c.props;
  const t = T(p.material);
  const d = Math.max(6, c.depthIn);
  const boxH = Math.max(6, c.h - (p.floating ? 0 : p.toeKickIn));
  const inner = Math.max(1, c.w - t * 2);
  const bays = Math.max(1, p.bays);
  const bayW = (inner - (bays - 1) * t) / bays;

  const parts: Part[] = [
    mkPart({ label: `${c.label} — end panel`, lengthIn: snap(boxH), widthIn: snap(d), qty: 2, material: p.material, bandedEdges: 1, fromComponent: c.id, grainSensitive: true }),
    mkPart({ label: `${c.label} — deck/top`, lengthIn: snap(inner), widthIn: snap(d), qty: 2, material: p.material, bandedEdges: 1, fromComponent: c.id, grainSensitive: false }),
    mkPart({ label: `${c.label} — back`, lengthIn: snap(boxH), widthIn: snap(c.w), qty: 1, material: 'ply_1_2', bandedEdges: 0, fromComponent: c.id, grainSensitive: true }),
  ];
  if (bays > 1) {
    parts.push(mkPart({ label: `${c.label} — bay divider`, lengthIn: snap(boxH - t * 2), widthIn: snap(d), qty: bays - 1, material: p.material, bandedEdges: 1, fromComponent: c.id, grainSensitive: true }));
  }
  if (!p.floating && p.toeKickIn > 0) {
    parts.push(mkPart({ label: `${c.label} — toe kick`, lengthIn: snap(c.w), widthIn: snap(p.toeKickIn), qty: 1, material: p.material, bandedEdges: 1, fromComponent: c.id, grainSensitive: false }));
  }

  // Fronts: a 1/8" reveal all round is standard for a flush modern look.
  const reveal = 0.125;
  if (p.doorStyle !== 'none') {
    if (p.drawersPerBay > 0) {
      const drawerH = (boxH - reveal * (p.drawersPerBay + 1)) / p.drawersPerBay;
      parts.push(mkPart({ label: `${c.label} — drawer front`, lengthIn: snap(bayW - reveal), widthIn: snap(drawerH), qty: bays * p.drawersPerBay, material: p.faceMaterial, bandedEdges: 4, fromComponent: c.id, grainSensitive: true }));
      // Four-sided drawer box plus a bottom, per drawer.
      parts.push(mkPart({ label: `${c.label} — drawer box side`, lengthIn: snap(d - 1), widthIn: snap(Math.min(7, drawerH - 1.5)), qty: bays * p.drawersPerBay * 2, material: 'ply_1_2', bandedEdges: 1, fromComponent: c.id, grainSensitive: false }));
      parts.push(mkPart({ label: `${c.label} — drawer box front/back`, lengthIn: snap(bayW - 2.5), widthIn: snap(Math.min(7, drawerH - 1.5)), qty: bays * p.drawersPerBay * 2, material: 'ply_1_2', bandedEdges: 1, fromComponent: c.id, grainSensitive: false }));
      parts.push(mkPart({ label: `${c.label} — drawer bottom`, lengthIn: snap(bayW - 2.5), widthIn: snap(d - 1.5), qty: bays * p.drawersPerBay, material: 'ply_1_2', bandedEdges: 0, fromComponent: c.id, grainSensitive: false }));
    } else {
      parts.push(mkPart({ label: `${c.label} — door`, lengthIn: snap(boxH - reveal * 2), widthIn: snap(bayW - reveal), qty: bays, material: p.faceMaterial, bandedEdges: 4, fromComponent: c.id, grainSensitive: true }));
      parts.push(mkPart({ label: `${c.label} — interior shelf`, lengthIn: snap(bayW - 0.25), widthIn: snap(d - 1), qty: bays, material: p.material, bandedEdges: 1, fromComponent: c.id, grainSensitive: false }));
    }
  }
  if (p.countertop) {
    parts.push(mkPart({ label: `${c.label} — top`, lengthIn: snap(c.w), widthIn: snap(d + 1), qty: 1, material: p.faceMaterial, bandedEdges: 3, fromComponent: c.id, grainSensitive: true }));
  }
  return parts;
}

function hearthParts(h: HearthComponent): Part[] {
  const proj = Math.max(4, h.props.projectionIn);
  const parts: Part[] = [
    mkPart({ label: `${h.label} — top`, lengthIn: snap(h.w), widthIn: snap(proj), qty: 1, material: 'ply_3_4', bandedEdges: 3, fromComponent: h.id, grainSensitive: true }),
    mkPart({ label: `${h.label} — front face`, lengthIn: snap(h.w), widthIn: snap(h.h), qty: 1, material: 'ply_3_4', bandedEdges: 1, fromComponent: h.id, grainSensitive: true }),
    mkPart({ label: `${h.label} — end cap`, lengthIn: snap(proj), widthIn: snap(h.h), qty: 2, material: 'ply_3_4', bandedEdges: 2, fromComponent: h.id, grainSensitive: false }),
  ];
  if (h.props.waterfall) {
    parts.push(mkPart({ label: `${h.label} — waterfall return`, lengthIn: snap(h.h), widthIn: snap(proj), qty: 2, material: 'ply_3_4', bandedEdges: 2, fromComponent: h.id, grainSensitive: true }));
  }
  return parts;
}

/* ------------------------------------------------ guillotine sheet nesting */

/**
 * Shelf-packing nest: parts sorted tallest-first fill horizontal bands across
 * the sheet, a new band opens when the current one runs out of width, and a new
 * sheet opens when the bands run out of height. Kerf is charged on every cut.
 * Not optimal — optimal 2-D nesting is NP-hard — but it is honest, it never
 * overfills a sheet, and it matches how a sheet actually gets broken down.
 */
export function nestParts(parts: Part[], material: CaseMaterial): SheetLayout[] {
  const items: { part: Part; w: number; h: number }[] = [];
  for (const p of parts.filter((x) => x.material === material)) {
    for (let i = 0; i < p.qty; i++) {
      // Lay each part with its long edge across the sheet where it fits better.
      const long = Math.max(p.lengthIn, p.widthIn);
      const short = Math.min(p.lengthIn, p.widthIn);
      const fitsUpright = long <= SHEET_H_IN && short <= SHEET_W_IN;
      items.push({ part: p, w: fitsUpright ? short : long, h: fitsUpright ? long : short });
    }
  }
  items.sort((a, b) => b.h - a.h || b.w - a.w);

  type Sheet = { bands: { y: number; height: number; cursorX: number }[]; placed: PlacedPart[]; usedY: number };
  const sheets: SheetLayout[] = [];
  const newSheet = (): Sheet => ({ bands: [], placed: [], usedY: 0 });
  let current: Sheet = newSheet();

  for (const item of items) {
    if (item.w > SHEET_W_IN + 1e-6 || item.h > SHEET_H_IN + 1e-6) continue; // oversize: reported separately
    let placed = false;
    for (const band of current.bands) {
      if (item.h <= band.height + 1e-6 && band.cursorX + item.w + (band.cursorX > 0 ? SHEET_KERF_IN : 0) <= SHEET_W_IN + 1e-6) {
        const x = band.cursorX + (band.cursorX > 0 ? SHEET_KERF_IN : 0);
        current.placed.push({ partId: item.part.id, label: item.part.label, x, y: band.y, w: item.w, h: item.h, rotated: item.w !== Math.min(item.part.lengthIn, item.part.widthIn) });
        band.cursorX = x + item.w;
        placed = true;
        break;
      }
    }
    if (placed) continue;

    const nextY = current.usedY + (current.usedY > 0 ? SHEET_KERF_IN : 0);
    if (nextY + item.h <= SHEET_H_IN + 1e-6) {
      current.bands.push({ y: nextY, height: item.h, cursorX: item.w });
      current.placed.push({ partId: item.part.id, label: item.part.label, x: 0, y: nextY, w: item.w, h: item.h, rotated: false });
      current.usedY = nextY + item.h;
    } else {
      sheets.push(finishSheet(current, sheets.length));
      current = newSheet();
      current.bands.push({ y: 0, height: item.h, cursorX: item.w });
      current.placed.push({ partId: item.part.id, label: item.part.label, x: 0, y: 0, w: item.w, h: item.h, rotated: false });
      current.usedY = item.h;
    }
  }
  if (current.placed.length) sheets.push(finishSheet(current, sheets.length));
  return sheets;
}

function finishSheet(s: { placed: PlacedPart[] }, index: number): SheetLayout {
  const usedSqIn = s.placed.reduce((sum, p) => sum + p.w * p.h, 0);
  const total = SHEET_W_IN * SHEET_H_IN;
  return { index, parts: s.placed, usedSqIn: Math.round(usedSqIn), wastePct: Math.round(((total - usedSqIn) / total) * 1000) / 10 };
}

/* ---------------------------------------------------------------- driver */

export function calcCasework(design: Design): CaseworkResult {
  partSeq = 0;
  const columns = design.components.filter((c): c is ShelfColumnComponent => c.type === 'shelf_column');
  const cabinets = design.components.filter((c): c is CabinetComponent => c.type === 'cabinet');
  const panels = design.components.filter((c): c is PanelComponent => c.type === 'panel');
  const hearths = design.components.filter((c): c is HearthComponent => c.type === 'hearth');

  const parts: Part[] = [
    ...columns.flatMap(shelfColumnParts),
    ...cabinets.flatMap(cabinetParts),
    ...hearths.flatMap(hearthParts),
  ];

  const materials = [...new Set(parts.map((p) => p.material))];
  const plans: SheetPlan[] = materials.map((m) => {
    const sheets = nestParts(parts, m);
    const used = sheets.reduce((s, sh) => s + sh.usedSqIn, 0);
    const total = sheets.length * SHEET_W_IN * SHEET_H_IN;
    return {
      material: m,
      label: SHEET_MATERIAL[m]?.label ?? m,
      sku: SHEET_MATERIAL[m]?.sku ?? 'CW-PLY34',
      sheets,
      sheetCount: sheets.length,
      yieldPct: total ? Math.round((used / total) * 1000) / 10 : 0,
    };
  }).filter((p) => p.sheetCount > 0);

  const edgeBandingLf = Math.ceil(
    parts.reduce((s, p) => {
      const perPiece = p.bandedEdges >= 4
        ? (p.lengthIn + p.widthIn) * 2
        : p.bandedEdges === 3 ? p.lengthIn * 2 + p.widthIn
        : p.bandedEdges === 2 ? p.lengthIn + p.widthIn
        : p.bandedEdges === 1 ? p.lengthIn : 0;
      return s + (perPiece * p.qty) / 12;
    }, 0),
  );

  let doorCount = 0;
  let drawerCount = 0;
  const hardware: HardwareCount = { hinges: 0, slidePairs: 0, pulls: 0, pushLatches: 0, shelfPins: 0, levelers: 0 };
  for (const c of cabinets) {
    const bays = Math.max(1, c.props.bays);
    if (c.props.doorStyle === 'none') continue;
    if (c.props.drawersPerBay > 0) {
      const n = bays * c.props.drawersPerBay;
      drawerCount += n;
      hardware.slidePairs += n;
    } else {
      doorCount += bays;
      // Doors over 40" tall take a third hinge.
      hardware.hinges += bays * (c.h > 40 ? 3 : 2);
      hardware.shelfPins += bays * 4;
    }
    if (c.props.hardware === 'push_latch') hardware.pushLatches += bays * Math.max(1, c.props.drawersPerBay);
    else hardware.pulls += bays * Math.max(1, c.props.drawersPerBay);
    if (!c.props.floating) hardware.levelers += Math.max(4, Math.ceil(c.w / 24) * 2);
  }
  const shelfCount = columns.reduce((s, c) => s + c.props.shelfCount, 0);
  hardware.shelfPins += columns.filter((c) => c.props.adjustable).reduce((s, c) => s + c.props.shelfCount * 4, 0);

  /* ---- paneling ---- */
  let slatCount = 0;
  let slatLf = 0;
  let panelSqFt = 0;
  let inlayLf = 0;
  for (const p of panels) {
    const pitch = Math.max(0.25, p.props.slatWidthIn + p.props.slatGapIn);
    const across = p.props.orientation === 'vertical' ? p.w : p.h;
    const runLength = p.props.orientation === 'vertical' ? p.h : p.w;
    const n = p.props.pattern === 'flat' ? 0 : Math.ceil(across / pitch);
    slatCount += n;
    slatLf += (n * runLength) / 12;
    panelSqFt += (p.w * p.h) / 144;
    if (p.props.inlay) inlayLf += (Math.max(0, n - 1) * runLength) / 12;
  }
  const backerSheets = Math.ceil(panelSqFt / 32);

  const hearthSqFt = hearths.reduce((s, h) => s + (h.w * Math.max(4, h.props.projectionIn)) / 144, 0);
  const hearthLf = hearths.reduce((s, h) => s + h.w / 12, 0);
  const cabinetLf = cabinets.reduce((s, c) => s + c.w / 12, 0);

  const notes: string[] = [];
  const oversize = parts.filter((p) => Math.max(p.lengthIn, p.widthIn) > SHEET_H_IN || Math.min(p.lengthIn, p.widthIn) > SHEET_W_IN);
  if (oversize.length) {
    notes.push(`${oversize.length} part(s) exceed a 4×8 sheet and must be seamed or ordered oversize: ${[...new Set(oversize.map((p) => p.label))].join(', ')}.`);
  }
  if (columns.some((c) => c.props.shelfCount > 0)) {
    const widest = Math.max(...columns.map((c) => c.w));
    if (widest > 36) notes.push(`Widest shelf span is ${Math.round(widest)}" — 3/4" shelves sag past about 32". Add a centre support, thicken the shelf, or edge-stiffen it.`);
  }
  if (cabinets.some((c) => !c.props.ventilated && c.props.doorStyle !== 'none')) {
    notes.push('Closed cabinets holding AV gear need ventilation and IR access — confirm with the customer what lives inside.');
  }

  return {
    parts, plans,
    totalSheets: plans.reduce((s, p) => s + p.sheetCount, 0),
    edgeBandingLf, hardware, doorCount, drawerCount, shelfCount,
    cabinetLf: Math.round(cabinetLf * 10) / 10,
    shelfColumnCount: columns.length,
    slatCount, slatLf: Math.ceil(slatLf), panelSqFt: Math.round(panelSqFt * 10) / 10,
    backerSheets, inlayLf: Math.ceil(inlayLf),
    hearthSqFt: Math.round(hearthSqFt * 10) / 10, hearthLf: Math.round(hearthLf * 10) / 10,
    hasCasework: parts.length > 0 || panels.length > 0,
    notes,
  };
}
