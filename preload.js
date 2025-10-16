const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  notifyNative: (title, body, silent=false) => ipcRenderer.invoke('notify', { title, body, silent }),
  setPreventSleep: (keep) => ipcRenderer.invoke('set-prevent-sleep', keep)
});
