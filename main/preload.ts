import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  generatePPT: (data: any) => ipcRenderer.invoke('generate-ppt', data),
  selectTemplate: () => ipcRenderer.invoke('select-template'),
})
