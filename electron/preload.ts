import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  generatePPT: (data: any) => ipcRenderer.invoke('generate-ppt', data),
  generatePreview: (data: any) => ipcRenderer.invoke('generate-preview', data),
  listTemplates: () => ipcRenderer.invoke('list-templates'),
  loadTemplate: (name: string) => ipcRenderer.invoke('load-template', name),
  fetchCompanyInfo: (stockCode: string) => ipcRenderer.invoke('fetch-company-info', stockCode),
})
