/**
 * Media Wall Designer — the dimensioned construction model.
 *
 * THE ONE RULE: this file is the source of truth. Drawings, quantities, cut
 * lists, prices and AI renderings are all derived from it. Nothing is ever
 * measured back out of an image.
 *
 * Units: inches, decimal, y-up, origin at the bottom-left of the feature wall
 * at finished floor. See docs/ARCHITECTURE.md §1.
 */

export const ROUND_TO = 0.0625; // 1/16"

/* ------------------------------------------------------------------ project */

export type ProjectStatus =
  | 'lead'
  | 'measured'
  | 'designing'
  | 'proposed'
  | 'approved'
  | 'scheduled'
  | 'in_progress'
  | 'complete'
  | 'lost';

export interface Customer {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
}

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  customer: Customer;
  notes: string;
  createdAt: string;
  updatedAt: string;
  design: Design;
  estimateSettings: EstimateSettings;
  photos: PhotoRef[];
  renderings: RenderingRef[];
  /** Set when the customer signs off on a specific revision. */
  approvedRevisionId?: string | null;
  approvedAt?: string | null;
  tierOffered?: TierId | null;
}

/* --------------------------------------------------------------------- wall */

export type FinishId =
  | 'painted_drywall'
  | 'wood_slat'
  | 'stone'
  | 'tile'
  | 'large_format_tile'
  | 'wood_panel'
  | 'custom';

export type LumberSize = '2x3' | '2x4' | '2x6' | '2x8' | 'custom';
export type DrywallThickness = 0.5 | 0.625;
export type StudSpacing = 12 | 16 | 24;

/** Which vertical edges of the feature wall are exposed and need a drywall return. */
export type SideReturns = 'none' | 'left' | 'right' | 'both';

export interface Wall {
  /** Full room wall, used for photo calibration and to place a partial feature wall. */
  roomWidthIn: number;
  ceilingHeightIn: number;
  /** The built-out feature wall. */
  widthIn: number;
  heightIn: number;
  offsetXIn: number;
  /** Finished build-out depth from the existing wall face, including drywall. */
  featureDepthIn: number;
  baseboardHeightIn: number;
  baseboardKeep: boolean;
  colorHex: string;
  accentColorHex: string;
  finish: FinishId;
  finishNotes: string;
  /** Construction settings that drive every take-off. */
  studSpacing: StudSpacing;
  lumber: LumberSize;
  /** Double top plate. Only meaningful if the build-out carries load — it should not. */
  doubleTopPlate: boolean;
  /** Horizontal mid-height blocking row for drywall backing / rigidity. */
  midBlocking: boolean;
  /** Pressure-treated bottom plate (slab / basement floor). */
  ptBottomPlate: boolean;
  customLumberDepthIn?: number;
  drywallThickness: DrywallThickness;
  sideReturns: SideReturns;
  wasteFactorPct: number;
  /** Does this wall carry load? Never assumed — see validate.ts. */
  loadBearing: 'unknown' | 'no' | 'yes';
  existingWallNotes: string;
}

/* ---------------------------------------------------------------- component */

export type ComponentType =
  | 'tv'
  | 'fireplace'
  | 'niche'
  | 'soundbar'
  | 'shelf'
  /** Open shelving column — a carcass with N shelves in it. */
  | 'shelf_column'
  /** Base or wall cabinet run with doors and/or drawers. */
  | 'cabinet'
  /** A panelled region of the wall: slats, fluting, battens. */
  | 'panel'
  /** Projecting hearth, bench or plinth at the base of the wall. */
  | 'hearth'
  | 'outlet'
  | 'lowvolt'
  | 'switch'
  | 'junction'
  | 'equipment'
  | 'custom';

export interface BaseComponent {
  id: string;
  type: ComponentType;
  label: string;
  /** Bottom-left corner, inches from wall origin. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Recess into the wall from the finished face (0 = surface mounted). */
  depthIn: number;
  locked: boolean;
  /** Paint order within the elevation. */
  z: number;
  groupId?: string | null;
}

export type TvMountType = 'fixed' | 'tilt' | 'full_motion' | 'recessed_box';

