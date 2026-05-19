import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { spawn } from 'child_process'
import { writeFileSync, readdirSync } from 'fs'

process.env.DIST = join(__dirname, '../dist')
process.env.PUBLIC = app.isPackaged ? process.env.DIST : join(__dirname, '../../frontend/public')

let win: BrowserWindow | null = null

function createWindow() {
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

ipcMain.handle('list-templates', async () => {
  const templatesDir = join(process.env.PUBLIC as string, 'templates');
  try {
    return readdirSync(templatesDir).filter(f => f.endsWith('.pptx'));
  } catch (e) {
    return [];
  }
});

ipcMain.handle('load-template', async (_, templateName: string) => {
  const templatePath = join(process.env.PUBLIC as string, 'templates', templateName);

  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [
      join(__dirname, '../../backend/engine/ppt_generator.py'),
      'scan',
      templatePath
    ]);

    let output = '';
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.on('close', (code) => {
      try {
        const parsed = JSON.parse(output);
        if (parsed.error) {
          reject({ success: false, message: parsed.error });
        } else {
          resolve({ success: true, keys: parsed.keys });
        }
      } catch (e) {
        reject({ success: false, message: 'Failed to parse python output' });
      }
    });
  });
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

  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [
      join(__dirname, '../../backend/engine/ppt_generator.py'),
      'scan',
      templatePath
    ]);

    let output = '';
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(data.toString());
    });

    pythonProcess.on('close', (code) => {
      try {
        const parsed = JSON.parse(output);
        if (parsed.error) {
          reject({ success: false, message: parsed.error });
        } else {
          resolve({ success: true, path: templatePath, keys: parsed.keys });
        }
      } catch (e) {
        reject({ success: false, message: 'Failed to parse python output' });
      }
    });
  });
});

ipcMain.handle('generate-ppt', async (_, data: any) => {
  return new Promise((resolve, reject) => {
    const tempJsonPath = join(app.getPath('userData'), 'temp_input.json')
    writeFileSync(tempJsonPath, JSON.stringify(data))

    const pythonProcess = spawn('python3', [
      join(__dirname, '../../backend/engine/ppt_generator.py'),
      'generate',
      tempJsonPath,
      join(app.getPath('downloads'), `generated_${Date.now()}.pptx`)
    ])

    let output = ''
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      console.error(data.toString())
    })

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, message: output })
      } else {
        reject({ success: false, message: 'Python process failed' })
      }
    })
  })
})
