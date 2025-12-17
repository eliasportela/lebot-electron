const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  notifyNative: (title, body, silent=false) => ipcRenderer.invoke('notify', { title, body, silent }),
  setPreventSleep: (keep) => ipcRenderer.invoke('set-prevent-sleep', keep)
});
