# Neighborhood page generator

Generates one landing page per official Chicago community area (77 total)
at `/neighborhoods/<slug>.html`, plus a directory/hub page at
`/neighborhoods/index.html`, plus refreshes the root `sitemap.xml`.

## Why this exists

Each page targets searches like "tv mounting [neighborhood] chicago" with:
- a unique `<title>` and meta description
- unique on-page copy (not just the neighborhood name swapped in)
- `Service` + `BreadcrumbList` + `FAQPage` JSON-LD schema scoped to that
  one neighborhood
- links to nearby neighborhoods (internal linking helps Google discover
  and trust all 77 pages)
- the same "Book Your $100 Install" flow as the rest of the site, using
  the existing `?neighborhood=NAME#bookingForm` handoff already wired up
  in `index.html`

## To update content

Edit `neighborhoods/data.json` — each entry has a `name` and a `blurb`.
Then re-run:

```bash
python3 scripts/generate_neighborhood_pages.py
```

This overwrites every file in `/neighborhoods/*.html` and `sitemap.xml`.
It's safe to re-run as often as you want — it's fully regenerated from
`data.json` each time, so don't hand-edit the generated `.html` files
directly or your changes will be lost on the next run.

## Adding a neighborhood / fixing a name

`neighborhoods/data.json` is grouped by the same nine "sides of the city"
used in `challenge.html`'s `GROUPS` array. If you ever change a name
there, change it in `data.json` too so the two stay in sync (both use the
same `slugify()` logic to build URLs — Python version in this script,
JS version in `challenge.html`).

## After running

1. Commit `neighborhoods/`, `sitemap.xml`, and any changed root files.
2. Push to GitHub — Cloudflare Pages will redeploy automatically.
3. In Google Search Console, submit `https://tvserviceschicago.com/sitemap.xml`
   (or just wait — it'll get picked up, but submitting speeds it up).
4. Consider adding the same `areaServed` list to your Google Business
   Profile so it matches what's on the site.
