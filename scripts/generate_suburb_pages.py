#!/usr/bin/env python3
"""
Generates /suburbs/<slug>.html for each suburb in suburbs/data.json,
plus /suburbs/index.html (hub page), and rebuilds sitemap.xml to
include neighborhoods + suburbs + core pages together.

Usage:
    python3 scripts/generate_suburb_pages.py

Safe to re-run any time you edit suburbs/data.json.
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUBURB_DATA_PATH = os.path.join(ROOT, "suburbs", "data.json")
HOOD_DATA_PATH = os.path.join(ROOT, "neighborhoods", "data.json")
OUT_DIR = os.path.join(ROOT, "suburbs")
SITEMAP_PATH = os.path.join(ROOT, "sitemap.xml")


def slugify(name: str) -> str:
    s = name.lower().replace("'", "")
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def load_suburb_data():
    with open(SUBURB_DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    flat = []
    for g in data["groups"]:
        for h in g["hoods"]:
            flat.append({
                "name": h["name"],
                "blurb": h["blurb"],
                "band": g["band"],
                "slug": slugify(h["name"]),
            })
    return data, flat


PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <link rel="icon" type="image/png" sizes="32x32" href="/public/favicon-32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/public/favicon-16.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/public/favicon-192.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/public/apple-touch-icon-180.png">
    <link rel="shortcut icon" href="/public/favicon.ico">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TV Mounting {name}, IL — $100 Flat Rate | TV Install Chicago</title>
    <meta name="description" content="Professional TV mounting in {name}, IL for a flat $100 — any size, any wall, no hidden fees, no suburban upcharge. Same-day appointments available.">
    <link rel="canonical" href="{domain}/suburbs/{slug}.html">
    <meta property="og:type" content="website">
    <meta property="og:title" content="TV Mounting {name}, IL — $100 Flat Rate | TV Install Chicago">
    <meta property="og:description" content="Professional TV mounting in {name}, IL for a flat $100 — any size, any wall, no hidden fees.">
    <meta property="og:url" content="{domain}/suburbs/{slug}.html">
    <meta property="og:image" content="{domain}/goldtvlogo.webp">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        :root {{
            --ink: #0A0A0A; --paper: #F5F0E8; --paper-dark: #EAE4D4;
            --gold: #C8A94A; --gold-light: #E5C97A; --rust: #C45C2E;
            --slate: #3A4A5C; --slate-light: #6B7E94;
        }}
        * {{ box-sizing: border-box; }}
        body {{ font-family: 'DM Sans', sans-serif; background: var(--ink); color: var(--paper); overflow-x: hidden; margin:0; }}
        .bebas {{ font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.02em; }}
        .ticker-wrap {{ background: var(--gold); overflow: hidden; white-space: nowrap; padding: 10px 0; }}
        .ticker-inner {{ display: inline-block; animation: ticker 22s linear infinite; }}
        @keyframes ticker {{ 0% {{ transform: translateX(0); }} 100% {{ transform: translateX(-50%); }} }}
        .ticker-item {{ display: inline-block; color: var(--ink); font-weight: 700; font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; padding: 0 40px; }}
        .ticker-dot {{ display: inline-block; width: 6px; height: 6px; background: var(--ink); border-radius: 50%; vertical-align: middle; margin-right: 40px; }}
        .breadcrumb {{ font-size:12px; color:var(--slate-light); padding:18px 24px 0; max-width:900px; margin:0 auto; }}
        .breadcrumb a {{ color:var(--slate-light); text-decoration:none; }}
        .breadcrumb a:hover {{ color:var(--gold); }}
        .hero-section {{ background: var(--ink); border-bottom: 1px solid rgba(200,169,74,0.3); position: relative; overflow: hidden; padding: 48px 24px 40px; }}
        .hero-section::before {{ content: '$100'; position: absolute; font-family: 'Bebas Neue', sans-serif; font-size: 38vw; color: rgba(200,169,74,0.04); top: 50%; left: 50%; transform: translate(-50%, -50%); white-space: nowrap; pointer-events: none; line-height: 1; }}
        .hero-eyebrow {{ color: var(--slate-light); font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600; }}
        .hero-title {{ font-family: 'Bebas Neue', sans-serif; font-size: clamp(38px, 7vw, 76px); color: var(--paper); letter-spacing: 0.02em; line-height: 1.02; margin: 10px 0 6px; }}
        .hero-title span {{ color: var(--gold); }}
        .hero-price {{ font-family: 'Bebas Neue', sans-serif; font-size: clamp(60px, 12vw, 120px); line-height: 0.9; background: linear-gradient(135deg, #E5C97A 0%, #C8A94A 40%, #F0D890 70%, #C8A94A 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; margin-top:8px; }}
        .content-wrap {{ max-width: 900px; margin: 0 auto; padding: 40px 24px; position:relative; z-index:1; }}
        .content-card {{ background:#0F0F0F; border:1px solid rgba(200,169,74,0.2); border-radius:4px; padding:32px; margin-bottom:28px; }}
        .content-card h2 {{ font-family:'Bebas Neue',sans-serif; font-size:26px; color:var(--gold); letter-spacing:0.03em; margin:0 0 14px; }}
        .content-card p {{ color:var(--slate-light); font-size:15px; line-height:1.75; margin:0 0 12px; }}
        .content-card p:last-child {{ margin-bottom:0; }}
        .promise-strip {{ background: var(--paper); color: var(--ink); display: grid; grid-template-columns: repeat(3, 1fr); border-radius:4px; overflow:hidden; margin-bottom:28px; }}
        .promise-item {{ padding: 24px 20px; border-right: 1px solid var(--paper-dark); text-align: center; }}
        .promise-item:last-child {{ border-right: none; }}
        .promise-number {{ font-family: 'Bebas Neue', sans-serif; font-size: 42px; color: var(--rust); line-height: 1; }}
        .promise-label {{ font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--slate); font-weight: 600; margin-top: 4px; }}
        .faq-item {{ border-bottom:1px solid rgba(200,169,74,0.12); padding:16px 0; }}
        .faq-item:last-child {{ border-bottom:none; padding-bottom:0; }}
        .faq-q {{ font-weight:600; color:var(--paper); font-size:14px; margin-bottom:6px; }}
        .faq-a {{ color:var(--slate-light); font-size:14px; line-height:1.65; }}
        .nearby-list {{ display:flex; flex-wrap:wrap; gap:8px; }}
        .nearby-pill {{ display:inline-block; background:#161616; border:1px solid rgba(200,169,74,0.25); color:var(--paper); padding:8px 16px; border-radius:20px; font-size:13px; text-decoration:none; transition:border-color 0.2s, color 0.2s; }}
        .nearby-pill:hover {{ border-color:var(--gold); color:var(--gold); }}
        .cta-btn {{ background: var(--gold); color: var(--ink); border: 2px solid var(--gold); font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 0.08em; padding: 18px 32px; border-radius: 3px; cursor: pointer; width: 100%; transition: background 0.2s, color 0.2s; display: block; text-align: center; text-decoration:none; }}
        .cta-btn:hover {{ background: transparent; color: var(--gold); }}
        .site-footer {{ background: #050505; border-top: 1px solid rgba(200,169,74,0.15); padding: 40px 24px; text-align: center; }}
        .contact-pill {{ display: inline-flex; align-items: center; gap: 8px; background: #161616; border: 1px solid rgba(200,169,74,0.2); color: var(--paper); padding: 12px 24px; border-radius: 3px; font-size: 14px; font-weight: 500; text-decoration: none; transition: border-color 0.2s, color 0.2s; }}
        .contact-pill:hover {{ border-color: var(--gold); color: var(--gold); }}
    </style>
    <script type="application/ld+json">
    {{
      "@context": "https://schema.org",
      "@type": "Service",
      "serviceType": "TV Mounting and Wall Installation",
      "provider": {{
        "@type": "LocalBusiness",
        "name": "TV Install Chicago",
        "telephone": "{phone}",
        "email": "{email}",
        "image": "{domain}/goldtvlogo.webp",
        "priceRange": "$100",
        "address": {{ "@type": "PostalAddress", "addressLocality": "Chicago", "addressRegion": "IL", "addressCountry": "US" }}
      }},
      "areaServed": {{ "@type": "Place", "name": "{name}, IL" }},
      "offers": {{ "@type": "Offer", "price": "100", "priceCurrency": "USD" }}
    }}
    </script>
    <script type="application/ld+json">
    {{
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {{ "@type": "ListItem", "position": 1, "name": "Home", "item": "{domain}/" }},
        {{ "@type": "ListItem", "position": 2, "name": "Suburbs", "item": "{domain}/suburbs/index.html" }},
        {{ "@type": "ListItem", "position": 3, "name": "{name}", "item": "{domain}/suburbs/{slug}.html" }}
      ]
    }}
    </script>
    <script type="application/ld+json">
    {{
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {{
          "@type": "Question",
          "name": "Do you install TVs in {name}?",
          "acceptedAnswer": {{ "@type": "Answer", "text": "Yes — we install and mount TVs throughout {name} and the surrounding area, usually with same-day or next-day availability." }}
        }},
        {{
          "@type": "Question",
          "name": "How much does TV mounting cost in {name}?",
          "acceptedAnswer": {{ "@type": "Answer", "text": "$100 flat, for any TV of any size, on any standard wall — no suburban upcharge. Optional add-ons like a tilting or full-motion mount or in-wall wire concealment are priced separately." }}
        }},
        {{
          "@type": "Question",
          "name": "Is there a trip fee to come to {name}?",
          "acceptedAnswer": {{ "@type": "Answer", "text": "No. The $100 flat rate applies everywhere we serve, including {name} — no trip charges, no hidden fees." }}
        }}
      ]
    }}
    </script>
</head>
<body>

<div class="ticker-wrap">
    <div class="ticker-inner">
        <span class="ticker-item">$100 Flat Rate</span><span class="ticker-dot"></span>
        <span class="ticker-item">Any TV. Any Size.</span><span class="ticker-dot"></span>
        <span class="ticker-item">Professional Install</span><span class="ticker-dot"></span>
        <span class="ticker-item">TV Mounting {name}</span><span class="ticker-dot"></span>
        <span class="ticker-item">No Suburban Upcharge</span><span class="ticker-dot"></span>
        <span class="ticker-item">Same Day Available</span><span class="ticker-dot"></span>
        <span class="ticker-item">$100 Flat Rate</span><span class="ticker-dot"></span>
        <span class="ticker-item">Any TV. Any Size.</span><span class="ticker-dot"></span>
        <span class="ticker-item">Professional Install</span><span class="ticker-dot"></span>
        <span class="ticker-item">TV Mounting {name}</span><span class="ticker-dot"></span>
        <span class="ticker-item">No Suburban Upcharge</span><span class="ticker-dot"></span>
        <span class="ticker-item">Same Day Available</span><span class="ticker-dot"></span>
    </div>
</div>

<nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a> &rsaquo; <a href="/suburbs/index.html">Suburbs</a> &rsaquo; {name}
</nav>

<section class="hero-section">
    <div style="max-width:900px; margin:0 auto; position:relative; z-index:1;">
        <p class="hero-eyebrow">{band} &middot; Chicago Suburbs</p>
        <h1 class="hero-title">TV MOUNTING<br><span>{name}, IL</span></h1>
        <div class="hero-price">$100</div>
        <p style="color:var(--slate-light); font-size:15px; max-width:480px; line-height:1.7; margin-top:10px;">Flat rate. Any TV, any size, any wall. Same-day appointments available in {name} &mdash; no suburban upcharge.</p>
    </div>
</section>

<div class="content-wrap">

    <div class="promise-strip">
        <div class="promise-item"><div class="promise-number">$100</div><div class="promise-label">Every TV, Every Time</div></div>
        <div class="promise-item"><div class="promise-number">0</div><div class="promise-label">Hidden Fees, Ever</div></div>
        <div class="promise-item"><div class="promise-number">100%</div><div class="promise-label">Level. Guaranteed.</div></div>
    </div>

    <div class="content-card">
        <h2>TV Mounting in {name}</h2>
        <p>{blurb}</p>
        <p>Same $100 flat rate as everywhere else we serve — mounting hardware included, no size upcharges, no suburban premium for {name}. Optional add-ons like a tilting or full-motion mount, in-wall wire concealment, or soundbar mounting are available if you want them, but the base install is always $100.</p>
    </div>

    <div class="content-card">
        <h2>Frequently Asked</h2>
        <div class="faq-item">
            <div class="faq-q">Do you install TVs in {name}?</div>
            <div class="faq-a">Yes — we install and mount TVs throughout {name} and the surrounding area, usually with same-day or next-day availability.</div>
        </div>
        <div class="faq-item">
            <div class="faq-q">How much does TV mounting cost in {name}?</div>
            <div class="faq-a">$100 flat, for any TV of any size, on any standard wall — no suburban upcharge. Optional add-ons like a tilting or full-motion mount or in-wall wire concealment are priced separately.</div>
        </div>
        <div class="faq-item">
            <div class="faq-q">Is there a trip fee to come to {name}?</div>
            <div class="faq-a">No. The $100 flat rate applies everywhere we serve, including {name} — no trip charges, no hidden fees.</div>
        </div>
    </div>

    <div class="content-card">
        <h2>Nearby Areas</h2>
        <div class="nearby-list">
            {nearby_links}
        </div>
    </div>

    <a href="/?neighborhood={name_url}#bookingForm" class="cta-btn">BOOK YOUR $100 INSTALL &mdash; {name}</a>

</div>

<footer class="site-footer">
    <p class="bebas" style="font-size:28px; color: var(--gold); letter-spacing:0.06em;">TV Install Chicago</p>
    <p style="font-size:11px; text-transform:uppercase; letter-spacing:0.1em; color: var(--slate-light); margin-top:4px;">$100 Flat Rate &middot; Any TV &middot; Any Size &middot; Always</p>
    <div class="flex flex-col sm:flex-row gap-3 justify-center items-center mt-6">
        <a href="tel:{phone}" class="contact-pill">&#128222; {phone_display}</a>
        <a href="mailto:{email}" class="contact-pill">&#9993; {email}</a>
    </div>
    <p style="margin-top:24px; font-size:11px; color: rgba(200,169,74,0.3); letter-spacing:0.05em;">&copy; TV Install Chicago &middot; The $100 Promise</p>
    <p style="margin-top:10px; font-size:11px;"><a href="/suburbs/index.html" style="color:var(--slate-light);">All Suburbs We Serve &rarr;</a> &middot; <a href="/neighborhoods/index.html" style="color:var(--slate-light);">All 77 Chicago Neighborhoods &rarr;</a></p>
</footer>

</body>
</html>
"""


