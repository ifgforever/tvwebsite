/**
 * Estimate: derived labor hours you can override, pricing controls, the profit
 * picture, and three priced options to put in front of the customer.
 */
import { useMemo, useState } from 'react';
import { LABOR_RATES, MARKET_BENCHMARK } from '@shared/catalog';
import { computeTakeOff } from '@shared/calc/materials';
import { computeEstimate, priceForMargin } from '@shared/calc/estimate';
import { buildTiers } from '@shared/calc/packages';
import { money, money0 } from '@shared/units';
import { store, useStore } from '../lib/store';
import { WallVector } from '../render/WallVector';
import { Check, NumField, Panel, Pill, Segmented, Stat, toast } from '../components/ui';
import { Icon } from '../components/icons';
import type { TierId } from '@shared/types';

export function EstimateScreen() {
  const { project } = useStore();
  const [tab, setTab] = useState<'estimate' | 'labor' | 'options'>('estimate');
  const [showInternal, setShowInternal] = useState(true);
  if (!project) return null;

  const s = project.estimateSettings;
  const take = useMemo(() => computeTakeOff(project.design, s), [project.design, s]);
  const est = useMemo(() => computeEstimate(project.design, s, take), [project.design, s, take]);
  const tiers = useMemo(() => buildTiers(project.design, s), [project.design, s]);

  const benchLow = MARKET_BENCHMARK.perSqFtTypicalLow;
  const benchHigh = MARKET_BENCHMARK.perSqFtTypicalHigh;
  const inBand = est.pricePerSqFt >= benchLow && est.pricePerSqFt <= benchHigh;

  return (
    <div className="content">
      <div className="row wrap" style={{ marginBottom: 14 }}>
        <Segmented value={tab} onChange={(v) => setTab(v as typeof tab)} gold
          options={[{ value: 'estimate', label: 'Estimate' }, { value: 'labor', label: `Labor (${est.laborHours} h)` }, { value: 'options', label: 'Good / Better / Best' }]} />
        <span className="spacer" />
        <button className={`btn sm${showInternal ? ' gold' : ''}`} onClick={() => setShowInternal(!showInternal)}>
          <Icon name={showInternal ? 'eye' : 'lock'} size={14} />{showInternal ? 'Internal view' : 'Customer-safe view'}
        </button>
      </div>

      {tab === 'estimate' && (
        <div className="split wide">
          <div className="grid">
            <Panel title="The number" eyebrow="Material + labor + markup + tax">
              <div className="grid" style={{ gap: 0 }}>
                <Line label="Materials at cost" value={money(est.materialCost)} dim={!showInternal} hidden={!showInternal} />
                <Line label={`Materials + ${s.materialMarkupPct}% markup`} value={money(est.materialWithMarkup)} />
                <Line label={`Labor — ${est.laborHours} h`} value={money(est.laborWithMarkup)} />
                <Line label={`Overhead ${s.overheadPct}%`} value={money(est.overhead)} />
                {est.discountAmount > 0 && <Line label="Discount" value={`− ${money(est.discountAmount)}`} />}
                <Line label={`Tax ${s.taxRatePct}%`} value={money(est.tax)} note={s.taxOnLabor ? 'On material and labor' : 'On materials only'} />
                <div className="row" style={{ borderTop: '2px solid var(--gold)', marginTop: 10, paddingTop: 12 }}>
                  <div>
                    <div className="stat-label">Customer price</div>
                    <div className="faint" style={{ fontSize: 12 }}>{money(est.pricePerSqFt)} per sq ft of wall</div>
                  </div>
                  <span className="spacer" />
                  <div className="display gold" style={{ fontSize: 40 }}>{money0(est.total)}</div>
                </div>
                <div className="row" style={{ marginTop: 8 }}>
                  <Pill tone={inBand ? 'ok' : est.pricePerSqFt < benchLow ? 'rust' : 'gold'}>
                    {inBand ? 'Inside the market band' : est.pricePerSqFt < benchLow ? 'Below market' : 'Above the typical band'}
                  </Pill>
                  <span className="faint" style={{ fontSize: 11.5 }}>
                    2026 installed media walls run {money0(MARKET_BENCHMARK.perSqFtLow)}–{money0(MARKET_BENCHMARK.perSqFtHigh)}/sq ft, typically {money0(benchLow)}–{money0(benchHigh)}
                  </span>
                </div>
              </div>
            </Panel>

            {showInternal && (
              <Panel title="What you keep" eyebrow="Internal — never printed on a customer proposal">
                <div className="grid three">
                  <Stat label="Direct cost" value={money0(est.directCost)} note={`${money0(est.materialCost)} material + ${money0(est.laborCost)} crew`} />
                  <Stat label="Profit" value={money0(est.profit)} tone={est.marginPct >= 30 ? 'ok' : 'rust'} note={`${est.marginPct}% margin`} />
                  <Stat label="Per crew-day" value={money0(est.crewDays ? est.profit / est.crewDays : 0)} note={`${est.crewDays} crew-days, 2 people`} />
                </div>
                <div className="row wrap" style={{ marginTop: 12 }}>
                  <span className="eyebrow">Target margin {s.targetMarginPct}%</span>
                  <span className="spacer" />
                  <span className="mono">Price to hit it: <strong className="gold">{money(priceForMargin(est, s.targetMarginPct))}</strong></span>
                </div>
                <div className="note" style={{ marginTop: 10, fontSize: 12 }}>
                  Profit is price minus <em>burdened crew cost</em>, not billed labor — set the real cost per hour on the Labor tab so this number means something.
                </div>
              </Panel>
            )}
          </div>

          <div className="grid" style={{ alignContent: 'start' }}>
            <Panel title="Pricing controls" eyebrow="Applies to this project">
              <NumField label="Material markup" suffix="%" value={s.materialMarkupPct} onChange={(v) => store.patchSettings({ materialMarkupPct: v }, 'Markup')} min={0} max={200} />
              <NumField label="Labor markup" suffix="%" value={s.laborMarkupPct} onChange={(v) => store.patchSettings({ laborMarkupPct: v }, 'Markup')} min={0} max={200} />
              <NumField label="Overhead" suffix="%" value={s.overheadPct} onChange={(v) => store.patchSettings({ overheadPct: v }, 'Overhead')} min={0} max={60} />
              <NumField label="Target margin" suffix="%" value={s.targetMarginPct} onChange={(v) => store.patchSettings({ targetMarginPct: v }, 'Margin')} min={0} max={80} />
              <NumField label="Sales tax" suffix="%" value={s.taxRatePct} onChange={(v) => store.patchSettings({ taxRatePct: v }, 'Tax')} min={0} max={20} />
              <Check label="Tax labor as well as materials" checked={s.taxOnLabor} onChange={(v) => store.patchSettings({ taxOnLabor: v }, 'Tax')} />
              <div className="row" style={{ gap: 8, alignItems: 'flex-end', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <NumField label="Discount" value={s.discount} onChange={(v) => store.patchSettings({ discount: v }, 'Discount')} min={0} />
                </div>
                <div style={{ paddingBottom: 12 }}>
                  <Segmented value={s.discountIsPct ? 'pct' : 'amt'} onChange={(v) => store.patchSettings({ discountIsPct: v === 'pct' }, 'Discount')}
                    options={[{ value: 'amt', label: '$' }, { value: 'pct', label: '%' }]} />
                </div>
              </div>
              <NumField label="Deposit" suffix="%" value={s.depositPct} onChange={(v) => store.patchSettings({ depositPct: v }, 'Deposit')} min={0} max={100}
                hint={`${money(est.deposit)} up front, ${money(est.balance)} on completion`} />
              <NumField label="Proposal valid for" suffix="days" value={s.validDays} onChange={(v) => store.patchSettings({ validDays: v }, 'Validity')} min={1} max={365} />
            </Panel>
          </div>
        </div>
      )}

      {tab === 'labor' && (
        <div className="grid">
          <div className="note gold" style={{ fontSize: 12.5 }}>
            Hours are <strong>derived from the design</strong> — wall area, opening count, niche returns, device count, finish type.
            Type over any number and that line stops auto-calculating.
          </div>
          <Panel title="Labor breakdown" eyebrow={`${est.laborHours} hours · ${est.crewDays} crew-days`} tight>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Category</th><th className="hide-mobile">Basis</th><th className="num">Hours</th>
                    <th className="num">Bill/h</th>{showInternal && <th className="num">Cost/h</th>}
                    <th className="num">Price</th>{showInternal && <th className="num">Cost</th>}
                  </tr>
                </thead>
                <tbody>
                  {s.labor.map((line) => {
                    const computed = est.laborLines.find((l) => l.category === line.category);
                    const hours = computed?.hours ?? 0;
                    return (
                      <tr key={line.id} style={{ opacity: hours ? 1 : .45 }}>
                        <td>
                          <div>{LABOR_RATES[line.category].label}</div>
                          {LABOR_RATES[line.category].licensed && <span className="faint" style={{ fontSize: 11 }}>Licensed trade</span>}
                        </td>
                        <td className="hide-mobile faint" style={{ fontSize: 11.5 }}>{computed?.basis}</td>
                        <td className="num">
                          <input className="mono" value={hours} style={{ width: 62, minHeight: 30, padding: '4px 6px', textAlign: 'right', borderColor: line.autoCalculated ? 'var(--line)' : 'var(--gold)' }}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              store.patchSettings({
                                labor: s.labor.map((l) => (l.id === line.id ? { ...l, hours: Number.isFinite(v) ? v : 0, autoCalculated: false } : l)),
                              }, 'Labor');
                            }} />
                        </td>
                        <td className="num">
                          <input className="mono" value={line.rate} style={{ width: 62, minHeight: 30, padding: '4px 6px', textAlign: 'right' }}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              store.patchSettings({ labor: s.labor.map((l) => (l.id === line.id ? { ...l, rate: Number.isFinite(v) ? v : 0 } : l)) }, 'Rate');
                            }} />
                        </td>
                        {showInternal && (
                          <td className="num">
                            <input className="mono" value={line.costRate} style={{ width: 62, minHeight: 30, padding: '4px 6px', textAlign: 'right' }}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                store.patchSettings({ labor: s.labor.map((l) => (l.id === line.id ? { ...l, costRate: Number.isFinite(v) ? v : 0 } : l)) }, 'Cost');
                              }} />
                          </td>
                        )}
                        <td className="num">{money(computed?.price ?? 0)}</td>
                        {showInternal && <td className="num faint">{money(computed?.cost ?? 0)}</td>}
                      </tr>
                    );
                  })}
                  <tr className="group">
                    <td colSpan={showInternal ? 5 : 4}>TOTAL — {est.laborHours} hours</td>
                    <td className="num">{money(est.laborPrice)}</td>
                    {showInternal && <td className="num">{money(est.laborCost)}</td>}
                  </tr>
                </tbody>
              </table>
            </div>
          </Panel>
          <div className="row">
            <button className="btn sm" onClick={() => {
              store.patchSettings({ labor: s.labor.map((l) => ({ ...l, autoCalculated: true })) }, 'Recalculate');
              toast('Hours recalculated from the design');
            }}><Icon name="refresh" size={14} />Recalculate every line from the design</button>
          </div>
        </div>
      )}

      {tab === 'options' && (
        <div className="grid">
          <div className="note gold" style={{ fontSize: 12.5 }}>
            Three real designs, not three multipliers — each tier has its own framing, materials and price.
            Pick one and it becomes the offer on the printed proposal.
          </div>
          <div className="grid three">
            {tiers.map((t) => (
              <div key={t.tier.id} className="panel" style={{ borderColor: project.tierOffered === t.tier.id ? 'var(--gold)' : undefined }}>
                <div className="panel-head" style={{ background: project.tierOffered === t.tier.id ? 'rgba(200,169,74,.14)' : undefined }}>
                  <div>
                    <div className="eyebrow">{t.tier.tagline}</div>
                    <h3 style={{ fontSize: 22 }}>{t.tier.name}</h3>
                  </div>
                  <span className="spacer" />
                  {project.tierOffered === t.tier.id && <Pill tone="gold">Offered</Pill>}
                </div>
                <div style={{ background: '#0B0B0E' }}>
                  <WallVector design={t.design} style={{ width: '100%', display: 'block' }} />
                </div>
                <div className="panel-body">
                  <div className="display gold" style={{ fontSize: 32 }}>{money0(t.estimate.total)}</div>
                  <div className="faint" style={{ fontSize: 12, marginBottom: 10 }}>
                    {t.estimate.laborHours} h · {t.take.drywall.sheets} sheets · {t.take.cutList.totalBoards} boards
                    {showInternal ? ` · ${t.estimate.marginPct}% margin` : ''}
                  </div>
                  <ul style={{ margin: '0 0 12px', paddingLeft: 16, fontSize: 12.5, lineHeight: 1.55 }}>
                    {t.tier.bullets.map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                  <button className={`btn block${project.tierOffered === t.tier.id ? ' gold' : ''}`}
                    onClick={() => { store.patchProject({ tierOffered: t.tier.id as TierId }, 'Tier'); toast(`${t.tier.name} selected`); }}>
                    {project.tierOffered === t.tier.id ? <><Icon name="check" size={14} />Selected</> : 'Offer this one'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="note" style={{ fontSize: 12.5 }}>
            <strong>BEST</strong> is the design you have on screen. Changing the designer changes this column and its price.
          </div>
        </div>
      )}
    </div>
  );
}

function Line({ label, value, note, dim, hidden }: { label: string; value: string; note?: string; dim?: boolean; hidden?: boolean }) {
  if (hidden) return null;
  return (
    <div className="row" style={{ padding: '7px 0', borderBottom: '1px solid rgba(46,46,54,.6)', opacity: dim ? .6 : 1 }}>
      <div>
        <div style={{ fontSize: 14 }}>{label}</div>
        {note && <div className="faint" style={{ fontSize: 11.5 }}>{note}</div>}
      </div>
      <span className="spacer" />
      <span className="mono" style={{ fontSize: 15 }}>{value}</span>
    </div>
  );
}
