import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, isAbsolute } from 'path'
import { spawn } from 'child_process'
import { writeFileSync, readdirSync, appendFileSync } from 'fs'

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

function createWindow() {
  logDebug('Creating window...');
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0a0a',
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

async function runPython(args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = join(__dirname, '../../backend/engine/ppt_generator.py');
    const venvPath = join(__dirname, '../../backend/.venv');
    
    // Windows uses 'Scripts/python.exe', Mac/Linux uses 'bin/python'
    const isWindows = process.platform === 'win32';
    const venvPython = isWindows ? join(venvPath, 'Scripts', 'python.exe') : join(venvPath, 'bin', 'python');
    
    let pythonCmd = isWindows ? 'python' : 'python3';
    
    // Use venv if it exists
    const fs = require('fs');
    if (fs.existsSync(venvPython)) {
      pythonCmd = venvPython;
      logDebug(`USING VENV PYTHON: ${pythonCmd}`);
    } else {
      logDebug(`VENV NOT FOUND AT: ${venvPython}, using system python`);
    }
    
    logDebug(`PLATFORM: ${process.platform}`);
    logDebug(`SCRIPT PATH: ${scriptPath}`);
    logDebug(`ARGS: ${args.join(', ')}`);
    
    const pythonProcess = spawn(pythonCmd, [scriptPath, ...args], {
      shell: isWindows,
      env: { ...process.env }
    });

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('error', (err: any) => {
      logDebug(`SPAWN ERROR [${pythonCmd}]: ${err.message}`);
      
      // Fallback: If 'python3' failed on Mac, try 'python'. If 'python' failed on Windows, try 'python3' (just in case)
      const fallbackCmd = pythonCmd === 'python3' ? 'python' : 'python3';
      logDebug(`TRYING FALLBACK: ${fallbackCmd}`);
      
      const fallbackProcess = spawn(fallbackCmd, [scriptPath, ...args]);
      
      let fOutput = '';
      let fError = '';
      
      fallbackProcess.stdout.on('data', (d) => fOutput += d.toString());
      fallbackProcess.stderr.on('data', (d) => fError += d.toString());
      
      fallbackProcess.on('error', (fErr) => {
        logDebug(`FALLBACK ERROR: ${fErr.message}`);
        reject(new Error(`Python not found. Please install Python and ensure it is in your PATH. (Tried ${pythonCmd}, ${fallbackCmd})`));
      });

      fallbackProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(fError.trim() || `Python exited with code ${code}`));
          return;
        }
        try {
          resolve(JSON.parse(fOutput.trim()));
        } catch (e) {
          reject(new Error(`Invalid JSON from fallback: ${fOutput}`));
        }
      });
    });

    pythonProcess.on('close', (code) => {
      // If code is 0, we are good. If not, and we haven't rejected yet (from 'error' event)
      if (code === 0) {
        try {
          const trimmedOutput = output.trim();
          logDebug(`SUCCESS OUTPUT: ${trimmedOutput}`);
          const parsed = JSON.parse(trimmedOutput);
          if (parsed.error) {
            reject(new Error(parsed.error));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          logDebug(`PARSE ERROR: ${output}`);
          reject(new Error(`Invalid JSON output: ${output.substring(0, 100)}`));
        }
      } else if (!pythonProcess.killed) {
        const fullError = errorOutput.trim() || `Exit code ${code}`;
        logDebug(`EXIT ERROR [${code}]: ${fullError}`);
        reject(new Error(fullError));
      }
    });
  });
}

ipcMain.handle('list-templates', async () => {
  const templatesDir = join(process.env.PUBLIC as string, 'templates');
  try {
    const items = readdirSync(templatesDir, { withFileTypes: true });
    const templates = items
      .filter(item => {
        if (item.isFile()) {
          return item.name.endsWith('.pptx');
        }
        if (item.isDirectory()) {
          // Check if directory contains at least one .pptx file
          const dirPath = join(templatesDir, item.name);
          try {
            const files = readdirSync(dirPath);
            return files.some(f => f.endsWith('.pptx') && !f.startsWith('~$'));
          } catch (e) {
            return false;
          }
        }
        return false;
      })
      .map(item => item.name);
    return templates;
  } catch (e) {
    return [];
  }
});

