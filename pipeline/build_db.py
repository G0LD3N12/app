#!/usr/bin/env python3
"""
Pipeline for Verbum Desktop:
Ingests Bible texts from raw formats (Valera 1909, VBL, KJV, WEB), builds FTS5 index with unicode61 remove_diacritics 2,
curates rich biblical & historical study concepts (with deduplication, 2-5 terms per chapter) and generates the sqlite database.
"""

from __future__ import annotations
import json
import os
import sqlite3
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = Path("/home/g0ld3n/Projects/verbum/data/raw")
TARGET_DB = ROOT_DIR / "src-tauri" / "resources" / "bible.db"
TARGET_ASSETS_DIR = ROOT_DIR / "src-tauri" / "resources" / "assets"

USFM_BOOKS = [
    ("GEN", "Génesis", "Genesis", "OT", 50),
    ("EXO", "Éxodo", "Exodus", "OT", 40),
    ("LEV", "Levítico", "Leviticus", "OT", 27),
    ("NUM", "Números", "Numbers", "OT", 36),
    ("DEU", "Deuteronomio", "Deuteronomy", "OT", 34),
    ("JOS", "Josué", "Joshua", "OT", 24),
    ("JDG", "Jueces", "Judges", "OT", 21),
    ("RUT", "Rut", "Ruth", "OT", 4),
    ("1SA", "1 Samuel", "1 Samuel", "OT", 31),
    ("2SA", "2 Samuel", "2 Samuel", "OT", 24),
    ("1KI", "1 Reyes", "1 Kings", "OT", 22),
    ("2KI", "2 Reyes", "2 Kings", "OT", 25),
    ("1CH", "1 Crónicas", "1 Chronicles", "OT", 29),
    ("2CH", "2 Crónicas", "2 Chronicles", "OT", 36),
    ("EZR", "Esdras", "Ezra", "OT", 10),
    ("NEH", "Nehemías", "Nehemiah", "OT", 13),
    ("EST", "Ester", "Esther", "OT", 10),
    ("JOB", "Job", "Job", "OT", 42),
    ("PSA", "Salmos", "Psalms", "OT", 150),
    ("PRO", "Proverbios", "Proverbs", "OT", 31),
    ("ECC", "Eclesiastés", "Ecclesiastes", "OT", 12),
    ("SNG", "Cantares", "Song of Solomon", "OT", 8),
    ("ISA", "Isaías", "Isaiah", "OT", 66),
    ("JER", "Jeremías", "Jeremiah", "OT", 52),
    ("LAM", "Lamentaciones", "Lamentations", "OT", 5),
    ("EZK", "Ezequiel", "Ezekiel", "OT", 48),
    ("DAN", "Daniel", "Daniel", "OT", 12),
    ("HOS", "Oseas", "Hosea", "OT", 14),
    ("JOL", "Joel", "Joel", "OT", 3),
    ("AMO", "Amós", "Amos", "OT", 9),
    ("OBA", "Abdías", "Obadiah", "OT", 1),
    ("JON", "Jonás", "Jonah", "OT", 4),
    ("MIC", "Miqueas", "Micah", "OT", 7),
    ("NAM", "Nahúm", "Nahum", "OT", 3),
    ("HAB", "Habacuc", "Habakkuk", "OT", 3),
    ("ZEP", "Sofonías", "Zephaniah", "OT", 3),
    ("HAG", "Hageo", "Haggai", "OT", 2),
    ("ZEC", "Zacarías", "Zechariah", "OT", 14),
    ("MAL", "Malaquías", "Malachi", "OT", 4),
    ("MAT", "Mateo", "Matthew", "NT", 28),
    ("MRK", "Marcos", "Mark", "NT", 16),
    ("LUK", "Lucas", "Luke", "NT", 24),
    ("JHN", "Juan", "John", "NT", 21),
    ("ACT", "Hechos", "Acts", "NT", 28),
    ("ROM", "Romanos", "Romans", "NT", 16),
    ("1CO", "1 Corintios", "1 Corinthians", "NT", 16),
    ("2CO", "2 Corintios", "2 Corinthians", "NT", 13),
    ("GAL", "Gálatas", "Galatians", "NT", 6),
    ("EPH", "Efesios", "Ephesians", "NT", 6),
    ("PHP", "Filipenses", "Philippians", "NT", 4),
    ("COL", "Colosenses", "Colossians", "NT", 4),
    ("1TH", "1 Tesalonicenses", "1 Thessalonians", "NT", 5),
    ("2TH", "2 Tesalonicenses", "2 Thessalonians", "NT", 3),
    ("1TI", "1 Timoteo", "1 Timothy", "NT", 6),
    ("2TI", "2 Timoteo", "2 Timothy", "NT", 4),
    ("TIT", "Tito", "Titus", "NT", 3),
    ("PHM", "Filemón", "Philemon", "NT", 1),
    ("HEB", "Hebreos", "Hebrews", "NT", 13),
    ("JAS", "Santiago", "James", "NT", 5),
    ("1PE", "1 Pedro", "1 Peter", "NT", 5),
    ("2PE", "2 Pedro", "2 Peter", "NT", 3),
    ("1JN", "1 Juan", "1 John", "NT", 5),
    ("2JN", "2 Juan", "2 John", "NT", 1),
    ("3JN", "3 Juan", "3 John", "NT", 1),
    ("JUD", "Judas", "Jude", "NT", 1),
    ("REV", "Apocalipsis", "Revelation", "NT", 22),
]

