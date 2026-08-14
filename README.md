# Verbum Desktop 📖

> Software bíblico de alto rendimiento, 100% offline, diseñado para lectura editorial profunda, búsqueda instantánea e investigación arqueológica y tipológica.

![Verbum Desktop Screenshot](public/verbum_logo.png)

---

## ✨ Características Principales

- **⚡ Búsqueda Instantánea FTS5 (SQLite)**:
  - Motor de búsqueda de texto completo con latencia menor a 10ms sobre **120,962 versículos**.
  - **Insensibilidad total a diacríticos** (`tokenize="unicode61 remove_diacritics 2"`): buscar `jose` encuentra `José`, `Moises` encuentra `Moisés`.
  - **Lematización y expansión de variantes canónicas**: buscar `anaquitas` consulta automáticamente `anaceos`, `anaqueos`, `anakim` y `anac`.

- **🔍 Super Command Palette (`Ctrl+K` & `Ctrl+F`)**:
  - Interfaz de comandos tipo Raycast / Spotlight.
  - Detección inteligente de pasajes directos (ej. `Juan 3:16`, `Josué 15:1`, `Génesis 1`).
  - Búsqueda textual, exploración de conceptos de estudio y comandos de navegación con control por teclado (`↑`, `↓`, `J`, `K`, `↵`, `ESC`).

- **🏛️ Capa de Estudio Arqueológico y Tipológico**:
  - Términos bíblicos interactivos con datos históricos, trasfondo lingüístico (códigos Strong), tipología cristológica y registros arqueológicos en formato WebP/SVG de dominio público.
  - Panel lateral deslizable (*slide-over drawer*) no intrusivo.

- **◫ Vista Paralela Sincronizada (`P`)**:
  - Comparación de traducciones lado a lado (ej. **RV1909** vs **KJV** o **VBL**) con alineación y sincronización versículo a versículo.

- **📜 Sensación de Documento Editorial**:
  - Área de lectura generosa (800px – 1040px) con tipografía sagrada y noble.
  - Selección sutil con indicador de margen fino (`│`) en lugar de bloques pesados.
  - Micro-toolbar flotante en hover para guardar marcadores (🔖), copiar citas formateadas (📋) y comparar traducciones (⇄).

- **🎨 Paletas Cromáticas 100% Nativas**:
  - **Verbum Gold Obsidian**: Obsidiana y bronce canónico.
  - **OLED Pitch Black**: Negro puro `#000000` con contraste blanco puro (sin residuos amarillos).
  - **Tokyo Night**: Azul tormenta y acentos eléctricos oficiales.
  - **Catppuccin Mocha**: Tonos pastel y acento Mauve `#cba6f7`.
  - **Vercel Geist Dark**: Estética minimalista con azul `#0070f3`.
  - **Nord Arctic Polar**: Azules árticos y acento hielo `#88c0d0`.
  - **Papiro Sepia**: Textura cálida editorial para lectura prolongada sin fatiga.
  - **Minimal Pure White**: Fondo inmaculado y tipografía nítida.

- **🚀 100% Offline & Aceleración por Hardware**:
  - Tipografías `.woff2` empaquetadas localmente en `public/fonts/` (*Literata, Crimson Pro, Cormorant Garamond, Plus Jakarta Sans, Inter, Cinzel*). Cero llamadas de red en tiempo de ejecución.
  - Virtualización CSS con `content-visibility: auto` y capas GPU (`transform: translateZ(0)`) para 60+ FPS estables en capítulos extensos.
  - Cabecera nativa integrada con región de arrastre (`data-tauri-drag-region`), doble clic para maximizar y controles de ventana.

---

## 🏗️ Arquitectura Técnica

```text
┌─────────────────────────────────────────────────────────────┐
│                    React 19 + TypeScript                    │
│   (Vite + Lucide Icons + Local WOFF2 Fonts + Vanilla CSS)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ Tauri v2 IPC (invoke)
┌──────────────────────────────▼──────────────────────────────┐
│                    Rust 1.97 Backend Core                   │
│      (tauri::Builder + DatabaseManager + Window Manager)     │
└──────────────────────────────┬──────────────────────────────┘
                               │ Rusqlite (WAL mode)
┌──────────────────────────────▼──────────────────────────────┐
│              SQLite 3 Local Database (bible.db)             │
│   • 4 Versiones: RV1909, VBL, KJV, WEB (120,962 versículos) │
│   • FTS5 Full-Text Index (unicode61 remove_diacritics 2)    │
│   • Alias Map & Synonyms (search_aliases)                   │
│   • Concept Library & Archaeological Images (~29.7 MB)      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Versiones Bíblicas Incluidas

1. **Reina-Valera 1909 (RV1909)** — Español (Dominio Público).
2. **Versión Biblia Libre (VBL)** — Español (Licencia Creative Commons BY-SA 4.0).
3. **King James Version (KJV)** — English (Dominio Público).
4. **World English Bible (WEB)** — English (Dominio Público).

---

## ⌨️ Atajos de Teclado Globales

| Atajo | Acción |
|---|---|
| `Ctrl + K` / `Ctrl + F` | Abrir Super Command Palette (Búsqueda global y comandos) |
| `P` | Alternar Vista Paralela (Split View) |
| `J` / `K` | Navegar al versículo siguiente / anterior en lectura |
| `←` / `→` | Navegar al capítulo anterior / siguiente |
| `Alt + ←` / `Alt + →` | Salto rápido de capítulos |
| `ESC` | Cerrar panel de estudio, modal o Command Palette |

---

## 🛠️ Instalación y Desarrollo

### Requisitos Previos
- **Node.js** v18+ y `npm`.
- **Rust** v1.75+ con `cargo`.
- Dependencias de sistema de Tauri para Linux (WebKitGTK, libsoup, libssl).

### Ejecución en Modo Desarrollo
```bash
# Instalar dependencias del frontend
npm install

# Iniciar servidor de desarrollo con Tauri
npm run tauri dev
```

### Compilación para Producción
```bash
# Construir el binario nativo optimizado
npm run tauri build
```

---

## 📄 Licencia

Código fuente bajo licencia MIT. Los textos bíblicos e imágenes arqueológicas respetan sus respectivas licencias de dominio público y Creative Commons indicadas en cada artefacto.
