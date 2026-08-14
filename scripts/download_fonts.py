#!/usr/bin/env python3
"""
Downloads and bundles Google Fonts locally into public/fonts/ for 100% offline startup.
"""

import os
import re
import urllib.request
import hashlib

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS_DIR = os.path.join(BASE_DIR, "public", "fonts")
CSS_OUTPUT_PATH = os.path.join(BASE_DIR, "src", "fonts.css")

os.makedirs(FONTS_DIR, exist_ok=True)

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
URL = (
    "https://fonts.googleapis.com/css2?"
    "family=Cinzel+Decorative:wght@700;900&"
    "family=Cinzel:wght@600;700;800&"
    "family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&"
    "family=Crimson+Pro:ital,wght@0,400;0,600;0,700;1,400&"
    "family=Inter:wght@400;500;600;700&"
    "family=Literata:ital,opsz,wght@0,7..72,300..800;1,7..72,300..800&"
    "family=Plus+Jakarta+Sans:wght@400;500;600;700;800&"
    "family=JetBrains+Mono:wght@400;500&"
    "display=swap"
)

print(f"Fetching Google Fonts CSS...")
req = urllib.request.Request(URL, headers={"User-Agent": UA})
css_content = urllib.request.urlopen(req).read().decode("utf-8")

# Regex to parse @font-face blocks
font_face_blocks = re.findall(r"@font-face\s*\{[^}]+\}", css_content, re.DOTALL)
print(f"Found {len(font_face_blocks)} font-face rules.")

downloaded_files = {}
local_css_blocks = []

for block in font_face_blocks:
    # Only keep latin, latin-ext, or generic blocks for compact size
    if "/* latin" not in block and "/* latin-ext" not in block and "unicode-range" in block:
        # Check if block has latin range
        if not re.search(r"U\+0000-00FF|U\+0100-02AF|U\+0100-024F", block):
            continue

    # Extract family name, style, weight
    family_match = re.search(r"font-family:\s*['\"]?([^'\";]+)['\"]?", block)
    weight_match = re.search(r"font-weight:\s*([^;]+);", block)
    style_match = re.search(r"font-style:\s*([^;]+);", block)
    url_match = re.search(r"url\((https://[^)]+)\)\s*format\(['\"]?woff2['\"]?\)", block)

    if not (family_match and url_match):
        continue

    family = family_match.group(1).replace(" ", "_").lower()
    weight = weight_match.group(1).strip() if weight_match else "400"
    style = style_match.group(1).strip() if style_match else "normal"
    remote_url = url_match.group(1)

    url_hash = hashlib.md5(remote_url.encode()).hexdigest()[:8]
    filename = f"{family}_{style}_{weight}_{url_hash}.woff2"
    file_path = os.path.join(FONTS_DIR, filename)

    if filename not in downloaded_files:
        if not os.path.exists(file_path):
            print(f"Downloading {filename}...")
            font_req = urllib.request.Request(remote_url, headers={"User-Agent": UA})
            font_data = urllib.request.urlopen(font_req).read()
            with open(file_path, "wb") as f:
                f.write(font_data)
        downloaded_files[filename] = file_path

    # Replace URL in block with local public path
    local_url = f"/fonts/{filename}"
    local_block = re.sub(r"url\(https://[^)]+\)", f"url('{local_url}')", block)
    local_css_blocks.append(local_block)

print(f"Downloaded {len(downloaded_files)} unique .woff2 font files into public/fonts/")

with open(CSS_OUTPUT_PATH, "w", encoding="utf-8") as f:
    f.write("/* Verbum Desktop - Offline Bundled Fonts */\n\n")
    f.write("\n\n".join(local_css_blocks))
    f.write("\n")

print(f"Generated local fonts CSS at: {CSS_OUTPUT_PATH}")
