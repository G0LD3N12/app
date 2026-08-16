export interface BibleVersion {
  id: string;
  name: string;
  short_name: string;
  language: string;
  license: string;
  display_order: number;
}

export interface Book {
  id: number;
  code: string;
  name_es: string;
  name_en: string;
  testament: 'OT' | 'NT';
  total_chapters: number;
}

export interface ConceptOccurrenceBadge {
  concept_id: number;
  slug: string;
  term_es: string;
  term_en?: string;
  concept_type: 'historical' | 'biblical_context' | 'both';
  word_pattern: string;
  short_summary: string;
}

export interface VerseWithStudy {
  id: number;
  version_id: string;
  book_id: number;
  chapter: number;
  verse: number;
  text: string;
  concepts: ConceptOccurrenceBadge[];
}

export interface SearchHit {
  version_id: string;
  version_short_name: string;
  book_id: number;
  book_name: string;
  chapter: number;
  verse: number;
  snippet: string;
  raw_text: string;
}

export interface ConceptImage {
  id: number;
  concept_id: number;
  file_path: string;
  title: string;
  caption: string;
  source_attribution: string;
  license: string;
  width?: number;
  height?: number;
  data_content?: string;
}

export interface StudyConceptDetail {
  id: number;
  slug: string;
  term_es: string;
  term_en?: string;
  concept_type: 'historical' | 'biblical_context' | 'both';
  short_summary: string;
  historical_context_md?: string;
  biblical_context_md?: string;
  strongs_code?: string;
  images: ConceptImage[];
}

export type AppTheme =
  | 'obsidian'
  | 'catppuccin'
  | 'tokyonight'
  | 'vercel'
  | 'black'
  | 'nord'
  | 'sepia'
  | 'white'
  | 'dark'
  | 'light';

export interface ThemeDefinition {
  id: AppTheme;
  name: string;
  category: 'dark' | 'light';
  bgPreview: string;
  surfacePreview: string;
  accentPreview: string;
  textPreview: string;
  description: string;
}

export type ScriptureFont = 'literata' | 'crimson' | 'garamond' | 'sans';
export type LineHeightPreset = 'compact' | 'comfortable' | 'spacious';
export type MaxWidthPreset = 'standard' | 'wide' | 'expanded';

export interface ReaderSettings {
  theme: AppTheme;
  fontSize: number; // in px, default 19
  lineHeight: number; // 1.55, 1.75, 2.0
  maxWidth: number; // 780, 880, 1020
  fontFamily: ScriptureFont;
  hideTopBar: boolean;
  parallelMode: boolean;
  secondaryVersionId: string;
}

export interface Bookmark {
  book_id: number;
  chapter: number;
  verse: number;
  created_at: number;
}

export type StudyDepth = 'quick' | 'deep';

export interface SelectionStudyRequest {
  selected_text: string;
  book_id: number;
  book_name: string;
  chapter: number;
  start_verse: number;
  end_verse: number;
  version_id: string;
  depth: StudyDepth;
}

export interface InterpretiveNote {
  text: string;
  note_type: 'observacion_textual' | 'inferencia_teologica' | 'tradicion_interpretativa' | string;
}

export interface RelatedPassage {
  book_name: string;
  chapter: number;
  verse: number;
  quote?: string;
}

export interface StudyExegesisResult {
  title: string;
  selection_type: string;
  depth: StudyDepth | string;
  is_heuristic_offline: boolean;
  summary: string;
  biblical_context: string;
  historical_cultural_context?: string;
  linguistic_context?: string;
  interpretive_notes: InterpretiveNote[];
  translation_nuance?: string;
  related_passages: RelatedPassage[];
  recommended_media: string[];
  images: ConceptImage[];
  provider_used: string;
  model_used: string;
}

export interface AIProviderConfig {
  provider_type: 'gemini' | 'ollama' | 'openai_compatible' | 'heuristic_offline';
  ollama_endpoint: string;
  model_name: string;
  api_key?: string;
  base_url?: string;
  confirm_before_send: boolean;
  local_only_privacy: boolean;
}

export interface AIConnectionStatus {
  is_connected: boolean;
  provider_type: string;
  model_name: string;
  message: string;
  latency_ms?: number;
}

export interface OllamaModelInstallStatus {
  is_ollama_running: boolean;
  is_model_installed: boolean;
  model_name: string;
  installed_models: string[];
  message: string;
  progress_percent?: number;
}

