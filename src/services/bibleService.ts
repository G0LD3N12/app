import { invoke } from '@tauri-apps/api/core';
import { ALL_66_BOOKS } from '../utils/bibleBooksData';
import {
  BibleVersion,
  Book,
  SearchHit,
  StudyConceptDetail,
  VerseWithStudy,
  SelectionStudyRequest,
  StudyExegesisResult,
  AIProviderConfig,
  AIConnectionStatus,
  OllamaModelInstallStatus,
} from '../types';

const isTauriEnv = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

// Curated quick-access list for the Command Palette (single source of truth;
// the mock catalog below keeps the same slugs in sync)
export const STUDY_CONCEPT_CATALOG = [
  { slug: 'anaquitas', name: 'Anaquitas (Anaceos)', desc: 'Gigantes históricos de Hebrón y su tipología' },
  { slug: 'cordero-pascual', name: 'Cordero Pascual', desc: 'Sacrificio sustitutivo central y tipología de Cristo' },
  { slug: 'arca-del-pacto', name: 'Arca del Pacto', desc: 'Trono de la presencia divina y propiciatorio' },
  { slug: 'melquisedec', name: 'Melquisedec', desc: 'Rey de Salem y sacerdote eterno del Altísimo' },
  { slug: 'logos-palabra', name: 'El Verbo (Logos)', desc: 'La Palabra divina encarnada en Juan 1:1' },
  { slug: 'serpiente-de-bronce', name: 'Serpiente de Bronce', desc: 'Símbolo de juicio levantado en el desierto' },
] as const;

const CHAPTER_CACHE_LIMIT = 24;
const chapterCache = new Map<string, VerseWithStudy[]>();
const chapterInflight = new Map<string, Promise<VerseWithStudy[]>>();

function chapterCacheKey(versionId: string, bookId: number, chapter: number): string {
  return `${versionId}:${bookId}:${chapter}`;
}

// Insert into a Map as an LRU entry (refresh position, evict oldest past limit)
function lruRemember<T>(cache: Map<string, T>, key: string, value: T, limit: number): void {
  if (cache.has(key)) {
    cache.delete(key);
  } else if (cache.size >= limit) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, value);
}

function rememberChapter(key: string, data: VerseWithStudy[]): void {
  lruRemember(chapterCache, key, data, CHAPTER_CACHE_LIMIT);
}

function takeCachedChapter(key: string): VerseWithStudy[] | undefined {
  const cached = chapterCache.get(key);
  if (!cached) return undefined;
  chapterCache.delete(key);
  chapterCache.set(key, cached);
  return cached;
}

export async function fetchVersions(): Promise<BibleVersion[]> {
  if (isTauriEnv()) {
    return await invoke<BibleVersion[]>('get_versions');
  }
  return [
    { id: 'rv1909', name: 'Reina-Valera 1909', short_name: 'RV1909', language: 'es', license: 'Dominio Público', display_order: 1 },
    { id: 'vbl', name: 'Versión Biblia Libre', short_name: 'VBL', language: 'es', license: 'CC BY-SA 4.0', display_order: 2 },
    { id: 'kjv', name: 'King James Version', short_name: 'KJV', language: 'en', license: 'Dominio Público', display_order: 3 },
    { id: 'web', name: 'World English Bible', short_name: 'WEB', language: 'en', license: 'Dominio Público', display_order: 4 },
    { id: 'sse', name: 'Sagradas Escrituras (1569)', short_name: 'SSE', language: 'es', license: 'Dominio Público', display_order: 5 },
    { id: 'asv', name: 'American Standard Version (1901)', short_name: 'ASV', language: 'en', license: 'Dominio Público', display_order: 6 },
    { id: 'douayrheims', name: 'Douay-Rheims (1899)', short_name: 'DRA', language: 'en', license: 'Dominio Público', display_order: 7 },
    { id: 'ls1910', name: 'Louis Segond (1910)', short_name: 'LSG', language: 'fr', license: 'Dominio Público', display_order: 8 },
    { id: 'elberfelder1905', name: 'Elberfelder (1905)', short_name: 'ELB', language: 'de', license: 'Dominio Público', display_order: 9 },
    { id: 'livre', name: 'Bíblia Livre', short_name: 'BLL', language: 'pt', license: 'CC BY-SA 4.0', display_order: 10 },
    { id: 'vulgate', name: 'Vulgata Clementina', short_name: 'VUL', language: 'la', license: 'Dominio Público', display_order: 11 },
  ];
}

