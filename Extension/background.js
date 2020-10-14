
const requests = () => {
  let time = 0;
  let objectOfTabsToStop = {}
  chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
      if (!/^https:\/\/(lichess\.org|lichess\.dev|mskchess\.ru)\/(\w{8}|\w{12})(\/white|\/black)?$/.test(details.url)) return;
      let tabId = details.tabId;
      let debuggeeId = { tabId: tabId };
      if (objectOfTabsToStop[tabId] && objectOfTabsToStop[tabId].debugger === true) {
        console.log('webRequest2', performance.now() - time);
        return;
      }
      console.log('webRequest1', 0, performance.now()); time = performance.now();
      objectOfTabsToStop[tabId] = { stop: true, debugger: false };
      chrome.debugger.attach(debuggeeId, '1.3', () => {

        console.log('debugger attached', performance.now() - time);
        objectOfTabsToStop[tabId].debugger = true;
        chrome.debugger.sendCommand(
          debuggeeId, "Debugger.enable", {},
          () => {
            console.log('debugger enabled', performance.now() - time);
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
                }]
              },
              () => {
                console.log('fetch enabled', performance.now() - time);
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
      console.log('fetch requestPaused', performance.now() - time);
      let requestId = frameId.requestId;
      if (frameId.resourceType === "Document") {
        if (!/^https:\/\/(lichess\.org|lichess\.dev|mskchess\.ru)\/(\w{8}|\w{12})(\/white|\/black)?$/.test(frameId.request.url)) {
          disableOnAnotherPage(debuggeeId, requestId)
          return;
        }
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
            if (settingsObject.useWorkerActually === true) {
              let finalHTML = decoded.replace(`worker-src 'self'`, `worker-src 'self' data:`)
              encodedHTML = btoa(finalHTML);
            }
            let finish = false;
            if (frameId.request.url.includes('mskchess')) { finish = true; }
            fullfillRequest(encodedHTML, debuggeeId, frameId, true)
          }
          else if (frameId.resourceType === "Script" && frameId.request.url.includes('round')) {
            let completed;
            let tIndex = decoded.search(/!\w{1}\.isT/);
            if (tIndex !== -1) {
              let dIndex = decoded.search(/\.isT/);
              let numberOfLetters = dIndex - tIndex - 1;
              completed = decoded.replace(/!\w\.isT\w{6}/, `(${decoded.substr(tIndex, numberOfLetters + 11)} && (!${decoded.substr(tIndex + 1, numberOfLetters)}.data || ${decoded.substr(tIndex + 1, numberOfLetters)}.data[5] !== '-'))`);
            } else {
              completed = decoded
            }
            let stateMatch = completed.match(/const ([a-zA-Z]+) ?= ?([a-zA-Z0-9_]+)\.defaults\(\);/)[0];
            let localConst = stateMatch.match(/const ([a-zA-Z]+) ?=/)[0].substr(6).replace(/ ?=/, '');
            completed = completed.replace(stateMatch, `const ${localConst} = globalStateReference = ${stateMatch.match(/([a-zA-Z]+)\.defaults\(\);/)[0]}`);
            let finalHTML = `${completed}`
            encodedHTML = btoa(finalHTML);
            fullfillRequest(encodedHTML, debuggeeId, frameId, true)
          } else {
            fullfillRequest(encodedHTML, debuggeeId, frameId, true)
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
}

if (settingsObject.useWorkerActually === true) {
  requests();
}

chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    if (request.type === "injectContent") {
      if (updateInfo.versions.content.v === initialUpdateInfo.versions.content.v) {
        chrome.tabs.executeScript(sender.tab.id, {
          file: "content.js",
          runAt: "document_start"
        });
        console.log('file')
        /* sendResponse({ updatedScript: false }) */
      } else {
        chrome.tabs.executeScript(sender.tab.id, {
          code: filesObject.content,
          runAt: "document_start"
        });
        console.log('code')
        /* sendResponse({ updatedScript: true, code: filesObject.script }) */
      }


    }

  });

let filesObject = {}

let initialUpdateInfo = chrome.runtime.getManifest().update;
let updateInfo = JSON.parse(JSON.stringify(initialUpdateInfo))

const checkVersions = () => {
  chrome.storage.local.get(['versions'], function (result) {
    if (!(result && result.versions)) return
    console.log(result.versions)
    let versionsToSet = {};
    for (const key in updateInfo.versions) {
      if (updateInfo.versions.hasOwnProperty(key)) {
        if (updateInfo.versions[key].v < result.versions[key].v) {
          updateInfo.versions[key].v = result.versions[key]
          if (key !== 'script') {
            chrome.storage.local.get([key], function (result) { filesObject[key] = result[key] })
          }
        } else {
          chrome.storage.local.remove([key], function () { filesObject[key] = undefined; })
        }
      }
      versionsToSet[key] = {};
      versionsToSet[key].v = updateInfo.versions[key].v;
    }
    if (Object.keys(versionsToSet).length !== 0) {
      chrome.storage.local.set({ versions: versionsToSet });
    }
  });
}
checkVersions()
//console.log(updateInfo)
let updateJsUrls = {
  manifest: 'https://raw.githubusercontent.com/Sentero-esp12/Multi-Premoves-Mouse-Keyboard/master/Extension/manifest.json'
}

const checkUpdates = () => {
  let versionsToSet = {};
  Promise.all([updateJsUrls.manifest].map(u => fetch(u))).then(responses =>
    Promise.all(responses.map(res => res.text()))
  ).then(info => {
    let updateObject = JSON.parse(info[0]).update
    let versions = updateObject.versions
    console.log(updateObject)
    let toUpdate = [];
    for (const key in versions) {
      if (versions.hasOwnProperty(key)) {
        const item = versions[key];
        if (item.v > updateInfo.versions[key].v) {
          toUpdate.push({ name: key, url: updateInfo.versions[key].url })
        }
        versionsToSet[key] = {};
        versionsToSet[key].v = item.v;
      }
    }
    if (toUpdate.length === 0) return;
    Promise.all(toUpdate.map(u => fetch(u.url))).then(responses =>
      Promise.all(responses.map(res => res.text()))
    ).then(info => {

      info.map((x, i) => {
        console.log([toUpdate[i].version], x.substr(0, 100), i)
        if (toUpdate[i].name !== 'script') {
          filesObject[toUpdate[i].name] = x;
        }
        chrome.storage.local.set({ [toUpdate[i].name]: x }, function () {
          console.log('Value is set')
        });
      })
      chrome.storage.local.set({ versions: versionsToSet }, function () {
        // console.log(result.versions)
      });
    })
  })
}


checkUpdates();

const removeVersions = () => {
  chrome.storage.local.clear();
}
//removeVersions()