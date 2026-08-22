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
  Design, DeviceComponent, EstimateSettings, FireplaceComponent, LightingZone, NicheComponent,
  Project, SoundbarComponent, TvComponent, Wall,
} from './types';

/** The per-niche colours in the reference photo — this is the preview that sells. */
export const NICHE_PALETTE = ['#FF3DBE', '#8B5CFF', '#3D9BFF', '#FF2E7E', '#2EE6C4', '#FF4FA3', '#FFB03D', '#4DFF88'];

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
    x: snap(wall.widthIn / 2 - s.w / 2), y: 47, w: s.w, h: s.h, depthIn: 0,
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
    x: snap(wall.widthIn / 2 - w / 2), y: 41, w, h: 2.75, depthIn: 0,
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
}

/** The reference layout, scaled to whatever wall you give it. */
export function createDefaultDesign(wall = defaultWall(), opts: Partial<DesignPresetOptions> = {}): Design {
  const o: DesignPresetOptions = { nichesPerSide: 3, tvSize: 75, fireplaceSize: 60, soundbar: true, ...opts };
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
