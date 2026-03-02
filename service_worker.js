// The background service worker acts as a middle-man. It keeps the state alive
// and routes messaging to our hidden "offscreen" document

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'background') return;

  if (message.type === 'START_RECORDING') {
    startRecording(message.quality);
  } else if (message.type === 'STOP_RECORDING') {
    stopRecording();
  } else if (message.type === 'DOWNLOAD_FILE') {
    // Initiate the download of the completed recording Blob URL
    chrome.downloads.download({
      url: message.url,
      filename: `screen-recording-${Date.now()}.webm`,
      saveAs: true
    }, () => {
      chrome.storage.local.set({ isRecording: false });
    });
  } else if (message.type === 'CLOSE_OFFSCREEN') {
    // Fired if the user cancels the picker natively
    chrome.storage.local.set({ isRecording: false });
    chrome.offscreen.closeDocument().catch(() => {});
  }
});

async function startRecording(quality) {
  // Look for an existing offscreen document, if it doesn't exist, create it.
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

  // A very slight timeout guarantees the offscreen page is awake and listening
  setTimeout(() => {
    chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'START_RECORDING',
      quality: quality
    });
  }, 100);
}

async function stopRecording() {
  chrome.runtime.sendMessage({
    target: 'offscreen',
    type: 'STOP_RECORDING'
  });
}

// Clean up the offscreen document when the download successfully completes
chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state && delta.state.current === 'complete') {
    chrome.storage.local.get('isRecording', (data) => {
       if (!data.isRecording) {
           chrome.offscreen.closeDocument().catch(() => {});
       }
    });
  }
});

// Ensure a fresh state on install/reload
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ isRecording: false });
});