export interface TvComponent extends BaseComponent {
  type: 'tv';
  props: {
    /** Advertised diagonal. Panel w/h are stored separately and always win. */
    sizeClass: number | 'custom';
    /** Typical panel dimensions — editable, flagged as needing verification. */
    dimensionsVerified: boolean;
    manufacturer: string;
    model: string;
    mountType: TvMountType;
    /** Mount plate footprint, drives blocking width. */
    vesaW: number;
    vesaH: number;
    weightLb: number;
    recessedBox: boolean;
    biasLight: boolean;
  };
}

export interface FireplaceComponent extends BaseComponent {
  type: 'fireplace';
  props: {
    /** Advertised size (50/60/72/84/100). NEVER used to infer the rough opening. */
    advertisedIn: number | 'custom';
    manufacturer: string;
    model: string;
    /** Overall unit dimensions from the manufacturer. */
    overallWIn: number | null;
    overallHIn: number | null;
    overallDIn: number | null;
    /** Manufacturer rough opening — entered by a human, never derived. */
    roughWIn: number | null;
    roughHIn: number | null;
    roughDIn: number | null;
    /** Required clearances to combustibles, from the installation manual. */
    clearanceTopIn: number | null;
    clearanceSideIn: number | null;
    clearanceBottomIn: number | null;
    clearanceFrontIn: number | null;
    /** Clearance from the top of the unit to a TV / mantel, per manual. */
    clearanceToTvIn: number | null;
    electrical: string;
    ampDraw: number | null;
    hardwired: boolean;
    installNotes: string;
    /** Gate: no construction package prints as final until this is true. */
    specsVerified: boolean;
    specSource: string;
  };
}

export type LightKind = 'none' | 'puck' | 'led_strip' | 'puck_and_strip';
export type LightColorMode = 'white' | 'warm' | 'rgb' | 'rgbw';

export interface NicheLighting {
  kind: LightKind;
  colorMode: LightColorMode;
  /** Display colour for the preview; also printed on the lighting schedule. */
  colorHex: string;
  intensityPct: number;
  puckCount: number;
}

export interface NicheComponent extends BaseComponent {
  type: 'niche';
  props: {
    lighting: NicheLighting;
    backFinish: FinishId | 'match_wall';
    backColorHex: string;
    hasShelf: boolean;
    /** Bank membership so symmetric edits can move a whole column. */
    bank: 'left' | 'right' | 'center' | 'custom';
    index: number;
  };
}

export interface SoundbarComponent extends BaseComponent {
  type: 'soundbar';
  props: {
    manufacturer: string;
    model: string;
    mount: 'wall' | 'niche' | 'shelf';
    weightLb: number;
    dimensionsVerified: boolean;
  };
}

export interface ShelfComponent extends BaseComponent {
  type: 'shelf';
  props: { material: string; floating: boolean; capacityLb: number };
}

/* ------------------------------------------------------------- casework */

/** Sheet material a carcass is built from. Drives the sheet-goods take-off. */
export type CaseMaterial = 'ply_3_4' | 'ply_1_2' | 'mdf_3_4' | 'melamine_3_4' | 'hardwood_ply_3_4';

export type DoorStyle = 'none' | 'slab' | 'shaker' | 'fluted' | 'glass';

/**
 * An open shelving column — the tall lit bookcases flanking the TV in a
 * built-in. Shelves are evenly divided unless `shelfPositions` is set, and each
 * one becomes a real part in the sheet-goods cut list.
 */
export interface ShelfColumnComponent extends BaseComponent {
  type: 'shelf_column';
  props: {
    shelfCount: number;
    /** Explicit shelf heights above the column's own base, inches. Empty = even. */
    shelfPositions: number[];
    material: CaseMaterial;
    shelfThicknessIn: number;
    /** Carcass sides/top/bottom thickness. */
    carcassThicknessIn: number;
    backPanel: boolean;
    adjustable: boolean;
    edgeBanding: boolean;
    lighting: NicheLighting;
    /** Interior finish colour, or match the wall. */
    interiorColorHex: string;
    faceColorHex: string;
  };
}

/**
 * A cabinet run — the base units under a built-in, or a floating console.
 * `bays` is how many door/drawer openings across; the take-off counts doors,
 * hinges, slides and pulls from it.
 */
export interface CabinetComponent extends BaseComponent {
  type: 'cabinet';
  props: {
    bays: number;
    doorStyle: DoorStyle;
    /** 0 = doors in every bay; otherwise this many drawers per bay. */
    drawersPerBay: number;
    toeKickIn: number;
    floating: boolean;
    material: CaseMaterial;
    faceMaterial: CaseMaterial;
    hardware: 'pull' | 'knob' | 'push_latch';
    countertop: boolean;
    /** Ventilation matters when AV gear lives behind a closed door. */
    ventilated: boolean;
    faceColorHex: string;
  };
}

