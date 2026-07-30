#!/usr/bin/env python3
"""
Generates /neighborhoods/<slug>.html (English), /es/neighborhoods/<slug>.html
(Spanish), and /pl/neighborhoods/<slug>.html (Polish) for all 77 Chicago
community areas, plus hub pages for all three languages, and refreshes
sitemap.xml with every URL in every language.

Source of truth for names/regions/translations: neighborhoods/data.json
(kept in sync with the GROUPS array in challenge.html)

Usage:
    python3 scripts/generate_neighborhood_pages.py

Re-run any time you edit neighborhoods/data.json (new blurb, new hood,
new translation, etc). Safe to re-run repeatedly -- it only touches
files inside /neighborhoods, /es/neighborhoods, /pl/neighborhoods, and
sitemap.xml.
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(ROOT, "neighborhoods", "data.json")
OUT_DIRS = {
    "en": os.path.join(ROOT, "neighborhoods"),
    "es": os.path.join(ROOT, "es", "neighborhoods"),
    "pl": os.path.join(ROOT, "pl", "neighborhoods"),
}
URL_PREFIX = {"en": "/neighborhoods/", "es": "/es/neighborhoods/", "pl": "/pl/neighborhoods/"}
SITEMAP_PATH = os.path.join(ROOT, "sitemap.xml")
LANGS = ["en", "es", "pl"]


def slugify(name: str) -> str:
    """Must exactly match the slugify() in challenge.html's JS -- keep in sync."""
    s = name.lower().replace("'", "")
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def load_data():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    flat = []
    for g in data["groups"]:
        for h in g["hoods"]:
            flat.append({
                "name": h["name"],
                "blurb": {"en": h["blurb"], "es": h.get("blurb_es", h["blurb"]), "pl": h.get("blurb_pl", h["blurb"])},
                "region": {"en": g["region"], "es": g.get("region_es", g["region"]), "pl": g.get("region_pl", g["region"])},
                "slug": slugify(h["name"]),
            })
    return data, flat


def lang_switch_link(current_lang, slug, kind="page"):
    """kind='page' -> per-hood page link set, kind='hub' -> hub index link set."""
    parts = []
    for lang in LANGS:
        href = URL_PREFIX[lang] + (f"{slug}.html" if kind == "page" else "index.html")
        cls = ' class="active"' if lang == current_lang else ""
        parts.append(f'<a{cls} href="{href}">{lang.upper()}</a>')
    return '<span class="lang-switch">' + '<span>|</span>'.join(parts) + '</span>'


def persistence_script(current_lang):
    return f"""    <script>
    (function(){{
      var CURRENT_LANG = '{current_lang}';
      try {{
        var stored = localStorage.getItem('tvic_lang');
        if (stored && stored !== CURRENT_LANG && (stored === 'en' || stored === 'es' || stored === 'pl')) {{
          var path = location.pathname.replace(/^\\/(es|pl)\\//, '/');
          var newPath = stored === 'en' ? path : ('/' + stored + path);
          if (newPath !== location.pathname) {{
            location.replace(newPath + location.search + location.hash);
            return;
          }}
        }}
        localStorage.setItem('tvic_lang', CURRENT_LANG);
      }} catch (e) {{}}
    }})();
    </script>
"""


# Shared <style> block -- identical across all three languages.
STYLE_BLOCK = """
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
        .breadcrumb {{ font-size:12px; color:var(--slate-light); padding:18px 24px 0; max-width:900px; margin:0 auto; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; }}
        .breadcrumb a {{ color:var(--slate-light); text-decoration:none; }}
        .breadcrumb a:hover {{ color:var(--gold); }}
        .lang-switch a {{ color:var(--slate-light); text-decoration:none; font-weight:600; }}
        .lang-switch a.active {{ color:var(--gold); }}
        .lang-switch span {{ color: rgba(200,169,74,0.7); margin:0 4px; }}
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
"""

HEAD_ICONS = """    <link rel="icon" type="image/png" sizes="32x32" href="/public/favicon-32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/public/favicon-16.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/public/favicon-192.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/public/apple-touch-icon-180.png">
    <link rel="shortcut icon" href="/public/favicon.ico">"""


