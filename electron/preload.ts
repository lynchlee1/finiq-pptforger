import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  fetchCompanyInfo: (stockCode: string) => ipcRenderer.invoke('fetch-company-info', stockCode),
  readExcelData: (filePath?: string) => ipcRenderer.invoke('read-excel-data', filePath),
  generatePPT: (data: any) => ipcRenderer.invoke('generate-ppt', data),
  saveDebugFile: (content: string) => ipcRenderer.invoke('save-debug-file', content),
  getTemplateDir: () => ipcRenderer.invoke('get-template-dir'),
  setTemplateDir: (templateDir: string) => ipcRenderer.invoke('set-template-dir', templateDir),
  selectTemplateDir: () => ipcRenderer.invoke('select-template-dir'),
})
