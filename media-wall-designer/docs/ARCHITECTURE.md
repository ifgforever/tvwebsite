# Media Wall Designer — Architecture

## 0. The one rule

**The dimensioned construction model is the source of truth.**

Every drawing, quantity, cut, price and proposal in this app is a pure function of
a single JSON document (`Design`) whose every object carries real inches and real
coordinates. The photorealistic preview — vector or AI — is a *view* of that model.
No measurement is ever read back out of an image.

```
Design (inches)
  ├─► Elevation drawing        (SVG, dimensioned)
  ├─► Framing plan             (derived members → SVG + cut list)
  ├─► Electrical / low-voltage (derived + manual devices → SVG)
  ├─► Drywall take-off         (areas, returns, sheets)
  ├─► Bill of materials        (quantities × waste × unit cost)
  ├─► Cut list                 (member lengths → FFD board optimiser)
  ├─► Estimate                 (materials + labor + markup + tax)
  ├─► Good / Better / Best     (three derived designs, three prices)
  ├─► Vector realistic preview (deterministic, offline)
  └─► AI rendering             (optional; prompt built FROM the model)
```

## 1. Coordinate system

Elevation space. One unit = **one inch**. Decimal inches internally, displayed as
feet-inches-sixteenths.

```
        y ▲  (up, inches above finished floor)
          │
          │      ┌───────────────────────────┐  ← wall.heightIn
          │      │      feature wall         │
          │      │                           │
          │      └───────────────────────────┘
   (0,0)  └──────┬───────────────────────────┬────► x  (right, inches)
            wall.offsetXIn              offsetX + wall.widthIn
```

* **Origin** = bottom-left corner of the *feature wall* (the built-out wall), at
  finished floor level.
* `x` increases right, `y` increases **up**. Screen rendering flips y once, in
  one place (`shared/geometry.ts → toScreen`).
* Every `DesignComponent` stores `x, y` as its **bottom-left corner**, plus
  `w, h` (elevation size) and `depthIn` (recess into the wall, +z away from the room).
* `z` = 0 at the **finished front face** of the feature wall. Depth increases
  *into* the wall toward the existing structure. A niche with `depthIn: 3.5`
  has its back face 3.5" behind the finished face.
* `wall.offsetXIn` positions a partial feature wall inside a wider room wall
  (the real-world case in `reference/` — the wall stops short of the left corner
  and dies into the right corner).

Rounding: all user-facing dimensions snap to 1/16" (`ROUND_TO = 0.0625`).

## 2. Data model

```
Project ── Wall ── Component[]  (tv | fireplace | niche | soundbar | shelf |
   │                             outlet | lowvolt | switch | junction |
   │                             equipment | blocking | custom)
   ├── LightingZone[]
   ├── Photo[]        (before / after / reference / rendering source)
   ├── Rendering[]    (AI variations, each pinned to a design revision)
   ├── Revision[]     (JSON snapshots — history, restore, audit)
   └── EstimateSettings (labor rates, markup, tax, discount, per-line overrides)
```

Components are stored **normalised** in D1 — `x_in`, `y_in`, `w_in`, `h_in`,
`depth_in` are real columns, not JSON — so the database can be queried and
reported on. Type-specific fields live in `props_json`. A full JSON snapshot is
also written to `revisions` on every save for history and offline sync.

Everything downstream (framing members, drywall areas, materials, cuts, prices)
is **derived at read time** and never stored as truth. Change the wall width and
every dependent number recalculates in the same tick.

## 3. Calculation pipeline

`shared/calc/*` are pure, dependency-free functions — same code runs in the
browser (live UI) and in the Worker (PDF/API). Each stage consumes the stage
above it:

| Module | In | Out |
|---|---|---|
| `framing.ts` | Design | `FramingMember[]` (every stud, plate, header, sill, cripple, ladder rung, blocking) with real x/y/length |
| `drywall.ts` | Design | face area, niche/fireplace/side returns, sheets, bead, tape, mud, screws |
| `electrical.ts` | Design | devices, circuits, home-run lengths, LED driver/controller counts |
| `materials.ts` | all above | `BomLine[]` grouped Framing / Drywall / Electrical / Low-voltage / Finish |
| `cutlist.ts` | `FramingMember[]` | grouped cuts + first-fit-decreasing board optimisation w/ kerf |
| `estimate.ts` | BOM + labor | material cost, labor, markup, tax, discount, price, profit |
| `packages.ts` | Design | Good / Better / Best variants + three prices |
| `validate.ts` | Design | blocking issues, warnings, verification gates |

## 4. Client / server split

* **Client** (React + Vite SPA, `src/`) holds the working design in memory with
  undo/redo, recalculates derived data on every keystroke, and autosaves.
* **Worker** (`worker/`, Hono on Cloudflare Workers) is the persistence and
  integration boundary: D1 for structured data, R2 (optional) for photos,
  AI image provider (optional) for renderings.
* **Offline**: the app is a PWA. If `/api/health` fails the repository layer
  transparently switches to IndexedDB so a basement with no signal is still a
  working sales call; projects created offline are pushed on reconnect.

## 5. What is deliberately *not* automated

The app never claims structural or code compliance. Load-bearing determination,
fireplace rough-opening and clearances, and all electrical work are gated behind
explicit human verification (`validate.ts`), and manufacturer values always
override calculated assumptions.
