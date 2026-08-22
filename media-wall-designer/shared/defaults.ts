/**
 * Project and design factories.
 *
 * The default design is the layout from the reference build: three stacked
 * niches per side, a centre bay carrying TV over soundbar over a linear
 * electric fireplace, RGBW niche lighting with a recessed puck in each.
 */
import { uid } from './id';
import { LUMBER, TV_SIZES, FIREPLACE_PLACEHOLDER, LABOR_RATES, LABOR_ORDER } from './catalog';
import { layoutNicheBanks } from './geometry';
import { snap } from './units';
import type {
  CabinetComponent, Design, DeviceComponent, EstimateSettings, FireplaceComponent,
  HearthComponent, LightingZone, NicheComponent, PanelComponent, Project, ShelfColumnComponent,
  SoundbarComponent, TvComponent, Wall,
} from './types';

/** The per-niche colours in the reference photo — this is the preview that sells. */
export const NICHE_PALETTE = ['#FF3DBE', '#8B5CFF', '#3D9BFF', '#FF2E7E', '#2EE6C4', '#FF4FA3', '#FFB03D', '#4DFF88'];

/** Deepen a wall so a recessed fireplace can physically fit in it. */
export function wallForFireplace(wall: Wall, fireplaceSize: number | null): Wall {
  if (!fireplaceSize) return wall;
  if (wall.lumber !== '2x3' && wall.lumber !== '2x4') return wall;
  if (wall.featureDepthIn >= 6) return wall;
  return { ...wall, lumber: '2x6', featureDepthIn: snap(LUMBER['2x6'].actualD + wall.drywallThickness) };
}

export function defaultWall(): Wall {
  return {
    roomWidthIn: 168,
    ceilingHeightIn: 96,
    widthIn: 144,
    heightIn: 96,
    offsetXIn: 12,
    featureDepthIn: 4,
    baseboardHeightIn: 5.25,
    baseboardKeep: true,
    colorHex: '#8E8E93',
    accentColorHex: '#F5F0E8',
    finish: 'painted_drywall',
    finishNotes: '',
    studSpacing: 16,
    lumber: '2x4',
    doubleTopPlate: false,
    midBlocking: true,
    ptBottomPlate: false,
    drywallThickness: 0.5,
    sideReturns: 'both',
    wasteFactorPct: 10,
    loadBearing: 'unknown',
    existingWallNotes: '',
  };
}

export function studDepth(wall: Wall): number {
  if (wall.lumber === 'custom') return wall.customLumberDepthIn ?? 3.5;
  return LUMBER[wall.lumber].actualD;
}
/** Framed depth + finish face = the wall's finished build-out. */
export function suggestedFeatureDepth(wall: Wall): number {
  return snap(studDepth(wall) + wall.drywallThickness);
}
/** Deepest niche possible before you punch through to the existing wall. */
export function maxNicheDepth(wall: Wall): number {
  return snap(wall.featureDepthIn - wall.drywallThickness);
}

export function makeTv(wall: Wall, sizeClass = 75): TvComponent {
  const s = TV_SIZES[sizeClass] ?? TV_SIZES[75];
  return {
    id: uid('tv'), type: 'tv', label: `${sizeClass}" TV`,
    // Stacked to clear a typical 8" fireplace clearance to combustibles with
    // the soundbar between: fireplace top 35-1/2", soundbar at 44", TV at 48".
    // Real clearances still come from the manual and are checked in validate.ts.
    x: snap(wall.widthIn / 2 - s.w / 2), y: 48, w: s.w, h: s.h, depthIn: 0,
    locked: false, z: 30,
    props: {
      sizeClass, dimensionsVerified: false, manufacturer: '', model: '',
      mountType: 'fixed', vesaW: s.vesaW / 25.4, vesaH: s.vesaH / 25.4,
      weightLb: s.weightLb, recessedBox: true, biasLight: true,
    },
  };
}

