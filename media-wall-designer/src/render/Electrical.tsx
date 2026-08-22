/**
 * Electrical / low-voltage plan.
 *
 * Shows intent and location only. Circuit sizing, load calculation, box fill and
 * permitting are the licensed electrician's call — printed on the sheet.
 */
import type { Design, DeviceComponent } from '@shared/types';
import { calcElectrical } from '@shared/calc/electrical';
import { inchesToFeet, inchesToFraction } from '@shared/units';
import { DimV, DrawTitle, styleFor, type DrawTheme } from './drawing';

const SYMBOL_LABEL: Record<string, string> = {
  receptacle: 'DUPLEX RECEPTACLE',
  recessed_receptacle: 'RECESSED TV BOX (POWER + LV)',
  quad_receptacle: 'QUAD RECEPTACLE',
  switch: 'SWITCH',
  dimmer: 'DIMMER / LIGHTING CONTROL',
  low_volt_plate: 'LOW-VOLTAGE PLATE',
  hdmi: 'HDMI',
  ethernet: 'ETHERNET',
  conduit_port: 'CONDUIT PORT',
  junction_box: 'JUNCTION BOX',
  led_driver: 'LED DRIVER / CONTROLLER',
  led_controller: 'LED CONTROLLER',
  equipment_bay: 'EQUIPMENT LOCATION',
};

export function DeviceSymbol({ kind, size, color, bg }: { kind: string; size: number; color: string; bg: string }) {
  const r = size / 2;
  switch (kind) {
    case 'receptacle':
    case 'quad_receptacle':
      return (
        <g>
          <circle r={r} fill={bg} stroke={color} strokeWidth={size * 0.09} />
          <line x1={-r * 0.4} y1={-r * 0.45} x2={-r * 0.4} y2={r * 0.45} stroke={color} strokeWidth={size * 0.09} />
          <line x1={r * 0.4} y1={-r * 0.45} x2={r * 0.4} y2={r * 0.45} stroke={color} strokeWidth={size * 0.09} />
        </g>
      );
    case 'recessed_receptacle':
      return (
        <g>
          <rect x={-r} y={-r} width={size} height={size} rx={size * 0.12} fill={bg} stroke={color} strokeWidth={size * 0.09} />
          <circle r={r * 0.42} fill="none" stroke={color} strokeWidth={size * 0.08} />
          <line x1={-r * 0.75} y1={r * 0.72} x2={r * 0.75} y2={r * 0.72} stroke={color} strokeWidth={size * 0.08} />
        </g>
      );
    case 'switch':
    case 'dimmer':
      return (
        <g>
          <circle r={r} fill={bg} stroke={color} strokeWidth={size * 0.09} />
          <text y={r * 0.42} fontSize={size * 0.95} fill={color} textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontWeight={700}>
            {kind === 'dimmer' ? 'D' : 'S'}
          </text>
        </g>
      );
    case 'low_volt_plate':
    case 'hdmi':
    case 'ethernet':
      return (
        <g>
          <path d={`M0 ${-r} L${r} ${r} L${-r} ${r} Z`} fill={bg} stroke={color} strokeWidth={size * 0.09} />
          <text y={r * 0.7} fontSize={size * 0.6} fill={color} textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontWeight={700}>LV</text>
        </g>
      );
    case 'junction_box':
    case 'led_driver':
    case 'led_controller':
      return (
        <g>
          <rect x={-r} y={-r * 0.8} width={size} height={size * 0.8} fill={bg} stroke={color} strokeWidth={size * 0.09} />
          <text y={r * 0.2} fontSize={size * 0.58} fill={color} textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontWeight={700}>
            {kind === 'junction_box' ? 'J' : 'DR'}
          </text>
        </g>
      );
    default:
      return <rect x={-r} y={-r} width={size} height={size} fill={bg} stroke={color} strokeWidth={size * 0.09} strokeDasharray={`${size * 0.2} ${size * 0.15}`} />;
  }
}

