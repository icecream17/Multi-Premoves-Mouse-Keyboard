//let updatedScript = undefined;
chrome.runtime.sendMessage({ type: "injectContent" }/* , (r) => {
   updatedScript = {
      do: r.updatedScript,
      code: r.code
   }
} */);