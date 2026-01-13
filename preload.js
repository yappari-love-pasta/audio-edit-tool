const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectAudioFile: () => ipcRenderer.invoke('select-audio-file'),
  saveAudioFile: () => ipcRenderer.invoke('save-audio-file'),
  processAudio: (options) => ipcRenderer.invoke('process-audio', options),
  onProcessingProgress: (callback) => {
    ipcRenderer.on('processing-progress', (event, progress) => callback(progress));
  }
});
