/**
 * Inspector — the numeric side of the editor.
 *
 * The fireplace panel is deliberately the strictest thing in the app: advertised
 * size never populates the rough opening or the clearances, and nothing is
 * treated as known until a human ticks the verification box.
 */
import { useState } from 'react';
import type {
  CabinetComponent, CaseMaterial, Design, DesignComponent, DeviceComponent, FinishId,
  FireplaceComponent, HearthComponent, LumberSize, NicheComponent, PanelComponent,
  ShelfColumnComponent, SideReturns, StudSpacing, TvComponent,
} from '@shared/types';
import { TV_SIZES, TV_SIZE_LIST, FIREPLACE_SIZES, FINISHES } from '@shared/catalog';
import {
  maxNicheDepth, suggestedFeatureDepth, NICHE_PALETTE, makeNiche, makeDevice,
  makeShelfColumn, makeCabinet, makePanel, makeHearth, createDefaultDesign, WALL_STYLES,
} from '@shared/defaults';
import { SHEET_MATERIAL } from '@shared/catalog';
import { inchesToFeet, inchesToFraction, snap } from '@shared/units';
import { alignComponents, distributeComponents, layoutNicheBanks } from '@shared/geometry';
import { store } from '../lib/store';
import { Check, DimField, Field, NumField, Pill, Segmented, Select, TextField, toast } from '../components/ui';
import { Icon } from '../components/icons';
import { duplicateSelection, isDevice } from './DesignCanvas';

const WALL_COLORS = ['#8E8E93', '#6E6E76', '#4A4A52', '#2C2C33', '#F5F0E8', '#D8D2C6', '#2E3A45', '#3A4A3E', '#5A4638', '#7A5E52'];

export function Inspector({ design, selection }: { design: Design; selection: string[] }) {
  const picked = design.components.filter((c) => selection.includes(c.id));
  if (picked.length === 0) return <WallInspector design={design} />;
  if (picked.length > 1) return <MultiInspector design={design} picked={picked} />;
  return <SingleInspector design={design} component={picked[0]} />;
}

/* ------------------------------------------------------------------- wall */

