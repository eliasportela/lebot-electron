const { app, BrowserWindow, Tray, Menu, nativeImage, powerSaveBlocker, powerMonitor } = require('electron');
const path = require('path');
const log = require('electron-log');
const Config = require('electron-config');

const config = new Config();
let mainWindow = null;
let splashWindow = null;
let tray = null;
let psbId = null; // id retornado por powerSaveBlocker
const START_URL = 'https://lebot.lecard.delivery/'

if (process.platform === 'win32') {
  app.setAppUserModelId('app.lecard.lebot');
}

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    transparent: false,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    icon: path.join(__dirname, 'icon.ico'),
    show: true
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.center();

  log.info('Splash screen criada.');
}

function createWindow() {
  const iconPath =
    process.platform === 'darwin'
      ? path.join(__dirname, 'build', 'icon.icns')
      : path.join(__dirname, 'icon.ico');
  console.log(iconPath)

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      autoplayPolicy: 'no-user-gesture-required'
    }
  });

  mainWindow.loadURL(START_URL);

  // minimizar para a bandeja ao fechar
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();

      // garante que não esconda durante splash
      if (!splashWindow || splashWindow.isDestroyed()) {
        mainWindow.hide();
        if (process.platform === 'darwin') app.dock.hide();
      }
    }
  });

  mainWindow.on('show', () => {
    if (process.platform === 'darwin') {
      app.dock.show();
      setDockIcon();
    }
  });

  // tempo mínimo para manter o splash (3s)
  const splashMinTime = 3000;
  const splashStart = Date.now();

  mainWindow.webContents.on('did-finish-load', () => {
    const elapsed = Date.now() - splashStart;
    const remaining = Math.max(0, splashMinTime - elapsed);

    log.info('Página carregada com sucesso.');
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
      }
      mainWindow.show();
      mainWindow.focus();
    }, remaining);
  });

  mainWindow.webContents.on('did-fail-load', (e, code, desc) => {
    log.error(`Falha ao carregar: ${desc} (${code})`);
    setTimeout(() => mainWindow.loadURL(START_URL), 5000);
  });
}

function startPreventSleep() {
  if (psbId !== null && powerSaveBlocker.isStarted(psbId)) return psbId; // já ativo
  // 'prevent-display-sleep' costuma ser o mais usado para manter tela ligada
  psbId = powerSaveBlocker.start('prevent-display-sleep');
  log.info('powerSaveBlocker started, id =', psbId);
  return psbId;
}

function stopPreventSleep() {
  if (psbId !== null && powerSaveBlocker.isStarted(psbId)) {
    powerSaveBlocker.stop(psbId);
    log.info('powerSaveBlocker stopped, id =', psbId);
  }
  psbId = null;
}

// cria tray com toggle
function createTray() {
  let trayIconPath =
    process.platform === 'darwin'
      ? path.join(__dirname, 'assets', 'tray-mac.png')
      : path.join(__dirname, 'icon.ico');

  const image = nativeImage.createFromPath(trayIconPath);
  tray = new Tray(image);
  const keepScreenOn = config.get('keepScreenOn', true);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Manter tela ligada',
      type: 'checkbox',
      checked: keepScreenOn,
      click: (menuItem) => {
        const active = menuItem.checked;

        if (active) {
          startPreventSleep();
        } else {
          stopPreventSleep();
        }

        updateTrayTooltip(active);
        config.set('keepScreenOn', active);
        log.info('Config alterada: keepScreenOn = ' + active);
      }
    },
    { type: 'separator' },
    { label: 'Abrir app', click: () => { mainWindow.show(); log.info('App reaberto da bandeja'); } },
    { label: 'Abrir logs', click: () => { require('electron').shell.openPath(log.transports.file.getFile().path); } },
    { label: 'Sair', click: () => { app.isQuiting = true; app.quit(); } }
  ]);

  tray.setToolTip('LeBot Desktop');
  tray.setContextMenu(contextMenu);

  // aplica estado inicial
  if (keepScreenOn) {
    startPreventSleep();
  }

  updateTrayTooltip(keepScreenOn);
  log.info('Tray criado. keepScreenOn=' + keepScreenOn);
}

app.whenReady().then(() => {
  // if (process.platform === 'darwin') {
  //   const iconPath = path.join(__dirname, 'assets', 'logo.png');
  //   const dockIcon = nativeImage.createFromPath(iconPath);
  //   app.dock.setIcon(dockIcon);
  // }

  setDockIcon();
  createSplash();
  createWindow();
  createTray();

  // Se demorar demais, fecha splash de segurança
  setTimeout(() => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      log.warn('Timeout de splash: forçando exibição do app.');
      splashWindow.close();
      splashWindow = null;
      mainWindow.show();
    }
  }, 15000); // 15 segundos

  app.setLoginItemSettings({
    openAtLogin: true,
    path: process.execPath
  });

  // eventos de energia
  powerMonitor.on('suspend', () => log.warn('Sistema entrando em suspensão...'));
  powerMonitor.on('resume', () => log.info('Sistema retomado da suspensão.'));
});

app.on('before-quit', () => {
  // garantir que paramos o powerSaveBlocker
  stopPreventSleep();
});

function updateTrayTooltip(active) {
  tray.setToolTip(active ? 'LeBot Desktop (mantendo tela ligada)' : 'LeBot Desktop');
}

function setDockIcon() {
  if (process.platform === 'darwin') {
    const iconPath = path.join(__dirname, 'assets', 'logo.png');
    const dockIcon = nativeImage.createFromPath(iconPath);
    if (!dockIcon.isEmpty()) {
      console.log('elias')
      app.dock.setIcon(dockIcon);

    } else {
      log.warn('Falha ao carregar ícone do Dock:', iconPath);
    }
  }
}