export function makeFireplace(wall: Wall, advertisedIn: number = 60): FireplaceComponent {
  return {
    id: uid('fp'), type: 'fireplace', label: `${advertisedIn}" linear electric fireplace`,
    x: snap(wall.widthIn / 2 - advertisedIn / 2), y: 14,
    w: advertisedIn, h: FIREPLACE_PLACEHOLDER.heightIn, depthIn: 3.5,
    locked: false, z: 20,
    props: {
      advertisedIn, manufacturer: '', model: '',
      // Deliberately null: these come from the installation manual, never from
      // the advertised size. validate.ts blocks the final package until entered.
      overallWIn: null, overallHIn: null, overallDIn: null,
      roughWIn: null, roughHIn: null, roughDIn: null,
      clearanceTopIn: null, clearanceSideIn: null, clearanceBottomIn: null,
      clearanceFrontIn: null, clearanceToTvIn: null,
      electrical: '', ampDraw: null, hardwired: false, installNotes: '',
      specsVerified: false, specSource: '',
    },
  };
}

export function makeSoundbar(wall: Wall, w = 44): SoundbarComponent {
  return {
    id: uid('sb'), type: 'soundbar', label: 'Soundbar',
    x: snap(wall.widthIn / 2 - w / 2), y: 44, w, h: 2.75, depthIn: 0,
    locked: false, z: 25,
    props: { manufacturer: '', model: '', mount: 'wall', weightLb: 8, dimensionsVerified: false },
  };
}

export function makeNiche(rect: { x: number; y: number; w: number; h: number }, index: number, bank: 'left' | 'right' | 'center' | 'custom', depth: number): NicheComponent {
  return {
    id: uid('n'), type: 'niche', label: `Niche ${index + 1}`,
    x: rect.x, y: rect.y, w: rect.w, h: rect.h, depthIn: depth,
    locked: false, z: 10,
    props: {
      lighting: { kind: 'puck_and_strip', colorMode: 'rgbw', colorHex: NICHE_PALETTE[index % NICHE_PALETTE.length], intensityPct: 80, puckCount: 1 },
      backFinish: 'match_wall', backColorHex: '#F2F2F4', hasShelf: false, bank, index,
    },
  };
}

/* ------------------------------------------------------------- casework */

export function makeShelfColumn(
  rect: { x: number; y: number; w: number; h: number },
  opts: Partial<ShelfColumnComponent['props']> & { label?: string; depthIn?: number } = {},
): ShelfColumnComponent {
  return {
    id: uid('sc'), type: 'shelf_column', label: opts.label ?? 'Shelf column',
    x: snap(rect.x), y: snap(rect.y), w: snap(rect.w), h: snap(rect.h),
    depthIn: opts.depthIn ?? 12, locked: false, z: 12,
    props: {
      shelfCount: 4, shelfPositions: [], material: 'hardwood_ply_3_4',
      shelfThicknessIn: 0.75, carcassThicknessIn: 0.75,
      backPanel: true, adjustable: true, edgeBanding: true,
      lighting: { kind: 'led_strip', colorMode: 'warm', colorHex: '#FFE3B0', intensityPct: 75, puckCount: 0 },
      interiorColorHex: '#F2EFE9', faceColorHex: '#C8A97E',
      ...opts,
    },
  };
}

export function makeCabinet(
  rect: { x: number; y: number; w: number; h: number },
  opts: Partial<CabinetComponent['props']> & { label?: string; depthIn?: number } = {},
): CabinetComponent {
  return {
    id: uid('cab'), type: 'cabinet', label: opts.label ?? 'Base cabinet run',
    x: snap(rect.x), y: snap(rect.y), w: snap(rect.w), h: snap(rect.h),
    depthIn: opts.depthIn ?? 16, locked: false, z: 14,
    props: {
      bays: Math.max(1, Math.round(rect.w / 24)), doorStyle: 'slab', drawersPerBay: 0,
      toeKickIn: 4, floating: false, material: 'ply_3_4', faceMaterial: 'hardwood_ply_3_4',
      hardware: 'push_latch', countertop: false, ventilated: true, faceColorHex: '#C8A97E',
      ...opts,
    },
  };
}