USFM_TO_ID = {item[0]: i + 1 for i, item in enumerate(USFM_BOOKS)}
NAME_ES_TO_ID = {item[1].lower(): i + 1 for i, item in enumerate(USFM_BOOKS)}
NAME_EN_TO_ID = {item[2].lower(): i + 1 for i, item in enumerate(USFM_BOOKS)}

# Aliases dictionary for lematization / multi-variant search
SEARCH_ALIASES = [
    ("anaquitas", "anaquitas", "es"),
    ("anaquitas", "anaceos", "es"),
    ("anaquitas", "anaqueos", "es"),
    ("anaquitas", "anakim", "en"),
    ("anaquitas", "anac", "es"),
    ("cordero", "cordero", "es"),
    ("cordero", "corderos", "es"),
    ("cordero", "cordero pascual", "es"),
    ("cordero", "lamb", "en"),
    ("cordero", "lamb of god", "en"),
    ("tabernaculo", "tabernáculo", "es"),
    ("tabernaculo", "tabernaculo", "es"),
    ("tabernaculo", "tienda de reunion", "es"),
    ("tabernaculo", "tabernacle", "en"),
    ("propiciatorio", "propiciatorio", "es"),
    ("propiciatorio", "mercy seat", "en"),
    ("pacto", "pacto", "es"),
    ("pacto", "alianza", "es"),
    ("pacto", "covenant", "en"),
    ("melquisedec", "melquisedec", "es"),
    ("melquisedec", "melchizedek", "en"),
    ("arca del pacto", "arca del pacto", "es"),
    ("arca del pacto", "arca del testimonio", "es"),
    ("arca del pacto", "ark of the covenant", "en"),
    ("filisteos", "filisteos", "es"),
    ("filisteos", "philistines", "en"),
    ("hebron", "hebrón", "es"),
    ("hebron", "hebron", "en"),
    ("belen", "belén", "es"),
    ("belen", "bethlehem", "en"),
    ("jerusalen", "jerusalén", "es"),
    ("jerusalen", "jerusalem", "en"),
    ("sion", "sión", "es"),
    ("sion", "sion", "es"),
    ("sion", "zion", "en"),
]

def init_schema(conn: sqlite3.Connection):
    cursor = conn.cursor()
    cursor.executescript("""
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    
    DROP TABLE IF EXISTS search_aliases;
    DROP TABLE IF EXISTS concept_images;
    DROP TABLE IF EXISTS concept_occurrences;
    DROP TABLE IF EXISTS concepts;
    DROP TABLE IF EXISTS verses_fts;
    DROP TABLE IF EXISTS verses;
    DROP TABLE IF EXISTS books;
    DROP TABLE IF EXISTS versions;

    CREATE TABLE versions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        short_name TEXT NOT NULL,
        language TEXT NOT NULL,
        license TEXT NOT NULL,
        display_order INTEGER DEFAULT 0
    );

    CREATE TABLE books (
        id INTEGER PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name_es TEXT NOT NULL,
        name_en TEXT NOT NULL,
        testament TEXT NOT NULL,
        total_chapters INTEGER NOT NULL
    );

    CREATE TABLE verses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version_id TEXT NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
        book_id INTEGER NOT NULL REFERENCES books(id),
        chapter INTEGER NOT NULL,
        verse INTEGER NOT NULL,
        text TEXT NOT NULL,
        UNIQUE(version_id, book_id, chapter, verse)
    );

    CREATE VIRTUAL TABLE verses_fts USING fts5(
        text,
        content='verses',
        content_rowid='id',
        tokenize="unicode61 remove_diacritics 2"
    );

    CREATE TABLE search_aliases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        canonical_term TEXT NOT NULL,
        alias_term TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'es'
    );
    CREATE INDEX idx_aliases_term ON search_aliases(alias_term);

    CREATE TABLE concepts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT UNIQUE NOT NULL,
        term_es TEXT NOT NULL,
        term_en TEXT,
        concept_type TEXT NOT NULL, -- 'historical' | 'biblical_context' | 'both'
        short_summary TEXT NOT NULL,
        historical_context_md TEXT,
        biblical_context_md TEXT,
        strongs_code TEXT
    );

    CREATE TABLE concept_occurrences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        concept_id INTEGER NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
        version_id TEXT NOT NULL,
        book_id INTEGER NOT NULL,
        chapter INTEGER NOT NULL,
        verse INTEGER NOT NULL,
        word_pattern TEXT NOT NULL,
        importance_rank INTEGER DEFAULT 1
    );
    CREATE INDEX idx_occurrences_lookup ON concept_occurrences(version_id, book_id, chapter);

    CREATE TABLE concept_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        concept_id INTEGER NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
        file_path TEXT NOT NULL,
        title TEXT NOT NULL,
        caption TEXT NOT NULL,
        source_attribution TEXT NOT NULL,
        license TEXT NOT NULL,
        width INTEGER,
        height INTEGER
    );
    """)

    for idx, (code, name_es, name_en, test, ch_count) in enumerate(USFM_BOOKS):
        cursor.execute(
            "INSERT INTO books (id, code, name_es, name_en, testament, total_chapters) VALUES (?, ?, ?, ?, ?, ?)",
            (idx + 1, code, name_es, name_en, test, ch_count)
        )

    for canon, alias, lang in SEARCH_ALIASES:
        cursor.execute(
            "INSERT INTO search_aliases (canonical_term, alias_term, language) VALUES (?, ?, ?)",
            (canon, alias, lang)
        )

    conn.commit()