export async function fetchBooks(): Promise<Book[]> {
  if (isTauriEnv()) {
    return await invoke<Book[]>('get_books');
  }
  return ALL_66_BOOKS;
}

export async function fetchChapter(
  versionId: string,
  bookId: number,
  chapter: number
): Promise<VerseWithStudy[]> {
  const key = chapterCacheKey(versionId, bookId, chapter);
  const cached = takeCachedChapter(key);
  if (cached) return cached;

  const pending = chapterInflight.get(key);
  if (pending) return pending;

  const load = (async () => {
    try {
      const data = isTauriEnv()
        ? await invoke<VerseWithStudy[]>('get_chapter', {
            versionId,
            bookId,
            chapter,
          })
        : mockChapter(versionId, bookId, chapter);
      rememberChapter(key, data);
      return data;
    } finally {
      chapterInflight.delete(key);
    }
  })();

  chapterInflight.set(key, load);
  return load;
}

// Concept detail caches: the catalog is loaded once per session and the
// details (which embed image content) are kept in a small LRU
const DETAIL_CACHE_LIMIT = 8;
const conceptDetailCache = new Map<string, StudyConceptDetail>();
const conceptDetailInflight = new Map<string, Promise<StudyConceptDetail>>();
let allConceptsCache: StudyConceptDetail[] | null = null;
let allConceptsInflight: Promise<StudyConceptDetail[]> | null = null;

