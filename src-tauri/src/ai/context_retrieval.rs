use crate::ai::types::{
    ConceptSnippet, LocationContext, MediaSnippet, OccurrenceSnippet, SelectionContext,
    SelectionStudyRequest, SelectionType, TranslationSnippet, VerseSnippet,
};
use crate::db::{ConceptImage, DatabaseManager};

pub fn build_selection_context(
    db: &DatabaseManager,
    req: &SelectionStudyRequest,
) -> Result<SelectionContext, String> {
    let clean_text = req.selected_text.trim();
    let word_count = clean_text.split_whitespace().count();

    let sel_type = if req.start_verse != req.end_verse {
        SelectionType::Passage
    } else if word_count == 1 {
        SelectionType::Word
    } else if word_count <= 15 {
        SelectionType::Phrase
    } else {
        SelectionType::Verse
    };

    // 1. Resolve Location & Book Info
    let books = db.get_books()?;
    let book_info = books
        .iter()
        .find(|b| b.id == req.book_id)
        .ok_or_else(|| format!("Book ID {} not found", req.book_id))?;

    let location = LocationContext {
        book_id: req.book_id,
        book_name: book_info.name_es.clone(),
        testament: if book_info.testament == "OT" {
            "Antiguo Testamento".to_string()
        } else {
            "Nuevo Testamento".to_string()
        },
        chapter: req.chapter,
        start_verse: req.start_verse,
        end_verse: req.end_verse,
    };

    // 2. Fetch Primary Verse Text
    let chapter_verses = db.get_chapter(&req.version_id, req.book_id, req.chapter)?;
    let mut primary_text_parts = Vec::new();
    for v in &chapter_verses {
        if v.verse >= req.start_verse && v.verse <= req.end_verse {
            primary_text_parts.push(v.text.clone());
        }
    }
    let primary_text = primary_text_parts.join(" ");

    // 3. Adaptive Surrounding Context Window
    let (window_before, window_after) = match sel_type {
        SelectionType::Word => (2, 2),
        SelectionType::Phrase => (2, 2),
        SelectionType::Verse => (3, 3),
        SelectionType::Passage => (1, 1),
        SelectionType::Unknown => (2, 2),
    };

    let start_bound = (req.start_verse - window_before).max(1);
    let end_bound = req.end_verse + window_after;

    let mut immediate_context = Vec::new();
    for v in &chapter_verses {
        if v.verse >= start_bound && v.verse <= end_bound {
            immediate_context.push(VerseSnippet {
                verse: v.verse,
                text: v.text.clone(),
            });
        }
    }

    // 4. Parallel Translations (VBL, KJV, WEB, RV1909)
    let versions = db.get_versions()?;
    let mut parallel_translations = Vec::new();

    for ver in versions {
        if ver.id != req.version_id {
            if let Ok(other_ch) = db.get_chapter(&ver.id, req.book_id, req.chapter) {
                let text_parts: Vec<String> = other_ch
                    .iter()
                    .filter(|v| v.verse >= req.start_verse && v.verse <= req.end_verse)
                    .map(|v| v.text.clone())
                    .collect();

                if !text_parts.is_empty() {
                    parallel_translations.push(TranslationSnippet {
                        version_id: ver.id,
                        version_short_name: ver.short_name,
                        text: text_parts.join(" "),
                    });
                }
            }
        }
    }

    // 5. Ranked & Compressed FTS5 Occurrences (Capped at 5-6 relevant hits)
    let mut occurrences = Vec::new();
    if word_count <= 8 && clean_text.len() >= 3 {
        if let Ok(hits) = db.search_bible(clean_text, vec![req.version_id.clone()], 30) {
            let mut filtered_hits: Vec<_> = hits
                .into_iter()
                .filter(|h| !(h.book_id == req.book_id && h.chapter == req.chapter && h.verse >= req.start_verse && h.verse <= req.end_verse))
                .collect();

            // Rank hits: same book first, then same testament, then others
            filtered_hits.sort_by_key(|h| {
                if h.book_id == req.book_id {
                    0
                } else if (h.book_id <= 39 && req.book_id <= 39) || (h.book_id > 39 && req.book_id > 39) {
                    1
                } else {
                    2
                }
            });

            for h in filtered_hits.into_iter().take(6) {
                occurrences.push(OccurrenceSnippet {
                    book_name: h.book_name,
                    chapter: h.chapter,
                    verse: h.verse,
                    text_snippet: h.snippet.replace("<mark class=\"search-highlight\">", "«").replace("</mark>", "»"),
                });
            }
        }
    }

    // 6. Optional Enrichment (Concepts & Media from SQLite if matched)
    let mut matched_concepts = Vec::new();
    let mut available_media = Vec::new();
    let mut available_images: Vec<ConceptImage> = Vec::new();

    // Check if any word in the selection or the phrase matches concept aliases
    let clean_lower = clean_text.to_lowercase();
    if let Ok(all_concepts) = db.get_all_concepts(false) {
        for c in all_concepts {
            let matches_slug = clean_lower.contains(&c.slug.replace('-', " "));
            let matches_term = clean_lower.contains(&c.term_es.to_lowercase());

            if matches_slug || matches_term {
                matched_concepts.push(ConceptSnippet {
                    slug: c.slug.clone(),
                    term_es: c.term_es.clone(),
                    term_en: c.term_en.clone(),
                    strongs_code: c.strongs_code.clone(),
                    summary: c.short_summary.clone(),
                });

                for img in &c.images {
                    available_media.push(MediaSnippet {
                        id: img.id.to_string(),
                        title: img.title.clone(),
                        caption: img.caption.clone(),
                        file_path: img.file_path.clone(),
                    });
                    if !available_images.iter().any(|existing| existing.id == img.id) {
                        available_images.push(img.clone());
                    }
                }
            }
        }
    }

    Ok(SelectionContext {
        selected_text: clean_text.to_string(),
        selection_type: sel_type,
        location,
        primary_text,
        immediate_context,
        parallel_translations,
        occurrences,
        matched_concepts,
        available_media,
        available_images,
    })
}