def hreflang_block(domain, path):
    """path e.g. 'neighborhoods/rogers-park.html' or 'neighborhoods/index.html'"""
    return (
        f'    <link rel="alternate" hreflang="en" href="{domain}/{path}">\n'
        f'    <link rel="alternate" hreflang="es" href="{domain}/es/{path}">\n'
        f'    <link rel="alternate" hreflang="pl" href="{domain}/pl/{path}">\n'
        f'    <link rel="alternate" hreflang="x-default" href="{domain}/{path}">'
    )


# Per-language static strings used in the page template.
S = {
    "en": {
        "title": "TV Mounting {name} — $100 Flat Rate | TV Install Chicago",
        "meta_desc": "Professional TV mounting in {name}, Chicago for a flat $100 — any size, any wall, no hidden fees. Same-day appointments available. Serving all of {region}.",
        "og_desc": "Professional TV mounting in {name}, Chicago for a flat $100 — any size, any wall, no hidden fees.",
        "home": "Home", "hoods_label": "Neighborhoods",
        "hero_head": "TV MOUNTING", "hero_lead": "Flat rate. Any TV, any size, any wall. Same-day appointments available in {name}.",
        "promise1": "Every TV, Every Time", "promise2": "Hidden Fees, Ever", "promise3": "Level. Guaranteed.",
        "section1_h": "TV Mounting in {name}",
        "section1_p2": "Same $100 flat rate as everywhere else we serve — mounting hardware included, no size upcharges, no trip fees for {name}. Optional add-ons like a tilting or full-motion mount, in-wall wire concealment, or soundbar mounting are available if you want them, but the base install is always $100.",
        "faq_h": "Frequently Asked",
        "faq_q1": "Do you install TVs in {name}?", "faq_a1": "Yes — we install and mount TVs throughout {name} and the rest of {region}, usually with same-day or next-day availability.",
        "faq_q2": "How much does TV mounting cost in {name}?", "faq_a2": "$100 flat, for any TV of any size, on any standard wall. Optional add-ons like a tilting or full-motion mount or in-wall wire concealment are priced separately.",
        "faq_q3": "Is there a trip fee for {name}?", "faq_a3": "No. The $100 flat rate applies everywhere we serve in Chicago, including {name} — no trip charges, no hidden fees.",
        "nearby_h": "Nearby Neighborhoods",
        "cta": "BOOK YOUR $100 INSTALL &mdash; {name}",
        "footer_tag": "$100 Flat Rate &middot; Any TV &middot; Any Size &middot; Always",
        "footer_copy": "&copy; TV Install Chicago &middot; The $100 Promise",
        "footer_link": "All 77 Chicago Neighborhoods We Serve &rarr;",
        "home_href": "/", "book_href": "/", "service_type": "TV Mounting and Wall Installation",
        "ticker": ["$100 Flat Rate", "Any TV. Any Size.", "Professional Install", "TV Mounting {name}", "No Hidden Fees", "Same Day Available"],
    },
    "es": {
        "title": "Montaje de TV en {name} — Tarifa Fija de $100 | TV Install Chicago",
        "meta_desc": "Montaje profesional de TV en {name}, Chicago por una tarifa fija de $100 — cualquier tamaño, cualquier pared, sin cargos ocultos. Citas el mismo día disponibles. Servimos toda la zona de {region}.",
        "og_desc": "Montaje profesional de TV en {name}, Chicago por una tarifa fija de $100 — cualquier tamaño, cualquier pared, sin cargos ocultos.",
        "home": "Inicio", "hoods_label": "Vecindarios",
        "hero_head": "MONTAJE DE TV", "hero_lead": "Tarifa fija. Cualquier TV, cualquier tamaño, cualquier pared. Citas el mismo día disponibles en {name}.",
        "promise1": "Cada TV, Siempre", "promise2": "Cargos Ocultos, Jamás", "promise3": "Nivelado. Garantizado.",
        "section1_h": "Montaje de TV en {name}",
        "section1_p2": "La misma tarifa fija de $100 que en cualquier otra zona donde damos servicio — herrajes de montaje incluidos, sin recargos por tamaño, sin cargos por viaje en {name}. Los complementos opcionales, como un soporte inclinable o de movimiento completo, la ocultación de cables en la pared o el montaje de una barra de sonido, están disponibles si los deseas, pero la instalación básica siempre es de $100.",
        "faq_h": "Preguntas Frecuentes",
        "faq_q1": "¿Instalan televisores en {name}?", "faq_a1": "Sí — instalamos y montamos televisores en todo {name} y el resto de {region}, generalmente con disponibilidad el mismo día o al día siguiente.",
        "faq_q2": "¿Cuánto cuesta montar un televisor en {name}?", "faq_a2": "$100 fijos, para cualquier televisor de cualquier tamaño, en cualquier pared estándar. Los complementos opcionales, como un soporte inclinable o de movimiento completo, o la ocultación de cables en la pared, tienen precio por separado.",
        "faq_q3": "¿Hay cargo por el viaje a {name}?", "faq_a3": "No. La tarifa fija de $100 aplica en todas las zonas donde damos servicio en Chicago, incluyendo {name} — sin cargos por viaje, sin cargos ocultos.",
        "nearby_h": "Vecindarios Cercanos",
        "cta": "RESERVA TU INSTALACIÓN DE $100 &mdash; {name}",
        "footer_tag": "Tarifa Fija de $100 &middot; Cualquier TV &middot; Cualquier Tamaño &middot; Siempre",
        "footer_copy": "&copy; TV Install Chicago &middot; La Promesa de $100",
        "footer_link": "Los 77 Vecindarios de Chicago que Atendemos &rarr;",
        "home_href": "/es/", "book_href": "/es/", "service_type": "Montaje de TV e Instalación en Pared",
        "ticker": ["Tarifa Fija de $100", "Cualquier TV. Cualquier Tamaño.", "Instalación Profesional", "Montaje de TV en {name}", "Sin Cargos Ocultos", "Mismo Día Disponible"],
    },
    "pl": {
        "title": "Montaż TV w {name} — Stała Cena $100 | TV Install Chicago",
        "meta_desc": "Profesjonalny montaż telewizorów w {name}, Chicago za stałą cenę $100 — dowolny rozmiar, dowolna ściana, bez ukrytych opłat. Dostępne terminy tego samego dnia. Obsługujemy cały obszar {region}.",
        "og_desc": "Profesjonalny montaż telewizorów w {name}, Chicago za stałą cenę $100 — dowolny rozmiar, dowolna ściana, bez ukrytych opłat.",
        "home": "Strona Główna", "hoods_label": "Dzielnice",
        "hero_head": "MONTAŻ TV", "hero_lead": "Stała cena. Dowolny telewizor, dowolny rozmiar, dowolna ściana. Dostępne terminy tego samego dnia w {name}.",
        "promise1": "Każdy TV, Zawsze", "promise2": "Ukryte Opłaty, Nigdy", "promise3": "Poziomo. Gwarantowane.",
        "section1_h": "Montaż TV w {name}",
        "section1_p2": "Ta sama stała cena $100, co w każdej innej obsługiwanej przez nas okolicy — uchwyt montażowy w cenie, bez dopłat za rozmiar, bez opłat za dojazd do {name}. Opcjonalne dodatki, takie jak uchwyt uchylny lub w pełni ruchomy, ukrycie kabli w ścianie czy montaż soundbara, są dostępne na życzenie, ale podstawowa instalacja zawsze kosztuje $100.",
        "faq_h": "Najczęściej Zadawane Pytania",
        "faq_q1": "Czy montujecie telewizory w {name}?", "faq_a1": "Tak — instalujemy i montujemy telewizory w całym {name} i pozostałej części {region}, zwykle z dostępnością tego samego dnia lub następnego dnia.",
        "faq_q2": "Ile kosztuje montaż telewizora w {name}?", "faq_a2": "Stałe $100 za dowolny telewizor dowolnego rozmiaru, na dowolnej standardowej ścianie. Opcjonalne dodatki, takie jak uchwyt uchylny lub w pełni ruchomy albo ukrycie kabli w ścianie, są wyceniane osobno.",
        "faq_q3": "Czy jest opłata za dojazd do {name}?", "faq_a3": "Nie. Stała cena $100 obowiązuje wszędzie tam, gdzie świadczymy usługi w Chicago, w tym w {name} — bez opłat za dojazd, bez ukrytych kosztów.",
        "nearby_h": "Pobliskie Dzielnice",
        "cta": "ZAREZERWUJ INSTALACJĘ ZA $100 &mdash; {name}",
        "footer_tag": "Stała Cena $100 &middot; Dowolny TV &middot; Dowolny Rozmiar &middot; Zawsze",
        "footer_copy": "&copy; TV Install Chicago &middot; Obietnica $100",
        "footer_link": "Wszystkie 77 Dzielnic Chicago, które Obsługujemy &rarr;",
        "home_href": "/pl/", "book_href": "/pl/", "service_type": "Montaż TV i Instalacja Naścienna",
        "ticker": ["Stała Cena $100", "Dowolny TV. Dowolny Rozmiar.", "Profesjonalny Montaż", "Montaż TV w {name}", "Bez Ukrytych Opłat", "Dostępne Tego Samego Dnia"],
    },
}


PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="{html_lang}">
<head>
""" + HEAD_ICONS + """
{persistence_script}    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <meta name="description" content="{meta_desc}">
    <link rel="canonical" href="{canonical}">
{hreflang}
    <meta property="og:type" content="website">
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{og_desc}">
    <meta property="og:url" content="{canonical}">
    <meta property="og:image" content="{domain}/goldtvlogo.webp">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>""" + STYLE_BLOCK + """    </style>
    <script type="application/ld+json">
    {{
      "@context": "https://schema.org",
      "@type": "Service",
      "serviceType": "{service_type}",
      "provider": {{
        "@type": "LocalBusiness",
        "name": "TV Install Chicago",
        "telephone": "{phone}",
        "email": "{email}",
        "image": "{domain}/goldtvlogo.webp",
        "priceRange": "$100",
        "address": {{ "@type": "PostalAddress", "addressLocality": "Chicago", "addressRegion": "IL", "addressCountry": "US" }}
      }},
      "areaServed": {{ "@type": "Place", "name": "{name}, Chicago, IL" }},
      "offers": {{ "@type": "Offer", "price": "100", "priceCurrency": "USD" }}
    }}
    </script>
    <script type="application/ld+json">
    {{
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {{ "@type": "ListItem", "position": 1, "name": "{home}", "item": "{domain}{home_href}" }},
        {{ "@type": "ListItem", "position": 2, "name": "{hoods_label}", "item": "{domain}{hub_href}" }},
        {{ "@type": "ListItem", "position": 3, "name": "{name}", "item": "{canonical}" }}
      ]
    }}
    </script>
    <script type="application/ld+json">
    {{
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {{ "@type": "Question", "name": "{faq_q1}", "acceptedAnswer": {{ "@type": "Answer", "text": "{faq_a1}" }} }},
        {{ "@type": "Question", "name": "{faq_q2}", "acceptedAnswer": {{ "@type": "Answer", "text": "{faq_a2}" }} }},
        {{ "@type": "Question", "name": "{faq_q3}", "acceptedAnswer": {{ "@type": "Answer", "text": "{faq_a3}" }} }}
      ]
    }}
    </script>
