let currentAudioFile = null;
let audioDuration = 0;

const elements = {
  selectFileBtn: document.getElementById('selectFileBtn'),
  fileInfo: document.getElementById('fileInfo'),
  fileName: document.getElementById('fileName'),
  fileDuration: document.getElementById('fileDuration'),
  audioSection: document.getElementById('audioSection'),
  audioPlayer: document.getElementById('audioPlayer'),
  startTime: document.getElementById('startTime'),
  endTime: document.getElementById('endTime'),
  cutDuration: document.getElementById('cutDuration'),
  bitrate: document.getElementById('bitrate'),
  volume: document.getElementById('volume'),
  volumeValue: document.getElementById('volumeValue'),
  processBtn: document.getElementById('processBtn'),
  progressSection: document.getElementById('progressSection'),
  progressBar: document.getElementById('progressBar'),
  progressText: document.getElementById('progressText'),
  successMessage: document.getElementById('successMessage'),
  errorMessage: document.getElementById('errorMessage'),
  errorText: document.getElementById('errorText')
};

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateCutDuration() {
  const start = parseFloat(elements.startTime.value) || 0;
  const end = parseFloat(elements.endTime.value) || 0;
  const duration = Math.max(0, end - start);
  elements.cutDuration.textContent = duration.toFixed(1);
}

function showMessage(type, message = '') {
  elements.successMessage.classList.add('hidden');
  elements.errorMessage.classList.add('hidden');

  if (type === 'success') {
    elements.successMessage.classList.remove('hidden');
  } else if (type === 'error') {
    elements.errorText.textContent = message;
    elements.errorMessage.classList.remove('hidden');
  }

  setTimeout(() => {
    elements.successMessage.classList.add('hidden');
    elements.errorMessage.classList.add('hidden');
  }, 5000);
}

elements.selectFileBtn.addEventListener('click', async () => {
  try {
    const fileData = await window.electronAPI.selectAudioFile();

    if (fileData) {
      currentAudioFile = fileData;
      audioDuration = fileData.duration;

      elements.fileName.textContent = fileData.filename;
      elements.fileDuration.textContent = formatTime(fileData.duration);
      elements.fileInfo.classList.remove('hidden');

      elements.audioPlayer.src = `file://${fileData.path}`;
      elements.audioSection.classList.remove('hidden');

      elements.endTime.value = fileData.duration.toFixed(1);
      elements.endTime.max = fileData.duration;
      elements.startTime.max = fileData.duration;

      updateCutDuration();
    }
  } catch (error) {
    showMessage('error', error.message);
  }
});

elements.volume.addEventListener('input', (e) => {
  elements.volumeValue.textContent = e.target.value;
});

elements.startTime.addEventListener('input', updateCutDuration);
elements.endTime.addEventListener('input', updateCutDuration);

elements.processBtn.addEventListener('click', async () => {
  if (!currentAudioFile) {
    showMessage('error', 'ファイルが選択されていません');
    return;
  }

  const startTime = parseFloat(elements.startTime.value) || 0;
  const endTime = parseFloat(elements.endTime.value) || audioDuration;

  if (startTime >= endTime) {
    showMessage('error', '開始時間は終了時間より前である必要があります');
    return;
  }

  if (endTime > audioDuration) {
    showMessage('error', '終了時間がファイルの長さを超えています');
    return;
  }

  try {
    const outputPath = await window.electronAPI.saveAudioFile();

    if (!outputPath) {
      return;
    }

    elements.processBtn.disabled = true;
    elements.progressSection.classList.remove('hidden');
    elements.progressBar.style.width = '0%';
    elements.progressText.textContent = '処理中... 0%';

    const options = {
      inputPath: currentAudioFile.path,
      outputPath: outputPath,
      startTime: startTime,
      endTime: endTime,
      bitrate: elements.bitrate.value + 'k',
      volume: parseFloat(elements.volume.value) / 100
    };

    await window.electronAPI.processAudio(options);

    elements.progressBar.style.width = '100%';
    elements.progressText.textContent = '完了！';
    showMessage('success');

  } catch (error) {
    showMessage('error', error.message);
  } finally {
    elements.processBtn.disabled = false;
    setTimeout(() => {
      elements.progressSection.classList.add('hidden');
    }, 2000);
  }
});

window.electronAPI.onProcessingProgress((progress) => {
  elements.progressBar.style.width = `${progress}%`;
  elements.progressText.textContent = `処理中... ${progress}%`;
});
