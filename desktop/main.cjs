const { app, BrowserWindow, ipcMain, protocol, net, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { pathToFileURL } = require('url')

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'northstar',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
])

const PROGRAM = process.env.NORTHSTAR_PROGRAM === 'bootcamp' ? 'bootcamp' : 'institute'
app.setName(PROGRAM === 'bootcamp' ? 'Northstar Bootcamp' : 'Northstar Institute')

let mainWindow = null
let saveTimer = null
let pendingState = null
let portable = false
let dataDir = null
let dataFile = null

function exeDir() {
  return app.isPackaged ? path.dirname(app.getPath('exe')) : path.resolve(__dirname, '..')
}

function resolveDataDir() {
  const beside = path.join(exeDir(), 'data')
  const marker = path.join(exeDir(), 'portable')
  if (process.env.NORTHSTAR_PORTABLE === '1' || fs.existsSync(marker) || fs.existsSync(path.join(beside, 'student.json'))) {
    portable = true
    fs.mkdirSync(beside, { recursive: true })
    return beside
  }
  const docs = path.join(app.getPath('documents'), PROGRAM === 'bootcamp' ? 'Northstar Bootcamp' : 'Northstar Institute')
  fs.mkdirSync(docs, { recursive: true })
  return docs
}

function readState() {
  try {
    if (!fs.existsSync(dataFile)) return null
    const parsed = JSON.parse(fs.readFileSync(dataFile, 'utf8'))
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch (err) {
    console.warn('Northstar: could not read student.json', err)
    return null
  }
}

function writeState(state) {
  if (!state || typeof state !== 'object') return
  fs.mkdirSync(dataDir, { recursive: true })
  const tmp = dataFile + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2))
  fs.renameSync(tmp, dataFile)
}

function scheduleSave(state) {
  pendingState = state
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    try {
      writeState(pendingState)
    } catch (err) {
      console.warn('Northstar: save failed', err)
    }
  }, 200)
}

function flushSave() {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  if (pendingState) {
    try {
      writeState(pendingState)
    } catch (err) {
      console.warn('Northstar: flush failed', err)
    }
  }
}

function distDir() {
  return path.join(app.getAppPath(), 'dist')
}

function fileFromNorthstarUrl(requestUrl) {
  const dist = distDir()
  let pathname = '/'
  try {
    pathname = decodeURIComponent(new URL(requestUrl).pathname || '/')
  } catch {
    pathname = '/'
  }
  if (pathname === '/' || pathname === '') pathname = '/index.html'
  let file = path.normalize(path.join(dist, pathname))
  if (!file.startsWith(dist)) file = path.join(dist, 'index.html')
  const exists = fs.existsSync(file) && fs.statSync(file).isFile()
  if (!exists) file = path.join(dist, 'index.html')
  return file
}

function createWindow() {
  const state = readState()
  const last = state && state.onboarded && typeof state.lastRoute === 'string' ? state.lastRoute : '/'
  const startPath = last.startsWith('/') ? last : '/'

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: '#0c1218',
    title: PROGRAM === 'bootcamp' ? 'Northstar Bootcamp' : 'Northstar Institute',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  const page = PROGRAM === 'bootcamp' ? '/bootcamp.html' : '/index.html'
  mainWindow.loadURL('northstar://app' + (startPath === '/' ? page : startPath))

  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.warn('Northstar: page failed', code, desc, url)
  })
  if (process.env.NORTHSTAR_VERIFY) {
    mainWindow.webContents.on('did-finish-load', async () => {
      try {
        const t = await mainWindow.webContents.executeJavaScript(
          `document.title + '\\n' + (document.body.innerText || '').slice(0, 900)`
        )
        console.log('NORTHSTAR_VERIFY\n' + t)
      } catch (err) {
        console.warn('NORTHSTAR_VERIFY_ERR', err)
      }
    })
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('northstar://')) return { action: 'allow' }
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('northstar://') || url.startsWith('file://')) return
    event.preventDefault()
    shell.openExternal(url)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function registerIpc() {
  ipcMain.on('northstar:program', (event) => {
    event.returnValue = PROGRAM
  })
  ipcMain.on('northstar:load', (event) => {
    event.returnValue = readState()
  })
  ipcMain.on('northstar:save', (_event, state) => {
    scheduleSave(state)
  })
  ipcMain.on('northstar:dataPath', (event) => {
    event.returnValue = dataFile
  })
  ipcMain.on('northstar:isPortable', (event) => {
    event.returnValue = portable
  })
  ipcMain.handle('northstar:openDataFolder', async () => {
    const err = await shell.openPath(dataDir)
    return err || null
  })
  ipcMain.handle('northstar:saveReading', async (_e, courseId, info, bytes) => {
    const dir = readingsDir(courseId)
    fs.mkdirSync(dir, { recursive: true })
    const id = safeId(info.id)
    fs.writeFileSync(path.join(dir, id), Buffer.from(bytes))
    fs.writeFileSync(path.join(dir, id + '.json'), JSON.stringify({ ...info, id }, null, 2))
    return { ok: true, id }
  })
  ipcMain.handle('northstar:loadReading', async (_e, courseId, id) => {
    const file = path.join(readingsDir(courseId), safeId(id))
    if (!fs.existsSync(file)) return null
    const meta = readReadingMeta(courseId, id)
    return { mime: meta?.mime || 'application/octet-stream', data: fs.readFileSync(file) }
  })
  ipcMain.handle('northstar:deleteReading', async (_e, courseId, id) => {
    const dir = readingsDir(courseId)
    const base = path.join(dir, safeId(id))
    for (const p of [base, base + '.json']) {
      try {
        fs.unlinkSync(p)
      } catch {
        /* missing is fine */
      }
    }
    return { ok: true }
  })
}

function safeId(id) {
  const s = String(id || '').replace(/[^a-zA-Z0-9._-]/g, '')
  if (!s) throw new Error('bad id')
  return s
}

function readingsDir(courseId) {
  return path.join(dataDir, 'readings', safeId(courseId))
}

function readReadingMeta(courseId, id) {
  try {
    return JSON.parse(fs.readFileSync(path.join(readingsDir(courseId), safeId(id) + '.json'), 'utf8'))
  } catch {
    return null
  }
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  })

  app.whenReady().then(() => {
    dataDir = resolveDataDir()
    dataFile = path.join(dataDir, 'student.json')
    const readme = path.join(dataDir, 'README.txt')
    if (!fs.existsSync(readme)) {
      fs.writeFileSync(
        readme,
        [
          'Northstar Institute — student record',
          '',
          'student.json is your whole unofficial transcript, enrollments, quizzes, and last page.',
          'Copy that file to move to another computer.',
          '',
          'On the new machine, either:',
          '  1. Place it in Documents/Northstar Institute/student.json, or',
          '  2. Open Settings → Import backup JSON.',
          '',
          'This is not an accredited diploma.',
          '',
        ].join('\n')
      )
    }

    protocol.handle('northstar', (request) => net.fetch(pathToFileURL(fileFromNorthstarUrl(request.url)).href))
    registerIpc()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('before-quit', () => {
    flushSave()
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
