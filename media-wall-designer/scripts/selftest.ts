/**
 * Self-test for the calculation engine. `npm test`
 *
 * No framework — these are assertions over pure functions, and they run in a
 * second. Every case here exists because something was actually wrong once.
 */
import { createProject, createDefaultDesign, defaultWall, maxNicheDepth } from '../shared/defaults';
import { buildTiers } from '../shared/calc/packages';
import { computeTakeOff } from '../shared/calc/materials';
import { computeEstimate } from '../shared/calc/estimate';
import { validateDesign } from '../shared/calc/validate';
import { generateFraming } from '../shared/calc/framing';
import { calcCutList, PURCHASE_LENGTHS } from '../shared/calc/cutlist';
import { parseDimension, inchesToFraction } from '../shared/units';
import { SHEET_W_IN, SHEET_H_IN, SLAT_PANEL_SQFT, FINISHES } from '../shared/catalog';
import { calcElectrical } from '../shared/calc/electrical';
import type { FireplaceComponent, TvComponent } from '../shared/types';

let passed = 0;
const failures: string[] = [];
const check = (name: string, cond: boolean, detail = '') => {
  if (cond) { passed++; return; }
  failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
};

/** A project with the fireplace signed off, i.e. one that should print clean. */
function verifiedProject() {
  const p = createProject({ name: 'test' });
  const fp = p.design.components.find((c): c is FireplaceComponent => c.type === 'fireplace')!;
  Object.assign(fp.props, {
    manufacturer: 'Test', model: 'T-60', overallWIn: 60.25, overallHIn: 21.25, overallDIn: 5.5,
    roughWIn: 60.5, roughHIn: 21.5, roughDIn: 6,
    clearanceTopIn: 8, clearanceSideIn: 0, clearanceBottomIn: 0, clearanceFrontIn: 36, clearanceToTvIn: 8,
    electrical: '120V 15A dedicated circuit', specsVerified: true,
  });
  const tv = p.design.components.find((c): c is TvComponent => c.type === 'tv')!;
  tv.props.dimensionsVerified = true;
  p.design.wall.loadBearing = 'no';
  return p;
}

/* -- 1. Deriving the tiers must never touch the design on screen ------------
      Regression: buildTiers filtered the live component array and then wrote
      c.y on those same objects, so opening the estimate screen dropped the TV
      into the fireplace clearance and stamped the drawing set. */
{
  const p = verifiedProject();
  const snap = () => JSON.stringify(p.design.components.map((c) => [c.id, c.x, c.y, c.w, c.h]));
  const before = snap();
  for (let i = 0; i < 5; i++) buildTiers(p.design, p.estimateSettings);
  check('buildTiers does not mutate the source design', snap() === before);

  const tiers = buildTiers(p.design, p.estimateSettings);
  check('three tiers are produced', tiers.length === 3);
  check('GOOD drops the fireplace', !tiers[0].design.components.some((c) => c.type === 'fireplace'));
  check('BEST keeps every niche', tiers[2].design.components.filter((c) => c.type === 'niche').length === 6);
  check('tier prices ascend', tiers[0].estimate.total < tiers[1].estimate.total && tiers[1].estimate.total < tiers[2].estimate.total,
    tiers.map((t) => Math.round(t.estimate.total)).join(' < '));
}

/* -- 2. The default preset must clear its own safety checks ----------------
      Regression: the stock layout put the soundbar 5-1/2" above the fireplace,
      which fails a realistic 8" clearance to combustibles. */
{
  const p = verifiedProject();
  const blockers = validateDesign(p.design).filter((i) => i.severity === 'blocker');
  check('verified default project has no blockers', blockers.length === 0, blockers.map((b) => b.title).join('; '));

  const fresh = createProject({ name: 'fresh' });
  const freshBlockers = validateDesign(fresh.design).filter((i) => i.severity === 'blocker');
  check('an unverified fireplace still blocks', freshBlockers.some((b) => b.id === 'fp_signoff'));
}

