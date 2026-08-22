/**
 * Reference data and default pricing.
 *
 * Everything here is an EDITABLE DEFAULT, not a fact about a specific product.
 * Panel sizes are typical-for-class and flagged for verification; fireplace
 * rough openings are deliberately absent — they come from the manual only.
 * Prices are Chicago-market starting points; override per project or globally.
 */
import type { BomCategory, LaborCategory, LumberSize } from './types';

/* ---------------------------------------------------------------- lumber */

export const LUMBER: Record<Exclude<LumberSize, 'custom'>, { actualW: number; actualD: number; label: string }> = {
  // actualW = the face you see in elevation, actualD = build-out depth when framed on edge
  '2x3': { actualW: 1.5, actualD: 2.5, label: '2×3' },
  '2x4': { actualW: 1.5, actualD: 3.5, label: '2×4' },
  '2x6': { actualW: 1.5, actualD: 5.5, label: '2×6' },
  '2x8': { actualW: 1.5, actualD: 7.25, label: '2×8' },
};

export const STOCK_LENGTHS_IN = [92.625, 96, 104.625, 116.625, 120, 144, 168, 192];
export const KERF_IN = 0.125;

/* -------------------------------------------------------------------- TVs */

/** Typical panel envelope by advertised class. Always verify against the model. */
export const TV_SIZES: Record<number, { w: number; h: number; d: number; weightLb: number; vesaW: number; vesaH: number }> = {
  43: { w: 38.2, h: 22.2, d: 2.4, weightLb: 20, vesaW: 200, vesaH: 200 },
  50: { w: 44.1, h: 25.6, d: 2.5, weightLb: 27, vesaW: 200, vesaH: 200 },
  55: { w: 48.4, h: 27.9, d: 2.5, weightLb: 35, vesaW: 300, vesaH: 300 },
  65: { w: 57.1, h: 32.9, d: 2.6, weightLb: 48, vesaW: 400, vesaH: 300 },
  75: { w: 65.9, h: 37.9, d: 2.8, weightLb: 68, vesaW: 400, vesaH: 400 },
  77: { w: 67.9, h: 39.1, d: 2.0, weightLb: 62, vesaW: 400, vesaH: 300 },
  83: { w: 72.9, h: 41.9, d: 2.1, weightLb: 87, vesaW: 400, vesaH: 300 },
  85: { w: 74.7, h: 42.9, d: 3.0, weightLb: 96, vesaW: 600, vesaH: 400 },
  98: { w: 85.9, h: 49.4, d: 3.4, weightLb: 150, vesaW: 800, vesaH: 400 },
};
export const TV_SIZE_LIST = [55, 65, 75, 77, 83, 85, 98];

/* ------------------------------------------------------------- fireplaces */

/**
 * Advertised sizes only. Overall dimensions, rough opening, clearances and
 * electrical MUST be entered from the manufacturer's installation instructions.
 * `typicalHeightIn` is a PLACEHOLDER for drawing a box on screen before the
 * real numbers are entered — it never reaches the framing plan unverified.
 */
export const FIREPLACE_SIZES = [50, 60, 72, 84, 100] as const;
export const FIREPLACE_PLACEHOLDER = { heightIn: 21.5, depthIn: 5.5 };

/* ---------------------------------------------------------------- finishes */

export const FINISHES: Record<string, { label: string; sqftCost: number; sku: string; unit: string; coverage: number; note: string }> = {
  painted_drywall: { label: 'Painted drywall', sqftCost: 0, sku: 'FIN-PAINT', unit: 'gal', coverage: 350, note: 'Primer + 2 coats' },
  wood_slat: { label: 'Wood slat panel', sqftCost: 9.5, sku: 'FIN-SLAT', unit: 'panel', coverage: 11.5, note: '94"×12" acoustic slat panel' },
  stone: { label: 'Stone / ledger', sqftCost: 12.0, sku: 'FIN-STONE', unit: 'sq ft', coverage: 1, note: 'Stacked stone panel + thinset' },
  tile: { label: 'Tile', sqftCost: 7.5, sku: 'FIN-TILE', unit: 'sq ft', coverage: 1, note: 'Standard format tile' },
  large_format_tile: { label: 'Large-format tile', sqftCost: 14.0, sku: 'FIN-LFT', unit: 'sq ft', coverage: 1, note: '24"×48"+ panel, requires leveling system' },
  wood_panel: { label: 'Wood panel', sqftCost: 8.0, sku: 'FIN-WOOD', unit: 'sq ft', coverage: 1, note: 'Veneer / MDF panel' },
  custom: { label: 'Custom finish', sqftCost: 10.0, sku: 'FIN-CUSTOM', unit: 'sq ft', coverage: 1, note: 'Specify in notes' },
};