export function makePanel(
  rect: { x: number; y: number; w: number; h: number },
  opts: Partial<PanelComponent['props']> & { label?: string; depthIn?: number } = {},
): PanelComponent {
  return {
    id: uid('pnl'), type: 'panel', label: opts.label ?? 'Slat panel',
    x: snap(rect.x), y: snap(rect.y), w: snap(rect.w), h: snap(rect.h),
    depthIn: opts.depthIn ?? 0.75, locked: false, z: 5,
    props: {
      pattern: 'slat', orientation: 'vertical',
      slatWidthIn: 1.25, slatGapIn: 0.75, slatDepthIn: 0.75,
      material: 'slat_panel_kit', colorHex: '#9A6E44', backerColorHex: '#1A1A1A',
      inlay: false, inlayColorHex: '#C8A94A',
      ...opts,
    },
  };
}

export function makeHearth(
  rect: { x: number; y: number; w: number; h: number },
  opts: Partial<HearthComponent['props']> & { label?: string } = {},
): HearthComponent {
  return {
    id: uid('hth'), type: 'hearth', label: opts.label ?? 'Hearth ledge',
    x: snap(rect.x), y: snap(rect.y), w: snap(rect.w), h: snap(rect.h),
    depthIn: 0, locked: false, z: 16,
    props: {
      projectionIn: 12, material: 'ply_3_4', waterfall: false, litToeKick: true,
      colorHex: '#E8E2D6', seating: false,
      ...opts,
    },
  };
}

export function makeDevice(
  type: DeviceComponent['type'], kind: DeviceComponent['props']['kind'], label: string,
  x: number, y: number, opts: Partial<DeviceComponent['props']> = {}, size: [number, number] = [4.5, 4.5],
): DeviceComponent {
  return {
    id: uid('d'), type, label, x: snap(x), y: snap(y), w: size[0], h: size[1], depthIn: 3.5,
    locked: false, z: 40,
    props: {
      kind, circuit: '', lineVoltage: type === 'outlet' || type === 'switch' || type === 'junction',
      boxType: '', notes: '', servesId: null, ...opts,
    },
  };
}

/** Standard device set for a media wall — every one of them is movable. */
export function seedDevices(design: Design): DeviceComponent[] {
  const tv = design.components.find((c) => c.type === 'tv');
  const fp = design.components.find((c) => c.type === 'fireplace');
  const w = design.wall;
  const out: DeviceComponent[] = [];

  if (tv) {
    const cx = tv.x + tv.w / 2;
    out.push(makeDevice('outlet', 'recessed_receptacle', 'TV power — recessed box', cx - 9, tv.y + tv.h / 2 - 3, { circuit: 'A', boxType: 'Recessed combo box', servesId: tv.id, notes: 'Behind panel, off mount plate' }, [6, 6]));
    out.push(makeDevice('lowvolt', 'low_volt_plate', 'TV low-voltage — HDMI / Cat6', cx + 3, tv.y + tv.h / 2 - 3, { lineVoltage: false, boxType: 'LV bracket + brush plate', servesId: tv.id, notes: 'Conduit down to equipment bay' }, [6, 6]));
  }
  if (fp) {
    out.push(makeDevice('outlet', 'receptacle', 'Fireplace power', fp.x + fp.w - 10, fp.y + 4, { circuit: 'B', boxType: 'Per manufacturer — verify location & type', servesId: fp.id, notes: 'Location must match the installation manual' }));
  }
  out.push(makeDevice('junction', 'led_driver', 'LED driver + controller', w.widthIn - 16, 8, { circuit: 'C', boxType: 'Accessible enclosure', notes: 'Must remain accessible — no buried splices' }, [8, 6]));
  out.push(makeDevice('switch', 'dimmer', 'Lighting control', 6, 46, { circuit: 'C', boxType: '1-gang', notes: 'Dimmer / RGBW controller keypad' }, [4.5, 5]));
  out.push(makeDevice('equipment', 'equipment_bay', 'Equipment location', w.widthIn - 30, 6, { lineVoltage: false, notes: 'Cable box / receiver / console — confirm with customer' }, [16, 8]));
  return out;
}

