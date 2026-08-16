use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BibleVersion {
    pub id: String,
    pub name: String,
    pub short_name: String,
    pub language: String,
    pub license: String,
    pub display_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Book {
    pub id: i32,
    pub code: String,
    pub name_es: String,
    pub name_en: String,
    pub testament: String,
    pub total_chapters: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConceptOccurrenceBadge {
    pub concept_id: i32,
    pub slug: String,
    pub term_es: String,
    pub term_en: Option<String>,
    pub concept_type: String,
    pub word_pattern: String,
    pub short_summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerseWithStudy {
    pub id: i64,
    pub version_id: String,
    pub book_id: i32,
    pub chapter: i32,
    pub verse: i32,
    pub text: String,
    pub concepts: Vec<ConceptOccurrenceBadge>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchHit {
    pub version_id: String,
    pub version_short_name: String,
    pub book_id: i32,
    pub book_name: String,
    pub chapter: i32,
    pub verse: i32,
    pub snippet: String,
    pub raw_text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConceptImage {
    pub id: i32,
    pub concept_id: i32,
    pub file_path: String,
    pub title: String,
    pub caption: String,
    pub source_attribution: String,
    pub license: String,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub data_content: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudyConceptDetail {
    pub id: i32,
    pub slug: String,
    pub term_es: String,
    pub term_en: Option<String>,
    pub concept_type: String,
    pub short_summary: String,
    pub historical_context_md: Option<String>,
    pub biblical_context_md: Option<String>,
    pub strongs_code: Option<String>,
    pub images: Vec<ConceptImage>,
}

pub struct DatabaseManager {
    pool: Pool<SqliteConnectionManager>,
    resource_dir: PathBuf,
}

impl DatabaseManager {
    pub fn new(resource_dir: PathBuf) -> Result<Self, String> {
        let db_path = resource_dir.join("bible.db");
        // Every pooled connection gets the same high-read-performance PRAGMAs
        let manager = SqliteConnectionManager::file(&db_path).with_init(|conn: &mut Connection| {
            let _mode: std::result::Result<String, _> =
                conn.query_row("PRAGMA journal_mode = WAL", [], |r| r.get(0));
            let _ = conn.execute("PRAGMA synchronous = NORMAL", []);
            let _ = conn.execute("PRAGMA cache_size = -64000", []);
            let _ = conn.execute("PRAGMA temp_store = MEMORY", []);
            let _ = conn.execute("PRAGMA mmap_size = 268435456", []);
            Ok(())
        });

        let pool = r2d2::Pool::builder()
            .max_size(4)
            .build(manager)
            .map_err(|e| format!("Failed to create SQLite connection pool at {:?}: {}", db_path, e))?;

        Ok(Self { pool, resource_dir })
    }

    pub fn get_versions(&self) -> Result<Vec<BibleVersion>, String> {
        let conn = self.pool.get().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT id, name, short_name, language, license, display_order FROM versions ORDER BY display_order ASC"
        ).map_err(|e| e.to_string())?;

        let rows = stmt.query_map([], |row| {
            Ok(BibleVersion {
                id: row.get(0)?,
                name: row.get(1)?,
                short_name: row.get(2)?,
                language: row.get(3)?,
                license: row.get(4)?,
                display_order: row.get(5)?,
            })
        }).map_err(|e| e.to_string())?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r.map_err(|e| e.to_string())?);
        }
        Ok(list)
    }

    pub fn get_books(&self) -> Result<Vec<Book>, String> {
        let conn = self.pool.get().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT id, code, name_es, name_en, testament, total_chapters FROM books ORDER BY id ASC"
        ).map_err(|e| e.to_string())?;

        let rows = stmt.query_map([], |row| {
            Ok(Book {
                id: row.get(0)?,
                code: row.get(1)?,
                name_es: row.get(2)?,
                name_en: row.get(3)?,
                testament: row.get(4)?,
                total_chapters: row.get(5)?,
            })
        }).map_err(|e| e.to_string())?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r.map_err(|e| e.to_string())?);
        }
        Ok(list)
    }

    pub fn get_chapter(
        &self,
        version_id: &str,
        book_id: i32,
        chapter: i32,
    ) -> Result<Vec<VerseWithStudy>, String> {
        let conn = self.pool.get().map_err(|e| e.to_string())?;

        // Fetch verses
        let mut stmt = conn.prepare(
            "SELECT id, version_id, book_id, chapter, verse, text FROM verses 
             WHERE version_id = ?1 AND book_id = ?2 AND chapter = ?3 
             ORDER BY verse ASC"
        ).map_err(|e| e.to_string())?;

        let verse_rows = stmt.query_map(params![version_id, book_id, chapter], |row| {
            Ok(VerseWithStudy {
                id: row.get(0)?,
                version_id: row.get(1)?,
                book_id: row.get(2)?,
                chapter: row.get(3)?,
                verse: row.get(4)?,
                text: row.get(5)?,
                concepts: Vec::new(),
            })
        }).map_err(|e| e.to_string())?;

        let mut verses = Vec::new();
        for v in verse_rows {
            verses.push(v.map_err(|e| e.to_string())?);
        }

        // Fetch concept occurrences for this chapter
        let mut occ_stmt = conn.prepare(
            "SELECT co.verse, c.id, c.slug, c.term_es, c.term_en, c.concept_type, co.word_pattern, c.short_summary
             FROM concept_occurrences co
             JOIN concepts c ON co.concept_id = c.id
             WHERE co.version_id = ?1 AND co.book_id = ?2 AND co.chapter = ?3
             ORDER BY co.importance_rank ASC"
        ).map_err(|e| e.to_string())?;

        let occ_rows = occ_stmt.query_map(params![version_id, book_id, chapter], |row| {
            let verse_num: i32 = row.get(0)?;
            let badge = ConceptOccurrenceBadge {
                concept_id: row.get(1)?,
                slug: row.get(2)?,
                term_es: row.get(3)?,
                term_en: row.get(4)?,
                concept_type: row.get(5)?,
                word_pattern: row.get(6)?,
                short_summary: row.get(7)?,
            };
            Ok((verse_num, badge))
        }).map_err(|e| e.to_string())?;

        let mut by_verse: HashMap<i32, Vec<ConceptOccurrenceBadge>> = HashMap::new();
        for (v_num, badge) in occ_rows.flatten() {
            let list = by_verse.entry(v_num).or_default();
            if !list.iter().any(|c| c.concept_id == badge.concept_id) {
                list.push(badge);
            }
        }
        for verse in verses.iter_mut() {
            if let Some(list) = by_verse.remove(&verse.verse) {
                verse.concepts = list;
            }
        }

        Ok(verses)
    }

    pub fn search_bible(
        &self,
        query: &str,
        version_ids: Vec<String>,
        limit: u32,
    ) -> Result<Vec<SearchHit>, String> {
        let clean_q = query.trim();
        if clean_q.is_empty() {
            return Ok(Vec::new());
        }

        // 1. Resolve aliases
        let conn = self.pool.get().map_err(|e| e.to_string())?;
        let mut terms = Vec::new();
        let tokens: Vec<&str> = clean_q.split_whitespace().collect();
        for t in &tokens {
            let canon_clean = t.to_lowercase();
            let mut alias_stmt = conn.prepare(
                "SELECT alias_term FROM search_aliases WHERE canonical_term = ?1 OR alias_term = ?1"
            ).map_err(|e| e.to_string())?;

            let alias_rows = alias_stmt.query_map([&canon_clean], |row| {
                let alias: String = row.get(0)?;
                Ok(alias)
            }).map_err(|e| e.to_string())?;

            let mut alias_list = Vec::new();
            for val in alias_rows.flatten() {
                alias_list.push(format!("\"{}\"", val));
            }

            if alias_list.is_empty() {
                // Escape quotes for FTS5
                let escaped = t.replace('"', "\"\"");
                terms.push(format!("\"{}\"", escaped));
            } else {
                terms.push(format!("({})", alias_list.join(" OR ")));
            }
        }

        let fts_match_query = terms.join(" AND ");

        // Build version filter IN (?, ?, ...)
        let versions_to_search = if version_ids.is_empty() {
            // No explicit versions: search across all installed versions
            self.get_versions()?
                .into_iter()
                .map(|v| v.id)
                .collect()
        } else {
            version_ids
        };

        let placeholders: Vec<String> = (0..versions_to_search.len())
            .map(|i| format!("?{}", i + 2))
            .collect();
        let in_clause = placeholders.join(",");

        let sql = format!(
            "SELECT v.version_id, ver.short_name, v.book_id, b.name_es, v.chapter, v.verse,
                    snippet(verses_fts, 0, '<mark class=\"search-highlight\">', '</mark>', '...', 12) as snip,
                    v.text
             FROM verses_fts
             JOIN verses v ON verses_fts.rowid = v.id
             JOIN books b ON v.book_id = b.id
             JOIN versions ver ON v.version_id = ver.id
             WHERE verses_fts MATCH ?1 AND v.version_id IN ({})
             ORDER BY bm25(verses_fts)
             LIMIT {}",
            in_clause,
            limit.min(200)
        );

        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

        let mut param_values: Vec<&dyn rusqlite::ToSql> = Vec::new();
        param_values.push(&fts_match_query);
        for v in &versions_to_search {
            param_values.push(v);
        }

        let rows = stmt.query_map(rusqlite::params_from_iter(param_values), |row| {
            Ok(SearchHit {
                version_id: row.get(0)?,
                version_short_name: row.get(1)?,
                book_id: row.get(2)?,
                book_name: row.get(3)?,
                chapter: row.get(4)?,
                verse: row.get(5)?,
                snippet: row.get(6)?,
                raw_text: row.get(7)?,
            })
        }).map_err(|e| e.to_string())?;

        let mut hits = Vec::new();
        for r in rows {
            hits.push(r.map_err(|e| e.to_string())?);
        }

        Ok(hits)
    }

    pub fn get_concept_detail(&self, slug: &str) -> Result<StudyConceptDetail, String> {
        let conn = self.pool.get().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT id, slug, term_es, term_en, concept_type, short_summary, historical_context_md, biblical_context_md, strongs_code
             FROM concepts WHERE slug = ?1"
        ).map_err(|e| e.to_string())?;

        let mut concept_opt = None;
        let mut rows = stmt.query_map([slug], |row| {
            Ok(StudyConceptDetail {
                id: row.get(0)?,
                slug: row.get(1)?,
                term_es: row.get(2)?,
                term_en: row.get(3)?,
                concept_type: row.get(4)?,
                short_summary: row.get(5)?,
                historical_context_md: row.get(6)?,
                biblical_context_md: row.get(7)?,
                strongs_code: row.get(8)?,
                images: Vec::new(),
            })
        }).map_err(|e| e.to_string())?;

        if let Some(r) = rows.next() {
            concept_opt = Some(r.map_err(|e| e.to_string())?);
        }

        let mut concept = concept_opt.ok_or_else(|| format!("Concept '{}' not found", slug))?;

        // Load images
        let mut img_stmt = conn.prepare(
            "SELECT id, concept_id, file_path, title, caption, source_attribution, license, width, height
             FROM concept_images WHERE concept_id = ?1"
        ).map_err(|e| e.to_string())?;

        let img_rows = img_stmt.query_map([concept.id], |row| {
            let file_path: String = row.get(2)?;
            let mut data_content = None;
            let full_path = self.resource_dir.join(&file_path);
            if full_path.exists() {
                if let Ok(content) = std::fs::read_to_string(&full_path) {
                    data_content = Some(content);
                }
            }

            Ok(ConceptImage {
                id: row.get(0)?,
                concept_id: row.get(1)?,
                file_path,
                title: row.get(3)?,
                caption: row.get(4)?,
                source_attribution: row.get(5)?,
                license: row.get(6)?,
                width: row.get(7)?,
                height: row.get(8)?,
                data_content,
            })
        }).map_err(|e| e.to_string())?;

        for img in img_rows {
            concept.images.push(img.map_err(|e| e.to_string())?);
        }

        Ok(concept)
    }

    pub fn get_all_concepts(&self, include_image_data: bool) -> Result<Vec<StudyConceptDetail>, String> {
        let conn = self.pool.get().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT id, slug, term_es, term_en, concept_type, short_summary, historical_context_md, biblical_context_md, strongs_code
             FROM concepts ORDER BY id ASC"
        ).map_err(|e| e.to_string())?;

        let rows = stmt.query_map([], |row| {
            Ok(StudyConceptDetail {
                id: row.get(0)?,
                slug: row.get(1)?,
                term_es: row.get(2)?,
                term_en: row.get(3)?,
                concept_type: row.get(4)?,
                short_summary: row.get(5)?,
                historical_context_md: row.get(6)?,
                biblical_context_md: row.get(7)?,
                strongs_code: row.get(8)?,
                images: Vec::new(),
            })
        }).map_err(|e| e.to_string())?;

        let mut list = Vec::new();
        for r in rows {
            let mut concept = r.map_err(|e| e.to_string())?;

            let mut img_stmt = conn.prepare(
                "SELECT id, concept_id, file_path, title, caption, source_attribution, license, width, height
                 FROM concept_images WHERE concept_id = ?1"
            ).map_err(|e| e.to_string())?;

            let img_rows = img_stmt.query_map([concept.id], |img_row| {
                let file_path: String = img_row.get(2)?;
                // Reading image files from disk is expensive; only the study
                // drawer needs the embedded content, catalogs just show metadata
                let mut data_content = None;
                if include_image_data {
                    let full_path = self.resource_dir.join(&file_path);
                    if full_path.exists() {
                        if let Ok(content) = std::fs::read_to_string(&full_path) {
                            data_content = Some(content);
                        }
                    }
                }

                Ok(ConceptImage {
                    id: img_row.get(0)?,
                    concept_id: img_row.get(1)?,
                    file_path,
                    title: img_row.get(3)?,
                    caption: img_row.get(4)?,
                    source_attribution: img_row.get(5)?,
                    license: img_row.get(6)?,
                    width: img_row.get(7)?,
                    height: img_row.get(8)?,
                    data_content,
                })
            }).map_err(|e| e.to_string())?;

            for img in img_rows {
                concept.images.push(img.map_err(|e| e.to_string())?);
            }

            list.push(concept);
        }

        Ok(list)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_db_manager_initialization_and_queries() {
        let res_dir = PathBuf::from("resources");
        let db = DatabaseManager::new(res_dir).expect("DatabaseManager failed to initialize");

        // 1. Test Versions (the bundled DB ships 11 translations)
        let versions = db.get_versions().expect("Failed to get versions");
        assert_eq!(versions.len(), 11);

        // 2. Test Books
        let books = db.get_books().expect("Failed to get books");
        assert_eq!(books.len(), 66);

        // 3. Test Chapter
        let chapter = db.get_chapter("rv1909", 6, 11).expect("Failed to get chapter");
        assert_eq!(chapter.len(), 23);
        let has_study = chapter.iter().any(|v| !v.concepts.is_empty());
        assert!(has_study, "Joshua 11 should have study concepts");

        // 4. Test Search with alias expansion
        let hits = db.search_bible("anaquitas", vec!["rv1909".to_string(), "vbl".to_string()], 10)
            .expect("Failed to search bible");
        assert!(!hits.is_empty(), "Search for anaquitas should return hits via aliases");

        // 5. Test Concept Detail
        let detail = db.get_concept_detail("anaquitas").expect("Failed to get concept detail");
        assert_eq!(detail.term_es, "Anaquitas");
        assert!(!detail.images.is_empty(), "Anaquitas should have archaeological images");
    }
}

