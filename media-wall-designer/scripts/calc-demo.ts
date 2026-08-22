/** Prints the full take-off for the reference wall. `npm run calc` */
import { createProject } from '../shared/defaults';
import { computeTakeOff } from '../shared/calc/materials';
import { computeEstimate, autoLaborHours } from '../shared/calc/estimate';
import { validateDesign } from '../shared/calc/validate';
import { buildSourcing } from '../shared/calc/sourcing';
import { money, inchesToFeet, inchesToFraction } from '../shared/units';
import { LABOR_RATES, MARKET_BENCHMARK } from '../shared/catalog';

const p = createProject({ name: 'Reference wall — 12′ × 8′, 6 niches' });
const take = computeTakeOff(p.design, p.estimateSettings);
const est = computeEstimate(p.design, p.estimateSettings, take);
const auto = autoLaborHours(p.design, take);
const issues = validateDesign(p.design);
const src = buildSourcing(take.bom);

const w = p.design.wall;
console.log(`WALL  ${inchesToFeet(w.widthIn)} × ${inchesToFeet(w.heightIn)} × ${w.featureDepthIn}" deep — ${w.lumber} @ ${w.studSpacing}" O.C.`);
console.log(`COMPONENTS  ${p.design.components.map((c) => c.type).join(', ')}`);
console.log(`\nFRAMING  ${take.framing.members.length} members · ${take.framing.stats.studCount} full studs · ${take.framing.stats.crippleCount} cripples · ${take.framing.stats.totalLf} lf · ${take.framing.stats.boardFeet} bf`);
console.log(`DRYWALL  gross ${take.drywall.grossFaceSqFt} sf + returns ${(take.drywall.totalSqFt - take.drywall.faceSqFt).toFixed(1)} sf → ${take.drywall.sheets} sheets (${take.drywall.fieldSheets} field + ${take.drywall.returnSheets} returns), ${take.drywall.cornerBeadLf} lf bead, ${take.drywall.mudBuckets} buckets`);
console.log(`ELECTRICAL  ${take.electrical.lineVoltageDevices} line-voltage · ${take.electrical.puckCount} pucks · ${take.electrical.stripFt} lf strip · ${take.electrical.drivers} driver(s)`);

console.log('\nCUT LIST (top 12)');
for (const c of take.cutList.cuts.slice(0, 12)) console.log(`  ${c.lumber} × ${inchesToFraction(c.lengthIn).padEnd(12)} qty ${String(c.qty).padStart(3)}   ${c.note}`);
console.log(`  … ${take.cutList.cuts.length} distinct lengths total`);
console.log('\nBOARDS TO BUY');
for (const pl of take.cutList.plans) console.log(`  ${pl.count} × ${pl.stockLabel}  (yield ${pl.yieldPct}%)`);
console.log(`  TOTAL ${take.cutList.totalBoards} boards, ${take.cutList.totalWasteFt} ft offcut, ${take.cutList.overallYieldPct}% yield`);

console.log('\nLABOR HOURS (auto-derived)');
let th = 0;
for (const [k, v] of Object.entries(auto)) {
  if (!v.hours) continue;
  th += v.hours;
  const r = LABOR_RATES[k as keyof typeof LABOR_RATES];
  console.log(`  ${k.padEnd(18)} ${String(v.hours).padStart(5)} h  bill ${money(r.rate)}/h  cost ${money(r.cost)}/h   ${v.basis}`);
}
console.log(`  ${'TOTAL'.padEnd(18)} ${String(th).padStart(5)} h  = ${est.crewDays} crew-days (2 people)`);

console.log('\nESTIMATE');
console.log(`  Material cost        ${money(est.materialCost)}   (${take.bom.length} line items, ${src.stops} suppliers)`);
console.log(`  Material + markup    ${money(est.materialWithMarkup)}`);
console.log(`  Labor billed         ${money(est.laborPrice)}  (${est.laborHours} h)`);
console.log(`  Labor cost (burdened)${money(est.laborCost)}`);
console.log(`  Overhead             ${money(est.overhead)}`);
console.log(`  Tax                  ${money(est.tax)}`);
console.log(`  CUSTOMER PRICE       ${money(est.total)}`);
console.log(`  Direct cost          ${money(est.directCost)}`);
console.log(`  Profit               ${money(est.profit)}  (${est.marginPct}% margin)`);
console.log(`  Price per sq ft      ${money(est.pricePerSqFt)}  (market band ${money(MARKET_BENCHMARK.perSqFtTypicalLow)}–${money(MARKET_BENCHMARK.perSqFtTypicalHigh)}/sf typical)`);
console.log(`  Deposit              ${money(est.deposit)}`);

console.log('\nSOURCING');
for (const g of src.groups) console.log(`  ${g.name.padEnd(26)} ${String(g.itemCount).padStart(2)} items  ${money(g.subtotal)}`);

console.log(`\nISSUES  ${issues.filter((i) => i.severity === 'blocker').length} blockers, ${issues.filter((i) => i.severity === 'warning').length} warnings`);
for (const i of issues.slice(0, 6)) console.log(`  [${i.severity.toUpperCase()}] ${i.title}`);
