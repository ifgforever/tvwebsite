# Reference build method

The framing generator in `shared/calc/framing.ts` reproduces the construction
method used on the reference job (photos: framing stage and finished wall). The
take-offs, cut list and labor hours are calculated against **this** method, not a
generic partition wall.

## What the reference wall is

A non-structural build-out furred in front of an existing drywall wall, running
floor to ceiling, stopping short of the left corner and dying into the right
corner. 2×4 on edge (3-1/2" framed depth) + 1/2" drywall = 4" finished build-out.

```
 ┌───────────────────────────────────────────────────────────────┐  top plate
 │  ▓ cripples ▓        ▓ cripples ▓         ▓ cripples ▓        │
 │ ╔═════════╗  ┌────────────────────────┐  ╔═════════╗          │  header / rung
 │ ║ niche 1 ║  │                        │  ║ niche 4 ║          │
 │ ╚═════════╝  │                        │  ╚═════════╝          │  sill / rung
 │  ▓ crip ▓    │      TV BLOCKING       │   ▓ crip ▓            │
 │ ╔═════════╗  │   (2 rows + centre)    │  ╔═════════╗          │
 │ ║ niche 2 ║  │                        │  ║ niche 5 ║          │
 │ ╚═════════╝  └────────────────────────┘  ╚═════════╝          │
 │  ▓ crip ▓        soundbar blocking        ▓ crip ▓            │
 │ ╔═════════╗  ┌────────────────────────┐  ╔═════════╗          │
 │ ║ niche 3 ║  │   FIREPLACE OPENING    │  ║ niche 6 ║          │
 │ ╚═════════╝  └────────────────────────┘  ╚═════════╝          │  sill
 │              ║ ║ ║ ║ ║ ║ ║ ║ ║ ║ ║ ║                          │  cripples
 └───────────────────────────────────────────────────────────────┘  bottom plate
```

## Rules the generator follows

1. **Plates** — single top plate (the wall carries no load; a double plate is a
   toggle, not an assumption) and a bottom plate, each the full wall width.
2. **Stud layout** — end stud at each end, interior studs laid out so their
   *centres* land on the 16"/24" module (first mark at 15-1/4"), so sheet edges
   break on framing.
3. **Niche columns frame as a ladder.** Stacked niches share their column
   verticals; each niche contributes a rung above (header) and a rung below
   (sill), and the gaps between stacked niches get cripples — the double
   horizontal members visible between niches in the framing photo.
4. **Rough openings are not finished openings.** A niche rough opening = finished
   size + drywall thickness on all four sides, because the niche returns get
   drywalled. A fireplace rough opening is *never* derived — it is typed in from
   the manufacturer's installation instructions or the wall is flagged.
5. **The base band.** With the fireplace sill above the floor, cripples run from
   the sill down to the bottom plate at layout spacing — the row of short blocks
   along the floor in the framing photo.
6. **Blocking is generated, not remembered.** TV mount blocking is three rows
   (upper VESA, lower VESA, centre band) spanning the panel width + 6" each side,
   cut to fit each stud bay. Soundbar blocking is one row. Mid-height blocking
   fills the bays that nothing else occupies.
7. **Every stick has coordinates,** so the framing drawing, the cut list and the
   board count are the same data viewed three ways.

## Finished wall, for the take-off

Grey painted drywall, baseboard returned across the base, TV centred with a bias
strip, soundbar directly under the TV, linear electric fireplace under that,
three lit niches per side — each niche with a recessed puck at its head and an
RGBW strip behind a front reveal, all fed from one accessible driver/controller
location.