</head>
<body>

<div class="ticker-wrap">
    <div class="ticker-inner">
        {ticker_html}
        {ticker_html}
    </div>
</div>

<nav class="breadcrumb" aria-label="Breadcrumb">
    <span><a href="{home_href}">{home}</a> &rsaquo; <a href="{hub_href}">{hoods_label}</a> &rsaquo; {name}</span>
    {lang_switch}
</nav>

<section class="hero-section">
    <div style="max-width:900px; margin:0 auto; position:relative; z-index:1;">
        <p class="hero-eyebrow">{region} &middot; Chicago</p>
        <h1 class="hero-title">{hero_head}<br><span>{name}</span></h1>
        <div class="hero-price">$100</div>
        <p style="color:var(--slate-light); font-size:15px; max-width:480px; line-height:1.7; margin-top:10px;">{hero_lead}</p>
    </div>
</section>

<div class="content-wrap">

    <div class="promise-strip">
        <div class="promise-item"><div class="promise-number">$100</div><div class="promise-label">{promise1}</div></div>
        <div class="promise-item"><div class="promise-number">0</div><div class="promise-label">{promise2}</div></div>
        <div class="promise-item"><div class="promise-number">100%</div><div class="promise-label">{promise3}</div></div>
    </div>

    <div class="content-card">
        <h2>{section1_h}</h2>
        <p>{blurb}</p>
        <p>{section1_p2}</p>
    </div>

    <div class="content-card">
        <h2>{faq_h}</h2>
        <div class="faq-item">
            <div class="faq-q">{faq_q1}</div>
            <div class="faq-a">{faq_a1}</div>
        </div>
        <div class="faq-item">
            <div class="faq-q">{faq_q2}</div>
            <div class="faq-a">{faq_a2}</div>
        </div>
        <div class="faq-item">
            <div class="faq-q">{faq_q3}</div>
            <div class="faq-a">{faq_a3}</div>
        </div>
    </div>

    <div class="content-card">
        <h2>{nearby_h}</h2>
        <div class="nearby-list">
            {nearby_links}
        </div>
    </div>

    <a href="{book_href}?neighborhood={name_url}#bookingForm" class="cta-btn">{cta}</a>

