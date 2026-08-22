/**
 * Before / after.
 *
 * The "after" is the vector renderer composited onto the customer's own photo
 * through the calibration homography, so the proposal shows their room. The AI
 * pass sits on top as an optional extra, clearly labelled as a visualisation.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AI_DISCLAIMER } from '@shared/ai/prompt';
import { homographyFromRect, toMatrix3d, quadIsSane, type Point } from '../lib/homography';
import { api } from '../lib/api';
import { store, useStore } from '../lib/store';
import { WallVector } from '../render/WallVector';
import { Panel, Pill, Sheet, toast, CopyButton } from '../components/ui';
import { Icon } from '../components/icons';

export function PreviewScreen() {
  const { project } = useStore();
  const [split, setSplit] = useState(52);
  const [lightsOn, setLightsOn] = useState(true);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [promptInfo, setPromptInfo] = useState<{ prompt: string; facts: string[]; providerConfigured: boolean } | null>(null);

  if (!project) return null;
  const design = project.design;
  const base = project.photos.find((p) => p.id === design.basePhotoId) || project.photos.find((p) => p.kind === 'before');
  const cal = design.calibration;

  const overlay = useMemo(() => {
    if (!cal || !cal.calibrated || !base) return null;
    const pts: [Point, Point, Point, Point] = [
      [cal.topLeft[0] * 1000, cal.topLeft[1] * 1000],
      [cal.topRight[0] * 1000, cal.topRight[1] * 1000],
      [cal.bottomRight[0] * 1000, cal.bottomRight[1] * 1000],
      [cal.bottomLeft[0] * 1000, cal.bottomLeft[1] * 1000],
    ];
    if (!quadIsSane(pts)) return null;
    const h = homographyFromRect(1000, 1000, pts);
    return h ? toMatrix3d(h) : null;
  }, [cal, base]);

  const onMove = (clientX: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setSplit(Math.max(2, Math.min(98, ((clientX - r.left) / r.width) * 100)));
  };

  const requestRender = async (variant: number) => {
    setAiBusy(true);
    try {
      const res = await api.requestRendering(project.id, { variant });
      store.addRendering({
        id: res.id, variant: res.variant, status: res.status as any, url: res.url, prompt: res.prompt,
        provider: res.provider, revisionId: null, error: res.error ?? null, createdAt: new Date().toISOString(),
      });
      if (res.status === 'ready') toast('Rendering ready');
      else if (res.status === 'unavailable') toast('No AI provider configured — see the panel', true);
      else toast(res.error || 'Rendering failed', true);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Rendering failed', true);
    } finally { setAiBusy(false); }
  };

  const openAi = async () => {
    setAiOpen(true);
    try { setPromptInfo(await api.renderPrompt(project.id, project.renderings.length + 1)); } catch { /* offline */ }
  };

  const ready = project.renderings.filter((r) => r.status === 'ready' && r.url);

  return (
    <div className="content">
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
        <Panel title="Before / after" eyebrow="Show the customer"
          actions={
            <div className="row">
              <button className={`btn sm${lightsOn ? ' gold' : ''}`} onClick={() => setLightsOn(!lightsOn)}><Icon name="bulb" size={14} />Lights</button>
              <button className="btn sm" onClick={openAi}><Icon name="sparkle" size={14} />AI render</button>
            </div>
          }>
          {!base ? (
            <div className="empty" style={{ padding: '30px 12px' }}>
              <div className="display">NO BEFORE PHOTO</div>
              <p>Take the wall photo first and the customer sees their own room here.</p>
              <Link to={`/p/${project.id}/photo`} className="btn gold" style={{ textDecoration: 'none' }}><Icon name="camera" size={15} />Add the photo</Link>
            </div>
          ) : (
            <>
              <div ref={wrapRef} className="ba-wrap" style={{ aspectRatio: `${base.width || 4} / ${base.height || 3}` }}
                onPointerDown={(e) => { dragging.current = true; onMove(e.clientX); }}
                onPointerMove={(e) => { if (dragging.current) onMove(e.clientX); }}
                onPointerUp={() => { dragging.current = false; }}
                onPointerLeave={() => { dragging.current = false; }}>
                <div className="ba-layer"><img src={base.url} alt="Before" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} /></div>

                <div className="ba-layer" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>
                  <img src={base.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
                  {overlay ? (
                    <PerspectiveOverlay matrix={overlay}>
                      <WallVector design={design} room={false} lightsOn={lightsOn} style={{ width: '100%', height: '100%' }} />
                    </PerspectiveOverlay>
                  ) : (
                    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(10,10,10,.55)' }}>
                      <div style={{ width: '86%' }}><WallVector design={design} lightsOn={lightsOn} style={{ width: '100%' }} /></div>
                    </div>
                  )}
                </div>

                <div className="ba-tag" style={{ left: 10 }}>BEFORE</div>
                <div className="ba-tag" style={{ right: 10 }}>AFTER</div>
                <div className="ba-handle" style={{ left: `${split}%` }}>
                  <div className="ba-knob"><Icon name="chevron" size={16} style={{ transform: 'rotate(180deg)' }} /><Icon name="chevron" size={16} /></div>
                </div>
              </div>
              {!cal?.calibrated && (
                <div className="note" style={{ marginTop: 10, fontSize: 12.5 }}>
                  Mark the wall corners on the <Link to={`/p/${project.id}/photo`} style={{ color: 'var(--gold)' }}>photo screen</Link> and the design
                  will sit in the room in perspective instead of floating over it.
                </div>
              )}
            </>
          )}
        </Panel>

        <Panel title="Finished wall" eyebrow="Straight-on visualisation from the model">
          <div style={{ borderRadius: 8, overflow: 'hidden' }}>
            <WallVector design={design} lightsOn={lightsOn} style={{ width: '100%', display: 'block' }} />
          </div>
          <div className="row wrap" style={{ marginTop: 10 }}>
            <Pill tone="ok">Drawn from the dimensioned model</Pill>
            <Pill>Every object at its real size</Pill>
            <span className="spacer" />
            <Link to={`/p/${project.id}/design`} className="btn sm" style={{ textDecoration: 'none' }}><Icon name="layout" size={14} />Adjust the design</Link>
          </div>
        </Panel>

        {ready.length > 0 && (
          <Panel title="AI visualisations" eyebrow={`${ready.length} generated`}>
            <div className="grid two">
              {ready.map((r) => (
                <figure key={r.id} style={{ margin: 0 }}>
                  <img src={r.url!} alt={`AI visualisation ${r.variant}`} style={{ width: '100%', borderRadius: 8, border: '1px solid var(--line)' }} />
                  <figcaption className="faint" style={{ fontSize: 11.5, marginTop: 6 }}>Variation {r.variant} · {r.provider} · {AI_DISCLAIMER}</figcaption>
                </figure>
              ))}
            </div>
          </Panel>
        )}
      </div>

      <Sheet open={aiOpen} onClose={() => setAiOpen(false)} title="AI rendering"
        footer={
          <div className="row">
            <button className="btn ghost" onClick={() => setAiOpen(false)}>Close</button>
            <div className="spacer" />
            <button className="btn gold" disabled={aiBusy} onClick={() => requestRender(project.renderings.length + 1)}>
              <Icon name="sparkle" size={15} />{aiBusy ? 'Generating…' : 'Generate a variation'}
            </button>
          </div>
        }>
        <div className="note gold" style={{ marginBottom: 12, fontSize: 12.5 }}>{AI_DISCLAIMER}</div>
        {promptInfo && !promptInfo.providerConfigured && (
          <div className="note warn" style={{ marginBottom: 12, fontSize: 12.5 }}>
            <strong>No image provider configured.</strong> Set <code>AI_IMAGE_PROVIDER</code> in <code>wrangler.toml</code> (openai, stability,
            replicate or custom) and add the key with <code>wrangler secret put AI_IMAGE_API_KEY</code>. Everything else in the app works without it.
          </div>
        )}
        {promptInfo && (
          <>
            <div className="eyebrow">What the model tells the renderer</div>
            <ul style={{ margin: '6px 0 12px', paddingLeft: 18, fontSize: 13 }}>
              {promptInfo.facts.map((f, i) => <li key={i} style={{ marginBottom: 3 }}>{f}</li>)}
            </ul>
            <div className="eyebrow">Generated prompt</div>
            <div className="mono" style={{ fontSize: 11.5, background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 6, padding: 10, maxHeight: 190, overflowY: 'auto', lineHeight: 1.5 }}>
              {promptInfo.prompt}
            </div>
            <div className="row" style={{ marginTop: 8 }}><CopyButton text={promptInfo.prompt} label="Copy prompt" /></div>
          </>
        )}
        {project.renderings.filter((r) => r.status !== 'ready').slice(0, 3).map((r) => (
          <div key={r.id} className="note warn" style={{ marginTop: 10, fontSize: 12 }}>
            Variation {r.variant} — {r.status}{r.error ? `: ${r.error}` : ''}
          </div>
        ))}
      </Sheet>
    </div>
  );
}

/**
 * Applies the calibration homography.
 *
 * The homography is solved in a 1000×1000 unit space, so the rendered wall is
 * laid out in a 1000×1000 px box, warped by the matrix, then scaled to whatever
 * size the photo is actually being displayed at.
 */
function PerspectiveOverlay({ matrix, children }: { matrix: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {size.w > 0 && (
        <div style={{ position: 'absolute', top: 0, left: 0, transformOrigin: '0 0', transform: `scale(${size.w / 1000}, ${size.h / 1000})` }}>
          <div style={{ width: 1000, height: 1000, transformOrigin: '0 0', transform: matrix }}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
