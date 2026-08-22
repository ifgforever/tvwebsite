/** The designer: canvas, toolbar, inspector. */
import { useState } from 'react';
import type { Design } from '@shared/types';
import { validateDesign } from '@shared/calc/validate';
import { alignComponents } from '@shared/geometry';
import { inchesToFeet } from '@shared/units';
import { store, useStore } from '../lib/store';
import { DesignCanvas, DEFAULT_CANVAS_SETTINGS, duplicateSelection, type CanvasSettings } from '../designer/DesignCanvas';
import { AddMenu, Inspector } from '../designer/Inspector';
import { WallVector } from '../render/WallVector';
import { Panel, Pill, Sheet } from '../components/ui';
import { Icon } from '../components/icons';

export function DesignScreen() {
  const { project, selection, canUndo, canRedo } = useStore();
  const [settings, setSettings] = useState<CanvasSettings>(DEFAULT_CANVAS_SETTINGS);
  const [adding, setAdding] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [preview, setPreview] = useState(false);

  if (!project) return null;
  const design = project.design;
  const issues = validateDesign(design);
  const blockerCount = issues.filter((i) => i.severity === 'blocker').length;
  const picked = design.components.filter((c) => selection.includes(c.id));

  const alignAll = (mode: 'hcenter' | 'vcenter') => {
    const ids = selection.length ? selection : [];
    if (!ids.length) return;
    const next = alignComponents(picked, mode, design.wall);
    const map = new Map(next.map((c) => [c.id, c]));
    store.updateComponents((c) => map.get(c.id) ?? c, ids, 'Centre');
  };

  return (
    <div className="content">
      <div className="toolbar no-print">
        <button className="btn sm gold" onClick={() => setAdding(true)}><Icon name="plus" size={15} />Add</button>
        <div className="divider" />
        <button className="btn sm icon" disabled={!canUndo} onClick={() => store.undo()} title="Undo (⌘Z)"><Icon name="undo" size={15} /></button>
        <button className="btn sm icon" disabled={!canRedo} onClick={() => store.redo()} title="Redo (⇧⌘Z)"><Icon name="redo" size={15} /></button>
        <div className="divider" />
        <button className="btn sm icon" disabled={!selection.length} onClick={() => alignAll('hcenter')} title="Centre horizontally"><Icon name="alignC" size={15} /></button>
        <button className="btn sm icon" disabled={!selection.length} onClick={() => alignAll('vcenter')} title="Centre vertically"><Icon name="alignC" size={15} style={{ transform: 'rotate(90deg)' }} /></button>
        <button className="btn sm icon" disabled={!selection.length} onClick={() => duplicateSelection(design, selection)} title="Duplicate (⌘D)"><Icon name="copy" size={15} /></button>
        <button className="btn sm icon" disabled={!selection.length} onClick={() => store.updateComponents((c) => ({ ...c, locked: !c.locked }), selection, 'Lock')} title="Lock"><Icon name="lock" size={15} /></button>
        <button className="btn sm icon danger" disabled={!selection.length} onClick={() => store.removeComponents(selection)} title="Delete"><Icon name="trash" size={15} /></button>
        <div className="divider" />
        <button className={`btn sm icon${settings.snapToGrid ? ' gold' : ''}`} onClick={() => setSettings({ ...settings, snapToGrid: !settings.snapToGrid })} title="Snap to grid"><Icon name="grid" size={15} /></button>
        <button className={`btn sm icon${settings.snapToCenter ? ' gold' : ''}`} onClick={() => setSettings({ ...settings, snapToCenter: !settings.snapToCenter })} title="Snap to centre"><Icon name="center" size={15} /></button>
        <button className={`btn sm icon${settings.showDevices ? ' gold' : ''}`} onClick={() => setSettings({ ...settings, showDevices: !settings.showDevices })} title="Show electrical"><Icon name="bolt" size={15} /></button>
        <div className="spacer" />
        <button className={`btn sm${preview ? ' gold' : ''}`} onClick={() => setPreview(!preview)}><Icon name="eye" size={15} />{preview ? 'Editing' : 'Preview'}</button>
        <button className="btn sm only-mobile" onClick={() => setInspectorOpen(true)}><Icon name="ruler" size={15} />{picked.length ? picked[0].label : 'Wall'}</button>
      </div>

      <div className="split">
        <div className="grid" style={{ gap: 10 }}>
          {preview ? (
            <div className="stage"><WallVector design={design} style={{ width: '100%', display: 'block' }} /></div>
          ) : (
            <DesignCanvas design={design} selection={selection} settings={settings} />
          )}

          <div className="row wrap" style={{ gap: 6 }}>
            <Pill>{inchesToFeet(design.wall.widthIn)} × {inchesToFeet(design.wall.heightIn)}</Pill>
            <Pill>{design.wall.featureDepthIn}" deep</Pill>
            <Pill>{design.components.filter((c) => c.type === 'niche').length} niches</Pill>
            <Pill>{design.wall.lumber} @ {design.wall.studSpacing}" O.C.</Pill>
            {blockerCount > 0 && <Pill tone="rust">{blockerCount} to resolve</Pill>}
            <span className="spacer" />
            <span className="faint hide-mobile" style={{ fontSize: 11.5 }}>
              Drag to move · handles to resize · arrows nudge 1" · shift+arrows 6" · ⌘Z undo
            </span>
          </div>

          <ObjectList design={design} selection={selection} />
        </div>

        <div className="hide-mobile">
          <Panel title={picked.length === 1 ? picked[0].label : picked.length ? `${picked.length} selected` : 'Wall'} eyebrow="Inspector">
            <Inspector design={design} selection={selection} />
          </Panel>
        </div>
      </div>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add to the wall">
        <AddMenu design={design} onClose={() => setAdding(false)} />
      </Sheet>

      <Sheet open={inspectorOpen} onClose={() => setInspectorOpen(false)} title={picked.length === 1 ? picked[0].label : picked.length ? `${picked.length} selected` : 'Wall'}>
        <Inspector design={design} selection={selection} />
      </Sheet>
    </div>
  );
}

function ObjectList({ design, selection }: { design: Design; selection: string[] }) {
  const groups: { label: string; types: string[] }[] = [
    { label: 'Display', types: ['tv', 'soundbar', 'fireplace'] },
    { label: 'Niches & shelves', types: ['niche', 'shelf', 'custom'] },
    { label: 'Electrical & low voltage', types: ['outlet', 'lowvolt', 'switch', 'junction', 'equipment'] },
  ];
  return (
    <Panel title="Objects" eyebrow={`${design.components.length} in the design`} tight>
      <div className="table-wrap" style={{ maxHeight: 260, overflowY: 'auto' }}>
        <table className="data">
          <tbody>
            {groups.map((g) => {
              const items = design.components.filter((c) => g.types.includes(c.type));
              if (!items.length) return null;
              return (
                <>
                  <tr className="group" key={g.label}><td colSpan={4}>{g.label}</td></tr>
                  {items.map((c) => (
                    <tr key={c.id} onClick={(e) => store.toggleSelect(c.id, e.shiftKey || e.metaKey)}
                      style={{ cursor: 'pointer', background: selection.includes(c.id) ? 'rgba(200,169,74,.1)' : undefined }}>
                      <td style={{ width: 24 }}>{c.locked ? <Icon name="lock" size={12} /> : null}</td>
                      <td>{c.label}</td>
                      <td className="num faint">{Math.round(c.w * 10) / 10}″ × {Math.round(c.h * 10) / 10}″</td>
                      <td className="num faint">{inchesToFeet(c.y)} AFF</td>
                    </tr>
                  ))}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
