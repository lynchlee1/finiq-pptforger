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
    
    // Windows uses 'python', Mac/Linux typically use 'python3'
    const isWindows = process.platform === 'win32';
    const pythonCmd = isWindows ? 'python' : 'python3';
    
    logDebug(`PLATFORM: ${process.platform}`);
    logDebug(`RUNNING: ${pythonCmd} "${scriptPath}" ${args.map(a => `"${a}"`).join(' ')}`);
    
    const pythonProcess = spawn(pythonCmd, [scriptPath, ...args]);

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
    return readdirSync(templatesDir).filter(f => f.endsWith('.pptx'));
  } catch (e) {
    return [];
  }
});

ipcMain.handle('load-template', async (_, templateName: string) => {
  let templatePath = templateName;
  if (!isAbsolute(templatePath)) {
    templatePath = join(process.env.PUBLIC as string, 'templates', templateName);
  }
  
  try {
    const result = await runPython(['scan', templatePath]);
    return { success: true, keys: result.keys };
  } catch (err: any) {
    logDebug(`load-template failed: ${err.message}`);
    throw err;
  }
});

ipcMain.handle('select-template', async () => {
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    title: 'Select PPTX Template',
    filters: [{ name: 'PowerPoint', extensions: ['pptx'] }],
    properties: ['openFile']
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