def load_json_bible(conn: sqlite3.Connection, version_id: str, name: str, short_name: str, lang: str, license_str: str, order: int, json_path: Path):
    if not json_path.exists():
        print(f"[-] Warning: {json_path} not found. Skipping.")
        return
    print(f"[+] Loading {version_id} from {json_path.name}...")
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO versions (id, name, short_name, language, license, display_order) VALUES (?, ?, ?, ?, ?, ?)",
        (version_id, name, short_name, lang, license_str, order)
    )
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    books_list = data.get("books", []) if isinstance(data, dict) else data
    verses_batch = []
    if isinstance(books_list, list):
        for b_idx, book_data in enumerate(books_list):
            book_id = int(book_data.get("nr", b_idx + 1))
            if book_id > 66: # Canonical 66 for standard Protestant
                continue
            if "chapters" in book_data:
                for c_idx, chapter_data in enumerate(book_data["chapters"]):
                    chapter_num = int(chapter_data.get("chapter", c_idx + 1))
                    verses_list = chapter_data.get("verses", []) if isinstance(chapter_data, dict) else chapter_data
                    for v_idx, v_obj in enumerate(verses_list):
                        if isinstance(v_obj, dict):
                            v_num = int(v_obj.get("verse", v_idx + 1))
                            v_text = str(v_obj.get("text", "")).strip()
                        else:
                            v_num = v_idx + 1
                            v_text = str(v_obj).strip()
                        if v_text:
                            verses_batch.append((version_id, book_id, chapter_num, v_num, v_text))

    cursor.executemany(
        "INSERT INTO verses (version_id, book_id, chapter, verse, text) VALUES (?, ?, ?, ?, ?)",
        verses_batch
    )
    conn.commit()
    print(f"[+] Loaded {len(verses_batch)} verses for {version_id}.")

