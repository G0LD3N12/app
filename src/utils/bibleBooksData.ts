import React from 'react';
import { Book } from '../types';
import {
  Sparkles,
  DoorOpen,
  Flame,
  ListOrdered,
  ScrollText,
  Sword,
  Gavel,
  Wheat,
  Crown,
  ListTree,
  Landmark,
  BrickWall,
  CloudLightning,
  Music2,
  Lightbulb,
  Hourglass,
  Heart,
  Megaphone,
  MessageSquareWarning,
  CloudRain,
  Wind,
  Eye,
  HeartHandshake,
  Sprout,
  Scale,
  Mountain,
  Fish,
  Shield,
  CircleHelp,
  Bell,
  Hammer,
  Sun,
  UsersRound,
  Zap,
  Stethoscope,
  Route,
  Church,
  Unlock,
  Smile,
  Timer,
  UserRoundCheck,
  UserCheck,
  Handshake,
  Anchor,
  ShieldAlert,
  Mail,
  BookOpen,
} from 'lucide-react';

export interface BookMetadata {
  id: number;
  code: string;
  name_es: string;
  name_en: string;
  testament: 'OT' | 'NT';
  total_chapters: number;
  groupId: string;
  groupName: string;
  icon: React.ComponentType<{ size?: number | string; className?: string; color?: string; strokeWidth?: number }>;
}

export interface LiteraryGroup {
  id: string;
  name: string;
  testament: 'OT' | 'NT';
}

export const LITERARY_GROUPS: LiteraryGroup[] = [
  { id: 'pentateuco', name: 'Pentateuco', testament: 'OT' },
  { id: 'historicos', name: 'Históricos', testament: 'OT' },
  { id: 'poeticos', name: 'Poéticos y Sapienciales', testament: 'OT' },
  { id: 'profetas_mayores', name: 'Profetas Mayores', testament: 'OT' },
  { id: 'profetas_menores', name: 'Profetas Menores', testament: 'OT' },
  { id: 'evangelios', name: 'Evangelios', testament: 'NT' },
  { id: 'hechos', name: 'Hechos de los Apóstoles', testament: 'NT' },
  { id: 'epistolas_paulinas', name: 'Epístolas Paulinas', testament: 'NT' },
  { id: 'epistolas_generales', name: 'Epístolas Generales', testament: 'NT' },
  { id: 'apocalipsis', name: 'Revelación y Profecía', testament: 'NT' },
];

