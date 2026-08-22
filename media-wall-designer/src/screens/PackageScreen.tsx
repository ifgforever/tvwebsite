/**
 * The printed output.
 *
 *   Customer proposal  — portrait letter, warm, no internal cost or margin.
 *   Construction set   — landscape plan sheets with a title block, at Letter,
 *                        Tabloid 11×17 or ARCH D 24×36.
 *
 * Both are printed with the browser's own print dialog ("Save as PDF"), so the
 * drawings stay vector and scale cleanly at any sheet size.
 */
import { useEffect, useMemo, useState } from 'react';
import { CATEGORY_LABEL, MARKET_BENCHMARK } from '@shared/catalog';
import { COMPANY, companyContactLine } from '@shared/company';
import { computeTakeOff } from '@shared/calc/materials';
import { computeEstimate } from '@shared/calc/estimate';
import { buildTiers } from '@shared/calc/packages';
import { buildSourcing } from '@shared/calc/sourcing';
import { validateDesign, STANDARD_DISCLAIMERS, blockers } from '@shared/calc/validate';
import { AI_DISCLAIMER } from '@shared/ai/prompt';
import { inchesToFeet, inchesToFraction, money, money0 } from '@shared/units';
import { useStore } from '../lib/store';
import { WallVector } from '../render/WallVector';
import { ElevationDrawing } from '../render/Elevation';
import { FramingDrawing } from '../render/Framing';
import { ElectricalDrawing } from '../render/Electrical';
import { Pill, Segmented } from '../components/ui';
import { Icon } from '../components/icons';
import { addDays, fullDate } from '../lib/format';
import type { BomCategory, Project } from '@shared/types';

type Mode = 'customer' | 'installer';
type Paper = 'letter' | 'tabloid' | 'archd';

const PAPER_RATIO: Record<Paper, string> = { letter: '11 / 8.5', tabloid: '17 / 11', archd: '36 / 24' };
const PAPER_LABEL: Record<Paper, string> = { letter: 'Letter 8.5×11', tabloid: 'Tabloid 11×17', archd: 'ARCH D 24×36' };
const PAGE_SIZE: Record<Paper, string> = { letter: 'letter landscape', tabloid: '17in 11in', archd: '36in 24in' };

