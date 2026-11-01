const { app, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

function createUpdates(getWindow) {
  let busy = false;
  let downloaded = false;
  let prompting = false;

  autoUpdater.logger = log;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('error', (error) => log.error('Falha na atualização:', error));

  function showMessage(options) {
    const window = getWindow();
    const settings = { title: 'Lebot Desk — Atualizações', ...options };

    if (window && !window.isDestroyed() && window.isVisible()) {
      return dialog.showMessageBox(window, settings);
    }

    return dialog.showMessageBox(settings);
  }

  async function offerRestart() {
    if (prompting) {
      return;
    }

    prompting = true;

    try {
      const { response } = await showMessage({
        type: 'info',
        message: 'A atualização está pronta para instalar.',
        detail: 'Reinicie agora ou continue trabalhando. A atualização será instalada ao sair pelo menu da bandeja.',
        buttons: ['Reiniciar e atualizar', 'Depois'],
        defaultId: 1,
        cancelId: 1
      });

      if (response === 0) {
        app.isQuiting = true;
        autoUpdater.quitAndInstall(false, true);
      }
    } finally {
      prompting = false;
    }
  }

  async function check(manual = false) {
    if (!app.isPackaged || process.platform !== 'win32') {
      if (manual) {
        await showMessage({
          type: 'info',
          message: 'As atualizações estão disponíveis na versão instalada para Windows.'
        });
      }

      return;
    }

    if (downloaded) {
      await offerRestart();
      return;
    }

    if (busy) {
      if (manual) {
        await showMessage({
          type: 'info',
          message: 'Uma verificação ou download de atualização já está em andamento.'
        });
      }

      return;
    }

    busy = true;

    try {
      const result = await autoUpdater.checkForUpdates();

      if (!result || !result.cancellationToken) {
        if (manual) {
          await showMessage({
            type: 'info',
            message: 'Você já está usando a versão mais recente.'
          });
        }

        return;
      }

      if (manual) {
        await showMessage({
          type: 'info',
          message: `A versão ${result.updateInfo.version} será baixada em segundo plano.`,
          detail: 'Você poderá continuar usando o aplicativo.'
        });
      }

      await autoUpdater.downloadUpdate(result.cancellationToken);
      downloaded = true;
      await offerRestart();
    } catch (error) {
      log.error('Não foi possível verificar ou baixar a atualização:', error);

      if (manual) {
        await showMessage({
          type: 'error',
          message: 'Não foi possível verificar ou baixar a atualização.',
          detail: 'Verifique sua conexão e tente novamente mais tarde.'
        });
      }
    } finally {
      busy = false;
    }
  }

  return { check };
}

module.exports = { createUpdates };