export function seedLighting(design: Design): LightingZone[] {
  const niches = design.components.filter((c): c is NicheComponent => c.type === 'niche');
  const tv = design.components.find((c) => c.type === 'tv') as TvComponent | undefined;
  const zones: LightingZone[] = [];
  if (niches.length) {
    const perimeterFt = niches.reduce((s, n) => s + (2 * (n.w + n.h)) / 12, 0);
    zones.push({
      id: uid('lz'), label: 'Niche RGBW strips', kind: 'niche_strip', colorMode: 'rgbw',
      colorHex: '#FF3DBE', targets: niches.map((n) => n.id), lengthFt: Math.ceil(perimeterFt),
      controller: 'wifi', driverWatts: Math.ceil(perimeterFt * 4), notes: 'Strip concealed behind a front reveal at the niche opening',
    });
    zones.push({
      id: uid('lz'), label: 'Niche puck lights', kind: 'niche_puck', colorMode: 'warm',
      colorHex: '#FFE3B0', targets: niches.map((n) => n.id), lengthFt: 0,
      controller: 'none', driverWatts: niches.length * 3, notes: 'One recessed puck at the top of each niche',
    });
  }
  if (tv?.props.biasLight) {
    zones.push({
      id: uid('lz'), label: 'TV bias light', kind: 'tv_bias', colorMode: 'rgb', colorHex: '#3D9BFF',
      targets: [tv.id], lengthFt: Math.ceil((2 * (tv.w + tv.h)) / 12), controller: 'ir', driverWatts: 12,
      notes: 'USB or driver-fed strip on the back of the panel',
    });
  }
  return zones;
}

export interface DesignPresetOptions {
  nichesPerSide: number;
  tvSize: number;
  fireplaceSize: number | null;
  soundbar: boolean;
  /** Which vocabulary the wall is built from. */
  style: WallStyle;
}

/**
 * The three ways these walls actually get built.
 *
 *  drywall_niches — framed build-out, recessed lit niches, painted. The
 *                   reference job.
 *  built_in       — furniture-grade casework: shelf columns flanking the TV,
 *                   a base cabinet run under it.
 *  slat_panel     — a slat or fluted panel field behind the TV, usually with a
 *                   floating console and a projecting hearth.
 */
export type WallStyle = 'drywall_niches' | 'built_in' | 'slat_panel';

export const WALL_STYLES: { id: WallStyle; label: string; note: string }[] = [
  { id: 'drywall_niches', label: 'Drywall + lit niches', note: 'Framed build-out, recessed niches, painted' },
  { id: 'built_in', label: 'Built-in casework', note: 'Shelf columns and a base cabinet run' },
  { id: 'slat_panel', label: 'Slat panel + console', note: 'Slat field, floating console, hearth ledge' },
];

/** The reference layout, scaled to whatever wall you give it. */
export function createDefaultDesign(baseWall = defaultWall(), opts: Partial<DesignPresetOptions> = {}): Design {
  const o: DesignPresetOptions = { nichesPerSide: 3, tvSize: 75, fireplaceSize: 60, soundbar: true, style: 'drywall_niches', ...opts };
  // A linear electric fireplace typically wants 5–6" of recess, which a 2×4
  // build-out cannot give. Start a wall that carries one deep enough to be
  // buildable; the real rough depth still comes from the manual and is still
  // checked against this in validate.ts.
  const wall = wallForFireplace(baseWall, o.fireplaceSize);
  if (o.style === 'built_in') return createBuiltInDesign(wall, o);
  if (o.style === 'slat_panel') return createSlatPanelDesign(wall, o);
  const design: Design = {
    schemaVersion: 1, wall, components: [], lighting: [],
    basePhotoId: null, calibration: null, designNotes: '',
  };

  const tv = makeTv(wall, o.tvSize);
  design.components.push(tv);
  if (o.fireplaceSize) design.components.push(makeFireplace(wall, o.fireplaceSize));
  if (o.soundbar) design.components.push(makeSoundbar(wall, Math.min(48, Math.round(tv.w * 0.62))));

  if (o.nichesPerSide > 0) {
    // Size the banks so the centre bay clears the TV with room to breathe.
    const centerBayW = Math.max(tv.w + 24, wall.widthIn * 0.5);
    const sideW = (wall.widthIn - centerBayW) / 2;
    const edgeMargin = Math.max(4, Math.min(8, sideW * 0.18));
    const nicheW = snap(Math.max(10, sideW - edgeMargin * 2 + edgeMargin));
    const usableH = wall.heightIn - 20;
    const vGap = 5;
    const nicheH = snap(Math.max(9, (usableH - vGap * (o.nichesPerSide - 1)) / o.nichesPerSide));
    const rects = layoutNicheBanks(wall, {
      perSide: o.nichesPerSide, columns: 1, nicheW, nicheH,
      depth: maxNicheDepth(wall), hGap: 4, vGap, edgeMargin, centerY: wall.heightIn / 2 + 4,
    });
    rects.forEach((r, i) => {
      const bank = r.x < wall.widthIn / 2 ? 'left' : 'right';
      design.components.push(makeNiche(r, i, bank, maxNicheDepth(wall)));
    });
  }

  design.components.push(...seedDevices(design));
  design.lighting = seedLighting(design);
  return design;
}

