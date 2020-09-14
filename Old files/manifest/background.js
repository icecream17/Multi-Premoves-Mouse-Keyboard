/* chrome.webRequest.onBeforeRequest.addListener(
   function (details) {
      if (details.url.indexOf("round.min.js") !== -1) {
         return { redirectUrl: chrome.extension.getURL("round.js") };
      }
   },
   {
      urls: ["https://lichess1.org/*"]
   },
   ["blocking"]
); */



var port = chrome.runtime.connectNative('native.messaging.keyboard')
port.onMessage.addListener((req) => {
  if (chrome.runtime.lastError) {
    console.log(chrome.runtime.lastError.message)
  }
  handleMessage(req)
})

port.onDisconnect.addListener(() => {
  if (chrome.runtime.lastError) {
    console.log(chrome.runtime.lastError.message)
  }
  console.log('Disconnected')
})

chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    if (request.beep === "do")
      port.postMessage({ message: 'ping', body: 'hello from browser extension' });
    else if (request.beep === "do1")
      port.postMessage({ message: 'ping1', body: 'hello from browser extension' });
    /* else if (request.type === 'theme') {
      chrome.tabs.insertCSS(sender.tabId, { file: 'ultrabulletTheme.css', allFrames: false, runAt: "document_start" });
    } */
  });

function handleMessage(req) {
}