export function ElectricalDrawing({ design, theme = 'screen', className, style, showLegend = true }: {
  design: Design; theme?: DrawTheme; className?: string; style?: React.CSSProperties; showLegend?: boolean;
}) {
  const s = styleFor(theme);
  const { wall } = design;
  const W = wall.widthIn;
  const H = wall.heightIn;
  const u = Math.max(2.4, W * 0.02);
  const padL = u * 10, padR = showLegend ? u * 26 : u * 8, padT = u * 11, padB = u * 12;
  const sy = (y: number, h = 0) => H - y - h;
  const el = calcElectrical(design);

  const devices = design.components.filter(
    (c): c is DeviceComponent => c.type === 'outlet' || c.type === 'lowvolt' || c.type === 'switch' || c.type === 'junction' || c.type === 'equipment',
  );
  const symSize = Math.max(u * 1.9, 4);
  const driver = devices.find((d) => d.props.kind === 'led_driver');
  const niches = design.components.filter((c) => c.type === 'niche');
  const kinds = [...new Set(devices.map((d) => d.props.kind))];

  return (
    <svg viewBox={`${-padL} ${-padT} ${W + padL + padR} ${H + padT + padB}`} className={className} style={style} preserveAspectRatio="xMidYMid meet">
      {theme === 'print' && <rect x={-padL} y={-padT} width={W + padL + padR} height={H + padT + padB} fill="#fff" />}

      <DrawTitle x={-padL + u} y={-padT + u * 3} title="ELECTRICAL / LOW-VOLTAGE PLAN" sub={`${el.lineVoltageDevices} LINE-VOLTAGE · ${el.lowVoltageDevices} LOW-VOLTAGE · ${el.circuits.length} CIRCUIT(S)`} s={s} size={u} />

      {/* Wall and openings ghosted so the devices read */}
      <rect x={0} y={0} width={W} height={H} fill={theme === 'print' ? '#FCFBF8' : 'rgba(76,123,168,0.05)'} stroke={s.line} strokeWidth={u * 0.14} />
      {design.components.filter((c) => ['niche', 'fireplace', 'tv', 'soundbar'].includes(c.type)).map((c) => (
        <g key={c.id}>
          <rect x={c.x} y={sy(c.y + c.h)} width={c.w} height={c.h} fill="none" stroke={s.lineLight} strokeWidth={u * 0.07} strokeDasharray={`${u * 0.7} ${u * 0.5}`} opacity={0.8} />
          {(c.type === 'tv' || c.type === 'fireplace') && (
            <text x={c.x + c.w / 2} y={sy(c.y + c.h) + c.h / 2} fill={s.lineLight} fontSize={u * 0.85} textAnchor="middle" fontFamily="'JetBrains Mono', monospace" opacity={0.85}>
              {c.type === 'tv' ? 'TV' : 'FIREPLACE'}
            </text>
          )}
        </g>
      ))}

      {/* Home run */}
      <path d={`M${u * 2} ${sy(6)} L${-u * 5} ${sy(6)}`} stroke={s.accent} strokeWidth={u * 0.12} strokeDasharray={`${u * 1.4} ${u * 0.5}`} fill="none" />
      <path d={`M${-u * 5} ${sy(6)} l${u * 1.2} ${-u * 0.6} M${-u * 5} ${sy(6)} l${u * 1.2} ${u * 0.6}`} stroke={s.accent} strokeWidth={u * 0.12} fill="none" />
      <text x={-u * 5.2} y={sy(6) - u * 0.8} fill={s.accent} fontSize={u * 0.75} textAnchor="end" fontFamily="'JetBrains Mono', monospace">
        HOME RUN TO PANEL
      </text>

      {/* Low-voltage conduit from the TV box down to the equipment location */}
      {(() => {
        const tvBox = devices.find((d) => d.props.kind === 'low_volt_plate' || d.props.kind === 'recessed_receptacle');
        const eq = devices.find((d) => d.props.kind === 'equipment_bay');
        if (!tvBox || !eq) return null;
        const x1 = tvBox.x + tvBox.w / 2, y1 = sy(tvBox.y + tvBox.h / 2);
        const x2 = eq.x + eq.w / 2, y2 = sy(eq.y + eq.h / 2);
        return (
          <g>
            <path d={`M${x1} ${y1} L${x1} ${y2 - u * 2} Q ${x1} ${y2} ${x1 + Math.sign(x2 - x1) * u * 2} ${y2} L${x2} ${y2}`}
              stroke={s.lineLight} strokeWidth={u * 0.13} fill="none" strokeDasharray={`${u * 0.9} ${u * 0.55}`} />
            <text x={(x1 + x2) / 2} y={y2 - u * 0.8} fill={s.dim} fontSize={u * 0.68} textAnchor="middle" fontFamily="'JetBrains Mono', monospace">
              1" CONDUIT — HDMI + CAT6
            </text>
          </g>
        );
      })()}

      {/* Niche lighting runs back to the driver */}
      {driver && niches.map((n) => (
        <path key={`run-${n.id}`}
          d={`M${n.x + n.w / 2} ${sy(n.y)} L${n.x + n.w / 2} ${sy(2)} L${driver.x + driver.w / 2} ${sy(2)} L${driver.x + driver.w / 2} ${sy(driver.y)}`}
          stroke={theme === 'print' ? '#A8862B' : '#C8A94A'} strokeWidth={u * 0.08} fill="none" opacity={0.65} strokeDasharray={`${u * 0.45} ${u * 0.45}`} />
      ))}

      {/* Devices */}
      {devices.map((d) => (
        <g key={d.id} transform={`translate(${d.x + d.w / 2}, ${sy(d.y + d.h / 2)})`}>
          <DeviceSymbol kind={d.props.kind} size={symSize} color={d.props.lineVoltage ? (theme === 'print' ? '#A8471F' : '#F08B54') : (theme === 'print' ? '#14110B' : '#B8CBDC')} bg={theme === 'print' ? '#fff' : '#0C1017'} />
          <text y={symSize * 0.95} fontSize={u * 0.66} fill={s.text} textAnchor="middle" fontFamily="'JetBrains Mono', monospace">{d.label}</text>
          <text y={symSize * 0.95 + u * 0.85} fontSize={u * 0.6} fill={s.dim} textAnchor="middle" fontFamily="'JetBrains Mono', monospace">
            {inchesToFraction(d.y + d.h / 2)} AFF{d.props.circuit ? ` · CKT ${d.props.circuit}` : ''}
          </text>
        </g>
      ))}

      {/* Mounting heights for the line-voltage devices */}
      {devices.filter((d) => d.props.lineVoltage).slice(0, 3).map((d, i) => (
        <DimV key={d.id} y1={sy(0)} y2={sy(d.y + d.h / 2)} x={-u * (3 + i * 2.4)} s={s} size={u * 0.8} left />
      ))}

      {showLegend && (
        <g transform={`translate(${W + u * 3}, ${u})`}>
          <text x={0} y={0} fill={s.text} fontSize={u * 1.15} fontFamily="'Bebas Neue', sans-serif" letterSpacing={u * 0.05}>SYMBOLS</text>
          {kinds.map((k, i) => (
            <g key={k} transform={`translate(${symSize * 0.6}, ${u * (3 + i * 2.6)})`}>
              <DeviceSymbol kind={k} size={symSize * 0.85} color={theme === 'print' ? '#14110B' : '#B8CBDC'} bg={theme === 'print' ? '#fff' : '#0C1017'} />
              <text x={symSize * 1.3} y={u * 0.3} fill={s.text} fontSize={u * 0.72} fontFamily="'JetBrains Mono', monospace">{SYMBOL_LABEL[k] || k}</text>
            </g>
          ))}
          <g transform={`translate(0, ${u * (4.6 + kinds.length * 2.6)})`}>
            <text x={0} y={0} fill={s.text} fontSize={u * 1.15} fontFamily="'Bebas Neue', sans-serif" letterSpacing={u * 0.05}>SCHEDULE</text>
            {[
              `${el.circuits.length} circuit(s): ${el.circuits.join(', ')}`,
              `${el.romexFt}' NM-B · ${el.cat6Ft}' Cat6 · ${el.conduitFt}' conduit`,
              `${el.puckCount} puck lights · ${el.stripFt}' LED strip`,
              `${el.drivers} driver(s), ${el.driverWatts} W connected`,
              `${el.controllers} controller(s)`,
            ].map((l, i) => (
              <text key={i} x={0} y={u * (2 + i * 1.35)} fill={s.dim} fontSize={u * 0.72} fontFamily="'JetBrains Mono', monospace">{l}</text>
            ))}
          </g>
          <g transform={`translate(0, ${u * (12 + kinds.length * 2.6)})`}>
            <text x={0} y={0} fill={theme === 'print' ? '#A8471F' : '#F08B54'} fontSize={u * 1.05} fontFamily="'Bebas Neue', sans-serif" letterSpacing={u * 0.05}>REQUIRED</text>
            {[
              'All line-voltage work by a licensed',
              'electrician. Permit and inspection as',
              'required by the AHJ.',
              'Circuit sizing, load calc, box fill and',
              'AFCI/GFCI by the electrician.',
              'Drivers and splices must stay accessible.',
              'Fireplace circuit per the manufacturer.',
            ].map((l, i) => (
              <text key={i} x={0} y={u * (1.9 + i * 1.3)} fill={s.dim} fontSize={u * 0.7} fontFamily="'JetBrains Mono', monospace">{l}</text>
            ))}
          </g>
        </g>
      )}

      <text x={-padL + u} y={H + padB - u * 1.5} fill={s.dim} fontSize={u * 0.7} fontFamily="'JetBrains Mono', monospace">
        WALL {inchesToFeet(W)} × {inchesToFeet(H)} · DEVICE LOCATIONS SHOWN ARE DESIGN INTENT — FIELD-VERIFY BEFORE ROUGH-IN
      </text>
    </svg>
  );
}
