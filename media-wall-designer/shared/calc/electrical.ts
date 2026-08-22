/**
 * Electrical / low-voltage take-off.
 *
 * Counts devices, circuits, wire and LED gear from the model. It does NOT size
 * circuits, calculate load, or claim code compliance — see validate.ts. Every
 * line-voltage item is flagged for a licensed electrician.
 */
import type {
  CabinetComponent, Design, DeviceComponent, LightingZone, NicheComponent,
  PanelComponent, ShelfColumnComponent,
} from '../types';

export interface ElectricalResult {
  devices: DeviceComponent[];
  lineVoltageDevices: number;
  lowVoltageDevices: number;
  circuits: string[];
  romexFt: number;
  cat6Ft: number;
  hdmiCount: number;
  conduitFt: number;
  boxes: { newWork: number; oldWork: number; recessed: number; junction: number };
  puckCount: number;
  stripFt: number;
  stripReels: number;
  channelSticks: number;
  drivers: number;
  controllers: number;
  driverWatts: number;
  notes: string[];
}

/** Assumed home-run length when the panel location is unknown. Editable per job. */
export const DEFAULT_HOMERUN_FT = 45;

/**
 * Derive a lighting zone's run length from the objects it serves.
 *
 * Zones used to carry a `lengthFt` computed once when they were seeded, so a
 * resized niche or panel left the footage, the driver count, the BOM line and
 * the printed lighting schedule all frozen at their original values. Nothing
 * downstream trusts the stored number any more — it is only a fallback for a
 * zone with no targets to measure.
 */
export function zoneLengthFt(design: Design, zone: LightingZone): number {
  const byId = new Map(design.components.map((c) => [c.id, c]));
  const targets = zone.targets.map((id) => byId.get(id)).filter(Boolean) as Design['components'];
  const perimeterFt = (w: number, h: number) => (2 * (w + h)) / 12;

  switch (zone.kind) {
    case 'niche_strip':
      return targets.filter((c) => c.type === 'niche').reduce((s, n) => s + perimeterFt(n.w, n.h), 0);
    case 'niche_puck':
      return 0; // pucks are counted, not measured
    case 'tv_bias':
      return targets.filter((c) => c.type === 'tv').reduce((s, t) => s + perimeterFt(t.w, t.h), 0);
    case 'cove':
      // A cove halo runs around whatever it lights; with no target, the wall.
      return targets.length
        ? targets.reduce((s, t) => s + perimeterFt(t.w, t.h), 0)
        : perimeterFt(design.wall.widthIn, design.wall.heightIn);
    case 'slat_reveal':
      return targets.filter((c): c is PanelComponent => c.type === 'panel')
        .reduce((s, p) => s + (p.props.orientation === 'vertical' ? p.h : p.w) / 12, 0);
    case 'shelf_strip':
      // One run along the front edge of every shelf in the column.
      return targets.filter((c): c is ShelfColumnComponent => c.type === 'shelf_column')
        .reduce((s, col) => s + (col.props.shelfCount * (col.w - col.props.carcassThicknessIn * 2)) / 12, 0);
    case 'under_cabinet':
    case 'toe_kick':
      return targets.length
        ? targets.reduce((s, t) => s + t.w / 12, 0)
        : design.components.filter((c): c is CabinetComponent => c.type === 'cabinet').reduce((s, c) => s + c.w / 12, 0);
    case 'vertical_bar':
      return targets.reduce((s, t) => s + t.h / 12, 0);
    case 'perimeter':
      return perimeterFt(design.wall.widthIn, design.wall.heightIn);
    default:
      return zone.lengthFt;
  }
}

/** Every zone with its length re-derived — what the schedule should print. */
export function derivedZones(design: Design): (LightingZone & { derivedLengthFt: number })[] {
  return design.lighting.map((z) => ({ ...z, derivedLengthFt: Math.ceil(zoneLengthFt(design, z) * 10) / 10 }));
}

