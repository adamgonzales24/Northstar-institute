const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('northstarDesktop', {
  loadState: () => ipcRenderer.sendSync('northstar:load'),
  saveState: (state) => ipcRenderer.send('northstar:save', state),
  dataPath: () => ipcRenderer.sendSync('northstar:dataPath'),
  isPortable: () => ipcRenderer.sendSync('northstar:isPortable'),
  openDataFolder: () => ipcRenderer.invoke('northstar:openDataFolder'),
  saveReading: (courseId, info, bytes) => ipcRenderer.invoke('northstar:saveReading', courseId, info, bytes),
  loadReading: (courseId, id) => ipcRenderer.invoke('northstar:loadReading', courseId, id),
  deleteReading: (courseId, id) => ipcRenderer.invoke('northstar:deleteReading', courseId, id),
  program: () => ipcRenderer.sendSync('northstar:program'),
  gitStatus: () => ipcRenderer.invoke('northstar:gitStatus'),
  gitCommit: (payload) => ipcRenderer.invoke('northstar:gitCommit', payload),
})
