/**
 * Wall photo: capture or upload, straighten, crop, then mark the four wall
 * corners so the design can be composited back onto the room in perspective.
 * The photo is a visual reference — measurements always come from the model.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PhotoCalibration } from '@shared/types';
import { inchesToFeet } from '@shared/units';
import { prepareImage } from '../lib/image';
import { api } from '../lib/api';
import { store, useStore } from '../lib/store';
import { DimField, Panel, Pill, Sheet, toast } from '../components/ui';
import { Icon } from '../components/icons';

type Corner = 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft';
const CORNERS: { key: Corner; label: string }[] = [
  { key: 'topLeft', label: 'Top left' }, { key: 'topRight', label: 'Top right' },
  { key: 'bottomRight', label: 'Bottom right' }, { key: 'bottomLeft', label: 'Bottom left' },
];

export function PhotoScreen() {
  const { project } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{ file: Blob; url: string } | null>(null);
  const [rotate, setRotate] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [dragCorner, setDragCorner] = useState<Corner | null>(null);
  const imgWrap = useRef<HTMLDivElement>(null);

  if (!project) return null;
  const design = project.design;
  const wall = design.wall;
  const base = project.photos.find((p) => p.id === design.basePhotoId) || project.photos.find((p) => p.kind === 'before');

  const uploadDirect = async (file: File, kind: 'before' | 'reference' | 'progress') => {
    setBusy(true);
    try {
      const prepared = await prepareImage(file, { rotateDeg: 0 });
      const photo = await api.uploadPhoto(project.id, prepared.blob, { kind, width: prepared.width, height: prepared.height });
      store.addPhoto({ ...photo, transform: null } as any, kind === 'before' && !design.basePhotoId);
      toast('Photo added');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Upload failed', true);
    } finally {
      setBusy(false);
    }
  };

  const applyEdit = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      const prepared = await prepareImage(editing.file, { rotateDeg: rotate });
      const photo = await api.uploadPhoto(project.id, prepared.blob, { kind: 'before', width: prepared.width, height: prepared.height });
      store.addPhoto({ ...photo, transform: { rotateDeg: rotate, cropX: 0, cropY: 0, cropW: 1, cropH: 1 } } as any, true);
      toast('Wall photo set');
      setEditing(null);
      setRotate(0);
    } finally { setBusy(false); }
  };

  const calibration: PhotoCalibration = design.calibration ?? {
    topLeft: [0.14, 0.12], topRight: [0.86, 0.12], bottomRight: [0.88, 0.88], bottomLeft: [0.12, 0.88],
    realWidthIn: wall.widthIn, realHeightIn: wall.heightIn, calibrated: false,
  };

  const moveCorner = (key: Corner, clientX: number, clientY: number) => {
    const el = imgWrap.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    const y = Math.max(0, Math.min(1, (clientY - r.top) / r.height));
    store.patchDesign({ calibration: { ...calibration, [key]: [x, y], realWidthIn: wall.widthIn, realHeightIn: wall.heightIn } }, 'Calibration');
  };

  useEffect(() => {
    if (!dragCorner) return;
    const move = (e: PointerEvent) => moveCorner(dragCorner, e.clientX, e.clientY);
    const up = () => setDragCorner(null);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [dragCorner, calibration]);

  const quad = CORNERS.map((c) => calibration[c.key]);

  return (
    <div className="content">
      <div className="split wide">
        <Panel title="Existing wall" eyebrow="Step 02"
          actions={
            <div className="row">
              <button className="btn sm" onClick={() => cameraRef.current?.click()} disabled={busy}><Icon name="camera" size={14} />Camera</button>
              <button className="btn sm ghost" onClick={() => fileRef.current?.click()} disabled={busy}><Icon name="download" size={14} />Upload</button>
            </div>
          }>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setEditing({ file: f, url: URL.createObjectURL(f) }); e.target.value = ''; }} />
          <input ref={fileRef} type="file" accept="image/*" hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) { if (base) void uploadDirect(f, 'reference'); else setEditing({ file: f, url: URL.createObjectURL(f) }); }
              e.target.value = '';
            }} />

          {!base ? (
            <div className="empty" style={{ padding: '32px 12px' }}>
              <Icon name="camera" size={34} style={{ opacity: .3 }} />
              <div className="display" style={{ marginTop: 10 }}>NO WALL PHOTO YET</div>
              <p style={{ maxWidth: 380, margin: '6px auto 14px' }}>
                Stand square to the wall, get the floor and ceiling in frame, and shoot landscape if you can. This becomes the BEFORE image.
              </p>
              <button className="btn gold" onClick={() => cameraRef.current?.click()}><Icon name="camera" size={15} />Take the photo</button>
            </div>
          ) : (
            <>
              <div ref={imgWrap} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)', touchAction: 'none', userSelect: 'none' }}>
                <img src={base.url} alt="Existing wall" style={{ width: '100%', display: 'block' }} draggable={false} />
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                  <polygon points={quad.map(([x, y]) => `${x * 100},${y * 100}`).join(' ')}
                    fill="rgba(200,169,74,0.12)" stroke="#C8A94A" strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
                  <line x1={(quad[0][0] + quad[3][0]) / 2 * 100} y1={(quad[0][1] + quad[3][1]) / 2 * 100}
                    x2={(quad[1][0] + quad[2][0]) / 2 * 100} y2={(quad[1][1] + quad[2][1]) / 2 * 100}
                    stroke="#C8A94A" strokeWidth={0.25} strokeDasharray="2 1.5" vectorEffect="non-scaling-stroke" opacity={0.6} />
                </svg>
                {CORNERS.map(({ key, label }) => {
                  const [x, y] = calibration[key];
                  return (
                    <button key={key} aria-label={label}
                      onPointerDown={(e) => { e.preventDefault(); setDragCorner(key); }}
                      style={{
                        position: 'absolute', left: `${x * 100}%`, top: `${y * 100}%`, transform: 'translate(-50%,-50%)',
                        width: 34, height: 34, minHeight: 0, borderRadius: '50%', padding: 0,
                        background: 'rgba(10,10,10,.75)', border: '2px solid #C8A94A', cursor: 'grab', touchAction: 'none',
                      }}>
                      <span style={{ display: 'block', width: 8, height: 8, borderRadius: '50%', background: '#C8A94A', margin: '0 auto' }} />
                    </button>
                  );
                })}
              </div>
              <div className="row wrap" style={{ marginTop: 10 }}>
                <Pill tone={calibration.calibrated ? 'ok' : 'gold'}>{calibration.calibrated ? 'Calibrated' : 'Drag the four corners onto the wall'}</Pill>
                <span className="spacer" />
                <button className="btn sm" onClick={() => store.patchDesign({ calibration: { ...calibration, calibrated: true } }, 'Calibrated')}>
                  <Icon name="check" size={14} />Corners are set
                </button>
                <button className="btn sm ghost danger" onClick={() => { if (base) store.removePhoto(base.id); }}><Icon name="trash" size={14} /></button>
              </div>
              <div className="note" style={{ marginTop: 10, fontSize: 12.5 }}>
                Marking the corners lets the app lay the design over the room in the right perspective on the
                {' '}<Link to={`/p/${project.id}/preview`} style={{ color: 'var(--gold)' }}>before / after</Link> screen.
                It is a visualisation aid — every measurement still comes from the design model.
              </div>
            </>
          )}
        </Panel>

        <div className="grid" style={{ alignContent: 'start' }}>
          <Panel title="Measurements" eyebrow="Field dimensions">
            <div className="note gold" style={{ marginBottom: 12, fontSize: 12.5 }}>
              These drive every drawing and quantity in the app. Measure the wall, not the photo.
            </div>
            <DimField label="Room wall width" value={wall.roomWidthIn} onChange={(v) => store.patchWall({ roomWidthIn: v }, 'Room width')} min={12} feet />
            <DimField label="Ceiling height" value={wall.ceilingHeightIn} onChange={(v) => store.patchWall({ ceilingHeightIn: v }, 'Ceiling')} min={60} feet />
            <DimField label="Feature wall width" value={wall.widthIn} onChange={(v) => store.patchWall({ widthIn: v }, 'Wall width')} min={12} feet
              hint="How wide the build-out will be" />
            <DimField label="Feature wall height" value={wall.heightIn} onChange={(v) => store.patchWall({ heightIn: v }, 'Wall height')} min={12} feet />
            <DimField label="Build-out depth" value={wall.featureDepthIn} onChange={(v) => store.patchWall({ featureDepthIn: v }, 'Depth')} min={1} />
            <DimField label="Existing baseboard height" value={wall.baseboardHeightIn} onChange={(v) => store.patchWall({ baseboardHeightIn: v }, 'Base')} />
            <button className="btn block" onClick={() => store.patchWall({ heightIn: wall.ceilingHeightIn }, 'Full height')}>
              <Icon name="ruler" size={15} />Run the wall floor to ceiling ({inchesToFeet(wall.ceilingHeightIn)})
            </button>
          </Panel>

          <Panel title="All photos" eyebrow={`${project.photos.length} on file`}>
            {project.photos.length === 0 ? <div className="faint" style={{ fontSize: 13 }}>Nothing yet.</div> : (
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 6 }}>
                {project.photos.map((p) => (
                  <div key={p.id} style={{ position: 'relative' }}>
                    <img src={p.url} alt={p.caption} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 6, border: p.id === design.basePhotoId ? '2px solid var(--gold)' : '1px solid var(--line)' }} />
                    <div className="row" style={{ gap: 4, marginTop: 4 }}>
                      <button className="btn sm ghost" style={{ flex: 1, fontSize: 11, minHeight: 26 }}
                        onClick={() => store.patchDesign({ basePhotoId: p.id }, 'Base photo')}>Use</button>
                      <button className="btn sm ghost danger" style={{ minHeight: 26, width: 26, padding: 0 }} onClick={() => store.removePhoto(p.id)}>
                        <Icon name="x" size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn sm block" onClick={() => fileRef.current?.click()}><Icon name="plus" size={14} />Add reference photo</button>
            </div>
          </Panel>
        </div>
      </div>

      <Sheet open={!!editing} onClose={() => { setEditing(null); setRotate(0); }} title="Straighten & set"
        footer={
          <div className="row">
            <button className="btn ghost" onClick={() => { setEditing(null); setRotate(0); }}>Cancel</button>
            <div className="spacer" />
            <button className="btn gold" disabled={busy} onClick={applyEdit}><Icon name="check" size={15} />{busy ? 'Saving…' : 'Use this photo'}</button>
          </div>
        }>
        {editing && (
          <>
            <div style={{ overflow: 'hidden', borderRadius: 8, border: '1px solid var(--line)', background: '#000' }}>
              <img src={editing.url} alt="" style={{ width: '100%', display: 'block', transform: `rotate(${rotate}deg) scale(${zoom})`, transition: 'transform .1s' }} />
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <span className="eyebrow" style={{ width: 62 }}>Rotate</span>
              <input type="range" min={-8} max={8} step={0.1} value={rotate} onChange={(e) => setRotate(parseFloat(e.target.value))} style={{ flex: 1, minHeight: 0 }} />
              <span className="mono" style={{ width: 48, textAlign: 'right', fontSize: 12 }}>{rotate.toFixed(1)}°</span>
            </div>
            <div className="row">
              <span className="eyebrow" style={{ width: 62 }}>Zoom</span>
              <input type="range" min={1} max={1.6} step={0.01} value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} style={{ flex: 1, minHeight: 0 }} />
              <span className="mono" style={{ width: 48, textAlign: 'right', fontSize: 12 }}>{zoom.toFixed(2)}×</span>
            </div>
            <div className="row" style={{ marginTop: 6 }}>
              <button className="btn sm ghost" onClick={() => { setRotate(0); setZoom(1); }}><Icon name="refresh" size={14} />Reset</button>
              <span className="faint" style={{ fontSize: 12 }}>Level the ceiling line, then set it.</span>
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
}
