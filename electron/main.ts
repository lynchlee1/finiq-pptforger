import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs'

const debugLogPath = join(app.getPath('userData'), 'debug.log');
function logDebug(message: string) {
  const timestamp = new Date().toISOString();
  try {
    appendFileSync(debugLogPath, `[${timestamp}] ${message}\n`);
  } catch (e) {
    console.error('Failed to write to debug log:', e);
  }
}

process.env.DIST = join(__dirname, '../dist')
process.env.PUBLIC = app.isPackaged ? process.env.DIST : join(__dirname, '../../frontend/public')

let win: BrowserWindow | null = null

const settingsPath = join(app.getPath('userData'), 'settings.json');
const defaultTemplateDir = () => join(process.env.PUBLIC!, 'templates/Deal_Summary_Template_1.0');

function readSettings(): { templateDir?: string } {
  try {
    if (!existsSync(settingsPath)) return {};
    return JSON.parse(readFileSync(settingsPath, 'utf-8'));
  } catch (err: any) {
    logDebug(`Failed to read settings: ${err.message}`);
    return {};
  }
}

function writeSettings(settings: { templateDir?: string }) {
  mkdirSync(app.getPath('userData'), { recursive: true });
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
}

function getTemplateDir() {
  return readSettings().templateDir || defaultTemplateDir();
}