ipcMain.handle('load-template', async (_, templateName: string) => {
  logDebug(`load-template called with: ${templateName}`);
  let templatePath = templateName;
  if (!isAbsolute(templatePath)) {
    const publicPath = process.env.PUBLIC as string;
    logDebug(`PUBLIC path is: ${publicPath}`);
    templatePath = join(publicPath, 'templates', templateName);
  }
  logDebug(`Resolved template path: ${templatePath}`);
  
  try {
    const result = await runPython(['scan', templatePath]);
    logDebug(`Scan result: ${JSON.stringify(result).substring(0, 200)}...`);
    return { success: true, ...result };
  } catch (err: any) {
    logDebug(`load-template failed: ${err.message}`);
    throw err;
  }
});

ipcMain.handle('select-template', async () => {
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    title: 'Select PPTX Template (File or Folder)',
    filters: [
      { name: 'PowerPoint', extensions: ['pptx'] },
      { name: 'Folders', extensions: ['*'] }
    ],
    properties: ['openFile', 'openDirectory']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const templatePath = result.filePaths[0];
  try {
    const scanResult = await runPython(['scan', templatePath]);
    return { success: true, path: templatePath, keys: scanResult.keys };
  } catch (err: any) {
    logDebug(`select-template failed: ${err.message}`);
    throw err;
  }
});

ipcMain.handle('generate-ppt', async (_, data: any) => {
  try {
    if (data.template && !isAbsolute(data.template)) {
      data.template = join(process.env.PUBLIC as string, 'templates', data.template);
    }
    
    const tempJsonPath = join(app.getPath('userData'), 'temp_input.json');
    writeFileSync(tempJsonPath, JSON.stringify(data));
    const outputPath = join(app.getPath('downloads'), `generated_${Date.now()}.pptx`);
    
    await runPython(['generate', tempJsonPath, outputPath]);
    return { success: true, path: outputPath };
  } catch (err: any) {
    logDebug(`generate-ppt failed: ${err.message}`);
    throw err;
  }
});

ipcMain.handle('generate-preview', async (_, data: any) => {
  try {
    if (data.template && !isAbsolute(data.template)) {
      data.template = join(process.env.PUBLIC as string, 'templates', data.template);
    }
    
    const tempJsonPath = join(app.getPath('userData'), 'temp_preview_input.json');
    writeFileSync(tempJsonPath, JSON.stringify(data));
    const outputPath = join(app.getPath('userData'), `preview_temp.pptx`);
    
    await runPython(['generate', tempJsonPath, outputPath]);
    
    const buffer = require('fs').readFileSync(outputPath);
    return { success: true, buffer: buffer };
  } catch (err: any) {
    logDebug(`generate-preview failed: ${err.message}`);
    throw err;
  }
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
      // Fallback or try KIND search directly with stockCode
    }
    logDebug(`Extracted company name: ${companyName}`);

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
    searchBody.append('searchCorpName', stockCode); // Search by stock code to be more precise
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
    companyName = repisusrtkornm; // Use KIND's official name

    // 3. Fetch Total Info from KIND
    const kindInfoUrl = 'https://kind.krx.co.kr/corpdetail/totalinfo.do';
    const infoBody = new URLSearchParams();
    infoBody.append('method', 'searchTotalInfo');
    infoBody.append('isurCd', isurcd);
    infoBody.append('kisComCd', kiscomcd);
    infoBody.append('repIsuCd', repisucd);
    infoBody.append('mode', '');
    infoBody.append('tabMenu', '0');
    // Note: KIND treats empty string and omitted fields differently as per user hint.
    // Explicitly sending empty strings for these fields.
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
    
    // Parse KIND Info HTML (extracting common fields)
    const extractField = (label: string) => {
      // Look for the label within th, then get the following td content
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

    logDebug(`Fetched company data: ${JSON.stringify(companyData).substring(0, 100)}...`);

    return {
      success: true,
      companyName,
      companyData
    };
  } catch (err: any) {
    logDebug(`fetch-company-info failed: ${err.message}`);
    return { success: false, error: err.message };
  }
});

