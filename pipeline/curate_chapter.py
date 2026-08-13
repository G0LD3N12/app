#!/usr/bin/env python3
"""
Content Curation Pipeline Tool for Verbum Desktop:
Analyzes Bible chapters, identifies 2-5 key biblical & historical terms,
extracts theological typology and historical grounding from public domain lexicons,
and generates JSON entries ready to compile into study.db.
"""

import json
import sqlite3
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
DB_PATH = ROOT_DIR / "src-tauri" / "resources" / "bible.db"

PROMPT_TEMPLATE = """
Eres un especialista en exégesis bíblica, lenguas originales (hebreo, arameo, griego) y arqueología del Antiguo Cercano Oriente.
Analiza el siguiente capítulo bíblico ({book_name} {chapter}) y selecciona entre 2 y 5 conceptos clave de estudio:

Requisitos:
1. Prioriza palabras que tengan:
   - Fuerte contexto bíblico / tipología intertextual (ej. uso en AT retomado en el NT o viceversa).
   - Datos históricos o arqueológicos relevantes (ciudades antiguas, costumbres, artefactos, pueblos).
2. Proporciona:
   - Término en español y variante en inglés / transliteración original.
   - Resumen conciso (1-2 líneas).
   - Contexto Bíblico y Tipología en Markdown.
   - Contexto Histórico y Arqueológico en Markdown (con citas y fuentes de dominio público).
   - Código de concordancia Strong (ej. H6061, G0721).
   - Regex de coincidencia en el texto del versículo.

Texto del capítulo:
{chapter_text}
"""

def extract_chapter_text(book_id: int, chapter: number, version_id: str = "rv1909") -> str:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    rows = c.execute(
        "SELECT verse, text FROM verses WHERE version_id = ? AND book_id = ? AND chapter = ? ORDER BY verse ASC",
        (version_id, book_id, chapter)
    ).fetchall()
    conn.close()
    return "\n".join(f"{v}. {t}" for v, t in rows)

def generate_curation_prompt(book_id: int, chapter: int, book_name: str):
    text = extract_chapter_text(book_id, chapter)
    prompt = PROMPT_TEMPLATE.format(book_name=book_name, chapter=chapter, chapter_text=text)
    print(f"[+] Generated curation prompt for {book_name} {chapter} ({len(text)} chars)")
    return prompt

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 curate_chapter.py <book_id> <chapter> [book_name]")
        print("Example: python3 curate_chapter.py 6 11 Josué")
        sys.exit(0)
    
    b_id = int(sys.argv[1])
    ch = int(sys.argv[2])
    b_name = sys.argv[3] if len(sys.argv) > 3 else f"Libro {b_id}"
    p = generate_curation_prompt(b_id, ch, b_name)
    out_file = Path(f"curation_prompt_{b_name}_{ch}.txt")
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(p)
    print(f"[✓] Saved prompt to {out_file}")