/** `@page` cannot be scoped by a class, so the chosen sheet size is injected. */
function usePageSize(css: string) {
  useEffect(() => {
    const el = document.createElement('style');
    el.setAttribute('data-page-size', '');
    el.textContent = `@page { size: ${css}; margin: 0; }`;
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, [css]);
}

export function PackageScreen() {
  const { project } = useStore();
  const [mode, setMode] = useState<Mode>('customer');
  const [paper, setPaper] = useState<Paper>('tabloid');

  usePageSize(mode === 'customer' ? 'letter portrait' : PAGE_SIZE[paper]);

  if (!project) return null;
  const take = useMemo(() => computeTakeOff(project.design, project.estimateSettings), [project.design, project.estimateSettings]);
  const est = useMemo(() => computeEstimate(project.design, project.estimateSettings, take), [project.design, project.estimateSettings, take]);
  const tiers = useMemo(() => buildTiers(project.design, project.estimateSettings), [project.design, project.estimateSettings]);
  const sourcing = useMemo(() => buildSourcing(take.bom, {}, project.estimateSettings.excludedSkus), [take.bom, project.estimateSettings.excludedSkus]);
  const issues = validateDesign(project.design);
  const stamp = blockers(issues).length > 0;

  const ctx = { project, take, est, tiers, sourcing, issues, stamp };

  return (
    <div className="content">
      <div className="toolbar no-print">
        <Segmented value={mode} onChange={(v) => setMode(v as Mode)} gold
          options={[{ value: 'customer', label: 'Customer proposal' }, { value: 'installer', label: 'Construction set' }]} />
        {mode === 'installer' && (
          <>
            <div className="divider" />
            <span className="eyebrow">Sheet size</span>
            <Segmented value={paper} onChange={(v) => setPaper(v as Paper)}
              options={(['letter', 'tabloid', 'archd'] as Paper[]).map((p) => ({ value: p, label: PAPER_LABEL[p] }))} />
          </>
        )}
        <span className="spacer" />
        {stamp && <Pill tone="rust"><Icon name="warn" size={11} />Not for construction</Pill>}
        <button className="btn gold" onClick={() => window.print()}><Icon name="print" size={15} />Print / Save as PDF</button>
      </div>

      {stamp && (
        <div className="note block no-print" style={{ marginBottom: 14 }}>
          <strong>{blockers(issues).length} unresolved check{blockers(issues).length === 1 ? '' : 's'}.</strong> Every sheet prints with a
          NOT FOR CONSTRUCTION stamp until the fireplace specifications and the other blockers are entered and verified.
        </div>
      )}
      <div className="note no-print" style={{ marginBottom: 14, fontSize: 12.5 }}>
        Print with <strong>Background graphics</strong> switched on and margins set to <strong>None</strong>.
        {mode === 'installer' && ` Set the paper to ${PAPER_LABEL[paper]}, landscape.`}
      </div>

      <div className="print-root">
        {mode === 'customer' ? <CustomerProposal {...ctx} /> : <ConstructionSet {...ctx} paper={paper} />}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- shared bits */

type Ctx = {
  project: Project;
  take: ReturnType<typeof computeTakeOff>;
  est: ReturnType<typeof computeEstimate>;
  tiers: ReturnType<typeof buildTiers>;
  sourcing: ReturnType<typeof buildSourcing>;
  issues: ReturnType<typeof validateDesign>;
  stamp: boolean;
};

function DocPage({ title, sub, page, of, children, project }: {
  title: string; sub?: string; page: number; of: number; children: React.ReactNode; project: Project;
}) {
  return (
    <section className="sheet-page doc">
      <header className="doc-head">
        <div className="doc-mark">MW</div>
        <div>
          <div className="doc-co">{COMPANY.nameDisplay}</div>
          <div className="doc-co-sub">{companyContactLine()}</div>
          <div className="doc-co-sub">{COMPANY.email}</div>
        </div>
        <div className="doc-title">
          <div className="t">{title}</div>
          <div className="s">{sub || project.name}</div>
        </div>
      </header>
      {children}
      <footer className="doc-foot">
        <span>{project.customer.name || project.name}</span>
        <span>{COMPANY.domain} · {COMPANY.phone}</span>
        <span>{fullDate(new Date().toISOString())}</span>
        <span className="pg">PAGE {page} / {of}</span>
      </footer>
    </section>
  );
}

function Stamp({ on }: { on: boolean }) {
  if (!on) return null;
  return (
    <div style={{
      position: 'absolute', top: '42%', left: '50%', transform: 'translate(-50%,-50%) rotate(-18deg)',
      border: '4px solid rgba(168,71,31,.5)', color: 'rgba(168,71,31,.5)', padding: '8px 24px',
      fontFamily: "'Bebas Neue', sans-serif", fontSize: 42, letterSpacing: '.08em', pointerEvents: 'none', zIndex: 9,
    }}>NOT FOR CONSTRUCTION</div>
  );
}

/* ---------------------------------------------------------- customer pages */

function CustomerProposal({ project, take, est, tiers, issues, stamp }: Ctx) {
  const d = project.design;
  const before = project.photos.find((p) => p.id === d.basePhotoId) || project.photos.find((p) => p.kind === 'before');
  const aiRender = project.renderings.find((r) => r.status === 'ready' && r.url);
  const s = project.estimateSettings;
  const of = 5;
  const c = project.customer;

  return (
    <>
      <DocPage title="PROPOSAL" page={1} of={of} project={project}>
        <div style={{ position: 'relative' }}>
          <div style={{ borderRadius: 4, overflow: 'hidden', border: '1px solid #DED7C8', marginBottom: 14 }}>
            {aiRender ? <img src={aiRender.url!} alt="" style={{ width: '100%', display: 'block' }} /> : <WallVector design={d} style={{ width: '100%', display: 'block' }} />}
          </div>
          {aiRender && <p style={{ fontSize: 8.5, color: '#8A8278', marginTop: -8 }}>{AI_DISCLAIMER}</p>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div>
              <h2>Prepared for</h2>
              <dl className="kv">
                <dt>Name</dt><dd>{c.name || '—'}</dd>
                <dt>Address</dt><dd>{[c.address, [c.city, c.state, c.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '—'}</dd>
                <dt>Phone</dt><dd>{c.phone || '—'}</dd>
                <dt>Email</dt><dd>{c.email || '—'}</dd>
              </dl>
            </div>
            <div>
              <h2>The wall</h2>
              <dl className="kv">
                <dt>Size</dt><dd>{inchesToFeet(d.wall.widthIn)} wide × {inchesToFeet(d.wall.heightIn)} tall</dd>
                <dt>Depth</dt><dd>{inchesToFraction(d.wall.featureDepthIn)} built out from the existing wall</dd>
                <dt>Finish</dt><dd>{d.wall.finish.replace(/_/g, ' ')} in {d.wall.colorHex}</dd>
                <dt>Niches</dt><dd>{d.components.filter((x) => x.type === 'niche').length} lit display niches</dd>
                <dt>Valid</dt><dd>{s.validDays} days — through {addDays(new Date().toISOString(), s.validDays)}</dd>
              </dl>
            </div>
          </div>

          <h2>What is included</h2>
          <ul style={{ fontSize: 11, lineHeight: 1.55, margin: '0 0 10px', paddingLeft: 16 }}>
            <li>Design, measurement and a dimensioned construction drawing set</li>
            <li>Framing the feature wall — {d.wall.lumber} at {d.wall.studSpacing}" on centre, {take.framing.members.length} members, blocking for the television and soundbar</li>
            {d.components.some((x) => x.type === 'fireplace') && <li>Framing the fireplace opening to the manufacturer's rough opening and clearances</li>}
            <li>Rough-in for power and low voltage, all cable concealed in the wall</li>
            <li>Drywall — {take.drywall.sheets} sheets, taped, three coats, sanded and primed</li>
            <li>{take.drywall.cornerBeadLf} lineal feet of finished outside corner</li>
            {d.lighting.length > 0 && <li>Accent lighting: {take.electrical.puckCount} recessed puck lights and {take.electrical.stripFt} feet of LED, on its own control</li>}
            <li>Television and soundbar mounted, connected and tested</li>
            <li>Floor and furniture protection, clean-up and debris haul-away</li>
          </ul>

          <h2>Investment</h2>
          <div className="total-row"><span>Project total</span><span className="num">{money(est.preTax)}</span></div>
          {est.discountAmount > 0 && <div className="total-row"><span>Discount</span><span className="num">− {money(est.discountAmount)}</span></div>}
          <div className="total-row"><span>Tax</span><span className="num">{money(est.tax)}</span></div>
          <div className="total-row big"><span>TOTAL</span><span className="num">{money0(est.total)}</span></div>
          <p style={{ marginTop: 8, fontSize: 10.5 }}>
            {s.depositPct}% deposit of {money(est.deposit)} to schedule; balance of {money(est.balance)} on completion.
          </p>
          {stamp && (
            <p style={{ marginTop: 6, fontSize: 9.5, color: '#8A8278' }}>
              Final dimensions are pending the items listed on the last page. Nothing is ordered or cut until they are confirmed.
            </p>
          )}
        </div>
      </DocPage>

      <DocPage title="BEFORE / AFTER" page={2} of={of} project={project}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <figure style={{ margin: 0 }}>
            <div style={{ border: '1px solid #DED7C8', borderRadius: 4, overflow: 'hidden', aspectRatio: '4/3', background: '#EDE7DA' }}>
              {before ? <img src={before.url} alt="Before" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#8A8278', fontSize: 11 }}>No photo on file</div>}
            </div>
            <figcaption style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 17, letterSpacing: '.06em', marginTop: 5 }}>BEFORE</figcaption>
          </figure>
          <figure style={{ margin: 0 }}>
            <div style={{ border: '1px solid #DED7C8', borderRadius: 4, overflow: 'hidden', aspectRatio: '4/3', background: '#0B0B0E' }}>
              <WallVector design={d} style={{ width: '100%', height: '100%' }} />
            </div>
            <figcaption style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 17, letterSpacing: '.06em', marginTop: 5 }}>AFTER</figcaption>
          </figure>
        </div>
        <h2>The design</h2>
        <p style={{ fontSize: 11 }}>{d.designNotes || `A ${inchesToFeet(d.wall.widthIn)} feature wall built ${inchesToFraction(d.wall.featureDepthIn)} out from the existing wall, with the television centred over the fireplace and lit display niches flanking it. Every component below is drawn to its real size.`}</p>
        <table className="doc-table">
          <thead><tr><th>Component</th><th className="num">Width</th><th className="num">Height</th><th className="num">Depth</th><th className="num">Height above floor</th></tr></thead>
          <tbody>
            {d.components.filter((x) => !['outlet', 'lowvolt', 'switch', 'junction', 'equipment'].includes(x.type)).map((x) => (
              <tr key={x.id}>
                <td>{x.label}</td>
                <td className="num">{inchesToFraction(x.w)}</td>
                <td className="num">{inchesToFraction(x.h)}</td>
                <td className="num">{x.depthIn ? inchesToFraction(x.depthIn) : '—'}</td>
                <td className="num">{inchesToFeet(x.y)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DocPage>

      <DocPage title="DIMENSIONS" sub="Front elevation" page={3} of={of} project={project}>
        <div style={{ position: 'relative', border: '1px solid #DED7C8', borderRadius: 4, padding: 8 }}>
          <Stamp on={stamp} />
          <ElevationDrawing design={d} theme="print" style={{ width: '100%' }} />
        </div>
        <p style={{ fontSize: 9.5, color: '#6B6357', marginTop: 8 }}>
          Drawn from the dimensioned design model. Field-verify all dimensions before fabrication. Not an engineered drawing.
        </p>
      </DocPage>

      <DocPage title="OPTIONS" sub="Good · Better · Best" page={4} of={of} project={project}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {tiers.map((t) => (
            <div key={t.tier.id} style={{ border: project.tierOffered === t.tier.id ? '2px solid #C8A94A' : '1px solid #DED7C8', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ background: project.tierOffered === t.tier.id ? '#C8A94A' : '#14110B', color: project.tierOffered === t.tier.id ? '#14110B' : '#F5F0E8', padding: '5px 8px' }}>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 17, letterSpacing: '.06em' }}>{t.tier.name}</div>
                <div style={{ fontSize: 8 }}>{t.tier.tagline}</div>
              </div>
              <div style={{ background: '#0B0B0E' }}><WallVector design={t.design} style={{ width: '100%', display: 'block' }} /></div>
              <div style={{ padding: 8 }}>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26 }}>{money0(t.estimate.total)}</div>
                <ul style={{ fontSize: 9, lineHeight: 1.45, paddingLeft: 12, margin: '5px 0 0' }}>
                  {t.tier.bullets.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </div>
        <h2>What changes between them</h2>
        <table className="doc-table">
          <thead><tr><th>Item</th>{tiers.map((t) => <th key={t.tier.id} className="num">{t.tier.name}</th>)}</tr></thead>
          <tbody>
            <tr><td>Display niches</td>{tiers.map((t) => <td key={t.tier.id} className="num">{t.design.components.filter((x) => x.type === 'niche').length}</td>)}</tr>
            <tr><td>Electric fireplace</td>{tiers.map((t) => <td key={t.tier.id} className="num">{t.design.components.some((x) => x.type === 'fireplace') ? 'Yes' : '—'}</td>)}</tr>
            <tr><td>Accent lighting</td>{tiers.map((t) => <td key={t.tier.id} className="num">{t.design.lighting.length ? `${t.take.electrical.stripFt}′ + ${t.take.electrical.puckCount} pucks` : '—'}</td>)}</tr>
            <tr><td>Wall finish</td>{tiers.map((t) => <td key={t.tier.id} className="num">{t.design.wall.finish.replace(/_/g, ' ')}</td>)}</tr>
            <tr><td>Labor hours</td>{tiers.map((t) => <td key={t.tier.id} className="num">{t.estimate.laborHours}</td>)}</tr>
            <tr className="sub"><td>Total</td>{tiers.map((t) => <td key={t.tier.id} className="num">{money0(t.estimate.total)}</td>)}</tr>
          </tbody>
        </table>
      </DocPage>

      <DocPage title="TERMS" sub="Please read before signing" page={5} of={of} project={project}>
        <h2>Scope and price</h2>
        <p style={{ fontSize: 10.5 }}>
          This proposal covers the work described on page 1 for the wall dimensions shown on page 3. Changes to the design,
          the fireplace model, the finish material or the electrical scope will be re-priced in writing before the work is done.
          The price is held for {s.validDays} days from {fullDate(new Date().toISOString())}.
        </p>
        {s.proposalNotes && (<><h2>Notes</h2><p style={{ fontSize: 10.5, whiteSpace: 'pre-wrap' }}>{s.proposalNotes}</p></>)}

        <h2>Important</h2>
        <div className="warn-box">
          <h4>Before work begins</h4>
          <ul>
            {STANDARD_DISCLAIMERS.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
        {issues.filter((i) => i.requiresVerification).length > 0 && (
          <div className="warn-box" style={{ marginTop: 8 }}>
            <h4>Open items to confirm</h4>
            <ul>{issues.filter((i) => i.requiresVerification).map((i) => <li key={i.id}>{i.title}</li>)}</ul>
          </div>
        )}

        <h2>Payment</h2>
        <p style={{ fontSize: 10.5 }}>
          {s.depositPct}% deposit ({money(est.deposit)}) to schedule the work. Balance of {money(est.balance)} due on completion.
        </p>

        <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 26 }}>
          {['Customer signature', COMPANY.name].map((l) => (
            <div key={l}>
              <div style={{ borderBottom: '1px solid #14110B', height: 30 }} />
              <div style={{ fontSize: 9, color: '#6B6357', marginTop: 3 }}>{l}</div>
              <div style={{ borderBottom: '1px solid #DED7C8', height: 22, marginTop: 12 }} />
              <div style={{ fontSize: 9, color: '#6B6357', marginTop: 3 }}>Date</div>
            </div>
          ))}
        </div>
      </DocPage>
    </>
  );
}

/* -------------------------------------------------------- construction set */

function PlanSheet({ number, title, project, paper, stamp, notes, children, scale = 'NTS' }: {
  number: string; title: string; project: Project; paper: Paper; stamp: boolean;
  notes?: string[]; children: React.ReactNode; scale?: string;
}) {
  const d = project.design;
  return (
    <section className="sheet-page plan" style={{ ['--plan-ratio' as any]: PAPER_RATIO[paper] }}>
      <div className="plan-frame">
        <div className="plan-field" style={{ position: 'relative' }}>
          <Stamp on={stamp} />
          {children}
        </div>
        <aside className="plan-block">
          <div className="blk">
            <div className="co">{COMPANY.nameDisplay}</div>
            <div className="lbl" style={{ marginTop: 2 }}>{COMPANY.planSubtitle}</div>
            <div className="lbl">{COMPANY.domain} · {COMPANY.phone}</div>
          </div>
          <div className="blk">
            <div className="lbl">PROJECT</div>
            <div className="val">{project.name}</div>
            <div className="lbl" style={{ marginTop: 4 }}>CLIENT</div>
            <div className="val">{project.customer.name || '—'}</div>
            <div className="lbl" style={{ marginTop: 4 }}>LOCATION</div>
            <div className="val">{[project.customer.address, project.customer.city, project.customer.state].filter(Boolean).join(', ') || '—'}</div>
          </div>
          <div className="blk">
            <div className="lbl">SHEET TITLE</div>
            <div className="val" style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 15, letterSpacing: '.05em' }}>{title}</div>
          </div>
          <div className="blk" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            <div><div className="lbl">DATE</div><div className="val">{new Date().toLocaleDateString('en-US')}</div></div>
            <div><div className="lbl">SCALE</div><div className="val">{scale}</div></div>
            <div><div className="lbl">WALL</div><div className="val">{inchesToFeet(d.wall.widthIn)}×{inchesToFeet(d.wall.heightIn)}</div></div>
            <div><div className="lbl">DEPTH</div><div className="val">{inchesToFraction(d.wall.featureDepthIn)}</div></div>
          </div>
          {notes && (
            <div className="blk" style={{ flex: 1 }}>
              <div className="lbl">NOTES</div>
              <ul className="plan-notes" style={{ paddingLeft: 10, margin: '3px 0 0' }}>
                {notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}
          <div className="blk" style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginTop: 'auto' }}>
            <div style={{ flex: 1 }}>
              <div className="lbl">SHEET</div>
              <div className="sheet-no">{number}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="lbl">REV</div>
              <div className="val">A</div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function ConstructionSet({ project, take, est, sourcing, issues, stamp, paper }: Ctx & { paper: Paper }) {
  const d = project.design;
  const grouped = new Map<BomCategory, typeof take.bom>();
  for (const l of take.bom) grouped.set(l.category, [...(grouped.get(l.category) || []), l]);

  return (
    <>
      <PlanSheet number="A-0" title="COVER & GENERAL NOTES" project={project} paper={paper} stamp={stamp}
        notes={['Field-verify all dimensions.', 'Existing conditions govern.', 'Manufacturer requirements override this set.']}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 14, height: '100%' }}>
          <div style={{ border: '1px solid #14110B', overflow: 'hidden' }}>
            <WallVector design={d} style={{ width: '100%', height: '100%', display: 'block' }} />
          </div>
          <div style={{ fontSize: 9, lineHeight: 1.5 }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: '.05em', borderBottom: '2px solid #C8A94A', paddingBottom: 3, marginBottom: 6 }}>
              SHEET INDEX
            </div>
            <table className="doc-table" style={{ marginBottom: 10 }}>
              <tbody>
                {[['A-0', 'Cover & general notes'], ['A-1', 'Dimensioned front elevation'], ['F-1', 'Framing plan'],
                  ['E-1', 'Electrical / low-voltage plan'], ['A-2', 'Schedules & rough openings'],
                  ['M-1', 'Bill of materials'], ['M-2', 'Lumber cut list'], ['M-3', 'Labor & work breakdown']].map(([n, t]) => (
                  <tr key={n}><td style={{ width: 40, fontFamily: "'JetBrains Mono',monospace" }}>{n}</td><td>{t}</td></tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: '.05em', borderBottom: '2px solid #C8A94A', paddingBottom: 3, margin: '10px 0 6px' }}>
              GENERAL NOTES
            </div>
            <ol style={{ paddingLeft: 13, margin: 0 }}>
              {STANDARD_DISCLAIMERS.map((t, i) => <li key={i} style={{ marginBottom: 3 }}>{t}</li>)}
            </ol>
            {issues.filter((i) => i.severity !== 'info').length > 0 && (
              <div className="warn-box" style={{ marginTop: 8 }}>
                <h4>Open items</h4>
                <ul>{issues.filter((i) => i.severity !== 'info').map((i) => <li key={i.id}><strong>{i.severity === 'blocker' ? 'MUST RESOLVE' : 'VERIFY'}:</strong> {i.title}</li>)}</ul>
              </div>
            )}
          </div>
        </div>
      </PlanSheet>

      <PlanSheet number="A-1" title="FRONT ELEVATION" project={project} paper={paper} stamp={stamp}
        notes={['All dimensions in inches unless noted.', 'Heights are above finished floor.', 'Centre line of wall shown.']}>
        <ElevationDrawing design={d} theme="print" style={{ width: '100%', height: '100%' }} />
      </PlanSheet>

      <PlanSheet number="F-1" title="FRAMING PLAN" project={project} paper={paper} stamp={stamp}
        notes={[
          `${d.wall.lumber} @ ${d.wall.studSpacing}" O.C.`,
          `${take.framing.members.length} members, ${take.framing.stats.totalLf} lf`,
          'Rough opening = finished size + drywall return.',
          'Non-structural build-out.',
          'Confirm existing wall is not load-bearing.',
        ]}>
        <FramingDrawing design={d} theme="print" style={{ width: '100%', height: '100%' }} />
      </PlanSheet>

      <PlanSheet number="E-1" title="ELECTRICAL / LOW VOLTAGE" project={project} paper={paper} stamp={stamp}
        notes={[
          'All line-voltage work by a licensed electrician.',
          'Permit and inspection per the AHJ.',
          'Device locations are design intent.',
          'Drivers and splices must remain accessible.',
        ]}>
        <ElectricalDrawing design={d} theme="print" style={{ width: '100%', height: '100%' }} />
      </PlanSheet>

      <PlanSheet number="A-2" title="SCHEDULES" project={project} paper={paper} stamp={stamp} scale="N/A"
        notes={['Every object below is dimensioned in the model.', 'R.O. from the manufacturer where noted.']}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 8.5 }}>
          <div>
            <SheetHeading>COMPONENT SCHEDULE</SheetHeading>
            <table className="doc-table">
              <thead><tr><th>Item</th><th className="num">X</th><th className="num">Y</th><th className="num">W</th><th className="num">H</th><th className="num">D</th></tr></thead>
              <tbody>
                {d.components.map((c) => (
                  <tr key={c.id}>
                    <td>{c.label}</td>
                    <td className="num">{inchesToFraction(c.x)}</td>
                    <td className="num">{inchesToFraction(c.y)}</td>
                    <td className="num">{inchesToFraction(c.w)}</td>
                    <td className="num">{inchesToFraction(c.h)}</td>
                    <td className="num">{c.depthIn ? inchesToFraction(c.depthIn) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <SheetHeading>ROUGH OPENINGS</SheetHeading>
            <table className="doc-table">
              <thead><tr><th>Opening</th><th className="num">R.O. W</th><th className="num">R.O. H</th><th className="num">Sill</th><th>Source</th></tr></thead>
              <tbody>
                {take.framing.openings.map((o) => (
                  <tr key={o.id}>
                    <td>{o.label}</td>
                    <td className="num">{inchesToFraction(o.w)}</td>
                    <td className="num">{inchesToFraction(o.h)}</td>
                    <td className="num">{inchesToFraction(o.y)}</td>
                    <td>{o.verified ? 'Verified' : 'VERIFY'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <SheetHeading>DRYWALL</SheetHeading>
            <table className="doc-table">
              <tbody>
                {take.drywall.breakdown.map((b) => <tr key={b.label}><td>{b.label}</td><td className="num">{b.sqft} sf</td></tr>)}
                <tr className="sub"><td>Total / sheets</td><td className="num">{take.drywall.totalSqFt} sf / {take.drywall.sheets}</td></tr>
              </tbody>
            </table>

            <SheetHeading>LIGHTING</SheetHeading>
            <table className="doc-table">
              <thead><tr><th>Zone</th><th>Type</th><th className="num">Length</th><th className="num">W</th></tr></thead>
              <tbody>
                {d.lighting.map((z) => (
                  <tr key={z.id}><td>{z.label}</td><td>{z.colorMode.toUpperCase()}</td><td className="num">{z.lengthFt}′</td><td className="num">{z.driverWatts}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </PlanSheet>

      <PlanSheet number="M-1" title="BILL OF MATERIALS" project={project} paper={paper} stamp={stamp} scale="N/A"
        notes={[`Waste factor ${d.wall.wasteFactorPct}%.`, `${sourcing.stops} suppliers.`, 'Quantities are for purchasing, not a guarantee.']}>
        <div style={{ columnCount: 2, columnGap: 14, fontSize: 8.5 }}>
          <table className="doc-table">
            <thead><tr><th>Item</th><th className="num">Buy</th><th>Source</th></tr></thead>
            <tbody>
              {[...grouped.entries()].map(([cat, lines]) => (
                <>
                  <tr className="group" key={cat}><td colSpan={3}>{CATEGORY_LABEL[cat]}</td></tr>
                  {lines.map((l) => {
                    const g = sourcing.groups.find((gr) => gr.lines.some((x) => x.sku === l.sku));
                    return (
                      <tr key={l.sku}>
                        <td>{l.name}<div style={{ color: '#8A8278', fontSize: 7.5 }}>{l.spec}</div></td>
                        <td className="num">{l.purchaseQty} {l.unit}</td>
                        <td style={{ fontSize: 7.5 }}>{g?.short || '—'}</td>
                      </tr>
                    );
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </PlanSheet>

      <PlanSheet number="M-2" title="LUMBER CUT LIST" project={project} paper={paper} stamp={stamp} scale="N/A"
        notes={[`${take.cutList.totalBoards} boards, ${take.cutList.overallYieldPct}% yield.`, '1/8" kerf allowed per cut.', 'Cut long, check, then cut to fit.']}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14, fontSize: 9 }}>
          <div>
            <SheetHeading>CUTS</SheetHeading>
            <table className="doc-table">
              <thead><tr><th>Size</th><th>Length</th><th className="num">Qty</th><th>Use</th></tr></thead>
              <tbody>
                {take.cutList.cuts.map((c, i) => (
                  <tr key={i}>
                    <td>{c.lumber}</td>
                    <td style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>{c.lengthLabel}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{c.qty}</td>
                    <td style={{ fontSize: 8 }}>{c.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <SheetHeading>BOARDS TO BUY</SheetHeading>
            <table className="doc-table">
              <thead><tr><th>Stock</th><th className="num">Qty</th><th className="num">Yield</th></tr></thead>
              <tbody>
                {take.cutList.plans.map((p, i) => (
                  <tr key={i}><td>{p.stockLabel}</td><td className="num">{p.count}</td><td className="num">{p.yieldPct}%</td></tr>
                ))}
                <tr className="sub"><td>Total</td><td className="num">{take.cutList.totalBoards}</td><td className="num">{take.cutList.overallYieldPct}%</td></tr>
              </tbody>
            </table>
            <SheetHeading>CUTTING DIAGRAM</SheetHeading>
            <div style={{ display: 'grid', gap: 2 }}>
              {take.cutList.plans.flatMap((p) => p.boards.slice(0, 10).map((b, bi) => (
                <div key={`${p.sku}-${bi}`} style={{ display: 'flex', height: 11, border: '1px solid #14110B' }}>
                  {b.cuts.map((cut, ci) => (
                    <div key={ci} style={{ width: `${(cut / p.stockLengthIn) * 100}%`, borderRight: '1px solid #14110B', background: ci % 2 ? '#EDE7DA' : '#F7F3EA', fontSize: 6, textAlign: 'center', lineHeight: '10px', overflow: 'hidden' }}>
                      {(cut / p.stockLengthIn) > 0.1 ? Math.round(cut) : ''}
                    </div>
                  ))}
                </div>
              )))}
            </div>
          </div>
        </div>
      </PlanSheet>

      <PlanSheet number="M-3" title="LABOR & WORK BREAKDOWN" project={project} paper={paper} stamp={stamp} scale="N/A"
        notes={[`${est.laborHours} hours, ${est.crewDays} crew-days (2 people).`, 'Hours derived from the design model.', 'Installer copy — internal costs shown.']}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 14, fontSize: 9 }}>
          <div>
            <SheetHeading>SEQUENCE & HOURS</SheetHeading>
            <table className="doc-table">
              <thead><tr><th>#</th><th>Task</th><th>Basis</th><th className="num">Hours</th></tr></thead>
              <tbody>
                {est.laborLines.map((l, i) => (
                  <tr key={l.category}>
                    <td style={{ width: 16 }}>{i + 1}</td>
                    <td>{l.label}{l.subcontracted ? ' (sub)' : ''}</td>
                    <td style={{ fontSize: 8, color: '#6B6357' }}>{l.basis}</td>
                    <td className="num">{l.hours}</td>
                  </tr>
                ))}
                <tr className="sub"><td colSpan={3}>TOTAL</td><td className="num">{est.laborHours} h</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <SheetHeading>INTERNAL SUMMARY</SheetHeading>
            <table className="doc-table">
              <tbody>
                <tr><td>Material cost</td><td className="num">{money(est.materialCost)}</td></tr>
                <tr><td>Crew cost ({est.laborHours} h)</td><td className="num">{money(est.laborCost)}</td></tr>
                <tr className="sub"><td>Direct cost</td><td className="num">{money(est.directCost)}</td></tr>
                <tr><td>Customer price</td><td className="num">{money(est.total)}</td></tr>
                <tr className="sub"><td>Profit / margin</td><td className="num">{money(est.profit)} / {est.marginPct}%</td></tr>
                <tr><td>Price per sq ft</td><td className="num">{money(est.pricePerSqFt)}</td></tr>
                <tr><td>Market band</td><td className="num">{money0(MARKET_BENCHMARK.perSqFtTypicalLow)}–{money0(MARKET_BENCHMARK.perSqFtTypicalHigh)}</td></tr>
              </tbody>
            </table>
            <div className="warn-box" style={{ marginTop: 8 }}>
              <h4>Installer copy</h4>
              <ul><li>This sheet shows internal cost and margin. Do not give it to the customer — print the Customer Proposal instead.</li></ul>
            </div>
          </div>
        </div>
      </PlanSheet>
    </>
  );
}

function SheetHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, letterSpacing: '.06em', borderBottom: '1.5px solid #C8A94A', paddingBottom: 2, margin: '8px 0 4px' }}>
      {children}
    </div>
  );
}
