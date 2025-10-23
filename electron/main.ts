import { app, BrowserWindow } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    title: 'StorIA - AI Story Creation',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a1a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Load from vite dev server with retry logic
  const loadURL = async (retries = 10) => {
    try {
      await mainWindow!.loadURL('http://localhost:3998');
      mainWindow!.webContents.openDevTools();
      console.log('Successfully loaded app');
    } catch (error) {
      if (retries > 0) {
        console.log(`Retrying... (${retries} attempts left)`);
        setTimeout(() => loadURL(retries - 1), 1000);
      } else {
        console.error('Failed to load app after multiple attempts:', error);
        mainWindow!.loadURL(`data:text/html,<html><body style="background:#1a1a1a;color:#fff;font-family:sans-serif;padding:40px;"><h1>Connection Error</h1><p>Could not connect to development server at http://localhost:3998</p><p>Make sure Vite is running: <code>npm run dev:react</code></p></body></html>`);
      }
    }
  };

  loadURL();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

