#!/usr/bin/env python3
"""
Generates /suburbs/<slug>.html (English), /es/suburbs/<slug>.html (Spanish),
and /pl/suburbs/<slug>.html (Polish) for each suburb in suburbs/data.json,
plus hub pages for all three languages, and rebuilds sitemap.xml to include
neighborhoods + suburbs + core pages, in all three languages, together.

This script owns the final sitemap.xml (it runs after
generate_neighborhood_pages.py and merges both).

Usage:
    python3 scripts/generate_neighborhood_pages.py   # run first
    python3 scripts/generate_suburb_pages.py          # then this

Safe to re-run any time you edit suburbs/data.json.
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUBURB_DATA_PATH = os.path.join(ROOT, "suburbs", "data.json")
HOOD_DATA_PATH = os.path.join(ROOT, "neighborhoods", "data.json")
OUT_DIRS = {
    "en": os.path.join(ROOT, "suburbs"),
    "es": os.path.join(ROOT, "es", "suburbs"),
    "pl": os.path.join(ROOT, "pl", "suburbs"),
}
URL_PREFIX = {"en": "/suburbs/", "es": "/es/suburbs/", "pl": "/pl/suburbs/"}
HOOD_URL_PREFIX = {"en": "/neighborhoods/", "es": "/es/neighborhoods/", "pl": "/pl/neighborhoods/"}
SITEMAP_PATH = os.path.join(ROOT, "sitemap.xml")
LANGS = ["en", "es", "pl"]


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
                "blurb": {"en": h["blurb"], "es": h.get("blurb_es", h["blurb"]), "pl": h.get("blurb_pl", h["blurb"])},
                "band": {"en": g["band"], "es": g.get("band_es", g["band"]), "pl": g.get("band_pl", g["band"])},
                "slug": slugify(h["name"]),
            })
    return data, flat


def lang_switch_link(current_lang, slug, kind="page"):
    parts = []
    for lang in LANGS:
        href = URL_PREFIX[lang] + (slug if kind == "page" else "")
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


def hreflang_block(domain, path):
    return (
        f'    <link rel="alternate" hreflang="en" href="{domain}/{path}">\n'
        f'    <link rel="alternate" hreflang="es" href="{domain}/es/{path}">\n'
        f'    <link rel="alternate" hreflang="pl" href="{domain}/pl/{path}">\n'
        f'    <link rel="alternate" hreflang="x-default" href="{domain}/{path}">'
    )


STYLE_BLOCK = """
        :root {{
            --ink: #0A0A0A; --paper: #F5F0E8; --paper-dark: #EAE4D4;
            --gold: #C8A94A; --gold-light: #E5C97A; --rust: #A8471F;
            --slate: #3A4A5C; --slate-light: #6B7E94;
        }}
        * {{ box-sizing: border-box; }}
        body {{ font-family: 'DM Sans', sans-serif; background: var(--ink); color: var(--paper); overflow-x: hidden; margin:0; }}
        .bebas {{ font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.02em; }}
        .ticker-wrap {{ background: var(--gold); overflow: hidden; white-space: nowrap; padding: 10px 0; }}
        .ticker-inner {{ display: inline-block; animation: ticker 22s linear infinite; }}
        @keyframes ticker {{ 0% {{ transform: translateX(0); }} 100% {{ transform: translateX(-50%); }} }}
        .ticker-item {{ display: inline-block; color: var(--on-gold, #0A0A0A); font-weight: 700; font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; padding: 0 40px; }}
        .ticker-dot {{ display: inline-block; width: 6px; height: 6px; background: var(--on-gold, #0A0A0A); border-radius: 50%; vertical-align: middle; margin-right: 40px; }}
        .breadcrumb {{ font-size:12px; color:var(--slate-light); padding:18px 24px 0; max-width:900px; margin:0 auto; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; }}
        .breadcrumb a {{ color:var(--slate-light); text-decoration:none; }}
        .breadcrumb a:hover {{ color:var(--gold-text, #C8A94A); }}
        .lang-switch a {{ color:var(--slate-light); text-decoration:none; font-weight:600; }}
        .lang-switch a.active {{ color:var(--gold-text, #C8A94A); }}
        .lang-switch span {{ color: rgba(var(--gold-rgb, 200,169,74),0.7); margin:0 4px; }}
        .hero-section {{ background: var(--ink); border-bottom: 1px solid rgba(var(--gold-rgb, 200,169,74),0.3); position: relative; overflow: hidden; padding: 48px 24px 40px; }}
        .hero-section::before {{ content: '$100'; position: absolute; font-family: 'Bebas Neue', sans-serif; font-size: 38vw; color: rgba(var(--gold-rgb, 200,169,74),0.04); top: 50%; left: 50%; transform: translate(-50%, -50%); white-space: nowrap; pointer-events: none; line-height: 1; }}
        .hero-eyebrow {{ color: var(--slate-light); font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600; }}
        .hero-title {{ font-family: 'Bebas Neue', sans-serif; font-size: clamp(38px, 7vw, 76px); color: var(--paper); letter-spacing: 0.02em; line-height: 1.02; margin: 10px 0 6px; }}
        .hero-title span {{ color: var(--gold-text, #C8A94A); }}
        .hero-price {{ font-family: 'Bebas Neue', sans-serif; font-size: clamp(60px, 12vw, 120px); line-height: 0.9; background: linear-gradient(135deg, var(--gold-light, #E5C97A) 0%, var(--gold, #C8A94A) 40%, var(--gold-bright, #F0D890) 70%, var(--gold, #C8A94A) 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; margin-top:8px; }}
        .content-wrap {{ max-width: 900px; margin: 0 auto; padding: 40px 24px; position:relative; z-index:1; }}
        .content-card {{ background:var(--surface, #0F0F0F); border:1px solid rgba(var(--gold-rgb, 200,169,74),0.2); border-radius:4px; padding:32px; margin-bottom:28px; }}
        .content-card h2 {{ font-family:'Bebas Neue',sans-serif; font-size:26px; color:var(--gold-text, #C8A94A); letter-spacing:0.03em; margin:0 0 14px; }}
        .content-card p {{ color:var(--slate-light); font-size:15px; line-height:1.75; margin:0 0 12px; }}
        .content-card p:last-child {{ margin-bottom:0; }}
        .promise-strip {{ background: var(--paper); color: var(--ink); display: grid; grid-template-columns: repeat(3, 1fr); border-radius:4px; overflow:hidden; margin-bottom:28px; }}
        .promise-item {{ padding: 24px 20px; border-right: 1px solid var(--paper-dark); text-align: center; }}
        .promise-item:last-child {{ border-right: none; }}
        .promise-number {{ font-family: 'Bebas Neue', sans-serif; font-size: 42px; color: var(--rust); line-height: 1; }}
        .promise-label {{ font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--slate); font-weight: 600; margin-top: 4px; }}
        .faq-item {{ border-bottom:1px solid rgba(var(--gold-rgb, 200,169,74),0.12); padding:16px 0; }}
        .faq-item:last-child {{ border-bottom:none; padding-bottom:0; }}
        .faq-q {{ font-weight:600; color:var(--paper); font-size:14px; margin-bottom:6px; }}
        .faq-a {{ color:var(--slate-light); font-size:14px; line-height:1.65; }}
        .nearby-list {{ display:flex; flex-wrap:wrap; gap:8px; }}
        .nearby-pill {{ display:inline-block; background:var(--surface-2, #161616); border:1px solid rgba(var(--gold-rgb, 200,169,74),0.25); color:var(--paper); padding:8px 16px; border-radius:20px; font-size:13px; text-decoration:none; transition:border-color 0.2s, color 0.2s; }}
        .nearby-pill:hover {{ border-color:var(--gold); color:var(--gold-text, #C8A94A); }}
        .cta-btn {{ background: var(--gold); color: var(--on-gold, #0A0A0A); border: 2px solid var(--gold); font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 0.08em; padding: 18px 32px; border-radius: 3px; cursor: pointer; width: 100%; transition: background 0.2s, color 0.2s; display: block; text-align: center; text-decoration:none; }}
        .cta-btn:hover {{ background: transparent; color: var(--gold-text, #C8A94A); }}
        .site-footer {{ background: var(--surface-3, #050505); border-top: 1px solid rgba(var(--gold-rgb, 200,169,74),0.15); padding: 40px 24px; text-align: center; }}
        .contact-pill {{ display: inline-flex; align-items: center; gap: 8px; background: var(--surface-2, #161616); border: 1px solid rgba(var(--gold-rgb, 200,169,74),0.2); color: var(--paper); padding: 12px 24px; border-radius: 3px; font-size: 14px; font-weight: 500; text-decoration: none; transition: border-color 0.2s, color 0.2s; }}
        .contact-pill:hover {{ border-color: var(--gold); color: var(--gold-text, #C8A94A); }}
"""

HEAD_ICONS = """    <link rel="icon" type="image/png" sizes="32x32" href="/public/favicon-32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/public/favicon-16.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/public/favicon-192.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/public/apple-touch-icon-180.png">
    <link rel="shortcut icon" href="/public/favicon.ico">"""


S = {
    "en": {
        "title": "TV Mounting {name}, IL — $100 Flat Rate | TV Install Chicago",
        "meta_desc": "Professional TV mounting in {name}, IL for a flat $100 — any size, any wall, no hidden fees, no suburban upcharge. Same-day appointments available.",
        "og_desc": "Professional TV mounting in {name}, IL for a flat $100 — any size, any wall, no hidden fees.",
        "home": "Home", "suburbs_label": "Suburbs",
        "hero_head": "TV MOUNTING", "hero_sub": "{name}, IL",
        "hero_lead": "Flat rate. Any TV, any size, any wall. Same-day appointments available in {name} &mdash; no suburban upcharge.",
        "promise1": "Every TV, Every Time", "promise2": "Hidden Fees, Ever", "promise3": "Level. Guaranteed.",
        "section1_h": "TV Mounting in {name}",
        "section1_p2": "Same $100 flat rate as everywhere else we serve — mounting hardware included, no size upcharges, no suburban premium for {name}. Optional add-ons like a tilting or full-motion mount, in-wall wire concealment, or soundbar mounting are available if you want them, but the base install is always $100.",
        "faq_h": "Frequently Asked",
        "faq_q1": "Do you install TVs in {name}?", "faq_a1": "Yes — we install and mount TVs throughout {name} and the surrounding area, usually with same-day or next-day availability.",
        "faq_q2": "How much does TV mounting cost in {name}?", "faq_a2": "$100 flat, for any TV of any size, on any standard wall — no suburban upcharge. Optional add-ons like a tilting or full-motion mount or in-wall wire concealment are priced separately.",
        "faq_q3": "Is there a trip fee to come to {name}?", "faq_a3": "No. The $100 flat rate applies everywhere we serve, including {name} — no trip charges, no hidden fees.",
        "nearby_h": "Nearby Areas",
        "cta": "BOOK YOUR $100 INSTALL &mdash; {name}",
        "footer_tag": "$100 Flat Rate &middot; Any TV &middot; Any Size &middot; Always",
        "footer_copy": "&copy; TV Install Chicago &middot; The $100 Promise",
        "footer_link1": "All Suburbs We Serve &rarr;", "footer_link2": "All 77 Chicago Neighborhoods &rarr;",
        "home_href": "/", "service_type": "TV Mounting and Wall Installation",
        "ticker": ["$100 Flat Rate", "Any TV. Any Size.", "Professional Install", "TV Mounting {name}", "No Suburban Upcharge", "Same Day Available"],
    },
    "es": {
        "title": "Montaje de TV en {name}, IL — Tarifa Fija de $100 | TV Install Chicago",
        "meta_desc": "Montaje profesional de TV en {name}, IL por una tarifa fija de $100 — cualquier tamaño, cualquier pared, sin cargos ocultos, sin recargo suburbano. Citas el mismo día disponibles.",
        "og_desc": "Montaje profesional de TV en {name}, IL por una tarifa fija de $100 — cualquier tamaño, cualquier pared, sin cargos ocultos.",
        "home": "Inicio", "suburbs_label": "Suburbios",
        "hero_head": "MONTAJE DE TV", "hero_sub": "{name}, IL",
        "hero_lead": "Tarifa fija. Cualquier TV, cualquier tamaño, cualquier pared. Citas el mismo día disponibles en {name} &mdash; sin recargo suburbano.",
        "promise1": "Cada TV, Siempre", "promise2": "Cargos Ocultos, Jamás", "promise3": "Nivelado. Garantizado.",
        "section1_h": "Montaje de TV en {name}",
        "section1_p2": "La misma tarifa fija de $100 que en cualquier otra zona donde damos servicio — herrajes de montaje incluidos, sin recargos por tamaño, sin recargo suburbano en {name}. Los complementos opcionales, como un soporte inclinable o de movimiento completo, la ocultación de cables en la pared o el montaje de una barra de sonido, están disponibles si los deseas, pero la instalación básica siempre es de $100.",
        "faq_h": "Preguntas Frecuentes",
        "faq_q1": "¿Instalan televisores en {name}?", "faq_a1": "Sí — instalamos y montamos televisores en todo {name} y sus alrededores, generalmente con disponibilidad el mismo día o al día siguiente.",
        "faq_q2": "¿Cuánto cuesta montar un televisor en {name}?", "faq_a2": "$100 fijos, para cualquier televisor de cualquier tamaño, en cualquier pared estándar — sin recargo suburbano. Los complementos opcionales, como un soporte inclinable o de movimiento completo, o la ocultación de cables en la pared, tienen precio por separado.",
        "faq_q3": "¿Hay cargo por el viaje a {name}?", "faq_a3": "No. La tarifa fija de $100 aplica en todas las zonas donde damos servicio, incluyendo {name} — sin cargos por viaje, sin cargos ocultos.",
        "nearby_h": "Áreas Cercanas",
        "cta": "RESERVA TU INSTALACIÓN DE $100 &mdash; {name}",
        "footer_tag": "Tarifa Fija de $100 &middot; Cualquier TV &middot; Cualquier Tamaño &middot; Siempre",
        "footer_copy": "&copy; TV Install Chicago &middot; La Promesa de $100",
        "footer_link1": "Todos los Suburbios que Atendemos &rarr;", "footer_link2": "Los 77 Vecindarios de Chicago &rarr;",
        "home_href": "/es/", "service_type": "Montaje de TV e Instalación en Pared",
        "ticker": ["Tarifa Fija de $100", "Cualquier TV. Cualquier Tamaño.", "Instalación Profesional", "Montaje de TV en {name}", "Sin Recargo Suburbano", "Mismo Día Disponible"],
    },
    "pl": {
        "title": "Montaż TV w {name}, IL — Stała Cena $100 | TV Install Chicago",
        "meta_desc": "Profesjonalny montaż telewizorów w {name}, IL za stałą cenę $100 — dowolny rozmiar, dowolna ściana, bez ukrytych opłat, bez dopłaty za przedmieście. Dostępne terminy tego samego dnia.",
        "og_desc": "Profesjonalny montaż telewizorów w {name}, IL za stałą cenę $100 — dowolny rozmiar, dowolna ściana, bez ukrytych opłat.",
        "home": "Strona Główna", "suburbs_label": "Przedmieścia",
        "hero_head": "MONTAŻ TV", "hero_sub": "{name}, IL",
        "hero_lead": "Stała cena. Dowolny telewizor, dowolny rozmiar, dowolna ściana. Dostępne terminy tego samego dnia w {name} &mdash; bez dopłaty za przedmieście.",
        "promise1": "Każdy TV, Zawsze", "promise2": "Ukryte Opłaty, Nigdy", "promise3": "Poziomo. Gwarantowane.",
        "section1_h": "Montaż TV w {name}",
        "section1_p2": "Ta sama stała cena $100, co w każdej innej obsługiwanej przez nas okolicy — uchwyt montażowy w cenie, bez dopłat za rozmiar, bez dopłaty za przedmieście {name}. Opcjonalne dodatki, takie jak uchwyt uchylny lub w pełni ruchomy, ukrycie kabli w ścianie czy montaż soundbara, są dostępne na życzenie, ale podstawowa instalacja zawsze kosztuje $100.",
        "faq_h": "Najczęściej Zadawane Pytania",
        "faq_q1": "Czy montujecie telewizory w {name}?", "faq_a1": "Tak — instalujemy i montujemy telewizory w całym {name} i okolicy, zwykle z dostępnością tego samego dnia lub następnego dnia.",
        "faq_q2": "Ile kosztuje montaż telewizora w {name}?", "faq_a2": "Stałe $100 za dowolny telewizor dowolnego rozmiaru, na dowolnej standardowej ścianie — bez dopłaty za przedmieście. Opcjonalne dodatki, takie jak uchwyt uchylny lub w pełni ruchomy albo ukrycie kabli w ścianie, są wyceniane osobno.",
        "faq_q3": "Czy jest opłata za dojazd do {name}?", "faq_a3": "Nie. Stała cena $100 obowiązuje wszędzie tam, gdzie świadczymy usługi, w tym w {name} — bez opłat za dojazd, bez ukrytych kosztów.",
        "nearby_h": "Pobliskie Okolice",
        "cta": "ZAREZERWUJ INSTALACJĘ ZA $100 &mdash; {name}",
        "footer_tag": "Stała Cena $100 &middot; Dowolny TV &middot; Dowolny Rozmiar &middot; Zawsze",
        "footer_copy": "&copy; TV Install Chicago &middot; Obietnica $100",
        "footer_link1": "Wszystkie Obsługiwane Przedmieścia &rarr;", "footer_link2": "Wszystkie 77 Dzielnic Chicago &rarr;",
        "home_href": "/pl/", "service_type": "Montaż TV i Instalacja Naścienna",
        "ticker": ["Stała Cena $100", "Dowolny TV. Dowolny Rozmiar.", "Profesjonalny Montaż", "Montaż TV w {name}", "Bez Dopłaty za Przedmieście", "Dostępne Tego Samego Dnia"],
    },
}


PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="{html_lang}">
<head>
<script>try{{var t=localStorage.getItem('tvicTheme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}}catch(e){{}}</script>
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
    <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap" onload="this.onload=null;this.rel='stylesheet'">
    <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap"></noscript>
    <link rel="stylesheet" href="/css/tailwind.min.css">
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
      "areaServed": {{ "@type": "Place", "name": "{name}, IL" }},
      "offers": {{ "@type": "Offer", "price": "100", "priceCurrency": "USD" }}
    }}
    </script>
    <script type="application/ld+json">
    {{
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {{ "@type": "ListItem", "position": 1, "name": "{home}", "item": "{domain}{home_href}" }},
        {{ "@type": "ListItem", "position": 2, "name": "{suburbs_label}", "item": "{domain}{hub_href}" }},
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
<link rel="stylesheet" href="/css/theme.css">
<script src="/js/theme.js" defer></script>
</head>
<body>
<main>

<div class="ticker-wrap">
    <div class="ticker-inner">
        {ticker_html}
        {ticker_html}
    </div>
</div>

<nav class="breadcrumb" aria-label="Breadcrumb">
    <span><a href="{home_href}">{home}</a> &rsaquo; <a href="{hub_href}">{suburbs_label}</a> &rsaquo; {name}</span>
    {lang_switch}
</nav>

<section class="hero-section">
    <div style="max-width:900px; margin:0 auto; position:relative; z-index:1;">
        <p class="hero-eyebrow">{band} &middot; Chicago Suburbs</p>
        <h1 class="hero-title">{hero_head}<br><span>{hero_sub}</span></h1>
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

    <a href="{home_href}?neighborhood={name_url}#bookingForm" class="cta-btn">{cta}</a>

</div>

<footer class="site-footer">
    <p class="bebas" style="font-size:28px; color: var(--gold-text, #C8A94A); letter-spacing:0.06em;">TV Install Chicago</p>
    <p style="font-size:11px; text-transform:uppercase; letter-spacing:0.1em; color: var(--slate-light); margin-top:4px;">{footer_tag}</p>
    <div class="flex flex-col sm:flex-row gap-3 justify-center items-center mt-6">
        <a href="tel:{phone}" class="contact-pill">&#128222; {phone_display}</a>
        <a href="mailto:{email}" class="contact-pill">&#9993; {email}</a>
    </div>
    <p style="margin-top:24px; font-size:11px; color: rgba(var(--gold-rgb, 200,169,74),0.7); letter-spacing:0.05em;">{footer_copy}</p>
    <p style="margin-top:10px; font-size:11px;"><a href="{hub_href}" style="color:var(--slate-light);">{footer_link1}</a> &middot; <a href="{hoods_hub_href}" style="color:var(--slate-light);">{footer_link2}</a></p>
</footer>

</main>
</body>
</html>
"""


def render_page(hood, flat_by_band, data, lang):
    strings = S[lang]
    band_label = hood["band"][lang]
    same_band = [h for h in flat_by_band[hood["band"]["en"]] if h["slug"] != hood["slug"]]
    nearby = same_band[:6]
    prefix = URL_PREFIX[lang]
    nearby_links = "\n            ".join(
        f'<a href="{prefix}{n["slug"]}.html" class="nearby-pill">{n["name"]}</a>' for n in nearby
    )
    rel_path = f'suburbs/{hood["slug"]}'
    canonical = f'{data["domain"]}{prefix}{hood["slug"]}'
    ticker_html = "".join(
        f'<span class="ticker-item">{t.format(name=hood["name"])}</span><span class="ticker-dot"></span>'
        for t in strings["ticker"]
    )
    return PAGE_TEMPLATE.format(
        html_lang=lang,
        persistence_script=persistence_script(lang),
        title=strings["title"].format(name=hood["name"]),
        meta_desc=strings["meta_desc"].format(name=hood["name"]),
        canonical=canonical,
        hreflang=hreflang_block(data["domain"], rel_path),
        og_desc=strings["og_desc"].format(name=hood["name"]),
        domain=data["domain"],
        service_type=strings["service_type"],
        phone=data["phone"], email=data["email"], phone_display=data["phoneDisplay"],
        name=hood["name"], name_url=hood["name"].replace(" ", "%20").replace("'", "%27"),
        band=band_label,
        home=strings["home"], home_href=strings["home_href"],
        suburbs_label=strings["suburbs_label"], hub_href=prefix,
        hoods_hub_href=HOOD_URL_PREFIX[lang],
        lang_switch=lang_switch_link(lang, hood["slug"], "page"),
        hero_head=strings["hero_head"], hero_sub=strings["hero_sub"].format(name=hood["name"]),
        hero_lead=strings["hero_lead"].format(name=hood["name"]),
        promise1=strings["promise1"], promise2=strings["promise2"], promise3=strings["promise3"],
        section1_h=strings["section1_h"].format(name=hood["name"]),
        blurb=hood["blurb"][lang],
        section1_p2=strings["section1_p2"].format(name=hood["name"]),
        faq_h=strings["faq_h"],
        faq_q1=strings["faq_q1"].format(name=hood["name"]), faq_a1=strings["faq_a1"].format(name=hood["name"]),
        faq_q2=strings["faq_q2"].format(name=hood["name"]), faq_a2=strings["faq_a2"],
        faq_q3=strings["faq_q3"].format(name=hood["name"]), faq_a3=strings["faq_a3"].format(name=hood["name"]),
        nearby_h=strings["nearby_h"], nearby_links=nearby_links,
        cta=strings["cta"].format(name=hood["name"]),
        footer_tag=strings["footer_tag"], footer_copy=strings["footer_copy"],
        footer_link1=strings["footer_link1"], footer_link2=strings["footer_link2"],
        ticker_html=ticker_html,
    )


HUB_S = {
    "en": {
        "title": "TV Mounting in the Chicago Suburbs — $100 Flat Rate | TV Install Chicago",
        "meta_desc": "TV Install Chicago serves the northern Chicago suburbs, from Norridge through Lake Forest, with a flat $100 TV mounting rate. Find your suburb and book same-day service.",
        "eyebrow": "North Of The City", "h1": "SUBURBS WE SERVE",
        "lead": "One flat $100 rate from the city line all the way up through the North Shore &mdash; find your suburb below.",
        "home_href": "/", "hoods_href": "/neighborhoods/index.html",
        "hoods_link": "All 77 Chicago Neighborhoods &rarr;", "back": "&larr; Back to Home",
        "ticker": ["$100 Flat Rate", "Chicago & The Suburbs", "Same Day Available"],
    },
    "es": {
        "title": "Montaje de TV en los Suburbios de Chicago — Tarifa Fija de $100 | TV Install Chicago",
        "meta_desc": "TV Install Chicago da servicio a los suburbios al norte de Chicago, desde Norridge hasta Lake Forest, con una tarifa fija de $100 para montaje de TV. Encuentra tu suburbio y reserva servicio el mismo día.",
        "eyebrow": "Al Norte de la Ciudad", "h1": "SUBURBIOS QUE ATENDEMOS",
        "lead": "Una tarifa fija de $100 desde el límite de la ciudad hasta North Shore &mdash; encuentra tu suburbio abajo.",
        "home_href": "/es/", "hoods_href": "/es/neighborhoods/index.html",
        "hoods_link": "Los 77 Vecindarios de Chicago &rarr;", "back": "&larr; Volver al Inicio",
        "ticker": ["Tarifa Fija de $100", "Chicago y Sus Suburbios", "Mismo Día Disponible"],
    },
    "pl": {
        "title": "Montaż TV na Przedmieściach Chicago — Stała Cena $100 | TV Install Chicago",
        "meta_desc": "TV Install Chicago obsługuje północne przedmieścia Chicago, od Norridge po Lake Forest, w stałej cenie $100 za montaż TV. Znajdź swoje przedmieście i zarezerwuj usługę tego samego dnia.",
        "eyebrow": "Na Północ od Miasta", "h1": "OBSŁUGIWANE PRZEDMIEŚCIA",
        "lead": "Jedna stała cena $100 od granicy miasta aż po North Shore &mdash; znajdź swoje przedmieście poniżej.",
        "home_href": "/pl/", "hoods_href": "/pl/neighborhoods/index.html",
        "hoods_link": "Wszystkie 77 Dzielnic Chicago &rarr;", "back": "&larr; Powrót do Strony Głównej",
        "ticker": ["Stała Cena $100", "Chicago i Przedmieścia", "Dostępne Tego Samego Dnia"],
    },
}

HUB_TEMPLATE = """<!DOCTYPE html>
<html lang="{html_lang}">
<head>
<script>try{{var t=localStorage.getItem('tvicTheme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}}catch(e){{}}</script>
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
    <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap" onload="this.onload=null;this.rel='stylesheet'">
    <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap"></noscript>
    <style>
        :root {{ --ink:#0A0A0A; --paper:#F5F0E8; --gold:#C8A94A; --slate-light:#6B7E94; }}
        * {{ box-sizing:border-box; }}
        body {{ font-family:'DM Sans',sans-serif; background:var(--ink); color:var(--paper); margin:0; }}
        .bebas {{ font-family:'Bebas Neue',sans-serif; letter-spacing:0.02em; }}
        .ticker-wrap {{ background: var(--gold); overflow: hidden; white-space: nowrap; padding: 10px 0; }}
        .ticker-inner {{ display:inline-block; animation: ticker 22s linear infinite; }}
        @keyframes ticker {{ 0% {{ transform: translateX(0); }} 100% {{ transform: translateX(-50%); }} }}
        .ticker-item {{ display:inline-block; color: var(--on-gold, #0A0A0A); font-weight:700; font-size:13px; letter-spacing:0.12em; text-transform:uppercase; padding:0 40px; }}
        .ticker-dot {{ display:inline-block; width:6px; height:6px; background: var(--on-gold, #0A0A0A); border-radius:50%; vertical-align:middle; margin-right:40px; }}
        .lang-switch {{ text-align:center; padding:14px 24px 0; font-size:12px; }}
        .lang-switch a {{ color:var(--slate-light); text-decoration:none; font-weight:600; }}
        .lang-switch a.active {{ color:var(--gold-text, #C8A94A); }}
        .lang-switch span {{ color: rgba(var(--gold-rgb, 200,169,74),0.7); margin:0 4px; }}
        .hero {{ text-align:center; padding:56px 24px 32px; border-bottom:1px solid rgba(var(--gold-rgb, 200,169,74),0.2); }}
        .hero h1 {{ font-family:'Bebas Neue',sans-serif; font-size:clamp(38px,7vw,72px); margin:8px 0; letter-spacing:0.03em; }}
        .hero p {{ color:var(--slate-light); font-size:15px; max-width:560px; margin:0 auto; line-height:1.7; }}
        .wrap {{ max-width:1100px; margin:0 auto; padding:40px 24px; }}
        .region-title {{ font-family:'Bebas Neue',sans-serif; font-size:24px; color:var(--gold-text, #C8A94A); letter-spacing:0.05em; margin:36px 0 14px; padding-bottom:8px; border-bottom:1px solid rgba(var(--gold-rgb, 200,169,74),0.2); }}
        .hood-grid {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:10px; }}
        .hood-link {{ display:block; background:var(--surface, #0F0F0F); border:1px solid rgba(var(--gold-rgb, 200,169,74),0.15); border-radius:3px; padding:14px 16px; color:var(--paper); text-decoration:none; font-size:14px; transition:border-color 0.2s, color 0.2s, background 0.2s; }}
        .hood-link:hover {{ border-color:var(--gold); color:var(--gold-text, #C8A94A); background:var(--surface-2, #161616); }}
        .site-footer {{ background:var(--surface-3, #050505); border-top:1px solid rgba(var(--gold-rgb, 200,169,74),0.15); padding:36px 24px; text-align:center; }}
        .contact-pill {{ display:inline-flex; align-items:center; gap:8px; background:var(--surface-2, #161616); border:1px solid rgba(var(--gold-rgb, 200,169,74),0.2); color:var(--paper); padding:12px 24px; border-radius:3px; font-size:14px; text-decoration:none; }}
    </style>
<link rel="stylesheet" href="/css/theme.css">
<script src="/js/theme.js" defer></script>
</head>
<body>
<main>
<div class="ticker-wrap"><div class="ticker-inner">
    {ticker_html}
    {ticker_html}
</div></div>

{lang_switch}

<div class="hero">
    <p style="font-size:11px; text-transform:uppercase; letter-spacing:0.14em; color:var(--gold-text, #C8A94A); font-weight:700;">{eyebrow}</p>
    <h1>{h1}</h1>
    <p>{lead}</p>
</div>

<div class="wrap">
{regions}
</div>

<footer class="site-footer">
    <p class="bebas" style="font-size:26px; color:var(--gold-text, #C8A94A);">TV Install Chicago</p>
    <div class="flex" style="margin-top:18px; display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
        <a href="tel:{phone}" class="contact-pill">&#128222; {phone_display}</a>
        <a href="mailto:{email}" class="contact-pill">&#9993; {email}</a>
        <a href="{hoods_href}" class="contact-pill">{hoods_link}</a>
        <a href="{home_href}" class="contact-pill">{back}</a>
    </div>
</footer>
</main>
</body>
</html>
"""


def render_hub(data, lang):
    strings = HUB_S[lang]
    prefix = URL_PREFIX[lang]
    regions_html = []
    for g in data["groups"]:
        band_label = g["band"] if lang == "en" else g.get(f"band_{lang}", g["band"])
        links = "\n            ".join(
            f'<a href="{prefix}{slugify(h["name"])}.html" class="hood-link">{h["name"]}</a>'
            for h in g["hoods"]
        )
        regions_html.append(
            f'    <div class="region-title">{band_label}</div>\n'
            f'    <div class="hood-grid">\n            {links}\n    </div>'
        )
    ticker_html = "".join(f'<span class="ticker-item">{t}</span><span class="ticker-dot"></span>' for t in strings["ticker"])
    rel_path = "suburbs/"
    return HUB_TEMPLATE.format(
        html_lang=lang,
        persistence_script=persistence_script(lang),
        title=strings["title"], meta_desc=strings["meta_desc"],
        canonical=f'{data["domain"]}{prefix}',
        hreflang=hreflang_block(data["domain"], rel_path),
        domain=data["domain"], phone=data["phone"], phone_display=data["phoneDisplay"], email=data["email"],
        regions="\n".join(regions_html),
        lang_switch=lang_switch_link(lang, None, "hub"),
        eyebrow=strings["eyebrow"], h1=strings["h1"], lead=strings["lead"],
        home_href=strings["home_href"], hoods_href=strings["hoods_href"],
        hoods_link=strings["hoods_link"], back=strings["back"],
        ticker_html=ticker_html,
    )


def rebuild_sitemap(suburb_data, suburb_flat):
    with open(HOOD_DATA_PATH, "r", encoding="utf-8") as f:
        hood_data = json.load(f)
    hood_flat = [h for g in hood_data["groups"] for h in g["hoods"]]

    domain = suburb_data["domain"]
    # Core pages that exist as real static files in en/es/pl (not
    # generated by these scripts) - kept in sync by hand whenever a
    # core page is added, removed, or renamed.
    CORE_PAGES = [
        ("index.html", "1.0"),
        # Built for the "near me" searches, which carry far more volume than
        # any city or neighborhood term — hence the priority above the guide.
        ("tv-mounting-near-me", "0.9"),
        ("tv-mounting-guide", "0.7"),
        ("whats-new", "0.6"),
        ("blog/", "0.6"),
        ("blog/new-tvs-2026", "0.5"),
        ("terms-and-conditions", "0.3"),
        ("privacy-policy", "0.3"),
    ]
    # EN-only pages (no es/pl translations exist yet) -- appended after the
    # per-language loop below via EN_ONLY_PAGES.
    EN_ONLY_PAGES = [
        ("blog/tv-release-calendar", "0.5"),
        ("blog/tv-mounting-home-theater-chicago", "0.5"),
    ]
    LANG_ROOT = {"en": "/", "es": "/es/", "pl": "/pl/"}
    urls = []
    for lang in LANGS:
        for page, priority in CORE_PAGES:
            root = LANG_ROOT[lang]
            path = "" if page == "index.html" else page
            urls.append((f'{domain}{root}{path}', priority))
    for page, priority in EN_ONLY_PAGES:
        urls.append((f'{domain}/{page}', priority))
    for lang in LANGS:
        urls.append((f'{domain}{HOOD_URL_PREFIX[lang]}', "0.9"))
        urls.append((f'{domain}{URL_PREFIX[lang]}', "0.9"))

    for h in hood_flat:
        slug = slugify(h["name"])
        for lang in LANGS:
            priority = "0.7" if lang == "en" else "0.6"
            urls.append((f'{domain}{HOOD_URL_PREFIX[lang]}{slug}', priority))

    for h in suburb_flat:
        for lang in LANGS:
            priority = "0.6" if lang == "en" else "0.5"
            urls.append((f'{domain}{URL_PREFIX[lang]}{h["slug"]}', priority))

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
        flat_by_band.setdefault(h["band"]["en"], []).append(h)

    for d in OUT_DIRS.values():
        os.makedirs(d, exist_ok=True)

    for hood in flat:
        for lang in LANGS:
            html = render_page(hood, flat_by_band, data, lang)
            with open(os.path.join(OUT_DIRS[lang], f'{hood["slug"]}.html'), "w", encoding="utf-8") as f:
                f.write(html)

    for lang in LANGS:
        with open(os.path.join(OUT_DIRS[lang], "index.html"), "w", encoding="utf-8") as f:
            f.write(render_hub(data, lang))

    url_count = rebuild_sitemap(data, flat)

    print(f"Generated {len(flat)} suburb pages x {len(LANGS)} languages + {len(LANGS)} hub pages.")
    print(f"Sitemap rebuilt with {url_count} URLs (neighborhoods + suburbs, EN/ES/PL).")


if __name__ == "__main__":
    main()
