// ============================================================
// Kommit — ICO Generation Script
// Generates proper multi-resolution ICO from PNG
// ============================================================

import pngToIco from 'png-to-ico'
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const resourcesDir = join(__dirname, '../resources')

async function generateICO() {
  console.log('🎨 Generating proper ICO file...\n')

  try {
    // Read the SVG
    const svgBuffer = readFileSync(join(resourcesDir, 'icon.svg'))

    // Generate multiple PNG sizes for ICO
    const sizes = [16, 24, 32, 48, 64, 128, 256]
    const pngBuffers = []

    console.log('📦 Generating PNG sizes:', sizes.join(', '))

    for (const size of sizes) {
      const buffer = await sharp(svgBuffer).resize(size, size).png().toBuffer()
      pngBuffers.push(buffer)
    }

    console.log('✅ PNG sizes generated\n')

    // Create ICO from PNGs
    console.log('📦 Creating multi-resolution ICO...')
    const icoBuffer = await pngToIco(pngBuffers)

    // Write ICO file
    writeFileSync(join(resourcesDir, 'icon.ico'), icoBuffer)

    console.log('✅ icon.ico created with sizes: 16, 24, 32, 48, 64, 128, 256\n')
    console.log('🎉 Proper Windows ICO file is ready!')
  } catch (error) {
    console.error('❌ Error generating ICO:', error)
    process.exit(1)
  }
}

generateICO()
