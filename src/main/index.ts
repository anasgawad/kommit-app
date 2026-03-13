// ============================================================
// Kommit — Main Process Entry Point
// ============================================================

import { app, BrowserWindow, shell, ipcMain, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerGitHandlers } from './ipc/git-handlers'
import { registerRepoHandlers } from './ipc/repo-handlers'
import { RepoService } from './services/repo'
import { IPC_CHANNELS } from '@shared/ipc-channels'

// Electron Store is ESM-only in v10, use dynamic import
let store: {
  get: (key: string, defaultValue?: unknown) => unknown
  set: (key: string, value: unknown) => void
}

async function initStore(): Promise<void> {
  const ElectronStore = (await import('electron-store')).default
  store = new ElectronStore({
    name: 'kommit-config',
    defaults: {
      recentRepos: [],
      windowBounds: { width: 1280, height: 800 },
      theme: 'system'
    }
  }) as typeof store
}

function createWindow(): BrowserWindow {
  const bounds = store.get('windowBounds', { width: 1280, height: 800 }) as {
    width: number
    height: number
    x?: number
    y?: number
  }

  const mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false,
    title: 'Kommit',
    backgroundColor: '#1e1e2e',
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Save window bounds on close
  mainWindow.on('close', () => {
    const [width, height] = mainWindow.getSize()
    const [x, y] = mainWindow.getPosition()
    store.set('windowBounds', { width, height, x, y })
  })

  // Open external links in the system browser
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the renderer
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

// ============================================================
// Window Control Handlers (for frameless window)
// ============================================================

function registerWindowHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) {
      window.minimize()
    }
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) {
      if (window.isMaximized()) {
        window.unmaximize()
      } else {
        window.maximize()
      }
    }
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) {
      window.close()
    }
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, () => {
    const window = BrowserWindow.getFocusedWindow()
    return window ? window.isMaximized() : false
  })
}

app.whenReady().then(async () => {
  // Set app user model id for Windows
  electronApp.setAppUserModelId('com.kommit.app')

  // Remove default application menu
  Menu.setApplicationMenu(null)

  // Dev tools shortcut handling
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize store and services
  await initStore()
  const repoService = new RepoService(store)

  // Register IPC handlers
  registerGitHandlers()
  registerRepoHandlers(repoService)
  registerWindowHandlers()

  // Create the main window
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
