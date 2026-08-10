#!/usr/bin/env python3
"""Builds a service page in en/es/pl from a spec.

The shell (head, styles, ticker, breadcrumb, footer) is lifted from prices.html
so every page matches the site. Only the body copy differs, and that is written
per page rather than templated — templating the content is the exact mistake the
315 location pages made.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path.home() / "Projects" / "tvwebsite"
SITE = "https://tvserviceschicago.com"
LANGS = ["en", "es", "pl"]

BASE = (ROOT / "prices.html").read_text()
SHELL_HEAD = BASE[: BASE.index('<script type="application/ld+json">')]
SHELL_FOOT = BASE[BASE.index('<footer class="site-footer">') :]


def head_for(spec, lang):
    slug = spec["slug"]
    L = spec["lang"][lang]
    prefix = "" if lang == "en" else f"/{lang}"
    h = SHELL_HEAD
    h = h.replace('<html lang="en">', f'<html lang="{lang}">')
    h = re.sub(r"<title>.*?</title>", f"<title>{L['title']}</title>", h, flags=re.S)
    h = re.sub(r'<meta name="description" content=".*?">',
               f'<meta name="description" content="{L["desc"]}">', h, flags=re.S)
    h = re.sub(r'<link rel="canonical" href=".*?">',
               f'<link rel="canonical" href="{SITE}{prefix}/{slug}">', h)
    h = re.sub(r'<link rel="alternate" hreflang="en" href=".*?">',
               f'<link rel="alternate" hreflang="en" href="{SITE}/{slug}">', h)
    h = re.sub(r'<link rel="alternate" hreflang="es" href=".*?">',
               f'<link rel="alternate" hreflang="es" href="{SITE}/es/{slug}">', h)
    h = re.sub(r'<link rel="alternate" hreflang="pl" href=".*?">',
               f'<link rel="alternate" hreflang="pl" href="{SITE}/pl/{slug}">', h)
    h = re.sub(r'<link rel="alternate" hreflang="x-default" href=".*?">',
               f'<link rel="alternate" hreflang="x-default" href="{SITE}/{slug}">', h)
    h = re.sub(r'<meta property="og:title" content=".*?">',
               f'<meta property="og:title" content="{L["ogtitle"]}">', h, flags=re.S)
    h = re.sub(r'<meta property="og:description" content=".*?">',
               f'<meta property="og:description" content="{L["ogdesc"]}">', h, flags=re.S)
    h = re.sub(r'<meta property="og:url" content=".*?">',
               f'<meta property="og:url" content="{SITE}{prefix}/{slug}">', h)
    return h


def schema_for(spec, lang):
    L = spec["lang"][lang]
    prefix = "" if lang == "en" else f"/{lang}"
    service = {
        "@context": "https://schema.org",
        "@type": "Service",
        "serviceType": spec["serviceType"],
        "name": L["h1plain"],
        "description": L["desc"],
        "url": f"{SITE}{prefix}/{spec['slug']}",
        "provider": {
            "@type": "LocalBusiness",
            "name": "TV Install Chicago",
            "telephone": "+16305922982",
            "url": SITE,
            "priceRange": "$100",
        },
        "areaServed": {"@type": "City", "name": "Chicago, IL"},
    }
    if spec.get("offer"):
        service["offers"] = {"@type": "Offer", "price": spec["offer"], "priceCurrency": "USD"}
    faq = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": q,
             "acceptedAnswer": {"@type": "Answer", "text": a}}
            for q, a in L["faq"]
        ],
    }
    return ('<script type="application/ld+json">\n' + json.dumps(service, ensure_ascii=False, indent=1)
            + '\n</script>\n<script type="application/ld+json">\n'
            + json.dumps(faq, ensure_ascii=False, indent=1) + '\n</script>\n')


def body_for(spec, lang):
    L = spec["lang"][lang]
    slug = spec["slug"]
    prefix = "" if lang == "en" else f"/{lang}"
    ticker = "".join(
        f'<span class="ticker-item">{t}</span><span class="ticker-dot"></span>'
        for t in L["ticker"] * 2
    )
    langsw = "<span>|</span>".join(
        f'<a{" class=\"active\"" if l == lang else ""} '
        f'href="{"" if l == "en" else "/" + l}/{slug}">{l.upper()}</a>'
        for l in LANGS
    )
    cards = "".join(
        f'<div class="content-card"><h2>{c["h2"]}</h2>{c["html"]}</div>'
        for c in L["cards"]
    )
    return f"""</head>
<body>
<main>

<div class="ticker-wrap"><div class="ticker-inner">{ticker}</div></div>

<nav class="breadcrumb" aria-label="Breadcrumb">
    <span><a href="{prefix}/">{L['home']}</a> &rsaquo; {L['crumb']}</span>
    <span class="lang-switch">{langsw}</span>
</nav>

<section class="hero-section">
    <div style="max-width:820px; margin:0 auto; position:relative; z-index:1;">
        <p class="hero-eyebrow">{L['eyebrow']}</p>
        <h1 class="hero-title">{L['h1']}</h1>
        <p class="hero-sub">{L['sub']}</p>
    </div>
</section>

<div class="content-wrap">
{cards}
    <div class="content-card" style="text-align:center;">
        <h2>{L['ctah2']}</h2>
        <p style="max-width:520px; margin:0 auto 18px;">{L['ctap']}</p>
        <div style="display:flex; flex-wrap:wrap; gap:12px; justify-content:center;">
            <a href="tel:+16305922982" class="cta-btn-outline">&#128222; (630) 592-2982</a>
            <a href="{prefix}/?source={spec['source']}#bookingForm" class="cta-btn-outline">{L['ctabtn']}</a>
        </div>
        <p style="margin-top:18px; font-size:13px;"><a href="{prefix}/prices" style="color:var(--slate-light);">{L['link1']}</a> &middot; <a href="{prefix}/tv-mounting-near-me" style="color:var(--slate-light);">{L['link2']}</a></p>
    </div>
</div>

"""


def foot_for(lang):
    f = SHELL_FOOT
    if lang != "en":
        f = f.replace('href="/" style="color:var(--slate-light);">&larr; Back to Home',
                      f'href="/{lang}/" style="color:var(--slate-light);">&larr; Back to Home')
    return f


def build(spec):
    for lang in LANGS:
        out = head_for(spec, lang) + schema_for(spec, lang) + body_for(spec, lang) + foot_for(lang)
        path = ROOT / (f"{spec['slug']}.html" if lang == "en" else f"{lang}/{spec['slug']}.html")
        path.write_text(out)
        print("  wrote", path.relative_to(ROOT))


if __name__ == "__main__":
    for f in sys.argv[1:]:
        spec = json.loads(Path(f).read_text())
        print(spec["slug"] + ":")
        build(spec)