const MOCK_CONCEPT_DETAIL: StudyConceptDetail = {
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

const MOCK_ALL_CONCEPTS: StudyConceptDetail[] = [
  {
    id: 1,
    slug: 'anaquitas',
    term_es: 'Anaquitas',
    term_en: 'Anakim',
    concept_type: 'both',
    short_summary: 'Pueblo de gran estatura descendiente de Anac que habitaba la región montañosa de Hebrón.',
    strongs_code: 'H6061',
    images: [],
  },
  {
    id: 2,
    slug: 'cordero-pascual',
    term_es: 'Cordero de Dios / Pascual',
    term_en: 'Passover Lamb',
    concept_type: 'both',
    short_summary: 'El sacrificio sustitutivo central instituido en Éxodo 12 que prefigura a Jesucristo.',
    strongs_code: 'H7716',
    images: [],
  },
  {
    id: 3,
    slug: 'arca-del-pacto',
    term_es: 'Arca del Pacto',
    term_en: 'Ark of the Covenant',
    concept_type: 'both',
    short_summary: 'Cofre sagrado de madera de acacia revestido de oro puro, símbolo de la presencia divina.',
    strongs_code: 'H727',
    images: [],
  },
  {
    id: 4,
    slug: 'melquisedec',
    term_es: 'Melquisedec',
    term_en: 'Melchizedek',
    concept_type: 'biblical_context',
    short_summary: 'Rey de Salem y sacerdote del Dios Altísimo que bendijo a Abraham (Génesis 14 / Hebreos 7).',
    strongs_code: 'H4442',
    images: [],
  },
  {
    id: 5,
    slug: 'logos-palabra',
    term_es: 'El Verbo (Logos)',
    term_en: 'The Word (Logos)',
    concept_type: 'both',
    short_summary: 'El Verbo divino eterno encarnado en Jesucristo que revela al Padre (Juan 1:1-14).',
    strongs_code: 'G3056',
    images: [],
  },
  {
    id: 6,
    slug: 'serpiente-de-bronce',
    term_es: 'Serpiente de Bronce',
    term_en: 'Bronze Serpent',
    concept_type: 'both',
    short_summary: 'Símbolo de juicio y sanidad levantado por Moisés en el desierto (Números 21 / Juan 3:14).',
    strongs_code: 'H5175',
    images: [],
  },
];

function mockChapter(
  versionId: string,
  bookId: number,
  chapter: number
): VerseWithStudy[] {
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
  const cached = conceptDetailCache.get(slug);
  if (cached) {
    conceptDetailCache.delete(slug);
    conceptDetailCache.set(slug, cached);
    return cached;
  }

  const pending = conceptDetailInflight.get(slug);
  if (pending) return pending;

  const load = (async () => {
    try {
      const data = isTauriEnv()
        ? await invoke<StudyConceptDetail>('get_concept_detail', { slug })
        : MOCK_CONCEPT_DETAIL;
      lruRemember(conceptDetailCache, slug, data, DETAIL_CACHE_LIMIT);
      return data;
    } finally {
      conceptDetailInflight.delete(slug);
    }
  })();

  conceptDetailInflight.set(slug, load);
  return load;
}

export async function fetchAllConcepts(): Promise<StudyConceptDetail[]> {
  if (allConceptsCache) return allConceptsCache;
  if (allConceptsInflight) return allConceptsInflight;

  const load = (async () => {
    try {
      const data = isTauriEnv()
        ? await invoke<StudyConceptDetail[]>('get_all_concepts', {
            includeImageData: false,
          })
        : MOCK_ALL_CONCEPTS;
      allConceptsCache = data;
      return data;
    } finally {
      allConceptsInflight = null;
    }
  })();

  allConceptsInflight = load;
  return load;
}

export async function analyzeSelectionAI(
  request: SelectionStudyRequest,
  config?: AIProviderConfig
): Promise<StudyExegesisResult> {
  if (isTauriEnv()) {
    return await invoke<StudyExegesisResult>('analyze_selection_ai', {
      request,
      config,
    });
  }

  // Web fallback heuristic simulation
  return {
    title: request.selected_text,
    selection_type: 'termino',
    depth: request.depth,
    is_heuristic_offline: true,
    summary: `Evidencia canónica recuperada para «${request.selected_text}» en ${request.book_name} ${request.chapter}, v${request.start_verse}.`,
    biblical_context: `Texto fuente en ${request.book_name} ${request.chapter}:${request.start_verse}.`,
    historical_cultural_context: undefined,
    linguistic_context: undefined,
    interpretive_notes: [
      {
        text: 'Consulta procesada en modo local autónomo.',
        note_type: 'observacion_textual',
      },
    ],
    translation_nuance: undefined,
    related_passages: [],
    recommended_media: [],
    images: [],
    provider_used: 'Datos Locales (Sin IA)',
    model_used: 'SQLite Canónico',
  };
}

export async function testAIConnection(
  config: AIProviderConfig
): Promise<AIConnectionStatus> {
  if (isTauriEnv()) {
    return await invoke<AIConnectionStatus>('test_ai_connection', { config });
  }

  return {
    is_connected: true,
    provider_type: config.provider_type,
    model_name: config.model_name,
    message: '✓ Conexión simulada activa en navegador.',
    latency_ms: 5,
  };
}

export async function checkOllamaModelStatus(
  endpoint: string,
  modelName: string
): Promise<OllamaModelInstallStatus> {
  if (isTauriEnv()) {
    return await invoke<OllamaModelInstallStatus>('check_ollama_model_status', {
      endpoint,
      modelName,
    });
  }

  return {
    is_ollama_installed: false,
    is_ollama_running: false,
    is_model_installed: false,
    model_name: modelName,
    installed_models: [],
    message: 'Ollama no disponible en navegador.',
    progress_percent: 0,
  };
}

export async function installOrPullOllamaModel(
  endpoint: string,
  modelName: string
): Promise<OllamaModelInstallStatus> {
  if (isTauriEnv()) {
    return await invoke<OllamaModelInstallStatus>('install_or_pull_ollama_model', {
      endpoint,
      modelName,
    });
  }

  return {
    is_ollama_installed: true,
    is_ollama_running: true,
    is_model_installed: true,
    model_name: modelName,
    installed_models: [modelName],
    message: '✓ Simulación de descarga completada.',
    progress_percent: 100,
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
