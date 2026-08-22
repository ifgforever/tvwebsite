import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createProject } from '@shared/defaults';
import { inchesToFeet } from '@shared/units';
import { api, checkHealth, type ProjectSummary } from '../lib/api';
import { useStore } from '../lib/store';
import { EmptyState, Pill, Sheet, TextField, toast } from '../components/ui';
import { Icon } from '../components/icons';
import { STATUS_LABEL, STATUS_TONE, relativeDate } from '../lib/format';
import type { ProjectStatus } from '@shared/types';

export function ProjectsScreen() {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'active' | 'all' | ProjectStatus>('active');
  const [creating, setCreating] = useState(false);
  const [health, setHealth] = useState<{ db: boolean; storage: string; aiProvider: string | null } | null>(null);
  const navigate = useNavigate();
  const { connection } = useStore();

  useEffect(() => {
    void api.list().then(setProjects);
    void checkHealth().then((h) => setHealth(h ? { db: h.db, storage: h.storage, aiProvider: h.aiProvider } : null));
  }, []);

  const shown = useMemo(() => {
    if (!projects) return [];
    const term = q.trim().toLowerCase();
    return projects.filter((p) => {
      if (filter === 'active' && ['complete', 'lost'].includes(p.status)) return false;
      if (filter !== 'active' && filter !== 'all' && p.status !== filter) return false;
      if (!term) return true;
      return [p.name, p.customerName, p.address, p.phone].join(' ').toLowerCase().includes(term);
    });
  }, [projects, q, filter]);

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">PROJECTS</div>
          <div className="topbar-sub">{projects ? `${projects.length} total` : 'Loading…'}</div>
        </div>
        <div className="topbar-actions">
          <button className="btn gold" onClick={() => setCreating(true)}><Icon name="plus" size={16} />New</button>
        </div>
      </header>

      <div className="content">
        <div className="row wrap" style={{ marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <input placeholder="Search customer, address or phone" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="seg">
            {(['active', 'all', 'proposed', 'approved', 'complete'] as const).map((f) => (
              <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
                {f === 'active' ? 'Active' : f === 'all' ? 'All' : STATUS_LABEL[f as ProjectStatus]}
              </button>
            ))}
          </div>
        </div>

        {connection === 'offline' && (
          <div className={`note ${__DEMO__ ? 'gold' : 'warn'}`} style={{ marginBottom: 14 }}>
            {__DEMO__ ? (
              <>
                <strong>Demo build.</strong> There is no server behind this copy, so everything saves in this browser —
                design, photos, prices and all. Edit anything, reload, it is still here. Deploy it with D1 and the same
                screens read and write the database instead.
              </>
            ) : (
              <><strong>Offline.</strong> Projects are saving to this device and will sync when you get signal back.</>
            )}
          </div>
        )}
        {health && !health.db && (
          <div className="note warn" style={{ marginBottom: 14 }}>
            The API is up but the D1 database isn't reachable. Run <code>npm run db:migrate:local</code> (or <code>:remote</code>) and check the <code>database_id</code> in <code>wrangler.toml</code>.
          </div>
        )}

        {projects === null ? (
          <div className="empty"><div className="display">LOADING…</div></div>
        ) : shown.length === 0 ? (
          <EmptyState title={q ? 'NOTHING MATCHES' : 'NO PROJECTS YET'}
            action={<button className="btn gold" onClick={() => setCreating(true)}><Icon name="plus" size={16} />Start a project</button>}>
            {q ? 'Try a different search.' : 'Start one at the kitchen table: name, wall measurements, and you are designing in under a minute.'}
          </EmptyState>
        ) : (
          <div className="grid three">
            {shown.map((p) => (
              <Link key={p.id} to={`/p/${p.id}`} className="project-card">
                <div className="project-thumb" style={p.thumbUrl ? { backgroundImage: `url(${p.thumbUrl})` } : undefined}>
                  {!p.thumbUrl && <Icon name="camera" size={30} style={{ opacity: .25 }} />}
                </div>
                <div className="project-body">
                  <div className="project-name">{p.name}</div>
                  <div className="project-meta">{p.customerName || 'No name yet'}{p.address ? ` · ${p.address}` : ''}</div>
                  <div className="project-foot">
                    <Pill tone={STATUS_TONE[p.status as ProjectStatus]}>{STATUS_LABEL[p.status as ProjectStatus]}</Pill>
                    {p.widthIn ? <Pill>{inchesToFeet(p.widthIn)} × {inchesToFeet(p.heightIn || 0)}</Pill> : null}
                    {p.nicheCount ? <Pill>{p.nicheCount} niches</Pill> : null}
                    {p.local && <Pill tone="gold">On this device</Pill>}
                    <span className="spacer" />
                    <span className="faint" style={{ fontSize: 11.5 }}>{relativeDate(p.updatedAt)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {health && (
          <div className="row wrap" style={{ marginTop: 24, gap: 8 }}>
            <Pill tone={health.db ? 'ok' : 'rust'}>D1 {health.db ? 'connected' : 'unavailable'}</Pill>
            <Pill>Photos → {health.storage.toUpperCase()}</Pill>
            <Pill tone={health.aiProvider ? 'gold' : undefined}>AI rendering {health.aiProvider ? health.aiProvider : 'not configured'}</Pill>
          </div>
        )}
      </div>

      <NewProjectSheet open={creating} onClose={() => setCreating(false)} onCreated={(id) => navigate(`/p/${id}`)} />
    </>
  );
}

function NewProjectSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const [customer, setCustomer] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    const p = createProject({
      name: name.trim() || (customer.trim() ? `${customer.trim()} — media wall` : 'New media wall'),
      customer: { name: customer.trim(), address: address.trim(), city: '', state: 'IL', zip: '', phone: phone.trim(), email: '' },
    });
    const saved = await api.create(p);
    setBusy(false);
    toast('Project created');
    onCreated(saved.id);
  };

  return (
    <Sheet open={open} onClose={onClose} title="New project"
      footer={
        <div className="row">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <div className="spacer" />
          <button className="btn gold" disabled={busy} onClick={create}><Icon name="plus" size={15} />Create & design</button>
        </div>
      }>
      <TextField label="Customer name" value={customer} onChange={setCustomer} placeholder="Jordan Reyes" />
      <TextField label="Phone" value={phone} onChange={setPhone} type="tel" placeholder="(312) 555-0147" />
      <TextField label="Address" value={address} onChange={setAddress} placeholder="1240 W Grand Ave" />
      <TextField label="Project name" value={name} onChange={setName} placeholder="Living room media wall" hint="Leave blank and it names itself from the customer" />
      <div className="note" style={{ marginTop: 6 }}>
        A new project starts on the reference layout — 12′ × 8′ wall, 75″ TV, 60″ linear fireplace, soundbar and six lit niches.
        Change any of it in the designer.
      </div>
    </Sheet>
  );
}
