const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  mainWindow.loadFile('index.html');
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

ipcMain.handle('select-audio-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'm4a'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];

    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const duration = metadata.format.duration;
        resolve({
          path: filePath,
          duration: duration,
          filename: path.basename(filePath)
        });
      });
    });
  }

  return null;
});

ipcMain.handle('save-audio-file', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'MP3 Audio', extensions: ['mp3'] }
    ],
    defaultPath: 'edited-audio.mp3'
  });

  if (!result.canceled) {
    return result.filePath;
  }

  return null;
});

ipcMain.handle('process-audio', async (event, options) => {
  const { inputPath, outputPath, startTime, endTime, bitrate, volume } = options;

  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(endTime - startTime);

    if (volume !== 1.0) {
      command = command.audioFilters(`volume=${volume}`);
    }

    command
      .audioBitrate(bitrate)
      .audioCodec('libmp3lame')
      .format('mp3')
      .on('start', (commandLine) => {
        console.log('FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          mainWindow.webContents.send('processing-progress', Math.round(progress.percent));
        }
      })
      .on('end', () => {
        resolve({ success: true });
      })
      .on('error', (err) => {
        reject(new Error(`Processing failed: ${err.message}`));
      })
      .save(outputPath);
  });
});
