/** Bill of materials, drywall take-off, and the optimised cut list. */
import { useMemo, useState } from 'react';
import { CATEGORY_LABEL, SHEET_MATERIAL } from '@shared/catalog';
import { computeTakeOff } from '@shared/calc/materials';
import { inchesToFraction, money } from '@shared/units';
import { store, useStore } from '../lib/store';
import { Panel, Pill, Segmented, Stat, CopyButton } from '../components/ui';
import type { BomCategory } from '@shared/types';

export function MaterialsScreen() {
  const { project } = useStore();
  const [tab, setTab] = useState<'bom' | 'cuts' | 'sheets' | 'drywall'>('bom');
  if (!project) return null;

  const design = project.design;
  const settings = project.estimateSettings;
  const take = useMemo(() => computeTakeOff(design, settings), [design, settings]);
  const excluded = new Set(settings.excludedSkus);

  const grouped = useMemo(() => {
    const map = new Map<BomCategory, typeof take.bom>();
    for (const l of take.bom) map.set(l.category, [...(map.get(l.category) || []), l]);
    return [...map.entries()];
  }, [take.bom]);

  const materialTotal = take.bom.filter((l) => !excluded.has(l.sku)).reduce((s, l) => s + l.purchaseQty * l.unitCost, 0);

  const cutListText = [
    `CUT LIST — ${project.name}`,
    `${design.wall.lumber} framing @ ${design.wall.studSpacing}" O.C.`,
    '',
    ...take.cutList.cuts.map((c) => `${String(c.qty).padStart(3)} × ${c.lengthLabel.padEnd(12)} ${c.note}`),
    '',
    'BOARDS TO BUY',
    ...take.cutList.plans.map((p) => `${p.count} × ${p.stockLabel} (${p.yieldPct}% yield)`),
    `TOTAL ${take.cutList.totalBoards} boards · ${take.cutList.totalWasteFt} ft offcut · ${take.cutList.overallYieldPct}% yield`,
  ].join('\n');

  return (
    <div className="content">
      <div className="row wrap" style={{ marginBottom: 14 }}>
        <Segmented value={tab} onChange={(v) => setTab(v as typeof tab)} gold
          options={[
            { value: 'bom', label: 'Material list' },
            { value: 'cuts', label: 'Lumber cuts' },
            ...(take.casework.hasCasework ? [{ value: 'sheets' as const, label: `Sheet goods (${take.casework.totalSheets})` }] : []),
            { value: 'drywall', label: 'Drywall' },
          ]} />
        <span className="spacer" />
        <span className="eyebrow">Waste</span>
        <Segmented value={design.wall.wasteFactorPct} onChange={(v) => store.patchWall({ wasteFactorPct: v as number }, 'Waste')}
          options={[5, 10, 15, 20].map((n) => ({ value: n, label: `${n}%` }))} />
      </div>

      <div className="grid three" style={{ marginBottom: 14 }}>
        <Stat label="Material cost" value={money(materialTotal)} note={`${take.bom.length} line items`} />
        <Stat label="Boards" value={take.cutList.totalBoards} note={`${take.cutList.overallYieldPct}% yield, ${take.cutList.totalWasteFt} ft offcut`} />
        <Stat label="Drywall" value={`${take.drywall.sheets} sheets`} note={`${take.drywall.totalSqFt} sq ft incl. returns`} />
      </div>

      {tab === 'bom' && (
        <Panel title="Bill of materials" eyebrow="Calculated from the design" tight
          actions={<CopyButton text={take.bom.map((l) => `${l.purchaseQty} ${l.unit}\t${l.name}\t${l.spec}`).join('\n')} label="Copy" />}>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th style={{ width: 34 }} />
                  <th>Item</th><th className="hide-mobile">Derived from</th>
                  <th className="num">Qty</th><th className="num">Waste</th><th className="num">Buy</th>
                  <th className="num">Unit</th><th className="num">Extended</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map(([cat, lines]) => (
                  <>
                    <tr className="group" key={cat}>
                      <td colSpan={8}>{CATEGORY_LABEL[cat]} — {money(lines.filter((l) => !excluded.has(l.sku)).reduce((s, l) => s + l.purchaseQty * l.unitCost, 0))}</td>
                    </tr>
                    {lines.map((l) => {
                      const off = excluded.has(l.sku);
                      return (
                        <tr key={l.sku} style={{ opacity: off ? .4 : 1 }}>
                          <td>
                            <input type="checkbox" checked={!off} style={{ width: 17, height: 17, minHeight: 0, accentColor: 'var(--gold)' }}
                              onChange={() => store.patchSettings({
                                excludedSkus: off ? settings.excludedSkus.filter((s) => s !== l.sku) : [...settings.excludedSkus, l.sku],
                              }, 'Include')} />
                          </td>
                          <td>
                            <div>{l.name}{l.optional && <span className="faint" style={{ fontSize: 11 }}> · optional</span>}</div>
                            <div className="faint" style={{ fontSize: 11.5 }}>{l.spec}</div>
                          </td>
                          <td className="hide-mobile faint" style={{ fontSize: 11.5, maxWidth: 260 }}>{l.derivedFrom}</td>
                          <td className="num">{l.qty}</td>
                          <td className="num faint">{l.wastePct ? `${l.wastePct}%` : '—'}</td>
                          <td className="num gold">{l.purchaseQty} {l.unit}</td>
                          <td className="num">
                            <input className="mono" value={l.unitCost} style={{ width: 78, minHeight: 30, padding: '4px 6px', textAlign: 'right' }}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                store.patchSettings({
                                  priceOverrides: { ...settings.priceOverrides, [l.sku]: { ...settings.priceOverrides[l.sku], unitCost: Number.isFinite(v) ? v : 0 } },
                                }, 'Price');
                              }} />
                          </td>
                          <td className="num">{money(l.purchaseQty * l.unitCost)}</td>
                        </tr>
                      );
                    })}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {tab === 'cuts' && (
        <div className="grid">
          <Panel title="Cut list" eyebrow={`${take.cutList.cuts.length} distinct lengths`} tight
            actions={<CopyButton text={cutListText} label="Copy cut list" />}>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Length</th><th className="num">Qty</th><th>What it is</th></tr></thead>
                <tbody>
                  {take.cutList.cuts.map((c, i) => (
                    <tr key={i}>
                      <td className="mono gold" style={{ fontSize: 14 }}>{c.lumber} × {c.lengthLabel}</td>
                      <td className="num" style={{ fontSize: 15, fontWeight: 700 }}>{c.qty}</td>
                      <td className="faint">{c.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Boards to buy" eyebrow="First-fit-decreasing with look-ahead, 1/8″ kerf">
            <div className="grid two">
              {take.cutList.plans.map((p, i) => (
                <div key={i} className="stat">
                  <div className="row">
                    <div>
                      <div className="stat-label">{p.stockLabel}</div>
                      <div className="stat-value">{p.count}</div>
                    </div>
                    <span className="spacer" />
                    <Pill tone={p.yieldPct > 90 ? 'ok' : p.yieldPct > 75 ? 'gold' : 'rust'}>{p.yieldPct}% yield</Pill>
                  </div>
                  <div className="stat-note" style={{ marginBottom: 6 }}>{p.wasteIn}″ total offcut</div>
                  <div style={{ display: 'grid', gap: 3 }}>
                    {p.boards.slice(0, 8).map((b, bi) => (
                      <div key={bi} style={{ display: 'flex', height: 15, borderRadius: 3, overflow: 'hidden', background: 'var(--panel-3)' }}>
                        {b.cuts.map((c, ci) => (
                          <div key={ci} title={inchesToFraction(c)}
                            style={{ width: `${(c / p.stockLengthIn) * 100}%`, background: ci % 2 ? 'var(--gold)' : 'var(--gold-bright)', borderRight: '1px solid rgba(0,0,0,.5)', fontSize: 8, color: 'var(--on-gold)', textAlign: 'center', lineHeight: '15px', overflow: 'hidden' }}>
                            {(c / p.stockLengthIn) > 0.14 ? Math.round(c) : ''}
                          </div>
                        ))}
                      </div>
                    ))}
                    {p.boards.length > 8 && <div className="faint" style={{ fontSize: 11 }}>+ {p.boards.length - 8} more boards, same pattern</div>}
                  </div>
                </div>
              ))}
            </div>
            <div className="note" style={{ marginTop: 12, fontSize: 12.5 }}>
              <strong>{take.cutList.totalBoards} boards total</strong> · {take.cutList.totalWasteFt} ft of offcut · {take.cutList.overallYieldPct}% yield.
              Each bar is one board; each block is one cut, drawn to scale.
            </div>
          </Panel>
        </div>
      )}

      {tab === 'sheets' && (
        <div className="grid">
          <div className="grid three">
            <Stat label="Sheets" value={take.casework.totalSheets} note={take.casework.plans.map((p) => `${p.sheetCount} × ${p.label}`).join(' · ')} />
            <Stat label="Parts" value={take.casework.parts.reduce((n, p) => n + p.qty, 0)} note={`${take.casework.doorCount} doors · ${take.casework.drawerCount} drawers · ${take.casework.shelfCount} shelves`} />
            <Stat label="Edge banding" value={`${take.casework.edgeBandingLf} lf`} note={`${Math.ceil(take.casework.edgeBandingLf / 250)} roll(s)`} />
          </div>

          {take.casework.notes.map((n, i) => (
            <div key={i} className="note warn" style={{ fontSize: 12.5 }}>{n}</div>
          ))}

          <Panel title="Parts list" eyebrow="Cut from sheet stock" tight
            actions={<CopyButton label="Copy parts" text={take.casework.parts.map((p) => `${p.qty} × ${inchesToFraction(p.lengthIn)} × ${inchesToFraction(p.widthIn)}\t${p.label}`).join('\n')} />}>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th className="num">Qty</th><th>Part</th><th className="num">Length</th><th className="num">Width</th><th>Material</th><th className="num">Banded</th></tr></thead>
                <tbody>
                  {take.casework.parts.map((p) => (
                    <tr key={p.id}>
                      <td className="num" style={{ fontWeight: 700 }}>{p.qty}</td>
                      <td>{p.label}</td>
                      <td className="num gold">{inchesToFraction(p.lengthIn)}</td>
                      <td className="num gold">{inchesToFraction(p.widthIn)}</td>
                      <td className="faint">{SHEET_MATERIAL[p.material]?.label ?? p.material}</td>
                      <td className="num faint">{p.bandedEdges ? `${p.bandedEdges} edge${p.bandedEdges > 1 ? 's' : ''}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {take.casework.plans.map((plan) => (
            <Panel key={plan.material} title={`${plan.label} — ${plan.sheetCount} sheet${plan.sheetCount === 1 ? '' : 's'}`}
              eyebrow={`Nested at ${plan.yieldPct}% yield · 4×8 · 1/8" kerf`}>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                {plan.sheets.map((sheet) => (
                  <div key={sheet.index}>
                    <svg viewBox="0 0 48 96" style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 4, background: 'var(--ink-2)', display: 'block' }}>
                      {sheet.parts.map((part, i) => (
                        <g key={i}>
                          <rect x={part.x} y={part.y} width={part.w} height={part.h}
                            fill={i % 2 ? 'rgba(200,169,74,0.5)' : 'rgba(200,169,74,0.32)'} stroke="#0A0A0A" strokeWidth={0.3} />
                          {part.w > 7 && part.h > 4 && (
                            <text x={part.x + part.w / 2} y={part.y + part.h / 2 + 1.1} textAnchor="middle" fontSize={2.6}
                              fill="#F5F0E8" fontFamily="'JetBrains Mono', monospace">
                              {Math.round(part.w)}×{Math.round(part.h)}
                            </text>
                          )}
                        </g>
                      ))}
                    </svg>
                    <div className="faint" style={{ fontSize: 11, marginTop: 4, textAlign: 'center' }}>
                      Sheet {sheet.index + 1} · {sheet.parts.length} parts · {sheet.wastePct}% waste
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          ))}

          <Panel title="Hardware" eyebrow="Counted from the design">
            <div className="grid three">
              <Stat label="Hinges" value={take.casework.hardware.hinges} note={`${take.casework.doorCount} doors`} />
              <Stat label="Drawer slides" value={`${take.casework.hardware.slidePairs} pr`} note={`${take.casework.drawerCount} drawers`} />
              <Stat label="Pulls" value={take.casework.hardware.pulls || take.casework.hardware.pushLatches} note={take.casework.hardware.pulls ? 'Pulls / knobs' : 'Push latches'} />
              <Stat label="Shelf pins" value={take.casework.hardware.shelfPins} note="4 per adjustable shelf" />
              <Stat label="Levelers" value={take.casework.hardware.levelers} note="Floor-standing runs" />
              <Stat label="Cabinet run" value={`${take.casework.cabinetLf} lf`} note={`${take.casework.shelfColumnCount} shelf columns`} />
            </div>
          </Panel>

          {take.casework.panelSqFt > 0 && (
            <Panel title="Panelling" eyebrow="Slat and backer take-off">
              <div className="grid three">
                <Stat label="Panel area" value={`${take.casework.panelSqFt} sf`} note="Face area of every panel" />
                <Stat label="Slats" value={take.casework.slatCount} note={`${take.casework.slatLf} lf of slat stock`} />
                <Stat label="Backer" value={`${take.casework.backerSheets} sheets`} note="Behind the slats" />
                {take.casework.inlayLf > 0 && <Stat label="Metal reveal" value={`${take.casework.inlayLf} lf`} note={`${Math.ceil(take.casework.inlayLf / 8)} sticks`} />}
                {take.casework.hearthSqFt > 0 && <Stat label="Hearth top" value={`${take.casework.hearthSqFt} sf`} note={`${take.casework.hearthLf} lf of front edge`} />}
              </div>
            </Panel>
          )}
        </div>
      )}

      {tab === 'drywall' && (
        <div className="grid">
          <Panel title="Drywall take-off" eyebrow={take.drywall.sheetLabel} tight>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Surface</th><th className="num">Sq ft</th><th>Note</th></tr></thead>
                <tbody>
                  {take.drywall.breakdown.map((b) => (
                    <tr key={b.label}><td>{b.label}</td><td className="num">{b.sqft}</td><td className="faint">{b.note}</td></tr>
                  ))}
                  <tr className="group"><td>TOTAL</td><td className="num">{take.drywall.totalSqFt}</td><td /></tr>
                </tbody>
              </table>
            </div>
          </Panel>
          <div className="grid three">
            <Stat label="Sheets" value={take.drywall.sheets} note={`${take.drywall.fieldSheets} field + ${take.drywall.returnSheets} returns`} />
            <Stat label="Corner bead" value={`${take.drywall.cornerBeadLf} lf`} note={`${take.drywall.beadSticks} × 8′ sticks`} />
            <Stat label="Tape" value={`${take.drywall.tapeLf} lf`} note={`${take.drywall.tapeRolls} roll(s)`} />
            <Stat label="Joint compound" value={`${take.drywall.mudGal} gal`} note={`${take.drywall.mudBuckets} bucket(s)`} />
            <Stat label="Screws" value={`${take.drywall.screwCount}`} note={`${take.drywall.screwLb} lb`} />
            <Stat label="Primer" value={`${take.drywall.primerGal} gal`} note="PVA, before finish coats" />
          </div>
          <div className="note" style={{ fontSize: 12.5 }}>
            Sheets are counted off the gross wall — you hang over the openings and cut them out — with the returns counted
            separately at a higher waste factor, because small pieces eat board.
          </div>
        </div>
      )}
    </div>
  );
}
