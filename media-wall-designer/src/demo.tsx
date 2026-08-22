/**
 * Demo entry point.
 *
 * A self-contained build for showing the app without a server: hash routing so
 * it works from any URL, no service worker, and seeded sample projects. The
 * repository layer already falls back to IndexedDB when the API is unreachable,
 * so every screen behaves exactly as it does in production — projects, designs,
 * photos and estimates all persist, just in the browser instead of D1.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App } from './App';
import { localDb } from './lib/localdb';
import { createDefaultDesign, createProject, defaultWall } from '@shared/defaults';
import './styles/app.css';
import './styles/print.css';

/** Two projects: one mid-design, one signed off with the fireplace verified. */
async function seed() {
  const existing = await localDb.all();
  if (existing.length > 0) return;

  const reference = createProject({
    name: 'Hayes — living room media wall',
    status: 'proposed',
    customer: {
      name: 'Marcus Hayes', address: '1240 W Grand Ave', city: 'Chicago', state: 'IL',
      zip: '60642', phone: '(312) 555-0147', email: 'mhayes@example.com',
    },
    notes: 'Wall stops short of the left corner and dies into the right corner. Grey paint to match the existing walls. Customer wants the colour-changing lighting they saw on Instagram.',
  });
  // The reference build, with the fireplace specs filled in from the manual so
  // this project shows what a fully verified job looks like.
  const fp = reference.design.components.find((c) => c.type === 'fireplace');
  if (fp && fp.type === 'fireplace') {
    fp.props.manufacturer = 'Touchstone';
    fp.props.model = 'Sideline 60';
    fp.props.overallWIn = 60.25;
    fp.props.overallHIn = 21.25;
    fp.props.overallDIn = 5.5;
    fp.props.roughWIn = 60.5;
    fp.props.roughHIn = 21.5;
    fp.props.roughDIn = 6;
    fp.props.clearanceTopIn = 8;
    fp.props.clearanceSideIn = 0;
    fp.props.clearanceBottomIn = 0;
    fp.props.clearanceFrontIn = 36;
    fp.props.clearanceToTvIn = 8;
    fp.props.electrical = '120V 15A dedicated circuit';
    fp.props.ampDraw = 12.5;
    fp.props.installNotes = 'Recessed install, glass front. Remote receiver on the right side — leave access.';
    fp.props.specSource = 'Installation manual rev 2024-03, page 7';
    fp.props.specsVerified = true;
  }
  const tv = reference.design.components.find((c) => c.type === 'tv');
  if (tv && tv.type === 'tv') {
    tv.props.manufacturer = 'Samsung';
    tv.props.model = 'QN75QN90D';
    tv.props.dimensionsVerified = true;
  }
  reference.design.wall.loadBearing = 'no';
  reference.design.designNotes = 'Feature wall built out 4" from the existing wall, floor to ceiling, stopping below the crown. Three lit niches per side flanking the TV, soundbar and linear fireplace.';
  reference.tierOffered = 'best';

  // A second job mid-design: wider wall, slat finish, four niches.
  const slatWall = { ...defaultWall(), widthIn: 168, heightIn: 108, ceilingHeightIn: 108, finish: 'wood_slat' as const, colorHex: '#6B5744', roomWidthIn: 192, offsetXIn: 12 };
  const second = createProject({
    name: 'Okafor — basement theater wall',
    status: 'designing',
    customer: {
      name: 'Ada Okafor', address: '815 Ridge Rd', city: 'Wilmette', state: 'IL',
      zip: '60091', phone: '(847) 555-0182', email: 'ada.okafor@example.com',
    },
    notes: 'Basement — slab floor, so the bottom plate needs to be pressure treated and anchored. 98" TV is on order.',
    design: createDefaultDesign(slatWall, { nichesPerSide: 2, tvSize: 85, fireplaceSize: 72, soundbar: true }),
  });
  second.design.wall.ptBottomPlate = true;
  second.design.wall.loadBearing = 'unknown';

  // A built-in and a slat wall, so all three vocabularies are on the link.
  const builtIn = createProject({
    name: 'Delgado — oak built-in',
    status: 'designing',
    customer: {
      name: 'Rosa Delgado', address: '2210 N Damen Ave', city: 'Chicago', state: 'IL',
      zip: '60647', phone: '(773) 555-0119', email: 'rosa.delgado@example.com',
    },
    notes: 'Furniture-grade oak. Lit shelf columns either side, base cabinet run across the bottom, handleless fronts.',
    design: createDefaultDesign({ ...defaultWall(), widthIn: 156, heightIn: 102, ceilingHeightIn: 102, roomWidthIn: 180 }, { style: 'built_in', tvSize: 75, fireplaceSize: 60 }),
  });

  const slat = createProject({
    name: 'Whitcombe — slat feature wall',
    status: 'lead',
    customer: {
      name: 'Ellis Whitcombe', address: '640 Sheridan Rd', city: 'Evanston', state: 'IL',
      zip: '60202', phone: '(847) 555-0164', email: 'ellis.w@example.com',
    },
    notes: 'Vertical slat field behind the TV with a cove halo, projecting hearth ledge, linear fireplace under the panel.',
    design: createDefaultDesign({ ...defaultWall(), widthIn: 168, heightIn: 108, ceilingHeightIn: 108, roomWidthIn: 192, colorHex: '#6E6E76' }, { style: 'slat_panel', tvSize: 85, fireplaceSize: 72 }),
  });

  await localDb.put(reference, false);
  await localDb.put(second, false);
  await localDb.put(builtIn, false);
  await localDb.put(slat, false);
}

seed().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </StrictMode>,
  );
});