/* ----------------------------------------------------------- price catalog */

export interface CatalogItem {
  sku: string;
  name: string;
  spec: string;
  category: BomCategory;
  unit: string;
  unitCost: number;
}

export const CATALOG: Record<string, CatalogItem> = {
  'LUM-2x4-92': { sku: 'LUM-2x4-92', name: '2×4 stud', spec: '92-5/8" precut SPF', category: 'framing', unit: 'ea', unitCost: 4.28 },
  'LUM-2x4-96': { sku: 'LUM-2x4-96', name: '2×4 × 8\'', spec: 'SPF #2 & better', category: 'framing', unit: 'ea', unitCost: 4.98 },
  'LUM-2x4-120': { sku: 'LUM-2x4-120', name: '2×4 × 10\'', spec: 'SPF #2 & better', category: 'framing', unit: 'ea', unitCost: 6.85 },
  'LUM-2x4-144': { sku: 'LUM-2x4-144', name: '2×4 × 12\'', spec: 'SPF #2 & better', category: 'framing', unit: 'ea', unitCost: 8.42 },
  'LUM-2x3-96': { sku: 'LUM-2x3-96', name: '2×3 × 8\'', spec: 'SPF', category: 'framing', unit: 'ea', unitCost: 3.62 },
  'LUM-2x6-96': { sku: 'LUM-2x6-96', name: '2×6 × 8\'', spec: 'SPF #2 & better', category: 'framing', unit: 'ea', unitCost: 7.95 },
  'LUM-2x6-144': { sku: 'LUM-2x6-144', name: '2×6 × 12\'', spec: 'SPF #2 & better', category: 'framing', unit: 'ea', unitCost: 12.40 },
  'LUM-2x8-96': { sku: 'LUM-2x8-96', name: '2×8 × 8\'', spec: 'SPF #2 & better', category: 'framing', unit: 'ea', unitCost: 11.20 },
  'FST-SCREW-3': { sku: 'FST-SCREW-3', name: 'Structural screws 3"', spec: '#9 × 3" construction screw, 5 lb', category: 'framing', unit: 'box', unitCost: 34.00 },
  'FST-NAIL-16': { sku: 'FST-NAIL-16', name: 'Framing nails 3-1/4"', spec: '.131 collated, 2500 ct', category: 'framing', unit: 'box', unitCost: 42.00 },
  'FST-TAPCON': { sku: 'FST-TAPCON', name: 'Concrete anchors', spec: '3/16" × 2-3/4" Tapcon, 75 ct', category: 'framing', unit: 'box', unitCost: 21.00 },
  'FST-SHIM': { sku: 'FST-SHIM', name: 'Shims', spec: 'Wood shim, 12 pk', category: 'framing', unit: 'pk', unitCost: 5.50 },

  'DW-12-4x8': { sku: 'DW-12-4x8', name: '1/2" drywall 4×8', spec: 'Regular gypsum board', category: 'drywall', unit: 'sheet', unitCost: 15.80 },
  'DW-58-4x8': { sku: 'DW-58-4x8', name: '5/8" drywall 4×8', spec: 'Type X gypsum board', category: 'drywall', unit: 'sheet', unitCost: 19.40 },
  'DW-SCREW': { sku: 'DW-SCREW', name: 'Drywall screws', spec: '1-1/4" coarse, 1 lb ≈ 320 ct', category: 'drywall', unit: 'lb', unitCost: 4.60 },
  'DW-BEAD': { sku: 'DW-BEAD', name: 'Corner bead', spec: 'Paper-faced metal, 8\' stick', category: 'drywall', unit: 'ea', unitCost: 6.20 },
  'DW-TAPE': { sku: 'DW-TAPE', name: 'Joint tape', spec: 'Paper tape, 250\' roll', category: 'drywall', unit: 'roll', unitCost: 7.40 },
  'DW-MUD': { sku: 'DW-MUD', name: 'Joint compound', spec: 'All-purpose, 4.5 gal', category: 'drywall', unit: 'bucket', unitCost: 19.60 },
  'DW-PRIMER': { sku: 'DW-PRIMER', name: 'Drywall primer', spec: 'PVA primer, 1 gal ≈ 350 sf', category: 'drywall', unit: 'gal', unitCost: 26.00 },
  'DW-CLIP': { sku: 'DW-CLIP', name: 'Drywall clips', spec: 'Corner-back clip, 50 ct', category: 'drywall', unit: 'bag', unitCost: 12.00 },

  'EL-BOX-OLD': { sku: 'EL-BOX-OLD', name: 'Old-work box', spec: '1-gang, 18 cu in', category: 'electrical', unit: 'ea', unitCost: 3.10 },
  'EL-BOX-NEW': { sku: 'EL-BOX-NEW', name: 'New-work box', spec: '1-gang nail-on, 22 cu in', category: 'electrical', unit: 'ea', unitCost: 2.20 },
  'EL-BOX-REC': { sku: 'EL-BOX-REC', name: 'Recessed TV box', spec: 'Recessed power/low-volt combo box', category: 'electrical', unit: 'ea', unitCost: 32.00 },
  'EL-BOX-JCT': { sku: 'EL-BOX-JCT', name: 'Junction box', spec: '4" square with cover', category: 'electrical', unit: 'ea', unitCost: 5.40 },
  'EL-ROMEX-12': { sku: 'EL-ROMEX-12', name: '12/2 NM-B', spec: '20A circuit wire', category: 'electrical', unit: 'ft', unitCost: 1.15 },
  'EL-ROMEX-14': { sku: 'EL-ROMEX-14', name: '14/2 NM-B', spec: '15A circuit wire', category: 'electrical', unit: 'ft', unitCost: 0.82 },
  'EL-RECEP': { sku: 'EL-RECEP', name: 'Receptacle', spec: '15A/20A tamper-resistant', category: 'electrical', unit: 'ea', unitCost: 4.20 },
  'EL-SWITCH': { sku: 'EL-SWITCH', name: 'Switch', spec: 'Single-pole decora', category: 'electrical', unit: 'ea', unitCost: 5.60 },
  'EL-DIMMER': { sku: 'EL-DIMMER', name: 'Dimmer', spec: 'LED-compatible decora dimmer', category: 'electrical', unit: 'ea', unitCost: 24.00 },
  'EL-PLATE': { sku: 'EL-PLATE', name: 'Wall plate', spec: 'Screwless decora', category: 'electrical', unit: 'ea', unitCost: 3.40 },
  'EL-PUCK': { sku: 'EL-PUCK', name: 'Recessed puck light', spec: '2" LED puck, 12/24V', category: 'electrical', unit: 'ea', unitCost: 14.50 },
  'EL-STRIP-RGBW': { sku: 'EL-STRIP-RGBW', name: 'RGBW LED strip', spec: '24V RGBW, 16.4\' reel', category: 'electrical', unit: 'reel', unitCost: 42.00 },
  'EL-STRIP-W': { sku: 'EL-STRIP-W', name: 'White LED strip', spec: '24V 2700–3000K, 16.4\' reel', category: 'electrical', unit: 'reel', unitCost: 28.00 },
  'EL-DRIVER': { sku: 'EL-DRIVER', name: 'LED driver', spec: '24V 150W constant voltage', category: 'electrical', unit: 'ea', unitCost: 52.00 },
  'EL-CONTROLLER': { sku: 'EL-CONTROLLER', name: 'LED controller', spec: 'RGBW Wi-Fi / RF controller', category: 'electrical', unit: 'ea', unitCost: 34.00 },
  'EL-CHANNEL': { sku: 'EL-CHANNEL', name: 'Aluminum channel', spec: 'Recessed LED channel + diffuser, 6.6\'', category: 'electrical', unit: 'ea', unitCost: 16.00 },
  'EL-CONN': { sku: 'EL-CONN', name: 'LED connectors', spec: 'Solderless jumper, 10 pk', category: 'electrical', unit: 'pk', unitCost: 13.00 },

  'LV-HDMI': { sku: 'LV-HDMI', name: 'HDMI cable', spec: '4K/8K certified in-wall CL3', category: 'low_voltage', unit: 'ea', unitCost: 28.00 },
  'LV-CAT6': { sku: 'LV-CAT6', name: 'Cat6 cable', spec: 'CMR riser, per ft', category: 'low_voltage', unit: 'ft', unitCost: 0.38 },
  'LV-KEYSTONE': { sku: 'LV-KEYSTONE', name: 'Keystone jack', spec: 'Cat6 / HDMI keystone', category: 'low_voltage', unit: 'ea', unitCost: 6.50 },
  'LV-PLATE': { sku: 'LV-PLATE', name: 'Low-voltage plate', spec: 'Brush / keystone wall plate', category: 'low_voltage', unit: 'ea', unitCost: 7.20 },
  'LV-BRACKET': { sku: 'LV-BRACKET', name: 'Low-voltage bracket', spec: 'Old-work mounting bracket', category: 'low_voltage', unit: 'ea', unitCost: 2.40 },
  'LV-CONDUIT': { sku: 'LV-CONDUIT', name: 'Smurf tube', spec: '1" ENT flexible conduit', category: 'low_voltage', unit: 'ft', unitCost: 1.10 },
  'LV-VELCRO': { sku: 'LV-VELCRO', name: 'Cable management', spec: 'Hook & loop, clips', category: 'low_voltage', unit: 'lot', unitCost: 9.00 },

  'FIN-PAINT': { sku: 'FIN-PAINT', name: 'Paint', spec: 'Premium interior, 1 gal ≈ 350 sf', category: 'finish', unit: 'gal', unitCost: 58.00 },
  'FIN-CAULK': { sku: 'FIN-CAULK', name: 'Caulk', spec: 'Paintable acrylic latex', category: 'finish', unit: 'tube', unitCost: 5.80 },
  'FIN-BASE': { sku: 'FIN-BASE', name: 'Baseboard', spec: 'Primed MDF, per ft', category: 'finish', unit: 'ft', unitCost: 2.35 },
  'FIN-SLAT': { sku: 'FIN-SLAT', name: 'Slat wall panel', spec: '94" × 12" acoustic slat panel', category: 'finish', unit: 'panel', unitCost: 79.00 },
  'FIN-STONE': { sku: 'FIN-STONE', name: 'Stone panel', spec: 'Stacked stone ledger panel', category: 'finish', unit: 'sq ft', unitCost: 12.00 },
  'FIN-TILE': { sku: 'FIN-TILE', name: 'Tile', spec: 'Porcelain tile', category: 'finish', unit: 'sq ft', unitCost: 7.50 },
  'FIN-LFT': { sku: 'FIN-LFT', name: 'Large-format tile', spec: '24"×48" porcelain panel', category: 'finish', unit: 'sq ft', unitCost: 14.00 },
  'FIN-WOOD': { sku: 'FIN-WOOD', name: 'Wood panel', spec: 'Veneer panel', category: 'finish', unit: 'sq ft', unitCost: 8.00 },
  'FIN-CUSTOM': { sku: 'FIN-CUSTOM', name: 'Custom finish', spec: 'See project notes', category: 'finish', unit: 'sq ft', unitCost: 10.00 },
  'FIN-ADHESIVE': { sku: 'FIN-ADHESIVE', name: 'Adhesive / thinset', spec: 'Construction adhesive or modified thinset', category: 'finish', unit: 'ea', unitCost: 14.00 },
  'FIN-TRIM': { sku: 'FIN-TRIM', name: 'Trim / reveal', spec: 'Aluminum or wood trim, per ft', category: 'finish', unit: 'ft', unitCost: 4.20 },
  'FIN-GROUT': { sku: 'FIN-GROUT', name: 'Grout', spec: 'Unsanded grout, 10 lb', category: 'finish', unit: 'bag', unitCost: 22.00 },

  'EQ-MOUNT': { sku: 'EQ-MOUNT', name: 'TV mount', spec: 'Heavy-duty low-profile / full-motion', category: 'equipment', unit: 'ea', unitCost: 149.00 },
  'EQ-SB-MOUNT': { sku: 'EQ-SB-MOUNT', name: 'Soundbar mount', spec: 'Universal soundbar bracket', category: 'equipment', unit: 'ea', unitCost: 39.00 },
  'EQ-FIREPLACE': { sku: 'EQ-FIREPLACE', name: 'Electric fireplace', spec: 'Linear recessed electric fireplace', category: 'equipment', unit: 'ea', unitCost: 899.00 },
  'EQ-PROTECT': { sku: 'EQ-PROTECT', name: 'Floor protection', spec: 'Ram board, plastic, tape', category: 'equipment', unit: 'lot', unitCost: 46.00 },
  'EQ-DISPOSAL': { sku: 'EQ-DISPOSAL', name: 'Debris disposal', spec: 'Haul-away', category: 'equipment', unit: 'lot', unitCost: 85.00 },
};

