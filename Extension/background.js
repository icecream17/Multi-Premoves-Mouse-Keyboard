let objectOfTabsToStop = {}
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (!/^https:\/\/(lichess\.org|lichess\.dev|mskchess\.ru)\/(\w{8}|\w{12})(\/white|\/black)?$/.test(details.url)) return;
    let tabId = details.tabId;
    let debuggeeId = { tabId: tabId };
    if (objectOfTabsToStop[tabId] && objectOfTabsToStop[tabId].debugger === true) {
      return;
    }
    objectOfTabsToStop[tabId] = { stop: true, debugger: false };
    chrome.debugger.attach(debuggeeId, '1.3', () => {
      objectOfTabsToStop[tabId].debugger = true;
      chrome.debugger.sendCommand(
        debuggeeId, "Debugger.enable", {},
        () => {
          chrome.debugger.sendCommand(
            debuggeeId,
            "Fetch.enable",
            {
              patterns: [{
                requestStage: "Response",
                resourceType: "Document", urlPattern: '*lichess*'
              },
              {
                requestStage: "Response",
                resourceType: "Document", urlPattern: '*mskchess*'
              },
              {
                requestStage: "Response",
                resourceType: "Script", urlPattern: '*lichess1*'
              },
              {
                requestStage: "Response",
                resourceType: "Script", urlPattern: '*assets.lichess.dev*'
              }, {
                requestStage: "Response",
                resourceType: "Script", urlPattern: '*mskchess.ru*'
              }]
            },
            () => {
              objectOfTabsToStop[tabId].stop = false;
              chrome.tabs.update(tabId, { url: details.url })
            });
        });
    });
    return { redirectUrl: 'http://google.com/gen_204' }
  },
  {
    urls: ["https://lichess.org/*", "https://lichess.dev/*", "https://mskchess.ru/*"]
  },
  ["blocking"]
);

chrome.debugger.onEvent.addListener((debuggeeId, method, frameId, resourceType) => {
  if (method === "Fetch.requestPaused") {
    let requestId = frameId.requestId;
    if (frameId.resourceType === "Document") {
      if (!/^https:\/\/(lichess\.org|lichess\.dev|mskchess\.ru)\/(\w{8}|\w{12})(\/white|\/black)?$/.test(frameId.request.url)) {
        disableOnAnotherPage(debuggeeId, requestId)
        return;
      }
    } else
      if (frameId.resourceType !== "Script" || !frameId.request.url.includes('round')) {
        return;
      }
    chrome.debugger.sendCommand(
      debuggeeId, "Fetch.getResponseBody",
      { requestId: String(requestId) },
      (body) => {
        if (body === undefined) {
          disableOnAnotherPage(debuggeeId, requestId)
          return;
        }
        let encodedHTML = body.body;
        let decoded = atob(body.body)

        //To allow using Web workers for off-screen canvas painting
        if (frameId.resourceType === "Document") {
          if (decoded.indexOf(`http-equiv="Content-Security-Policy"`) === -1) return;
          let workerCSPindex = decoded.indexOf(`worker-src 'self'`)
          if (workerCSPindex === -1) return;
          let finalHTML = decoded.replace(`worker-src 'self'`, `worker-src 'self' data:`)
          encodedHTML = btoa(finalHTML);
          let finish = false;
          if (frameId.request.url.includes('mskchess')) { finish = true; }
          fullfillRequest(encodedHTML, debuggeeId, frameId, finish)
        }
        else if (frameId.resourceType === "Script" && frameId.request.url.includes('round')) {
          let tIndex = decoded.search(/!\w{1}\.isT/);
          let dIndex = decoded.search(/\.isT/);
          let numberOfLetters = dIndex - tIndex - 1;
          let completed = decoded.replace(/!\w\.isT\w{6}/, `(${decoded.substr(tIndex, numberOfLetters + 11)} && (!${decoded.substr(tIndex + 1, numberOfLetters)}.data || ${decoded.substr(tIndex + 1, numberOfLetters)}.data[5] !== '-'))`)
          let finalHTML = `${completed}`
          encodedHTML = btoa(finalHTML);
          fullfillRequest(encodedHTML, debuggeeId, frameId, true)
        } else {
          fullfillRequest(encodedHTML, debuggeeId, frameId)
        }
      });
  }
});

const disableOnAnotherPage = (debuggeeId, requestId) => {
  chrome.debugger.sendCommand(debuggeeId, "Fetch.continueRequest",
    { requestId: String(requestId) }, () => {
      chrome.debugger.sendCommand(
        debuggeeId, "Fetch.disable",
        () => {
          detachDebugger(debuggeeId);
        });
    })
}

const fullfillRequest = (encodedHTML, debuggeeId, frameId, finish = false) => {
  chrome.debugger.sendCommand(
    debuggeeId, "Fetch.fulfillRequest",
    {
      requestId: frameId.requestId,
      responseCode: frameId.responseStatusCode,
      body: encodedHTML
    },
    () => {
      if (finish === false) return
      chrome.debugger.sendCommand(
        debuggeeId, "Fetch.disable",
        () => {
          detachDebugger(debuggeeId);
        });
    });
}
const detachDebugger = (debuggeeId) => {
  chrome.debugger.detach(debuggeeId, () => {
    if (objectOfTabsToStop[debuggeeId.tabId] === undefined) {
      debugger; return;
    }
    objectOfTabsToStop[debuggeeId.tabId].debugger = false;
  })
}