/**
 * A panelled region: vertical slats, fluting, battens. Modelled as its own
 * object rather than a wall-wide finish so a slat field can sit behind the TV
 * with painted drywall around it — which is how these walls are actually built.
 */
export type PanelPattern = 'slat' | 'fluted' | 'batten' | 'shiplap' | 'flat';

export interface PanelComponent extends BaseComponent {
  type: 'panel';
  props: {
    pattern: PanelPattern;
    orientation: 'vertical' | 'horizontal';
    /** Face width of one slat and the gap between them. */
    slatWidthIn: number;
    slatGapIn: number;
    /** How far the slat stands off its backer. */
    slatDepthIn: number;
    material: CaseMaterial | 'slat_panel_kit' | 'solid_wood';
    colorHex: string;
    /** Backer board behind the slats, usually painted black. */
    backerColorHex: string;
    /** Metallic reveal strips between slats, as in the reference photo. */
    inlay: boolean;
    inlayColorHex: string;
  };
}

export type DeviceKind =
  | 'receptacle'
  | 'recessed_receptacle'
  | 'quad_receptacle'
  | 'switch'
  | 'dimmer'
  | 'low_volt_plate'
  | 'hdmi'
  | 'ethernet'
  | 'conduit_port'
  | 'junction_box'
  | 'led_driver'
  | 'led_controller'
  | 'equipment_bay';

export interface DeviceComponent extends BaseComponent {
  type: 'outlet' | 'lowvolt' | 'switch' | 'junction' | 'equipment';
  props: {
    kind: DeviceKind;
    circuit: string;
    /** True when this device must be installed by a licensed electrician. */
    lineVoltage: boolean;
    boxType: string;
    notes: string;
    /** Serves which component (TV, fireplace, niche bank …). */
    servesId?: string | null;
  };
}

export interface CustomComponent extends BaseComponent {
  type: 'custom';
  props: { notes: string; colorHex: string; recessed: boolean };
}

/**
 * The projecting ledge under a fireplace — a hearth, bench or plinth. It reads
 * as a solid slab in elevation but is a framed box with a finished top, so it
 * carries its own framing, sheet goods and finish quantities.
 */
export interface HearthComponent extends BaseComponent {
  type: 'hearth';
  props: {
    /** How far it stands proud of the finished wall face. */
    projectionIn: number;
    material: CaseMaterial | 'stone' | 'solid_wood' | 'plaster';
    /** Finished top returning down the front face. */
    waterfall: boolean;
    /** Recessed toe-kick lighting under the front edge. */
    litToeKick: boolean;
    colorHex: string;
    /** Seating-rated construction rather than a decorative ledge. */
    seating: boolean;
  };
}

export type DesignComponent =
  | TvComponent
  | FireplaceComponent
  | NicheComponent
  | SoundbarComponent
  | ShelfComponent
  | ShelfColumnComponent
  | CabinetComponent
  | PanelComponent
  | HearthComponent
  | DeviceComponent
  | CustomComponent;

/* ----------------------------------------------------------------- lighting */

export interface LightingZone {
  id: string;
  label: string;
  kind: 'niche_strip' | 'niche_puck' | 'tv_bias' | 'cove' | 'toe_kick' | 'perimeter'
    | 'shelf_strip' | 'slat_reveal' | 'vertical_bar' | 'under_cabinet';
  colorMode: LightColorMode;
  colorHex: string;
  /** Component ids this zone serves; empty = wall-level. */
  targets: string[];
  lengthFt: number;
  controller: 'none' | 'ir' | 'rf' | 'wifi' | 'dmx';
  driverWatts: number;
  notes: string;
}

/* ------------------------------------------------------------------- design */

export interface PhotoCalibration {
  /** Photo pixel coordinates of the feature-wall corners, in this order. */
  topLeft: [number, number];
  topRight: [number, number];
  bottomRight: [number, number];
  bottomLeft: [number, number];
  /** Real-world size the quad represents, inches. */
  realWidthIn: number;
  realHeightIn: number;
  calibrated: boolean;
}

