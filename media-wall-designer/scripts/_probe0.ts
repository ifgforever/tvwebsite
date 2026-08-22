import { createProject } from '../shared/defaults';
import { validateDesign } from '../shared/calc/validate';
import { parseDimension } from '../shared/units';
import type { FireplaceComponent, TvComponent } from '../shared/types';

// Exactly the Inspector.tsx path: DimField.commit -> onChange(clamped) -> numOrNull
const numOrNull = (v: number) => (v === 0 ? null : v);
const uiEnter = (raw: string, min = 0, max = 100000) =>
  numOrNull(Math.min(max, Math.max(min, parseDimension(raw, 0))));

console.log('parseDimension("0") =', parseDimension('0', 99));
console.log('uiEnter("0") =', uiEnter('0'));
console.log('uiEnter("0\\"") =', uiEnter('0"'));
console.log('uiEnter("0 in") =', uiEnter('0 in'));

const p = createProject({ name: 'probe' });
const fp = p.design.components.find((c): c is FireplaceComponent => c.type === 'fireplace')!;
Object.assign(fp.props, {
  manufacturer: 'Touchstone', model: 'Sideline 60',
  overallWIn: 60.25, overallHIn: 21.25, overallDIn: 5.5,
  roughWIn: 60.5, roughHIn: 21.5, roughDIn: 6,
  clearanceTopIn: uiEnter('8'),
  clearanceSideIn: uiEnter('0'),   // manual says 0" each side
  clearanceBottomIn: uiEnter('0'),
  clearanceFrontIn: uiEnter('36'),
  clearanceToTvIn: uiEnter('0'),   // manual says 0" to TV
  electrical: '120V 15A dedicated circuit', specsVerified: true,
});
const tv = p.design.components.find((c): c is TvComponent => c.type === 'tv')!;
tv.props.dimensionsVerified = true;
p.design.wall.loadBearing = 'no';

console.log('stored side =', fp.props.clearanceSideIn, ' toTv =', fp.props.clearanceToTvIn);
console.log('redisplayed side =', fp.props.clearanceSideIn ?? 0);

const issues = validateDesign(p.design);
const blockers = issues.filter((i) => i.severity === 'blocker');
console.log('BLOCKERS:', blockers.map((b) => `${b.id}: ${b.title} :: ${b.detail.slice(0, 90)}`));

// Now overlap the TV onto the fireplace top and see if a 0" TV clearance blocks it
tv.y = fp.y + fp.h - 3;
const issues2 = validateDesign(p.design);
console.log('with TV 3" INTO the fireplace, fp_tv_clearance present?',
  issues2.some((i) => i.id === 'fp_tv_clearance'));
// control: what the same design does with clearanceToTvIn = 0 stored honestly
fp.props.clearanceToTvIn = 0;
const issues3 = validateDesign(p.design);
console.log('control (stored 0), fp_tv_clearance present?', issues3.some((i) => i.id === 'fp_tv_clearance'));
console.log('control blockers:', issues3.filter(i=>i.severity==='blocker').map(b=>b.id));