/**
 * Built-in casework: a lit shelf column each side, TV centred, base cabinet run
 * across the bottom. The white-painted and oak built-ins in the reference set.
 */
export function createBuiltInDesign(wall: Wall, o: DesignPresetOptions): Design {
  const design: Design = {
    schemaVersion: 1, wall: { ...wall, finish: 'painted_drywall' }, components: [], lighting: [],
    basePhotoId: null, calibration: null, designNotes: 'Built-in casework: lit shelf columns flanking the display, base cabinet run below.',
  };
  const baseH = 22;
  const colW = Math.max(14, Math.min(30, wall.widthIn * 0.17));
  const colH = wall.heightIn - baseH - 4;

  design.components.push(
    makeCabinet({ x: 0, y: 0, w: wall.widthIn, h: baseH }, { label: 'Base cabinet run', depthIn: 16, bays: Math.max(3, Math.round(wall.widthIn / 26)), drawersPerBay: 0 }),
    makeShelfColumn({ x: 0, y: baseH, w: colW, h: colH }, { label: 'Left shelf column' }),
    makeShelfColumn({ x: wall.widthIn - colW, y: baseH, w: colW, h: colH }, { label: 'Right shelf column' }),
  );

  // Stack the centre bay from the cabinet top up, so nothing collides:
  // fireplace, then soundbar, then the panel.
  const fpTop = o.fireplaceSize ? baseH + 2 + FIREPLACE_PLACEHOLDER.heightIn : baseH;
  if (o.fireplaceSize) {
    const fp = makeFireplace(wall, o.fireplaceSize);
    fp.y = snap(baseH + 2);
    fp.x = snap(wall.widthIn / 2 - o.fireplaceSize / 2);
    design.components.push(fp);
  }
  if (o.soundbar) {
    const sb = makeSoundbar(wall, Math.min(48, Math.round(TV_SIZES[o.tvSize]?.w ?? 66) * 0.62));
    sb.y = snap(fpTop + 3);
    design.components.push(sb);
  }
  const tv = makeTv(wall, o.tvSize);
  tv.y = snap(fpTop + (o.soundbar ? 8 : 4));
  // Bias light stays off here — these builds use shelf and cove light instead.
  tv.props.biasLight = false;
  design.components.push(tv);
  design.components.push(...seedDevices(design));
  design.lighting = seedLighting(design);
  design.lighting.push({
    id: uid('lz'), label: 'Shelf strip lighting', kind: 'shelf_strip', colorMode: 'warm', colorHex: '#FFE3B0',
    targets: design.components.filter((c) => c.type === 'shelf_column').map((c) => c.id),
    lengthFt: Math.ceil((colW * 8) / 12), controller: 'wifi', driverWatts: 60,
    notes: 'Strip behind the front edge of every shelf, wired back to one driver',
  });
  return design;
}

/**
 * Slat panel field behind the TV, floating console under it, hearth ledge at the
 * base, cove light haloing the panel. The dark-slat and oak-slat references.
 */