/* -- 3. The cut plan has to be physically possible ------------------------- */
{
  const p = verifiedProject();
  const framing = generateFraming(p.design);
  const cuts = calcCutList(framing.members);
  let overlong = 0;
  let overfull = 0;
  for (const plan of cuts.plans) {
    for (const board of plan.boards) {
      for (const cut of board.cuts) if (cut > plan.stockLengthIn + 1e-6) overlong++;
      const used = board.cuts.reduce((s, c) => s + c, 0) + Math.max(0, board.cuts.length - 1) * 0.125;
      if (used > plan.stockLengthIn + 1e-6) overfull++;
    }
  }
  check('no cut exceeds the board it is assigned to', overlong === 0, `${overlong} bad cuts`);
  check('no board is packed past its length once kerf is charged', overfull === 0, `${overfull} overfull boards`);
  check('every cut is accounted for in the boards',
    cuts.cuts.reduce((s, c) => s + c.qty, 0) === cuts.plans.reduce((s, pl) => s + pl.boards.reduce((n, b) => n + b.cuts.length, 0), 0));
  check('only purchasable stock lengths are used',
    cuts.plans.every((pl) => (PURCHASE_LENGTHS[pl.lumber] || []).some((o) => o.lengthIn === pl.stockLengthIn)));
  check('board yield is plausible', cuts.overallYieldPct > 50 && cuts.overallYieldPct <= 100, `${cuts.overallYieldPct}%`);
}

/* -- 4. Quantities move with the design, and stay sane --------------------- */
{
  const small = createProject({ name: 's', design: createDefaultDesign({ ...defaultWall(), widthIn: 96 }, { nichesPerSide: 0, tvSize: 55, fireplaceSize: null, soundbar: false }) });
  const big = createProject({ name: 'b', design: createDefaultDesign({ ...defaultWall(), widthIn: 192, heightIn: 108, ceilingHeightIn: 108 }, { nichesPerSide: 4, tvSize: 85, fireplaceSize: 84, soundbar: true }) });
  const st = computeTakeOff(small.design, small.estimateSettings);
  const bt = computeTakeOff(big.design, big.estimateSettings);
  check('a bigger wall needs more drywall', bt.drywall.sheets > st.drywall.sheets, `${st.drywall.sheets} vs ${bt.drywall.sheets}`);
  check('a bigger wall needs more lumber', bt.cutList.totalBoards > st.cutList.totalBoards, `${st.cutList.totalBoards} vs ${bt.cutList.totalBoards}`);
  check('more niches means more labor', computeEstimate(big.design, big.estimateSettings, bt).laborHours > computeEstimate(small.design, small.estimateSettings, st).laborHours);
  check('no NaN reaches a quantity', bt.bom.every((l) => Number.isFinite(l.purchaseQty) && Number.isFinite(l.unitCost)));
  check('every BOM line explains itself', bt.bom.every((l) => l.derivedFrom.length > 0));
}

/* -- 5. Money adds up ------------------------------------------------------ */
{
  const p = verifiedProject();
  const take = computeTakeOff(p.design, p.estimateSettings);
  const est = computeEstimate(p.design, p.estimateSettings, take);
  check('total equals pre-tax plus tax', Math.abs(est.total - (est.preTax + est.tax)) < 0.02);
  check('deposit and balance reconstitute the total', Math.abs(est.deposit + est.balance - est.total) < 0.02);
  check('profit equals price minus direct cost', Math.abs(est.profit - (est.preTax - est.directCost)) < 0.02);
  check('burdened labor cost is below billed labor', est.laborCost < est.laborPrice);
  check('margin is a sane percentage', est.marginPct > 0 && est.marginPct < 100, `${est.marginPct}%`);
}

