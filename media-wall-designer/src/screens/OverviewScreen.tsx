import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { computeTakeOff } from '@shared/calc/materials';
import { computeEstimate } from '@shared/calc/estimate';
import { validateDesign } from '@shared/calc/validate';
import { inchesToFeet, money0 } from '@shared/units';
import { store, useStore } from '../lib/store';
import { Panel, Pill, Stat, TextField, Select } from '../components/ui';
import { Icon } from '../components/icons';
import { STATUS_LABEL, STATUS_ORDER, fullDate, relativeDate } from '../lib/format';
import { WallVector } from '../render/WallVector';
import type { ProjectStatus } from '@shared/types';

export function OverviewScreen() {
  const { project } = useStore();
  if (!project) return null;
  const c = project.customer;

  const { take, estimate, issues } = useMemo(() => {
    const t = computeTakeOff(project.design, project.estimateSettings);
    return { take: t, estimate: computeEstimate(project.design, project.estimateSettings, t), issues: validateDesign(project.design) };
  }, [project.design, project.estimateSettings]);

  const patchCustomer = (patch: Partial<typeof c>) => store.patchProject({ customer: { ...c, ...patch } }, 'Customer');
  const blockerCount = issues.filter((i) => i.severity === 'blocker').length;
  const base = `/p/${project.id}`;

  return (
    <div className="content">
      <div className="split wide">
        <div className="grid">
          <Panel title="The wall" eyebrow="Current design"
            actions={<Link to={`${base}/design`} className="btn sm gold" style={{ textDecoration: 'none' }}><Icon name="layout" size={14} />Open designer</Link>}>
            <div style={{ borderRadius: 8, overflow: 'hidden', background: '#0B0B0E' }}>
              <WallVector design={project.design} style={{ width: '100%', display: 'block' }} />
            </div>
            <div className="grid three" style={{ marginTop: 12, gap: 8 }}>
              <Stat label="Wall" value={`${inchesToFeet(project.design.wall.widthIn)} × ${inchesToFeet(project.design.wall.heightIn)}`} note={`${project.design.wall.featureDepthIn}" deep`} />
              <Stat label="Niches" value={project.design.components.filter((x) => x.type === 'niche').length} note={`${take.electrical.puckCount} pucks · ${take.electrical.stripFt}' strip`} />
              <Stat label="Labor" value={`${estimate.laborHours} h`} note={`${estimate.crewDays} crew-days`} />
              <Stat label="Materials" value={money0(estimate.materialCost)} note={`${take.bom.length} line items`} />
              <Stat label="Customer price" value={money0(estimate.total)} note={`${money0(estimate.pricePerSqFt)}/sq ft`} tone="gold" />
              <Stat label="Profit" value={money0(estimate.profit)} note={`${estimate.marginPct}% margin`} tone={estimate.marginPct >= 30 ? 'ok' : 'rust'} />
            </div>
          </Panel>

          <Panel title="Customer" eyebrow="Job information">
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', columnGap: 12, gap: 0 }}>
              <TextField label="Name" value={c.name} onChange={(v) => patchCustomer({ name: v })} placeholder="Jordan Reyes" />
              <TextField label="Phone" value={c.phone} onChange={(v) => patchCustomer({ phone: v })} type="tel" placeholder="(312) 555-0147" />
              <TextField label="Email" value={c.email} onChange={(v) => patchCustomer({ email: v })} type="email" placeholder="name@email.com" />
              <TextField label="Address" value={c.address} onChange={(v) => patchCustomer({ address: v })} placeholder="1240 W Grand Ave" />
              <TextField label="City" value={c.city} onChange={(v) => patchCustomer({ city: v })} placeholder="Chicago" />
              <div className="grid" style={{ gridTemplateColumns: '1fr 1.4fr', columnGap: 10, gap: 0 }}>
                <TextField label="State" value={c.state} onChange={(v) => patchCustomer({ state: v })} />
                <TextField label="ZIP" value={c.zip} onChange={(v) => patchCustomer({ zip: v })} />
              </div>
            </div>
            <div className="row wrap" style={{ marginTop: 4 }}>
              {c.phone && <a className="btn sm" href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}><Icon name="user" size={14} />Call</a>}
              {c.phone && <a className="btn sm" href={`sms:${c.phone.replace(/[^\d+]/g, '')}`}>Text</a>}
              {c.email && <a className="btn sm" href={`mailto:${c.email}`}>Email</a>}
              {(c.address || c.city) && (
                <a className="btn sm" target="_blank" rel="noreferrer"
                  href={`https://maps.google.com/?q=${encodeURIComponent([c.address, c.city, c.state, c.zip].filter(Boolean).join(', '))}`}>
                  <Icon name="link" size={14} />Map
                </a>
              )}
            </div>
          </Panel>

          <Panel title="Notes" eyebrow="Anything that matters on site">
            <textarea value={project.notes} placeholder="Access, pets, HOA, furniture to move, when the customer wants it done…"
              onChange={(e) => store.patchProject({ notes: e.target.value })} style={{ minHeight: 120 }} />
          </Panel>
        </div>

        <div className="grid" style={{ alignContent: 'start' }}>
          <Panel title="Project" eyebrow="Status & dates">
            <Select label="Status" value={project.status} options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
              onChange={(v) => store.patchProject({ status: v as ProjectStatus }, 'Status')} />
            <TextField label="Project name" value={project.name} onChange={(v) => store.patchProject({ name: v }, 'Name')} />
            <div className="grid" style={{ gap: 8, marginTop: 6 }}>
              <div className="row"><span className="eyebrow">Created</span><span className="spacer" /><span className="mono" style={{ fontSize: 12.5 }}>{fullDate(project.createdAt)}</span></div>
              <div className="row"><span className="eyebrow">Updated</span><span className="spacer" /><span className="mono" style={{ fontSize: 12.5 }}>{relativeDate(project.updatedAt)}</span></div>
              {project.approvedAt && <div className="row"><span className="eyebrow">Approved</span><span className="spacer" /><Pill tone="ok">{fullDate(project.approvedAt)}</Pill></div>}
            </div>
          </Panel>

          <Panel title="Checks" eyebrow="Before this can be built"
            actions={<Pill tone={blockerCount ? 'rust' : 'ok'}>{blockerCount ? `${blockerCount} to resolve` : 'Clear'}</Pill>}>
            {issues.slice(0, 5).map((i) => (
              <div key={i.id} className={`note ${i.severity === 'blocker' ? 'block' : i.severity === 'warning' ? 'warn' : ''}`} style={{ marginBottom: 8, fontSize: 12.5 }}>
                <strong>{i.title}</strong>
                <div style={{ marginTop: 2, opacity: .85 }}>{i.detail.length > 130 ? `${i.detail.slice(0, 130)}…` : i.detail}</div>
              </div>
            ))}
            {issues.length > 5 && <Link to={`${base}/drawings`} className="btn sm block" style={{ textDecoration: 'none' }}>See all {issues.length} checks</Link>}
          </Panel>

          <Panel title="Photos" eyebrow={`${project.photos.length} on file`}
            actions={<Link to={`${base}/photo`} className="btn sm ghost" style={{ textDecoration: 'none' }}><Icon name="camera" size={14} /></Link>}>
            {project.photos.length === 0 ? (
              <Link to={`${base}/photo`} className="btn block" style={{ textDecoration: 'none' }}><Icon name="camera" size={15} />Take the wall photo</Link>
            ) : (
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 6 }}>
                {project.photos.map((p) => (
                  <img key={p.id} src={p.url} alt={p.caption} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 6, border: '1px solid var(--line)' }} />
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Jump to" eyebrow="Workflow">
            <div className="grid" style={{ gap: 6 }}>
              {[['design', 'layout', 'Designer'], ['drawings', 'ruler', 'Drawings'], ['materials', 'saw', 'Materials & cut list'],
                ['sourcing', 'cart', 'Sourcing list'], ['estimate', 'dollar', 'Estimate & options'], ['package', 'print', 'Print package']].map(([to, icon, label]) => (
                <Link key={to} to={`${base}/${to}`} className="btn block" style={{ textDecoration: 'none', justifyContent: 'flex-start' }}>
                  <Icon name={icon} size={15} />{label}<span className="spacer" /><Icon name="chevron" size={14} />
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