</div>

<footer class="site-footer">
    <p class="bebas" style="font-size:28px; color: var(--gold); letter-spacing:0.06em;">TV Install Chicago</p>
    <p style="font-size:11px; text-transform:uppercase; letter-spacing:0.1em; color: var(--slate-light); margin-top:4px;">{footer_tag}</p>
    <div class="flex flex-col sm:flex-row gap-3 justify-center items-center mt-6">
        <a href="tel:{phone}" class="contact-pill">&#128222; {phone_display}</a>
        <a href="mailto:{email}" class="contact-pill">&#9993; {email}</a>
    </div>
    <p style="margin-top:24px; font-size:11px; color: rgba(200,169,74,0.7); letter-spacing:0.05em;">{footer_copy}</p>
    <p style="margin-top:10px; font-size:11px;"><a href="{hub_href}" style="color:var(--slate-light);">{footer_link}</a></p>
</footer>

</body>
</html>
"""


def render_page(hood, flat_by_region, data, lang):
    strings = S[lang]
    region_label = hood["region"][lang]
    same_region = [h for h in flat_by_region[hood["region"]["en"]] if h["slug"] != hood["slug"]]
    nearby = same_region[:6]
    prefix = URL_PREFIX[lang]
    nearby_links = "\n            ".join(
        f'<a href="{prefix}{n["slug"]}.html" class="nearby-pill">{n["name"]}</a>' for n in nearby
    )
    rel_path = f'neighborhoods/{hood["slug"]}.html'
    canonical = f'{data["domain"]}{prefix}{hood["slug"]}.html'
    ticker_html = "".join(
        f'<span class="ticker-item">{t.format(name=hood["name"])}</span><span class="ticker-dot"></span>'
        for t in strings["ticker"]
    )
    return PAGE_TEMPLATE.format(
        html_lang=lang,
        persistence_script=persistence_script(lang),
        title=strings["title"].format(name=hood["name"]),
        meta_desc=strings["meta_desc"].format(name=hood["name"], region=region_label),
        canonical=canonical,
        hreflang=hreflang_block(data["domain"], rel_path),
        og_desc=strings["og_desc"].format(name=hood["name"]),
        domain=data["domain"],
        service_type=strings["service_type"],
        phone=data["phone"], email=data["email"], phone_display=data["phoneDisplay"],
        name=hood["name"], name_url=hood["name"].replace(" ", "%20").replace("'", "%27"),
        region=region_label,
        home=strings["home"], home_href=strings["home_href"],
        hoods_label=strings["hoods_label"], hub_href=prefix + "index.html",
        book_href=strings["book_href"],
        lang_switch=lang_switch_link(lang, hood["slug"], "page"),
        hero_head=strings["hero_head"], hero_lead=strings["hero_lead"].format(name=hood["name"]),
        promise1=strings["promise1"], promise2=strings["promise2"], promise3=strings["promise3"],
        section1_h=strings["section1_h"].format(name=hood["name"]),
        blurb=hood["blurb"][lang],
        section1_p2=strings["section1_p2"].format(name=hood["name"]),
        faq_h=strings["faq_h"],
        faq_q1=strings["faq_q1"].format(name=hood["name"]), faq_a1=strings["faq_a1"].format(name=hood["name"], region=region_label),
        faq_q2=strings["faq_q2"].format(name=hood["name"]), faq_a2=strings["faq_a2"],
        faq_q3=strings["faq_q3"].format(name=hood["name"]), faq_a3=strings["faq_a3"].format(name=hood["name"]),
        nearby_h=strings["nearby_h"], nearby_links=nearby_links,
        cta=strings["cta"].format(name=hood["name"]),
        footer_tag=strings["footer_tag"], footer_copy=strings["footer_copy"], footer_link=strings["footer_link"],
        ticker_html=ticker_html,
    )


HUB_S = {
    "en": {
        "title": "TV Mounting in Every Chicago Neighborhood — $100 Flat Rate | TV Install Chicago",
        "meta_desc": "TV Install Chicago serves all 77 official Chicago community areas with a flat $100 TV mounting rate. Find your neighborhood and book same-day service.",
        "eyebrow": "Every Corner Of The City", "h1": "ALL 77 CHICAGO<br>NEIGHBORHOODS",
        "lead": "One flat $100 rate for TV mounting in every official Chicago community area — find yours below.",
        "back": "&larr; Back to Home", "home_href": "/",
        "ticker": ["$100 Flat Rate", "All 77 Chicago Neighborhoods", "Same Day Available"],
    },
    "es": {
        "title": "Montaje de TV en Cada Vecindario de Chicago — Tarifa Fija de $100 | TV Install Chicago",
        "meta_desc": "TV Install Chicago da servicio a las 77 áreas comunitarias oficiales de Chicago con una tarifa fija de $100 para montaje de TV. Encuentra tu vecindario y reserva servicio el mismo día.",
        "eyebrow": "Cada Rincón de la Ciudad", "h1": "LOS 77 VECINDARIOS<br>DE CHICAGO",
        "lead": "Una tarifa fija de $100 para montaje de TV en cada área comunitaria oficial de Chicago — encuentra la tuya abajo.",
        "back": "&larr; Volver al Inicio", "home_href": "/es/",
        "ticker": ["Tarifa Fija de $100", "Los 77 Vecindarios de Chicago", "Mismo Día Disponible"],
    },
    "pl": {
        "title": "Montaż TV w Każdej Dzielnicy Chicago — Stała Cena $100 | TV Install Chicago",
        "meta_desc": "TV Install Chicago obsługuje wszystkie 77 oficjalnych dzielnic Chicago w stałej cenie $100 za montaż TV. Znajdź swoją dzielnicę i zarezerwuj usługę tego samego dnia.",
        "eyebrow": "Każdy Zakątek Miasta", "h1": "WSZYSTKIE 77 DZIELNIC<br>CHICAGO",
        "lead": "Jedna stała cena $100 za montaż TV w każdej oficjalnej dzielnicy Chicago — znajdź swoją poniżej.",
        "back": "&larr; Powrót do Strony Głównej", "home_href": "/pl/",
        "ticker": ["Stała Cena $100", "Wszystkie 77 Dzielnic Chicago", "Dostępne Tego Samego Dnia"],
    },
}

HUB_TEMPLATE = """<!DOCTYPE html>
<html lang="{html_lang}">
<head>
    <link rel="icon" type="image/png" sizes="32x32" href="/public/favicon-32.png">
    <link rel="shortcut icon" href="/public/favicon.ico">
{persistence_script}    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <meta name="description" content="{meta_desc}">
    <link rel="canonical" href="{canonical}">
{hreflang}
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
        .lang-switch {{ text-align:center; padding:14px 24px 0; font-size:12px; }}
        .lang-switch a {{ color:var(--slate-light); text-decoration:none; font-weight:600; }}
        .lang-switch a.active {{ color:var(--gold); }}
        .lang-switch span {{ color: rgba(200,169,74,0.7); margin:0 4px; }}
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
    {ticker_html}
    {ticker_html}