export const BIBLE_BOOKS_MAP: Record<string, BookMetadata> = {
  // --- Pentateuco ---
  GEN: { id: 1, code: 'GEN', name_es: 'Génesis', name_en: 'Genesis', testament: 'OT', total_chapters: 50, groupId: 'pentateuco', groupName: 'Pentateuco', icon: Sparkles },
  EXO: { id: 2, code: 'EXO', name_es: 'Éxodo', name_en: 'Exodus', testament: 'OT', total_chapters: 40, groupId: 'pentateuco', groupName: 'Pentateuco', icon: DoorOpen },
  LEV: { id: 3, code: 'LEV', name_es: 'Levítico', name_en: 'Leviticus', testament: 'OT', total_chapters: 27, groupId: 'pentateuco', groupName: 'Pentateuco', icon: Flame },
  NUM: { id: 4, code: 'NUM', name_es: 'Números', name_en: 'Numbers', testament: 'OT', total_chapters: 36, groupId: 'pentateuco', groupName: 'Pentateuco', icon: ListOrdered },
  DEU: { id: 5, code: 'DEU', name_es: 'Deuteronomio', name_en: 'Deuteronomy', testament: 'OT', total_chapters: 34, groupId: 'pentateuco', groupName: 'Pentateuco', icon: ScrollText },

  // --- Históricos ---
  JOS: { id: 6, code: 'JOS', name_es: 'Josué', name_en: 'Joshua', testament: 'OT', total_chapters: 24, groupId: 'historicos', groupName: 'Históricos', icon: Sword },
  JDG: { id: 7, code: 'JDG', name_es: 'Jueces', name_en: 'Judges', testament: 'OT', total_chapters: 21, groupId: 'historicos', groupName: 'Históricos', icon: Gavel },
  RUT: { id: 8, code: 'RUT', name_es: 'Rut', name_en: 'Ruth', testament: 'OT', total_chapters: 4, groupId: 'historicos', groupName: 'Históricos', icon: Wheat },
  '1SA': { id: 9, code: '1SA', name_es: '1 Samuel', name_en: '1 Samuel', testament: 'OT', total_chapters: 31, groupId: 'historicos', groupName: 'Históricos', icon: Crown },
  '2SA': { id: 10, code: '2SA', name_es: '2 Samuel', name_en: '2 Samuel', testament: 'OT', total_chapters: 24, groupId: 'historicos', groupName: 'Históricos', icon: Crown },
  '1KI': { id: 11, code: '1KI', name_es: '1 Reyes', name_en: '1 Kings', testament: 'OT', total_chapters: 22, groupId: 'historicos', groupName: 'Históricos', icon: Crown },
  '2KI': { id: 12, code: '2KI', name_es: '2 Reyes', name_en: '2 Kings', testament: 'OT', total_chapters: 25, groupId: 'historicos', groupName: 'Históricos', icon: Flame },
  '1CH': { id: 13, code: '1CH', name_es: '1 Crónicas', name_en: '1 Chronicles', testament: 'OT', total_chapters: 29, groupId: 'historicos', groupName: 'Históricos', icon: ListTree },
  '2CH': { id: 14, code: '2CH', name_es: '2 Crónicas', name_en: '2 Chronicles', testament: 'OT', total_chapters: 36, groupId: 'historicos', groupName: 'Históricos', icon: Landmark },
  EZR: { id: 15, code: 'EZR', name_es: 'Esdras', name_en: 'Ezra', testament: 'OT', total_chapters: 10, groupId: 'historicos', groupName: 'Históricos', icon: ScrollText },
  NEH: { id: 16, code: 'NEH', name_es: 'Nehemías', name_en: 'Nehemiah', testament: 'OT', total_chapters: 13, groupId: 'historicos', groupName: 'Históricos', icon: BrickWall },
  EST: { id: 17, code: 'EST', name_es: 'Ester', name_en: 'Esther', testament: 'OT', total_chapters: 10, groupId: 'historicos', groupName: 'Históricos', icon: Crown },

  // --- Poéticos y Sapienciales ---
  JOB: { id: 18, code: 'JOB', name_es: 'Job', name_en: 'Job', testament: 'OT', total_chapters: 42, groupId: 'poeticos', groupName: 'Poéticos y Sapienciales', icon: CloudLightning },
  PSA: { id: 19, code: 'PSA', name_es: 'Salmos', name_en: 'Psalms', testament: 'OT', total_chapters: 150, groupId: 'poeticos', groupName: 'Poéticos y Sapienciales', icon: Music2 },
  PRO: { id: 20, code: 'PRO', name_es: 'Proverbios', name_en: 'Proverbs', testament: 'OT', total_chapters: 31, groupId: 'poeticos', groupName: 'Poéticos y Sapienciales', icon: Lightbulb },
  ECC: { id: 21, code: 'ECC', name_es: 'Eclesiastés', name_en: 'Ecclesiastes', testament: 'OT', total_chapters: 12, groupId: 'poeticos', groupName: 'Poéticos y Sapienciales', icon: Hourglass },
  SNG: { id: 22, code: 'SNG', name_es: 'Cantares', name_en: 'Song of Solomon', testament: 'OT', total_chapters: 8, groupId: 'poeticos', groupName: 'Poéticos y Sapienciales', icon: Heart },

  // --- Profetas Mayores ---
  ISA: { id: 23, code: 'ISA', name_es: 'Isaías', name_en: 'Isaiah', testament: 'OT', total_chapters: 66, groupId: 'profetas_mayores', groupName: 'Profetas Mayores', icon: Megaphone },
  JER: { id: 24, code: 'JER', name_es: 'Jeremías', name_en: 'Jeremiah', testament: 'OT', total_chapters: 52, groupId: 'profetas_mayores', groupName: 'Profetas Mayores', icon: MessageSquareWarning },
  LAM: { id: 25, code: 'LAM', name_es: 'Lamentaciones', name_en: 'Lamentations', testament: 'OT', total_chapters: 5, groupId: 'profetas_mayores', groupName: 'Profetas Mayores', icon: CloudRain },
  EZK: { id: 26, code: 'EZK', name_es: 'Ezequiel', name_en: 'Ezekiel', testament: 'OT', total_chapters: 48, groupId: 'profetas_mayores', groupName: 'Profetas Mayores', icon: Wind },
  DAN: { id: 27, code: 'DAN', name_es: 'Daniel', name_en: 'Daniel', testament: 'OT', total_chapters: 12, groupId: 'profetas_mayores', groupName: 'Profetas Mayores', icon: Eye },

  // --- Profetas Menores ---
  HOS: { id: 28, code: 'HOS', name_es: 'Oseas', name_en: 'Hosea', testament: 'OT', total_chapters: 14, groupId: 'profetas_menores', groupName: 'Profetas Menores', icon: HeartHandshake },
  JOL: { id: 29, code: 'JOL', name_es: 'Joel', name_en: 'Joel', testament: 'OT', total_chapters: 3, groupId: 'profetas_menores', groupName: 'Profetas Menores', icon: Sprout },
  AMO: { id: 30, code: 'AMO', name_es: 'Amós', name_en: 'Amos', testament: 'OT', total_chapters: 9, groupId: 'profetas_menores', groupName: 'Profetas Menores', icon: Scale },
  OBA: { id: 31, code: 'OBA', name_es: 'Abdías', name_en: 'Obadiah', testament: 'OT', total_chapters: 1, groupId: 'profetas_menores', groupName: 'Profetas Menores', icon: Mountain },
  JON: { id: 32, code: 'JON', name_es: 'Jonás', name_en: 'Jonah', testament: 'OT', total_chapters: 4, groupId: 'profetas_menores', groupName: 'Profetas Menores', icon: Fish },
  MIC: { id: 33, code: 'MIC', name_es: 'Miqueas', name_en: 'Micah', testament: 'OT', total_chapters: 7, groupId: 'profetas_menores', groupName: 'Profetas Menores', icon: Scale },
  NAM: { id: 34, code: 'NAM', name_es: 'Nahúm', name_en: 'Nahum', testament: 'OT', total_chapters: 3, groupId: 'profetas_menores', groupName: 'Profetas Menores', icon: Shield },
  HAB: { id: 35, code: 'HAB', name_es: 'Habacuc', name_en: 'Habakkuk', testament: 'OT', total_chapters: 3, groupId: 'profetas_menores', groupName: 'Profetas Menores', icon: CircleHelp },
  ZEP: { id: 36, code: 'ZEP', name_es: 'Sofonías', name_en: 'Zephaniah', testament: 'OT', total_chapters: 3, groupId: 'profetas_menores', groupName: 'Profetas Menores', icon: Bell },
  HAG: { id: 37, code: 'HAG', name_es: 'Hageo', name_en: 'Haggai', testament: 'OT', total_chapters: 2, groupId: 'profetas_menores', groupName: 'Profetas Menores', icon: Hammer },
  ZEC: { id: 38, code: 'ZEC', name_es: 'Zacarías', name_en: 'Zechariah', testament: 'OT', total_chapters: 14, groupId: 'profetas_menores', groupName: 'Profetas Menores', icon: Eye },
  MAL: { id: 39, code: 'MAL', name_es: 'Malaquías', name_en: 'Malachi', testament: 'OT', total_chapters: 4, groupId: 'profetas_menores', groupName: 'Profetas Menores', icon: Sun },

  // --- Evangelios ---
  MAT: { id: 40, code: 'MAT', name_es: 'Mateo', name_en: 'Matthew', testament: 'NT', total_chapters: 28, groupId: 'evangelios', groupName: 'Evangelios', icon: UsersRound },
  MRK: { id: 41, code: 'MRK', name_es: 'Marcos', name_en: 'Mark', testament: 'NT', total_chapters: 16, groupId: 'evangelios', groupName: 'Evangelios', icon: Zap },
  LUK: { id: 42, code: 'LUK', name_es: 'Lucas', name_en: 'Luke', testament: 'NT', total_chapters: 24, groupId: 'evangelios', groupName: 'Evangelios', icon: Stethoscope },
  JHN: { id: 43, code: 'JHN', name_es: 'Juan', name_en: 'John', testament: 'NT', total_chapters: 21, groupId: 'evangelios', groupName: 'Evangelios', icon: Heart },

  // --- Hechos ---
  ACT: { id: 44, code: 'ACT', name_es: 'Hechos', name_en: 'Acts', testament: 'NT', total_chapters: 28, groupId: 'hechos', groupName: 'Hechos de los Apóstoles', icon: Route },

  // --- Epístolas Paulinas ---
  ROM: { id: 45, code: 'ROM', name_es: 'Romanos', name_en: 'Romans', testament: 'NT', total_chapters: 16, groupId: 'epistolas_paulinas', groupName: 'Epístolas Paulinas', icon: Scale },
  '1CO': { id: 46, code: '1CO', name_es: '1 Corintios', name_en: '1 Corinthians', testament: 'NT', total_chapters: 16, groupId: 'epistolas_paulinas', groupName: 'Epístolas Paulinas', icon: Church },
  '2CO': { id: 47, code: '2CO', name_es: '2 Corintios', name_en: '2 Corinthians', testament: 'NT', total_chapters: 13, groupId: 'epistolas_paulinas', groupName: 'Epístolas Paulinas', icon: HeartHandshake },
  GAL: { id: 48, code: 'GAL', name_es: 'Gálatas', name_en: 'Galatians', testament: 'NT', total_chapters: 6, groupId: 'epistolas_paulinas', groupName: 'Epístolas Paulinas', icon: Unlock },
  EPH: { id: 49, code: 'EPH', name_es: 'Efesios', name_en: 'Ephesians', testament: 'NT', total_chapters: 6, groupId: 'epistolas_paulinas', groupName: 'Epístolas Paulinas', icon: Shield },
  PHP: { id: 50, code: 'PHP', name_es: 'Filipenses', name_en: 'Philippians', testament: 'NT', total_chapters: 4, groupId: 'epistolas_paulinas', groupName: 'Epístolas Paulinas', icon: Smile },
  COL: { id: 51, code: 'COL', name_es: 'Colosenses', name_en: 'Colossians', testament: 'NT', total_chapters: 4, groupId: 'epistolas_paulinas', groupName: 'Epístolas Paulinas', icon: Crown },
  '1TH': { id: 52, code: '1TH', name_es: '1 Tesalonicenses', name_en: '1 Thessalonians', testament: 'NT', total_chapters: 5, groupId: 'epistolas_paulinas', groupName: 'Epístolas Paulinas', icon: Bell },
  '2TH': { id: 53, code: '2TH', name_es: '2 Tesalonicenses', name_en: '2 Thessalonians', testament: 'NT', total_chapters: 3, groupId: 'epistolas_paulinas', groupName: 'Epístolas Paulinas', icon: Timer },
  '1TI': { id: 54, code: '1TI', name_es: '1 Timoteo', name_en: '1 Timothy', testament: 'NT', total_chapters: 6, groupId: 'epistolas_paulinas', groupName: 'Epístolas Paulinas', icon: UserRoundCheck },
  '2TI': { id: 55, code: '2TI', name_es: '2 Timoteo', name_en: '2 Timothy', testament: 'NT', total_chapters: 4, groupId: 'epistolas_paulinas', groupName: 'Epístolas Paulinas', icon: Flame },
  TIT: { id: 56, code: 'TIT', name_es: 'Tito', name_en: 'Titus', testament: 'NT', total_chapters: 3, groupId: 'epistolas_paulinas', groupName: 'Epístolas Paulinas', icon: UserCheck },
  PHM: { id: 57, code: 'PHM', name_es: 'Filemón', name_en: 'Philemon', testament: 'NT', total_chapters: 1, groupId: 'epistolas_paulinas', groupName: 'Epístolas Paulinas', icon: Handshake },
  HEB: { id: 58, code: 'HEB', name_es: 'Hebreos', name_en: 'Hebrews', testament: 'NT', total_chapters: 13, groupId: 'epistolas_paulinas', groupName: 'Epístolas Paulinas', icon: Landmark },

  // --- Epístolas Generales ---
  JAS: { id: 59, code: 'JAS', name_es: 'Santiago', name_en: 'James', testament: 'NT', total_chapters: 5, groupId: 'epistolas_generales', groupName: 'Epístolas Generales', icon: Hammer },
  '1PE': { id: 60, code: '1PE', name_es: '1 Pedro', name_en: '1 Peter', testament: 'NT', total_chapters: 5, groupId: 'epistolas_generales', groupName: 'Epístolas Generales', icon: Anchor },
  '2PE': { id: 61, code: '2PE', name_es: '2 Pedro', name_en: '2 Peter', testament: 'NT', total_chapters: 3, groupId: 'epistolas_generales', groupName: 'Epístolas Generales', icon: ShieldAlert },
  '1JN': { id: 62, code: '1JN', name_es: '1 Juan', name_en: '1 John', testament: 'NT', total_chapters: 5, groupId: 'epistolas_generales', groupName: 'Epístolas Generales', icon: Heart },
  '2JN': { id: 63, code: '2JN', name_es: '2 Juan', name_en: '2 John', testament: 'NT', total_chapters: 1, groupId: 'epistolas_generales', groupName: 'Epístolas Generales', icon: HeartHandshake },
  '3JN': { id: 64, code: '3JN', name_es: '3 Juan', name_en: '3 John', testament: 'NT', total_chapters: 1, groupId: 'epistolas_generales', groupName: 'Epístolas Generales', icon: Mail },
  JUD: { id: 65, code: 'JUD', name_es: 'Judas', name_en: 'Jude', testament: 'NT', total_chapters: 1, groupId: 'epistolas_generales', groupName: 'Epístolas Generales', icon: Shield },

  // --- Revelación y Profecía ---
  REV: { id: 66, code: 'REV', name_es: 'Apocalipsis', name_en: 'Revelation', testament: 'NT', total_chapters: 22, groupId: 'apocalipsis', groupName: 'Revelación y Profecía', icon: Eye },
};

