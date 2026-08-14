#!/usr/bin/env python3
"""
Comprehensive automated test and verification suite for Verbum Desktop.
Validates Database, FTS5 Search, Alias Expansions, Study Layer, and Assets.
"""

import sqlite3
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
DB_PATH = ROOT_DIR / "src-tauri" / "resources" / "bible.db"
ASSETS_DIR = ROOT_DIR / "src-tauri" / "resources" / "assets"

def run_tests():
    print("==================================================")
    print("      VERBUM DESKTOP - SYSTEM VERIFICATION        ")
    print("==================================================")
    
    assert DB_PATH.exists(), f"Database not found at {DB_PATH}"
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # 1. Test Versions & Verse Count
    versions = c.execute("SELECT id, short_name, name FROM versions ORDER BY display_order").fetchall()
    print(f"[✓] Bible Versions Loaded: {len(versions)}")
    for v in versions:
        count = c.execute("SELECT count(*) FROM verses WHERE version_id = ?", (v[0],)).fetchone()[0]
        print(f"    - [{v[1]}] {v[2]}: {count} verses")
        assert count > 25000, f"Version {v[0]} has unexpectedly low verse count: {count}"

    total_verses = c.execute("SELECT count(*) FROM verses").fetchone()[0]
    fts_verses = c.execute("SELECT count(*) FROM verses_fts").fetchone()[0]
    print(f"[✓] Total Verses in Database: {total_verses}")
    print(f"[✓] Total Indexed in FTS5: {fts_verses}")
    assert total_verses == fts_verses, "Mismatch between verses and FTS5 index!"

    # 2. Test Diacritic Insensitive Search (remove_diacritics 2)
    print("\n--- Testing Diacritic Insensitive FTS5 ---")
    query_accented = c.execute("SELECT count(*) FROM verses_fts WHERE verses_fts MATCH 'José'").fetchone()[0]
    query_unaccented = c.execute("SELECT count(*) FROM verses_fts WHERE verses_fts MATCH 'jose'").fetchone()[0]
    print(f"[✓] Search 'José': {query_accented} hits")
    print(f"[✓] Search 'jose': {query_unaccented} hits")
    assert query_accented > 0 and query_accented == query_unaccented, "Diacritic removal in FTS5 failed!"

    # 3. Test Search Alias & Lemmatization Expansion (anaquitas -> anaceos, anakim, etc.)
    print("\n--- Testing Alias Expansion for 'anaquitas' ---")
    aliases = [r[0] for r in c.execute("SELECT alias_term FROM search_aliases WHERE canonical_term = 'anaquitas'").fetchall()]
    print(f"[✓] Canonical 'anaquitas' resolved to aliases: {aliases}")
    assert len(aliases) >= 4, "Missing aliases for anaquitas"
    
    match_clause = " OR ".join(f'"{a}"' for a in aliases)
    hits = c.execute(f"""
        SELECT v.version_id, b.name_es, v.chapter, v.verse, snippet(verses_fts, 0, '[', ']', '...', 10)
        FROM verses_fts
        JOIN verses v ON verses_fts.rowid = v.id
        JOIN books b ON v.book_id = b.id
        WHERE verses_fts MATCH ?
        ORDER BY bm25(verses_fts)
        LIMIT 5
    """, (match_clause,)).fetchall()
    print(f"[✓] Search hits for anaquitas aliases ({len(hits)} shown):")
    for h in hits:
        print(f"    - [{h[0].upper()}] {h[1]} {h[2]}:{h[3]} -> {h[4]}")
    assert len(hits) > 0, "No hits for anaquitas aliases!"

    # 4. Test Study Concepts and Occurrences (2-5 per chapter)
    print("\n--- Testing Study Concepts & Occurrences ---")
    concepts = c.execute("SELECT id, slug, term_es, concept_type, short_summary FROM concepts").fetchall()
    print(f"[✓] Curated Concepts in Library: {len(concepts)}")
    for cp in concepts:
        print(f"    • {cp[2]} ({cp[1]}) - [{cp[3]}]: {cp[4][:60]}...")

    # Check Joshua 11 occurrences
    jos11_occurrences = c.execute("""
        SELECT co.verse, c.term_es, co.word_pattern 
        FROM concept_occurrences co 
        JOIN concepts c ON co.concept_id = c.id 
        WHERE co.book_id = 6 AND co.chapter = 11 AND co.version_id = 'rv1909'
    """).fetchall()
    print(f"[✓] Josué 11 Study Occurrences: {len(jos11_occurrences)}")
    for occ in jos11_occurrences:
        print(f"    - Versículo {occ[0]}: {occ[1]} (pattern: {occ[2]})")
    assert len(jos11_occurrences) >= 2, "Josué 11 should have at least 2 curated occurrences"

    # 5. Test Concept Visual Assets and Attributions
    print("\n--- Testing Visual Assets & Attributions ---")
    images = c.execute("SELECT id, concept_id, file_path, title, source_attribution, license FROM concept_images").fetchall()
    print(f"[✓] Curated Visual Assets: {len(images)}")
    for img in images:
        full_p = ROOT_DIR / "src-tauri" / "resources" / img[2]
        assert full_p.exists(), f"Missing image file at {full_p}"
        print(f"    - [{img[5]}] {img[3]} -> {img[4]} (verified file: {full_p.name})")

    # 6. Test Dynamic Context Retrieval on Arbitrary Selections (No predefined concepts required)
    print("\n--- Testing Dynamic Context Retrieval on Arbitrary Selections ---")
    test_phrases = [
        ("la cumbre del monte", 6, 15, 8),
        ("escarlata", 23, 1, 18),
        ("no se turbe vuestro corazón", 43, 14, 1),
    ]

    for phrase, b_id, ch, v_num in test_phrases:
        # Retrieve primary verse
        v_row = c.execute(
            "SELECT text FROM verses WHERE version_id = 'rv1909' AND book_id = ? AND chapter = ? AND verse = ?",
            (b_id, ch, v_num)
        ).fetchone()
        assert v_row is not None, f"Verse not found for {b_id} {ch}:{v_num}"
        
        # Test parallel translations retrieval
        parallels = c.execute(
            "SELECT version_id, text FROM verses WHERE book_id = ? AND chapter = ? AND verse = ? AND version_id != 'rv1909'",
            (b_id, ch, v_num)
        ).fetchall()
        assert len(parallels) >= 2, f"Missing parallel translations for {b_id} {ch}:{v_num}"

        # Test adaptive surrounding context
        surrounding = c.execute(
            "SELECT verse, text FROM verses WHERE version_id = 'rv1909' AND book_id = ? AND chapter = ? AND verse BETWEEN ? AND ?",
            (b_id, ch, max(1, v_num - 2), v_num + 2)
        ).fetchall()
        assert len(surrounding) >= 1, f"Missing surrounding context for {b_id} {ch}:{v_num}"

        # Test ranked FTS5 occurrences
        clean_token = phrase.replace("'", "''")
        fts_hits = c.execute("""
            SELECT v.version_id, b.name_es, v.chapter, v.verse, snippet(verses_fts, 0, '«', '»', '...', 8)
            FROM verses_fts
            JOIN verses v ON verses_fts.rowid = v.id
            JOIN books b ON v.book_id = b.id
            WHERE verses_fts MATCH ? AND v.version_id = 'rv1909'
            ORDER BY bm25(verses_fts)
            LIMIT 5
        """, (f'"{clean_token}"',)).fetchall()
        
        print(f"[✓] Arbitrary Selection «{phrase}» in Book {b_id} {ch}:{v_num}:")
        print(f"    - Primary Text: «{v_row[0][:50]}...»")
        print(f"    - Parallel Translations Retrieved: {len(parallels)}")
        print(f"    - Surrounding Context Verses: {len(surrounding)}")
        print(f"    - FTS5 Occurrences Ranked: {len(fts_hits)}")

    conn.close()
    print("\n==================================================")
    print("      ALL TESTS AND VERIFICATIONS PASSED! (6/6)   ")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