/* -- 6. Inch parsing round-trips the way a tape measure reads --------------- */
{
  const cases: [string, number][] = [
    ['96', 96], ['96.5', 96.5], ["8'", 96], [`8' 2"`, 98], ['92-5/8', 92.625], ['92 5/8', 92.625],
    ['5/8', 0.625], [`8' 2-1/2"`, 98.5], ['0', 0],
  ];
  for (const [input, want] of cases) {
    check(`parseDimension("${input}")`, Math.abs(parseDimension(input) - want) < 1e-9, `got ${parseDimension(input)}, want ${want}`);
  }
  check('inchesToFraction(92.625)', inchesToFraction(92.625) === '92-5/8"', inchesToFraction(92.625));
  check('inchesToFraction rounds up cleanly', inchesToFraction(15.9999) === '16"', inchesToFraction(15.9999));
  check('inchesToFraction(0.0625)', inchesToFraction(0.0625) === '1/16"', inchesToFraction(0.0625));
}

/* -- 7. A niche can never be deeper than the wall it sits in ---------------- */
{
  const p = createProject({ name: 'depth' });
  check('default niches fit the wall', p.design.components.filter((c) => c.type === 'niche').every((n) => n.depthIn <= maxNicheDepth(p.design.wall) + 1e-9));
  const bad = createProject({ name: 'bad' });
  const niche = bad.design.components.find((c) => c.type === 'niche')!;
  niche.depthIn = 99;
  check('an over-deep niche is caught', validateDesign(bad.design).some((i) => i.severity === 'blocker' && i.id.startsWith('niche_depth')));
}

/* -- 8. Casework: parts must fit the sheets they were nested onto ---------- */
{
  for (const style of ['built_in', 'slat_panel'] as const) {
    const p = createProject({ name: style, design: createDefaultDesign(defaultWall(), { style }) });
    const take = computeTakeOff(p.design, p.estimateSettings);
    const cw = take.casework;
    check(`${style}: produces casework`, cw.hasCasework);

    let offSheet = 0;
    let overlaps = 0;
    for (const plan of cw.plans) {
      for (const sheet of plan.sheets) {
        for (const part of sheet.parts) {
          if (part.x < -1e-6 || part.y < -1e-6 || part.x + part.w > SHEET_W_IN + 1e-6 || part.y + part.h > SHEET_H_IN + 1e-6) offSheet++;
        }
        // No two parts may occupy the same area of the sheet.
        for (let i = 0; i < sheet.parts.length; i++) {
          for (let j = i + 1; j < sheet.parts.length; j++) {
            const a = sheet.parts[i], b = sheet.parts[j];
            if (a.x < b.x + b.w - 1e-6 && a.x + a.w > b.x + 1e-6 && a.y < b.y + b.h - 1e-6 && a.y + a.h > b.y + 1e-6) overlaps++;
          }
        }
      }
    }
    check(`${style}: every nested part sits on its sheet`, offSheet === 0, `${offSheet} off-sheet`);
    check(`${style}: no two parts overlap on a sheet`, overlaps === 0, `${overlaps} overlaps`);
    check(`${style}: every part is placed or reported oversize`, (() => {
      const placed = cw.plans.reduce((n, pl) => n + pl.sheets.reduce((m, sh) => m + sh.parts.length, 0), 0);
      const total = cw.parts.reduce((n, x) => n + x.qty, 0);
      const oversize = cw.parts.filter((x) => Math.max(x.lengthIn, x.widthIn) > SHEET_H_IN || Math.min(x.lengthIn, x.widthIn) > SHEET_W_IN)
        .reduce((n, x) => n + x.qty, 0);
      return placed + oversize === total;
    })());
    check(`${style}: sheet yield is plausible`, cw.plans.every((pl) => pl.yieldPct > 0 && pl.yieldPct <= 100));
  }

  // Casework must add labor and cost, not vanish into the drywall numbers.
  const plain = createProject({ name: 'plain', design: createDefaultDesign(defaultWall(), { style: 'drywall_niches' }) });
  const built = createProject({ name: 'built', design: createDefaultDesign(defaultWall(), { style: 'built_in' }) });
  const pt = computeTakeOff(plain.design, plain.estimateSettings);
  const bt = computeTakeOff(built.design, built.estimateSettings);
  check('built-ins cost more labor than drywall niches',
    computeEstimate(built.design, built.estimateSettings, bt).laborHours > computeEstimate(plain.design, plain.estimateSettings, pt).laborHours);
  check('built-ins add casework lines to the BOM', bt.bom.some((l) => l.category === 'casework'));
  check('a drywall wall has no casework lines', !pt.bom.some((l) => l.category === 'casework'));

  // Slat maths: count and lineal footage must follow the pitch.
  const slat = createProject({ name: 'slat', design: createDefaultDesign(defaultWall(), { style: 'slat_panel' }) });
  const st2 = computeTakeOff(slat.design, slat.estimateSettings);
  const panel = slat.design.components.find((c) => c.type === 'panel')!;
  const props = (panel as any).props;
  const expected = Math.ceil(panel.w / (props.slatWidthIn + props.slatGapIn));
  check('slat count follows the panel width and pitch', st2.casework.slatCount === expected, `${st2.casework.slatCount} vs ${expected}`);
  check('slat lineal feet follow the count and panel height',
    st2.casework.slatLf === Math.ceil((expected * panel.h) / 12), `${st2.casework.slatLf}`);
}

