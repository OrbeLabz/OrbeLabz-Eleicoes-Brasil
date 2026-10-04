"""Render the OrbeLabz social cards from the existing brand logo.

Requires cairosvg and Pillow. Example:
python3 scripts/build-social-preview.py --kind home --logo favicon.svg --output social-orbelabz-v1.jpg
"""
import argparse
import io
import re
from pathlib import Path

import cairosvg
from PIL import Image


def logo(source, x, y, size, name, tile=False):
    inner = re.sub(r"^<svg[^>]*>|</svg>\s*$", "", source.strip())
    if not tile:
        inner = re.sub(r"<rect\b[^>]*/>", "", inner, count=1)
    inner = inner.replace('id="brand"', f'id="{name}"').replace('url(#brand)', f'url(#{name})')
    return f'<g transform="translate({x} {y}) scale({size / 64})">{inner}</g>'


def render(kind, source):
    common = '''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs>
 <linearGradient id="background" x2="1" y2="1"><stop stop-color="#090b14"/><stop offset="1" stop-color="#0e1b3d"/></linearGradient>
 <linearGradient id="ink" x2="1"><stop stop-color="#22d3ee"/><stop offset=".5" stop-color="#3b82f6"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient>
 <radialGradient id="cyanGlow"><stop stop-color="#22d3ee" stop-opacity=".14"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></radialGradient>
 <radialGradient id="violetGlow"><stop stop-color="#8b5cf6" stop-opacity=".22"/><stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/></radialGradient>
</defs>
<rect width="1200" height="630" fill="url(#background)"/>
<circle cx="90" cy="70" r="450" fill="url(#cyanGlow)"/>
<circle cx="1110" cy="500" r="460" fill="url(#violetGlow)"/>
<g font-family="DejaVu Sans, sans-serif">
'''
    common += logo(source, 72, 49, 64, 'headerBrand', tile=True)
    common += '''<text x="151" y="93" fill="#fff" font-size="32" font-weight="700">Orbe<tspan fill="url(#ink)">Labz</tspan></text>
<path d="M80 134H1120" stroke="#ffffff" stroke-opacity=".1"/>
'''
    if kind == 'home':
        body = '''<text x="80" y="190" font-size="13" fill="#22d3ee" letter-spacing="3">IDEIAS EM ÓRBITA</text>
<text x="76" y="282" font-size="76" font-weight="700" fill="#fff" letter-spacing="-3">Explore.</text>
<text x="76" y="368" font-size="76" font-weight="700" fill="url(#ink)" letter-spacing="-3">Discover.</text>
<text x="76" y="454" font-size="76" font-weight="700" fill="#fff" letter-spacing="-3">Create.</text>
<text x="80" y="516" font-size="21" fill="#a8b3cf">Tecnologia, IA, ciência e criatividade.</text>
<text x="80" y="582" font-size="16" fill="#a8b3cf">orbelabz.com</text>
'''
        body += logo(source, 780, 202, 345, 'heroBrand')
    else:
        common += '<text x="331" y="91" fill="#a8b3cf" font-size="23">/ Apuração</text>'
        body = '''<text x="80" y="190" font-size="12" fill="#22d3ee" letter-spacing="2">CADA VOTO, EM QUALQUER LUGAR</text>
<text x="76" y="284" font-size="65" font-weight="700" fill="#fff" letter-spacing="-2">Apuração</text>
<text x="76" y="361" font-size="60" font-weight="700" fill="url(#ink)" letter-spacing="-2">em tempo real</text>
<text x="80" y="422" font-size="21" fill="#a8b3cf">Brasil + brasileiros no exterior</text>
<rect x="80" y="459" width="260" height="42" rx="12" fill="#22d3ee" fill-opacity=".07" stroke="#22d3ee" stroke-opacity=".3"/>
<text x="100" y="486" font-size="15" fill="#22d3ee">Dados oficiais do TSE</text>
<text x="80" y="541" font-size="16" fill="#a8b3cf">Atualização automática</text>
<text x="80" y="586" font-size="14" fill="#a8b3cf">orbelabz.com/OrbeLabz-Eleicoes-Brasil/</text>
<rect x="740" y="176" width="388" height="364" rx="22" fill="#0e1b3d" stroke="#384a72"/>
<circle cx="767" cy="204" r="4" fill="#22d3ee"/>
<circle cx="783" cy="204" r="4" fill="#3b82f6"/>
<circle cx="799" cy="204" r="4" fill="#8b5cf6"/>
<text x="820" y="209" font-size="14" fill="#e2e8f8">OrbeLabz - Apuração</text>
<path d="M740 229H1128" stroke="#384a72"/>
'''
        body += logo(source, 825, 247, 218, 'serviceBrand')
        body += '''<rect x="764" y="482" width="168" height="36" rx="10" fill="#22d3ee" fill-opacity=".09" stroke="#22d3ee" stroke-opacity=".25"/>
<rect x="945" y="482" width="159" height="36" rx="10" fill="#8b5cf6" fill-opacity=".09" stroke="#8b5cf6" stroke-opacity=".25"/>
<text x="848" y="506" text-anchor="middle" font-size="13" fill="#22d3ee" letter-spacing="1">BRASIL</text>
<text x="1024" y="506" text-anchor="middle" font-size="13" fill="#b7a2fc" letter-spacing="1">EXTERIOR</text>
'''
    return common + body + '</g></svg>'


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--kind', choices=['home', 'election'], required=True)
    p.add_argument('--logo', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    a = p.parse_args()
    svg = render(a.kind, a.logo.read_text())
    a.output.parent.mkdir(parents=True, exist_ok=True)
    a.output.with_suffix('.svg').write_text(svg)
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=2400, output_height=1260)
    with Image.open(io.BytesIO(png)) as image:
        image.convert('RGB').resize((1200, 630), Image.Resampling.LANCZOS).save(
            a.output, format='JPEG', quality=92, optimize=True, progressive=True)
