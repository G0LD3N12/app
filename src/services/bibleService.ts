import { invoke } from '@tauri-apps/api/core';
import {
  BibleVersion,
  Book,
  SearchHit,
  StudyConceptDetail,
  VerseWithStudy,
} from '../types';

const isTauriEnv = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

export async function fetchVersions(): Promise<BibleVersion[]> {
  if (isTauriEnv()) {
    return await invoke<BibleVersion[]>('get_versions');
  }
  return [
    { id: 'rv1909', name: 'Reina-Valera 1909', short_name: 'RV1909', language: 'es', license: 'Dominio Público', display_order: 1 },
    { id: 'vbl', name: 'Versión Biblia Libre', short_name: 'VBL', language: 'es', license: 'CC BY-SA 4.0', display_order: 2 },
    { id: 'kjv', name: 'King James Version', short_name: 'KJV', language: 'en', license: 'Dominio Público', display_order: 3 },
    { id: 'web', name: 'World English Bible', short_name: 'WEB', language: 'en', license: 'Dominio Público', display_order: 4 },
  ];
}

export async function fetchBooks(): Promise<Book[]> {
  if (isTauriEnv()) {
    return await invoke<Book[]>('get_books');
  }
  return [
    { id: 1, code: 'GEN', name_es: 'Génesis', name_en: 'Genesis', testament: 'OT', total_chapters: 50 },
    { id: 2, code: 'EXO', name_es: 'Éxodo', name_en: 'Exodus', testament: 'OT', total_chapters: 40 },
    { id: 6, code: 'JOS', name_es: 'Josué', name_en: 'Joshua', testament: 'OT', total_chapters: 24 },
    { id: 19, code: 'PSA', name_es: 'Salmos', name_en: 'Psalms', testament: 'OT', total_chapters: 150 },
    { id: 43, code: 'JHN', name_es: 'Juan', name_en: 'John', testament: 'NT', total_chapters: 21 },
    { id: 66, code: 'REV', name_es: 'Apocalipsis', name_en: 'Revelation', testament: 'NT', total_chapters: 22 },
  ];
}

export async function fetchChapter(
  versionId: string,
  bookId: number,
  chapter: number
): Promise<VerseWithStudy[]> {
  if (isTauriEnv()) {
    return await invoke<VerseWithStudy[]>('get_chapter', {
      versionId,
      bookId,
      chapter,
    });
  }

  // Fallback demo mock
  return [
    {
      id: 1,
      version_id: versionId,
      book_id: bookId,
      chapter,
      verse: 21,
      text: 'También en aquel tiempo vino Josué y destruyó a los anaceos de los montes de Hebrón, de Debir, de Anab, de todos los montes de Judá y de todos los montes de Israel; Josué los destruyó por completo con sus ciudades.',
      concepts: [
        {
          concept_id: 1,
          slug: 'anaquitas',
          term_es: 'Anaquitas',
          term_en: 'Anakim',
          concept_type: 'both',
          word_pattern: 'anaceos|anaquitas|anakim',
          short_summary: 'Pueblo de gran estatura descendiente de Anac que habitaba la región montañosa de Hebrón.',
        },
      ],
    },
    {
      id: 2,
      version_id: versionId,
      book_id: bookId,
      chapter,
      verse: 22,
      text: 'Ninguno de los anaceos quedó en la tierra de los hijos de Israel; solamente quedaron en Gaza, en Gat y en Asdod.',
      concepts: [
        {
          concept_id: 1,
          slug: 'anaquitas',
          term_es: 'Anaquitas',
          term_en: 'Anakim',
          concept_type: 'both',
          word_pattern: 'anaceos|anaquitas|anakim',
          short_summary: 'Pueblo de gran estatura descendiente de Anac que habitaba la región montañosa de Hebrón.',
        },
      ],
    },
  ];
}

export async function searchBible(
  query: string,
  versions: string[],
  limit: number = 100
): Promise<SearchHit[]> {
  if (isTauriEnv()) {
    return await invoke<SearchHit[]>('search_bible', {
      query,
      versions,
      limit,
    });
  }
  return [
    {
      version_id: 'rv1909',
      version_short_name: 'RV1909',
      book_id: 6,
      book_name: 'Josué',
      chapter: 11,
      verse: 21,
      snippet: 'También en aquel tiempo vino Josué y destruyó a los <mark class="search-highlight">anaceos</mark> de los montes...',
      raw_text: 'También en aquel tiempo vino Josué y destruyó a los anaceos...',
    },
  ];
}

export async function fetchConceptDetail(
  slug: string
): Promise<StudyConceptDetail> {
  if (isTauriEnv()) {
    return await invoke<StudyConceptDetail>('get_concept_detail', { slug });
  }

  return {
    id: 1,
    slug: 'anaquitas',
    term_es: 'Anaquitas',
    term_en: 'Anakim',
    concept_type: 'both',
    short_summary: 'Pueblo de gran estatura descendiente de Anac que habitaba la región montañosa de Hebrón.',
    biblical_context_md: '### Significado Bíblico\nLos anaquitas representaban los gigantes del temor que solo la fe en Dios puede derribar.',
    historical_context_md: '### Contexto Histórico\nMencionados en textos de execración egipcios como Iy-anq.',
    strongs_code: 'H6061',
    images: [],
  };
}

export async function minimizeWindow(): Promise<void> {
  if (isTauriEnv()) {
    await invoke('minimize_window');
  }
}

export async function toggleMaximizeWindow(): Promise<void> {
  if (isTauriEnv()) {
    await invoke('toggle_maximize_window');
  }
}

export async function closeWindow(): Promise<void> {
  if (isTauriEnv()) {
    await invoke('close_window');
  }
}

export async function setWindowDecorations(decorations: boolean): Promise<void> {
  if (isTauriEnv()) {
    await invoke('set_window_decorations', { decorations });
  }
}