/* ------------------------------------------------------------ labor rates */

/**
 * `rate` is what the customer is billed. `cost` is the burdened crew cost —
 * wage + payroll tax + insurance, or what a sub actually charges you. Profit is
 * the difference, so both numbers have to be real for the margin to mean anything.
 */
export const LABOR_RATES: Record<LaborCategory, { label: string; rate: number; cost: number; licensed?: boolean }> = {
  design: { label: 'Design & measurement', rate: 95, cost: 42 },
  demo: { label: 'Demo & prep', rate: 85, cost: 38 },
  framing: { label: 'Framing', rate: 95, cost: 45 },
  electrical: { label: 'Electrical', rate: 135, cost: 95, licensed: true },
  low_voltage: { label: 'Low voltage', rate: 110, cost: 48 },
  drywall: { label: 'Drywall hang & finish', rate: 95, cost: 52 },
  finishing: { label: 'Finish material install', rate: 105, cost: 50 },
  painting: { label: 'Paint', rate: 80, cost: 38 },
  tv_install: { label: 'TV installation', rate: 125, cost: 50 },
  fireplace_install: { label: 'Fireplace installation', rate: 115, cost: 48 },
  lighting_install: { label: 'Lighting installation', rate: 110, cost: 48 },
  cleanup: { label: 'Cleanup & haul-away', rate: 70, cost: 32 },
};

