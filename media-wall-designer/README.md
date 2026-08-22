# Media Wall Designer

A field tool for TV Install Chicago (tvserviceschicago.com): take a customer from a blank wall to a
dimensioned design, a realistic preview, a construction drawing set, a material
list, an optimised cut list, a priced estimate and a printable proposal — in one
sitting, on a phone, in somebody's living room.

**The dimensioned construction model is the source of truth.** Drawings,
quantities, cuts, prices and AI renderings are all derived from it. Nothing is
ever measured back out of an image.

---

## Run it

```bash
cd media-wall-designer
npm install
npm run db:migrate:local     # creates the local D1 database
npm run dev                  # UI on :5173, Worker API on :8787
```

Open <http://localhost:5173>. The UI proxies `/api` to the Worker, so both
halves are live with hot reload.

To run the built app exactly as it deploys (Worker serving the static build):

```bash
npm run preview              # builds, then serves everything on :8787
```

Useful extras:

```bash
npm test                     # 36 assertions over the calculation engine
npm run typecheck            # both tsconfigs — app and worker
npm run calc                 # prints the whole take-off for a default project
npm run icons                # regenerates the PWA icons from public/icon.svg
npm run build:demo           # one self-contained HTML file, no server needed
```

`npm run build:demo` produces `demo/media-wall-designer.html` — the whole app in
a single file. Open it by double-clicking, put it on a phone, or host it
anywhere. With no API behind it the repository layer falls back to IndexedDB, so
every screen works and everything saves in that browser. Useful for showing the
tool without standing up infrastructure.

## Deploy to Cloudflare

The app is a **Worker with static assets** — one deploy, no separate Pages
project, D1 bound directly.

```bash
npx wrangler d1 create media_wall_designer
# paste the returned database_id into wrangler.toml

npm run db:migrate:remote
npm run deploy
```

Optional bindings:

| Binding | What it does | Without it |
|---|---|---|
| `PHOTOS` (R2) | Full-resolution photo storage | Photos are downscaled client-side and stored in D1 (< 0.9 MB each) |
| `AI_IMAGE_PROVIDER` + `AI_IMAGE_API_KEY` | Photoreal AI renderings | The deterministic vector renderer is used — everything else works |

```bash
npx wrangler r2 bucket create media-wall-photos   # then uncomment [[r2_buckets]]
npx wrangler secret put AI_IMAGE_API_KEY
```

AI providers are pluggable in `worker/routes/renderings.ts` — `openai`,
`stability`, `replicate`, or `custom` (any endpoint taking `{prompt}` and
returning `{image_b64}` or `{url}`). Adding one is a single function.

## Where things live

```
shared/            Pure, dependency-free — runs in the browser AND the Worker
  types.ts         The design model. Read this first.
  units.ts         Inch maths, feet-inches-sixteenths, "8' 2-1/2"" parsing
  geometry.ts      Snapping, alignment, distribution, niche-bank layout
  catalog.ts       TV sizes, materials, prices, labor rates, suppliers
  defaults.ts      Project/design factories — the reference-build preset
  calc/
    framing.ts     Every stud, plate, header, sill, cripple and block
    drywall.ts     Face, returns, sheets, bead, tape, mud, screws
    electrical.ts  Devices, circuits, wire, LED drivers
    materials.ts   Bill of materials (calls the four above)
    cutlist.ts     Cut grouping + board optimiser (FFD w/ look-ahead, kerf)
    estimate.ts    Derived labor hours, price, margin
    sourcing.ts    BOM regrouped by supplier
    packages.ts    Good / Better / Best — three real designs
    validate.ts    Safety, code and buildability gates
  ai/prompt.ts     Builds the render prompt FROM the model

worker/            Cloudflare Worker (Hono)
  index.ts         Routes /api/*, everything else falls through to the SPA
  db.ts            D1 mapping — components stored normalised, not as a blob
  routes/          projects · photos · renderings

src/               React SPA
  lib/             api (server + offline transports), store (undo/redo), image,
                   homography, format
  designer/        DesignCanvas (drag/resize/snap), Inspector
  render/          WallVector (realistic) · Elevation · Framing · Electrical
  screens/         One per workflow step, 01 → 09
  styles/          app.css (screen) · print.css (proposal + plan sheets)

migrations/        D1 schema
docs/              ARCHITECTURE.md — the coordinate system and pipeline
reference/         BUILD-METHOD.md — the construction the generator reproduces
```

## The workflow

| Step | Screen | What it does |
|---|---|---|
| 01 | Customer | Name, address, phone, email, status, notes, photos |
| 02 | Wall photo | Camera or upload, straighten, mark the four wall corners, enter real dimensions |
| 03 | Designer | Drag/resize/snap in real inches; wall, TV, fireplace, niches, lighting, devices |
| 04 | Before / after | The design composited onto the customer's own photo in perspective; optional AI pass |
| 05 | Drawings | Dimensioned elevation, framing plan, electrical plan, schedules, checks |
| 06 | Materials & cuts | Bill of materials, drywall take-off, optimised cut list with cutting diagram |
| 07 | Sourcing | The same list regrouped by supplier, with subtotals, search links and check-offs |
| 08 | Estimate | Derived labor hours, pricing controls, profit, Good / Better / Best |
| 09 | Print package | Customer proposal (Letter) or construction set (Letter / 11×17 / 24×36) |

## Coordinate system

Inches, decimal, **y-up**, origin at the bottom-left of the feature wall at
finished floor. Every component stores its bottom-left corner plus width,
height and recess depth. Screen rendering flips y in exactly one place
(`shared/geometry.ts → toScreen`). Full detail in `docs/ARCHITECTURE.md`.

## Things the app refuses to guess

* **Fireplace rough opening and clearances.** Never inferred from the advertised
  size. Until they are typed in from the installation manual and ticked as
  verified, every sheet prints `NOT FOR CONSTRUCTION`.
* **Whether the wall is load-bearing.** Asked, never assumed.
* **Structural adequacy and code compliance.** Not claimed anywhere. Electrical
  work is flagged for a licensed electrician throughout.
* **What is inside the existing wall.** Flagged on every project.

Manufacturer specifications override calculated assumptions, everywhere.

## Offline

The app is a PWA. If the Worker is unreachable it transparently switches to
IndexedDB, shows an "offline — saved locally" state, and pushes everything the
next time the API answers. Photos taken offline queue as blobs and upload on
reconnect.

## Built for later

The architecture leaves room for the next things without rework: perspective
matching (the homography is already there), 3-D, material catalogues, supplier
pricing feeds, e-signature, payments and CRM all hang off the same model. The
one rule holds: they consume the dimensioned model, they never become it.
