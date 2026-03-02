let mediaRecorder;
let recordedChunks = [];
let stream;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return;

  if (message.type === 'START_RECORDING') {
    startRecording(message.quality);
  } else if (message.type === 'STOP_RECORDING') {
    stopRecording();
  }
});

async function startRecording(quality) {
  recordedChunks = [];
  
  // Set our constraints based on user choice
  let videoConstraints = {
    displaySurface: 'monitor' // Suggests entire screen instead of individual tabs
  };

  if (quality === '1080p60') {
    videoConstraints.width = { ideal: 1920, max: 1920 };
    videoConstraints.height = { ideal: 1080, max: 1080 };
    videoConstraints.frameRate = { ideal: 60, max: 60 };
  } else {
    // 720p 30fps default
    videoConstraints.width = { ideal: 1280, max: 1280 };
    videoConstraints.height = { ideal: 720, max: 720 };
    videoConstraints.frameRate = { ideal: 30, max: 30 };
  }

  try {
    // This triggers Chrome's native screen sharing dialog
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: videoConstraints,
      audio: true // Captures system/mic audio if chosen by user
    });

    // Handle user clicking the native Chrome "Stop sharing" button
    stream.getVideoTracks()[0].onended = () => {
      stopRecording();
    };

    // Begin recording the stream using WebM
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      // Build the file buffer
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      
      // Tell the background service worker to download it
      chrome.runtime.sendMessage({
        target: 'background',
        type: 'DOWNLOAD_FILE',
        url: url
      });
      
      // Cut all device streams
      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorder.start();
  } catch (err) {
    // Triggers if the user cancels out of the screen picker popup
    console.error('Error starting screen recording:', err);
    chrome.runtime.sendMessage({ target: 'background', type: 'CLOSE_OFFSCREEN' });
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop(); // This triggers the mediaRecorder.onstop event handler above
  }
}