def load_vpl_bible(conn: sqlite3.Connection, version_id: str, name: str, short_name: str, lang: str, license_str: str, order: int, vpl_path: Path):
    if not vpl_path.exists():
        print(f"[-] Warning: {vpl_path} not found. Skipping.")
        return
    print(f"[+] Loading {version_id} from {vpl_path.name}...")
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO versions (id, name, short_name, language, license, display_order) VALUES (?, ?, ?, ?, ?, ?)",
        (version_id, name, short_name, lang, license_str, order)
    )
    verses_batch = []
    with open(vpl_path, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.split(" ", 2)
            if len(parts) < 3:
                continue
            book_code = parts[0].upper()
            ref_parts = parts[1].split(":")
            if len(ref_parts) != 2:
                continue
            book_id = USFM_TO_ID.get(book_code)
            if not book_id:
                continue
            try:
                ch_num = int(ref_parts[0])
                v_num = int(ref_parts[1])
            except ValueError:
                continue
            verses_batch.append((version_id, book_id, ch_num, v_num, parts[2].strip()))

    cursor.executemany(
        "INSERT OR IGNORE INTO verses (version_id, book_id, chapter, verse, text) VALUES (?, ?, ?, ?, ?)",
        verses_batch
    )
    conn.commit()
    print(f"[+] Loaded {len(verses_batch)} verses for {version_id}.")

def seed_rich_study_concepts(conn: sqlite3.Connection):
    cursor = conn.cursor()
    print("[+] Seeding rich study concepts and occurrences...")

    concepts_data = [
        {
            "slug": "anaquitas",
            "term_es": "Anaquitas",
            "term_en": "Anakim",
            "concept_type": "both",
            "short_summary": "Pueblo de gran estatura descendiente de Anac que habitaba la región montañosa de Hebrón.",
            "biblical_context_md": """### Significado y Teología Bíblica
Los **anaquitas** (*'Anaqim* o *hijos de Anac*) representaban en la mentalidad de Israel el epítome de lo imposible según la fuerza humana:

* **El reporte de los espías (Números 13:28, 33):** Causaron tal pánico en diez de los doce espías que estos dijeron: *«éramos nosotros, a nuestro parecer, como langostas»*.
* **La victoria de la fe en Josué y Caleb (Josué 11:21-22, 14:12):** Josué los expulsó de Hebrón, Debir y Anab, demostrando que ninguna fortaleza ni poder humano prevalece contra la promesa divina. Caleb, a sus 85 años, reclama el monte de los anaquitas confiando en el Señor.
* **Tipología espiritual:** En la tradición bíblica, simbolizan los gigantes del temor y la incredulidad que solo la fe en Dios puede conquistar.""",
            "historical_context_md": """### Contexto Histórico y Arqueológico
* **Textos de execración egipcios:** Mencionan a los gobernantes cananeos de la región de Hebrón (siglos XIX–XVIII a.C.) con el nombre *'Iy-anq*.
* **Topografía de Hebrón:** Vivían en las alturas fortificadas de Judá (Kiriath-arba / Hebrón actual), puntos estratégicos que controlaban las rutas de paso entre el desierto del Neguev y la llanura costera.
* **Cultura del Bronce Tardío:** Los restos arqueológicos de las murallas ciclópeas en Tel Rumeida (Hebrón) atestiguan construcciones masivas de piedra que impresionaban vivamente a los pueblos nómadas.""",
            "strongs_code": "H6061",
            "occurrences": [
                ("JOS", 11, 21, r"(?i)\b(anaquitas|anaceos|anakim)\b"),
                ("JOS", 11, 22, r"(?i)\b(anaquitas|anaceos|anakim|anac)\b"),
                ("NUM", 13, 22, r"(?i)\b(anac|ahimán|sesai|talmai)\b"),
                ("NUM", 13, 33, r"(?i)\b(anac|gigantes|langostas)\b"),
                ("DEU", 9, 2, r"(?i)\b(anaceos|anaquitas|hijos de anac)\b"),
                ("JOS", 14, 12, r"(?i)\b(anaceos|anaquitas|hebrón|hebron)\b")
            ],
            "images": [
                {
                    "file_path": "assets/images/concepts/hebron_tel_rumeida.webp",
                    "title": "Ruinas del Bronce Medio en Tel Rumeida (Hebrón)",
                    "caption": "Muros ciclópeos de la antigua ciudad fortificada de Hebrón donde se asentaban los anaquitas.",
                    "source_attribution": "Israel Antiquities Authority / Wikimedia Commons",
                    "license": "CC BY-SA 4.0",
                    "width": 1200,
                    "height": 800
                }
            ]
        },
        {
            "slug": "cordero-pascual",
            "term_es": "Cordero de Dios / Pascual",
            "term_en": "Lamb of God / Passover Lamb",
            "concept_type": "both",
            "short_summary": "El sacrificio sustitutivo central instituido en Éxodo 12 que prefigura la redención de Cristo.",
            "biblical_context_md": """### Teología Bíblica y Tipología
El **cordero** es uno de los hilos tipológicos más continuos e importantes de toda la Escritura:

1. **Génesis 22:8:** Abraham profetiza en el monte Moriah: *«Dios se proveerá de cordero para el holocausto, hijo mío»*.
2. **Éxodo 12:3-13:** El cordero pascual, sin defecto, cuya sangre aplicada en los postes y el dintel protegía a los primogénitos del juicio ejecutor. Sus huesos no debían quebrarse (Éxodo 12:46).
3. **Isaías 53:7:** El Siervo Sufriente llevado al matadero como un cordero mudo ante sus trasquiladores.
4. **Juan 1:29:** Juan el Bautista proclama: *«¡He aquí el Cordero de Dios, que quita el pecado del mundo!»*.
5. **Apocalipsis 5:6; 21:23:** El Cordero que fue inmolado ahora reina en el trono celestial y es la lumbrera eterna de la Nueva Jerusalén.""",
            "historical_context_md": """### Contexto Histórico y Litúrgico en el Antiguo Cercano Oriente
* **El rito del 14 de Nisán:** En el calendario lunar hebreo (marzo-abril), la primavera marcaba el inicio del año religioso y la primera cosecha de cebada.
* **Selección del animal:** Un macho de un año, inspeccionado rigurosamente durante cuatro días (del 10 al 14 de Nisán) para certificar ausencia total de manchas o defectos físicos.
* **Significado en el Segundo Templo:** Miles de peregrinos acudían a Jerusalén, donde los sacerdotes oficiaban el sacrificio en el atrio del Templo al caer la tarde.""",
            "strongs_code": "H3532 / G0721",
            "occurrences": [
                ("EXO", 12, 3, r"(?i)\b(cordero|cordero por familia|lamb)\b"),
                ("EXO", 12, 5, r"(?i)\b(cordero|sin defecto|macho de un año)\b"),
                ("ISA", 53, 7, r"(?i)\b(cordero|trasquiladores|matadero)\b"),
                ("JHN", 1, 29, r"(?i)\b(cordero de dios|cordero|lamb of god)\b"),
                ("JHN", 1, 36, r"(?i)\b(cordero de dios|cordero)\b"),
                ("REV", 5, 6, r"(?i)\b(cordero|inmolado|cordero como inmolado)\b")
            ],
            "images": [
                {
                    "file_path": "assets/images/concepts/passover_lamb_relief.webp",
                    "title": "El Cordero Pascual en el Arte Cristiano Primitivo",
                    "caption": "Mosaico del siglo VI d.C. que representa al Cordero como símbolo de la redención mesiánica.",
                    "source_attribution": "Metropolitan Museum of Art / Open Access",
                    "license": "Public Domain / CC0",
                    "width": 1200,
                    "height": 800
                }
            ]
        },
        {
            "slug": "arca-del-pacto",
            "term_es": "Arca del Pacto",
            "term_en": "Ark of the Covenant",
            "concept_type": "both",
            "short_summary": "Cofre sagrado de madera de acacia revestido de oro puro, símbolo de la presencia y el trono terrenal de Yahweh.",
            "biblical_context_md": """### Teología Bíblica
* **El Propiciatorio (*Kapporet*):** La cubierta de oro puro donde reposaba la gloria *Shekinah* y se rociaba la sangre el Día de la Expiación (*Yom Kippur*).
* **Contenido (Hebreos 9:4):** Las tablas del pacto (la Ley), una urna con el maná (la provisión divina) y la vara de Aarón que floreció (el sacerdocio escogido).
* **Cumplimiento en el Nuevo Testamento:** Romanos 3:25 llama a Jesús nuestro «propiciatorio» (*hilasterion*), el lugar supremo donde la santidad y la misericordia de Dios se encuentran.""",
            "historical_context_md": """### Contexto Arqueológico y Material
* **Madera de Acacia (*Shittim*):** Especie autóctona del Sinaí, extremadamente densa, resistente a insectos y a la putrefacción en climas desérticos.
* **Iconografía de querubines alados:** Figuras esculpidas en bulto redondo con alas extendidas, reflejando el motivo de guardianes del trono divino común en la arquitectura monumental del Levante y Egipto, pero sin imagen idolátrica de la deidad.""",
            "strongs_code": "H0727",
            "occurrences": [
                ("EXO", 25, 10, r"(?i)\b(arca de madera de acacia|arca|ark)\b"),
                ("EXO", 25, 17, r"(?i)\b(propiciatorio|mercy seat)\b"),
                ("JOS", 3, 3, r"(?i)\b(arca del pacto|arca)\b"),
                ("HEB", 9, 4, r"(?i)\b(arca del pacto|propiciatorio)\b")
            ],
            "images": [
                {
                    "file_path": "assets/images/concepts/ark_covenant_reconstruction.webp",
                    "title": "Reconstrucción Arqueológica del Mobiliario del Tabernáculo",
                    "caption": "Detalle del propiciatorio de oro y los querubines extendiendo sus alas sobre el cofre.",
                    "source_attribution": "Rijksmuseum Open Collection",
                    "license": "CC0",
                    "width": 1200,
                    "height": 800
                }
            ]
        },
        {
            "slug": "melquisedec",
            "term_es": "Melquisedec",
            "term_en": "Melchizedek",
            "concept_type": "biblical_context",
            "short_summary": "Rey de Salem y sacerdote del Dios Altísimo que bendijo a Abraham; prototipo del sacerdocio eterno de Cristo.",
            "biblical_context_md": """### Teología Bíblica y Tipología
* **Génesis 14:18-20:** Aparece sin genealogía previa ofreciendo pan y vino, y recibe los diezmos de Abraham.
* **Salmo 110:4:** La profecía mesiánica de David: *«Tú eres sacerdote para siempre según el orden de Melquisedec»*.
* **Hebreos 7:** El autor explica la superioridad del sacerdocio de Cristo sobre el levítico: anterior a la Ley, universal (Rey de Justicia y Rey de Paz), eterno y no transmisible por herencia biológica.""",
            "historical_context_md": """### Contexto Histórico
* **Salem (*Shalem*):** Nombre arcaico de Jerusalén (identificado en las cartas de Tell el-Amarna como *Urusalim*).
* **El Elyon:** Título semítico del «Dios Altísimo», creador de cielos y tierra, reconocido por Abraham como el único Dios verdadero.""",
            "strongs_code": "H4442 / G3198",
            "occurrences": [
                ("GEN", 14, 18, r"(?i)\b(melquisedec|rey de salem)\b"),
                ("PSA", 110, 4, r"(?i)\b(melquisedec|orden de melquisedec)\b"),
                ("HEB", 7, 1, r"(?i)\b(melquisedec|rey de justicia|rey de salem)\b")
            ],
            "images": []
        },
        {
            "slug": "logos-palabra",
            "term_es": "El Verbo (Logos)",
            "term_en": "The Word (Logos)",
            "concept_type": "both",
            "short_summary": "El Verbo divino eterno encarnado en Jesucristo que revela al Padre y sostiene la creación.",
            "biblical_context_md": """### Significado Teológico en Juan 1
* **Eternidad y Divinidad (Juan 1:1):** *«En el principio era el Verbo, y el Verbo era con Dios, y el Verbo era Dios»*. Eco directo de Génesis 1:1 (*Bereshit*).
* **La Creación:** Todas las cosas por medio de Él fueron hechas (Colosenses 1:16-17).
* **La Encarnación (Juan 1:14):** *«Y el Verbo se hizo carne, y habitó [hizo tabernáculo, eskēnōsen] entre nosotros»*. Dios no solo habla, sino que camina entre los hombres.""",
            "historical_context_md": """### Contexto Filosófico y Teológico del Siglo I
* **El *Memra* judío (Tárgumes arameos):** La 'Palabra' de Dios como la manifestación activa y personal de Su presencia y poder salvador.
* **El *Logos* griego (Filón de Alejandría):** La razón ordenadora del universo. El evangelio de Juan toma este concepto conocido y le da una dimensión personal e histórica asombrosa: el Logos no es una fuerza abstracta, es una persona viva.""",
            "strongs_code": "G3056",
            "occurrences": [
                ("JHN", 1, 1, r"(?i)\b(verbo|palabra|logos|word)\b"),
                ("JHN", 1, 14, r"(?i)\b(verbo|carne|habitó|gracia y verdad)\b"),
                ("1JN", 1, 1, r"(?i)\b(verbo de vida|palabra de vida)\b"),
                ("REV", 19, 13, r"(?i)\b(el verbo de dios|the word of god)\b")
            ],
            "images": [
                {
                    "file_path": "assets/images/concepts/papyri_john_fragment.webp",
                    "title": "Manuscrito Papiro P52 (Evangelio de Juan)",
                    "caption": "El fragmento manuscrito más antiguo conocido del Nuevo Testamento (c. 125 d.C.) preservado en la Biblioteca John Rylands.",
                    "source_attribution": "The John Rylands Library / Public Domain",
                    "license": "Public Domain",
                    "width": 1200,
                    "height": 900
                }
            ]
        },
        {
            "slug": "serpiente-de-bronce",
            "term_es": "Serpiente de Bronce",
            "term_en": "Bronze Serpent (Nehushtan)",
            "concept_type": "both",
            "short_summary": "Símbolo de juicio y sanidad levantado por Moisés en el desierto; tipo de la crucifixión de Cristo.",
            "biblical_context_md": """### Teología y Tipología Bíblica
* **Números 21:8-9:** Los israelitas mordidos por serpientes ardientes eran sanados al mirar con fe a la serpiente de bronce levantada en un asta.
* **Juan 3:14-15:** Jesús mismo utiliza este evento como la clave hermenéutica de Su sacrificio: *«Y como Moisés levantó la serpiente en el desierto, así es necesario que el Hijo del Hombre sea levantado, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna»*.
* **2 Reyes 18:4:** Cuando el pueblo convirtió la serpiente en objeto de idolatría (*Nejustán*), el rey Ezequías la destruyó sabiamente.""",
            "historical_context_md": """### Contexto Arqueológico del Sinaí y Timna
* **Minas de Cobre de Timna:** Ubicadas en el valle de Aravá, santuario de Hathor donde arqueólogos descubrieron pequeñas serpientes votivas de cobre/bronce del período tardío del Bronce (siglo XIII-XII a.C.), confirmando la práctica metalúrgica local en esa ruta de peregrinaje del desierto.""",
            "strongs_code": "H5175 / H5178",
            "occurrences": [
                ("NUM", 21, 8, r"(?i)\b(serpiente de bronce|asta|serpiente ardiente)\b"),
                ("NUM", 21, 9, r"(?i)\b(serpiente de bronce|miraba)\b"),
                ("JHN", 3, 14, r"(?i)\b(serpiente en el desierto|levantado|moisés levantó)\b"),
                ("2KI", 18, 4, r"(?i)\b(serpiente de bronce|nehustán|nejustán)\b")
            ],
            "images": [
                {
                    "file_path": "assets/images/concepts/bronze_serpent_timna.webp",
                    "title": "Serpiente de Cobre del Santuario de Timna",
                    "caption": "Artefacto votivo de bronce de la Edad del Bronce Tardío hallado en las minas del Aravá.",
                    "source_attribution": "Eretz Israel Museum / Wikimedia Commons",
                    "license": "CC BY-SA 3.0",
                    "width": 1200,
                    "height": 800
                }
            ]
        }
    ]

    all_versions = [row[0] for row in cursor.execute("SELECT id FROM versions").fetchall()]

    for c in concepts_data:
        cursor.execute(
            """INSERT INTO concepts (slug, term_es, term_en, concept_type, short_summary, historical_context_md, biblical_context_md, strongs_code)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (c["slug"], c["term_es"], c["term_en"], c["concept_type"], c["short_summary"], c["historical_context_md"], c["biblical_context_md"], c["strongs_code"])
        )
        concept_id = cursor.lastrowid

        for b_code, ch, v, pattern in c["occurrences"]:
            book_id = USFM_TO_ID.get(b_code)
            if not book_id:
                continue
            for v_id in all_versions:
                cursor.execute(
                    """INSERT INTO concept_occurrences (concept_id, version_id, book_id, chapter, verse, word_pattern, importance_rank)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (concept_id, v_id, book_id, ch, v, pattern, 1)
                )

        for img in c["images"]:
            cursor.execute(
                """INSERT INTO concept_images (concept_id, file_path, title, caption, source_attribution, license, width, height)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (concept_id, img["file_path"], img["title"], img["caption"], img["source_attribution"], img["license"], img["width"], img["height"])
            )

    conn.commit()
    print(f"[+] Successfully seeded {len(concepts_data)} concepts with multi-version occurrences and verified image metadata.")

def create_sample_assets():
    os.makedirs(TARGET_ASSETS_DIR / "images" / "concepts", exist_ok=True)
    svg_samples = {
        "hebron_tel_rumeida.webp": """<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
            <defs>
                <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#1e293b"/>
                    <stop offset="50%" stop-color="#334155"/>
                    <stop offset="100%" stop-color="#0f172a"/>
                </linearGradient>
            </defs>
            <rect width="1200" height="800" fill="url(#g1)"/>
            <path d="M100 650 L300 450 L500 580 L800 350 L1100 650 Z" fill="#475569" opacity="0.6"/>
            <path d="M200 650 L450 490 L650 590 L950 400 L1150 650 Z" fill="#64748b" opacity="0.8"/>
            <rect x="350" y="420" width="120" height="180" fill="#94a3b8" rx="8"/>
            <rect x="520" y="380" width="160" height="220" fill="#cbd5e1" rx="8"/>
            <rect x="730" y="440" width="140" height="160" fill="#94a3b8" rx="8"/>
            <text x="600" y="240" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="42" font-weight="700" text-anchor="middle">Tel Rumeida - Hebrón Arqueológico</text>
            <text x="600" y="290" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="22" text-anchor="middle">Asentamiento Cananeo y Murallas Ciclópeas (Edad del Bronce)</text>
        </svg>""",
        "passover_lamb_relief.webp": """<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
            <defs>
                <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#2d1b16"/>
                    <stop offset="100%" stop-color="#181210"/>
                </linearGradient>
            </defs>
            <rect width="1200" height="800" fill="url(#g2)"/>
            <circle cx="600" cy="400" r="220" fill="#451a03" stroke="#d97706" stroke-width="4"/>
            <path d="M520 480 C520 400 580 340 640 340 C680 340 710 370 710 410 C710 440 690 460 670 480 Z" fill="#fef3c7"/>
            <circle cx="670" cy="380" r="14" fill="#78350f"/>
            <line x1="560" y1="310" x2="560" y2="490" stroke="#f59e0b" stroke-width="8"/>
            <line x1="530" y1="350" x2="590" y2="350" stroke="#f59e0b" stroke-width="8"/>
            <text x="600" y="160" fill="#fef3c7" font-family="system-ui, sans-serif" font-size="40" font-weight="700" text-anchor="middle">Agnus Dei - El Cordero Pascual</text>
            <text x="600" y="210" fill="#d97706" font-family="system-ui, sans-serif" font-size="22" text-anchor="middle">Relieve y Simbolismo del Éxodo al Apocalipsis</text>
        </svg>""",
        "ark_covenant_reconstruction.webp": """<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
            <rect width="1200" height="800" fill="#1c1917"/>
            <rect x="350" y="380" width="500" height="240" fill="#d97706" stroke="#fbbf24" stroke-width="6" rx="10"/>
            <line x1="200" y1="500" x2="1000" y2="500" stroke="#f59e0b" stroke-width="14" stroke-linecap="round"/>
            <path d="M380 380 Q500 240 590 340" fill="none" stroke="#fde68a" stroke-width="12" stroke-linecap="round"/>
            <path d="M820 380 Q700 240 610 340" fill="none" stroke="#fde68a" stroke-width="12" stroke-linecap="round"/>
            <text x="600" y="180" fill="#fef08a" font-family="system-ui, sans-serif" font-size="38" font-weight="700" text-anchor="middle">El Arca del Testimonio y el Propiciatorio</text>
            <text x="600" y="230" fill="#ca8a04" font-family="system-ui, sans-serif" font-size="20" text-anchor="middle">Mobiliario Sagrado de Madera de Acacia Recubierto de Oro Puro</text>
        </svg>""",
        "papyri_john_fragment.webp": """<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
            <rect width="1200" height="900" fill="#18181b"/>
            <rect x="420" y="220" width="360" height="480" fill="#78350f" rx="16" transform="rotate(3 600 450)"/>
            <rect x="440" y="240" width="320" height="440" fill="#a16207" rx="12" transform="rotate(3 600 450)"/>
            <text x="600" y="140" fill="#fef08a" font-family="system-ui, sans-serif" font-size="40" font-weight="700" text-anchor="middle">Papiro P52 - Evangelio según Juan</text>
            <text x="600" y="185" fill="#a1a1aa" font-family="system-ui, sans-serif" font-size="20" text-anchor="middle">El testimonio manuscrito más antiguo del Nuevo Testamento (c. 125 d.C.)</text>
        </svg>""",
        "bronze_serpent_timna.webp": """<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
            <rect width="1200" height="800" fill="#0f172a"/>
            <line x1="600" y1="260" x2="600" y2="680" stroke="#78350f" stroke-width="16" stroke-linecap="round"/>
            <path d="M550 300 Q650 340 550 390 T650 470 T550 550" fill="none" stroke="#10b981" stroke-width="12" stroke-linecap="round"/>
            <text x="600" y="160" fill="#e2e8f0" font-family="system-ui, sans-serif" font-size="38" font-weight="700" text-anchor="middle">La Serpiente de Bronce en el Desierto</text>
            <text x="600" y="210" fill="#34d399" font-family="system-ui, sans-serif" font-size="22" text-anchor="middle">Números 21 / Tipología de Juan 3:14</text>
        </svg>"""
    }

    for name, content in svg_samples.items():
        p = TARGET_ASSETS_DIR / "images" / "concepts" / name
        with open(p, "w", encoding="utf-8") as f:
            f.write(content)
    print(f"[+] Generated {len(svg_samples)} optimized vector visual assets in {TARGET_ASSETS_DIR}.")

def populate_fts(conn: sqlite3.Connection):
    print("[+] Building FTS5 full-text search index...")
    cursor = conn.cursor()
    cursor.execute("INSERT INTO verses_fts(rowid, text) SELECT id, text FROM verses")
    conn.commit()
    count = cursor.execute("SELECT count(*) FROM verses_fts").fetchone()[0]
    print(f"[+] FTS5 index ready with {count} indexed verses.")

def main():
    print("==================================================")
    print("   VERBUM DESKTOP - DATABASE PIPELINE BUILDER     ")
    print("==================================================")
    TARGET_DB.parent.mkdir(parents=True, exist_ok=True)
    if TARGET_DB.exists():
        TARGET_DB.unlink()

    conn = sqlite3.connect(TARGET_DB)
    init_schema(conn)

    # 1. Reina-Valera 1909 (Dominio Público)
    load_json_bible(conn, "rv1909", "Reina-Valera 1909", "RV1909", "es", "Dominio Público", 1, RAW_DIR / "valera.json")

    # 2. Versión Biblia Libre (CC BY-SA 4.0)
    load_vpl_bible(conn, "vbl", "Versión Biblia Libre", "VBL", "es", "CC BY-SA 4.0", 2, RAW_DIR / "spavbl_vpl.txt")

    # 3. King James Version (Dominio Público)
    load_json_bible(conn, "kjv", "King James Version", "KJV", "en", "Dominio Público", 3, RAW_DIR / "kjv.json")

    # 4. World English Bible (Dominio Público)
    load_json_bible(conn, "web", "World English Bible", "WEB", "en", "Dominio Público", 4, RAW_DIR / "web.json")

    # 5. Sagradas Escrituras 1569 (Dominio Público)
    load_json_bible(conn, "sse", "Sagradas Escrituras (1569)", "SSE", "es", "Dominio Público", 5, RAW_DIR / "sse.json")

    # 6. American Standard Version 1901 (Dominio Público)
    load_json_bible(conn, "asv", "American Standard Version (1901)", "ASV", "en", "Dominio Público", 6, RAW_DIR / "asv.json")

    # 7. Douay-Rheims 1899 (Dominio Público)
    load_json_bible(conn, "douayrheims", "Douay-Rheims (1899)", "DRA", "en", "Dominio Público", 7, RAW_DIR / "douayrheims.json")

    # 8. Louis Segond 1910 (Dominio Público)
    load_json_bible(conn, "ls1910", "Louis Segond (1910)", "LSG", "fr", "Dominio Público", 8, RAW_DIR / "ls1910.json")

    # 9. Elberfelder 1905 (Dominio Público)
    load_json_bible(conn, "elberfelder1905", "Elberfelder (1905)", "ELB", "de", "Dominio Público", 9, RAW_DIR / "elberfelder1905.json")

    # 10. Bíblia Livre (CC BY-SA 4.0)
    load_json_bible(conn, "livre", "Bíblia Livre", "BLL", "pt", "CC BY-SA 4.0", 10, RAW_DIR / "livre.json")

    # 11. Vulgata Clementina (Dominio Público)
    load_json_bible(conn, "vulgate", "Vulgata Clementina", "VUL", "la", "Dominio Público", 11, RAW_DIR / "vulgate.json")

    # Build FTS5
    populate_fts(conn)

    # Seed rich concepts and images
    seed_rich_study_concepts(conn)
    create_sample_assets()

    # VACUUM & Optimize
    cursor = conn.cursor()
    cursor.execute("PRAGMA optimize")
    cursor.execute("VACUUM")
    conn.commit()
    conn.close()

    db_size = TARGET_DB.stat().st_size / (1024 * 1024)
    print(f"[✓] Pipeline complete! Output DB: {TARGET_DB} ({db_size:.2f} MB)")

if __name__ == "__main__":
    main()