export function createSlatPanelDesign(wall: Wall, o: DesignPresetOptions): Design {
  const design: Design = {
    schemaVersion: 1, wall: { ...wall, finish: 'painted_drywall', colorHex: '#6E6E76' }, components: [], lighting: [],
    basePhotoId: null, calibration: null, designNotes: 'Vertical slat panel field behind the display, floating console, projecting hearth ledge.',
  };
  const hearthH = 14;
  const panelW = Math.min(wall.widthIn - 12, Math.max(72, wall.widthIn * 0.62));
  const panelX = snap(wall.widthIn / 2 - panelW / 2);

  design.components.push(
    makePanel({ x: panelX, y: hearthH, w: panelW, h: wall.heightIn - hearthH }, { label: 'Vertical slat panel' }),
    makeHearth({ x: snap(panelX - 6), y: 0, w: snap(panelW + 12), h: hearthH }, { label: 'Hearth ledge', projectionIn: 12 }),
  );

  if (o.fireplaceSize) {
    const fp = makeFireplace(wall, o.fireplaceSize);
    fp.y = snap(hearthH + 4);
    fp.x = snap(wall.widthIn / 2 - o.fireplaceSize / 2);
    design.components.push(fp);
  }
  const tv = makeTv(wall, o.tvSize);
  tv.y = snap(hearthH + 4 + FIREPLACE_PLACEHOLDER.heightIn + 12);
  // The halo around the panel does the lighting work; a blue bias fights it.
  tv.props.biasLight = false;
  design.components.push(tv);
  if (o.soundbar) {
    const sb = makeSoundbar(wall, Math.min(48, Math.round(tv.w * 0.62)));
    sb.y = snap(tv.y - 5);
    design.components.push(sb);
  }
  design.components.push(makeCabinet({ x: snap(panelX - 6), y: hearthH, w: snap(panelW + 12), h: 0.01 }, { label: 'Floating console', floating: true, depthIn: 14, drawersPerBay: 1, doorStyle: 'none' }));
  // The console is decorative in this preset until the user gives it height.
  design.components = design.components.filter((c) => c.h > 0.5);

  design.components.push(...seedDevices(design));
  design.lighting = seedLighting(design);
  design.lighting.push({
    id: uid('lz'), label: 'Panel cove halo', kind: 'cove', colorMode: 'warm', colorHex: '#FFD9A0',
    targets: design.components.filter((c) => c.type === 'panel').map((c) => c.id),
    lengthFt: Math.ceil((panelW * 2 + wall.heightIn * 2) / 12), controller: 'wifi', driverWatts: 70,
    notes: 'Concealed strip washing the wall around the panel edge',
  });
  return design;
}

export function defaultEstimateSettings(): EstimateSettings {
  return {
    labor: LABOR_ORDER.map((category) => ({
      id: uid('lb'), category, description: LABOR_RATES[category].label,
      mode: 'hourly' as const, hours: 0,
      rate: LABOR_RATES[category].rate, costRate: LABOR_RATES[category].cost, fixed: 0, fixedCost: 0,
      autoCalculated: true, subcontracted: category === 'electrical',
    })),
    materialMarkupPct: 20,
    laborMarkupPct: 0,
    overheadPct: 8,
    targetMarginPct: 35,
    taxRatePct: 10.25,
    taxOnLabor: false,
    discount: 0,
    discountIsPct: false,
    depositPct: 50,
    priceOverrides: {},
    excludedSkus: [],
    proposalNotes: '',
    validDays: 30,
  };
}

export function createProject(partial: Partial<Project> = {}): Project {
  const now = new Date().toISOString();
  return {
    id: uid('prj'),
    name: partial.name || 'New media wall',
    status: 'lead',
    customer: { name: '', address: '', city: '', state: 'IL', zip: '', phone: '', email: '' },
    notes: '',
    createdAt: now,
    updatedAt: now,
    design: createDefaultDesign(),
    estimateSettings: defaultEstimateSettings(),
    photos: [],
    renderings: [],
    approvedRevisionId: null,
    approvedAt: null,
    tierOffered: null,
    ...partial,
  };
}
