const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('child_process');
const { randomBytes } = require('crypto');
const fs = require('fs');
const path = require('path');
const http = require('http');

let serverProcess = null;
let mainWindow = null;
let backendError = null;

const HOST = '127.0.0.1';
const PORT = 8000;
const BASE_URL = `http://${HOST}:${PORT}`;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL(BASE_URL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function waitForServer(url, retries = 30, interval = 500) {
  return new Promise((resolve, reject) => {
    const attempt = (remaining) => {
      if (backendError) {
        reject(backendError);
        return;
      }

      http.get(url, (res) => {
        res.resume();
        resolve();
      }).on('error', () => {
        if (remaining <= 0) {
          reject(new Error('FastAPI server did not start in time.'));
          return;
        }
        setTimeout(() => attempt(remaining - 1), interval);
      });
    };

    attempt(retries);
  });
}

function getBackendCommand() {
  const options = {
    windowsHide: true,
    stdio: 'inherit',
    env: {
      ...process.env,
      SESSION_SECRET: process.env.SESSION_SECRET || randomBytes(32).toString('hex')
    }
  };

  if (app.isPackaged) {
    return {
      command: path.join(process.resourcesPath, 'backend.exe'),
      args: [],
      options
    };
  }

  const venvPython = path.join(
    app.getAppPath(),
    '.venv',
    process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python'
  );

  return {
    command: process.env.PYTHON || (fs.existsSync(venvPython) ? venvPython : 'python'),
    args: [
      '-m',
      'uvicorn',
      'backend.main:app',
      '--host',
      HOST,
      '--port',
      String(PORT)
    ],
    options: {
      ...options,
      cwd: app.getAppPath()
    }
  };
}

function startFastAPIServer() {
  const { command, args, options } = getBackendCommand();

  console.log('Starting backend with:', command, args);

  serverProcess = spawn(command, args, options);

  serverProcess.on('close', (code) => {
    console.log(`FastAPI server exited with code ${code}`);
    if (!backendError) {
      backendError = new Error(`Backend exited with code ${code}. Check the terminal output and the setup steps in README.md.`);
    }
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start FastAPI server:', err);
    backendError = new Error(`Could not start the backend (${err.message}). Follow the Python setup steps in README.md.`);
  });
}

function stopFastAPIServer() {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
    serverProcess = null;
  }
}

app.whenReady().then(async () => {
  try {
    startFastAPIServer();
    await waitForServer(BASE_URL);
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (err) {
    console.error(err);
    dialog.showErrorBox('Startup Error', err.message);
    app.quit();
  }
});

app.on('before-quit', () => {
  stopFastAPIServer();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