</div></div>

{lang_switch}

<div class="hero">
    <p style="font-size:11px; text-transform:uppercase; letter-spacing:0.14em; color:var(--gold); font-weight:700;">{eyebrow}</p>
    <h1>{h1}</h1>
    <p>{lead}</p>
</div>

<div class="wrap">
{regions}
</div>

<footer class="site-footer">
    <p class="bebas" style="font-size:26px; color:var(--gold);">TV Install Chicago</p>
    <div class="flex" style="margin-top:18px; display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
        <a href="tel:{phone}" class="contact-pill">&#128222; {phone_display}</a>
        <a href="mailto:{email}" class="contact-pill">&#9993; {email}</a>
        <a href="{home_href}" class="contact-pill">{back}</a>
    </div>
</footer>
</body>
</html>
"""


def render_hub(data, flat, lang):
    strings = HUB_S[lang]
    prefix = URL_PREFIX[lang]
    regions_html = []
    for g in data["groups"]:
        region_label = g["region"] if lang == "en" else g.get(f"region_{lang}", g["region"])
        links = "\n            ".join(
            f'<a href="{prefix}{slugify(h["name"])}.html" class="hood-link">{h["name"]}</a>'
            for h in g["hoods"]
        )
        regions_html.append(
            f'    <div class="region-title">{region_label}</div>\n'
            f'    <div class="hood-grid">\n            {links}\n    </div>'
        )
    ticker_html = "".join(f'<span class="ticker-item">{t}</span><span class="ticker-dot"></span>' for t in strings["ticker"])
    rel_path = "neighborhoods/index.html"
    return HUB_TEMPLATE.format(
        html_lang=lang,
        persistence_script=persistence_script(lang),
        title=strings["title"], meta_desc=strings["meta_desc"],
        canonical=f'{data["domain"]}{prefix}index.html',
        hreflang=hreflang_block(data["domain"], rel_path),
        domain=data["domain"], phone=data["phone"], phone_display=data["phoneDisplay"], email=data["email"],
        regions="\n".join(regions_html),
        lang_switch=lang_switch_link(lang, None, "hub"),
        eyebrow=strings["eyebrow"], h1=strings["h1"], lead=strings["lead"],
        back=strings["back"], home_href=strings["home_href"],
        ticker_html=ticker_html,
    )


def main():
    data, flat = load_data()
    flat_by_region = {}
    for h in flat:
        flat_by_region.setdefault(h["region"]["en"], []).append(h)

    for d in OUT_DIRS.values():
        os.makedirs(d, exist_ok=True)

    urls = [
        (data["domain"] + "/", "1.0"),
        (data["domain"] + "/es/", "1.0"),
        (data["domain"] + "/pl/", "1.0"),
        (data["domain"] + "/challenge.html", "0.8"),
    ]
    for lang in LANGS:
        urls.append((f'{data["domain"]}{URL_PREFIX[lang]}index.html', "0.9"))

    for hood in flat:
        for lang in LANGS:
            html = render_page(hood, flat_by_region, data, lang)
            with open(os.path.join(OUT_DIRS[lang], f'{hood["slug"]}.html'), "w", encoding="utf-8") as f:
                f.write(html)
            priority = "0.7" if lang == "en" else "0.6"
            urls.append((f'{data["domain"]}{URL_PREFIX[lang]}{hood["slug"]}.html', priority))

    for lang in LANGS:
        with open(os.path.join(OUT_DIRS[lang], "index.html"), "w", encoding="utf-8") as f:
            f.write(render_hub(data, flat, lang))

    # sitemap.xml -- this script owns the neighborhood URLs; suburbs script
    # merges these back in when it rebuilds the full sitemap afterward.
    sitemap_lines = ['<?xml version="1.0" encoding="UTF-8"?>',
                      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, priority in urls:
        sitemap_lines.append(f'  <url>\n    <loc>{loc}</loc>\n    <priority>{priority}</priority>\n  </url>')
    sitemap_lines.append('</urlset>\n')
    with open(SITEMAP_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(sitemap_lines))

    print(f"Generated {len(flat)} neighborhood pages x {len(LANGS)} languages + {len(LANGS)} hub pages.")
    print(f"Sitemap updated with {len(urls)} URLs at {SITEMAP_PATH}")


if __name__ == "__main__":
    main()
