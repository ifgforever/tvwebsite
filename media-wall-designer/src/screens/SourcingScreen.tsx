/**
 * Material sourcing — the shopping run.
 *
 * The same bill of materials, regrouped by where you actually buy it, with a
 * per-stop subtotal, a check-off list for the truck, and a search link per line.
 */
import { useMemo, useState } from 'react';
import { SUPPLIERS, type SupplierId } from '@shared/catalog';
import { computeTakeOff } from '@shared/calc/materials';
import { buildSourcing, sourcingToText } from '@shared/calc/sourcing';
import { money } from '@shared/units';
import { store, useStore } from '../lib/store';
import { CopyButton, Panel, Pill, Stat, toast } from '../components/ui';
import { Icon } from '../components/icons';

export function SourcingScreen() {
  const { project, sourcingOverrides } = useStore();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  if (!project) return null;

  const take = useMemo(() => computeTakeOff(project.design, project.estimateSettings), [project.design, project.estimateSettings]);
  const sourcing = useMemo(
    () => buildSourcing(take.bom, sourcingOverrides as Record<string, SupplierId>, project.estimateSettings.excludedSkus),
    [take.bom, sourcingOverrides, project.estimateSettings.excludedSkus],
  );

  const text = sourcingToText(sourcing, `${project.name}${project.customer.name ? ` — ${project.customer.name}` : ''}`);
  const doneCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="content">
      <div className="grid three" style={{ marginBottom: 14 }}>
        <Stat label="Material total" value={money(sourcing.grandTotal)} note={`${sourcing.lineCount} line items`} />
        <Stat label="Stops" value={sourcing.stops} note="Suppliers to visit or order from" />
        <Stat label="Picked" value={`${doneCount}/${sourcing.lineCount}`} note="Checked off on this device" />
      </div>

      <div className="row wrap no-print" style={{ marginBottom: 14 }}>
        <CopyButton text={text} label="Copy the whole list" className="btn" />
        <button className="btn" onClick={() => window.print()}><Icon name="print" size={15} />Print the list</button>
        <a className="btn" href={`sms:?&body=${encodeURIComponent(text.slice(0, 1200))}`}><Icon name="link" size={15} />Text it</a>
        <span className="spacer" />
        <button className="btn ghost sm" onClick={() => setChecked({})}><Icon name="refresh" size={14} />Reset ticks</button>
      </div>

      <div className="grid">
        {sourcing.groups.map((g) => (
          <Panel key={g.supplier} eyebrow={`${g.itemCount} items · ${g.notes}`} title={g.name}
            actions={
              <div className="row">
                <span className="mono gold" style={{ fontSize: 17 }}>{money(g.subtotal)}</span>
              </div>
            } tight>
            <div style={{ height: 3, background: g.accent }} />
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th style={{ width: 36 }} /><th className="num" style={{ width: 76 }}>Buy</th><th>Item</th>
                    <th className="hide-mobile">Why</th><th className="num">Unit</th><th className="num">Extended</th><th style={{ width: 120 }}>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {g.lines.map((l) => (
                    <tr key={l.sku} style={{ opacity: checked[l.sku] ? .45 : 1 }}>
                      <td>
                        <input type="checkbox" checked={!!checked[l.sku]} style={{ width: 19, height: 19, minHeight: 0, accentColor: 'var(--gold)' }}
                          onChange={(e) => setChecked({ ...checked, [l.sku]: e.target.checked })} />
                      </td>
                      <td className="num gold" style={{ fontSize: 15, fontWeight: 700 }}>{l.purchaseQty}<span className="faint" style={{ fontSize: 11, fontWeight: 400 }}> {l.unit}</span></td>
                      <td>
                        <div style={{ textDecoration: checked[l.sku] ? 'line-through' : undefined }}>{l.name}</div>
                        <div className="faint" style={{ fontSize: 11.5 }}>{l.spec}</div>
                      </td>
                      <td className="hide-mobile faint" style={{ fontSize: 11.5, maxWidth: 220 }}>{l.derivedFrom}</td>
                      <td className="num faint">{money(l.unitCost)}</td>
                      <td className="num">{money(l.extended)}</td>
                      <td>
                        <div className="row" style={{ gap: 4 }}>
                          <select value={l.supplier} style={{ minHeight: 30, padding: '3px 22px 3px 6px', fontSize: 12 }}
                            onChange={(e) => { store.setSourcingOverride(l.sku, e.target.value); toast(`${l.name} → ${SUPPLIERS[e.target.value as SupplierId].name}`); }}>
                            {Object.values(SUPPLIERS).map((s) => <option key={s.id} value={s.id}>{s.short}</option>)}
                          </select>
                          {l.searchUrl && (
                            <a className="btn sm icon ghost" href={l.searchUrl} target="_blank" rel="noreferrer" title="Search the supplier">
                              <Icon name="link" size={13} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        ))}
      </div>

      <div className="note" style={{ marginTop: 14, fontSize: 12.5 }}>
        Quantities already include the {project.design.wall.wasteFactorPct}% waste factor and the optimised board count. Prices are
        your editable defaults, not live supplier pricing — change any unit cost on the
        {' '}<strong>Materials</strong> screen and it flows through here and into the estimate.
      </div>
      <div className="row wrap" style={{ marginTop: 10 }}>
        <Pill>Chicago-area defaults</Pill>
        <Pill>Change a supplier and it sticks to this project</Pill>
      </div>
    </div>
  );
}