export const ALL_66_BOOKS: Book[] = Object.values(BIBLE_BOOKS_MAP).map((m) => ({
  id: m.id,
  code: m.code,
  name_es: m.name_es,
  name_en: m.name_en,
  testament: m.testament,
  total_chapters: m.total_chapters,
}));

export function getBookMetadata(bookCodeOrId: string | number): BookMetadata | null {
  if (typeof bookCodeOrId === 'number') {
    const found = Object.values(BIBLE_BOOKS_MAP).find((b) => b.id === bookCodeOrId);
    return found || null;
  }
  const upper = bookCodeOrId.toUpperCase();
  if (BIBLE_BOOKS_MAP[upper]) return BIBLE_BOOKS_MAP[upper];
  const foundByName = Object.values(BIBLE_BOOKS_MAP).find(
    (b) => b.name_es.toLowerCase() === bookCodeOrId.toLowerCase() || b.name_en.toLowerCase() === bookCodeOrId.toLowerCase()
  );
  return foundByName || null;
}

export function getBookIconComponent(book: Book | null | undefined): React.ComponentType<{ size?: number | string; className?: string; color?: string; strokeWidth?: number }> {
  if (!book) return BookOpen;
  const meta = getBookMetadata(book.code) || getBookMetadata(book.id);
  return meta ? meta.icon : BookOpen;
}