def render_page(hood, flat_by_band, data):
    same_band = [h for h in flat_by_band[hood["band"]] if h["slug"] != hood["slug"]]
    nearby = same_band[:6]
    nearby_links = "\n            ".join(
        f'<a href="/suburbs/{n["slug"]}.html" class="nearby-pill">{n["name"]}</a>' for n in nearby
    )
    return PAGE_TEMPLATE.format(
        name=hood["name"],
        name_url=hood["name"].replace(" ", "%20").replace("'", "%27"),
        band=hood["band"],
        slug=hood["slug"],
        blurb=hood["blurb"],
        nearby_links=nearby_links,
        domain=data["domain"],
        phone=data["phone"],
        email=data["email"],
        phone_display=data["phoneDisplay"],
    )


HUB_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <link rel="icon" type="image/png" sizes="32x32" href="/public/favicon-32.png">
    <link rel="shortcut icon" href="/public/favicon.ico">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TV Mounting in the Chicago Suburbs — $100 Flat Rate | TV Install Chicago</title>
    <meta name="description" content="TV Install Chicago serves the northern Chicago suburbs, from Norridge through Lake Forest, with a flat $100 TV mounting rate. Find your suburb and book same-day service.">
    <link rel="canonical" href="{domain}/suburbs/index.html">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
    <style>
        :root {{ --ink:#0A0A0A; --paper:#F5F0E8; --gold:#C8A94A; --slate-light:#6B7E94; }}
        * {{ box-sizing:border-box; }}
        body {{ font-family:'DM Sans',sans-serif; background:var(--ink); color:var(--paper); margin:0; }}
        .bebas {{ font-family:'Bebas Neue',sans-serif; letter-spacing:0.02em; }}
        .ticker-wrap {{ background: var(--gold); overflow: hidden; white-space: nowrap; padding: 10px 0; }}
        .ticker-inner {{ display:inline-block; animation: ticker 22s linear infinite; }}
        @keyframes ticker {{ 0% {{ transform: translateX(0); }} 100% {{ transform: translateX(-50%); }} }}
        .ticker-item {{ display:inline-block; color:var(--ink); font-weight:700; font-size:13px; letter-spacing:0.12em; text-transform:uppercase; padding:0 40px; }}
        .ticker-dot {{ display:inline-block; width:6px; height:6px; background:var(--ink); border-radius:50%; vertical-align:middle; margin-right:40px; }}
        .hero {{ text-align:center; padding:56px 24px 32px; border-bottom:1px solid rgba(200,169,74,0.2); }}
        .hero h1 {{ font-family:'Bebas Neue',sans-serif; font-size:clamp(38px,7vw,72px); margin:8px 0; letter-spacing:0.03em; }}
        .hero p {{ color:var(--slate-light); font-size:15px; max-width:560px; margin:0 auto; line-height:1.7; }}
        .wrap {{ max-width:1100px; margin:0 auto; padding:40px 24px; }}
        .region-title {{ font-family:'Bebas Neue',sans-serif; font-size:24px; color:var(--gold); letter-spacing:0.05em; margin:36px 0 14px; padding-bottom:8px; border-bottom:1px solid rgba(200,169,74,0.2); }}
        .hood-grid {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:10px; }}
        .hood-link {{ display:block; background:#0F0F0F; border:1px solid rgba(200,169,74,0.15); border-radius:3px; padding:14px 16px; color:var(--paper); text-decoration:none; font-size:14px; transition:border-color 0.2s, color 0.2s, background 0.2s; }}
        .hood-link:hover {{ border-color:var(--gold); color:var(--gold); background:#161616; }}
        .site-footer {{ background:#050505; border-top:1px solid rgba(200,169,74,0.15); padding:36px 24px; text-align:center; }}
        .contact-pill {{ display:inline-flex; align-items:center; gap:8px; background:#161616; border:1px solid rgba(200,169,74,0.2); color:var(--paper); padding:12px 24px; border-radius:3px; font-size:14px; text-decoration:none; }}
    </style>
</head>
<body>
<div class="ticker-wrap"><div class="ticker-inner">
    <span class="ticker-item">$100 Flat Rate</span><span class="ticker-dot"></span>
    <span class="ticker-item">Chicago &amp; The Suburbs</span><span class="ticker-dot"></span>
    <span class="ticker-item">Same Day Available</span><span class="ticker-dot"></span>
    <span class="ticker-item">$100 Flat Rate</span><span class="ticker-dot"></span>
    <span class="ticker-item">Chicago &amp; The Suburbs</span><span class="ticker-dot"></span>
    <span class="ticker-item">Same Day Available</span><span class="ticker-dot"></span>
</div></div>

<div class="hero">
    <p style="font-size:11px; text-transform:uppercase; letter-spacing:0.14em; color:var(--gold); font-weight:700;">North Of The City</p>
    <h1>SUBURBS WE SERVE</h1>
    <p>One flat $100 rate from the city line all the way up through the North Shore &mdash; find your suburb below.</p>
</div>

<div class="wrap">
{regions}
</div>

<footer class="site-footer">
    <p class="bebas" style="font-size:26px; color:var(--gold);">TV Install Chicago</p>
    <div class="flex" style="margin-top:18px; display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
        <a href="tel:{phone}" class="contact-pill">&#128222; {phone_display}</a>
        <a href="mailto:{email}" class="contact-pill">&#9993; {email}</a>
        <a href="/neighborhoods/index.html" class="contact-pill">All 77 Chicago Neighborhoods &rarr;</a>
        <a href="/" class="contact-pill">&larr; Back to Home</a>
    </div>
</footer>
</body>
</html>
"""


def render_hub(data):
    regions_html = []
    for g in data["groups"]:
        links = "\n            ".join(
            f'<a href="/suburbs/{slugify(h["name"])}.html" class="hood-link">{h["name"]}</a>'
            for h in g["hoods"]
        )
        regions_html.append(
            f'    <div class="region-title">{g["band"]}</div>\n'
            f'    <div class="hood-grid">\n            {links}\n    </div>'
        )
    return HUB_TEMPLATE.format(
        domain=data["domain"],
        phone=data["phone"],
        phone_display=data["phoneDisplay"],
        email=data["email"],
        regions="\n".join(regions_html),
    )


def rebuild_sitemap(suburb_data, suburb_flat):
    with open(HOOD_DATA_PATH, "r", encoding="utf-8") as f:
        hood_data = json.load(f)
    hood_flat = [h for g in hood_data["groups"] for h in g["hoods"]]

    domain = suburb_data["domain"]
    urls = [
        (domain + "/", "1.0"),
        (domain + "/challenge.html", "0.8"),
        (domain + "/neighborhoods/index.html", "0.9"),
        (domain + "/suburbs/index.html", "0.9"),
    ]
    for h in hood_flat:
        urls.append((f'{domain}/neighborhoods/{slugify(h["name"])}.html', "0.7"))
    for h in suburb_flat:
        urls.append((f'{domain}/suburbs/{h["slug"]}.html', "0.6"))

    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
              '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, priority in urls:
        lines.append(f'  <url>\n    <loc>{loc}</loc>\n    <priority>{priority}</priority>\n  </url>')
    lines.append('</urlset>\n')
    with open(SITEMAP_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return len(urls)


def main():
    data, flat = load_suburb_data()
    flat_by_band = {}
    for h in flat:
        flat_by_band.setdefault(h["band"], []).append(h)

    os.makedirs(OUT_DIR, exist_ok=True)

    for hood in flat:
        html = render_page(hood, flat_by_band, data)
        out_path = os.path.join(OUT_DIR, f'{hood["slug"]}.html')
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(html)

    hub_html = render_hub(data)
    with open(os.path.join(OUT_DIR, "index.html"), "w", encoding="utf-8") as f:
        f.write(hub_html)

    url_count = rebuild_sitemap(data, flat)

    print(f"Generated {len(flat)} suburb pages + hub page.")
    print(f"Sitemap rebuilt with {url_count} URLs (neighborhoods + suburbs + core pages).")


if __name__ == "__main__":
    main()