function WallInspector({ design }: { design: Design }) {
  const w = design.wall;
  const suggested = suggestedFeatureDepth(w);
  return (
    <div className="inspector">
      <div className="insp-title">
        <Icon name="layout" size={18} />
        <div className="display">WALL</div>
        <div className="spacer" />
        <Pill>{inchesToFeet(w.widthIn)} × {inchesToFeet(w.heightIn)}</Pill>
      </div>

      <div className="grid two" style={{ gap: 0, gridTemplateColumns: '1fr 1fr', columnGap: 10 }}>
        <DimField label="Feature wall width" value={w.widthIn} onChange={(v) => store.patchWall({ widthIn: v }, 'Wall width')} min={12} feet />
        <DimField label="Feature wall height" value={w.heightIn} onChange={(v) => store.patchWall({ heightIn: v }, 'Wall height')} min={12} feet />
        <DimField label="Ceiling height" value={w.ceilingHeightIn} onChange={(v) => store.patchWall({ ceilingHeightIn: v }, 'Ceiling')} min={60} feet />
        <DimField label="Room wall width" value={w.roomWidthIn} onChange={(v) => store.patchWall({ roomWidthIn: v }, 'Room width')} min={12} feet />
        <DimField label="Build-out depth" value={w.featureDepthIn} onChange={(v) => store.patchWall({ featureDepthIn: v }, 'Depth')} min={1}
          hint={w.featureDepthIn < suggested ? `Needs ${suggested}" for ${w.lumber} + drywall` : `${w.lumber} + drywall = ${suggested}"`} />
        <DimField label="Wall starts at X" value={w.offsetXIn} onChange={(v) => store.patchWall({ offsetXIn: v }, 'Offset')} />
      </div>

      <Field label="Wall colour">
        <div className="swatches">
          {WALL_COLORS.map((c) => (
            <div key={c} className={`swatch${w.colorHex === c ? ' on' : ''}`} style={{ background: c }} onClick={() => store.patchWall({ colorHex: c }, 'Colour')} />
          ))}
          <input type="color" value={w.colorHex} onChange={(e) => store.patchWall({ colorHex: e.target.value }, 'Colour')}
            style={{ width: 34, height: 30, padding: 2, minHeight: 0 }} />
        </div>
      </Field>

      <Field label="Start from a wall style" hint="Replaces the design — undo brings it back">
        <div className="grid" style={{ gap: 6 }}>
          {WALL_STYLES.map((st) => (
            <button key={st.id} className="btn" style={{ justifyContent: 'flex-start', textAlign: 'left', height: 'auto', padding: '8px 11px' }}
              onClick={() => {
                const tv = design.components.find((c) => c.type === 'tv');
                const fp = design.components.find((c) => c.type === 'fireplace');
                const next = createDefaultDesign(w, {
                  style: st.id,
                  tvSize: (tv && tv.type === 'tv' && typeof tv.props.sizeClass === 'number') ? tv.props.sizeClass : 75,
                  fireplaceSize: fp && fp.type === 'fireplace' && typeof fp.props.advertisedIn === 'number' ? fp.props.advertisedIn : 60,
                });
                store.commitDesign({ ...next, basePhotoId: design.basePhotoId, calibration: design.calibration }, `Style: ${st.label}`);
                toast(`${st.label} applied`);
              }}>
              <div>
                <div style={{ fontWeight: 600 }}>{st.label}</div>
                <div className="faint" style={{ fontSize: 11.5 }}>{st.note}</div>
              </div>
            </button>
          ))}
        </div>
      </Field>

      <Select label="Finish material" value={w.finish} options={Object.entries(FINISHES).map(([k, v]) => ({ value: k as FinishId, label: v.label }))}
        onChange={(v) => store.patchWall({ finish: v }, 'Finish')} hint={FINISHES[w.finish].note} />
      {w.finish === 'custom' && (
        <TextField label="Custom finish notes" value={w.finishNotes} onChange={(v) => store.patchWall({ finishNotes: v })} placeholder="Describe the material and how it installs" />
      )}

      <Field label="Baseboard">
        <div className="row">
          <div style={{ flex: 1 }}>
            <input className="mono" value={inchesToFraction(w.baseboardHeightIn)} readOnly style={{ opacity: .7 }} />
          </div>
          <Segmented value={w.baseboardKeep ? 'keep' : 'none'} onChange={(v) => store.patchWall({ baseboardKeep: v === 'keep' }, 'Baseboard')}
            options={[{ value: 'keep', label: 'Return base' }, { value: 'none', label: 'No base' }]} />
        </div>
      </Field>
      {w.baseboardKeep && <DimField label="Baseboard height" value={w.baseboardHeightIn} onChange={(v) => store.patchWall({ baseboardHeightIn: v })} />}

      <div className="eyebrow" style={{ marginTop: 6 }}>Construction</div>
      <Field label="Stud spacing">
        <Segmented value={w.studSpacing} onChange={(v) => store.patchWall({ studSpacing: v as StudSpacing }, 'Spacing')}
          options={[{ value: 12, label: '12" O.C.' }, { value: 16, label: '16" O.C.' }, { value: 24, label: '24" O.C.' }]} />
      </Field>
      <Field label="Framing lumber">
        <Segmented value={w.lumber} onChange={(v) => store.patchWall({ lumber: v as LumberSize }, 'Lumber')}
          options={[{ value: '2x3', label: '2×3' }, { value: '2x4', label: '2×4' }, { value: '2x6', label: '2×6' }, { value: '2x8', label: '2×8' }]} />
      </Field>
      <Field label="Drywall">
        <Segmented value={w.drywallThickness} onChange={(v) => store.patchWall({ drywallThickness: v as 0.5 | 0.625 }, 'Drywall')}
          options={[{ value: 0.5, label: '1/2"' }, { value: 0.625, label: '5/8" Type X' }]} />
      </Field>
      <Field label="Exposed side returns">
        <Segmented value={w.sideReturns} onChange={(v) => store.patchWall({ sideReturns: v as SideReturns }, 'Returns')}
          options={[{ value: 'none', label: 'None' }, { value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }, { value: 'both', label: 'Both' }]} />
      </Field>
      <Check label="Double top plate" checked={w.doubleTopPlate} onChange={(v) => store.patchWall({ doubleTopPlate: v }, 'Plates')} />
      <Check label="Mid-height blocking row" checked={w.midBlocking} onChange={(v) => store.patchWall({ midBlocking: v }, 'Blocking')} />
      <Check label="Pressure-treated bottom plate (slab)" checked={w.ptBottomPlate} onChange={(v) => store.patchWall({ ptBottomPlate: v }, 'Plate')} />

      <NumField label="Waste factor" suffix="%" value={w.wasteFactorPct} onChange={(v) => store.patchWall({ wasteFactorPct: v }, 'Waste')} min={0} max={50} />
      <Field label="Waste presets">
        <Segmented value={[5, 10, 15, 20].includes(w.wasteFactorPct) ? w.wasteFactorPct : 0}
          onChange={(v) => v && store.patchWall({ wasteFactorPct: v as number }, 'Waste')}
          options={[{ value: 5, label: '5%' }, { value: 10, label: '10%' }, { value: 15, label: '15%' }, { value: 20, label: '20%' }, { value: 0, label: 'Custom' }]} />
      </Field>

      <div className="eyebrow" style={{ marginTop: 6 }}>Existing conditions</div>
      <Field label="Is the existing wall load-bearing?" >
        <Segmented value={w.loadBearing} onChange={(v) => store.patchWall({ loadBearing: v as 'unknown' | 'no' | 'yes' }, 'Structure')}
          options={[{ value: 'unknown', label: 'Not checked' }, { value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]} />
      </Field>
      {w.loadBearing !== 'no' && (
        <div className="note warn" style={{ fontSize: 12 }}>
          Confirm before fastening or cutting. If it is load-bearing, a licensed structural engineer signs off — this app performs no structural calculation.
        </div>
      )}
      <Field label="Notes on the existing wall">
        <textarea value={w.existingWallNotes} placeholder="Outlets to relocate, HVAC, plumbing, chase, window trim…"
          onChange={(e) => store.patchWall({ existingWallNotes: e.target.value })} />
      </Field>
    </div>
  );
}

/* ------------------------------------------------------------ multi-select */

function MultiInspector({ design, picked }: { design: Design; picked: DesignComponent[] }) {
  const ids = picked.map((c) => c.id);
  const apply = (next: DesignComponent[]) => {
    const map = new Map(next.map((c) => [c.id, c]));
    store.updateComponents((c) => map.get(c.id) ?? c, ids, 'Align');
  };
  return (
    <div className="inspector">
      <div className="insp-title">
        <Icon name="layers" size={18} />
        <div className="display">{picked.length} SELECTED</div>
      </div>
      <div className="eyebrow">Align</div>
      <div className="row wrap">
        {([['left', 'alignL'], ['hcenter', 'alignC'], ['right', 'alignR']] as const).map(([mode, icon]) => (
          <button key={mode} className="btn sm" onClick={() => apply(alignComponents(picked, mode, design.wall))}><Icon name={icon} size={15} /></button>
        ))}
        {([['bottom', 'alignL'], ['vcenter', 'alignC'], ['top', 'alignR']] as const).map(([mode, icon]) => (
          <button key={mode} className="btn sm" onClick={() => apply(alignComponents(picked, mode, design.wall))} style={{ transform: 'rotate(90deg)' }}>
            <Icon name={icon} size={15} />
          </button>
        ))}
      </div>
      <div className="eyebrow" style={{ marginTop: 8 }}>Distribute evenly</div>
      <div className="row">
        <button className="btn sm" onClick={() => apply(distributeComponents(picked, 'x'))}><Icon name="distribute" size={15} />Horizontal</button>
        <button className="btn sm" onClick={() => apply(distributeComponents(picked, 'y'))} ><Icon name="distribute" size={15} style={{ transform: 'rotate(90deg)' }} />Vertical</button>
      </div>
      <div className="eyebrow" style={{ marginTop: 8 }}>Match size</div>
      <div className="row">
        <button className="btn sm" onClick={() => { const w = picked[0].w; store.updateComponents((c) => ({ ...c, w }), ids, 'Match width'); }}>Width</button>
        <button className="btn sm" onClick={() => { const h = picked[0].h; store.updateComponents((c) => ({ ...c, h }), ids, 'Match height'); }}>Height</button>
        <button className="btn sm" onClick={() => { const d = picked[0].depthIn; store.updateComponents((c) => ({ ...c, depthIn: d }), ids, 'Match depth'); }}>Depth</button>
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn sm" onClick={() => duplicateSelection(design, ids)}><Icon name="copy" size={14} />Duplicate</button>
        <button className="btn sm" onClick={() => store.updateComponents((c) => ({ ...c, locked: !c.locked }), ids, 'Lock')}><Icon name="lock" size={14} />Lock</button>
        <button className="btn sm danger" onClick={() => store.removeComponents(ids)}><Icon name="trash" size={14} />Delete</button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- single */

function SingleInspector({ design, component }: { design: Design; component: DesignComponent }) {
  const c = component;
  const patch = (p: Partial<DesignComponent>) => store.updateComponents((x) => ({ ...x, ...p } as DesignComponent), [c.id], 'Edit');
  const patchProps = (p: Record<string, unknown>) =>
    store.updateComponents((x) => ({ ...x, props: { ...(x as any).props, ...p } } as DesignComponent), [c.id], 'Edit');

  return (
    <div className="inspector">
      <div className="insp-title">
        <Icon name={c.type === 'tv' ? 'tv' : c.type === 'fireplace' ? 'flame' : c.type === 'niche' ? 'box' : isDevice(c) ? 'bolt' : 'layout'} size={18} />
        <div className="display">{c.type.toUpperCase()}</div>
        <div className="spacer" />
        {c.locked && <Pill tone="gold">Locked</Pill>}
      </div>

      <TextField label="Label" value={c.label} onChange={(v) => patch({ label: v })} />

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', columnGap: 10, gap: 0 }}>
        <DimField label="X (from wall left)" value={c.x} onChange={(v) => patch({ x: v })} min={-200} />
        <DimField label="Y (above floor)" value={c.y} onChange={(v) => patch({ y: v })} min={-200} feet />
        <DimField label="Width" value={c.w} onChange={(v) => patch({ w: v })} min={0.5} />
        <DimField label="Height" value={c.h} onChange={(v) => patch({ h: v })} min={0.5} />
      </div>

      <div className="row wrap" style={{ marginBottom: 10 }}>
        <button className="btn sm" onClick={() => patch({ x: snap(design.wall.widthIn / 2 - c.w / 2) })}><Icon name="center" size={14} />Centre H</button>
        <button className="btn sm" onClick={() => patch({ y: snap(design.wall.heightIn / 2 - c.h / 2) })}><Icon name="center" size={14} />Centre V</button>
        <button className="btn sm" onClick={() => duplicateSelection(design, [c.id])}><Icon name="copy" size={14} /></button>
        <button className="btn sm" onClick={() => patch({ locked: !c.locked })}><Icon name={c.locked ? 'unlock' : 'lock'} size={14} /></button>
        <button className="btn sm danger" onClick={() => store.removeComponents([c.id])}><Icon name="trash" size={14} /></button>
      </div>

      {c.type === 'tv' && <TvPanel tv={c as TvComponent} patch={patch} patchProps={patchProps} />}
      {c.type === 'fireplace' && <FireplacePanel fp={c as FireplaceComponent} patch={patch} patchProps={patchProps} />}
      {c.type === 'niche' && <NichePanel niche={c as NicheComponent} design={design} patch={patch} patchProps={patchProps} />}
      {c.type === 'shelf_column' && <ShelfColumnPanel col={c as ShelfColumnComponent} patch={patch} patchProps={patchProps} />}
      {c.type === 'cabinet' && <CabinetPanel cab={c as CabinetComponent} patch={patch} patchProps={patchProps} />}
      {c.type === 'panel' && <SlatPanelPanel pnl={c as PanelComponent} patch={patch} patchProps={patchProps} />}
      {c.type === 'hearth' && <HearthPanel hth={c as HearthComponent} patchProps={patchProps} />}
      {isDevice(c) && <DevicePanel device={c as DeviceComponent} patchProps={patchProps} />}
      {(c.type === 'soundbar' || c.type === 'shelf' || c.type === 'custom') && (
        <>
          <DimField label="Recess depth" value={c.depthIn} onChange={(v) => patch({ depthIn: v })} min={0} max={maxNicheDepth(design.wall)} />
          {c.type === 'soundbar' && (
            <Check label="Dimensions verified from the spec sheet" checked={(c as any).props.dimensionsVerified}
              onChange={(v) => patchProps({ dimensionsVerified: v })} />
          )}
        </>
      )}
    </div>
  );
}

function TvPanel({ tv, patch, patchProps }: { tv: TvComponent; patch: (p: any) => void; patchProps: (p: any) => void }) {
  const centerY = tv.y + tv.h / 2;
  return (
    <>
      <div className="eyebrow">Panel size</div>
      <div className="seg" style={{ marginBottom: 10 }}>
        {TV_SIZE_LIST.map((s) => (
          <button key={s} className={tv.props.sizeClass === s ? 'on gold' : ''}
            onClick={() => {
              const d = TV_SIZES[s];
              patch({ w: d.w, h: d.h, label: `${s}" TV`, x: snap(tv.x + tv.w / 2 - d.w / 2), y: snap(centerY - d.h / 2) });
              patchProps({ sizeClass: s, weightLb: d.weightLb, vesaW: d.vesaW / 25.4, vesaH: d.vesaH / 25.4, dimensionsVerified: false });
            }}>{s}"</button>
        ))}
        <button className={tv.props.sizeClass === 'custom' ? 'on gold' : ''} onClick={() => patchProps({ sizeClass: 'custom' })}>Custom</button>
      </div>

      <div className="note" style={{ marginBottom: 10, fontSize: 12 }}>
        Panel size shown is <strong>typical for the class</strong>. Enter the actual width and height from the spec sheet before framing.
      </div>
      <Check label="Panel dimensions verified against the spec sheet" checked={tv.props.dimensionsVerified} onChange={(v) => patchProps({ dimensionsVerified: v })} />

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', columnGap: 10, gap: 0 }}>
        <TextField label="Manufacturer" value={tv.props.manufacturer} onChange={(v) => patchProps({ manufacturer: v })} placeholder="Samsung" />
        <TextField label="Model" value={tv.props.model} onChange={(v) => patchProps({ model: v })} placeholder="QN75QN90D" />
        <NumField label="Weight" suffix="lb" value={tv.props.weightLb} onChange={(v) => patchProps({ weightLb: v })} />
        <NumField label="VESA W" suffix="in" value={Math.round(tv.props.vesaW * 10) / 10} onChange={(v) => patchProps({ vesaW: v })} />
        <NumField label="VESA H" suffix="in" value={Math.round(tv.props.vesaH * 10) / 10} onChange={(v) => patchProps({ vesaH: v })} hint="Drives blocking rows" />
      </div>

      <Select label="Mount type" value={tv.props.mountType} onChange={(v) => patchProps({ mountType: v })}
        options={[{ value: 'fixed', label: 'Fixed / low profile' }, { value: 'tilt', label: 'Tilting' }, { value: 'full_motion', label: 'Full motion' }, { value: 'recessed_box', label: 'In-wall recessed mount' }]} />
      <Check label="Recessed box behind the panel" checked={tv.props.recessedBox} onChange={(v) => patchProps({ recessedBox: v })} />
      <Check label="Bias light behind the panel" checked={tv.props.biasLight} onChange={(v) => patchProps({ biasLight: v })} />

      <div className="grid three" style={{ gap: 8, marginTop: 10 }}>
        <div className="stat"><div className="stat-label">Centre AFF</div><div className="stat-value sm mono">{inchesToFeet(centerY)}</div></div>
        <div className="stat"><div className="stat-label">Bottom</div><div className="stat-value sm mono">{inchesToFeet(tv.y)}</div></div>
        <div className="stat"><div className="stat-label">Top</div><div className="stat-value sm mono">{inchesToFeet(tv.y + tv.h)}</div></div>
      </div>
    </>
  );
}

function FireplacePanel({ fp, patch, patchProps }: { fp: FireplaceComponent; patch: (p: any) => void; patchProps: (p: any) => void }) {
  const p = fp.props;
  const numOrNull = (v: number) => (v === 0 ? null : v);
  return (
    <>
      <div className="eyebrow">Advertised size</div>
      <div className="seg" style={{ marginBottom: 10 }}>
        {FIREPLACE_SIZES.map((s) => (
          <button key={s} className={p.advertisedIn === s ? 'on gold' : ''}
            onClick={() => { patch({ w: s, label: `${s}" linear electric fireplace` }); patchProps({ advertisedIn: s, specsVerified: false }); }}>{s}"</button>
        ))}
        <button className={p.advertisedIn === 'custom' ? 'on gold' : ''} onClick={() => patchProps({ advertisedIn: 'custom' })}>Custom</button>
      </div>

      <div className="note block" style={{ marginBottom: 12 }}>
        <strong>Advertised size is a marketing number.</strong> The rough opening, clearances and electrical below come from the
        manufacturer's installation instructions only — this app will never infer them, and the construction package stays
        marked <em>not for construction</em> until they are entered and verified.
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', columnGap: 10, gap: 0 }}>
        <TextField label="Manufacturer" value={p.manufacturer} onChange={(v) => patchProps({ manufacturer: v, specsVerified: false })} placeholder="Touchstone" />
        <TextField label="Model" value={p.model} onChange={(v) => patchProps({ model: v, specsVerified: false })} placeholder="Sideline 60" />
      </div>

      <div className="eyebrow">Overall unit dimensions</div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', columnGap: 8, gap: 0 }}>
        <DimField label="Width" value={p.overallWIn ?? 0} onChange={(v) => patchProps({ overallWIn: numOrNull(v) })} />
        <DimField label="Height" value={p.overallHIn ?? 0} onChange={(v) => patchProps({ overallHIn: numOrNull(v), ...(v ? {} : {}) })} />
        <DimField label="Depth" value={p.overallDIn ?? 0} onChange={(v) => patchProps({ overallDIn: numOrNull(v) })} />
      </div>
      {p.overallWIn && p.overallHIn ? (
        <button className="btn sm block" style={{ marginBottom: 12 }}
          onClick={() => patch({ w: p.overallWIn!, h: p.overallHIn! })}>
          <Icon name="check" size={14} />Draw the unit at its actual size
        </button>
      ) : null}

      <div className="eyebrow rust">Manufacturer rough opening — required</div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', columnGap: 8, gap: 0 }}>
        <DimField label="R.O. width" value={p.roughWIn ?? 0} onChange={(v) => patchProps({ roughWIn: numOrNull(v), specsVerified: false })} />
        <DimField label="R.O. height" value={p.roughHIn ?? 0} onChange={(v) => patchProps({ roughHIn: numOrNull(v), specsVerified: false })} />
        <DimField label="R.O. depth" value={p.roughDIn ?? 0} onChange={(v) => patchProps({ roughDIn: numOrNull(v), specsVerified: false })} />
      </div>

      <div className="eyebrow rust">Required clearances to combustibles</div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', columnGap: 8, gap: 0 }}>
        <DimField label="Above unit" value={p.clearanceTopIn ?? 0} onChange={(v) => patchProps({ clearanceTopIn: numOrNull(v), specsVerified: false })} />
        <DimField label="Each side" value={p.clearanceSideIn ?? 0} onChange={(v) => patchProps({ clearanceSideIn: numOrNull(v), specsVerified: false })} />
        <DimField label="Below unit" value={p.clearanceBottomIn ?? 0} onChange={(v) => patchProps({ clearanceBottomIn: numOrNull(v) })} />
        <DimField label="In front" value={p.clearanceFrontIn ?? 0} onChange={(v) => patchProps({ clearanceFrontIn: numOrNull(v) })} />
        <DimField label="To TV / mantel" value={p.clearanceToTvIn ?? 0} onChange={(v) => patchProps({ clearanceToTvIn: numOrNull(v) })} hint="Checked against the TV position" />
      </div>

      <div className="eyebrow rust">Electrical</div>
      <TextField label="Electrical requirement" value={p.electrical} onChange={(v) => patchProps({ electrical: v, specsVerified: false })}
        placeholder="120V 15A dedicated circuit" />
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', columnGap: 10, gap: 0 }}>
        <NumField label="Amp draw" suffix="A" value={p.ampDraw ?? 0} onChange={(v) => patchProps({ ampDraw: v || null })} />
        <Field label="Connection"><Segmented value={p.hardwired ? 'hard' : 'plug'} onChange={(v) => patchProps({ hardwired: v === 'hard' })}
          options={[{ value: 'plug', label: 'Cord & plug' }, { value: 'hard', label: 'Hardwired' }]} /></Field>
      </div>

      <Field label="Installation notes">
        <textarea value={p.installNotes} onChange={(e) => patchProps({ installNotes: e.target.value })}
          placeholder="Recess depth, mounting brackets, venting, glass front, remote receiver location…" />
      </Field>
      <TextField label="Spec source" value={p.specSource} onChange={(v) => patchProps({ specSource: v })} placeholder="Manual PDF page 7, rev 2024-03" />

      <label className="check" style={{ background: p.specsVerified ? 'rgba(127,201,138,.1)' : 'rgba(210,112,63,.12)', border: `1px solid ${p.specsVerified ? 'rgba(127,201,138,.4)' : 'rgba(210,112,63,.4)'}`, borderRadius: 8, padding: '10px 12px', marginTop: 6 }}>
        <input type="checkbox" checked={p.specsVerified} onChange={(e) => patchProps({ specsVerified: e.target.checked })} />
        <span><strong>I have read the installation manual</strong> and the numbers above match it.</span>
      </label>
    </>
  );
}

function NichePanel({ niche, design, patch, patchProps }: { niche: NicheComponent; design: Design; patch: (p: any) => void; patchProps: (p: any) => void }) {
  const l = niche.props.lighting;
  const allNiches = design.components.filter((c): c is NicheComponent => c.type === 'niche');
  const maxD = maxNicheDepth(design.wall);
  const applyAll = (fn: (n: NicheComponent) => Partial<NicheComponent>) =>
    store.updateComponents((c) => (c.type === 'niche' ? { ...c, ...fn(c as NicheComponent) } as any : c), allNiches.map((n) => n.id), 'All niches');

  return (
    <>
      <DimField label="Recess depth" value={niche.depthIn} onChange={(v) => patch({ depthIn: v })} min={0.5} max={maxD}
        hint={`Max ${inchesToFraction(maxD)} in a ${inchesToFraction(design.wall.featureDepthIn)} wall`} />

      <div className="row" style={{ marginBottom: 12 }}>
        <button className="btn sm block" onClick={() => applyAll(() => ({ w: niche.w, h: niche.h, depthIn: niche.depthIn }))}>
          <Icon name="layers" size={14} />Apply this size to all {allNiches.length} niches
        </button>
      </div>

      <div className="eyebrow">Lighting</div>
      <Field label="Fixture">
        <Segmented value={l.kind} onChange={(v) => patchProps({ lighting: { ...l, kind: v } })}
          options={[{ value: 'none', label: 'None' }, { value: 'puck', label: 'Puck' }, { value: 'led_strip', label: 'Strip' }, { value: 'puck_and_strip', label: 'Both' }]} />
      </Field>
      <Field label="Colour mode">
        <Segmented value={l.colorMode} onChange={(v) => patchProps({ lighting: { ...l, colorMode: v } })}
          options={[{ value: 'white', label: 'White' }, { value: 'warm', label: 'Warm' }, { value: 'rgb', label: 'RGB' }, { value: 'rgbw', label: 'RGBW' }]} />
      </Field>
      <Field label="Preview colour">
        <div className="swatches">
          {NICHE_PALETTE.map((c) => (
            <div key={c} className={`swatch${l.colorHex === c ? ' on' : ''}`} style={{ background: c }}
              onClick={() => patchProps({ lighting: { ...l, colorHex: c } })} />
          ))}
          <input type="color" value={l.colorHex} onChange={(e) => patchProps({ lighting: { ...l, colorHex: e.target.value } })}
            style={{ width: 34, height: 30, padding: 2, minHeight: 0 }} />
        </div>
      </Field>
      <NumField label="Intensity" suffix="%" value={l.intensityPct} onChange={(v) => patchProps({ lighting: { ...l, intensityPct: v } })} min={0} max={100} />
      {(l.kind === 'puck' || l.kind === 'puck_and_strip') && (
        <NumField label="Pucks in this niche" value={l.puckCount} onChange={(v) => patchProps({ lighting: { ...l, puckCount: Math.max(0, Math.round(v)) } })} min={0} max={6} />
      )}

      <div className="row wrap" style={{ marginBottom: 12 }}>
        <button className="btn sm" onClick={() => applyAll(() => ({ props: { ...niche.props, lighting: { ...l } } } as any))}>Lighting → all</button>
        <button className="btn sm" onClick={() => applyAll((n) => ({ props: { ...n.props, lighting: { ...n.props.lighting, colorHex: NICHE_PALETTE[n.props.index % NICHE_PALETTE.length] } } } as any))}>Rainbow</button>
        <button className="btn sm" onClick={() => applyAll((n) => ({ props: { ...n.props, lighting: { ...n.props.lighting, colorHex: '#FFE3B0', colorMode: 'warm' } } } as any))}>All warm</button>
      </div>

      <Check label="Shelf across the niche" checked={niche.props.hasShelf} onChange={(v) => patchProps({ hasShelf: v })} />
      <Field label="Niche interior">
        <Segmented value={niche.props.backFinish === 'match_wall' ? 'match' : 'custom'}
          onChange={(v) => patchProps({ backFinish: v === 'match' ? 'match_wall' : design.wall.finish })}
          options={[{ value: 'match', label: 'Match wall' }, { value: 'custom', label: 'Accent colour' }]} />
      </Field>
      {niche.props.backFinish !== 'match_wall' && (
        <input type="color" value={niche.props.backColorHex} onChange={(e) => patchProps({ backColorHex: e.target.value })}
          style={{ width: 56, height: 34, padding: 2, minHeight: 0 }} />
      )}
    </>
  );
}

const MATERIAL_OPTIONS = Object.entries(SHEET_MATERIAL).map(([k, v]) => ({ value: k as CaseMaterial, label: v.label }));

function ShelfColumnPanel({ col, patch, patchProps }: { col: ShelfColumnComponent; patch: (p: any) => void; patchProps: (p: any) => void }) {
  const p = col.props;
  const l = p.lighting;
  const span = Math.round(col.w - p.carcassThicknessIn * 2);
  const limit = p.shelfThicknessIn >= 1 ? 42 : p.material === 'mdf_3_4' ? 28 : 32;
  return (
    <>
      <DimField label="Carcass depth" value={col.depthIn} onChange={(v) => patch({ depthIn: v })} min={4} max={36} />
      <NumField label="Shelves" value={p.shelfCount} onChange={(v) => patchProps({ shelfCount: Math.max(0, Math.round(v)) })} min={0} max={12}
        hint={`${p.shelfCount + 1} openings at about ${Math.round((col.h - p.carcassThicknessIn * 2) / (p.shelfCount + 1))}" each`} />
      <Select label="Carcass material" value={p.material} options={MATERIAL_OPTIONS} onChange={(v) => patchProps({ material: v })} />
      <DimField label="Shelf thickness" value={p.shelfThicknessIn} onChange={(v) => patchProps({ shelfThicknessIn: v })} min={0.25} max={2} />
      {span > limit && (
        <div className="note warn" style={{ fontSize: 12, marginBottom: 10 }}>
          <strong>{span}" span.</strong> {p.material === 'mdf_3_4' ? 'MDF' : 'Ply'} at {p.shelfThicknessIn}" sags past about {limit}".
          Add a centre divider, thicken the shelf, or band the front edge in hardwood.
        </div>
      )}
      <Check label="Adjustable shelves on pins" checked={p.adjustable} onChange={(v) => patchProps({ adjustable: v })} />
      <Check label="Back panel" checked={p.backPanel} onChange={(v) => patchProps({ backPanel: v })} />
      <Check label="Edge-band exposed edges" checked={p.edgeBanding} onChange={(v) => patchProps({ edgeBanding: v })} />

      <div className="eyebrow">Lighting</div>
      <Field label="Fixture">
        <Segmented value={l.kind} onChange={(v) => patchProps({ lighting: { ...l, kind: v } })}
          options={[{ value: 'none', label: 'None' }, { value: 'led_strip', label: 'Shelf strip' }, { value: 'puck', label: 'Puck' }, { value: 'puck_and_strip', label: 'Both' }]} />
      </Field>
      <Field label="Colour">
        <div className="swatches">
          {['#FFE3B0', '#FFF4E0', '#FFFFFF', ...NICHE_PALETTE.slice(0, 5)].map((c) => (
            <div key={c} className={`swatch${l.colorHex === c ? ' on' : ''}`} style={{ background: c }} onClick={() => patchProps({ lighting: { ...l, colorHex: c } })} />
          ))}
        </div>
      </Field>
      <Field label="Interior / face colour">
        <div className="row" style={{ gap: 8 }}>
          <input type="color" value={p.interiorColorHex} onChange={(e) => patchProps({ interiorColorHex: e.target.value })} style={{ width: 52, height: 34, padding: 2, minHeight: 0 }} />
          <input type="color" value={p.faceColorHex} onChange={(e) => patchProps({ faceColorHex: e.target.value })} style={{ width: 52, height: 34, padding: 2, minHeight: 0 }} />
          <span className="faint" style={{ fontSize: 11.5 }}>interior · carcass</span>
        </div>
      </Field>
    </>
  );
}

function CabinetPanel({ cab, patch, patchProps }: { cab: CabinetComponent; patch: (p: any) => void; patchProps: (p: any) => void }) {
  const p = cab.props;
  const bayW = Math.round((cab.w / Math.max(1, p.bays)) * 10) / 10;
  return (
    <>
      <DimField label="Cabinet depth" value={cab.depthIn} onChange={(v) => patch({ depthIn: v })} min={6} max={30} />
      <NumField label="Bays" value={p.bays} onChange={(v) => patchProps({ bays: Math.max(1, Math.round(v)) })} min={1} max={12}
        hint={`${bayW}" per bay${bayW > 24 ? ' — wide for a single door, consider more bays' : ''}`} />
      <Field label="Front style">
        <Segmented value={p.doorStyle} onChange={(v) => patchProps({ doorStyle: v })}
          options={[{ value: 'slab', label: 'Slab' }, { value: 'shaker', label: 'Shaker' }, { value: 'fluted', label: 'Fluted' }, { value: 'none', label: 'Open' }]} />
      </Field>
      <NumField label="Drawers per bay" value={p.drawersPerBay} onChange={(v) => patchProps({ drawersPerBay: Math.max(0, Math.round(v)) })} min={0} max={5}
        hint={p.drawersPerBay === 0 ? 'Doors' : `${p.bays * p.drawersPerBay} drawers total`} />
      <Field label="Mounting">
        <Segmented value={p.floating ? 'float' : 'floor'} onChange={(v) => patchProps({ floating: v === 'float' })}
          options={[{ value: 'floor', label: 'Floor standing' }, { value: 'float', label: 'Floating' }]} />
      </Field>
      {p.floating && (
        <div className="note warn" style={{ fontSize: 12, marginBottom: 10 }}>
          Floating carries its whole load in shear at the wall. Continuous blocking lagged into framing, plus a French
          cleat or steel bracket rated for the load. Not an anchor job.
        </div>
      )}
      {!p.floating && <DimField label="Toe kick" value={p.toeKickIn} onChange={(v) => patchProps({ toeKickIn: v })} min={0} max={8} />}
      <Select label="Carcass material" value={p.material} options={MATERIAL_OPTIONS} onChange={(v) => patchProps({ material: v })} />
      <Select label="Front material" value={p.faceMaterial} options={MATERIAL_OPTIONS} onChange={(v) => patchProps({ faceMaterial: v })} />
      <Field label="Hardware">
        <Segmented value={p.hardware} onChange={(v) => patchProps({ hardware: v })}
          options={[{ value: 'pull', label: 'Pull' }, { value: 'knob', label: 'Knob' }, { value: 'push_latch', label: 'Handleless' }]} />
      </Field>
      <Check label="Countertop / finished top" checked={p.countertop} onChange={(v) => patchProps({ countertop: v })} />
      <Check label="Ventilated for AV gear" checked={p.ventilated} onChange={(v) => patchProps({ ventilated: v })} />
      <Field label="Front colour">
        <input type="color" value={p.faceColorHex} onChange={(e) => patchProps({ faceColorHex: e.target.value })} style={{ width: 60, height: 34, padding: 2, minHeight: 0 }} />
      </Field>
    </>
  );
}

function SlatPanelPanel({ pnl, patch, patchProps }: { pnl: PanelComponent; patch: (p: any) => void; patchProps: (p: any) => void }) {
  const p = pnl.props;
  const pitch = p.slatWidthIn + p.slatGapIn;
  const across = p.orientation === 'vertical' ? pnl.w : pnl.h;
  const count = p.pattern === 'flat' ? 0 : Math.ceil(across / Math.max(0.25, pitch));
  return (
    <>
      <Field label="Pattern">
        <Segmented value={p.pattern} onChange={(v) => patchProps({ pattern: v })}
          options={[{ value: 'slat', label: 'Slat' }, { value: 'fluted', label: 'Fluted' }, { value: 'batten', label: 'Batten' }, { value: 'flat', label: 'Flat' }]} />
      </Field>
      <Field label="Direction">
        <Segmented value={p.orientation} onChange={(v) => patchProps({ orientation: v })}
          options={[{ value: 'vertical', label: 'Vertical' }, { value: 'horizontal', label: 'Horizontal' }]} />
      </Field>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', columnGap: 10, gap: 0 }}>
        <DimField label="Slat width" value={p.slatWidthIn} onChange={(v) => patchProps({ slatWidthIn: v })} min={0.25} max={8} />
        <DimField label="Gap" value={p.slatGapIn} onChange={(v) => patchProps({ slatGapIn: v })} min={0} max={8} />
        <DimField label="Slat depth" value={p.slatDepthIn} onChange={(v) => patchProps({ slatDepthIn: v })} min={0.125} max={4} />
        <DimField label="Panel depth" value={pnl.depthIn} onChange={(v) => patch({ depthIn: v })} min={0.25} max={6} />
      </div>
      <div className="note" style={{ fontSize: 12.5, marginBottom: 10 }}>
        <strong>{count} slats</strong> at {pitch.toFixed(2)}" pitch across {Math.round(across)}".
        That is {Math.ceil((count * (p.orientation === 'vertical' ? pnl.h : pnl.w)) / 12)} lineal feet of slat.
      </div>
      <Field label="Slat / backer colour">
        <div className="row" style={{ gap: 8 }}>
          <input type="color" value={p.colorHex} onChange={(e) => patchProps({ colorHex: e.target.value })} style={{ width: 52, height: 34, padding: 2, minHeight: 0 }} />
          <input type="color" value={p.backerColorHex} onChange={(e) => patchProps({ backerColorHex: e.target.value })} style={{ width: 52, height: 34, padding: 2, minHeight: 0 }} />
          <span className="faint" style={{ fontSize: 11.5 }}>slat · backer</span>
        </div>
      </Field>
      <Check label="Metal reveal between slats" checked={p.inlay} onChange={(v) => patchProps({ inlay: v })} />
      {p.inlay && (
        <input type="color" value={p.inlayColorHex} onChange={(e) => patchProps({ inlayColorHex: e.target.value })} style={{ width: 60, height: 34, padding: 2, minHeight: 0 }} />
      )}
    </>
  );
}

function HearthPanel({ hth, patchProps }: { hth: HearthComponent; patchProps: (p: any) => void }) {
  const p = hth.props;
  return (
    <>
      <DimField label="Projection from wall" value={p.projectionIn} onChange={(v) => patchProps({ projectionIn: v })} min={2} max={30}
        hint={p.seating ? 'A bench people sit on wants 15–18"' : 'A decorative ledge is usually 8–14"'} />
      <Check label="Rated for seating" checked={p.seating} onChange={(v) => patchProps({ seating: v })} />
      <Check label="Waterfall the finish down the ends" checked={p.waterfall} onChange={(v) => patchProps({ waterfall: v })} />
      <Check label="Lit toe kick underneath" checked={p.litToeKick} onChange={(v) => patchProps({ litToeKick: v })} />
      <Field label="Top material">
        <Segmented value={p.material as string} onChange={(v) => patchProps({ material: v })}
          options={[{ value: 'ply_3_4', label: 'Painted' }, { value: 'solid_wood', label: 'Timber' }, { value: 'stone', label: 'Stone' }, { value: 'plaster', label: 'Plaster' }]} />
      </Field>
      <Field label="Colour">
        <input type="color" value={p.colorHex} onChange={(e) => patchProps({ colorHex: e.target.value })} style={{ width: 60, height: 34, padding: 2, minHeight: 0 }} />
      </Field>
    </>
  );
}

function DevicePanel({ device, patchProps }: { device: DeviceComponent; patchProps: (p: any) => void }) {
  const p = device.props;
  return (
    <>
      <Select label="Device type" value={p.kind} onChange={(v) => patchProps({ kind: v })}
        options={[
          { value: 'receptacle', label: 'Receptacle' }, { value: 'recessed_receptacle', label: 'Recessed TV box' },
          { value: 'quad_receptacle', label: 'Quad receptacle' }, { value: 'switch', label: 'Switch' },
          { value: 'dimmer', label: 'Dimmer / lighting control' }, { value: 'low_volt_plate', label: 'Low-voltage plate' },
          { value: 'hdmi', label: 'HDMI' }, { value: 'ethernet', label: 'Ethernet' },
          { value: 'junction_box', label: 'Junction box' }, { value: 'led_driver', label: 'LED driver' },
          { value: 'led_controller', label: 'LED controller' }, { value: 'equipment_bay', label: 'Equipment location' },
        ]} />
      <TextField label="Circuit" value={p.circuit} onChange={(v) => patchProps({ circuit: v })} placeholder="A" />
      <TextField label="Box type" value={p.boxType} onChange={(v) => patchProps({ boxType: v })} placeholder="1-gang old work, 18 cu in" />
      <Check label="Line voltage (licensed electrician)" checked={p.lineVoltage} onChange={(v) => patchProps({ lineVoltage: v })} />
      <Field label="Notes">
        <textarea value={p.notes} onChange={(e) => patchProps({ notes: e.target.value })} placeholder="Height, orientation, what it serves…" />
      </Field>
    </>
  );
}

/* ------------------------------------------------------------ add objects */

export function AddMenu({ design, onClose }: { design: Design; onClose: () => void }) {
  const [nichesPerSide, setNichesPerSide] = useState(3);
  const w = design.wall;
  const existing = design.components.filter((c): c is NicheComponent => c.type === 'niche');

  const addBank = () => {
    const tv = design.components.find((c) => c.type === 'tv');
    const centerBayW = Math.max((tv?.w ?? 60) + 24, w.widthIn * 0.5);
    const sideW = (w.widthIn - centerBayW) / 2;
    const edgeMargin = Math.max(4, Math.min(8, sideW * 0.18));
    const nicheW = snap(Math.max(10, sideW - edgeMargin));
    const vGap = 5;
    const nicheH = snap(Math.max(9, (w.heightIn - 20 - vGap * (nichesPerSide - 1)) / nichesPerSide));
    const rects = layoutNicheBanks(w, {
      perSide: nichesPerSide, columns: 1, nicheW, nicheH, depth: maxNicheDepth(w),
      hGap: 4, vGap, edgeMargin, centerY: w.heightIn / 2 + 4,
    });
    const startIndex = existing.length;
    store.addComponents(rects.map((r, i) => makeNiche(r, startIndex + i, r.x < w.widthIn / 2 ? 'left' : 'right', maxNicheDepth(w))), 'Add niche bank');
    toast(`${rects.length} niches added`);
    onClose();
  };

  const addOne = (comp: DesignComponent, label: string) => { store.addComponents([comp], label); toast(`${label} added`); onClose(); };

  return (
    <div>
      <div className="eyebrow">Niche bank</div>
      <Field label="Niches per side">
        <Segmented value={nichesPerSide} onChange={setNichesPerSide}
          options={[1, 2, 3, 4].map((n) => ({ value: n, label: String(n) }))} />
      </Field>
      <button className="btn gold block" onClick={addBank}><Icon name="plus" size={15} />Add {nichesPerSide * 2} niches, {nichesPerSide} per side</button>

      <div className="eyebrow" style={{ marginTop: 16 }}>Built-in casework</div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button className="btn" onClick={() => {
          const colW = Math.max(14, Math.min(30, w.widthIn * 0.17));
          addOne(makeShelfColumn({ x: 2, y: 22, w: colW, h: w.heightIn - 26 }, { label: 'Left shelf column' }), 'Shelf column');
        }}><Icon name="layers" size={15} />Shelf column</button>
        <button className="btn" onClick={() => {
          const colW = Math.max(14, Math.min(30, w.widthIn * 0.17));
          const rects = [
            { x: 2, y: 22, w: colW, h: w.heightIn - 26 },
            { x: w.widthIn - colW - 2, y: 22, w: colW, h: w.heightIn - 26 },
          ];
          store.addComponents(rects.map((r, i) => makeShelfColumn(r, { label: `${i === 0 ? 'Left' : 'Right'} shelf column` })), 'Shelf columns');
          toast('Two shelf columns added');
          onClose();
        }}><Icon name="layers" size={15} />Pair of columns</button>
        <button className="btn" onClick={() => addOne(makeCabinet({ x: 0, y: 0, w: w.widthIn, h: 22 }, { label: 'Base cabinet run' }), 'Cabinet run')}>
          <Icon name="box" size={15} />Base cabinets
        </button>
        <button className="btn" onClick={() => addOne(makeCabinet({ x: snap(w.widthIn * 0.15), y: 16, w: snap(w.widthIn * 0.7), h: 14 }, { label: 'Floating console', floating: true, drawersPerBay: 1, depthIn: 14 }), 'Console')}>
          <Icon name="box" size={15} />Floating console
        </button>
        <button className="btn" onClick={() => addOne(makePanel({ x: snap(w.widthIn * 0.18), y: 14, w: snap(w.widthIn * 0.64), h: w.heightIn - 14 }, { label: 'Slat panel' }), 'Slat panel')}>
          <Icon name="grid" size={15} />Slat panel
        </button>
        <button className="btn" onClick={() => addOne(makeHearth({ x: snap(w.widthIn * 0.15), y: 0, w: snap(w.widthIn * 0.7), h: 14 }, { label: 'Hearth ledge' }), 'Hearth')}>
          <Icon name="ruler" size={15} />Hearth ledge
        </button>
      </div>

      <div className="eyebrow" style={{ marginTop: 16 }}>Single objects</div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button className="btn" onClick={() => addOne(makeNiche({ x: snap(w.widthIn / 2 - 9), y: snap(w.heightIn / 2 - 9), w: 18, h: 18 }, existing.length, 'custom', maxNicheDepth(w)), 'Niche')}>
          <Icon name="box" size={15} />Niche
        </button>
        <button className="btn" onClick={() => addOne({
          id: `sh_${Math.random().toString(36).slice(2, 8)}`, type: 'shelf', label: 'Floating shelf',
          x: snap(w.widthIn / 2 - 24), y: 40, w: 48, h: 2, depthIn: 0, locked: false, z: 15,
          props: { material: 'Wood', floating: true, capacityLb: 40 },
        } as DesignComponent, 'Shelf')}><Icon name="layout" size={15} />Shelf</button>
        <button className="btn" onClick={() => addOne(makeDevice('outlet', 'receptacle', 'Receptacle', w.widthIn / 2, 16), 'Receptacle')}>
          <Icon name="bolt" size={15} />Receptacle
        </button>
        <button className="btn" onClick={() => addOne(makeDevice('lowvolt', 'low_volt_plate', 'Low-voltage plate', w.widthIn / 2 + 8, 16, { lineVoltage: false }), 'LV plate')}>
          <Icon name="link" size={15} />LV plate
        </button>
        <button className="btn" onClick={() => addOne(makeDevice('switch', 'dimmer', 'Dimmer', 8, 46), 'Dimmer')}><Icon name="bulb" size={15} />Dimmer</button>
        <button className="btn" onClick={() => addOne(makeDevice('junction', 'junction_box', 'Junction box', w.widthIn - 20, 10), 'Junction')}><Icon name="box" size={15} />Junction</button>
        <button className="btn" onClick={() => addOne({
          id: `cu_${Math.random().toString(36).slice(2, 8)}`, type: 'custom', label: 'Custom object',
          x: snap(w.widthIn / 2 - 12), y: 30, w: 24, h: 24, depthIn: 0, locked: false, z: 12,
          props: { notes: '', colorHex: '#8A8A96', recessed: false },
        } as DesignComponent, 'Custom')}><Icon name="plus" size={15} />Custom</button>
      </div>
    </div>
  );
}