/* -- 9. Three bugs a research pass turned up. Each check is the proof. ------ */
{
  // (a) The fireplace rough DEPTH was collected from the manual and never
  //     compared to the wall, so a 6" unit in a 4" build-out drew a framing plan.
  const p = verifiedProject();
  const fp = p.design.components.find((c): c is FireplaceComponent => c.type === 'fireplace')!;
  // Put a 6" unit in a 4" 2x4 build-out — the case that used to draw a framing plan.
  p.design.wall.lumber = '2x4';
  p.design.wall.featureDepthIn = 4;
  fp.props.roughDIn = 6;
  const deep = validateDesign(p.design).filter((i) => i.severity === 'blocker');
  check('a fireplace deeper than the wall is blocked', deep.some((i) => i.id === 'fp_depth'), deep.map((i) => i.id).join(','));
  check('the block names lumber that would actually fit',
    (deep.find((i) => i.id === 'fp_depth')?.detail ?? '').includes('2×6'),
    deep.find((i) => i.id === 'fp_depth')?.detail.slice(0, 90));

  p.design.wall.lumber = '2x6';
  p.design.wall.featureDepthIn = 6;
  check('deepening the wall clears it', !validateDesign(p.design).some((i) => i.id === 'fp_depth'));

  // And a wall that starts with a fireplace in it must start deep enough.
  const seeded = createProject({ name: 'seeded' });
  check('a new project with a fireplace starts deep enough to hold one',
    seeded.design.wall.featureDepthIn >= 6, `${seeded.design.wall.featureDepthIn}"`);
  const noFp = createDefaultDesign(defaultWall(), { fireplaceSize: null });
  check('a wall with no fireplace stays a 2x4 build-out', noFp.wall.lumber === '2x4', noFp.wall.lumber);

  // (b) Lighting footage was computed once at seed time, so resizing the object
  //     a zone lit left its length, watts, drivers and BOM line frozen.
  const slat = createProject({ name: 'l', design: createDefaultDesign(defaultWall(), { style: 'slat_panel' }) });
  const panel = slat.design.components.find((c) => c.type === 'panel')!;
  const before = calcElectrical(slat.design);
  panel.w = panel.w / 2;
  panel.h = panel.h / 2;
  const after = calcElectrical(slat.design);
  check('lighting footage follows the geometry it lights', after.stripFt < before.stripFt, `${before.stripFt} -> ${after.stripFt}`);
  check('driver load follows too', after.driverWatts < before.driverWatts, `${before.driverWatts} -> ${after.driverWatts}`);

  // (c) The same 94"x12" slat panel was bought at two different coverages.
  check('one slat panel has one coverage number', Math.abs(FINISHES.wood_slat.coverage - SLAT_PANEL_SQFT) < 0.01,
    `${FINISHES.wood_slat.coverage} vs ${SLAT_PANEL_SQFT}`);
  check('slat coverage matches a 94x12 panel', Math.abs(SLAT_PANEL_SQFT - (94 * 12) / 144) < 0.02);
}

console.log(`\n${passed} passed, ${failures.length} failed`);
for (const f of failures) console.log(`  FAIL  ${f}`);
process.exit(failures.length ? 1 : 0);