export const LABOR_ORDER: LaborCategory[] = [
  'design', 'demo', 'framing', 'electrical', 'low_voltage', 'drywall',
  'finishing', 'painting', 'tv_install', 'fireplace_install', 'lighting_install', 'cleanup',
];

export const CATEGORY_LABEL: Record<BomCategory, string> = {
  framing: 'Framing',
  drywall: 'Drywall',
  electrical: 'Electrical',
  low_voltage: 'Low voltage',
  finish: 'Finish',
  equipment: 'Equipment & site',
};

/* ---------------------------------------------------------------- sourcing */

export type SupplierId = 'home_depot' | 'lowes' | 'menards' | 'electrical_supply' | 'lumberyard' | 'amazon' | 'specialty' | 'other';

export interface Supplier {
  id: SupplierId;
  name: string;
  short: string;
  /** Search URL template — `{q}` is replaced with the encoded search term. */
  search: string | null;
  accent: string;
  notes: string;
}

export const SUPPLIERS: Record<SupplierId, Supplier> = {
  home_depot: { id: 'home_depot', name: 'The Home Depot', short: 'HD', search: 'https://www.homedepot.com/s/{q}', accent: '#F96302', notes: 'Pro desk, same-day pickup' },
  lowes: { id: 'lowes', name: "Lowe's", short: 'LOW', search: 'https://www.lowes.com/search?searchTerm={q}', accent: '#004990', notes: 'Pro desk, same-day pickup' },
  menards: { id: 'menards', name: 'Menards', short: 'MEN', search: 'https://www.menards.com/main/search.html?search={q}', accent: '#046A38', notes: 'Best lumber pricing, 11% rebate' },
  electrical_supply: { id: 'electrical_supply', name: 'Electrical supply house', short: 'ELEC', search: null, accent: '#C8A94A', notes: 'Crescent / Steiner / City Electric — counter pickup' },
  lumberyard: { id: 'lumberyard', name: 'Lumberyard', short: 'LBR', search: null, accent: '#A8734A', notes: 'Straighter stock for exposed framing' },
  amazon: { id: 'amazon', name: 'Amazon', short: 'AMZ', search: 'https://www.amazon.com/s?k={q}', accent: '#FF9900', notes: 'LED + AV parts, order 2 days ahead' },
  specialty: { id: 'specialty', name: 'Specialty / trade', short: 'SPEC', search: null, accent: '#6B7E94', notes: 'Slat panel, stone, tile, fireplace distributor' },
  other: { id: 'other', name: 'Other / on hand', short: 'OTH', search: null, accent: '#8A8A8A', notes: 'Truck stock' },
};

