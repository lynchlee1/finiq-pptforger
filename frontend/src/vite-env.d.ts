declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}

interface Window {
  electronAPI: {
    fetchCompanyInfo: (stockCode: string) => Promise<any>;
    readExcelData: (filePath?: string) => Promise<any>;
    generatePPT: (data: any) => Promise<any>;
    saveDebugFile: (content: string) => Promise<any>;
    getTemplateDir: () => Promise<{ templateDir: string; defaultTemplateDir: string }>;
    setTemplateDir: (templateDir: string) => Promise<{ success: boolean; templateDir?: string; error?: string }>;
    selectTemplateDir: () => Promise<{ canceled: boolean; templateDir?: string }>;
  };
}
