/**
 * The realistic wall renderer.
 *
 * Deterministic vector output built entirely from the dimensioned model: same
 * design in, same picture out, works offline, and every rectangle is in the
 * right place because it IS the model. This is the "after" image in the
 * before/after slider, the hero on the proposal, and the fallback whenever no
 * AI provider is configured.
 */
import { useId } from 'react';
import type { Design, FireplaceComponent, NicheComponent, TvComponent } from '@shared/types';
import { FINISHES } from '@shared/catalog';
import { FinishPattern, SceneDefs, alpha, shade } from './defs';

export interface WallVectorProps {
  design: Design;
  /** Include floor, ceiling and the room around the wall. */
  room?: boolean;
  /** Turn the accent lighting on. */
  lightsOn?: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** Extra room around the wall, in inches, when room rendering is on. */
  marginIn?: number;
}

export function WallVector({ design, room = true, lightsOn = true, className, style, marginIn }: WallVectorProps) {
  const uid = useId().replace(/:/g, '');
  const { wall } = design;
  const W = wall.widthIn;
  const H = wall.heightIn;
  const margin = marginIn ?? (room ? Math.max(18, W * 0.09) : 0);
  const floorIn = room ? Math.max(26, H * 0.3) : 0;
  const ceilIn = room ? Math.max(6, wall.ceilingHeightIn - H + 8) : 0;

  const vbX = -margin;
  const vbY = -ceilIn;
  const vbW = W + margin * 2;
  const vbH = H + ceilIn + floorIn;

  // Elevation y-up → SVG y-down. Everything else in this file uses sy().
  const sy = (y: number, h = 0) => H - y - h;

  const niches = design.components.filter((c): c is NicheComponent => c.type === 'niche');
  const tv = design.components.find((c): c is TvComponent => c.type === 'tv');
  const fp = design.components.find((c): c is FireplaceComponent => c.type === 'fireplace');
  const soundbar = design.components.find((c) => c.type === 'soundbar');
  const shelves = design.components.filter((c) => c.type === 'shelf');
  const custom = design.components.filter((c) => c.type === 'custom');

  const finish = FINISHES[wall.finish];
  const faceFill = wall.finish === 'painted_drywall' ? wall.colorHex : `url(#${uid}-finish)`;

  return (
    <svg viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} className={className} style={style} preserveAspectRatio="xMidYMid meet">
      <defs>
        <SceneDefs uid={uid} wallColor={wall.colorHex} />
        <FinishPattern id={`${uid}-finish`} finish={wall.finish} color={wall.colorHex} />
        <clipPath id={`${uid}-wallclip`}><rect x={0} y={0} width={W} height={H} /></clipPath>
      </defs>

      {/* ---------------------------------------------------------- room */}
      {room && (
        <>
          <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="#0B0B0E" />
          <rect x={vbX} y={vbY} width={vbW} height={ceilIn + 2} fill="#141418" />
          <rect x={vbX} y={vbY + ceilIn - 1.4} width={vbW} height={1.4} fill="#1D1D22" />
          {/* Existing wall visible either side of the build-out */}
          <rect x={vbX} y={vbY + ceilIn} width={margin} height={H} fill={shade(wall.colorHex, -30)} />
          <rect x={W} y={vbY + ceilIn} width={margin} height={H} fill={shade(wall.colorHex, -38)} />
          {/* Floor */}
          <rect x={vbX} y={H} width={vbW} height={floorIn} fill={`url(#${uid}-floor)`} />
          <rect x={vbX} y={H} width={vbW} height={0.7} fill="#000" opacity={0.55} />
        </>
      )}

      {/* ------------------------------------------------------ wall face */}
      <g clipPath={`url(#${uid}-wallclip)`}>
        <rect x={0} y={0} width={W} height={H} fill={faceFill} />
        <rect x={0} y={0} width={W} height={H} fill={`url(#${uid}-wallshade)`} />
        {/* Build-out reveal: the wall reads as proud of the existing surface */}
        {room && <rect x={0} y={0} width={1.1} height={H} fill="#FFF" opacity={0.06} />}
      </g>
      {room && (
        <>
          <rect x={-wall.featureDepthIn * 0.35} y={0} width={wall.featureDepthIn * 0.35} height={H} fill={shade(wall.colorHex, -12)} />
          <rect x={W} y={0} width={wall.featureDepthIn * 0.35} height={H} fill="#000" opacity={0.4} />
        </>
      )}

      {/* --------------------------------------------------------- niches */}
      {niches.map((n) => {
        const lit = lightsOn && n.props.lighting.kind !== 'none';
        const c = n.props.lighting.colorHex;
        const back = n.props.backFinish === 'match_wall' ? shade(wall.colorHex, 26) : n.props.backColorHex;
        const d = Math.max(1, n.depthIn);
        const persp = Math.min(2.6, d * 0.5); // a hint of return, not a 3-D model
        return (
          <g key={n.id}>
            {/* Spill onto the surrounding wall */}
            {lit && (
              <rect
                x={n.x - 4} y={sy(n.y + n.h) - 4} width={n.w + 8} height={n.h + 8}
                fill={alpha(c, 0.19 * (n.props.lighting.intensityPct / 100))} filter={`url(#${uid}-glow-lg)`}
              />
            )}
            {/* Cavity */}
            <rect x={n.x} y={sy(n.y + n.h)} width={n.w} height={n.h} fill={shade(back, -30)} />
            {/* Returns */}
            <path d={`M${n.x} ${sy(n.y + n.h)} L${n.x + persp} ${sy(n.y + n.h) + persp} L${n.x + persp} ${sy(n.y) - persp} L${n.x} ${sy(n.y)} Z`} fill={lit ? alpha(c, 0.5) : '#000'} opacity={lit ? 0.75 : 0.35} />
            <path d={`M${n.x + n.w} ${sy(n.y + n.h)} L${n.x + n.w - persp} ${sy(n.y + n.h) + persp} L${n.x + n.w - persp} ${sy(n.y) - persp} L${n.x + n.w} ${sy(n.y)} Z`} fill={lit ? alpha(c, 0.36) : '#000'} opacity={lit ? 0.7 : 0.45} />
            <path d={`M${n.x} ${sy(n.y + n.h)} L${n.x + n.w} ${sy(n.y + n.h)} L${n.x + n.w - persp} ${sy(n.y + n.h) + persp} L${n.x + persp} ${sy(n.y + n.h) + persp} Z`} fill="#000" opacity={0.5} />
            {/* Back panel */}
            <rect x={n.x + persp} y={sy(n.y + n.h) + persp} width={n.w - persp * 2} height={n.h - persp * 2} fill={lit ? c : back} opacity={lit ? 0.92 : 1} />
            {lit && (
              <>
                <rect x={n.x + persp} y={sy(n.y + n.h) + persp} width={n.w - persp * 2} height={n.h - persp * 2} fill={alpha('#FFFFFF', 0.16)} />
                {/* Puck at the head washing down the back */}
                {(n.props.lighting.kind === 'puck' || n.props.lighting.kind === 'puck_and_strip') && (
                  <>
                    <ellipse cx={n.x + n.w / 2} cy={sy(n.y + n.h) + persp + n.h * 0.3} rx={n.w * 0.42} ry={n.h * 0.34}
                      fill={alpha('#FFFFFF', 0.4)} filter={`url(#${uid}-glow)`} />
                    <circle cx={n.x + n.w / 2} cy={sy(n.y + n.h) + persp * 0.6} r={Math.min(1.5, n.w * 0.06)} fill="#FFF6E0" />
                  </>
                )}
                {/* Reveal strip at the opening */}
                {(n.props.lighting.kind === 'led_strip' || n.props.lighting.kind === 'puck_and_strip') && (
                  <rect x={n.x + 0.3} y={sy(n.y + n.h) + 0.3} width={n.w - 0.6} height={n.h - 0.6}
                    fill="none" stroke={alpha(c, 0.85)} strokeWidth={0.7} filter={`url(#${uid}-glow)`} />
                )}
              </>
            )}
            {/* Opening shadow line */}
            <rect x={n.x} y={sy(n.y + n.h)} width={n.w} height={n.h} fill="none" stroke="#000" strokeOpacity={0.35} strokeWidth={0.35} />
            {n.props.hasShelf && (
              <rect x={n.x + persp} y={sy(n.y + n.h / 2)} width={n.w - persp * 2} height={0.9} fill={shade(back, -14)} />
            )}
          </g>
        );
      })}

      {/* ------------------------------------------------------ fireplace */}
      {fp && (
        <g>
          <rect x={fp.x - 3} y={sy(fp.y + fp.h) - 3} width={fp.w + 6} height={fp.h + 6}
            fill={`url(#${uid}-fireglow)`} opacity={lightsOn ? 0.8 : 0} filter={`url(#${uid}-glow-lg)`} />
          <rect x={fp.x} y={sy(fp.y + fp.h)} width={fp.w} height={fp.h} rx={0.6} fill="#0A0A0C" />
          <rect x={fp.x + 0.9} y={sy(fp.y + fp.h) + 0.9} width={fp.w - 1.8} height={fp.h - 1.8} fill="#121216" />
          {lightsOn && (
            <>
              <rect x={fp.x + 1.6} y={sy(fp.y) - fp.h * 0.42} width={fp.w - 3.2} height={fp.h * 0.36} fill={`url(#${uid}-ember)`} opacity={0.95} />
              {Array.from({ length: Math.max(4, Math.round(fp.w / 9)) }).map((_, i, arr) => {
                const step = (fp.w - 6) / arr.length;
                const cx = fp.x + 3 + step * (i + 0.5);
                const baseY = sy(fp.y) - fp.h * 0.4;
                const fh = fp.h * (0.34 + ((i * 37) % 11) / 34);
                return (
                  <path key={i}
                    d={`M${cx} ${baseY} C ${cx - step * 0.3} ${baseY - fh * 0.45}, ${cx + step * 0.28} ${baseY - fh * 0.62}, ${cx} ${baseY - fh} C ${cx - step * 0.3} ${baseY - fh * 0.55}, ${cx + step * 0.2} ${baseY - fh * 0.3}, ${cx} ${baseY} Z`}
                    fill="#FF9A3C" opacity={0.6} filter={`url(#${uid}-glow)`} />
                );
              })}
              <rect x={fp.x + 1.6} y={sy(fp.y) - 2.4} width={fp.w - 3.2} height={2} fill="#FF7A2A" opacity={0.55} filter={`url(#${uid}-glow)`} />
            </>
          )}
          <rect x={fp.x} y={sy(fp.y + fp.h)} width={fp.w} height={fp.h} fill="none" stroke="#000" strokeWidth={0.4} strokeOpacity={0.7} />
        </g>
      )}

      {/* ------------------------------------------------------------- TV */}
      {tv && (
        <g>
          {tv.props.biasLight && lightsOn && (
            <rect x={tv.x - 4} y={sy(tv.y + tv.h) - 4} width={tv.w + 8} height={tv.h + 8}
              fill={alpha(design.lighting.find((z) => z.kind === 'tv_bias')?.colorHex || '#3D9BFF', 0.55)}
              filter={`url(#${uid}-glow-lg)`} />
          )}
          <rect x={tv.x - 0.5} y={sy(tv.y + tv.h) - 0.5} width={tv.w + 1} height={tv.h + 1} rx={0.5} fill="#000" opacity={0.85} />
          <rect x={tv.x} y={sy(tv.y + tv.h)} width={tv.w} height={tv.h} fill={`url(#${uid}-glass)`} />
          <rect x={tv.x} y={sy(tv.y + tv.h)} width={tv.w} height={tv.h} fill={`url(#${uid}-sheen)`} />
          <rect x={tv.x + 0.35} y={sy(tv.y + tv.h) + 0.35} width={tv.w - 0.7} height={tv.h - 0.7} fill="none" stroke="#3A3F48" strokeWidth={0.2} />
        </g>
      )}

      {/* -------------------------------------------------------- soundbar */}
      {soundbar && (
        <g>
          <rect x={soundbar.x} y={sy(soundbar.y + soundbar.h)} width={soundbar.w} height={soundbar.h} rx={soundbar.h * 0.3} fill="#0E0E11" />
          <rect x={soundbar.x + 0.6} y={sy(soundbar.y + soundbar.h) + 0.4} width={soundbar.w - 1.2} height={soundbar.h * 0.35} fill="#1B1B20" />
          <rect x={soundbar.x} y={sy(soundbar.y)} width={soundbar.w} height={0.5} fill="#000" opacity={0.5} />
        </g>
      )}

      {shelves.map((s) => (
        <rect key={s.id} x={s.x} y={sy(s.y + s.h)} width={s.w} height={s.h} fill={shade(wall.colorHex, -18)} stroke="#000" strokeOpacity={0.3} strokeWidth={0.3} />
      ))}
      {custom.map((c) => (
        <rect key={c.id} x={c.x} y={sy(c.y + c.h)} width={c.w} height={c.h}
          fill={(c as any).props?.colorHex || shade(wall.colorHex, -20)} stroke="#000" strokeOpacity={0.35} strokeWidth={0.3} />
      ))}

      {/* -------------------------------------------------------- baseboard */}
      {wall.baseboardKeep && wall.baseboardHeightIn > 0 && (
        <>
          <rect x={room ? vbX : 0} y={sy(wall.baseboardHeightIn)} width={room ? vbW : W} height={wall.baseboardHeightIn} fill="#EFEAE0" />
          <rect x={room ? vbX : 0} y={sy(wall.baseboardHeightIn)} width={room ? vbW : W} height={0.5} fill="#FFF" opacity={0.6} />
          <rect x={room ? vbX : 0} y={sy(0.5)} width={room ? vbW : W} height={0.5} fill="#000" opacity={0.25} />
        </>
      )}

      {/* ---------------------------------------------------- room ambience */}
      {room && (
        <>
          {/* Light pooling on the floor from lit niches and the fireplace */}
          {lightsOn && niches.filter((n) => n.props.lighting.kind !== 'none').map((n) => (
            <ellipse key={`sp-${n.id}`} cx={n.x + n.w / 2} cy={H + floorIn * 0.28} rx={n.w * 1.1} ry={floorIn * 0.22}
              fill={alpha(n.props.lighting.colorHex, 0.16)} filter={`url(#${uid}-glow-lg)`} />
          ))}
          {lightsOn && fp && (
            <ellipse cx={fp.x + fp.w / 2} cy={H + floorIn * 0.34} rx={fp.w * 0.75} ry={floorIn * 0.3}
              fill="rgba(255,122,42,0.2)" filter={`url(#${uid}-glow-lg)`} />
          )}
          <rect x={vbX} y={vbY} width={vbW} height={vbH} fill={`url(#${uid}-vignette)`} pointerEvents="none" />
        </>
      )}

      {wall.finish !== 'painted_drywall' && (
        <title>{`${finish.label} feature wall`}</title>
      )}
    </svg>
  );
}
