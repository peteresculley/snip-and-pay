chrome.action.onClicked.addListener((tab) =>
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['action-script.js']
  })
);

chrome.runtime.onMessage.addListener(async (message, sender) => {
  switch (message.type) {
    case 'capture':
      if (!sender.tab) return;
      const dataUrl = await chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' });
      await chrome.scripting.executeScript({
        target: { tabId: sender.tab.id },
        func: handleSendingMessage,
        args: [{ type: 'captured-image', image: dataUrl, details: message.details }]
      });
      break;
  }
});

function handleSendingMessage (message) {
  window.chromeMessageHandler(message);
}
