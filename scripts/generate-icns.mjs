// ============================================================
// Kommit — ICNS Generation Script
// Generates macOS ICNS from PNG
// ============================================================

import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import pkg from 'png2icons'
const { PNG2Icons } = pkg

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const resourcesDir = join(__dirname, '../resources')

async function generateICNS() {
  console.log('🍎 Generating macOS ICNS file...\n')

  try {
    // Read the 512x512 PNG
    const pngPath = join(resourcesDir, 'icon.png')
    const input = await fs.readFile(pngPath)

    console.log('📦 Creating ICNS from icon.png (512x512)...')

    // Create PNG2Icons instance
    const png2icons = new PNG2Icons(input)

    // Generate ICNS
    const icnsOutput = await png2icons.icns()

    // Write ICNS file
    await fs.writeFile(join(resourcesDir, 'icon.icns'), icnsOutput)

    console.log('✅ icon.icns created\n')
    console.log('🎉 macOS ICNS file is ready!')
  } catch (error) {
    console.error('❌ Error generating ICNS:', error)
    console.error('\n⚠️  If this fails, you can:')
    console.error('   1. Use online converter: https://cloudconvert.com/png-to-icns')
    console.error('   2. Or build on macOS where you have iconutil available')
    process.exit(1)
  }
}

generateICNS()
