Array.prototype.remove = function () { //https://stackoverflow.com/a/3955096/10364842
   var what, a = arguments, L = a.length, ax;
   while (L && this.length) {
      what = a[--L];
      while ((ax = this.indexOf(what)) !== -1) {
         this.splice(ax, 1);
      }
   }
   return this;
};

if (settingsObject.createUI === true) {
   let shadowHost = document.getElementById('shadowHostId')
   let shadowDom = shadowHost.attachShadow({ mode: "open" });

   chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { type: "requireSettings" }, function (response) {

         if (response !== undefined) {

            let settingsUnchanged = JSON.parse(response.settings);
            let settingsObject = JSON.parse(response.settings);
            let convertCyrillic = settingsObject.convertCyrillic
            let CyrillicToLatin = {
               ".": "/", а: "f", б: ",", в: "d", г: "u", д: "l", е: "t", ж: ";", з: "p", и: "b", й: "q", к: "r", л: "k", м: "v", н: "y", о: "j", п: "g", р: "h", с: "c", т: "n", у: "e", ф: "a", х: "[", ц: "w", ч: "x", ш: "i", щ: "o", ъ: "]", ы: "s", ь: "m", э: "'", ю: ".", я: "z"
            }

            let UiObject = {
               basic: {
                  "Multi Premove Key": { value: settingsObject.multipremove, node: "input", setting: "multipremove" },
                  "Cancel Premoves": { value: settingsObject.cancelPremoves, node: "input", setting: "cancelPremoves" },
                  "Always multipremove": { value: settingsObject.alwaysMultiPremove, node: "checkbox", setting: "alwaysMultiPremove" }
               },
               advanced: {
                  "Use keyboard": { value: settingsObject.useKeyboard, node: "checkbox", setting: "useKeyboard" },
                  keyboardKeys: {
                     "Pawn Left": { value: settingsObject.pawnLeft, node: "input", setting: "pawnLeft" },
                     "Pawn Up": { value: settingsObject.pawnUp, node: "input", setting: "pawnUp" },
                     "Pawn Right": { value: settingsObject.pawnRight, node: "input", setting: "pawnRight" },
                     "King": { value: settingsObject.king, node: "input", setting: "king" },
                     "Bishop": { value: settingsObject.bishop, node: "input", setting: "bishop" },
                     "Rook": { value: settingsObject.rook, node: "input", setting: "rook" },
                     "Right rook": { value: settingsObject.rookRight, node: "input", setting: "rookRight" },
                     "Knight": { value: settingsObject.knight, node: "input", setting: "knight" },
                     "Right knight": { value: settingsObject.knightRight, node: "input", setting: "knightRight" },
                     "Queen": { value: settingsObject.queen, node: "input", setting: "queen" },
                     "Second queen": { value: settingsObject.queenSecond, node: "input", setting: "queenSecond" }
                  },
                  "Use mouse": { value: settingsObject.useMouse, node: "checkbox", setting: "useMouse" },
                  "Right button": { value: settingsObject.rightButton, node: "select", setting: "rightButton" },
                  "Left button": { value: settingsObject.leftButton, node: "select", setting: "leftButton" },
                  "Auto berserk back": { value: settingsObject.berserkBack, node: "checkbox", setting: "berserkBack" },
                  "Add animation": { value: settingsObject.animateMultipremoves, node: "checkbox", setting: "animateMultipremoves" },
                  "Click rematch": { value: settingsObject.rematch, node: "input", setting: "rematch" },
                  "Click berserk": { value: settingsObject.berserk, node: "input", setting: "berserk" },
                  "Return to the tournament": { value: settingsObject.backToTournament, node: "input", setting: "backToTournament" },
                  "Click resign": { value: settingsObject.resign, node: "input", setting: "resign" },
                  "Time ratio": { value: settingsObject.drawTimeRatio, node: "checkbox", setting: "drawTimeRatio" },
                  "Ultrabullet theme": { value: settingsObject.useUltrabulletTheme, node: "checkbox", setting: "useUltrabulletTheme" },
                  "Show indicator": { value: settingsObject.createIndicator, node: "checkbox", setting: "createIndicator" },
                  "Experimental arrows": { value: settingsObject.experimentalArrows, node: "checkbox", setting: "experimentalArrows" },

               },
            }
            let UiElement = document.createElement('div');
            /* let arrayOfKeyOptions = [{ "": "None" }, { "multipremove": "Multi premove" }, { "cancelPremoves": "Cancel premoves" },
            { "rematch": "Click rematch" }, { "backToTournament": "Return to the tournament" },
            { "berserk": "Click berserk" }, { "resign": "Click resign" }, { "pawnLeft": "Pawn Left" }, { "pawnUp": "Pawn Up" },
            { "pawnRight": "Pawn Right" }, { "king": "King" }, { "bishop": "Bishop" }, { "rook": "Rook" }, { "rookRight": "Right rook" }, { "knight": "Knight" }, { "knightRight": "Right knight" }, { "queen": "Queen" }, { "queenSecond": "Second queen" }
            ] */

            let arrayOfKeyOptions = {
               "": "None", "multipremove": "Multi Premove Key", "cancelPremoves": "Cancel premoves",
               "rematch": "Click rematch", "backToTournament": "Return to the tournament",
               "berserk": "Click berserk", "resign": "Click resign", "pawnLeft": "Pawn Left", "pawnUp": "Pawn Up",
               "pawnRight": "Pawn Right", "king": "King", "bishop": "Bishop", "rook": "Rook", "rookRight": "Right rook", "knight": "Knight", "knightRight": "Right knight", "queen": "Queen", "queenSecond": "Second queen"
            }

            let selectHTML = { left: "", right: "" };
            for (let key in arrayOfKeyOptions) {
               const el = arrayOfKeyOptions[key];
               for (let button in selectHTML) {
                  let maybeSelected = ""
                  if (settingsObject[`${button}Button`] === key) { maybeSelected = 'selected' }
                  selectHTML[button] += `<option value="${key}" ${maybeSelected}>${el}</option>`
               }
            }
            /* let selectHTML = "";
            for (let i = 0; i < arrayOfKeyOptions.length; i++) {
               const el = arrayOfKeyOptions[i];
               let key = Object.keys(el)[0]
               selectHTML += `<option value="${key}">${el[key]}</option>`
            } */


            let node, parameters = [["keyboard", ""], ["basic", ""], ["advanced", ""]]
            for (let i = 0; i < parameters.length; i++) {
               let key = parameters[i][0]
               let currentObject = key === 'keyboard' ? UiObject.advanced.keyboardKeys : UiObject[key]
               for (const p in currentObject) {
                  if (p !== "keyboardKeys") {
                     let params = currentObject[p];
                     let keyboard = ""
                     if (parameters[i][0] === 'advanced' && p === "Use keyboard") {
                        keyboard = `<div id = "keyboardKeys">${parameters[0][1]}</div>`;
                     }
                     if (params.node !== 'select') {
                        let maybeCheckbox = ""
                        if (params.node === 'checkbox' && params.value === true) {
                           maybeCheckbox = 'checked'
                        }
                        parameters[i][1] += `
            <div class="setting">
            <span class="description">${p}</span>
            <input class="parameter ${params.node}" type="${params.node}" value="${params.value}" setting="${params.setting}" ${maybeCheckbox}></input>
            </div>${keyboard}`
                     } else {
                        parameters[i][1] += `
            <div class="setting">
            <span class="description">${p}</span>
            <select class="parameter ${params.node}" form="${p}" value="${UiObject.advanced[p].value}"  setting="${params.setting}">
            ${selectHTML[p === "Left button" ? 'left' : 'right']}
            </select >
            </div > `
                     }
                  }
               }
            }

            let htmlUI = `
                     <div>
                     <button id="save" class="button">Save</button>
                        <button id="saveReload" class="button">Reload</button>
                        <div id="notification"></div>
                     <div id="allSettings">
                        <div id="basic">
                           ${parameters[1][1]}
                        </div>

                        <button id="hideAdvanced" class="button">Advanced</button>
                        <div id="advanced">
                           ${parameters[2][1]}
                        </div>


                        
                     </div>
</div>
                     <style type="text/css">
input {
width: 68px;
font-weight: bold;
}
#settingsId {
position: absolute;
}
.setting {
width: 250px;
display: flex;
justify-content: space-between;
padding: 1px;
background: linear-gradient(180deg, rgba(163,0,207,1) 0%, rgba(56,56,39,0.05646008403361347) 0%, rgba(133,133,133,0.3533788515406162) 7%, rgba(0,0,0,0) 100%);
border-radius: 0px 5px 5px 0;
}

#advanced {
display: ${settingsObject.buttonsAdvanced === true ? 'block' : 'none'};
}

#keyboardKeys {
display: ${settingsObject.useKeyboard === true ? 'block' : 'none'};
border: solid 1px;
}

select {
width: 115px;
}
button {
border-radius: 1px 3px 0px 0px;
background-color: #ababab;
text-decoration: none;
border: solid 1px #8f8f8f;
outline: 0;
transition: all 0.2s;
}

button#save {
   background-color: #8cb78c;
}
button#saveReload {
background-color: #737171;
}
button:active {
background-color: white !important;
transition: all 0.2s;
}
</style>
                  `

            UiElement.id = 'settingsId'
            UiElement.innerHTML = htmlUI;
            //console.log(htmlUI)

            let reloadRequired = false;
            const saveSettings = (el, shadowDom, notification, settingsCollection) => {
               /*   return new Promise((resolve, reject) => { */
               reloadRequired = false;
               //let sameKeysDisallowed = false;
               let parametersThatRequireReload =
                  ['drawTimeRatio', 'useUltrabulletTheme', 'animateMultipremoves', 'useMouse', 'createIndicator', 'experimentalArrows', 'alwaysMultiPremove']
               //let storeAllKeys = [];
               for (let i = 0; i < settingsCollection.length; i++) {
                  let parameter = settingsCollection[i]
                  let setting = parameter.getAttribute('setting');
                  if (parameter.getAttribute('type') === 'checkbox') {
                     //if (parametersThatRequireReload.includes(setting) && settingsObject[setting] !== parameter.checked) { reloadRequired = true; }
                     settingsObject[setting] = parameter.checked;
                  } else {
                     if (parameter.getAttribute('type') === 'input') {
                        //if (storeAllKeys.includes(parameter.value)) { sameKeysDisallowed = true; }
                        //storeAllKeys.push(parameter.value)
                     }
                     settingsObject[setting] = parameter.value;
                  }
               }
               let useLeftButton = (!!settingsObject.leftButton && !settingsObject.useMouse);
               let useRightButton = (!!settingsObject.rightButton);
               if (useLeftButton === true) {
                  for (const key in settingsObject) {
                     if (settingsObject[key] === 'lb') { settingsObject[key] = "" }
                  }
                  settingsObject[settingsObject.leftButton] = 'lb'
               }
               if (useRightButton === true) {
                  for (const key in settingsObject) {
                     if (settingsObject[key] === 'rb') { settingsObject[key] = "" }
                  }
                  settingsObject[settingsObject.rightButton] = 'rb'
               }

               let arrToCheckDublicates = [];
               for (let i in settingsObject) {
                  if (typeof settingsObject[i] === 'string') {
                     arrToCheckDublicates.push(settingsObject[i]);
                  }
                  if (parametersThatRequireReload.includes(i) && settingsObject[i] !== settingsUnchanged[i]) {
                     reloadRequired = true;
                  }
               }

               arrToCheckDublicates.remove("")
               let sameKeysDisallowed = (new Set(arrToCheckDublicates)).size !== arrToCheckDublicates.length

               let warning = "";
               if (reloadRequired === true) {
                  warning = "Reload is required to apply changes."
               }
               if (sameKeysDisallowed === true) {
                  warning = "Not possible to use the same keys for multiple options."
               }
               if (reloadRequired === true || sameKeysDisallowed === true) {
                  notification.innerText = warning;
                  notification.style.color = 'red'
               } else {
                  notification.innerText = "";
               }
               if (sameKeysDisallowed === false) {
                  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                     chrome.tabs.sendMessage(tabs[0].id, { type: "returnSettings", object: JSON.stringify(settingsObject) });
                  });
                  //settingsUnchanged = Object.assign({}, settingsObject)
               } /* else {
                  settingsObject = JSON.parse(response.settings)
               } */

               /*  resolve()
             }) */
            }
            setTimeout(() => {
               let shadowHost = document.getElementById('shadowHostId');
               if (shadowHost !== undefined) {
                  shadowHost.shadowRoot.appendChild(UiElement)
                  let shadowDom = shadowHost.shadowRoot;
                  let settingsElement = shadowDom.getElementById('settingsId')
                  let advancedSettings = shadowDom.getElementById('advanced')
                  let keyboardSettings = shadowDom.getElementById('keyboardKeys')
                  let notification = shadowDom.getElementById('notification')
                  let settingsCollection = shadowDom.querySelectorAll('.parameter')
                  settingsElement.addEventListener('click', (e) => {
                     let clickedEl = e.target;
                     if (clickedEl.tagName === "BUTTON") {
                        if (clickedEl.id === 'hideAdvanced') {
                           settingsObject.buttonsAdvanced === true ?
                              (settingsObject.buttonsAdvanced = false, advancedSettings.style.display = 'none')
                              : (settingsObject.buttonsAdvanced = true, advancedSettings.style.display = 'block')
                        }
                        else if (clickedEl.id === 'save') {
                           saveSettings(settingsElement, shadowDom, notification, settingsCollection)
                        } else
                           if (clickedEl.id === 'saveReload') {
                              chrome.tabs.reload(); reloadRequired = false;
                              notification.innerText = "";
                              settingsUnchanged = Object.assign({}, settingsObject)
                           }
                     } else if (clickedEl.getAttribute('setting') === 'useKeyboard') {
                        settingsObject.useKeyboard === true ?
                           (settingsObject.useKeyboard = false, keyboardSettings.style.display = 'none', clickedEl.checked = false)
                           : (settingsObject.useKeyboard = true, keyboardSettings.style.display = 'block', clickedEl.checked = true)
                     } /* else {

                  } */

                  })

                  shadowDom.addEventListener('keydown', (e) => {
                     if (e.target.tagName === "INPUT") {
                        let key = e.key;
                        if (key.length === 1) {
                           key = key.toLowerCase();
                           if (convertCyrillic === true && CyrillicToLatin[key] !== undefined) {
                              key = CyrillicToLatin[key];
                           }
                        }
                        if (key !== 'Backspace') {
                           e.target.value = key;
                        } else {
                           e.target.value = ""
                        }

                        e.preventDefault();
                     }
                  })
                  /* let advancedHidden = true;
                  let advancedButton = shadowHost.shadowRoot.getElementById('hideAdvanced')
                  let advanced = shadowHost.shadowRoot.getElementById('advanced')
                  advancedButton.addEventListener('click', () => {
                     if (advancedHidden === false) {
                        advanced.style.display = "none"
                        advancedHidden = true;
                     } else {
                        advanced.style.display = "block"
                        advancedHidden = false;
                     }
                  }) */
               }
            }, 0);


         } else {
            let unsupported = document.createElement('span')
            unsupported.innerText = "The settings window is only supported on Lichess pages. If this is an error, try to reload the page"
            document.body.appendChild(unsupported)
         }
      });
   });
}