import { useEffect } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { checkHealth, api } from './lib/api';
import { flush, store, useStore } from './lib/store';
import { validateDesign, blockers } from '@shared/calc/validate';
import { Icon } from './components/icons';
import { Toaster, toast } from './components/ui';
import { STATUS_LABEL, STATUS_TONE } from './lib/format';
import { ProjectsScreen } from './screens/ProjectsScreen';
import { OverviewScreen } from './screens/OverviewScreen';
import { PhotoScreen } from './screens/PhotoScreen';
import { DesignScreen } from './screens/DesignScreen';
import { PreviewScreen } from './screens/PreviewScreen';
import { DrawingsScreen } from './screens/DrawingsScreen';
import { MaterialsScreen } from './screens/MaterialsScreen';
import { SourcingScreen } from './screens/SourcingScreen';
import { EstimateScreen } from './screens/EstimateScreen';
import { PackageScreen } from './screens/PackageScreen';

const STEPS = [
  { to: '', label: 'Customer', icon: 'user', num: '01' },
  { to: 'photo', label: 'Wall photo', icon: 'camera', num: '02' },
  { to: 'design', label: 'Designer', icon: 'layout', num: '03' },
  { to: 'preview', label: 'Before / after', icon: 'eye', num: '04' },
  { to: 'drawings', label: 'Drawings', icon: 'ruler', num: '05' },
  { to: 'materials', label: 'Materials & cuts', icon: 'saw', num: '06' },
  { to: 'sourcing', label: 'Sourcing', icon: 'cart', num: '07' },
  { to: 'estimate', label: 'Estimate', icon: 'dollar', num: '08' },
  { to: 'package', label: 'Print package', icon: 'print', num: '09' },
];

export function App() {
  useEffect(() => {
    void checkHealth().then((h) => { if (h) void api.syncPending(); });
    const onOnline = () => {
      void checkHealth().then(async (h) => {
        if (!h) return;
        const { pushed } = await api.syncPending();
        if (pushed) toast(`${pushed} project${pushed === 1 ? '' : 's'} synced`);
      });
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<Shell><ProjectsScreen /></Shell>} />
        <Route path="/p/:id/*" element={<ProjectShell />} />
      </Routes>
      <Toaster />
    </>
  );
}

function Shell({ children, project }: { children: React.ReactNode; project?: boolean }) {
  return (
    <div className="app">
      {project ? null : (
        <nav className="rail">
          <Brand />
          <div className="rail-steps">
            <div className="rail-group eyebrow">Workspace</div>
            <NavLink to="/" className={({ isActive }) => `step${isActive ? ' active' : ''}`}>
              <span className="step-num"><Icon name="folder" size={13} /></span>Projects
            </NavLink>
          </div>
          <RailFooter />
        </nav>
      )}
      <div className="main">{children}</div>
    </div>
  );
}

function Brand() {
  return (
    <Link to="/" className="rail-brand" style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="rail-mark">MW</div>
      <div>
        <div className="rail-name">MEDIA WALL</div>
        <div className="rail-sub">DESIGNER · TV INSTALL CHICAGO</div>
      </div>
    </Link>
  );
}

function RailFooter() {
  const { connection, saveState } = useStore();
  return (
    <div style={{ padding: '10px 14px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span className={`save-dot ${connection === 'offline' ? 'off' : saveState === 'saving' ? 'saving' : saveState === 'dirty' ? 'dirty' : ''}`} />
      <span className="eyebrow" style={{ letterSpacing: '.1em' }}>
        {connection === 'offline' ? 'Offline — saved locally' : saveState === 'saving' ? 'Saving…' : saveState === 'dirty' ? 'Unsaved' : 'Synced'}
      </span>
    </div>
  );
}

function ProjectShell() {
  const { id } = useParams();
  const { project, loading, error, saveState, connection } = useStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) void store.load(id);
    return () => { void flush(); };
  }, [id]);

  useEffect(() => {
    // Autosave is debounced, so anything that can end the page has to force a
    // flush: a phone backgrounding the app, a reload, a closed tab. pagehide is
    // the one that reliably fires on iOS Safari.
    const onHide = () => { void flush(); };
    const onVisibility = () => { if (document.visibilityState === 'hidden') void flush(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onHide);
    window.addEventListener('beforeunload', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('beforeunload', onHide);
    };
  }, []);

  if (loading) return <div className="app"><div className="main"><div className="content"><div className="empty"><div className="display">LOADING…</div></div></div></div></div>;
  if (error || !project) {
    return (
      <div className="app"><div className="main"><div className="content">
        <div className="empty">
          <div className="display">PROJECT NOT FOUND</div>
          <p>{error}</p>
          <button className="btn gold" onClick={() => navigate('/')}>Back to projects</button>
        </div>
      </div></div></div>
    );
  }

  const base = `/p/${project.id}`;
  const sub = location.pathname.replace(base, '').replace(/^\//, '').split('/')[0];
  const issues = validateDesign(project.design);
  const blockerCount = blockers(issues).length;
  const current = STEPS.find((s) => s.to === sub) || STEPS[0];

  return (
    <div className="app">
      <nav className="rail">
        <Brand />
        <div className="rail-steps">
          <div className="rail-group eyebrow">
            <Link to="/" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon name="back" size={11} />ALL PROJECTS
            </Link>
          </div>
          {STEPS.map((s) => (
            <NavLink key={s.to} end={s.to === ''} to={`${base}${s.to ? `/${s.to}` : ''}`} className={({ isActive }) => `step${isActive ? ' active' : ''}`}>
              <span className="step-num">{s.num}</span>
              {s.label}
              {s.to === 'drawings' && blockerCount > 0 && <span className="step-badge alert">{blockerCount}</span>}
            </NavLink>
          ))}
        </div>
        <RailFooter />
      </nav>

      <div className="main">
        <header className="topbar">
          <Link to="/" className="btn icon sm ghost only-mobile" style={{ textDecoration: 'none' }} aria-label="Projects"><Icon name="back" size={16} /></Link>
          <div style={{ minWidth: 0 }}>
            <div className="topbar-title">{project.name}</div>
            <div className="topbar-sub">
              {project.customer.name || 'No customer name'}
              <span className="hide-mobile"> · {current.label}</span>
            </div>
          </div>
          <div className="topbar-actions">
            <span className={`pill ${STATUS_TONE[project.status]}`}>{STATUS_LABEL[project.status]}</span>
            <span className={`save-dot ${connection === 'offline' ? 'off' : saveState === 'saving' ? 'saving' : saveState === 'dirty' ? 'dirty' : ''}`}
              title={connection === 'offline' ? 'Offline — saved on this device' : saveState} />
          </div>
        </header>

        <Routes>
          <Route index element={<OverviewScreen />} />
          <Route path="photo" element={<PhotoScreen />} />
          <Route path="design" element={<DesignScreen />} />
          <Route path="preview" element={<PreviewScreen />} />
          <Route path="drawings" element={<DrawingsScreen />} />
          <Route path="materials" element={<MaterialsScreen />} />
          <Route path="sourcing" element={<SourcingScreen />} />
          <Route path="estimate" element={<EstimateScreen />} />
          <Route path="package" element={<PackageScreen />} />
        </Routes>

        <nav className="tabbar no-print">
          {STEPS.map((s) => (
            <NavLink key={s.to} end={s.to === ''} to={`${base}${s.to ? `/${s.to}` : ''}`} className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
              <Icon name={s.icon} size={19} />
              {s.label.split(' ')[0]}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
