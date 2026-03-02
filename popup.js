document.addEventListener('DOMContentLoaded', async () => {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const shareBtn = document.getElementById('shareBtn');
  const qualitySelect = document.getElementById('quality');
  const statusTxt = document.getElementById('status');
  const settingsDiv = document.getElementById('settings');

  const shareLink = "https://stadiastudios.com/recorder"; // Change this to your actual link

  const { isRecording } = await chrome.storage.local.get('isRecording');
  updateUI(isRecording);

  startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    startBtn.textContent = 'Starting...';
    const quality = qualitySelect.value;
    await chrome.runtime.sendMessage({ target: 'background', type: 'START_RECORDING', quality });
    window.close();
  });

  stopBtn.addEventListener('click', async () => {
    stopBtn.disabled = true;
    stopBtn.textContent = 'Stopping...';
    await chrome.runtime.sendMessage({ target: 'background', type: 'STOP_RECORDING' });
  });

  // Share functionality: Copies the link to clipboard
  shareBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.value = shareLink;
    document.body.appendChild(input);
    input.select();
    try {
      document.execCommand('copy');
      const originalText = shareBtn.innerHTML;
      shareBtn.textContent = 'Link Copied!';
      shareBtn.style.color = '#22c55e';
      setTimeout(() => {
        shareBtn.innerHTML = originalText;
        shareBtn.style.color = '';
      }, 2000);
    } catch (err) {
      console.error('Failed to copy link', err);
    }
    document.body.removeChild(input);
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.isRecording) {
      updateUI(changes.isRecording.newValue);
    }
  });

  function updateUI(recording) {
    if (recording) {
      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
      settingsDiv.style.display = 'none';
      shareBtn.style.display = 'none';
      statusTxt.textContent = 'Recording in progress...';
      statusTxt.style.color = '#ef4444';
      stopBtn.disabled = false;
      stopBtn.textContent = 'Stop Recording';
    } else {
      startBtn.style.display = 'block';
      stopBtn.style.display = 'none';
      settingsDiv.style.display = 'block';
      shareBtn.style.display = 'flex';
      statusTxt.textContent = 'Ready to capture';
      statusTxt.style.color = '#737373';
      startBtn.disabled = false;
      startBtn.textContent = 'Start Recording';
    }
  }
});