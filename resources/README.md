# Kommit Icon Files

## Source

- `icon.svg` — Master SVG icon (512x512) with git branch/merge motif

## Generated Files

### ✅ Available (Generated)

1. **icon.png** (512x512 PNG)
   - Used for: Linux AppImage/deb package icon, runtime window icon on Windows/Linux
   - Generated via: `node scripts/generate-icons.mjs`

2. **icon.ico** (multi-resolution: 16, 24, 32, 48, 64, 128, 256)
   - Used for: Windows installer, Windows taskbar
   - Generated via: `node scripts/generate-ico.mjs`

### ⚠️ TODO (macOS ICNS)

3. **icon.icns** (macOS icon format)
   - Used for: macOS .app bundle, macOS dock
   - Status: Not yet generated (requires macOS tools or online converter)

## How to Regenerate Icons

```bash
# Generate all basic icons (PNG)
node scripts/generate-icons.mjs

# Generate proper Windows ICO
node scripts/generate-ico.mjs
```

## Generating ICNS for macOS

Since ICNS generation requires platform-specific tools, use one of these methods:

### Option 1: Online Converter (Easiest)

1. Visit https://cloudconvert.com/png-to-icns
2. Upload `resources/icon.png`
3. Download and save as `resources/icon.icns`

### Option 2: On macOS (Best Quality)

```bash
# Create iconset directory
mkdir icon.iconset

# Generate required sizes
sips -z 16 16     icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png

# Convert to ICNS
iconutil -c icns icon.iconset -o icon.icns

# Clean up
rm -rf icon.iconset
```

## Current Status

✅ icon.svg — Created  
✅ icon.png — Generated (512x512)  
✅ icon.ico — Generated (multi-resolution, proper format)  
❌ icon.icns — TODO: Generate when building for macOS

## Note

The app will work perfectly in development and for Windows/Linux builds with the current icons. The ICNS file is only needed when building the macOS `.dmg` installer.