/** Nameplate of the driver in the catalog. */
export const DRIVER_WATTS = 150;

export function calcElectrical(design: Design, homeRunFt = DEFAULT_HOMERUN_FT): ElectricalResult {
  const devices = design.components.filter(
    (c): c is DeviceComponent => c.type === 'outlet' || c.type === 'lowvolt' || c.type === 'switch' || c.type === 'junction' || c.type === 'equipment',
  );
  const niches = design.components.filter((c): c is NicheComponent => c.type === 'niche');
  const zones: LightingZone[] = design.lighting;

  const circuits = [...new Set(devices.filter((d) => d.props.lineVoltage && d.props.circuit).map((d) => d.props.circuit))].sort();
  const lineVoltageDevices = devices.filter((d) => d.props.lineVoltage).length;
  const lowVoltageDevices = devices.length - lineVoltageDevices;

  const wallLf = (design.wall.widthIn + design.wall.heightIn) / 12;
  const romexFt = Math.ceil(Math.max(1, circuits.length) * homeRunFt + lineVoltageDevices * wallLf * 0.6);
  const cat6Ft = Math.ceil(homeRunFt + wallLf);
  const hdmiCount = devices.some((d) => d.props.kind === 'low_volt_plate' || d.props.kind === 'hdmi') ? 2 : 0;
  const conduitFt = Math.ceil(design.wall.heightIn / 12 + 6);

  const puckCount = niches.reduce(
    (s, n) => s + (n.props.lighting.kind === 'puck' || n.props.lighting.kind === 'puck_and_strip' ? n.props.lighting.puckCount : 0), 0,
  );
  const stripNiches = niches.filter((n) => n.props.lighting.kind === 'led_strip' || n.props.lighting.kind === 'puck_and_strip');
  const nicheStripFt = stripNiches.reduce((s, n) => s + (2 * (n.w + n.h)) / 12, 0);
  // Every other zone measures itself against the objects it serves.
  const otherStripFt = zones
    .filter((z) => z.kind !== 'niche_strip' && z.kind !== 'niche_puck')
    .reduce((s, z) => s + zoneLengthFt(design, z), 0);
  const stripFt = Math.ceil(nicheStripFt + otherStripFt);

  const driverWatts = Math.ceil(stripFt * 4.5 + puckCount * 3);
  // 150 W drivers loaded to 80% — never run a supply at its nameplate.
  const drivers = stripFt || puckCount ? Math.max(1, Math.ceil(driverWatts / (DRIVER_WATTS * 0.8))) : 0;
  const controllers = zones.filter((z) => z.colorMode === 'rgb' || z.colorMode === 'rgbw').length ? Math.max(1, Math.ceil(stripFt / 65)) : 0;

  const notes: string[] = [];
  if (lineVoltageDevices) notes.push('All line-voltage work by a licensed electrician; permit may be required.');
  if (drivers) notes.push('LED driver and controller must remain accessible — no concealed splices.');
  if (design.components.some((c) => c.type === 'fireplace')) notes.push('Fireplace circuit, receptacle type and location per the manufacturer’s installation instructions.');

  return {
    devices,
    lineVoltageDevices,
    lowVoltageDevices,
    circuits: circuits.length ? circuits : ['A'],
    romexFt,
    cat6Ft,
    hdmiCount,
    conduitFt,
    boxes: {
      newWork: devices.filter((d) => d.props.lineVoltage && d.props.kind !== 'junction_box' && d.props.kind !== 'recessed_receptacle' && d.props.kind !== 'led_driver').length,
      oldWork: 1,
      recessed: devices.filter((d) => d.props.kind === 'recessed_receptacle').length,
      junction: devices.filter((d) => d.props.kind === 'junction_box' || d.props.kind === 'led_driver').length,
    },
    puckCount,
    stripFt,
    stripReels: Math.ceil(stripFt / 16.4),
    channelSticks: Math.ceil(nicheStripFt / 6.6),
    drivers,
    controllers,
    driverWatts,
    notes,
  };
}
