/**
 * Good / Better / Best.
 *
 * Three real designs derived from the one on screen — not three numbers with a
 * multiplier on them. Each tier is a full model, so each tier has its own
 * drawings, take-off, cut list and price.
 */
import type { Design, DesignComponent, EstimateSettings, NicheComponent, TierId } from '../types';
import { computeTakeOff, type TakeOff } from './materials';
import { computeEstimate, type EstimateResult } from './estimate';
import { seedLighting } from '../defaults';

export interface TierDefinition {
  id: TierId;
  name: string;
  tagline: string;
  bullets: string[];
}

export const TIERS: TierDefinition[] = [
  {
    id: 'good',
    name: 'GOOD',
    tagline: 'Clean built-out feature wall',
    bullets: ['Framed and drywalled feature wall', 'Recessed TV power + low-voltage', 'Concealed cable to the equipment location', 'Painted, ready for the TV'],
  },
  {
    id: 'better',
    name: 'BETTER',
    tagline: 'Feature wall + fireplace + lighting',
    bullets: ['Everything in GOOD', 'Linear electric fireplace, framed to the manufacturer’s opening', 'Two lit display niches', 'Dimmable accent lighting on its own control'],
  },
  {
    id: 'best',
    name: 'BEST',
    tagline: 'Full custom wall, the whole build',
    bullets: ['Everything in BETTER', 'Full niche programme with RGBW colour lighting', 'Recessed puck light in every niche', 'Premium finish material', 'Soundbar integrated and blocked'],
  },
];

/**
 * Deep-enough copy of a component: a new object with a new props object.
 *
 * The tier builders derive new designs from the one on screen. Without this they
 * would be filtering the LIVE component array and holding the same object
 * references, so any positional adjustment below would silently move the real
 * design — which is exactly what happened: opening the estimate screen dropped
 * the TV into the fireplace clearance and stamped the drawing set.
 */
const cloneComponent = <T extends DesignComponent>(c: T): T =>
  ({ ...c, props: { ...(c as { props: object }).props } }) as T;

const cloneAll = (components: DesignComponent[]) => components.map(cloneComponent);

function stripDevices(design: Design, keepKinds: string[]): Design {
  return {
    ...design,
    components: design.components.filter((c) => {
      const isDevice = ['outlet', 'lowvolt', 'switch', 'junction', 'equipment'].includes(c.type);
      if (!isDevice) return true;
      return keepKinds.includes((c as any).props.kind);
    }),
  };
}

/** GOOD — the wall, the TV, the wiring. Nothing else. */
export function toGood(base: Design): Design {
  const kept = cloneAll(base.components.filter((c) => c.type === 'tv' || c.type === 'soundbar'));
  const devices = cloneAll(
    stripDevices(base, ['recessed_receptacle', 'low_volt_plate', 'equipment_bay']).components
      .filter((c) => ['outlet', 'lowvolt', 'equipment'].includes(c.type)),
  );
  const d: Design = {
    ...base,
    wall: { ...base.wall, finish: 'painted_drywall' },
    components: [...kept, ...devices],
    lighting: [],
  };

  const tv = d.components.find((c) => c.type === 'tv');
  if (tv && !tv.locked) {
    // Without a fireplace under it the panel drops to a comfortable height.
    // These writes land on the clones above, never on the live design.
    const target = Math.max(24, Math.min(tv.y, base.wall.heightIn / 2 - tv.h / 2 + 4));
    const delta = target - tv.y;
    for (const c of d.components) {
      if (c.locked) continue;
      if (c.type === 'tv' || c.type === 'soundbar') c.y = Math.max(0, c.y + delta);
    }
  }
  return d;
}

/** BETTER — fireplace back in, two niches, warm accent light. */
export function toBetter(base: Design): Design {
  const niches = base.components.filter((c): c is NicheComponent => c.type === 'niche');
  // Keep the two niches nearest the centre line, one per side.
  const mid = base.wall.widthIn / 2;
  const left = niches.filter((n) => n.x < mid).sort((a, b) => Math.abs(mid - (a.y + a.h / 2)) - Math.abs(mid - (b.y + b.h / 2)))[0];
  const rightN = niches.filter((n) => n.x >= mid).sort((a, b) => Math.abs(mid - (a.y + a.h / 2)) - Math.abs(mid - (b.y + b.h / 2)))[0];
  const kept = [left, rightN].filter(Boolean).map((n) => ({
    ...cloneComponent(n),
    props: { ...n.props, lighting: { ...n.props.lighting, colorMode: 'warm' as const, colorHex: '#FFD9A0', kind: 'puck_and_strip' as const } },
  }));

  const d: Design = {
    ...base,
    wall: { ...base.wall, finish: 'painted_drywall' },
    components: [
      ...cloneAll(base.components.filter((c) => c.type === 'tv' || c.type === 'soundbar' || c.type === 'fireplace')),
      ...kept,
      ...cloneAll(base.components.filter((c) => ['outlet', 'lowvolt', 'switch', 'junction', 'equipment'].includes(c.type))),
    ],
    lighting: [],
  };
  d.lighting = seedLighting(d).map((z) => (z.kind === 'niche_strip' ? { ...z, colorMode: 'warm', colorHex: '#FFD9A0' } : z));
  return d;
}

/** BEST — what is on screen, finished in the premium material. */
export function toBest(base: Design, premiumFinish: Design['wall']['finish'] = 'wood_slat'): Design {
  return {
    ...base,
    wall: { ...base.wall, finish: base.wall.finish === 'painted_drywall' ? premiumFinish : base.wall.finish },
    components: cloneAll(base.components),
  };
}

export interface TierResult {
  tier: TierDefinition;
  design: Design;
  take: TakeOff;
  estimate: EstimateResult;
}

export function buildTiers(base: Design, settings: EstimateSettings, premiumFinish?: Design['wall']['finish']): TierResult[] {
  const designs: Record<TierId, Design> = {
    good: toGood(base),
    better: toBetter(base),
    best: toBest(base, premiumFinish),
  };
  return TIERS.map((tier) => {
    const design = designs[tier.id];
    const take = computeTakeOff(design, settings);
    return { tier, design, take, estimate: computeEstimate(design, settings, take) };
  });
}