export interface Design {
  schemaVersion: 1;
  wall: Wall;
  components: DesignComponent[];
  lighting: LightingZone[];
  /** Photo used as the BEFORE image and the AI rendering base. */
  basePhotoId: string | null;
  calibration: PhotoCalibration | null;
  designNotes: string;
}

/* -------------------------------------------------------------------- media */

export interface PhotoRef {
  id: string;
  kind: 'before' | 'after' | 'reference' | 'progress';
  url: string;
  width: number;
  height: number;
  caption: string;
  createdAt: string;
  /** Crop / straighten applied in the app, stored so it stays non-destructive. */
  transform?: { rotateDeg: number; cropX: number; cropY: number; cropW: number; cropH: number } | null;
}

export interface RenderingRef {
  id: string;
  variant: number;
  status: 'queued' | 'ready' | 'failed' | 'unavailable';
  url: string | null;
  prompt: string;
  provider: string;
  revisionId: string | null;
  error?: string | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ pricing */

export type BomCategory =
  | 'framing'
  | 'drywall'
  | 'electrical'
  | 'low_voltage'
  | 'finish'
  /** Sheet goods, edge banding, hardware — everything a carcass needs. */
  | 'casework'
  | 'equipment';

export interface BomLine {
  id: string;
  category: BomCategory;
  sku: string;
  name: string;
  spec: string;
  unit: string;
  /** Calculated quantity before waste. */
  qty: number;
  wastePct: number;
  /** qty × (1 + waste), rounded up to whole purchasable units. */
  purchaseQty: number;
  unitCost: number;
  markupPct: number;
  /** Derived from the model — shown in the drawing set, not editable. */
  derivedFrom: string;
  optional?: boolean;
}

export type LaborCategory =
  | 'design'
  | 'demo'
  | 'framing'
  | 'casework'
  | 'paneling'
  | 'electrical'
  | 'low_voltage'
  | 'drywall'
  | 'finishing'
  | 'painting'
  | 'tv_install'
  | 'fireplace_install'
  | 'lighting_install'
  | 'cleanup';

export interface LaborLine {
  id: string;
  category: LaborCategory;
  description: string;
  mode: 'hourly' | 'fixed';
  hours: number;
  /** Billed to the customer. */
  rate: number;
  /** Burdened crew cost — internal only, drives the profit figure. */
  costRate: number;
  fixed: number;
  /** Internal cost of a fixed-price line (e.g. what the sub charges you). */
  fixedCost: number;
  /** Suggested by the model; cleared once the user edits the line. */
  autoCalculated: boolean;
  subcontracted: boolean;
}

export interface EstimateSettings {
  labor: LaborLine[];
  materialMarkupPct: number;
  laborMarkupPct: number;
  /** Applied to the whole job after markup. */
  overheadPct: number;
  targetMarginPct: number;
  taxRatePct: number;
  taxOnLabor: boolean;
  discount: number;
  discountIsPct: boolean;
  depositPct: number;
  /** Per-line unit-cost and waste overrides, keyed by BOM sku. */
  priceOverrides: Record<string, { unitCost?: number; wastePct?: number; markupPct?: number }>;
  excludedSkus: string[];
  proposalNotes: string;
  validDays: number;
}

export type TierId = 'good' | 'better' | 'best';

/* ------------------------------------------------------------------ framing */

export type MemberKind =
  | 'bottom_plate'
  | 'top_plate'
  | 'cap_plate'
  | 'stud'
  | 'king_stud'
  | 'jack_stud'
  | 'cripple'
  | 'header'
  | 'sill'
  | 'ladder_rung'
  | 'niche_side'
  | 'blocking'
  | 'tv_blocking'
  | 'soundbar_blocking'
  | 'furring';

export interface FramingMember {
  id: string;
  kind: MemberKind;
  /** Elevation footprint, inches, same coordinate space as components. */
  x: number;
  y: number;
  w: number;
  h: number;
  orientation: 'vertical' | 'horizontal';
  /** Cut length — the number that reaches the cut list. */
  lengthIn: number;
  lumber: LumberSize;
  /** Human-readable reason this member exists; printed on the framing plan. */
  note: string;
  qty: number;
}

/* -------------------------------------------------------------- validation */

export type IssueSeverity = 'blocker' | 'warning' | 'info';

export interface DesignIssue {
  id: string;
  severity: IssueSeverity;
  title: string;
  detail: string;
  componentId?: string | null;
  /** Requires a human to confirm before the package prints as final. */
  requiresVerification?: boolean;
}
