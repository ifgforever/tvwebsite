/**
 * Safety, code and buildability checks.
 *
 * This app does not do structural engineering and does not certify code
 * compliance. What it does is refuse to let an unverified assumption reach a
 * construction document, and put the real-world questions in front of a human.
 */
import type { Design, DesignIssue, FireplaceComponent, NicheComponent, TvComponent } from '../types';
import { maxNicheDepth, suggestedFeatureDepth } from '../defaults';
import { computeOpenings } from './framing';
import { inchesToFeet } from '../units';

export function validateDesign(design: Design): DesignIssue[] {
  const issues: DesignIssue[] = [];
  const { wall } = design;
  const add = (i: DesignIssue) => issues.push(i);

  /* ---------------------------------------------------- always-on notices */
  if (wall.loadBearing !== 'no') {
    add({
      id: 'load_bearing',
      severity: wall.loadBearing === 'yes' ? 'blocker' : 'warning',
      title: wall.loadBearing === 'yes' ? 'Load-bearing wall — engineering required' : 'Load-bearing status not confirmed',
      detail: wall.loadBearing === 'yes'
        ? 'This build-out is against a wall marked load-bearing. Any modification to the existing wall, and any load imposed on it, must be reviewed by a licensed structural engineer. This app performs no structural calculation.'
        : 'Confirm whether the existing wall is load-bearing before cutting into it or fastening heavy assemblies. If it is, get a structural engineer involved. This app performs no structural calculation.',
      requiresVerification: true,
    });
  }

  add({
    id: 'existing_services',
    severity: 'warning',
    title: 'Verify what is inside the existing wall',
    detail: 'Scan and, where needed, open the wall to confirm existing electrical, plumbing, gas, HVAC and structure before fastening plates or cutting. Nothing in this drawing set is based on knowledge of what is concealed.',
    requiresVerification: true,
  });

  add({
    id: 'permits',
    severity: 'info',
    title: 'Permits and local code',
    detail: 'New circuits, device relocation and some built-in fireplace installations require a permit and inspection in many Chicago-area jurisdictions. Confirm with the local building department. All electrical by a licensed electrician.',
  });

  /* ---------------------------------------------------------- geometry */
  const suggested = suggestedFeatureDepth(wall);
  if (wall.featureDepthIn < suggested - 0.01) {
    add({
      id: 'depth_too_shallow',
      severity: 'blocker',
      title: 'Wall depth is thinner than its framing',
      detail: `${wall.lumber} framing plus ${wall.drywallThickness}" drywall needs at least ${suggested}" of build-out; the design says ${wall.featureDepthIn}". Increase the depth, change the lumber, or furr the framing flat.`,
    });
  }

  if (wall.heightIn > wall.ceilingHeightIn + 0.01) {
    add({ id: 'taller_than_ceiling', severity: 'blocker', title: 'Wall is taller than the ceiling', detail: `Wall height ${inchesToFeet(wall.heightIn)} exceeds the ceiling at ${inchesToFeet(wall.ceilingHeightIn)}.` });
  }
  if (wall.offsetXIn + wall.widthIn > wall.roomWidthIn + 0.01) {
    add({ id: 'wider_than_room', severity: 'warning', title: 'Feature wall runs past the room', detail: `The feature wall starts at ${inchesToFeet(wall.offsetXIn)} and is ${inchesToFeet(wall.widthIn)} wide, which is wider than the ${inchesToFeet(wall.roomWidthIn)} room wall.` });
  }

  const wallRect = { x: 0, y: 0, w: wall.widthIn, h: wall.heightIn };
  for (const c of design.components) {
    if (c.type === 'outlet' || c.type === 'lowvolt' || c.type === 'switch' || c.type === 'junction' || c.type === 'equipment') continue;
    if (c.x < -0.01 || c.y < -0.01 || c.x + c.w > wallRect.w + 0.01 || c.y + c.h > wallRect.h + 0.01) {
      add({ id: `oob_${c.id}`, severity: 'blocker', title: `${c.label} extends past the wall`, detail: 'Move or resize it so it sits inside the feature wall.', componentId: c.id });
    }
  }

  /* ------------------------------------------------------------ niches */
  const niches = design.components.filter((c): c is NicheComponent => c.type === 'niche');
  const maxDepth = maxNicheDepth(wall);
  for (const n of niches) {
    if (n.depthIn > maxDepth + 0.01) {
      add({ id: `niche_depth_${n.id}`, severity: 'blocker', title: `${n.label} is deeper than the wall`, detail: `Niche depth ${n.depthIn}" exceeds the ${maxDepth}" available behind the finished face. Deepen the wall or cut into the existing wall — which needs its own verification.`, componentId: n.id });
    }
  }

  /* -------------------------------------------------------- collisions */
  const solid = design.components.filter((c) => ['tv', 'fireplace', 'niche', 'soundbar', 'shelf'].includes(c.type));
  for (let i = 0; i < solid.length; i++) {
    for (let j = i + 1; j < solid.length; j++) {
      const a = solid[i];
      const b = solid[j];
      const overlap = a.x < b.x + b.w - 0.25 && a.x + a.w > b.x + 0.25 && a.y < b.y + b.h - 0.25 && a.y + a.h > b.y + 0.25;
      // A TV in front of a niche is a legitimate design; two recesses overlapping is not.
      const bothRecessed = a.depthIn > 0 && b.depthIn > 0;
      if (overlap && bothRecessed) {
        add({ id: `overlap_${a.id}_${b.id}`, severity: 'blocker', title: `${a.label} overlaps ${b.label}`, detail: 'Two recessed openings cannot occupy the same framing.', componentId: a.id });
      } else if (overlap && (a.type === 'tv' || b.type === 'tv')) {
        add({ id: `tv_overlap_${a.id}_${b.id}`, severity: 'warning', title: `${a.label} overlaps ${b.label}`, detail: 'Check the panel does not cover something it should not — and that the mount still lands on blocking.', componentId: a.id });
      }
    }
  }

  /* ---------------------------------------------------------------- TV */
  const tv = design.components.find((c): c is TvComponent => c.type === 'tv');
  if (tv) {
    if (!tv.props.dimensionsVerified) {
      add({ id: 'tv_dims', severity: 'warning', title: 'TV dimensions are typical, not measured', detail: `${tv.label} uses a typical panel size for its class. Enter the actual panel width and height from the spec sheet before framing.`, componentId: tv.id, requiresVerification: true });
    }
    const centerY = tv.y + tv.h / 2;
    if (centerY > 60) {
      add({ id: 'tv_high', severity: 'info', title: `TV centre is ${inchesToFeet(centerY)} above the floor`, detail: 'Higher than the 42–48" seated-eye rule of thumb. Normal for a media wall over a fireplace — confirm the customer is happy with the viewing angle from the seating position.', componentId: tv.id });
    }
    if (tv.props.weightLb > 100) {
      add({ id: 'tv_weight', severity: 'warning', title: 'Heavy panel', detail: `${tv.props.weightLb} lb — confirm the mount rating and that blocking is fastened into framing, not drywall alone.`, componentId: tv.id });
    }
  }

  /* -------------------------------------------------------- fireplace */
  const fp = design.components.find((c): c is FireplaceComponent => c.type === 'fireplace');
  if (fp) {
    const p = fp.props;
    const missing: string[] = [];
    if (p.roughWIn == null || p.roughHIn == null) missing.push('rough opening');
    if (p.roughDIn == null) missing.push('rough depth');
    if (p.clearanceTopIn == null || p.clearanceSideIn == null) missing.push('clearances to combustibles');
    if (!p.electrical) missing.push('electrical requirements');
    if (missing.length) {
      add({
        id: 'fp_unverified',
        severity: 'blocker',
        title: 'Fireplace specifications not entered',
        detail: `Missing: ${missing.join(', ')}. These come from the manufacturer's installation instructions and are never inferred from the advertised size. Framing this opening from the advertised size is how a fireplace ends up not fitting — or not being safe.`,
        componentId: fp.id,
        requiresVerification: true,
      });
    }
    if (!p.specsVerified) {
      add({ id: 'fp_signoff', severity: 'blocker', title: 'Fireplace specs not signed off', detail: 'Tick "verified against the installation manual" on the fireplace once the numbers are checked. The final construction package will not print as approved until then.', componentId: fp.id, requiresVerification: true });
    }
    if (p.clearanceToTvIn != null && tv) {
      const gap = tv.y - (fp.y + fp.h);
      if (gap < p.clearanceToTvIn) {
        add({ id: 'fp_tv_clearance', severity: 'blocker', title: 'TV is inside the fireplace clearance', detail: `${inchesToFeet(gap)} between the fireplace top and the TV; the manual requires ${p.clearanceToTvIn}". Raise the TV or lower the fireplace.`, componentId: fp.id });
      }
    }
    if (p.clearanceTopIn != null) {
      const above = design.components.filter((c) => c.type === 'niche' || c.type === 'soundbar' || c.type === 'shelf')
        .filter((c) => c.y >= fp.y + fp.h && c.x < fp.x + fp.w && c.x + c.w > fp.x);
      for (const c of above) {
        const gap = c.y - (fp.y + fp.h);
        if (gap < p.clearanceTopIn) {
          add({ id: `fp_clear_${c.id}`, severity: 'blocker', title: `${c.label} is inside the fireplace clearance`, detail: `${gap}" above the fireplace; the manual requires ${p.clearanceTopIn}" to combustibles.`, componentId: c.id });
        }
      }
    }
    add({ id: 'fp_combustible', severity: 'warning', title: 'Combustible clearance', detail: 'Mantels, shelves, slat panels, wood trim and any combustible finish above or beside the fireplace must respect the manufacturer’s clearances. Manufacturer requirements override anything in this drawing set.', componentId: fp.id });
    if (p.hardwired) add({ id: 'fp_hardwired', severity: 'warning', title: 'Hardwired fireplace', detail: 'Requires a dedicated circuit and a licensed electrician. Confirm the disconnect method with the local inspector.', componentId: fp.id });
  }

  /* -------------------------------------------------------- electrical */
  const lineDevices = design.components.filter((c) => (c.type === 'outlet' || c.type === 'switch' || c.type === 'junction') && (c as any).props.lineVoltage);
  if (lineDevices.length) {
    add({ id: 'electrical_licensed', severity: 'warning', title: 'Electrical work requires a licensed electrician', detail: `${lineDevices.length} line-voltage devices are shown. Circuit sizing, load calculation, box fill, AFCI/GFCI requirements and permitting are the electrician's call — this drawing shows intent and location only.`, requiresVerification: true });
  }
  const drivers = design.components.filter((c) => (c as any).props?.kind === 'led_driver');
  if (drivers.length === 0 && design.lighting.length > 0) {
    add({ id: 'no_driver', severity: 'warning', title: 'No LED driver location shown', detail: 'Lighting is specified but no accessible driver/controller location is placed. Drivers must stay accessible — not buried behind finished drywall.' });
  }

  /* ---------------------------------------------------------- coverage */
  const openings = computeOpenings(design);
  const unverifiedRo = openings.filter((o) => !o.verified);
  if (unverifiedRo.length) {
    add({ id: 'ro_unverified', severity: 'warning', title: `${unverifiedRo.length} rough opening(s) not verified`, detail: `Framed from drawn size rather than a manufacturer document: ${unverifiedRo.map((o) => o.label).join(', ')}.`, requiresVerification: true });
  }

  if (!design.calibration?.calibrated && design.basePhotoId) {
    add({ id: 'photo_uncalibrated', severity: 'info', title: 'Photo not calibrated', detail: 'Mark the wall corners on the photo so the before/after overlay lines up with the real room. The overlay is a visualisation either way — measurements always come from the model.' });
  }

  const severityRank = { blocker: 0, warning: 1, info: 2 } as const;
  return issues.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}

export const blockers = (issues: DesignIssue[]) => issues.filter((i) => i.severity === 'blocker');
export const canIssueFinalPackage = (issues: DesignIssue[]) => blockers(issues).length === 0;

/** Standard disclaimers printed on every package. */
export const STANDARD_DISCLAIMERS = [
  'This drawing set is a construction aid produced from a dimensioned design model. It is not an engineered drawing and is not a certification of code compliance.',
  'Field-verify every dimension before cutting material. Existing conditions govern.',
  'The existing wall must be confirmed as non-load-bearing, or reviewed by a licensed structural engineer, before work begins.',
  'All electrical work to be performed by a licensed electrician in accordance with the local adopted electrical code. Permits and inspections as required by the authority having jurisdiction.',
  'Fireplace rough opening, clearances to combustibles, electrical supply and venting are per the manufacturer’s installation instructions. Manufacturer requirements override anything shown here.',
  'Concealed plumbing, gas, HVAC and electrical must be located and protected before framing or fastening.',
  'Material quantities include the stated waste factor and are an estimate for purchasing, not a guarantee of sufficiency.',
];