/** Default sourcing per SKU. Every line is overridable per project. */
export const DEFAULT_SUPPLIER: Record<string, { supplier: SupplierId; searchTerm: string }> = {
  'LUM-2x4-92': { supplier: 'menards', searchTerm: '2x4x92-5/8 stud spf' },
  'LUM-2x4-96': { supplier: 'menards', searchTerm: '2x4x8 stud spf' },
  'LUM-2x4-120': { supplier: 'menards', searchTerm: '2x4x10 spf' },
  'LUM-2x4-144': { supplier: 'menards', searchTerm: '2x4x12 spf' },
  'LUM-2x3-96': { supplier: 'menards', searchTerm: '2x3x8 furring stud' },
  'LUM-2x6-96': { supplier: 'menards', searchTerm: '2x6x8 spf' },
  'LUM-2x6-144': { supplier: 'menards', searchTerm: '2x6x12 spf' },
  'LUM-2x8-96': { supplier: 'menards', searchTerm: '2x8x8 spf' },
  'FST-SCREW-3': { supplier: 'home_depot', searchTerm: 'construction screws 3 inch 5 lb' },
  'FST-NAIL-16': { supplier: 'home_depot', searchTerm: 'collated framing nails 3-1/4' },
  'FST-TAPCON': { supplier: 'home_depot', searchTerm: 'tapcon 3/16 x 2-3/4' },
  'FST-SHIM': { supplier: 'home_depot', searchTerm: 'wood shims 12 pack' },
  'DW-12-4x8': { supplier: 'home_depot', searchTerm: '1/2 in drywall 4x8' },
  'DW-58-4x8': { supplier: 'home_depot', searchTerm: '5/8 in type x drywall 4x8' },
  'DW-SCREW': { supplier: 'home_depot', searchTerm: 'drywall screws 1-1/4 coarse' },
  'DW-BEAD': { supplier: 'home_depot', searchTerm: 'paper faced metal corner bead' },
  'DW-TAPE': { supplier: 'home_depot', searchTerm: 'drywall joint tape 250' },
  'DW-MUD': { supplier: 'home_depot', searchTerm: 'all purpose joint compound 4.5 gal' },
  'DW-PRIMER': { supplier: 'home_depot', searchTerm: 'pva drywall primer gallon' },
  'DW-CLIP': { supplier: 'home_depot', searchTerm: 'drywall corner back clips' },
  'EL-BOX-OLD': { supplier: 'electrical_supply', searchTerm: 'old work box 1 gang 18 cu in' },
  'EL-BOX-NEW': { supplier: 'electrical_supply', searchTerm: 'new work nail on box 1 gang' },
  'EL-BOX-REC': { supplier: 'amazon', searchTerm: 'recessed tv power low voltage box' },
  'EL-BOX-JCT': { supplier: 'electrical_supply', searchTerm: '4 square junction box with cover' },
  'EL-ROMEX-12': { supplier: 'electrical_supply', searchTerm: '12/2 nm-b romex' },
  'EL-ROMEX-14': { supplier: 'electrical_supply', searchTerm: '14/2 nm-b romex' },
  'EL-RECEP': { supplier: 'electrical_supply', searchTerm: 'tamper resistant receptacle decora' },
  'EL-SWITCH': { supplier: 'electrical_supply', searchTerm: 'single pole decora switch' },
  'EL-DIMMER': { supplier: 'electrical_supply', searchTerm: 'led compatible decora dimmer' },
  'EL-PLATE': { supplier: 'electrical_supply', searchTerm: 'screwless decora wall plate' },
  'EL-PUCK': { supplier: 'amazon', searchTerm: '2 inch recessed led puck light 12v' },
  'EL-STRIP-RGBW': { supplier: 'amazon', searchTerm: '24v rgbw led strip reel' },
  'EL-STRIP-W': { supplier: 'amazon', searchTerm: '24v 3000k led strip reel' },
  'EL-DRIVER': { supplier: 'amazon', searchTerm: '24v 100w led driver' },
  'EL-CONTROLLER': { supplier: 'amazon', searchTerm: 'rgbw led controller wifi' },
  'EL-CHANNEL': { supplier: 'amazon', searchTerm: 'recessed aluminum led channel diffuser' },
  'EL-CONN': { supplier: 'amazon', searchTerm: 'solderless led strip connectors' },
  'LV-HDMI': { supplier: 'amazon', searchTerm: 'in wall cl3 8k hdmi cable' },
  'LV-CAT6': { supplier: 'electrical_supply', searchTerm: 'cat6 riser cmr box' },
  'LV-KEYSTONE': { supplier: 'amazon', searchTerm: 'cat6 hdmi keystone jack' },
  'LV-PLATE': { supplier: 'amazon', searchTerm: 'brush wall plate low voltage' },
  'LV-BRACKET': { supplier: 'home_depot', searchTerm: 'low voltage old work bracket' },
  'LV-CONDUIT': { supplier: 'home_depot', searchTerm: '1 inch ent smurf tube' },
  'LV-VELCRO': { supplier: 'amazon', searchTerm: 'hook and loop cable ties' },
  'FIN-PAINT': { supplier: 'specialty', searchTerm: 'interior eggshell paint gallon' },
  'FIN-CAULK': { supplier: 'home_depot', searchTerm: 'paintable acrylic latex caulk' },
  'FIN-BASE': { supplier: 'home_depot', searchTerm: 'primed mdf baseboard' },
  'FIN-SLAT': { supplier: 'specialty', searchTerm: 'acoustic slat wall panel 94 x 12' },
  'FIN-STONE': { supplier: 'specialty', searchTerm: 'stacked stone ledger panel' },
  'FIN-TILE': { supplier: 'specialty', searchTerm: 'porcelain tile' },
  'FIN-LFT': { supplier: 'specialty', searchTerm: 'large format porcelain panel 24x48' },
  'FIN-WOOD': { supplier: 'specialty', searchTerm: 'wood veneer wall panel' },
  'FIN-CUSTOM': { supplier: 'specialty', searchTerm: 'custom finish material' },
  'FIN-ADHESIVE': { supplier: 'home_depot', searchTerm: 'construction adhesive' },
  'FIN-TRIM': { supplier: 'specialty', searchTerm: 'aluminum reveal trim' },
  'FIN-GROUT': { supplier: 'home_depot', searchTerm: 'unsanded grout' },
  'EQ-MOUNT': { supplier: 'amazon', searchTerm: 'heavy duty tv wall mount' },
  'EQ-SB-MOUNT': { supplier: 'amazon', searchTerm: 'universal soundbar mount bracket' },
  'EQ-FIREPLACE': { supplier: 'specialty', searchTerm: 'linear recessed electric fireplace' },
  'EQ-PROTECT': { supplier: 'home_depot', searchTerm: 'ram board floor protection' },
  'EQ-DISPOSAL': { supplier: 'other', searchTerm: 'debris haul away' },
};

export function supplierFor(sku: string): Supplier {
  const d = DEFAULT_SUPPLIER[sku];
  return SUPPLIERS[d ? d.supplier : 'other'];
}

export function searchUrlFor(sku: string, name: string): string | null {
  const d = DEFAULT_SUPPLIER[sku];
  const s = SUPPLIERS[d ? d.supplier : 'other'];
  if (!s.search) return null;
  return s.search.replace('{q}', encodeURIComponent(d?.searchTerm || name));
}

/* --------------------------------------------------------- market check */

/**
 * Published 2026 market band for installed custom media walls, used only as a
 * sanity rail on the estimate screen. It never changes a calculated price.
 * Sources: accentwallsceiling.com media-wall cost guide 2026; tvmediawall.com
 * cost breakdown 2026 ($55–$250/sf installed, typical custom build from ~$5,800).
 */
export const MARKET_BENCHMARK = {
  perSqFtLow: 55,
  perSqFtTypicalLow: 95,
  perSqFtTypicalHigh: 165,
  perSqFtHigh: 250,
  typicalProjectFloor: 5800,
  note: 'Installed custom media wall, 2026 US market. Chicago metro runs at or above the middle of this band.',
};
