chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'background') return;

  if (message.type === 'START_RECORDING') {
    startRecording(message.quality);
  } else if (message.type === 'STOP_RECORDING') {
    chrome.runtime.sendMessage({ target: 'offscreen', type: 'STOP_RECORDING' });
  } else if (message.type === 'DOWNLOAD_FILE') {
    chrome.downloads.download({
      url: message.url,
      filename: `screen-recording-${Date.now()}.webm`,
      saveAs: true
    }, () => {
      chrome.storage.local.set({ isRecording: false });
    });
  } else if (message.type === 'CLOSE_OFFSCREEN') {
    chrome.storage.local.set({ isRecording: false });
    chrome.offscreen.closeDocument().catch(() => {});
  }
});

async function startRecording(quality) {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  
  if (existingContexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['DISPLAY_MEDIA'],
      justification: 'Capture screen output'
    });
  }

  await chrome.storage.local.set({ isRecording: true });

  setTimeout(() => {
    chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'START_RECORDING',
      quality: quality
    });
  }, 200);
}

chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state && delta.state.current === 'complete') {
    chrome.offscreen.closeDocument().catch(() => {});
  }
});