/** Construction drawings + the checks that gate them. */
import { useMemo, useState } from 'react';
import type { Design } from '@shared/types';
import { computeTakeOff } from '@shared/calc/materials';
import { validateDesign, STANDARD_DISCLAIMERS } from '@shared/calc/validate';
import { inchesToFeet, inchesToFraction } from '@shared/units';
import { useStore } from '../lib/store';
import { ElevationDrawing } from '../render/Elevation';
import { FramingDrawing } from '../render/Framing';
import { ElectricalDrawing } from '../render/Electrical';
import { Panel, Pill, Segmented } from '../components/ui';
import { Icon } from '../components/icons';

type Tab = 'elevation' | 'framing' | 'electrical' | 'details' | 'checks';

export function DrawingsScreen() {
  const { project } = useStore();
  const [tab, setTab] = useState<Tab>('elevation');
  if (!project) return null;

  const design = project.design;
  const take = useMemo(() => computeTakeOff(design, project.estimateSettings), [design, project.estimateSettings]);
  const issues = useMemo(() => validateDesign(design), [design]);
  const blockerCount = issues.filter((i) => i.severity === 'blocker').length;

  return (
    <div className="content">
      <div className="row wrap" style={{ marginBottom: 14 }}>
        <Segmented value={tab} onChange={(v) => setTab(v as Tab)} gold
          options={[
            { value: 'elevation', label: 'Elevation' },
            { value: 'framing', label: 'Framing' },
            { value: 'electrical', label: 'Electrical' },
            { value: 'details', label: 'Dimensions' },
            { value: 'checks', label: `Checks${blockerCount ? ` (${blockerCount})` : ''}` },
          ]} />
        <span className="spacer" />
        {blockerCount > 0 && <Pill tone="rust"><Icon name="warn" size={11} />Not for construction</Pill>}
      </div>

      {tab === 'elevation' && (
        <Panel title="Dimensioned front elevation" eyebrow="Sheet A-1">
          <div className="stage blueprint" style={{ padding: 6 }}>
            <ElevationDrawing design={design} theme="screen" style={{ width: '100%' }} />
          </div>
        </Panel>
      )}

      {tab === 'framing' && (
        <div className="grid">
          <Panel title="Framing plan" eyebrow="Sheet F-1">
            <div className="stage blueprint" style={{ padding: 6 }}>
              <FramingDrawing design={design} theme="screen" style={{ width: '100%' }} />
            </div>
          </Panel>
          <div className="grid three">
            <Stat2 label="Members" value={take.framing.members.length} note={`${take.framing.stats.studCount} studs · ${take.framing.stats.crippleCount} cripples`} />
            <Stat2 label="Lineal feet" value={`${take.framing.stats.totalLf} lf`} note={`${take.framing.stats.boardFeet} board feet`} />
            <Stat2 label="Stud length" value={inchesToFraction(take.framing.stats.studLength)} note={`Top of studs ${inchesToFraction(take.framing.stats.topOfStuds)}`} />
            <Stat2 label="Openings" value={take.framing.openings.length} note={`${take.framing.openings.filter((o) => !o.verified).length} unverified`} />
            <Stat2 label="Framed depth" value={`${take.framing.stats.framedDepth}"`} note={`+ ${design.wall.drywallThickness}" drywall`} />
            <Stat2 label="Boards to buy" value={take.cutList.totalBoards} note={`${take.cutList.overallYieldPct}% yield`} />
          </div>
        </div>
      )}

      {tab === 'electrical' && (
        <Panel title="Electrical / low-voltage plan" eyebrow="Sheet E-1">
          <div className="stage blueprint" style={{ padding: 6 }}>
            <ElectricalDrawing design={design} theme="screen" style={{ width: '100%' }} />
          </div>
          <div className="note warn" style={{ marginTop: 12, fontSize: 12.5 }}>
            Device locations are design intent. Circuit sizing, load calculation, box fill, AFCI/GFCI and permitting are the
            licensed electrician's responsibility.
          </div>
        </Panel>
      )}

      {tab === 'details' && <DetailsTab design={design} take={take} />}

      {tab === 'checks' && (
        <div className="grid">
          {blockerCount > 0 && (
            <div className="note block">
              <strong>{blockerCount} item{blockerCount === 1 ? '' : 's'} must be resolved</strong> before this prints as a final
              construction package. Until then every sheet carries a NOT FOR CONSTRUCTION stamp.
            </div>
          )}
          {issues.map((i) => (
            <div key={i.id} className={`note ${i.severity === 'blocker' ? 'block' : i.severity === 'warning' ? 'warn' : ''}`}>
              <div className="row" style={{ marginBottom: 4 }}>
                <Icon name={i.severity === 'info' ? 'info' : 'warn'} size={14} />
                <strong>{i.title}</strong>
                <span className="spacer" />
                <Pill tone={i.severity === 'blocker' ? 'rust' : i.severity === 'warning' ? 'gold' : undefined}>{i.severity}</Pill>
              </div>
              <div style={{ fontSize: 12.5, opacity: .9 }}>{i.detail}</div>
            </div>
          ))}
          <Panel title="Standard notes" eyebrow="Printed on every package">
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6 }}>
              {STANDARD_DISCLAIMERS.map((d, i) => <li key={i} style={{ marginBottom: 5 }}>{d}</li>)}
            </ul>
          </Panel>
        </div>
      )}
    </div>
  );
}

