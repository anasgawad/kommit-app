// ============================================================
// Kommit — Icon Generation Script
// Generates PNG/ICO/ICNS from SVG source
// ============================================================

import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const resourcesDir = join(__dirname, '../resources')

async function generateIcons() {
  console.log('🎨 Generating Kommit icons...\n')

  // Read SVG
  const svgBuffer = readFileSync(join(resourcesDir, 'icon.svg'))

  try {
    // Generate 512x512 PNG
    console.log('📦 Generating icon.png (512x512)...')
    await sharp(svgBuffer).resize(512, 512).png().toFile(join(resourcesDir, 'icon.png'))
    console.log('✅ icon.png created\n')

    // Generate ICO (Windows) - multiple sizes
    console.log('📦 Generating icon.ico (multi-resolution)...')

    // Create individual PNGs for ICO
    const sizes = [16, 24, 32, 48, 64, 128, 256]
    const icoImages = []

    for (const size of sizes) {
      const buffer = await sharp(svgBuffer).resize(size, size).png().toBuffer()
      icoImages.push(buffer)
    }

    // For ICO generation, we'll create the largest size for now
    // A proper ICO requires a specialized library, but for Electron,
    // a single 256x256 PNG renamed to .ico often works
    await sharp(svgBuffer).resize(256, 256).png().toFile(join(resourcesDir, 'icon.ico'))

    console.log('✅ icon.ico created (256x256 PNG format)\n')
    console.log(
      '⚠️  Note: This is a PNG renamed to .ico. For production, use a proper ICO converter.'
    )
    console.log('   Windows will accept it, but for best results, use:')
    console.log('   - https://convertio.co/png-ico/')
    console.log(
      '   - Or ImageMagick: magick icon.png -define icon:auto-resize=256,128,96,64,48,32,16 icon.ico\n'
    )

    // Generate ICNS (macOS) - requires specialized tool
    console.log('📦 Generating icon.icns...')

    // Create iconset directory structure would require png2icns or iconutil
    // For now, create a 512x512 PNG as placeholder
    await sharp(svgBuffer).resize(512, 512).png().toFile(join(resourcesDir, 'icon.icns.png'))

    console.log('⚠️  ICNS generation requires macOS tools (iconutil) or png2icns')
    console.log('   Created icon.icns.png (512x512) as placeholder.')
    console.log('   To create proper ICNS:')
    console.log('   1. On macOS: Use iconutil or png2icns')
    console.log('   2. Online: https://cloudconvert.com/png-to-icns')
    console.log('   3. Or install png2icns: npm install -g png2icns\n')

    console.log('✅ Icon generation complete!')
    console.log('\n📋 Summary:')
    console.log('   ✅ icon.png (512x512) - Ready for Linux & runtime icon')
    console.log('   ⚠️  icon.ico - Basic PNG format, consider proper ICO conversion')
    console.log('   ❌ icon.icns - Requires macOS tools or online converter')
    console.log('\nThe app will now work in development with the custom icon! 🎉')
  } catch (error) {
    console.error('❌ Error generating icons:', error)
    process.exit(1)
  }
}

generateIcons()