function createWindow() {
  logDebug('Creating window...');
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#ffffff',
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(join(__dirname, '../../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// IPC Handlers

ipcMain.handle('get-template-dir', async () => {
  return { templateDir: getTemplateDir(), defaultTemplateDir: defaultTemplateDir() };
});

ipcMain.handle('set-template-dir', async (_, templateDir: string) => {
  const trimmed = templateDir.trim();
  if (trimmed && (!existsSync(trimmed) || !statSync(trimmed).isDirectory())) {
    return { success: false, error: `Template folder not found: ${trimmed}` };
  }

  writeSettings({ ...readSettings(), templateDir: trimmed || undefined });
  return { success: true, templateDir: getTemplateDir() };
});

ipcMain.handle('select-template-dir', async () => {
  const result = await dialog.showOpenDialog(win!, {
    title: 'Select template folder',
    properties: ['openDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const templateDir = result.filePaths[0];
  writeSettings({ ...readSettings(), templateDir });
  return { canceled: false, templateDir };
});

ipcMain.handle('fetch-company-info', async (_, stockCode: string) => {
  logDebug(`fetch-company-info called for: ${stockCode}`);
  try {
    // 1. Get company name from FnGuide
    const fnguideUrl = `https://comp.fnguide.com/SVO2/ASP/SVD_main.asp?pGB=1&gicode=A${stockCode}&cID=&MenuYn=Y&ReportGB=&NewMenuID=11&stkGb=&strResearchYN=`;
    const fnResponse = await fetch(fnguideUrl);
    const fnHtml = await fnResponse.text();
    
    // Simple regex to find company name
    const nameMatch = fnHtml.match(/<h1[^>]*id="giName"[^>]*>([^<]+)<\/h1>/i) || fnHtml.match(/<title>([^|]+)\|/i);
    let companyName = nameMatch ? nameMatch[1].trim() : '';
    
    if (!companyName) {
      logDebug('Failed to extract company name from FnGuide');
    }
    logDebug(`Extracted company name: ${companyName}`);

    // Extract market type
    const marketMatch = fnHtml.match(/<input[^>]*id="strMarket"[^>]*value="([^"]+)"/i);
    const marketTxtMatch = fnHtml.match(/<span[^>]*id="strMarketTxt"[^>]*>([^<]+)<\/span>/i);
    
    let stockMarket = marketMatch ? marketMatch[1].trim() : '';
    if (stockMarket === 'KSE') stockMarket = 'KOSPI';
    
    // If we want the Korean name like "코스피" or "코스닥"
    let stockMarketKor = '';
    if (marketTxtMatch) {
      const txt = marketTxtMatch[1].trim();
      if (txt.includes('코스피')) stockMarketKor = 'KOSPI';
      else if (txt.includes('코스닥')) stockMarketKor = 'KOSDAQ';
      else if (txt.includes('코넥스')) stockMarketKor = 'KONEX';
    }
    if (!stockMarketKor) stockMarketKor = stockMarket; // Fallback

    logDebug(`Extracted market: ${stockMarketKor}`);

    // 2. Search in KIND to get IDs
    const kindSearchUrl = 'https://kind.krx.co.kr/common/searchcorpname.do';
    const searchBody = new URLSearchParams();
    searchBody.append('method', 'searchCorpNameJson');
    searchBody.append('isurCd', '');
    searchBody.append('kisComCd', '');
    searchBody.append('repIsuCd', '');
    searchBody.append('mode', '');
    searchBody.append('tabMenu', '0');
    searchBody.append('companyNM', '');
    searchBody.append('searchCodeType', '');
    searchBody.append('searchCorpName', stockCode);
    searchBody.append('spotIsuTrdMktTpCd', '');
    searchBody.append('comAttrTpCd', '');
    searchBody.append('comAbbrv', '');

    const kindSearchResponse = await fetch(kindSearchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: searchBody.toString()
    });
    
    const kindSearchResults = await kindSearchResponse.json();
    if (!kindSearchResults || kindSearchResults.length === 0) {
      throw new Error(`Company not found in KIND for stock code ${stockCode}`);
    }

    const corpInfo = kindSearchResults[0];
    const { isurcd, kiscomcd, repisucd, repisusrtkornm } = corpInfo;
    companyName = repisusrtkornm;

    // 3. Fetch Total Info from KIND
    const kindInfoUrl = 'https://kind.krx.co.kr/corpdetail/totalinfo.do';
    const infoBody = new URLSearchParams();
    infoBody.append('method', 'searchTotalInfo');
    infoBody.append('isurCd', isurcd);
    infoBody.append('kisComCd', kiscomcd);
    infoBody.append('repIsuCd', repisucd);
    infoBody.append('mode', '');
    infoBody.append('tabMenu', '0');
    infoBody.append('companyNM', encodeURIComponent(companyName));
    infoBody.append('searchCodeType', '');
    infoBody.append('searchCorpName', companyName);
    infoBody.append('spotIsuTrdMktTpCd', corpInfo.spotisutrdmkttpcd || '1');
    infoBody.append('comAttrTpCd', corpInfo.comAttrTpCd || '1');
    infoBody.append('comAbbrv', companyName);

    const kindInfoResponse = await fetch(kindInfoUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: infoBody.toString()
    });
    
    const kindInfoHtml = await kindInfoResponse.text();
    
    const extractField = (label: string) => {
      const regex = new RegExp(`<th[^>]*>[^<]*${label}[^<]*<\\/th>\\s*<td[^>]*>([^<]*)<\\/td>`, 'i');
      const match = kindInfoHtml.match(regex);
      return match ? match[1].trim().replace(/&nbsp;/g, ' ') : '';
    };

    const companyData = {
      corp_name_en: extractField('영문명'),
      establishment_date: extractField('설립일'),
      representative: extractField('대표이사'),
      listing_date: extractField('상장일'),
      capital: extractField('자본금'),
      employees: extractField('종업원수'),
      fiscal_month: extractField('결산월'),
      phone: extractField('전화번호'),
      industry: extractField('업종'),
      main_products: extractField('주요제품'),
      address: extractField('주소'),
      homepage: extractField('홈페이지')
    };

    // 4. Fetch Summary Info from KIND (for corp_name_full and more accurate market)
    const kindSummaryUrl = 'https://kind.krx.co.kr/common/companysummary.do';
    const summaryBody = new URLSearchParams();
    summaryBody.append('method', 'searchCompanySummaryOvrvwDetail');
    summaryBody.append('strIsurCd', isurcd.substring(0, 5)); // KIND usually uses 5 digits for this
    summaryBody.append('lstCd', 'undefined');

    const kindSummaryResponse = await fetch(kindSummaryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: summaryBody.toString()
    });
    
    const kindSummaryHtml = await kindSummaryResponse.text();
    
    // Extract 한글명
    const corpNameMatch = kindSummaryHtml.match(/<th scope="row">한글명<\/th>\s*<td>\s*(?:<img[^>]*>\s*&nbsp;)?\s*([^<\s\n\r\t]+)\s*<\/td>/i);
    const corp_name = corpNameMatch ? corpNameMatch[1].trim() : companyName;

    // Extract 시장구분
    const marketTypeMatch = kindSummaryHtml.match(/<th scope="row">시장구분<\/th>\s*<td>\s*<strong[^>]*>([^<]+)<\/strong>/i);
    let stock_market = marketTypeMatch ? marketTypeMatch[1].trim() : stockMarketKor;
    if (stock_market.includes('유가증권')) stock_market = 'KOSPI';
    else if (stock_market.includes('코스닥')) stock_market = 'KOSDAQ';
    else if (stock_market.includes('코넥스')) stock_market = 'KONEX';

    // Extract 최신 사명 (corp_name_full) from 상호변경내역
    const corpNameFullMatch = kindSummaryHtml.match(/<h2[^>]*>상호변경내역<\/h2>.*?<tbody>\s*<tr>\s*<td[^>]*>.*?<\/td>\s*<td[^>]*>.*?<\/td>\s*<td[^>]*>(.*?)<\/td>/is);
    const corp_name_full = corpNameFullMatch ? corpNameFullMatch[1].trim() : (corp_name + '(주)'); // Fallback

    // 5. Fetch additional info from FnGuide (Issued shares and Shareholders)
    const shareholdersUrl = `https://comp.fnguide.com/SVO2/json/data/01_09_01/A${stockCode}.json`;
    let totalIssuedShares = 0;
    let shareholders: any[] = [];
    let shareholderClassification: any[] = [];

    try {
      // Extract issued shares from FnGuide main page HTML (already fetched in step 1)
      const sharesMatch = fnHtml.match(/발행주식수(?:<span[^>]*>[^<]*<\/span>)?<\/div>\s*<\/th>\s*<td[^>]*>([^<]+)<\/td>/i);
      if (sharesMatch) {
        const parts = sharesMatch[1].split('/');
        const common = parseInt(parts[0].replace(/,/g, '').trim()) || 0;
        totalIssuedShares = common;
      }

      // Extract Shareholder Classification (주주구분 현황)
      const classificationTableMatch = fnHtml.match(/<div[^>]*id="svdMainGrid5".*?<tbody>(.*?)<\/tbody>/is);
      if (classificationTableMatch) {
        const rowsHtml = classificationTableMatch[1];
        const rowRegex = /<tr><th[^>]*><div>(.*?)<\/div><\/th><td[^>]*>(.*?)<\/td><td[^>]*>(.*?)<\/td><td[^>]*>(.*?)<\/td><td[^>]*>(.*?)<\/td><\/tr>/gis;
        let match;
        const targetCategories = ["최대주주등", "자기주식", "우리사주조합"];
        while ((match = rowRegex.exec(rowsHtml)) !== null) {
            const category = match[1].replace(/&nbsp;/g, ' ').trim();
            const foundTarget = targetCategories.find(target => category.startsWith(target));
            if (foundTarget) {
                const shares = match[3].replace(/&nbsp;/g, '').trim();
                shareholderClassification.push({
                    category: foundTarget,
                    shares: shares || '0'
                });
            }
        }
      }

      // Fetch shareholders
      const shResponse = await fetch(shareholdersUrl);
      const shData = await shResponse.json();
      if (shData && shData.comp) {
        shareholders = shData.comp
          .filter((s: any) => s.SHER_GB_1 === '10')
          .map((s: any) => ({
            name: s.SHER_NM,
            relation: s.MAJ_REL_NM,
            shares: s.COMM_STK_QTY,
            ratio: s.SHER_RT
          }));
      }
    } catch (shErr) {
      logDebug(`Failed to fetch additional FnGuide info: ${shErr}`);
    }

    logDebug(`Fetched company data: ${JSON.stringify(companyData).substring(0, 100)}...`);

    return {
      success: true,
      companyName: corp_name,
      corp_name: corp_name,
      corp_name_full: corp_name_full,
      stock_market: stock_market,
      companyData,
      totalIssuedShares,
      shareholders,
      shareholderClassification,
      stockMarket: stock_market
    };
  } catch (err: any) {
    logDebug(`fetch-company-info failed: ${err.message}`);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('read-excel-data', async (_, filePath?: string) => {
  logDebug(`read-excel-data called for: ${filePath || 'default'}`);
  try {
    const { extractPriceTrendData, extractFinancialData } = require('./excelReader');
    const excelPath = filePath || join(getTemplateDir(), 'Model.xlsx');
    const data = await extractPriceTrendData(excelPath);
    const finData = await extractFinancialData(excelPath);
    return { ...data, financialData: finData.data, missingFinancials: finData.missing };
  } catch (err: any) {
    logDebug(`read-excel-data error: ${err.message}`);
    return { error: err.message };
  }
});

ipcMain.handle('generate-ppt', async (_, data: any) => {
  logDebug(`generate-ppt called with data for: ${data.corp_name}`);
  try {
    const templatePath = join(getTemplateDir(), 'deal-summary.pptx');
    const outputDir = app.getPath('downloads');
    const fileName = `Deal_Summary_${data.corp_name}_${new Date().getTime()}.pptx`;
    const outputPath = join(outputDir, fileName);
    
    const { generatePpt } = require('./pptGenerator');
    const resultPath = await generatePpt(templatePath, outputPath, data);
    
    return { success: true, path: resultPath };
  } catch (err: any) {
    logDebug(`generate-ppt error: ${err.message}`);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('save-debug-file', async (_, content: string) => {
  logDebug('save-debug-file called');
  try {
    const { writeFileSync, mkdirSync, existsSync } = require('fs');
    // Save to the project's debug_data directory
    const projectDir = app.isPackaged ? app.getPath('userData') : join(__dirname, '../../');
    const debugDir = join(projectDir, 'debug_data');
    
    if (!existsSync(debugDir)) {
      mkdirSync(debugDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = join(debugDir, `ai_response_${timestamp}.txt`);
    
    writeFileSync(filePath, content, 'utf-8');
    logDebug(`Saved debug file to: ${filePath}`);
    return { success: true, path: filePath };
  } catch (err: any) {
    logDebug(`Failed to save debug file: ${err.message}`);
    return { success: false, error: err.message };
  }
});