function Stat2({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value sm mono">{value}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  );
}

function DetailsTab({ design, take }: { design: Design; take: ReturnType<typeof computeTakeOff> }) {
  const w = design.wall;
  const rows = design.components
    .filter((c) => !['outlet', 'lowvolt', 'switch', 'junction', 'equipment'].includes(c.type))
    .sort((a, b) => a.type.localeCompare(b.type) || a.x - b.x);

  return (
    <div className="grid">
      <Panel title="Component schedule" eyebrow="Every dimensioned object" tight>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Item</th><th>Type</th><th className="num">X</th><th className="num">Y (AFF)</th>
                <th className="num">Width</th><th className="num">Height</th><th className="num">Depth</th><th className="num">Centre AFF</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>{c.label}</td>
                  <td className="faint">{c.type}</td>
                  <td className="num">{inchesToFraction(c.x)}</td>
                  <td className="num">{inchesToFraction(c.y)}</td>
                  <td className="num">{inchesToFraction(c.w)}</td>
                  <td className="num">{inchesToFraction(c.h)}</td>
                  <td className="num">{c.depthIn ? inchesToFraction(c.depthIn) : '—'}</td>
                  <td className="num">{inchesToFeet(c.y + c.h / 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Rough openings" eyebrow="Framed size = finished size + drywall return" tight>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Opening</th><th className="num">R.O. width</th><th className="num">R.O. height</th><th className="num">Sill AFF</th><th className="num">Head AFF</th><th>Source</th></tr></thead>
            <tbody>
              {take.framing.openings.map((o) => (
                <tr key={o.id}>
                  <td>{o.label}</td>
                  <td className="num">{inchesToFraction(o.w)}</td>
                  <td className="num">{inchesToFraction(o.h)}</td>
                  <td className="num">{inchesToFraction(o.y)}</td>
                  <td className="num">{inchesToFraction(o.y + o.h)}</td>
                  <td>{o.verified ? <Pill tone="ok">Verified</Pill> : <Pill tone="rust">Verify</Pill>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Wall build-up" eyebrow="Section through the feature wall">
        <div className="grid three">
          <Stat2 label="Existing wall" value="Face at 0″" note="Datum for the build-out" />
          <Stat2 label="Framing" value={`${take.framing.stats.framedDepth}"`} note={`${w.lumber} @ ${w.studSpacing}" O.C.`} />
          <Stat2 label="Drywall" value={`${w.drywallThickness === 0.5 ? '1/2' : '5/8'}"`} note={w.drywallThickness === 0.5 ? 'Regular' : 'Type X'} />
          <Stat2 label="Finished depth" value={inchesToFraction(w.featureDepthIn)} note="From the existing wall face" />
          <Stat2 label="Max niche depth" value={inchesToFraction(w.featureDepthIn - w.drywallThickness)} note="Before hitting the existing wall" />
          <Stat2 label="Side returns" value={w.sideReturns} note={`${take.drywall.sideReturnSqFt} sq ft`} />
        </div>
      </Panel>
    </div>
  );
}
