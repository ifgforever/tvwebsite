/**
 * Builds the AI rendering prompt FROM the dimensioned model.
 *
 * The rendering is a picture of the model — never the other way round. Every
 * phrase below is generated from a real number or a real selection, and the
 * prompt ends by pinning the geometry so the image cannot invent a different
 * wall. Nothing here ever feeds back into a measurement.
 */
import type { Design, FireplaceComponent, NicheComponent, TvComponent } from '../types';
import { FINISHES } from '../catalog';
import { inchesToFeet } from '../units';

export interface PromptBundle {
  prompt: string;
  negativePrompt: string;
  /** Human-readable summary of what the model told the renderer. */
  facts: string[];
  seedHint: string;
}

const colorName = (hex: string) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2 / 255;
  if (max - min < 18) return l > 0.75 ? 'off-white' : l > 0.5 ? 'light grey' : l > 0.28 ? 'mid grey' : 'charcoal';
  if (r > g && r > b) return b > g ? 'magenta' : 'warm red';
  if (g > r && g > b) return b > r ? 'teal' : 'green';
  if (b > r && b > g) return r > g ? 'violet' : 'blue';
  if (r > 200 && g > 150) return 'amber';
  return 'neutral';
};

export function buildRenderPrompt(design: Design, opts: { variant?: number; roomStyle?: string } = {}): PromptBundle {
  const { wall } = design;
  const tv = design.components.find((c): c is TvComponent => c.type === 'tv');
  const fp = design.components.find((c): c is FireplaceComponent => c.type === 'fireplace');
  const sb = design.components.find((c) => c.type === 'soundbar');
  const niches = design.components.filter((c): c is NicheComponent => c.type === 'niche');
  const finish = FINISHES[wall.finish];

  const facts: string[] = [];
  const parts: string[] = [];

  parts.push(
    `Photorealistic interior photograph of a custom built-in media wall, ${inchesToFeet(wall.widthIn)} wide and ${inchesToFeet(wall.heightIn)} tall, built out ${wall.featureDepthIn} inches from the existing wall`,
  );
  facts.push(`Wall ${inchesToFeet(wall.widthIn)} × ${inchesToFeet(wall.heightIn)} × ${wall.featureDepthIn}" deep`);

  parts.push(`finished in ${finish.label.toLowerCase()} in ${colorName(wall.colorHex)} (${wall.colorHex})`);
  facts.push(`Finish: ${finish.label}, ${wall.colorHex}`);

  if (tv) {
    const centerY = tv.y + tv.h / 2;
    parts.push(
      `a ${tv.props.sizeClass === 'custom' ? `${Math.round(tv.w)}-inch-wide` : `${tv.props.sizeClass}-inch`} flat-panel television mounted flush and centred, its centre ${inchesToFeet(centerY)} above the floor, screen off and dark`,
    );
    if (tv.props.biasLight) parts.push('a thin coloured bias light glowing behind the panel');
    facts.push(`TV ${tv.label}, centre ${inchesToFeet(centerY)} AFF`);
  }
  if (sb) {
    parts.push(`a slim black soundbar mounted on the wall directly below the television`);
    facts.push(`Soundbar ${Math.round(sb.w)}" wide at ${inchesToFeet(sb.y)} AFF`);
  }
  if (fp) {
    parts.push(
      `a ${fp.props.advertisedIn === 'custom' ? Math.round(fp.w) : fp.props.advertisedIn}-inch linear electric fireplace recessed into the wall below, ${inchesToFeet(fp.y)} above the floor, with a glowing ember bed and low flames`,
    );
    facts.push(`Fireplace ${Math.round(fp.w)}" × ${Math.round(fp.h)}" at ${inchesToFeet(fp.y)} AFF`);
  }
  if (niches.length) {
    const left = niches.filter((n) => n.x + n.w / 2 < wall.widthIn / 2).length;
    const rightCount = niches.length - left;
    const litColors = [...new Set(niches.filter((n) => n.props.lighting.kind !== 'none').map((n) => colorName(n.props.lighting.colorHex)))];
    parts.push(
      `${niches.length} rectangular display niches recessed ${niches[0].depthIn} inches into the wall${left && rightCount ? `, ${left} stacked in a column on the left and ${rightCount} stacked on the right, flanking the television` : ''}`,
    );
    if (litColors.length) {
      parts.push(
        `each niche lit from within — ${litColors.join(', ')} LED light washing the niche interiors, with a small recessed puck light at the top of each niche casting a soft pool of light down the back panel`,
      );
    }
    facts.push(`${niches.length} niches, ${Math.round(niches[0].w)}" × ${Math.round(niches[0].h)}" × ${niches[0].depthIn}" deep, ${litColors.join('/')} lighting`);
  }
  if (wall.baseboardKeep && wall.baseboardHeightIn > 0) {
    parts.push(`white ${Math.round(wall.baseboardHeightIn)}-inch baseboard returning across the base of the wall`);
  }

  parts.push(
    opts.roomStyle ||
      'photographed straight on in a real living room at dusk, ambient room light low so the wall lighting reads, existing floor and ceiling unchanged',
  );
  parts.push('architectural interior photography, 24mm lens, straight verticals, sharp focus, natural colour, no text, no watermark');

  const negativePrompt = [
    'distorted proportions', 'crooked walls', 'warped rectangles', 'extra televisions', 'extra fireplaces',
    'wrong niche count', 'floating shelves', 'furniture blocking the wall', 'text', 'watermark', 'logo',
    'people', 'cartoon', 'illustration', 'render artifacts', 'fisheye distortion',
  ].join(', ');

  return {
    prompt: parts.join(', ') + '.',
    negativePrompt,
    facts,
    seedHint: `${design.components.length}-${Math.round(wall.widthIn)}x${Math.round(wall.heightIn)}-${opts.variant ?? 1}`,
  };
}

/** The line printed under every AI image, on screen and in the PDF. */
export const AI_DISCLAIMER =
  'AI visualisation — an artistic approximation generated from the dimensioned design. Not to scale and not a construction document. All measurements come from the design model and the drawing set.';
