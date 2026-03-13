# Kommit Icon & Frameless Window Implementation

## ✅ Completed Changes

### 1. Custom Application Icon

**Created a git branch/merge motif icon** in the app's blue accent color (`#89b4fa`) on dark background (`#1e1e2e`).

**Files Created:**

- `resources/icon.svg` — Source SVG (1.8K)
- `resources/icon.png` — 512x512 PNG for Linux and runtime window icon (21K)
- `resources/icon.ico` — Multi-resolution Windows icon: 16, 24, 32, 48, 64, 128, 256 (364K)
- `resources/README.md` — Documentation for icon generation

**Scripts Created:**

- `scripts/generate-icons.mjs` — Converts SVG to PNG
- `scripts/generate-ico.mjs` — Generates proper multi-resolution ICO from SVG
- `scripts/generate-icns.mjs` — ICNS generation script (requires macOS or online tool)

**NPM Packages Added:**

- `sharp` (dev) — High-performance image processing
- `png-to-ico` (dev) — Proper multi-resolution ICO generation

**NPM Script Added:**

```json
"icons": "node scripts/generate-icons.mjs && node scripts/generate-ico.mjs"
```

### 2. Frameless Window with Custom Title Bar

**Removed default Electron menu and frame**, added custom window controls.

**Main Process Changes** (`src/main/index.ts`):

- Added `frame: false` to BrowserWindow options
- Added `icon: join(__dirname, '../../resources/icon.png')` for window icon
- Added `Menu.setApplicationMenu(null)` to remove File/Edit/View menu
- Implemented 4 window control IPC handlers:
  - `WINDOW_MINIMIZE` — Minimizes the window
  - `WINDOW_MAXIMIZE` — Toggles maximize/restore
  - `WINDOW_CLOSE` — Closes the window
  - `WINDOW_IS_MAXIMIZED` — Returns maximized state

**IPC Channels** (`src/shared/ipc-channels.ts`):

- Added 4 window control channels

**Preload Bridge** (`src/preload/index.ts`):

- Exposed `window.api.window` with minimize, maximize, close, isMaximized methods

**UI Components Updated:**

- **AppLayout.tsx** — Added minimize/maximize/close buttons to title bar (right side)
- **WelcomeScreen.tsx** — Added same title bar with window controls (was missing before)

**Styling** (`src/renderer/styles/globals.css`):

- Added `.window-control-btn` styles
- Hover states for buttons (close turns red, others turn gray)

### 3. Documentation Updates

**Updated AGENTS.md** with:

- Window & UI section documenting frameless window and icon details
- Updated Process Model section to include frameless window note

---

## 📁 Files Modified

| File                                             | Type      | Description                                  |
| ------------------------------------------------ | --------- | -------------------------------------------- |
| `resources/icon.svg`                             | Created   | Source SVG icon with git branch/merge design |
| `resources/icon.png`                             | Generated | 512x512 PNG for Linux & runtime              |
| `resources/icon.ico`                             | Generated | Multi-res Windows ICO (16-256px)             |
| `resources/README.md`                            | Created   | Icon generation documentation                |
| `scripts/generate-icons.mjs`                     | Created   | SVG to PNG conversion script                 |
| `scripts/generate-ico.mjs`                       | Created   | Proper ICO generation script                 |
| `scripts/generate-icns.mjs`                      | Created   | ICNS generation script (macOS)               |
| `src/main/index.ts`                              | Modified  | Frameless window + icon + window handlers    |
| `src/shared/ipc-channels.ts`                     | Modified  | Added 4 window control channels              |
| `src/preload/index.ts`                           | Modified  | Exposed window control API                   |
| `src/renderer/components/layout/AppLayout.tsx`   | Modified  | Added window control buttons                 |
| `src/renderer/components/repo/WelcomeScreen.tsx` | Modified  | Added title bar with controls                |
| `src/renderer/styles/globals.css`                | Modified  | Added window control button styles           |
| `AGENTS.md`                                      | Modified  | Documented frameless window & icon           |
| `package.json`                                   | Modified  | Added `npm run icons` script                 |

---

## 🚀 How to Use

### Regenerate Icons

```bash
npm run icons
```

### Run the App

```bash
npm run dev
```

### What You'll See

1. ✅ **No File/Edit/View menu** — Clean interface
2. ✅ **No OS title bar** — Frameless window
3. ✅ **Custom 32px title bar** — Dark theme with "Kommit" label
4. ✅ **Window control buttons** — Minimize, maximize/restore, close (top-right)
5. ✅ **Custom icon** — Git branch motif (once PNG is loaded)
6. ✅ **Draggable window** — Click and drag the title bar

### Cross-Platform Behavior

- **Windows:** Frameless with custom controls, proper ICO icon
- **Linux:** Frameless with custom controls, PNG icon
- **macOS:** Frameless with custom controls, ICNS icon (need to generate)

---

## ⚠️ macOS ICNS Note

The `icon.icns` file is **not yet generated** because it requires macOS-specific tools. To generate it:

**Option 1: Online (Easiest)**

1. Visit https://cloudconvert.com/png-to-icns
2. Upload `resources/icon.png`
3. Download as `icon.icns` and save to `resources/`

**Option 2: On macOS**
See instructions in `resources/README.md`

**Note:** The app will work fine without ICNS in development and for Windows/Linux builds. It's only needed for building macOS `.dmg` installers.

---

## 🎨 Icon Design Details

The icon features:

- **Background:** Rounded rectangle in dark theme color (`#1e1e2e`)
- **Foreground:** Git branch/merge visualization in blue accent (`#89b4fa`)
- **Elements:**
  - 3 branch lines (main, left branch, right branch)
  - 11 commit nodes (circles) at key points
  - Paths showing fork and merge patterns
  - Subtle glow effect on key nodes

The design is:

- ✅ Recognizable at all sizes (16px to 512px)
- ✅ Matches the app's color scheme
- ✅ Clearly represents git's branching/merging workflow
- ✅ Clean and modern aesthetic

---

## 🔧 Technical Implementation

### Window Controls Flow

```
Renderer (React)              Preload (IPC)           Main Process
┌─────────────────┐          ┌──────────────┐        ┌──────────────────┐
│ Button Click    │─────────▶│ window.api   │───────▶│ BrowserWindow    │
│ (minimize/max)  │          │ .window      │        │ .minimize()      │
│                 │          │ .minimize()  │        │ .maximize()      │
└─────────────────┘          └──────────────┘        └──────────────────┘
```

### Icon Loading

1. Main process sets `icon: path/to/icon.png` in BrowserWindow options
2. Electron loads the icon for:
   - Window frame (frameless, but still used internally)
   - Taskbar/dock representation
   - Alt+Tab preview (Windows)
3. OS-specific formats used during packaging:
   - Windows: `icon.ico` (from electron-builder.yml)
   - macOS: `icon.icns` (from electron-builder.yml)
   - Linux: `icon.png` (from electron-builder.yml)

---

## ✨ Result

Kommit now has:

- ✅ **Clean, professional UI** without default Electron menu clutter
- ✅ **Custom branded icon** representing git branching
- ✅ **Consistent cross-platform experience** with custom window controls
- ✅ **Draggable title bar** with window management
- ✅ **Production-ready** (except macOS ICNS, optional for now)

The app is ready to run with `npm run dev` and will showcase the new frameless design! 🎉
