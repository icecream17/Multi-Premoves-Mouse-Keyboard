if (settingsObject.createUI === true) {
   const multiPremoveSettingsString = localStorage.getItem('multiPremoveSettings');
   let multiPremoveSettings = JSON.parse(multiPremoveSettingsString)
   for (const key in multiPremoveSettings) {
      settingsObject[key] = multiPremoveSettings[key]
   }
}

let isGame = /^https:\/\/(lichess\.org|lichess\.dev|mskchess\.ru)\/(\w{8}|\w{12})(\/white|\/black)?$/.test(window.location.href);
if (isGame === true) {
   //variables from settings 
   let useKeyboard = settingsObject.useKeyboard;
   let useMouse = settingsObject.useMouse;
   let rightButtonMulti = settingsObject.rightButton === 'multipremove';
   let leftButtonMulti = settingsObject.leftButton === 'multipremove';
   let useLeftButton = (!!settingsObject.leftButton && !useMouse);
   let useRightButton = (!!settingsObject.rightButton);
   let useUltrabulletTheme = settingsObject.useUltrabulletTheme;
   let animateMultipremoves = settingsObject.animateMultipremoves;
   let createUI = settingsObject.createUI;
   let berserkBack = settingsObject.berserkBack;
   let downEvent = settingsObject.downEvent
   let upEvent = settingsObject.upEvent
   let moveEvent = settingsObject.moveEvent
   let createIndicator = settingsObject.createIndicator
   //end of settings variables

   let BothClickAndDrug = false;
   let globalMultiKeyValueBeforePageLoad = false;

   //code for handling touchscreens https://stackoverflow.com/a/1781750/10364842
   if (settingsObject.handleTouchscreens === true) {
      function touchHandler(event) {
         event.preventDefault();
         event.stopImmediatePropagation();
         event.stopPropagation();
         var touches = event.changedTouches,
            first = touches[0],
            type = "";
         switch (event.type) {
            case "touchstart": type = "mousedown"; break;
            case "touchmove": type = "mousemove"; break;
            case "touchend": type = "mouseup"; break;
            default: return;
         }
         // initMouseEvent(type, canBubble, cancelable, view, clickCount, 
         //                screenX, screenY, clientX, clientY, ctrlKey, 
         //                altKey, shiftKey, metaKey, button, relatedTarget);

         /* var simulatedEvent = document.createEvent("MouseEvent");
         simulatedEvent.initMouseEvent(type, true, true, window, 1,
            first.screenX, first.screenY,
            first.clientX, first.clientY, false,
            false, false, false, 0, null);
         simulatedEvent.data = 'proceed'
         first.target.dispatchEvent(simulatedEvent); */
         let ev = new MouseEvent(type, {
            "view": window,
            "bubbles": true,
            "cancelable": true,
            "clientX": first.clientX,
            "clientY": first.clientY
         });
         ev.data = 'proceed';
         first.target.dispatchEvent(ev);
      }
      function init() {
         let options = {capture: true, passive: false}
        //let options = true
         document.addEventListener("touchstart", touchHandler, options);
         document.addEventListener("touchmove", touchHandler, options);
         document.addEventListener("touchend", touchHandler, options);
         document.addEventListener("touchcancel", touchHandler, options);
      }
      init()
   }
   //end code for handling touchscreens

   const checkMouseDownBeforePageLoaded = (e) => {
      if (e.isTrusted === true) {
         if (rightButtonMulti === true) {
            if (e.which === 3) {
               e.stopImmediatePropagation();
               e.preventDefault();
               globalMultiKeyValueBeforePageLoad = true;
            }

         } else if (leftButtonMulti === true) {
            if (e.which === 1) {
               e.stopImmediatePropagation();
               globalMultiKeyValueBeforePageLoad = true;
            }
         }
      }

   }
   const checkMouseUpBeforePageLoaded = (e) => {
      if (e.isTrusted === true) {
         if (rightButtonMulti === true) {
            if (e.which === 3) {
               e.stopImmediatePropagation();
               e.preventDefault();
               globalMultiKeyValueBeforePageLoad = false;
            }

         } else if (leftButtonMulti === true) {
            if (e.which === 1) {
               e.stopImmediatePropagation();
               globalMultiKeyValueBeforePageLoad = false;
            }
         }
      }
   }
   const checkKeyDownBeforePageLoaded = (e) => {
      let key = e.key;
      if (key.length === 1) { key = key.toLowerCase() }
      if (key === settingsObject.multipremove) {
         globalMultiKeyValueBeforePageLoad = true;
      }
   }
   const checkKeyUpBeforePageLoaded = (e) => {
      let key = e.key;
      if (key.length === 1) { key = key.toLowerCase() }
      if (key === settingsObject.multipremove) {
         globalMultiKeyValueBeforePageLoad = false;
      }
   }

   document.addEventListener(downEvent, checkMouseDownBeforePageLoaded)
   document.addEventListener(upEvent, checkMouseUpBeforePageLoaded)
   document.addEventListener('keydown', checkKeyDownBeforePageLoaded)
   document.addEventListener('keyup', checkKeyUpBeforePageLoaded)

   let objGA;
   let console2 = console.log;
   let consoleBackUp = function () { };
   let currentPieceSet;

   (() => {

      let myTurn;
      let isItAGame = true;
      let chess;
      let delaysBeforeSendingMoves = { m: settingsObject.inMoveDelay, o: settingsObject.outMoveDelay }
      let lastMoveMadeUCI;
      let whoseMove;
      let myColor;
      let numberOfPlies;
      let doOnce = undefined; //for the mutation observer, to observe whose move it is.
      let notBeginning = false;  //to prevent the observer from observing prematurely. 
      let myMoveAccordingToObserver;
      let convertLetterToPiece =
      {
         p: 'pawn',
         n: 'knight',
         b: 'bishop',
         r: 'rook',
         q: 'queen',
         k: 'king',
      }
      let convertLetterToColor = {
         w: 'white',
         b: 'black'
      }
      let squareArr = [
         [["a8"], ["b8"], ["c8"], ["d8"], ["e8"], ["f8"], ["g8"], ["h8"]],
         [["a7"], ["b7"], ["c7"], ["d7"], ["e7"], ["f7"], ["g7"], ["h7"]],
         [["a6"], ["b6"], ["c6"], ["d6"], ["e6"], ["f6"], ["g6"], ["h6"]],
         [["a5"], ["b5"], ["c5"], ["d5"], ["e5"], ["f5"], ["g5"], ["h5"]],
         [["a4"], ["b4"], ["c4"], ["d4"], ["e4"], ["f4"], ["g4"], ["h4"]],
         [["a3"], ["b3"], ["c3"], ["d3"], ["e3"], ["f3"], ["g3"], ["h3"]],
         [["a2"], ["b2"], ["c2"], ["d2"], ["e2"], ["f2"], ["g2"], ["h2"]],
         [["a1"], ["b1"], ["c1"], ["d1"], ["e1"], ["f1"], ["g1"], ["h1"]]
      ]

      let convertCastleNotaion =
      {
         'e1h1': 'e1g1',
         'e1a1': 'e1c1',
         'e8h8': 'e8g8',
         'e8a8': 'e8c8',
         'e1g1': 'e1h1',
         'e1c1': 'e1a1',
         'e8g8': 'e8h8',
         'e8c8': 'e8a8'
      }
      let LastPieceThatMoved;

      let objectOutComingSocket = {};
      let objectInComingSocket = {};

      Function.prototype.async = function () {
         setTimeout.bind(null, this, 0).apply(null, arguments);
      };


      let initialTimeForBerserk;
      const berserkFunction = (info) => {
         //console.log(info)
         let data = info.data;
         if (data.length > 1) {
            let parsed = JSON.parse(data);
            if (parsed.t === "clockInc" && -parsed.d.time * 2 === initialTimeForBerserk && parsed.d.color !== myColor) {
               let berserkButton = document.getElementsByClassName("fbt go-berserk")[0];
               if (berserkButton) {
                  berserkButton.click();
               }

            }
         }

      }


      (function () { //to get the move that has been sent by the client, https://stackoverflow.com/a/31182643/10364842
         var OrigWebSocket = window.WebSocket;
         var callWebSocket = OrigWebSocket.apply.bind(OrigWebSocket);
         var wsAddListener = OrigWebSocket.prototype.addEventListener;
         wsAddListener = wsAddListener.call.bind(wsAddListener);
         window.WebSocket = function WebSocket(url, protocols) {
            var ws;
            if (!(this instanceof WebSocket)) {
               // Called without 'new' (browsers will throw an error).
               ws = callWebSocket(this, arguments);
            } else if (arguments.length === 1) {
               ws = new OrigWebSocket(url);
            } else if (arguments.length >= 2) {
               ws = new OrigWebSocket(url, protocols);
            } else { // No arguments (browsers will throw an error)
               ws = new OrigWebSocket();
            }
            wsAddListener(ws, 'message', function (event) {
               // TODO: Do something with event.data (received data) if you wish.
               //console.log(ws,event)
               if (berserkBack) {
                  berserkFunction.async(event)
               }
               //consoleNew(event.data, performance.now() - timeStampToMeasureWebSocket)
            });
            return ws;
         }.bind();
         window.WebSocket.prototype = OrigWebSocket.prototype;
         window.WebSocket.prototype.constructor = window.WebSocket;

         var wsSend = OrigWebSocket.prototype.send;
         wsSend = wsSend.apply.bind(wsSend);
         OrigWebSocket.prototype.send = function (data) {
            // TODO: Do something with the sent data if you wish.
            if (data !== null && data !== "null") {
               workWithAnOutcomingMove/* .async */(data)
            }
            return wsSend(this, arguments);
         };
      })();



      const startObservingBoard = (currentPieceSet, moves, whoseMove, inMoves, doValue, delay) => {
         let boardObserver;
         let configBoard = {
            childList: true
         };
         boardObserver = new MutationObserver((mutations, observer) => {
            if (document.getElementsByClassName('last-move')[0] !== undefined) {
               //resolve(true)
               observer.disconnect();
               //setTimeout(() => {

               // console.log('|||||||||||||||', doValue === 0 ? 'myTurn' : 'oppTurn')
               doOnce = doValue;
               objGA.setPieces(currentPieceSet);
               objGA.moves(moves); objGA.whoseM(whoseMove);
               objGA.inMoves = inMoves; objGA.DoinMoves()
               //}, delay);
            }
         });
         boardObserver.observe(document.getElementsByTagName('cg-board')[0], configBoard);
      }






      const workWithAnOutcomingMove = async (data) => {
         //console.log(data)
         let parsed = JSON.parse(data);
         if (parsed.t === 'move') {
            //console.log('______Opp Move Socket Outcoming', performance.now())
            window.postMessage({
               type: 'out', move: parsed.d.u, myColor: myColor
            }, "*");
            ++numberOfPlies;
            whoseMove = whoseMove === 'white' ? 'black' : 'white';
            let fromToArr = [parsed.d.u.substr(0, 2), parsed.d.u.substr(2, 2)]
            if ((fromToArr[1][1] === '8' || fromToArr[1][1] === '1') && currentPieceSet[fromToArr[0]] !== undefined && currentPieceSet[fromToArr[0]].role === 'pawn') {
               //console.log('promotion-out', parsed)
               let promotedTo = parsed.d.u[4].toLowerCase();
               chess.move({ from: fromToArr[0], to: fromToArr[1], promotion: promotedTo })
            } else {

               if (currentPieceSet[fromToArr[0]].role === 'king' && ((fromToArr[0] === 'e1') || (fromToArr[0] === 'e8'))) {
                  switch (fromToArr[1]) {
                     case 'a1':
                        fromToArr[1] = 'c1'
                        break;
                     case 'h1':
                        fromToArr[1] = 'g1'
                        break;
                     case 'a8':
                        fromToArr[1] = 'c8'
                        break;
                     case 'h8':
                        fromToArr[1] = 'g8'
                        break;

                     default:
                        break;
                  }
               }
               //console.log('out1',chess.board())
               chess.move({ from: fromToArr[0], to: fromToArr[1] })
               //console.log('out2',chess.board())
               //console.log('out-end',parsed.d.u,performance.now())
            }

            //lastMoveMadeUCI = fromToArr.join('');
            lastMoveMadeUCI = parsed.d.u.substr(0, 4);
            LastPieceThatMoved = currentPieceSet[fromToArr[0]].role;
            currentPieceSet = convertToPieceObject(chess.board());

            setTimeout(() => {
               setTimeout(() => {
                  // console.info('outcoming', performance.now(), document.getElementsByClassName("rclock rclock-bottom running")[0] === undefined)
                  objGA.setPieces(currentPieceSet);
                  objGA.moves(undefined); objGA.whoseM(whoseMove);
                  objGA.inMoves = {}; objGA.DoinMoves()
               }, delaysBeforeSendingMoves.o);
            }, 0);
            /*  objectOutComingSocket.setPieces = currentPieceSet;
             objectOutComingSocket.moves = undefined;
             objectOutComingSocket.whoseM = whoseMove;
             objectOutComingSocket.inMoves = {};
             if (notBeginning === false) { notBeginning = true; }
             if (doOnce === undefined) {
                startObservingBoard(currentPieceSet, undefined, whoseMove, {}, 1, delaysBeforeSendingMoves.o);
             } */

         }
      }


      const incomingMove = (d) => {
         // console.log(d)
         if (lastMoveMadeUCI !== d.uci && (LastPieceThatMoved !== 'king' || d.uci !== convertCastleNotaion[lastMoveMadeUCI])/*  && (d.san[4] !== '=' || ) */) {
            // console.log('+_____my Move Socket Incoming', performance.now())
            //timePassedBetweenPlies = performance.now()
            window.postMessage({
               type: 'in', move: d.uci, myColor: myColor
            }, "*");
            ++numberOfPlies;
            whoseMove = d.ply % 2 === 0 ? "white" : "black";
            let fromToArr = [d.uci.substr(0, 2), d.uci.substr(2, 2)]
            if ((fromToArr[1][1] === '8' || fromToArr[1][1] === '1') && currentPieceSet[fromToArr[0]] !== undefined && currentPieceSet[fromToArr[0]].role === 'pawn') {
               // console.log('promotion-in', d)
               let indexOfEqualSign = d.san.indexOf('=')
               let promotedTo = d.san[indexOfEqualSign + 1].toLowerCase();
               chess.move({ from: fromToArr[0], to: fromToArr[1], promotion: promotedTo })
            } else {

               //if (currentPieceSet[fromToArr[0]] === undefined) { debugger; }
               if (currentPieceSet[fromToArr[0]].role === 'king' && ((fromToArr[0] === 'e1') || (fromToArr[0] === 'e8'))) {
                  switch (fromToArr[1]) {
                     case 'a1':
                        fromToArr[1] = 'c1'
                        break;
                     case 'h1':
                        fromToArr[1] = 'g1'
                        break;
                     case 'a8':
                        fromToArr[1] = 'c8'
                        break;
                     case 'h8':
                        fromToArr[1] = 'g8'
                        break;

                     default:
                        break;
                  }
               }

               chess.move({ from: fromToArr[0], to: fromToArr[1] })

            }


            lastMoveMadeUCI = d.uci;
            currentPieceSet = convertToPieceObject(chess.board());

            let legalMoves = Object.assign({}, d.dests);
            for (let sq in legalMoves) {
               let arr = [];
               for (var i = 0; i < legalMoves[sq].length - 1; i += 2) {
                  arr.push(legalMoves[sq][i] + legalMoves[sq][i + 1]);
               }
               legalMoves[sq] = arr;
            }
            setTimeout(() => {
               //setTimeout(() => {
               objGA.setPieces(currentPieceSet);
               objGA.whoseM(whoseMove);
               objGA.moves(legalMoves);
               objGA.inMoves = legalMoves; objGA.DoinMoves();
               //}, delaysBeforeSendingMoves.m);
            }, 0);

            /*   objectInComingSocket.setPieces = currentPieceSet;
              objectInComingSocket.moves = legalMoves;
              objectInComingSocket.whoseM = whoseMove;
              objectInComingSocket.inMoves = legalMoves;
              if (notBeginning === false) { notBeginning = true; }
              if (doOnce === undefined) {
                 startObservingBoard(currentPieceSet, legalMoves, whoseMove, legalMoves, 0, delaysBeforeSendingMoves.m);
              } */
         }

      }

      const convertToPieceObject = (board) => {
         let pieceObject = {};
         for (let i = 0; i < board.length; i++) {
            let row = board[i];
            for (let j = 0; j < row.length; j++) {
               let sq = row[j];
               if (sq !== null) {
                  pieceObject[squareArr[i][j]] = { role: convertLetterToPiece[sq.type], color: convertLetterToColor[sq.color] }
               }
            }
         }
         return pieceObject;
      }

      function findClosingBracketMatchIndex(str, pos) { //https://codereview.stackexchange.com/questions/179471/find-the-corresponding-closing-parenthesis
         if (str[pos] !== '{') {
            throw new Error("No '{' at index " + pos);
         }
         let depth = 1;
         for (let i = pos + 1; i < str.length; i++) {
            switch (str[i]) {
               case '{':
                  depth++;
                  break;
               case '}':
                  if (--depth == 0) {
                     return i;
                  }
                  break;
            }
         }
         return -1;    // No matching closing parenthesis
      }


      setTimeout(() => {
         //  $(document).ready(() => {
         let scriptCollection = document.getElementsByTagName('script');
         let scriptTagWithInfo;
         for (let i = 0; i < scriptCollection.length; i++) {
            if (scriptCollection[i].text.includes('fen')) { scriptTagWithInfo = scriptCollection[i].text }
         }
         let indexOfBoot = scriptTagWithInfo.indexOf('boot(') + 5;
         let parsableGameInfo = scriptTagWithInfo
            .substr(indexOfBoot/* , scriptTagWithInfo.length - 1 - indexOfBoot */);
         let positionOfTheClosingBracket = findClosingBracketMatchIndex(parsableGameInfo, 0)
         parsableGameInfo = parsableGameInfo.substr(0, positionOfTheClosingBracket + 1)

         // findClosingBracketMatchIndex(str, pos)

         let gameInfo;

         try {
            gameInfo = JSON.parse(parsableGameInfo);
            // console.log(gameInfo)
         } catch (e) {
            //console.log(e)
         };

         if ((gameInfo.data.player.id === undefined || gameInfo.data.player.spectator === true) && (gameInfo.userId !== gameInfo.data.player.user.id || (gameInfo.chat && gameInfo.chat.data.userId !== gameInfo.data.player.user.id) || (gameInfo.data.game.status.name !== 'started'))) {
            isItAGame = false;
         } else {

            initialTimeForBerserk = gameInfo.data.clock.initial * 100;
            numberOfPlies = gameInfo.data.game.turns;
            if (gameInfo.data.pref.moveEvent === 2) { BothClickAndDrug = true; }
            let currentPositionFEN = gameInfo.data.game.fen;
            chess = new Chess(currentPositionFEN)
            currentPieceSet = convertToPieceObject(chess.board());
            objGA.setPieces(currentPieceSet);
            objGA.setcolor(gameInfo.data.player.color);
            myColor = gameInfo.data.player.color;
            whoseMove = gameInfo.data.game.player;
            myTurn = gameInfo.data.player.color === gameInfo.data.game.player;
            objGA.whoseM(gameInfo.data.game.player)

            let legalMoves = {};

            if (gameInfo.data.possibleMoves !== undefined) {
               let arrOfPossibleMoves = gameInfo.data.possibleMoves.split(' ')
               for (let i = 0; i < arrOfPossibleMoves.length; i++) {
                  let arr = [];
                  for (var j = 2; j < arrOfPossibleMoves[i].length - 1; j += 2) {
                     arr.push(arrOfPossibleMoves[i][j] + arrOfPossibleMoves[i][j + 1]);
                  }
                  legalMoves[arrOfPossibleMoves[i].substr(0, 2)] = arr;
               }
            }

            objGA.inMoves = legalMoves;
            objGA.DoinMoves/* .async */();
            // console.log(currentPieceSet, legalMoves)


            //window.lichess.pubsub.on('socket.in.move', d => incomingMove.async(d));
            if (window.lichess.pubsub !== undefined) {
               window.lichess.pubsub.on('socket.in.move', d => incomingMove(d));
            } else {
               setTimeout(() => {
                  window.lichess.pubsub.on('socket.in.move', d => incomingMove(d));
               }, 200);
            }

            objGA.setBoard();
            objGA.setKeys();
            let globalX, globalY;

            if (createUI === true) {
               window.addEventListener("message", (e) => {
                  if (e.data.type === "settings") {
                     let multiPremoveSettings = e.data.object
                     for (const key in multiPremoveSettings) {
                        settingsObject[key] = multiPremoveSettings[key]
                     }
                     useKeyboard = settingsObject.useKeyboard;
                     useMouse = settingsObject.useMouse;
                     rightButtonMulti = settingsObject.rightButton === 'multipremove';
                     leftButtonMulti = settingsObject.leftButton === 'multipremove';
                     useLeftButton = (!!settingsObject.leftButton && !useMouse);
                     useRightButton = (!!settingsObject.rightButton);
                     berserkBack = settingsObject.berserkBack;

                     objGA.PieceKeys.length = 0;
                     objGA.PieceKeys = [
                        settingsObject.pawnLeft, //pawn to left
                        settingsObject.pawnUp, //pawn up
                        settingsObject.pawnRight, //pawn to right
                        settingsObject.king, //king
                        settingsObject.bishop, //bishop
                        settingsObject.rook, //rook
                        settingsObject.rookRight, //rook with a square
                        settingsObject.knight, //knight
                        settingsObject.knightRight, //knight with a square
                        settingsObject.queen,  //queen
                        settingsObject.queenSecond, //queen with a square
                        settingsObject.multipremove, //multipremove 
                        settingsObject.cancelPremoves, //cancell multipremoves
                        settingsObject.rematch, //rematch
                        settingsObject.resign, //resign
                        settingsObject.berserk, //berserk button
                        settingsObject.backToTournament  // return to the tournament
                     ]
                     objGA.setKeys();
                  }
               })
            }

            if (createIndicator === true) {
               setTimeout(function () {
                  let shadowHost = document.getElementById('shadowHostId')
                  let shadowDom = shadowHost.shadowRoot;
                  objGA.indicator = document.createElement('div')
                  objGA.indicator.id = 'indicator'
                  objGA.indicator.style.width = '30px'
                  objGA.indicator.style.height = '30px'
                  objGA.indicator.style.position = 'absolute'
                  objGA.indicator.style.top = objGA.y0 + objGA.w + 90 + 'px'
                  objGA.indicator.style.left = objGA.x0 + 'px'
                  objGA.indicator.style.background = '#35290e'
                  objGA.indicator.style.border = 'solid 2px #8e8e8e'
                  objGA.indicator.style.borderRadius = '50px'
                  shadowDom.appendChild(objGA.indicator)
                  objGA.indicator.addEventListener('mousedown', (e) => {
                     if (objGA.multiPremKeyPressed === true) {
                        objGA.multiPremKeyPressed = false;
                        objGA.indicator.style.background = '#35290e'
                     } else {
                        objGA.multiPremKeyPressed = true;
                        objGA.indicator.style.background = '#114811'
                     }
                  })
               }, 0);
            }

            if (settingsObject.detectPrevKB === true) {
               setTimeout(function () {
                  let previousKBdetected = document.getElementById('KeyboardO');
                  if (previousKBdetected) {
                     let shadowHost = document.getElementById('shadowHostId')
                     let shadowDom = shadowHost.shadowRoot;
                     kbChange = document.createElement('span')
                     kbChange.style.position = 'absolute'
                     kbChange.style.top = objGA.y0 + objGA.w + 90 + 'px'
                     kbChange.style.left = objGA.x0 + 100 + 'px'
                     kbChange.style.color = 'rgb(103 73 43)'
                     kbChange.style.lineHeight = '0.8em';
                     kbChange.innerText = `To use KB with multipremoves disable the previous KB extension, \n
                  and enable 'Use keyboard' in the settings`
                     shadowDom.appendChild(kbChange)
                  }
               }, 500);
            }
            /* 
                           let observer;            
                           let config = {
                              attributes: true//,childList: false//,subtree: false
                           };
                           observer = new MutationObserver(() => {
                              if (document.getElementsByClassName("rclock rclock-bottom running")[0] !== undefined) {
                                 if (doOnce === 1 && notBeginning === true && numberOfPlies > 1) {
                                    doOnce = 0;
                                    myMoveAccordingToObserver = true;
                                    setTimeout(() => {
                                       objGA.setPieces(objectInComingSocket.setPieces);
                                       objGA.whoseM(objectInComingSocket.whoseM);
                                       objGA.moves(objectInComingSocket.moves);
                                       objGA.inMoves = objectInComingSocket.inMoves; objGA.DoinMoves();
                                    }, delaysBeforeSendingMoves.m);
            
                                    console.log('+-----my Move Observer', performance.now())
                                 }
                              } else
                                 if (document.getElementsByClassName("rclock rclock-bottom running")[0] === undefined) {
                                    if (doOnce === 0 && notBeginning === true && numberOfPlies > 1) {
                                       doOnce = 1;
                                       myMoveAccordingToObserver = false;
            
                                       setTimeout(() => {
                                          objGA.setPieces(objectOutComingSocket.setPieces);
                                          objGA.whoseM(objectOutComingSocket.whoseM);
                                          objGA.moves(undefined);
                                          objGA.inMoves = {}; objGA.DoinMoves();
            
                                       }, delaysBeforeSendingMoves.o);
            
                                       console.log('------Opp Move Observer', performance.now())
                                    }
                                 }
                           });
                           setTimeout(() => {
                              observer.observe(document.getElementsByClassName('rclock-bottom')[0], config); 
                           }, 300); */




         }
         // })

      }, 400);



   })()

   objGA = {
      PieceKeys: [
         settingsObject.pawnLeft, //pawn to left
         settingsObject.pawnUp, //pawn up
         settingsObject.pawnRight, //pawn to right
         settingsObject.king, //king
         settingsObject.bishop, //bishop
         settingsObject.rook, //rook
         settingsObject.rookRight, //rook with a square
         settingsObject.knight, //knight
         settingsObject.knightRight, //knight with a square
         settingsObject.queen,  //queen
         settingsObject.queenSecond, //queen with a square
         settingsObject.multipremove, //multipremove 
         settingsObject.cancelPremoves, //cancell multipremoves
         settingsObject.rematch, //rematch
         settingsObject.resign, //resign
         settingsObject.berserk, //berserk button
         settingsObject.backToTournament  // return to the tournament
      ],
      /*setKeys: () => {
      objGA.PieceKeys.forEach((key)=>{objGA.PieceNames[key]=})
      }*/
      PremoveDirections:
      {
         //pawn:
      },

      setKeys: () => {
         objGA.PieceNames = {
            [objGA.PieceKeys[0]]: { p: 'pawn', d: 'l' },
            [objGA.PieceKeys[1]]: { p: 'pawn', d: 'u' },
            [objGA.PieceKeys[2]]: { p: 'pawn', d: 'r' },
            [objGA.PieceKeys[3]]: { p: 'king' },
            [objGA.PieceKeys[4]]: { p: 'bishop' },
            [objGA.PieceKeys[5]]: { p: 'rook', d: 'l' },
            [objGA.PieceKeys[6]]: { p: 'rook', d: 'r' },
            [objGA.PieceKeys[7]]: { p: 'knight', d: 'l' },
            [objGA.PieceKeys[8]]: { p: 'knight', d: 'r' },
            [objGA.PieceKeys[9]]: { p: 'queen', d: 'l' },
            [objGA.PieceKeys[10]]: { p: 'queen', d: 'r' }
         }
         objGA.multiKeys = {
            m: objGA.PieceKeys[11],
            c: objGA.PieceKeys[12]
         }
         objGA.OnlyPieceKeys = objGA.PieceKeys.slice(0, 11)
         //console.log(objGA.PieceNames);
      },
      ////console.log(objGA.PieceNames),
      moves(moves) {
         objGA.legalmoves = moves;

         //console.log(objGA.legalmoves)
      },
      moveC(moveC) {
         objGA.justplayed = moveC;
         //console.log(objGA.justplayed)
      },
      whoseM(color) {
         objGA.player = color;
         //console.log(objGA.player)
      },
      keys: [],
      keysT: [],
      //objGA.keys = objGA.keysT = []1,
      FixDests: () => {
         try {
            objGA.beginning = false;

            let inMovesConvertedFromMap = objGA.inMoves;
            for (const square in inMovesConvertedFromMap) {
               inMovesConvertedFromMap[square].forEach((dest) => {
                  objGA.DestPiece[dest] = objGA.DestPiece[dest] || {};
                  objGA.DestPiece[dest][objGA.pieces[square].role] = objGA.DestPiece[dest][objGA.pieces[square].role] || [];
                  objGA.DestPiece[dest][objGA.pieces[square].role].push(square);
               })
            }

         } catch {

         }

      },
      ConvertToDigits: {
         a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8
      },
      ConvertToLetters: {
         1: 'a', 2: 'b', 3: 'c', 4: 'd', 5: 'e', 6: 'f', 7: 'g', 8: 'h'
      },
      allSquares: [[1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6], [2, 7], [2, 8], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [3, 6], [3, 7], [3, 8], [4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [4, 6], [4, 7], [4, 8], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5], [5, 6], [5, 7], [5, 8], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [6, 6], [6, 7], [6, 8], [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6], [7, 7], [7, 8], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 6], [8, 7], [8, 8]],

      CalculatePrem: (e, t, o = true) => {
         let destsReturn = [];


      },
      Pawn: (c, d, multi = false, whatPiecesPosToChoose) => {
         return new Promise((resolve, reject) => {
            //console.log(d);
            let wherePieces = [];
            for (const coord in whatPiecesPosToChoose) {
               if (whatPiecesPosToChoose[coord].role === "pawn" && whatPiecesPosToChoose[coord].color === objGA.myCol) {
                  let coordDigits = Number(objGA.ConvertToDigits[coord[0]] + coord[1]);
                  //wherePieces.push(coordDigits);
                  objGA.myCol === 'white' ? wherePieces.push([Math.floor([coordDigits / 10]), coordDigits % 10]) :
                     wherePieces.push([9 - Math.floor([coordDigits / 10]), 9 - coordDigits % 10])
               }
            }


            //console.log(wherePieces);
            let possibles = [];
            if (c[1] === 4 && d === 'u') {
               //possibles[0] = [c[0],c[1]-2];
               // //console.log(possibles);
               possibles = wherePieces.filter(coord => (coord[0] === c[0]) && (coord[1] === 2 || coord[1] === 3));
               //console.log(possibles);
               if (possibles.length > 0) {
                  resolve(true)
                  if (possibles.length > 1) {
                     objGA.executeMove(c, [c[0], 2], false, multi, true, "pawn");
                  } else if
                     (possibles.length === 1) {
                     objGA.executeMove(c, possibles[0], false, multi, true, "pawn");
                  }
               } else { resolve(false) }
            }
            else if (c[1] > 2) {
               switch (d) {
                  case 'l':
                     possibles = wherePieces.filter(coord => (c[1] - coord[1] === 1) && (c[0] - coord[0] === -1));
                     //console.log(possibles);
                     if (possibles.length !== 0) { resolve(true); objGA.executeMove(c, possibles[0], false, multi, true, "pawn"); } else { resolve(false) }
                     break;
                  case 'u':
                     possibles = wherePieces.filter(coord => (c[1] - coord[1] === 1) && (c[0] === coord[0]));
                     //console.log(possibles);
                     if (possibles.length !== 0) { resolve(true); objGA.executeMove(c, possibles[0], false, multi, true, "pawn"); } else { resolve(false) }
                     break;
                  case 'r':
                     possibles = wherePieces.filter(coord => (c[1] - coord[1] === 1) && (c[0] - coord[0] === 1));
                     //console.log(possibles);
                     if (possibles.length !== 0) { resolve(true); objGA.executeMove(c, possibles[0], false, multi, true, "pawn"); } else { resolve(false) }
                     break;
                  default:
               }

               //if (c[0]===1)
               //{possibles.push([c[0],c[1]-1],[c[0]+1,c[1]-1])} else if (c[0]===8) {possibles.push([c[0],c[1]-1],[c[0]-1,c[1]-1])} else {possibles.push([c[0]-1,c[1]-1],[c[0],c[1]-1],[c[0]+1,c[1]-1])}
               // possibles = wherePieces.filter(coord => (c[1]-coord[1]===1)&&(Math.abs(c[0]-coord[0])<2));
               ////console.log(possibles);
            };
         });
      },
      Knight: (c, d = void 0, multi = false, whatPiecesPosToChoose) => {
         return new Promise((resolve, reject) => {
            let wherePieces = [];
            for (const coord in whatPiecesPosToChoose) {
               if (whatPiecesPosToChoose[coord].role === "knight" && whatPiecesPosToChoose[coord].color === objGA.myCol) {
                  let coordDigits;
                  if (objGA.myCol === 'white') {
                     coordDigits = Number(objGA.ConvertToDigits[coord[0]] + coord[1]);
                  } else {
                     coordDigits = Number((9 - objGA.ConvertToDigits[coord[0]]) * 10 + (9 - coord[1]));
                  }
                  //wherePieces.push(coordDigits);
                  //objGA.myCol==='white' ? wherePieces.push([Math.round([coordDigits/10]),coordDigits % 10]) :
                  //wherePieces.push([10-Math.round([coordDigits/10]),9-coordDigits % 10])
                  wherePieces.push([Math.floor([coordDigits / 10]), coordDigits % 10]);
               }
            }
            //console.log(wherePieces);
            let possibles = wherePieces.filter(coord => ((Math.abs(coord[0] - c[0]) === 1 && Math.abs(coord[1] - c[1]) === 2) || (Math.abs(coord[1] - c[1]) === 1 && Math.abs(coord[0] - c[0]) === 2)) && (coord[0] !== c[0] || coord[1] !== c[1]));



            let pieceName = 'Knight', positionPieceName = 'knights', pieceNameToWorker = 'knight'
            if (possibles.length > 0) {
               resolve(true);
               let CurrentRightPiece, CurrentLeftPiece;
               let rPcoord, isRight, isLeft;


               if (possibles.length === 1) {
                  if (multi === false) {

                     if (rPcoord = objGA.ifTwoPieces(`right${pieceName} `), rPcoord !== void 0) {

                        CurrentRightPiece = rPcoord;
                        isRight = (possibles[0][0] === CurrentRightPiece[0] && possibles[0][1] === CurrentRightPiece[1]);
                        if (isRight) { objGA.PositionsOfDoublePieces[positionPieceName].r = c; }
                        else { objGA.PositionsOfDoublePieces[positionPieceName].l = c; }

                     } else {

                        objGA.PositionsOfDoublePieces[positionPieceName].l = c;

                     }

                  } else {
                     if (objGA.PositionsOfDoublePieces[positionPieceName].r !== void 0) {

                        CurrentRightPiece = objGA.PositionsOfDoublePieces[positionPieceName].r;
                        isRight = (possibles[0][0] === CurrentRightPiece[0] && possibles[0][1] === CurrentRightPiece[1]);
                        if (isRight) { objGA.PositionsOfDoublePieces[positionPieceName].r = c; }
                        else { objGA.PositionsOfDoublePieces[positionPieceName].l = c; }

                     } else if (objGA.PositionsOfDoublePieces[positionPieceName].l !== void 0) {

                        CurrentLeftPiece = objGA.PositionsOfDoublePieces[positionPieceName].l;
                        isLeft = (possibles[0][0] === CurrentLeftPiece[0] && possibles[0][1] === CurrentLeftPiece[1]);
                        if (isLeft) { objGA.PositionsOfDoublePieces[positionPieceName].l = c; }
                        else { objGA.PositionsOfDoublePieces[positionPieceName].r = c; }

                     } else if (rPcoord = objGA.ifTwoPieces(`right${pieceName} `), rPcoord !== void 0) {

                        CurrentRightPiece = rPcoord;
                        isRight = (possibles[0][0] === CurrentRightPiece[0] && possibles[0][1] === CurrentRightPiece[1]);
                        if (isRight) { objGA.PositionsOfDoublePieces[positionPieceName].r = c; }
                        else { objGA.PositionsOfDoublePieces[positionPieceName].l = c; }

                     } else {

                        objGA.PositionsOfDoublePieces[positionPieceName].l = c;
                     }
                  }
                  objGA.executeMove(c, possibles[0], false, multi, true, pieceNameToWorker);

               } else if (possibles.length > 1) {

                  if (multi === false) {
                     rPcoord = objGA.ifTwoPieces(`right${pieceName} `);
                     isRight = (possibles[0][0] === rPcoord[0] && possibles[0][1] === rPcoord[1]);
                     CurrentRightPiece = rPcoord;

                  } else {
                     if (objGA.PositionsOfDoublePieces[positionPieceName].r !== void 0) {

                        CurrentRightPiece = objGA.PositionsOfDoublePieces[positionPieceName].r;
                        isRight = (possibles[0][0] === CurrentRightPiece[0] && possibles[0][1] === CurrentRightPiece[1]);

                     } else if (objGA.PositionsOfDoublePieces[positionPieceName].l !== void 0) {

                        CurrentLeftPiece = objGA.PositionsOfDoublePieces[positionPieceName].l;
                        isLeft = (possibles[0][0] === CurrentLeftPiece[0] && possibles[0][1] === CurrentLeftPiece[1]);
                        if (isLeft === true) {
                           isRight = false
                           CurrentRightPiece = possibles[1]
                        } else {
                           isRight = true
                           CurrentRightPiece = possibles[0]
                        }

                     } else if (rPcoord = objGA.ifTwoPieces(`right${pieceName} `), rPcoord !== void 0) {

                        CurrentRightPiece = rPcoord;
                        isRight = (possibles[0][0] === CurrentRightPiece[0] && possibles[0][1] === CurrentRightPiece[1]);

                     }
                  }


                  if (d === 'r') {
                     objGA.executeMove(c, CurrentRightPiece, false, multi, true, pieceNameToWorker);
                     objGA.PositionsOfDoublePieces[positionPieceName].r = c;
                  }
                  else {
                     (isRight) ? objGA.executeMove(c, possibles[1], false, multi, true, pieceNameToWorker) : objGA.executeMove(c, possibles[0], false, multi, true, pieceNameToWorker);
                     objGA.PositionsOfDoublePieces[positionPieceName].l = c;
                  }

               }

            } else { resolve(false); }
         });
      },
      Bishop: (c, multi = false, whatPiecesPosToChoose) => {
         return new Promise((resolve, reject) => {
            let wherePieces = [];
            for (const coord in whatPiecesPosToChoose) {
               if (whatPiecesPosToChoose[coord].role === "bishop" && whatPiecesPosToChoose[coord].color === objGA.myCol) {
                  let coordDigits = Number(objGA.ConvertToDigits[coord[0]] + coord[1]);
                  //wherePieces.push(coordDigits);
                  objGA.myCol === 'white' ? wherePieces.push([Math.floor([coordDigits / 10]), coordDigits % 10]) :
                     wherePieces.push([9 - Math.floor([coordDigits / 10]), 9 - coordDigits % 10])
               }
            }
            //console.log(wherePieces);
            let possibles = wherePieces.filter(coord => (Math.abs(coord[0] - c[0]) === Math.abs(coord[1] - c[1])) && (coord[0] !== c[0] || coord[1] !== c[1]));
            //console.log(possibles);
            if (possibles.length !== 0) { resolve(true); objGA.executeMove(c, possibles[0], false, multi, true, "bishop"); } else { resolve(false); }
         });
      },
      Rook: (c, d = void 0, multi = false, whatPiecesPosToChoose) => {
         return new Promise((resolve, reject) => {
            let wherePieces = [];
            for (const coord in whatPiecesPosToChoose) {
               if (whatPiecesPosToChoose[coord].role === "rook" && whatPiecesPosToChoose[coord].color === objGA.myCol) {
                  let coordDigits;
                  if (objGA.myCol === 'white') {
                     coordDigits = Number(objGA.ConvertToDigits[coord[0]] + coord[1]);
                  } else {
                     coordDigits = Number((9 - objGA.ConvertToDigits[coord[0]]) * 10 + (9 - coord[1]));
                  }
                  //wherePieces.push(coordDigits);
                  //objGA.myCol==='white' ? wherePieces.push([Math.round([coordDigits/10]),coordDigits % 10]) :
                  // wherePieces.push([10-Math.round([coordDigits/10]),9-coordDigits % 10])
                  wherePieces.push([Math.floor([coordDigits / 10]), coordDigits % 10]);
               }
            }
            //console.log(wherePieces);
            let possibles = wherePieces.filter(coord => (coord[0] === c[0] || coord[1] === c[1]) && (coord[0] !== c[0] || coord[1] !== c[1]));
            //console.log(possibles);

            let pieceName = 'Rook', positionPieceName = 'rooks', pieceNameToWorker = 'rook'
            if (possibles.length > 0) {
               resolve(true);
               let CurrentRightPiece, CurrentLeftPiece;
               let rPcoord, isRight, isLeft;


               if (possibles.length === 1) {
                  if (multi === false) {

                     if (rPcoord = objGA.ifTwoPieces(`right${pieceName} `), rPcoord !== void 0) {

                        CurrentRightPiece = rPcoord;
                        isRight = (possibles[0][0] === CurrentRightPiece[0] && possibles[0][1] === CurrentRightPiece[1]);
                        if (isRight) { objGA.PositionsOfDoublePieces[positionPieceName].r = c; }
                        else { objGA.PositionsOfDoublePieces[positionPieceName].l = c; }

                     } else {

                        objGA.PositionsOfDoublePieces[positionPieceName].l = c;

                     }

                  } else {
                     if (objGA.PositionsOfDoublePieces[positionPieceName].r !== void 0) {

                        CurrentRightPiece = objGA.PositionsOfDoublePieces[positionPieceName].r;
                        isRight = (possibles[0][0] === CurrentRightPiece[0] && possibles[0][1] === CurrentRightPiece[1]);
                        if (isRight) { objGA.PositionsOfDoublePieces[positionPieceName].r = c; }
                        else { objGA.PositionsOfDoublePieces[positionPieceName].l = c; }

                     } else if (objGA.PositionsOfDoublePieces[positionPieceName].l !== void 0) {

                        CurrentLeftPiece = objGA.PositionsOfDoublePieces[positionPieceName].l;
                        isLeft = (possibles[0][0] === CurrentLeftPiece[0] && possibles[0][1] === CurrentLeftPiece[1]);
                        if (isLeft) { objGA.PositionsOfDoublePieces[positionPieceName].l = c; }
                        else { objGA.PositionsOfDoublePieces[positionPieceName].r = c; }

                     } else if (rPcoord = objGA.ifTwoPieces(`right${pieceName} `), rPcoord !== void 0) {

                        CurrentRightPiece = rPcoord;
                        isRight = (possibles[0][0] === CurrentRightPiece[0] && possibles[0][1] === CurrentRightPiece[1]);
                        if (isRight) { objGA.PositionsOfDoublePieces[positionPieceName].r = c; }
                        else { objGA.PositionsOfDoublePieces[positionPieceName].l = c; }

                     } else {

                        objGA.PositionsOfDoublePieces[positionPieceName].l = c;
                     }
                  }
                  objGA.executeMove(c, possibles[0], false, multi, true, pieceNameToWorker);

               } else if (possibles.length > 1) {

                  if (multi === false) {
                     rPcoord = objGA.ifTwoPieces(`right${pieceName} `);
                     isRight = (possibles[0][0] === rPcoord[0] && possibles[0][1] === rPcoord[1]);
                     CurrentRightPiece = rPcoord;

                  } else {
                     if (objGA.PositionsOfDoublePieces[positionPieceName].r !== void 0) {

                        CurrentRightPiece = objGA.PositionsOfDoublePieces[positionPieceName].r;
                        isRight = (possibles[0][0] === CurrentRightPiece[0] && possibles[0][1] === CurrentRightPiece[1]);

                     } else if (objGA.PositionsOfDoublePieces[positionPieceName].l !== void 0) {

                        CurrentLeftPiece = objGA.PositionsOfDoublePieces[positionPieceName].l;
                        isLeft = (possibles[0][0] === CurrentLeftPiece[0] && possibles[0][1] === CurrentLeftPiece[1]);
                        if (isLeft === true) {
                           isRight = false
                           CurrentRightPiece = possibles[1]
                        } else {
                           isRight = true
                           CurrentRightPiece = possibles[0]
                        }

                     } else if (rPcoord = objGA.ifTwoPieces(`right${pieceName} `), rPcoord !== void 0) {

                        CurrentRightPiece = rPcoord;
                        isRight = (possibles[0][0] === CurrentRightPiece[0] && possibles[0][1] === CurrentRightPiece[1]);

                     }
                  }


                  if (d === 'r') {
                     objGA.executeMove(c, CurrentRightPiece, false, multi, true, pieceNameToWorker);
                     objGA.PositionsOfDoublePieces[positionPieceName].r = c;
                  }
                  else {
                     (isRight) ? objGA.executeMove(c, possibles[1], false, multi, true, pieceNameToWorker) : objGA.executeMove(c, possibles[0], false, multi, true, pieceNameToWorker);
                     objGA.PositionsOfDoublePieces[positionPieceName].l = c;
                  }

               }

            } else { resolve(false); }
         });
      },
      Queen: (c, d = void 0, multi = false, whatPiecesPosToChoose) => {
         return new Promise((resolve, reject) => {
            let numberOfQueens;
            let wherePieces = [];
            for (const coord in whatPiecesPosToChoose) {
               if (whatPiecesPosToChoose[coord].role === "queen" && whatPiecesPosToChoose[coord].color === objGA.myCol) {
                  let coordDigits = Number(objGA.ConvertToDigits[coord[0]] + coord[1]);
                  //wherePieces.push(coordDigits);
                  objGA.myCol === 'white' ? wherePieces.push([Math.floor([coordDigits / 10]), coordDigits % 10]) :
                     wherePieces.push([9 - Math.floor([coordDigits / 10]), 9 - coordDigits % 10])
               }
            }
            numberOfQueens = wherePieces.length;
            let possibles = wherePieces.filter(coord => ((coord[0] === c[0] || coord[1] === c[1]) || (Math.abs(coord[0] - c[0]) === Math.abs(coord[1] - c[1])) && (Math.abs(coord[1] - c[1]) === Math.abs(coord[0] - c[0]))) && (coord[0] !== c[0] || coord[1] !== c[1]));
            //console.log(possibles);
            let pieceName = 'Queen', positionPieceName = 'queens', pieceNameToWorker = 'queen'
            if (possibles.length > 0) {
               resolve(true);
               if (numberOfQueens === 1) {
                  objGA.executeMove(c, possibles[0], false, multi, true, "queen");
                  objGA.PositionsOfDoublePieces[positionPieceName].l = c;
               } else {
                  let CurrentRightPiece, CurrentLeftPiece;
                  let rPcoord, isRight, isLeft;
                  if (possibles.length === 1) {
                     if (multi === false) {
                        if (rPcoord = objGA.ifTwoPieces(`right${pieceName} `, numberOfQueens), rPcoord !== void 0) {
                           CurrentRightPiece = rPcoord;
                           isRight = (possibles[0][0] === CurrentRightPiece[0] && possibles[0][1] === CurrentRightPiece[1]);
                           if (isRight) { objGA.PositionsOfDoublePieces[positionPieceName].r = c; }
                           else { objGA.PositionsOfDoublePieces[positionPieceName].l = c; }
                        }
                     } else {
                        if (objGA.PositionsOfDoublePieces[positionPieceName].r !== void 0) {

                           CurrentRightPiece = objGA.PositionsOfDoublePieces[positionPieceName].r;
                           isRight = (possibles[0][0] === CurrentRightPiece[0] && possibles[0][1] === CurrentRightPiece[1]);
                           if (isRight) { objGA.PositionsOfDoublePieces[positionPieceName].r = c; }
                           else { objGA.PositionsOfDoublePieces[positionPieceName].l = c; }

                        } else if (rPcoord = objGA.ifTwoPieces(`right${pieceName} `, numberOfQueens), rPcoord !== void 0) {

                           CurrentRightPiece = rPcoord;
                           isRight = (possibles[0][0] === CurrentRightPiece[0] && possibles[0][1] === CurrentRightPiece[1]);
                           if (isRight) { objGA.PositionsOfDoublePieces[positionPieceName].r = c; }
                           else { objGA.PositionsOfDoublePieces[positionPieceName].l = c; }

                        }
                     }
                     objGA.executeMove(c, possibles[0], false, multi, true, pieceNameToWorker);

                  } else /* if (possibles.length > 1) */ { // possibles.length > 1 is always true
                     let positionOfTheRightQueen;
                     if (multi === false) {

                        rPcoord = objGA.ifTwoPieces(`right${pieceName} `, numberOfQueens);
                        isRight = false;

                        for (let i = 0; i < possibles.length; i++) {
                           if (possibles[i][0] === rPcoord[0] && possibles[i][1] === rPcoord[1]) {
                              isRight = true;
                              positionOfTheRightQueen = i;
                              break;
                           }
                        }

                        CurrentRightPiece = rPcoord;

                     } else {
                        if (objGA.PositionsOfDoublePieces[positionPieceName].r !== void 0) {

                           CurrentRightPiece = objGA.PositionsOfDoublePieces[positionPieceName].r;
                           isRight = false;
                           for (let i = 0; i < possibles.length; i++) {
                              if (possibles[i][0] === CurrentRightPiece[0] && possibles[i][1] === CurrentRightPiece[1]) {
                                 isRight = true;
                                 positionOfTheRightQueen = i;
                                 break;
                              }
                           }


                        } /* else if (objGA.PositionsOfDoublePieces[positionPieceName].l !== void 0) {
 
               CurrentLeftPiece = objGA.PositionsOfDoublePieces[positionPieceName].l;
               isLeft = (possibles[0][0] === CurrentLeftPiece[0] && possibles[0][1] === CurrentLeftPiece[1]);
               if (isLeft === true) {
                 isRight = false
                 CurrentRightPiece = possibles[1]
               } else {
                 isRight = true
                 CurrentRightPiece = possibles[0]
               }
 
             } */ else if (rPcoord = objGA.ifTwoPieces(`right${pieceName} `, numberOfQueens), rPcoord !== void 0) {

                           CurrentRightPiece = rPcoord;
                           isRight = false;
                           for (let i = 0; i < possibles.length; i++) {
                              if (possibles[i][0] === CurrentRightPiece[0] && possibles[i][1] === CurrentRightPiece[1]) {
                                 isRight = true;
                                 positionOfTheRightQueen = i;
                                 break;
                              }
                           }

                        }
                     }
                     if (d === 'r') {
                        if (isRight === true) {
                           objGA.executeMove(c, CurrentRightPiece, false, multi, true, pieceNameToWorker);
                           objGA.PositionsOfDoublePieces[positionPieceName].r = c;
                        } else {
                           if (objGA.PositionsOfDoublePieces[positionPieceName].l !== void 0) {
                              isLeft = false;
                              for (let i = 0; i < possibles.length; i++) {
                                 if (possibles[i][0] === objGA.PositionsOfDoublePieces[positionPieceName].l[0] && possibles[i][1] === objGA.PositionsOfDoublePieces[positionPieceName].l[1]) {
                                    isLeft = true;
                                    positionOfTheLeftQueen = i;
                                    break;
                                 }
                              }
                              if (isLeft === true) {
                                 possibles.splice(positionOfTheLeftQueen, 1)
                              }
                           }
                           let randomQueen = Math.floor(Math.random() * possibles.length);
                           objGA.executeMove(c, possibles[randomQueen], false, multi, true, pieceNameToWorker);
                        }


                     }
                     else {
                        /* (isRight) ? objGA.executeMove(c, possibles[1], false, multi, true, pieceNameToWorker) : objGA.executeMove(c, possibles[0], false, multi, true, pieceNameToWorker);
                        objGA.PositionsOfDoublePieces[positionPieceName].l = c; */
                        if (isRight === true) {
                           possibles.splice(positionOfTheRightQueen, 1)
                        }
                        if (objGA.PositionsOfDoublePieces[positionPieceName].l !== void 0) {
                           isLeft = false;
                           for (let i = 0; i < possibles.length; i++) {
                              if (possibles[i][0] === objGA.PositionsOfDoublePieces[positionPieceName].l[0] && possibles[i][1] === objGA.PositionsOfDoublePieces[positionPieceName].l[1]) {
                                 isLeft = true;
                                 positionOfTheLeftQueen = i;
                                 break;
                              }
                           }

                           if (isLeft === true) {
                              objGA.executeMove(c, possibles[positionOfTheLeftQueen], false, multi, true, pieceNameToWorker);
                              objGA.PositionsOfDoublePieces[positionPieceName].l = c;
                           } else {
                              let randomQueen = Math.floor(Math.random() * possibles.length);
                              objGA.executeMove(c, possibles[randomQueen], false, multi, true, pieceNameToWorker);
                              //objGA.PositionsOfDoublePieces[positionPieceName].l = c;
                           }

                        } else {
                           let randomQueen = Math.floor(Math.random() * possibles.length);
                           objGA.executeMove(c, possibles[randomQueen], false, multi, true, pieceNameToWorker);
                           objGA.PositionsOfDoublePieces[positionPieceName].l = c;
                        }

                     }

                  }

               }




            } else { resolve(false); }
         });
      },
      King: (c, multi = false, whatPiecesPosToChoose) => {
         return new Promise((resolve, reject) => {
            let wherePieces = [];
            for (const coord in whatPiecesPosToChoose) {
               if (whatPiecesPosToChoose[coord].role === "king" && whatPiecesPosToChoose[coord].color === objGA.myCol) {
                  let coordDigits = Number(objGA.ConvertToDigits[coord[0]] + coord[1]);
                  //wherePieces.push(coordDigits);
                  objGA.myCol === 'white' ? wherePieces.push([Math.floor([coordDigits / 10]), coordDigits % 10]) :
                     wherePieces.push([9 - Math.floor([coordDigits / 10]), 9 - coordDigits % 10])
               }
            }
            //console.log(wherePieces);
            let possibles = wherePieces.filter(coord => (Math.abs(coord[0] - c[0]) === 1 && Math.abs(coord[1] - c[1]) === 1) || ((((coord[1] === 1 && c[1] === 1 && ((coord[0] === 5 && [1, 3, 7, 8].includes(c[0])) || (coord[0] === 4 && [1, 2, 6, 8].includes(c[0]))))) || (Math.abs(coord[0] - c[0]) < 2 && Math.abs(coord[1] - c[1]) < 2)) && (coord[0] !== c[0] || coord[1] !== c[1])));
            // ////console.log(possibles);
            if (possibles.length !== 0) { resolve(true); objGA.executeMove(c, possibles[0], false, multi, true, "king"); } else { resolve(false); }
         });
      },



      FixPremoves: async (x, y, multi = false) => {


         // ////console.log('oppmove');
         const coord = [x, y];
         let ExistingKeys;
         //let direction;
         let Fixedlength = objGA.keysT.length;
         //for (let i = Fixedlength - 1; i >= 0; i--) {
         for (let i = 0; i < Fixedlength; i++) {
            let breakLoop = false;
            // ExistingKeys = objGA.PieceNames[objGA.keysT[objGA.keysT.length-1]];
            ExistingKeys = objGA.PieceNames[objGA.keysT[0]];

            if (ExistingKeys) {
               let whatpiece = ExistingKeys.p || void 0;

               let whatPiecesPosToChoose = {};
               if (multi === true) { whatPiecesPosToChoose = objGA.piecesStatesAfterPremoves }
               else { whatPiecesPosToChoose = objGA.pieces; }

               //  //console.log(whatpiece);
               let direction;
               switch (whatpiece) {
                  case 'pawn':
                     direction = ExistingKeys.d || void 0;
                     breakLoop = await objGA.Pawn(coord, direction, multi, whatPiecesPosToChoose);
                     break;
                  case 'knight':
                     direction = ExistingKeys.d || void 0;
                     breakLoop = await objGA.Knight(coord, direction, multi, whatPiecesPosToChoose);
                     break;
                  case 'bishop':
                     breakLoop = await objGA.Bishop(coord, multi, whatPiecesPosToChoose);
                     break;
                  case 'rook':
                     direction = ExistingKeys.d || void 0;
                     breakLoop = await objGA.Rook(coord, direction, multi, whatPiecesPosToChoose);
                     break;
                  case 'queen':
                     direction = ExistingKeys.d || void 0;
                     breakLoop = await objGA.Queen(coord, direction, multi, whatPiecesPosToChoose);
                     break;
                  case 'king':
                     breakLoop = await objGA.King(coord, multi, whatPiecesPosToChoose);
                     break;
                  default:
                  // code block
               }

            }
            if (breakLoop === false) {
               //objGA.keysT.splice(objGA.keysT.length - 1, 1);
               objGA.keysT.splice(0, 1);

            } else {
               objGA.keysT = [];
               break;
            }
         }
      },

      AddRectanglesToSVG: (el, ultraTheme = false, queen = false) => {
         try {
            let image = window.getComputedStyle(el, false).backgroundImage.slice(4, -1).replace(/"/g, "")
            let svg = atob(image.replace(/data:image\/svg\+xml;base64,/, ''));
            //console.log(svg);
            let parser = new DOMParser();
            let doc = parser.parseFromString(svg, "image/svg+xml");
            let b;
            let svgEl = doc.getElementsByTagName('svg')[0]
            if (svgEl) {
               if (ultraTheme === false) {
                  b = document.createElementNS("http://www.w3.org/2000/svg", 'rect')
                  let widthOfSVG = Number(svgEl.getAttribute('width'))
                  let viewBox = svgEl.getAttribute('viewBox')
                  //doc.getElementsByTagName('svg')[0].getAttribute('width')
                  b.setAttribute('style', 'fill:#3eaf4e;');
                  b.setAttribute('stroke', 'rgb(0,0,0)');
                  if (viewBox) {
                     //viewBox = Number(viewBox)
                     arrBox = viewBox.split(' ')
                     for (let i = 0; i < arrBox.length; i++) {
                        arrBox[i] = Number(arrBox[i])
                     }
                     let w = Math.abs(arrBox[2] - arrBox[0])
                     let h = Math.abs(arrBox[3] - arrBox[1])
                     b.setAttribute('width', w / 45 * 12);
                     b.setAttribute('height', h / 45 * 12);
                     b.setAttribute('x', w / 45 * 30);
                     b.setAttribute('y', h / 45 * 30);
                     b.setAttribute('stroke-width', w / 45);
                     //b.setAttribute('viewBox', viewBox);
                  }
                  else {
                     b.setAttribute('width', widthOfSVG / 45 * 12);
                     b.setAttribute('height', widthOfSVG / 45 * 12);
                     b.setAttribute('x', widthOfSVG / 45 * 30);
                     b.setAttribute('y', widthOfSVG / 45 * 30);
                     b.setAttribute('stroke-width', widthOfSVG / 45);
                  }
               } else {
                  b = document.createElementNS("http://www.w3.org/2000/svg", 'circle')
                  b.setAttribute('cx', '35');
                  b.setAttribute('cy', '35');
                  b.setAttribute('r', '10');
                  b.setAttribute('style', 'fill:red;');
               }
               svgEl.appendChild(b);
               let a = new XMLSerializer().serializeToString(doc.getElementsByTagName('svg')[0])
               let encodedData = 'data:image/svg+xml;base64,' + window.btoa(a);
               if (queen === false) {
                  el.style.backgroundImage = `url('${encodedData}')`;
               } else {
                  //:not(.ghost.${objGA.myCol}.queen)
                  let cssQueen = `.is2d piece.${objGA.myCol}.queen:last-child:not(:first-child):not(.ghost) {background-image: url('${encodedData}') !important}`;
                  var styleElement = document.createElement("style");
                  styleElement.type = "text/css";
                  if (styleElement.styleSheet) {
                     styleElement.styleSheet.cssText = cssQueen;
                  } else {
                     styleElement.appendChild(document.createTextNode(cssQueen));
                  }
                  document.getElementsByTagName("head")[0].appendChild(styleElement);
               }
            }
         } catch (e) { console.log(e) }
      },
      KnightAndRooks: () => {
         let KnightClass = document.getElementsByClassName(objGA.myCol + " knight");
         let RookClass = document.getElementsByClassName(objGA.myCol + " rook");
         let n0, n1;
         (objGA.myCol === 'white' && (objGA.n0 = n0 = 0, objGA.n1 = n1 = 1)) || (objGA.n0 = n0 = 1, objGA.n1 = n1 = 0);
         if (KnightClass.length > 0) {
            objGA.leftKnight = KnightClass[n0]; objGA.rightKnight = KnightClass[n1];
            if (objGA.rightKnight) {
               if (useKeyboard === true) {
                  // objGA.rightKnight.style.backgroundImage = "url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNDUgNDUiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDQ1IDQ1OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PHN0eWxlIHR5cGU9InRleHQvY3NzIj4uc3Qwe2Rpc3BsYXk6bm9uZTt9LnN0MXtkaXNwbGF5OmlubGluZTtzdHJva2U6IzAwMDAwMDtzdHJva2Utd2lkdGg6MS41O3N0cm9rZS1saW5lY2FwOnJvdW5kO3N0cm9rZS1saW5lam9pbjpyb3VuZDt9LnN0MntkaXNwbGF5OmlubGluZTtmaWxsOiNFQ0VDRUM7c3Ryb2tlOiNFQ0VDRUM7c3Ryb2tlLXdpZHRoOjEuNTtzdHJva2UtbGluZWNhcDpyb3VuZDtzdHJva2UtbGluZWpvaW46cm91bmQ7fS5zdDN7ZGlzcGxheTppbmxpbmU7ZmlsbDojRUNFQ0VDO30uc3Q0e2Rpc3BsYXk6bm9uZTtzdHJva2U6I0ZGRkZGRjtzdHJva2Utd2lkdGg6MjtzdHJva2UtbWl0ZXJsaW1pdDoxMDt9LnN0NXtzdHJva2U6IzMxQTgwMDtzdHJva2Utd2lkdGg6My4yMDc1O3N0cm9rZS1taXRlcmxpbWl0OjEwO30uc3Q2e2ZpbGw6I0ZGRkZGRjtzdHJva2U6IzBEMjYwMDtzdHJva2Utd2lkdGg6MS4wNzA5O3N0cm9rZS1taXRlcmxpbWl0OjEwO30uc3Q3e2ZpbGw6I0ZGRkZGRjtzdHJva2U6IzNCQUEwMDtzdHJva2Utd2lkdGg6MS44NzU7c3Ryb2tlLW1pdGVybGltaXQ6MTA7fS5zdDh7ZmlsbDojRkYwMDAwO308L3N0eWxlPjxnIGNsYXNzPSJzdDAiPjxwYXRoIGNsYXNzPSJzdDEiIGQ9Ik0yMiwxMGMxMC41LDEsMTYuNSw4LDE2LDI5SDE1YzAtOSwxMC02LjUsOC0yMSIvPjxwYXRoIGNsYXNzPSJzdDEiIGQ9Ik0yNCwxOGMwLjQsMi45LTUuNSw3LjQtOCw5Yy0zLDItMi44LDQuMy01LDRjLTEtMC45LDEuNC0zLDAtM2MtMSwwLDAuMiwxLjItMSwyYy0xLDAtNCwxLTQtNGMwLTIsNi0xMiw2LTEyczEuOS0xLjksMi0zLjVjLTAuNy0xLTAuNS0yLTAuNS0zYzEtMSwzLDIuNSwzLDIuNWgyYzAsMCwwLjgtMiwyLjUtM2MxLDAsMSwzLDEsMyIvPjxwYXRoIGNsYXNzPSJzdDIiIGQ9Ik05LjUsMjUuNUM5LjUsMjUuOCw5LjMsMjYsOSwyNnMtMC41LTAuMi0wLjUtMC41UzguNywyNSw5LDI1UzkuNSwyNS4yLDkuNSwyNS41eiBNMTQuOSwxNS43Yy0wLjQsMC43LTAuOSwxLjItMS4yLDEuMWMtMC4yLTAuMS0wLjEtMC44LDAuMy0xLjVsMCwwYzAuNC0wLjcsMC45LTEuMiwxLjItMS4xQzE1LjUsMTQuMywxNS40LDE1LDE0LjksMTUuN0wxNC45LDE1Ljd6Ii8+PHBhdGggY2xhc3M9InN0MyIgZD0iTTI0LjUsMTAuNEwyNCwxMS44bDAuNSwwLjFjMy4xLDEsNS42LDIuNSw3LjksNi44czMuMywxMC4zLDIuOCwyMC4ydjAuNWgyLjN2LTAuNWMwLjUtMTAuMS0wLjktMTYuOC0zLjMtMjEuM1MyOC40LDExLDI1LDEwLjRDMjUuMSwxMC41LDI0LjYsMTAuNCwyNC41LDEwLjR6Ii8+PC9nPjxwb2x5Z29uIGNsYXNzPSJzdDQiIHBvaW50cz0iNy4yLDguOSAzOC41LDguOSAzOC41LDQwLjQgMjIuMSw0MC40IDIyLjEsMjQgNy4yLDI0ICIvPjxwb2x5Z29uIGNsYXNzPSJzdDUiIHBvaW50cz0iMjUuOSw0MS4yIDM4LjIsNDEuMiAzOC4yLDUuMiA0LjIsNS4yIDQuMiwyMSAxMC4zLDIxIDEwLjMsMTUuNiAyMy42LDE1LjYgMjMuNiw0MS4yICIvPjxwb2x5Z29uIGNsYXNzPSJzdDYiIHBvaW50cz0iMjUuOSw0MCAzOC4yLDQwIDM4LjIsNiA0LjIsNiA0LjIsMjAuOSAxMC4zLDIwLjkgMTAuMywxNS44IDIzLjYsMTUuOCAyMy42LDQwICIvPjxwb2x5Z29uIGNsYXNzPSJzdDciIHBvaW50cz0iNS40LDcuMyA1LjQsMTkuNSA5LjEsMTkuNSA5LjEsMTQuNyAyNC45LDE0LjcgMjQuOSwzOC44IDM3LjIsMzguOCAzNy4yLDguOSAzNy4yLDcuMyAiLz48Y2lyY2xlIGNsYXNzPSJzdDgiIGN4PSIzNiIgY3k9IjM0LjUiIHI9IjguNSIvPjwvc3ZnPg==')";
                  objGA.AddRectanglesToSVG(objGA.rightKnight, useUltrabulletTheme)
               }
            }
         }
         if (RookClass.length > 0) {
            objGA.leftRook = RookClass[n0]; objGA.rightRook = RookClass[n1];
            if (objGA.rightRook) {
               if (useKeyboard === true) {
                  // objGA.rightRook.style.backgroundImage = "url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNDUgNDUiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDQ1IDQ1OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PHN0eWxlIHR5cGU9InRleHQvY3NzIj4uc3Qwe2Rpc3BsYXk6bm9uZTt9LnN0MXtkaXNwbGF5OmlubGluZTtmaWxsOiNGRkZGRkY7c3Ryb2tlOiMwMDAwMDA7c3Ryb2tlLXdpZHRoOjEuNTtzdHJva2UtbGluZWpvaW46cm91bmQ7fS5zdDJ7ZGlzcGxheTppbmxpbmU7ZmlsbDojRkZGRkZGO3N0cm9rZTojMDAwMDAwO3N0cm9rZS13aWR0aDoxLjU7c3Ryb2tlLWxpbmVjYXA6cm91bmQ7c3Ryb2tlLWxpbmVqb2luOnJvdW5kO30uc3Qze2Rpc3BsYXk6aW5saW5lO2ZpbGw6I0ZGRkZGRjtzdHJva2U6IzAwMDAwMDtzdHJva2Utd2lkdGg6MS41O30uc3Q0e2Rpc3BsYXk6aW5saW5lO2ZpbGw6bm9uZTtzdHJva2U6IzAwMDAwMDtzdHJva2Utd2lkdGg6MS41O3N0cm9rZS1saW5lY2FwOnJvdW5kO30uc3Q1e2Rpc3BsYXk6bm9uZTtmaWxsOiNGRkZGRkY7c3Ryb2tlOiNGQzAwMDA7c3Ryb2tlLXdpZHRoOjI7c3Ryb2tlLW1pdGVybGltaXQ6MTA7fS5zdDZ7ZmlsbDojRkZGRkZGO3N0cm9rZTojOUUwRUMxO3N0cm9rZS13aWR0aDo1O30uc3Q3e2ZpbGw6I0ZGMDAwMDt9PC9zdHlsZT48ZyBjbGFzcz0ic3QwIj48cGF0aCBjbGFzcz0ic3QxIiBkPSJNOSwzOWgyN3YtM0g5VjM5eiBNMTIsMzZ2LTRoMjF2NEgxMnogTTExLDE0VjloNHYyaDVWOWg1djJoNVY5aDR2NSIvPjxwYXRoIGNsYXNzPSJzdDIiIGQ9Ik0zNCwxNGwtMywzSDE0bC0zLTMiLz48cGF0aCBjbGFzcz0ic3QzIiBkPSJNMzEsMTd2MTIuNUgxNFYxNyIvPjxwYXRoIGNsYXNzPSJzdDIiIGQ9Ik0zMSwyOS41bDEuNSwyLjVoLTIwbDEuNS0yLjUiLz48cGF0aCBjbGFzcz0ic3Q0IiBkPSJNMTEsMTRoMjMiLz48L2c+PHBvbHlnb24gY2xhc3M9InN0NSIgcG9pbnRzPSIyMi41LDQuMyA1LjMsMzkuNSAzOS44LDM5LjUgIi8+PHJlY3QgeD0iOSIgeT0iNS41IiBjbGFzcz0ic3Q2IiB3aWR0aD0iMjciIGhlaWdodD0iMzUiLz48Y2lyY2xlIGNsYXNzPSJzdDciIGN4PSIzNiIgY3k9IjM0LjUiIHI9IjguNSIvPjwvc3ZnPg==')"
                  objGA.AddRectanglesToSVG(objGA.rightRook, useUltrabulletTheme)
               }
            }
         }
         objGA.ppawn = document.getElementsByClassName(objGA.myCol + ' pawn');
         objGA.pking = document.getElementsByClassName(objGA.myCol + ' king')[0];
         objGA.pqueen = document.getElementsByClassName(objGA.myCol + ' queen')[0];
         objGA.pbishop = document.getElementsByClassName(objGA.myCol + ' bishop');
         if (objGA.pqueen !== undefined) {
            objGA.AddRectanglesToSVG(objGA.pqueen, useUltrabulletTheme, true)
         }
      },


      PositionsOfDoublePieces: {
         rooks: { l: void 0, r: void 0 },
         knights: { l: void 0, r: void 0 },
         queens: { l: void 0, r: void 0 }
      },

      ifTwoPieces: (name, numberOfQueens = void 0) => {
         try {
            let transform;
            if (name === 'rightQueen') {
               let cgBoard = document.getElementsByTagName('cg-board')[0]
               let queenCollection = cgBoard.getElementsByClassName(`${objGA.myCol} queen`);
               if (numberOfQueens === '?') { numberOfQueens = queenCollection.length }
               let queenPiece = queenCollection[numberOfQueens - 1];
               if (queenPiece) { transform = queenPiece.style.transform; } else {
                  return void 0
               }
            } else {
               transform = objGA[name].style.transform;
            }
            let extraction = transform.split(',');
            extraction[0] = extraction[0].replace(/\D/g, '');
            extraction[1] = extraction[1].replace(/\D/g, '');
            return [extraction[0] / objGA.squareS + 1, 8 - extraction[1] / objGA.squareS];
         } catch (e) { return void 0 }
      },


      PlayAMove: (x, y) => {
         const coord = [x, y];
         let ExistingKeys;
         let Fixedlength = objGA.keysT.length;
         //for (let i = Fixedlength - 1; i >= 0; i--) {
         for (let i = 0; i < Fixedlength; i++) {
            let breakLoop = false;
            // ExistingKeys = objGA.PieceNames[objGA.keysT[objGA.keysT.length-1]];
            ExistingKeys = objGA.PieceNames[objGA.keysT[0]];
            if (ExistingKeys) {
               let whatpiece = ExistingKeys.p || void 0;
               let letter;
               objGA.myCol === 'white' ? letter = objGA.ConvertToLetters[x] + String(y) : letter = objGA.ConvertToLetters[9 - x] + String(9 - y);
               if (objGA.DestPiece === undefined) { debugger; }
               let destCurrent = objGA.DestPiece[letter];
               let FromWhere;
               if (destCurrent) {

                  FromWhere = destCurrent[whatpiece] || void 0;
                  if (FromWhere) {
                     breakLoop = true;
                     let toNumber = [];

                     if (objGA.myCol === 'white') {
                        for (let i = 0; i < FromWhere.length; i++) {
                           toNumber.push([objGA.ConvertToDigits[FromWhere[i][0]], Number(FromWhere[i][1])]);
                        }
                     } else {
                        for (let i = 0; i < FromWhere.length; i++) {
                           toNumber.push([9 - objGA.ConvertToDigits[FromWhere[i][0]], 9 - Number(FromWhere[i][1])]);
                        }
                     }
                     let sames = toNumber.length;
                     //  //console.log(whatpiece, destCurrent, FromWhere, toNumber);
                     if (sames === 1) { objGA.executeMove(coord, toNumber[0]) }
                     else if (sames > 1) {
                        let direction = ExistingKeys.d || void 0;
                        switch (whatpiece) {
                           case 'pawn':
                              if (direction === 'l') {
                                 objGA.executeMove(coord, [coord[0] + 1, coord[1] - 1])
                              } else if (direction === 'u') {
                                 objGA.executeMove(coord, [coord[0], coord[1] - 1])
                              } else {
                                 objGA.executeMove(coord, [coord[0] - 1, coord[1] - 1])
                              }
                              break;
                           case 'knight':
                              let rKcoord = objGA.ifTwoPieces('rightKnight');
                              if (direction === 'r') {
                                 objGA.executeMove(coord, rKcoord);
                              }
                              else {
                                 (toNumber[0][0] === rKcoord[0] && toNumber[0][1] === rKcoord[1]) ? objGA.executeMove(coord, toNumber[1]) : objGA.executeMove(coord, toNumber[0]);
                              }
                              break;
                           case 'rook':
                              let rRcoord = objGA.ifTwoPieces('rightRook');
                              if (direction === 'r') {
                                 objGA.executeMove(coord, rRcoord);
                              }
                              else {
                                 (toNumber[0][0] === rRcoord[0] && toNumber[0][1] === rRcoord[1]) ? objGA.executeMove(coord, toNumber[1]) : objGA.executeMove(coord, toNumber[0]);
                              }
                              break;
                           case 'queen':
                              let rQcoord = objGA.ifTwoPieces('rightQueen', '?');
                              let isRight = false;
                              let RightQueenArrPos;
                              for (let i = 0; i < toNumber.length; i++) {
                                 if (toNumber[i][0] === rQcoord[0] && toNumber[i][1] === rQcoord[1]) {
                                    isRight = true;
                                    RightQueenArrPos = i;
                                    break;
                                 }
                              }
                              //objGA.executeMove(coord, toNumber, true)
                              if (direction === 'r') {
                                 if (isRight) {
                                    objGA.executeMove(coord, rQcoord);
                                 } else {
                                    let randomQueen = Math.floor(Math.random() * toNumber.length);
                                    objGA.executeMove(coord, toNumber[randomQueen], false);
                                 }
                              }
                              else {
                                 if (isRight) {
                                    toNumber.splice(RightQueenArrPos, 1)
                                 }
                                 let randomQueen = Math.floor(Math.random() * toNumber.length);
                                 objGA.executeMove(coord, toNumber[randomQueen], false);

                                 //(toNumber[0][0] === rQcoord[0] && toNumber[0][1] === rQcoord[1]) ? objGA.executeMove(coord, toNumber[1]) : objGA.executeMove(coord, toNumber[0]);
                              }
                              break;
                           default:
                           // code block
                        }

                     }



                  }
               }




            }
            if (breakLoop === false) {
               //objGA.keysT.splice(objGA.keysT.length - 1, 1);
               objGA.keysT.splice(0, 1);
            } else {
               objGA.keysT = [];
               break;
            }
         }

      },

      executeMove: (to, from, queens = false, multi = false, premove = false, piece, mousePremove = false) => {
         if (objGA.runDebugger === true) { debugger; }
         let theCoord;
         theCoord = from.concat(to);
         for (let i = 0; i < theCoord.length; i++) {
            if (i % 2 === 0) { theCoord[i] = theCoord[i] * objGA.sqsize - objGA.sqsize / 2; }
            else { theCoord[i] = (9 - theCoord[i]) * objGA.sqsize - objGA.sqsize / 2; }
         }
         if (multi === false) {
            if (mousePremove === false) {
               objGA.DoubleData([theCoord[0], theCoord[1]], [theCoord[2], theCoord[3]]);
            } else {
               objGA.storeLastMoveX = to[0];
               objGA.storeLastMoveY = 9 - to[1];
            }
            if (premove === true) {
               objGA.multiPremState = true;
               objGA.piecesStatesAfterPremoves =
                  objGA.correctAfterPrem(objGA.pieces, [from[0], 9 - from[1], to[0], 9 - to[1]]);
               objGA.lastPremove = [[from[0], 9 - from[1]], [to[0], 9 - to[1]]];
               if (objGA.arrayOfPremoves.length !== 0) {
                  objGA.arrayOfPremoves = [];
                  window.postMessage({
                     type: 'deleteAll'
                  }, "*");

                  if (useMouse === true && objGA.isAPieceSelected === true) {
                     objGA.UnselectMultiSquare()
                  }
               }
            }


         } else {
            objGA.arrayOfPremoves.push([[from[0], 9 - from[1]], [to[0], 9 - to[1]]])
            window.postMessage({
               type: 'move',
               coordObj: {
                  dX: from[0],
                  dY: 9 - from[1],
                  uX: to[0],
                  uY: 9 - to[1],
                  piece: piece
               }
            }, "*");
            objGA.multiPremState = true;
            objGA.piecesStatesAfterPremoves =
               objGA.correctAfterPrem(objGA.piecesStatesAfterPremoves, [from[0], 9 - from[1], to[0], 9 - to[1]]);

         }
         // }


         //if (theCoord === undefined) { debugger; }
         if (premove === true) {
            if (multi === false) {
               /* objGA.multiPremState = true;
               objGA.piecesStatesAfterPremoves =
                  // objGA.correctAfterPrem(objGA.pieces, [theCoord[0], theCoord[1], theCoord[2], theCoord[3]]);
                  objGA.correctAfterPrem(objGA.pieces, [from[0], 9 - from[1], to[0], 9 - to[1]]);
               if (objGA.lastPremove === void 0) {
                  //objGA.lastPremove = [[theCoord[0], theCoord[1]], [theCoord[2], theCoord[3]]];
                  objGA.lastPremove = [[from[0], 9 - from[1]], [to[0], 9 - to[1]]];
                  console.log('multi=false, premove', objGA.lastPremove);
               }

               if (objGA.arrayOfPremoves.length !== 0) {
                  objGA.arrayOfPremoves = [];
                  window.postMessage({
                     type: 'deleteAll'
                  }, "*");
               } */


            } else {
               /*      objGA.multiPremState = true;
                    objGA.piecesStatesAfterPremoves =
                       objGA.correctAfterPrem(objGA.piecesStatesAfterPremoves, [from[0], 9 - from[1], to[0], 9 - to[1]]);
      */
            }
         }

      },


      correctAfterPrem: (pieces, coordinates) => {
         let arrayOfNumberCoordinatesTo = [];
         for (let i = 0; i < 4; i++) {


            if (i % 2 === 0) {
               //coordinates[i] = coordinates[i];
               if (i === 2) { arrayOfNumberCoordinatesTo.push(coordinates[i]) }
               if (objGA.myCol !== 'white') { coordinates[i] = 9 - coordinates[i] }
               coordinates[i] = objGA.ConvertToLetters[coordinates[i]]
            }
            else {
               coordinates[i] = 9 - coordinates[i]
               if (i === 3) { arrayOfNumberCoordinatesTo.push(coordinates[i]) }
               if (objGA.myCol !== 'white') { coordinates[i] = 9 - coordinates[i] }
            }

         }
         let letterCoords = [coordinates[0] + String(coordinates[1]),
         coordinates[2] + String(coordinates[3])]
         /* let piecesToChange = Object.assign({}, pieces); */
         let piecesToChange = JSON.parse(JSON.stringify(pieces));
         //console2(piecesToChange)
         if (piecesToChange[letterCoords[0]].role === "pawn" && (letterCoords[1][1] === '8' || letterCoords[1][1] === '1')) {
            piecesToChange[letterCoords[1]] = { role: "queen", color: objGA.myCol }
            objGA.PositionsOfDoublePieces.queens.r = arrayOfNumberCoordinatesTo;
         } else if (piecesToChange[letterCoords[0]].role === "king") {
            if (letterCoords[0] === 'e1') {
               if (['a1', 'c1'].includes(letterCoords[1])) {
                  piecesToChange['d1'] = { role: "rook", color: objGA.myCol }
                  objGA.PositionsOfDoublePieces.rooks.l = [4, 1];
               } else if (['g1', 'h1'].includes(letterCoords[1])) {
                  piecesToChange['f1'] = { role: "rook", color: objGA.myCol }
                  objGA.PositionsOfDoublePieces.rooks.r = [6, 1];
               }
            } else if (letterCoords[0] === 'e8') {
               if (['a8', 'c8'].includes(letterCoords[1])) {
                  piecesToChange['d8'] = { role: "rook", color: objGA.myCol }
                  objGA.PositionsOfDoublePieces.rooks.r = [5, 1];
               } else if (['g8', 'h8'].includes(letterCoords[1])) {
                  piecesToChange['f8'] = { role: "rook", color: objGA.myCol }
                  objGA.PositionsOfDoublePieces.rooks.l = [3, 1];
               }
            }
            //['a1', 'a3', 'g1', 'h1'].includes(letterCoords[1])) || (letterCoords[0] === 'e8' && ['a1', 'a3', 'g1', 'h1'].includes(letterCoords[1])))) {
            piecesToChange[letterCoords[1]] = { role: piecesToChange[letterCoords[0]].role, color: objGA.myCol }
         } else {
            piecesToChange[letterCoords[1]] = { role: piecesToChange[letterCoords[0]].role, color: objGA.myCol }
         }

         delete piecesToChange[letterCoords[0]];
         return piecesToChange;



      },


      lastPremove: void 0,

      CheckMultiPremoveAndExecute: () => {
         //objGA.DoubleData(objGA.arrayOfPremoves[0][0], objGA.arrayOfPremoves[0][1]);

         window.postMessage({
            type: 'delete'
         }, "*");
         /* let xFrom = Math.ceil(objGA.arrayOfPremoves[0][0][0] / objGA.sqsize);
         let yFrom = 9 - Math.ceil(objGA.arrayOfPremoves[0][0][1] / objGA.sqsize); */
         let xFrom = objGA.arrayOfPremoves[0][0][0];
         let yFrom = 9 - objGA.arrayOfPremoves[0][0][1];
         if (objGA.myCol === "black") {
            xFrom = 9 - xFrom;
            yFrom = 9 - yFrom;
         }
         if (objGA.pieces === undefined) { debugger }
         let pieceDescription = objGA.pieces[objGA.ConvertToLetters[xFrom] + String(yFrom)];

         if (pieceDescription && pieceDescription.color === objGA.myCol) {

            //console.log('check multi and play', objGA.arrayOfPremoves[0])

            let theCoord = objGA.arrayOfPremoves[0][0].concat(objGA.arrayOfPremoves[0][1]);
            for (let i = 0; i < theCoord.length; i++) {
               if (i % 2 === 0) { theCoord[i] = theCoord[i] * objGA.sqsize - objGA.sqsize / 2; }
               else { theCoord[i] = (theCoord[i]) * objGA.sqsize - objGA.sqsize / 2; }
            }
            // objGA.DoubleData(objGA.arrayOfPremoves[0][0], objGA.arrayOfPremoves[0][1]);

            objGA.DoubleData([theCoord[0], theCoord[1]], [theCoord[2], theCoord[3]]);

            objGA.lastPremove = objGA.arrayOfPremoves[0]
            objGA.arrayOfPremoves.splice(0, 1)

         } else {
            objGA.arrayOfPremoves = [];
            window.postMessage({
               type: 'deleteAll'
            }, "*");

            for (let key in objGA.PositionsOfDoublePieces) {
               objGA.PositionsOfDoublePieces[key].l = void 0;
               objGA.PositionsOfDoublePieces[key].r = void 0;
            }
            objGA.lastPremove = void 0;
            objGA.multiPremState = false;
            objGA.mainPremoveHasBeenMade = false;
            objGA.piecesStatesAfterPremoves = {};

            /* if (useMouse === true && objGA.isAPieceSelected === true) {
               objGA.UnselectMultiSquare()
            } */

            /* if (useMouse === true && objGA.isAPieceSelected === true) {
               objGA.resumeTheMoveAfterMultiState()
            } */


         }



      },



      DoinMoves() {

         objGA.stillexecute = true;
         // setTimeout(() => {

         if (objGA.player !== objGA.myCol) {
            if (objGA.arrayOfPremoves.length !== 0) {
               objGA.CheckMultiPremoveAndExecute();
            }
            else if (objGA.cursorOverBoard === true && objGA.stillexecute &&
               (objGA.horiz !== objGA.storeLastMoveX ||
                  objGA.vertic !== objGA.storeLastMoveY)) {
               objGA.keysT = objGA.keys.slice(0);
               if (useKeyboard === true) {
                  objGA.makemoves(123);
               }
            }
         } else {

            objGA.PieceMoves = {};
            objGA.MovePiece = {};
            objGA.DestPiece = {};

            let inMovesConvertedFromMap = objGA.inMoves;
            Object.entries(inMovesConvertedFromMap)
               .length !== 0 ? (
                  objGA.pieces ?
                     (
                        () => {
                           objGA.FixDests();
                        })()
                     :
                     (() => {
                        objGA.beginning = true;
                     })()
               ) :  //objGA.FixPremoves(); 
               null


            // setTimeout(() => {

            if (objGA.arrayOfPremoves.length !== 0) {
               if (objGA.lastPremove) {

                  //setTimeout(() => {


                  let lastPremoveWithALetterFrom;
                  let lastPremoveWithALetterTo;

                  let objectWithLegalMoves = objGA.inMoves;
                  if (objGA.myCol === "white") {
                     lastPremoveWithALetterFrom =
                        objGA.ConvertToLetters[objGA.lastPremove[0][0]] +
                        String(9 - objGA.lastPremove[0][1]);

                     lastPremoveWithALetterTo =
                        objGA.ConvertToLetters[objGA.lastPremove[1][0]] +
                        String(9 - objGA.lastPremove[1][1]);


                  } else {
                     lastPremoveWithALetterFrom =
                        objGA.ConvertToLetters[9 - objGA.lastPremove[0][0]] +
                        String(objGA.lastPremove[0][1]);
                     lastPremoveWithALetterTo =
                        objGA.ConvertToLetters[9 - objGA.lastPremove[1][0]] +
                        String(objGA.lastPremove[1][1]);
                  }

                  //console.log(objectWithLegalMoves, lastPremoveWithALetterFrom, objGA.lastPremove, objGA.inMoves, objGA.pieces)
                  if (objectWithLegalMoves[lastPremoveWithALetterFrom] === undefined || !objectWithLegalMoves[lastPremoveWithALetterFrom].includes(lastPremoveWithALetterTo)) {
                     objGA.arrayOfPremoves = [];
                     window.postMessage({
                        type: 'deleteAll'
                     }, "*");
                     for (let key in objGA.PositionsOfDoublePieces) {
                        objGA.PositionsOfDoublePieces[key].l = void 0;
                        objGA.PositionsOfDoublePieces[key].r = void 0;
                     }


                     objGA.lastPremove = void 0;
                     objGA.multiPremState = false;
                     objGA.mainPremoveHasBeenMade = false;
                     objGA.piecesStatesAfterPremoves = {};

                     /* if (useMouse === true && objGA.isAPieceSelected === true) {
                        objGA.UnselectMultiSquare()
                     } */

                     if (useMouse === true && objGA.isAPieceSelected === true/*  && objGA.player !== objGA.myCol */) {
                        objGA.resumeTheMoveAfterMultiState()
                     }

                  }
                  //}, 0);


               }
            } else {

               //console.log('multiarray === 0; lastPremove ===', objGA.lastPremove)

               //here it's probably possible to fix
               if (useMouse === true && objGA.isAPieceSelected === true) {
                  if (objGA.lastPremove) {
                     /* let lastPremoveWithALetterFrom;
                     let lastPremoveWithALetterTo; */
                     let objectWithLegalMoves = objGA.inMoves;
                     let uciMove = objGA.convertCoordMoveToLetters(objGA.lastPremove);
                     let lastPremoveWithALetterFrom = uciMove[0];
                     let lastPremoveWithALetterTo = uciMove[1];
                     if (objectWithLegalMoves[lastPremoveWithALetterFrom] === undefined || !objectWithLegalMoves[lastPremoveWithALetterFrom].includes(lastPremoveWithALetterTo)) {
                        objGA.resumeTheMoveAfterMultiState()
                     }
                  }
               }
               //

               for (let key in objGA.PositionsOfDoublePieces) {
                  objGA.PositionsOfDoublePieces[key].l = void 0;
                  objGA.PositionsOfDoublePieces[key].r = void 0;
               }

               objGA.lastPremove = void 0;
               objGA.multiPremState = false;
               objGA.mainPremoveHasBeenMade = false;
               objGA.piecesStatesAfterPremoves = {};

               if (objGA.cursorOverBoard === true && objGA.stillexecute &&
                  (objGA.horiz !== objGA.storeLastMoveX ||
                     objGA.vertic !== objGA.storeLastMoveY)) {
                  objGA.keysT = objGA.keys.slice(0);
                  if (useKeyboard === true) {
                     objGA.makemoves(123);
                  }
               }
            }
         }


         if (useMouse === true && objGA.multiPremState === false && objGA.isAPieceSelected === true && objGA.player !== objGA.myCol) {
            objGA.resumeTheMoveAfterMultiState()
            //console.log(objGA.lastPremove)
         }

         /* objGA.PieceMoves = {};
         objGA.MovePiece = {};
         objGA.DestPiece = {};
         
         let inMovesConvertedFromMap = objGA.inMoves;
         Object.entries(inMovesConvertedFromMap)
            .length !== 0 ? (
               objGA.pieces ?
                  (
                     () => {
                        objGA.FixDests();
                     })()
                  :
                  (() => {
                     objGA.beginning = true;
                  })()
            ) :  //objGA.FixPremoves(); 
            null */
      },

      convertCoordMoveToLetters: (coordMove) => {
         let lastPremoveWithALetterFrom;
         let lastPremoveWithALetterTo;
         if (objGA.myCol === "white") {
            lastPremoveWithALetterFrom =
               objGA.ConvertToLetters[coordMove[0][0]] +
               String(9 - coordMove[0][1]);

            lastPremoveWithALetterTo =
               objGA.ConvertToLetters[coordMove[1][0]] +
               String(9 - coordMove[1][1]);

         } else {
            lastPremoveWithALetterFrom =
               objGA.ConvertToLetters[9 - coordMove[0][0]] +
               String(coordMove[0][1]);
            lastPremoveWithALetterTo =
               objGA.ConvertToLetters[9 - coordMove[1][0]] +
               String(coordMove[1][1]);
         }
         return [lastPremoveWithALetterFrom, lastPremoveWithALetterTo]
      },

      resumeTheMoveAfterMultiState: () => {
         //here a question appears, whether a programmatic selection of a piece (dragging or clicking of which started in the multipremove state and continued when it's not the multipremove state anymore) 
         //should take into account the number of clicks on the piece. I.e. the second click unselects the piece. So this behaviour should probably be consistent here, otherwise it 
         //will break the click detection.
         //setTimeout(function () {



         let wasTheClickOnAPiece = objGA.checkIfTheClickWasOnAPiece(objGA.mouseDownX, objGA.mouseDownY, false);
         console.log('check', objGA.mouseDownX, objGA.mouseDownY, objGA.dragStartAnimate, wasTheClickOnAPiece[0], wasTheClickOnAPiece[1])
         if (wasTheClickOnAPiece[0] !== undefined && objGA.dragStartAnimate !== undefined && objGA.dragStartAnimate.piece === wasTheClickOnAPiece[0]) {
            let x = objGA.mouseDownX * objGA.sqsize - objGA.sqsize / 2,
               y = objGA.mouseDownY * objGA.sqsize - objGA.sqsize / 2;

            if (objGA.dragStartAnimate.do === true) {
               console.log('success resume', wasTheClickOnAPiece[0], objGA.mouseDownX, objGA.mouseDownY)
               if (objGA.storePossibleClickMove.length !== 0 && (objGA.storePossibleClickMove[0] === objGA.mouseDownX && objGA.storePossibleClickMove[1] === objGA.mouseDownY)) {
                  objGA.ApplyData(x, y, 'resume')
                  objGA.DataTransition(x, y, false, 'resume')
                  objGA.ApplyData(x, y, 'resume')
               } else {
                  objGA.ApplyData(x, y, 'resume')
               }
               //resumePieceMove (should accept this programmatic event inside the MouseDown function), might be unnecessary.
               //
               if (animateMultipremoves === true) {
                  window.postMessage({
                     type: 'drag', phase: 'stop'
                  }, "*");
                  window.postMessage({
                     type: 'selected', selected: false
                  }, "*");
               }
               //setTimeout(function () {
               objGA.MouseMoveEvent(objGA.boardx, objGA.boardy)
               //}, 0);
            } else {
               objGA.ApplyData(x, y, 'resume')
               objGA.DataTransition(x, y, false, 'resume')
               if (animateMultipremoves === true) {
                  window.postMessage({
                     type: 'selected', selected: false
                  }, "*");
               }
            }
         } else {
            objGA.dragStartAnimate.do = false;
            console.log('2067', false)
            objGA.isAPieceSelected === false
            objGA.storePossibleClickMove.length = 0
            if (animateMultipremoves === true) {
               window.postMessage({
                  type: 'drag', phase: 'stop'
               }, "*");
               window.postMessage({
                  type: 'selected', selected: false
               }, "*");
            }
         }


         //}, 10);

      },

      MouseMoves(e) {
         objGA.cx = e.clientX;
         objGA.cy = e.clientY;
         objGA.boardx = objGA.cx - objGA.x0;
         objGA.boardy = objGA.cy - objGA.y0;
         objGA.horiz = Math.ceil(objGA.boardx / objGA.sqsize);
         objGA.vertic = 9 - Math.ceil(objGA.boardy / objGA.sqsize);


         if (objGA.horiz !== objGA.horiz2 || objGA.vertic !== objGA.vertic2) {
            objGA.keysT = objGA.keys.slice(0);
            objGA.horiz0 = objGA.horiz;
            objGA.vertic0 = objGA.vertic;
            if (useKeyboard === true) {
               objGA.makemoves();
            }
         }
         objGA.horiz2 = objGA.horiz;
         objGA.vertic2 = objGA.vertic;

      },

      resetPieces: true,
      setHighlights: (k, t) => {

         if (objGA.resetPieces === true) {
            objGA.KnightAndRooks();
            objGA.resetPieces = false;
         }

         /*objGA.ppawn=document.getElementsByClassName(objGA.myCol+' pawn');
         objGA.pking=document.getElementsByClassName(objGA.myCol+' king')[0];
         objGA.pqueen=document.getElementsByClassName(objGA.myCol+' queen')[0];
         objGA.pbishop=document.getElementsByClassName(objGA.myCol+' bishop');
         objGA.leftKnight=document.getElementsByClassName(objGA.myCol+' knight')[objGA.n0];
         objGA.rightKnight=document.getElementsByClassName(objGA.myCol+' knight')[objGA.n1];
         objGA.leftRook=document.getElementsByClassName(objGA.myCol+' rook')[objGA.n0];
         objGA.rightRook=document.getElementsByClassName(objGA.myCol+' rook')[objGA.n1];*/
         let color; let length;
         if (t === true) { color = '#927900'; } else { color = ''; }
         switch (k) {
            case (objGA.PieceKeys[0]):  //pawns
            case (objGA.PieceKeys[1]):
            case (objGA.PieceKeys[2]):
               length = objGA.ppawn.length;
               if (length > 0) {
                  for (let i = 0; i < length; i++) {
                     objGA.ppawn[i].style.backgroundColor = color;
                  }
               }
               break;
            case (objGA.PieceKeys[3]):  //king
               if (objGA.pking) { objGA.pking.style.backgroundColor = color; }
               break;
            case (objGA.PieceKeys[4]):  //bishop
               length = objGA.pbishop.length;
               if (length > 0) {
                  for (let y = 0; y < length; y++) {
                     objGA.pbishop[y].style.backgroundColor = color;
                  }
               }
               break;
            case (objGA.PieceKeys[5]):  //left rook
               if (objGA.leftRook) { objGA.leftRook.style.backgroundColor = color; }
               break;
            case (objGA.PieceKeys[6]):  //right rook
               if (objGA.rightRook) { objGA.rightRook.style.backgroundColor = color; }
               break;
            case (objGA.PieceKeys[7]):  //left knight
               if (objGA.leftKnight) { objGA.leftKnight.style.backgroundColor = color; }
               break;
            case (objGA.PieceKeys[8]):  //right knight
               if (objGA.rightKnight) { objGA.rightKnight.style.backgroundColor = color; }
               break;
            case (objGA.PieceKeys[9]):  //queen
               if (objGA.pqueen) { objGA.pqueen.style.backgroundColor = color; }
               break;

         }
      },
      cursorOverBoard: true,
      mouseOver: () => { objGA.cursorOverBoard = true;/*  console.log('-->') */ },
      mouseOut: () => { objGA.cursorOverBoard = false; /* console.log('<--')  */ },
      setBoard: () => {

         objGA.board = document.querySelectorAll("cg-board")[0];
         objGA.rect = objGA.board.getBoundingClientRect();

         /*   objGA.x0 = Math.round(objGA.rect.left);
           objGA.y0 = Math.round(objGA.rect.top);
           objGA.w = Math.round(objGA.rect.width);
           objGA.sqsize = Math.round(objGA.w / 8); */
         objGA.x0 = objGA.rect.left;
         objGA.y0 = objGA.rect.top;
         objGA.w = objGA.rect.width;
         objGA.sqsize = objGA.w / 8;

         objGA.squareS = Math.round(objGA.sqsize);

         document.removeEventListener(downEvent, checkMouseDownBeforePageLoaded)
         document.removeEventListener(upEvent, checkMouseUpBeforePageLoaded)
         document.removeEventListener('keydown', checkKeyDownBeforePageLoaded)
         document.removeEventListener('keyup', checkKeyUpBeforePageLoaded)

         objGA.board.addEventListener(moveEvent, objGA.MouseMoves);

         objGA.board.addEventListener('mouseover', objGA.mouseOver)
         objGA.board.addEventListener('mouseout', objGA.mouseOut)

         document.addEventListener('keydown', objGA.KeyD, true);
         document.addEventListener('keyup', objGA.KeyU, true);
         document.addEventListener(downEvent, objGA.MouseDown, true);
         document.addEventListener(upEvent, objGA.MouseUp, true);
         objGA.KnightAndRooks();


         let metas = document.getElementsByTagName('meta');
         let CSPcontent = undefined, useWorker = false;
         for (let i = 0; i < metas.length; i++) {
            let attrCSP = metas[i].getAttributeNode('http-equiv');
            if (attrCSP !== null && attrCSP.value === 'Content-Security-Policy') { CSPcontent = metas[i].getAttributeNode('content').value }
         }
         if (CSPcontent === undefined || CSPcontent.includes(`worker - src 'self' data: `)) { useWorker = true }

         window.postMessage({
            type: 'start', data: { boardWidthUnrounded: objGA.rect.width, boardX: objGA.rect.left, boardY: objGA.rect.top, sqSizeUnrounded: objGA.sqsize, useWorker: useWorker, myColor: objGA.myCol }
         }, "*");

         //rightClickDownWasOverBoard
         document.addEventListener('contextmenu', (e) => {
            if (objGA.rightClickDownWasOverBoard === true) {
               e.preventDefault();
               objGA.rightClickDownWasOverBoard = false
            }
         }, false);


      },
      setcolor: (color) => {
         objGA.myCol = color;
         //objGA.player=color;
      },
      setPieces: (pieces) => {
         //let piecesFromMap = Object.fromEntries(pieces);
         //objGA.pieces = piecesFromMap;
         objGA.pieces = pieces;
         //objGA.pieces=pieces;
         objGA.beginning === true && objGA.inMoves && objGA.FixDests();
         //(()=>{

      },
      setPremoves: (premoves) => {
         objGA.premoves = premoves;
         // //console.log(objGA.premoves);
      },

      multiPremKeyPressed: globalMultiKeyValueBeforePageLoad,
      multiPremState: false,
      arrayOfPremoves: [],
      mainPremoveHasBeenMade: false,
      piecesStatesAfterPremoves: {},

      KeyD(e) {
         //e.preventDefault();
         let key = e.key;
         if (key.length === 1) { key = key.toLowerCase() }
         /* if (e.target.id !== 'shadowHostId') { */
         if (useKeyboard === true && e.target.tagName !== "INPUT") {
            if ((e.ctrlKey === true || e.altKey === true || key === 'f' || key === 's' || key === 'z' || key === 'g' || key === 'h' || key === 'y')) { e.preventDefault();/*e.stopPropagation();*/ }
            if (!objGA.keys.includes(key) && objGA.OnlyPieceKeys.indexOf(key) !== -1) {
               e.preventDefault();
               e.stopImmediatePropagation();
               if (objGA.checkIfTheBoardIsTheSameAtTheBeginning === true) {
                  let cgBoardNow = document.getElementsByTagName('cg-board')[0];
                  if (cgBoardNow !== objGA.board) {
                     objGA.board = cgBoardNow;
                     objGA.board.removeEventListener(moveEvent, objGA.MouseMoves);
                     objGA.board.addEventListener(moveEvent, objGA.MouseMoves);
                     objGA.board.removeEventListener('mouseover', objGA.mouseOver)
                     objGA.board.removeEventListener('mouseout', objGA.mouseOut)
                     objGA.board.addEventListener('mouseover', objGA.mouseOver)
                     objGA.board.addEventListener('mouseout', objGA.mouseOut)
                  }
                  objGA.checkIfTheBoardIsTheSameAtTheBeginning = false;
               }

               objGA.keys.unshift(key);
               objGA.keysT.unshift(key);
               if (objGA.cursorOverBoard === true) {
                  objGA.makemoves();
               }
               objGA.setHighlights(key, true);
            }
         }
         /* } */ /* else {
            let refEvent = e;
            refEvent.cancelBubble = false;
            refEvent.defaultPrevented = false;
            refEvent.returnValue = true;

            if (event.target.dispatchEvent) {
               e.target.dispatchEvent(refEvent);
            } else if (e.target.fireEvent) {
               e.target.fireEvent(refEvent);
            }
         } */


         if (event.key === settingsObject.multipremove) {
            objGA.multiPremKeyPressed = true;

            if (createIndicator === true && objGA.indicator !== undefined) {
               objGA.indicator.style.background = '#114811'
            }
         }
         else if (event.key === settingsObject.cancelPremoves) {
            objGA.arrayOfPremoves = [];
            window.postMessage({
               type: 'deleteAll'
            }, "*");

            for (let key in objGA.PositionsOfDoublePieces) {
               objGA.PositionsOfDoublePieces[key].l = void 0;
               objGA.PositionsOfDoublePieces[key].r = void 0;
            }
            objGA.lastPremove = void 0;
            objGA.multiPremState = false;
            objGA.mainPremoveHasBeenMade = false;
            objGA.piecesStatesAfterPremoves = {};
            /* objGA.DoubleData([5, 5], [5, 5]);
            objGA.DoubleData([5, 5], [5, 5]); */
            objGA.ApplyData([5, 5], [5, 5]);
            objGA.DataTransition([5, 5], [5, 5]);
            objGA.ApplyData([5, 5], [5, 5]);
            objGA.DataTransition([5, 5], [5, 5]);

            if (useMouse === true && objGA.isAPieceSelected === true) {
               objGA.UnselectMultiSquare()
            }

         }
         else if (key === objGA.PieceKeys[13]) {
            let rematchButton = document.getElementsByClassName('fbt rematch white')[0];
            if (rematchButton) {
               rematchButton.click();
            }
         }
         else if (key === objGA.PieceKeys[14]) {
            let resignButton = document.getElementsByClassName('fbt resign')[0];
            if (resignButton) {
               resignButton.click();
            }
         }
         else if (key === objGA.PieceKeys[15]) {
            let berserkButton = document.getElementsByClassName("fbt go-berserk")[0];
            if (berserkButton) {
               berserkButton.click();
            }
         } else if (key === 'p'/*  || key === '0' */) {
            objGA.runDebugger = true;

         } else if (key === objGA.PieceKeys[16]) {
            let returnToTournament = document.getElementsByClassName("text fbt strong glowing")[0];
            if (returnToTournament) {
               returnToTournament.click();
            }

         }






      },
      KeyU(e) {
         let key = e.key;
         if (key.length === 1) { key = key.toLowerCase() }

         if (useKeyboard === true) {
            if (objGA.OnlyPieceKeys.indexOf(key) !== -1) {
               e.preventDefault();
               e.stopImmediatePropagation();

               for (let i = 0; i < objGA.keys.length; i++) {
                  if (objGA.keys[i] === key) {
                     objGA.keys.splice(i, 1);
                  }
               }
               for (let j = 0; j < objGA.keysT.length; j++) {
                  if (objGA.keysT[j] === key) {
                     objGA.keysT.splice(j, 1);
                  }
               }
               objGA.setHighlights(key, false);

            }
         }
         if (event.key === objGA.multiKeys.m) {
            objGA.multiPremKeyPressed = false;

            if (createIndicator === true && objGA.indicator !== undefined) {
               objGA.indicator.style.background = '#35290e'
            }
         }
      },


      checkIfMoveWasLegal: (pieces, fromX, fromY, toX, toY) => {
         return new Promise((resolve, reject) => {
            let lastMoveWithALetterFrom;
            let lastMoveWithALetterTo;

            let objectWithLegalMoves = objGA.inMoves;
            if (objGA.myCol === "white") {
               lastMoveWithALetterFrom =
                  objGA.ConvertToLetters[fromX] +
                  String(9 - fromY);
               lastMoveWithALetterTo =
                  objGA.ConvertToLetters[toX] +
                  String(9 - toY);
            } else {
               lastMoveWithALetterFrom =
                  objGA.ConvertToLetters[9 - fromX] +
                  String(fromY);
               lastMoveWithALetterTo =
                  objGA.ConvertToLetters[9 - toX] +
                  String(toY);
            }

            //console.log(objectWithLegalMoves, lastMoveWithALetterFrom, objGA.lastMove, objGA.inMoves, objGA.pieces)
            if (objectWithLegalMoves[lastMoveWithALetterFrom] === undefined || !objectWithLegalMoves[lastMoveWithALetterFrom].includes(lastMoveWithALetterTo)) {
               resolve(false)
            } else {
               resolve(true)
            }


         })
      },

      mouseDownX: undefined,
      mouseDownY: undefined,
      mouseUpX: undefined,
      mouseUpY: undefined,
      storePossibleClickMove: [],
      rightClickDownWasOverBoard: false,
      preventDragMoveAfterClickMove: { prevent: false, coordinates: [] },
      MouseDown: (e) => {
         // console.log(e)
         if (e.which === 3 && e.isTrusted === true) {
            if (rightButtonMulti === true) {
               e.stopImmediatePropagation();
               e.preventDefault();
               objGA.multiPremKeyPressed = true;
               if (e.target.tagName === 'CG-BOARD') { objGA.rightClickDownWasOverBoard = true }
               if (createIndicator === true && objGA.indicator !== undefined) {
                  objGA.indicator.style.background = '#114811'
               }
            } else if (useRightButton === true) {
               let keyToDispatch = settingsObject[settingsObject.rightButton]
               if (e.target.tagName === 'CG-BOARD') {
                  e.preventDefault();
                  e.stopImmediatePropagation();
                  document.dispatchEvent(new KeyboardEvent('keydown', { 'key': keyToDispatch }));
                  objGA.rightClickDownWasOverBoard = true;
               } else {
                  document.dispatchEvent(new KeyboardEvent('keydown', { 'key': keyToDispatch }));
               }
            }
         } else if (e.which === 1 && e.isTrusted === true) {
            if (useLeftButton === true) {
               let keyToDispatch = settingsObject[settingsObject.leftButton]
               if (e.target.tagName === 'CG-BOARD') {
                  e.preventDefault();
                  e.stopImmediatePropagation();
                  document.dispatchEvent(new KeyboardEvent('keydown', { 'key': keyToDispatch }));
               } else {
                  document.dispatchEvent(new KeyboardEvent('keydown', { 'key': keyToDispatch }));
               }
            } else {
            }
         }
         if (useMouse === true && (e.isTrusted === true || e.data === 'proceed') && e.which === 1) {
            // console.log('down')
            if (objGA.checkIfTheBoardIsTheSameAtTheBeginning === true) {
               let cgBoardNow = document.getElementsByTagName('cg-board')[0];
               if (cgBoardNow !== objGA.board) {
                  objGA.board = cgBoardNow;
                  objGA.board.removeEventListener(moveEvent, objGA.MouseMoves);
                  objGA.board.addEventListener(moveEvent, objGA.MouseMoves);
                  objGA.board.removeEventListener('mouseover', objGA.mouseOver)
                  objGA.board.removeEventListener('mouseout', objGA.mouseOut)
                  objGA.board.addEventListener('mouseover', objGA.mouseOver)
                  objGA.board.addEventListener('mouseout', objGA.mouseOut)
               }
               objGA.checkIfTheBoardIsTheSameAtTheBeginning = false;
            }



            if (objGA.multiPremState === true && e.target.tagName === 'CG-BOARD') {
               if (objGA.multiPremKeyPressed === true) {
                  e.preventDefault();
                  e.stopImmediatePropagation();
                  if (BothClickAndDrug === true) {
                     objGA.preventNextMouseUp = true;
                  }




                  //console.log('was prevented')
               } else {
                  objGA.arrayOfPremoves = [];
                  window.postMessage({
                     type: 'deleteAll'
                  }, "*");

                  for (let key in objGA.PositionsOfDoublePieces) {
                     objGA.PositionsOfDoublePieces[key].l = void 0;
                     objGA.PositionsOfDoublePieces[key].r = void 0;
                  }
                  objGA.lastPremove = void 0;
                  objGA.multiPremState = false;
                  objGA.mainPremoveHasBeenMade = false;
                  objGA.piecesStatesAfterPremoves = {};

                  if (useMouse === true && objGA.isAPieceSelected === true) {
                     objGA.UnselectMultiSquare()
                  }
               }

            }
            objGA.mouseDownX = Math.ceil((e.clientX - objGA.x0) / objGA.sqsize);
            objGA.mouseDownY = Math.ceil((e.clientY - objGA.y0) / objGA.sqsize);

            if (BothClickAndDrug === true) {
               if (objGA.storePossibleClickMove.length !== 0 && (objGA.storePossibleClickMove[0] !== objGA.mouseDownX || objGA.storePossibleClickMove[1] !== objGA.mouseDownY)) {
                  if (objGA.mouseDownX < 9 && objGA.mouseDownY < 9 && objGA.mouseDownX > 0 && objGA.mouseDownY > 0) {
                     if (objGA.multiPremKeyPressed && objGA.multiPremState === true) {
                        let mouseCoordinates = [objGA.storePossibleClickMove[0], objGA.storePossibleClickMove[1], objGA.mouseDownX, objGA.mouseDownY]
                        setTimeout(() => {
                           objGA.FixMousePremoves/* .async */(mouseCoordinates[0], mouseCoordinates[1], objGA.mouseDownX, objGA.mouseDownY, true)
                              .then(r => { /* console.log(r) */
                                 if (r === true) {
                                    objGA.preventDragMoveAfterClickMove.prevent = true;
                                    objGA.preventDragMoveAfterClickMove.coordinates = mouseCoordinates.slice(2, 4);
                                    if (objGA.isAPieceSelected === true) {
                                       objGA.UnselectMultiSquare()
                                    }
                                 }
                              });
                        }, 0);
                     } else if (objGA.player !== objGA.myCol) {
                        let mouseCoordinates = [objGA.storePossibleClickMove[0], objGA.storePossibleClickMove[1], objGA.mouseDownX, objGA.mouseDownY]
                        setTimeout(() => {
                           objGA.FixMousePremoves/* .async */(mouseCoordinates[0], mouseCoordinates[1], objGA.mouseDownX, objGA.mouseDownY)
                              .then(r => {
                                 if (r === true) {
                                    objGA.preventDragMoveAfterClickMove.prevent = true;
                                    objGA.preventDragMoveAfterClickMove.coordinates = mouseCoordinates.slice(2, 4);
                                    if (objGA.isAPieceSelected === true) {
                                       objGA.UnselectMultiSquare()
                                    }
                                 }
                              });
                        }, 0);
                     } else {
                        /* let currentPieces = objGA.pieces; */
                        let mouseCoordinates = [objGA.storePossibleClickMove[0], objGA.storePossibleClickMove[1], objGA.mouseDownX, objGA.mouseDownY]
                        objGA.checkIfMoveWasLegal(objGA.pieces, objGA.storePossibleClickMove[0], objGA.storePossibleClickMove[1], objGA.mouseDownX, objGA.mouseDownY).then(r => {
                           if (r === true) {
                              objGA.preventDragMoveAfterClickMove.prevent = true;
                              objGA.preventDragMoveAfterClickMove.coordinates = mouseCoordinates.slice(2, 4);
                              if (objGA.isAPieceSelected === true) {
                                 objGA.UnselectMultiSquare()
                              }
                           }
                        });
                     }
                     objGA.storePossibleClickMove.length = 0;
                  }
               }



               //animate drags
               /* if (animateMultipremoves === true) {
                  objGA.startAnimatingAfterClick();
               } */
               // end animat drags


            }

            //animate drags
            // setTimeout(() => {
            if (objGA.preventDragMoveAfterClickMove.prevent === false
               && (objGA.mouseDownX < 9 && objGA.mouseDownY > 0 && objGA.mouseDownX > 0 && objGA.mouseDownY < 9)) {
               let coordX = e.clientX - objGA.x0
               let coordY = e.clientY - objGA.y0
               let mouseDownX = objGA.mouseDownX;
               let mouseDownY = objGA.mouseDownY;
               let multi = false;
               let isItMultiState = (objGA.multiPremKeyPressed && objGA.multiPremState === true)
               if (isItMultiState) {
                  multi = true;
               }
               // let wasTheClickOnAPiece = objGA.checkIfTheClickWasOnAPiece(mouseDownX, mouseDownY, multi);
               let wasTheClickOnAPiece = objGA.checkIfTheClickWasOnAPiece(mouseDownX, mouseDownY, true);

               console.log(wasTheClickOnAPiece, mouseDownX, mouseDownY, isItMultiState)
               if (wasTheClickOnAPiece[0] !== undefined) {
                  //console.log(wasTheClickOnAPiece)
                  objGA.dragStartAnimate = { do: true, piece: wasTheClickOnAPiece[0] };
                  //?????
                  if (isItMultiState === true) {
                     console.log('2593', true)
                     // objGA.dragStartAnimate = { do: true, piece: wasTheClickOnAPiece[0] };
                     if (animateMultipremoves === true) {
                        window.postMessage({
                           type: 'drag', phase: 'drag', coordinates: [coordX, coordY], piece: wasTheClickOnAPiece[0]
                        }, "*");
                        window.postMessage({
                           type: 'selected', selected: true, x: mouseDownX, y: mouseDownY
                        }, "*");
                     }
                  }
                  objGA.isAPieceSelected = true;
               } else if (objGA.isAPieceSelected === true) {
                  objGA.UnselectMultiSquare()
               }

            }
            // }, 0);
            // end animate drags

         }
      },

      startAnimatingAfterClick: () => { //unused
         if ((objGA.storePossibleClickMove.length === 0 && objGA.preventDragMoveAfterClickMove.prevent !== true) || (objGA.storePossibleClickMove.length !== 0 && (objGA.storePossibleClickMove[0] !== objGA.mouseDownX || objGA.storePossibleClickMove[1] !== objGA.mouseDownY))) {
            let multi = false;
            if (objGA.multiPremKeyPressed && objGA.multiPremState === true) {
               multi = true;
            }
            let wasTheClickOnAPiece = objGA.checkIfTheClickWasOnAPiece(objGA.mouseDownX, objGA.mouseDownY, multi);
            if (wasTheClickOnAPiece[0] !== undefined) {
               // console.log(objGA.mouseDownX, objGA.mouseDownY)
               window.postMessage({
                  type: 'drag', phase: 'drag', coordinates: [objGA.mouseDownX, objGA.mouseDownY], piece: wasTheClickOnAPiece[0], calculatePixels: true
               }, "*");
               objGA.dragStartAnimate = { do: true, piece: wasTheClickOnAPiece[0] };
            }
         }
      },

      /* For some reason when first the two clicks method has been used to move a piece, 
      the next move can only be done via two clicks method as well, or with a
      delay before dispatching the mouseup. Therefore programmatic drag is unreliable
      when both two clicks and drag are turned on in the options. So dispatching
      events should be done in this order: mousedown, mouseup on the 'from' square,
      and mousedown, mouseup on the 'to' square. Or a delay should be used, which
      makes it unreliable. I think using the 'drags only' option is the most reliable method
      to use this extension, since it is able then to reliably use programmatic drags, which
      can avoid accidental square selection. If a square selection occurs, a programmatic 
      two clicks move can't be performed, and unselecting the selected square is necessary 
      before the programmatic move can be made. It still needs testing. On the other hand,
      the drag only method seems to work very well. */

      MouseUp: (e) => {
         if (e.which === 3 && e.isTrusted === true) {
            if (rightButtonMulti === true) {
               e.stopImmediatePropagation();
               e.preventDefault();
               objGA.multiPremKeyPressed = false;
               if (createIndicator === true && objGA.indicator !== undefined) {
                  objGA.indicator.style.background = '#35290e'
               }
            } else if (useRightButton === true) {
               let keyToDispatch = settingsObject[settingsObject.rightButton]
               if (e.target.tagName === 'CG-BOARD') {
                  e.preventDefault();
                  e.stopImmediatePropagation();
                  document.dispatchEvent(new KeyboardEvent('keyup', { 'key': keyToDispatch }));
               } else {
                  document.dispatchEvent(new KeyboardEvent('keyup', { 'key': keyToDispatch }));
               }
            }

         } else if (e.which === 1 && e.isTrusted === true) {
            if (useLeftButton === true) {
               let keyToDispatch = settingsObject[settingsObject.leftButton]
               if (e.target.tagName === 'CG-BOARD') {
                  e.preventDefault();
                  e.stopImmediatePropagation();
                  document.dispatchEvent(new KeyboardEvent('keyup', { 'key': keyToDispatch }));
               } else {
                  document.dispatchEvent(new KeyboardEvent('keyup', { 'key': keyToDispatch }));
               }
            }
         }
         if (useMouse === true && (e.isTrusted === true || e.data === 'proceed') && e.which === 1) {
            //console.log('up')
            if (objGA.runDebugger) { debugger; }
            if (objGA.multiPremKeyPressed === true
               && objGA.multiPremState === true
               && e.target.tagName === 'CG-BOARD') {
               if (BothClickAndDrug === false || objGA.preventDragMoveAfterClickMove.prevent === false || objGA.preventNextMouseUp === true/*|| (objGA.mouseDownX !== objGA.preventDragMoveAfterClickMove.coordinates[0] || objGA.mouseDownY !== objGA.preventDragMoveAfterClickMove.coordinates[1]) */) {
                  e.preventDefault();
                  e.stopImmediatePropagation();
                  //console.log('was prevented')

                  if (BothClickAndDrug === true) {
                     objGA.preventNextMouseUp = false
                  }
               }
            }


            objGA.mouseUpX = Math.ceil((e.clientX - objGA.x0) / objGA.sqsize);
            objGA.mouseUpY = Math.ceil((e.clientY - objGA.y0) / objGA.sqsize);
            objGA.checkMouseDragMove.async(objGA.mouseDownX, objGA.mouseDownY, objGA.mouseUpX, objGA.mouseUpY)


            //animate drags
            if (objGA.dragStartAnimate && objGA.dragStartAnimate.do === true) {
               if (animateMultipremoves === true) {
                  window.postMessage({
                     type: 'drag', phase: 'stop'
                  }, "*");
               }
               objGA.dragStartAnimate.do = false;
               console.log('2709', false)
            }
            // end animat drags
         }
      },

      runDebugger: false,

      checkMouseDragMove: (mouseDownX, mouseDownY, mouseUpX, mouseUpY) => {

         if (mouseDownX !== mouseUpX || mouseDownY !== mouseUpY) {
            if (mouseDownX < 9 && mouseDownY > 0 && mouseUpX < 9 && mouseUpY > 0
               && mouseDownX > 0 && mouseDownY < 9 && mouseUpX > 0 && mouseUpY < 9
            ) {

               if (BothClickAndDrug === false || objGA.preventDragMoveAfterClickMove.prevent === false
                  || (mouseDownX !== objGA.preventDragMoveAfterClickMove.coordinates[0]
                     || mouseDownY !== objGA.preventDragMoveAfterClickMove.coordinates[1])) {

                  if (objGA.multiPremKeyPressed && objGA.multiPremState === true) {
                     objGA.FixMousePremoves(mouseDownX, mouseDownY, mouseUpX, mouseUpY, true);
                  } else if (objGA.player !== objGA.myCol) {
                     objGA.FixMousePremoves(mouseDownX, mouseDownY, mouseUpX, mouseUpY);
                  }
                  if (objGA.storePossibleClickMove.length !== 0) {
                     objGA.storePossibleClickMove.length = 0;
                  }
               } else if (BothClickAndDrug === true) {
                  objGA.preventDragMoveAfterClickMove.prevent = false;
                  objGA.preventDragMoveAfterClickMove.coordinates.length = 0;
               }
               if (objGA.isAPieceSelected === true) {
                  objGA.UnselectMultiSquare();
               }
            }
         }

         if (BothClickAndDrug === true && ((mouseDownX === mouseUpX && mouseDownY === mouseUpY) || (mouseUpX > 8 || mouseUpX < 0 || mouseUpY > 8 || mouseUpY < 0))) {
            if (objGA.storePossibleClickMove.length === 0) {
               if (objGA.preventDragMoveAfterClickMove.prevent === false || (mouseDownX !== objGA.preventDragMoveAfterClickMove.coordinates[0] || mouseDownY !== objGA.preventDragMoveAfterClickMove.coordinates[1])) {
                  let multi = false;
                  if (objGA.multiPremKeyPressed && objGA.multiPremState === true) {
                     multi = true;
                  }
                  let wasTheClickOnAPiece = objGA.checkIfTheClickWasOnAPiece(mouseDownX, mouseDownY, multi);
                  if (wasTheClickOnAPiece[0] !== undefined) {
                     objGA.storePossibleClickMove.push(mouseDownX, mouseDownY)
                  }
               } else {
                  objGA.preventDragMoveAfterClickMove.prevent = false;
                  objGA.preventDragMoveAfterClickMove.coordinates.length = 0;
               }
            } else if (objGA.storePossibleClickMove[0] === mouseDownX && objGA.storePossibleClickMove[1] === mouseDownY) {
               objGA.storePossibleClickMove.length = 0;

               if (objGA.isAPieceSelected === true) {
                  objGA.UnselectMultiSquare();
               }

            } else {

            }
         }


         if (BothClickAndDrug === false && objGA.isAPieceSelected === true) {
            window.postMessage({
               type: 'selected', selected: false
            }, "*");
            objGA.isAPieceSelected = false;
         }

         //} 
         /* else {
 
         } */
      },
      checkIfTheClickWasOnAPiece: (mouseDownX, mouseDownY, multi) => { //can be used as a function to reduce the amount of repetitive code later
         let whatPiecesPosToChoose;
         if (multi === true) { whatPiecesPosToChoose = objGA.piecesStatesAfterPremoves }
         else { whatPiecesPosToChoose = objGA.pieces; }
         let letterFrom;
         console.log(whatPiecesPosToChoose)
         objGA.myCol === 'white' ? letterFrom = objGA.ConvertToLetters[mouseDownX] + String(9 - mouseDownY) : letterFrom = objGA.ConvertToLetters[9 - mouseDownX] + String(mouseDownY);
         let selectedPiece = whatPiecesPosToChoose[letterFrom] !== undefined ? whatPiecesPosToChoose[letterFrom].role : undefined;
         if (selectedPiece !== undefined && whatPiecesPosToChoose[letterFrom].color === objGA.myCol) {
            return [selectedPiece, whatPiecesPosToChoose];
         } else {
            return [undefined, undefined]
         }
      },
      FixMousePremoves: (mouseDownX, mouseDownY, mouseUpX, mouseUpY, multi = false) => {
         return new Promise((resolve, reject) => {
            //console.log(mouseDownX, mouseDownY, mouseUpX, mouseUpY, multi)
            /* let whatPiecesPosToChoose;
            if (multi === true) { whatPiecesPosToChoose = objGA.piecesStatesAfterPremoves }
            else { whatPiecesPosToChoose = objGA.pieces; }
            let letterFrom;
            objGA.myCol === 'white' ? letterFrom = objGA.ConvertToLetters[mouseDownX] + String(9 - mouseDownY) : letterFrom = objGA.ConvertToLetters[9 - mouseDownX] + String(mouseDownY);
            let selectedPiece = whatPiecesPosToChoose[letterFrom] !== undefined ? whatPiecesPosToChoose[letterFrom].role : undefined; */
            let returnedArr = objGA.checkIfTheClickWasOnAPiece(mouseDownX, mouseDownY, multi)
            let selectedPiece = returnedArr[0];
            let whatPiecesPosToChoose = returnedArr[1];
            if (selectedPiece !== undefined) {
               switch (selectedPiece) {
                  case 'pawn':
                     objGA.mousePiecesPremoves.Pawn(mouseDownX, 9 - mouseDownY, mouseUpX, 9 - mouseUpY, multi, undefined, resolve);
                     break;
                  case 'knight':
                     objGA.mousePiecesPremoves.Knight(mouseDownX, 9 - mouseDownY, mouseUpX, 9 - mouseUpY, multi, whatPiecesPosToChoose, resolve);
                     break;
                  case 'bishop':
                     objGA.mousePiecesPremoves.Bishop(mouseDownX, 9 - mouseDownY, mouseUpX, 9 - mouseUpY, multi, undefined, resolve);
                     break;
                  case 'rook':
                     objGA.mousePiecesPremoves.Rook(mouseDownX, 9 - mouseDownY, mouseUpX, 9 - mouseUpY, multi, whatPiecesPosToChoose, resolve);
                     break;
                  case 'queen':
                     objGA.mousePiecesPremoves.Queen(mouseDownX, 9 - mouseDownY, mouseUpX, 9 - mouseUpY, multi, whatPiecesPosToChoose, resolve);
                     break;
                  case 'king':
                     objGA.mousePiecesPremoves.King(mouseDownX, 9 - mouseDownY, mouseUpX, 9 - mouseUpY, multi, undefined, resolve);
                     break;
                  default:
                     break;
               }
            } else {
               resolve(false)
            }
         });
      },

      mousePiecesPremoves: {
         Pawn: (mouseDownX, mouseDownY, mouseUpX, mouseUpY, multi, whatPiecesPosToChoose, resolve) => {
            let isPremoveLegal = false;
            let legalPawnMoves = [[mouseDownX - 1, mouseDownY + 1],
            [mouseDownX, mouseDownY + 1], [mouseDownX + 1, mouseDownY + 1]]
            if (mouseDownY === 2) {
               legalPawnMoves.push([mouseDownX, mouseDownY + 2])
            }
            for (let i = 0; i < legalPawnMoves.length; i++) {
               const el = legalPawnMoves[i];
               if (mouseUpX === el[0] && mouseUpY === el[1]) {
                  isPremoveLegal = true;
                  break;
               }
            }
            if (isPremoveLegal === true) {
               objGA.executeMove([mouseUpX, mouseUpY], [mouseDownX, mouseDownY], false, multi, true, "pawn", true);
               resolve(true)
            } else { resolve(false) }
         },
         Knight: (mouseDownX, mouseDownY, mouseUpX, mouseUpY, multi, whatPiecesPosToChoose, resolve) => {
            let isPremoveLegal = false;
            if (((Math.abs(mouseDownX - mouseUpX) === 1 && Math.abs(mouseDownY - mouseUpY) === 2) || (Math.abs(mouseDownY - mouseUpY) === 1 && Math.abs(mouseDownX - mouseUpX) === 2))/*  && (mouseDownX !== mouseUpX || mouseDownY !== mouseUpY) */) {
               isPremoveLegal = true;
               let possibles = [[mouseDownX, mouseDownY]];
               let rPcoord, CurrentRightPiece, CurrentLeftPiece, isRight, isLeft;
               let pieceName = 'Knight', positionPieceName = 'knights', pieceNameToWorker = 'knight'
               let c = [mouseUpX, mouseUpY]
               if (multi === false) {
                  if (rPcoord = objGA.ifTwoPieces(`right${pieceName} `), rPcoord !== void 0) {
                     CurrentRightPiece = rPcoord;
                     isRight = (possibles[0][0] === CurrentRightPiece[0] && possibles[0][1] === CurrentRightPiece[1]);
                     if (isRight) { objGA.PositionsOfDoublePieces[positionPieceName].r = c; }
                     else { objGA.PositionsOfDoublePieces[positionPieceName].l = c; }
                  } else {
                     objGA.PositionsOfDoublePieces[positionPieceName].l = c;
                  }

               } else {
                  if (objGA.PositionsOfDoublePieces[positionPieceName].r !== void 0) {
                     CurrentRightPiece = objGA.PositionsOfDoublePieces[positionPieceName].r;
                     isRight = (possibles[0][0] === CurrentRightPiece[0] && possibles[0][1] === CurrentRightPiece[1]);
                     if (isRight) { objGA.PositionsOfDoublePieces[positionPieceName].r = c; }
                     else { objGA.PositionsOfDoublePieces[positionPieceName].l = c; }

                  } else if (objGA.PositionsOfDoublePieces[positionPieceName].l !== void 0) {
                     CurrentLeftPiece = objGA.PositionsOfDoublePieces[positionPieceName].l;
                     isLeft = (possibles[0][0] === CurrentLeftPiece[0] && possibles[0][1] === CurrentLeftPiece[1]);
                     if (isLeft) { objGA.PositionsOfDoublePieces[positionPieceName].l = c; }
                     else { objGA.PositionsOfDoublePieces[positionPieceName].r = c; }
                  } else if (rPcoord = objGA.ifTwoPieces(`right${pieceName} `), rPcoord !== void 0) {

                     CurrentRightPiece = rPcoord;
                     isRight = (possibles[0][0] === CurrentRightPiece[0] && possibles[0][1] === CurrentRightPiece[1]);
                     if (isRight) { objGA.PositionsOfDoublePieces[positionPieceName].r = c; }
                     else { objGA.PositionsOfDoublePieces[positionPieceName].l = c; }
                  } else {
                     objGA.PositionsOfDoublePieces[positionPieceName].l = c;
                  }
               }
               //objGA.executeMove(c, possibles[0], false, multi, true, pieceNameToWorker);
               objGA.executeMove([mouseUpX, mouseUpY], [mouseDownX, mouseDownY], false, multi, true, pieceNameToWorker, true);
               resolve(true)
            } else { resolve(false) }





         },
         Bishop: (mouseDownX, mouseDownY, mouseUpX, mouseUpY, multi, whatPiecesPosToChoose, resolve) => {
            let isPremoveLegal = false;
            if ((Math.abs(mouseDownX - mouseUpX) === Math.abs(mouseDownY - mouseUpY))/*  && (mouseDownX !== mouseUpX || mouseDownY !== mouseUpY) */) {
               isPremoveLegal = true;
               objGA.executeMove([mouseUpX, mouseUpY], [mouseDownX, mouseDownY], false, multi, true, "bishop", true);
               resolve(true)
            } else { resolve(false) }
         },
         Rook: (mouseDownX, mouseDownY, mouseUpX, mouseUpY, multi, whatPiecesPosToChoose, resolve) => {
            let isPremoveLegal = false;
            if ((mouseDownX === mouseUpX || mouseDownY === mouseUpY)/*  && (mouseDownX !== mouseUpX || mouseDownY !== mouseUpY) */) {
               isPremoveLegal = true;
               let possibles = [[mouseDownX, mouseDownY]];
               let rPcoord, CurrentRightPiece, CurrentLeftPiece, isRight, isLeft;
               let pieceName = 'Rook', positionPieceName = 'rooks', pieceNameToWorker = 'rook'
               let c = [mouseUpX, mouseUpY]
               if (multi === false) {
                  if (rPcoord = objGA.ifTwoPieces(`right${pieceName} `), rPcoord !== void 0) {
                     CurrentRightPiece = rPcoord;
                     isRight = (possibles[0][0] === CurrentRightPiece[0] && possibles[0][1] === CurrentRightPiece[1]);
                     if (isRight) { objGA.PositionsOfDoublePieces[positionPieceName].r = c; }
                     else { objGA.PositionsOfDoublePieces[positionPieceName].l = c; }
                  } else {
                     objGA.PositionsOfDoublePieces[positionPieceName].l = c;
                  }
               } else {
                  if (objGA.PositionsOfDoublePieces[positionPieceName].r !== void 0) {
                     CurrentRightPiece = objGA.PositionsOfDoublePieces[positionPieceName].r;
                     isRight = (possibles[0][0] === CurrentRightPiece[0] && possibles[0][1] === CurrentRightPiece[1]);
                     if (isRight) { objGA.PositionsOfDoublePieces[positionPieceName].r = c; }
                     else { objGA.PositionsOfDoublePieces[positionPieceName].l = c; }
                  } else if (objGA.PositionsOfDoublePieces[positionPieceName].l !== void 0) {
                     CurrentLeftPiece = objGA.PositionsOfDoublePieces[positionPieceName].l;
                     isLeft = (possibles[0][0] === CurrentLeftPiece[0] && possibles[0][1] === CurrentLeftPiece[1]);
                     if (isLeft) { objGA.PositionsOfDoublePieces[positionPieceName].l = c; }
                     else { objGA.PositionsOfDoublePieces[positionPieceName].r = c; }
                  } else if (rPcoord = objGA.ifTwoPieces(`right${pieceName} `), rPcoord !== void 0) {
                     CurrentRightPiece = rPcoord;
                     isRight = (possibles[0][0] === CurrentRightPiece[0] && possibles[0][1] === CurrentRightPiece[1]);
                     if (isRight) { objGA.PositionsOfDoublePieces[positionPieceName].r = c; }
                     else { objGA.PositionsOfDoublePieces[positionPieceName].l = c; }
                  } else {
                     objGA.PositionsOfDoublePieces[positionPieceName].l = c;
                  }
               }
               //objGA.executeMove(c, possibles[0], false, multi, true, pieceNameToWorker);
               objGA.executeMove([mouseUpX, mouseUpY], [mouseDownX, mouseDownY], false, multi, true, pieceNameToWorker, true);
               resolve(true)
            } else { resolve(false) }
         },
         Queen: (mouseDownX, mouseDownY, mouseUpX, mouseUpY, multi, whatPiecesPosToChoose, resolve) => {
            let isPremoveLegal = false;
            if ((mouseDownX === mouseUpX || mouseDownY === mouseUpY) || (Math.abs(mouseDownX - mouseUpX) === Math.abs(mouseDownY - mouseUpY))) {
               isPremoveLegal = true;
               let possibles = [[mouseDownX, mouseDownY]];
               let rPcoord, CurrentRightPiece, CurrentLeftPiece, isRight, isLeft;
               let pieceName = 'Queen', positionPieceName = 'queens', pieceNameToWorker = 'queen';
               let c = [mouseUpX, mouseUpY]
               let numberOfQueens;
               let wherePieces = [];
               for (const coord in whatPiecesPosToChoose) {
                  if (whatPiecesPosToChoose[coord].role === "queen" && whatPiecesPosToChoose[coord].color === objGA.myCol) {
                     let coordDigits = Number(objGA.ConvertToDigits[coord[0]] + coord[1]);
                     objGA.myCol === 'white' ? wherePieces.push([Math.floor([coordDigits / 10]), coordDigits % 10]) :
                        wherePieces.push([9 - Math.floor([coordDigits / 10]), 9 - coordDigits % 10])
                  }
               }
               numberOfQueens = wherePieces.length;
               if (numberOfQueens === 1) {
                  //objGA.executeMove(c, possibles[0], false, multi, true, "queen");
                  objGA.executeMove([mouseUpX, mouseUpY], [mouseDownX, mouseDownY], false, multi, true, pieceNameToWorker, true);
                  objGA.PositionsOfDoublePieces[positionPieceName].l = c;
                  //resolve(true)
               } else {
                  if (multi === false) {
                     if (rPcoord = objGA.ifTwoPieces(`right${pieceName} `, numberOfQueens), rPcoord !== void 0) {
                        CurrentRightPiece = rPcoord;
                        isRight = (possibles[0][0] === CurrentRightPiece[0] && possibles[0][1] === CurrentRightPiece[1]);
                        if (isRight) { objGA.PositionsOfDoublePieces[positionPieceName].r = c; }
                        else { objGA.PositionsOfDoublePieces[positionPieceName].l = c; }
                     }
                  } else {
                     if (objGA.PositionsOfDoublePieces[positionPieceName].r !== void 0) {
                        CurrentRightPiece = objGA.PositionsOfDoublePieces[positionPieceName].r;
                        isRight = (possibles[0][0] === CurrentRightPiece[0] && possibles[0][1] === CurrentRightPiece[1]);
                        if (isRight) { objGA.PositionsOfDoublePieces[positionPieceName].r = c; }
                        else { objGA.PositionsOfDoublePieces[positionPieceName].l = c; }
                     } else if (rPcoord = objGA.ifTwoPieces(`right${pieceName} `, numberOfQueens), rPcoord !== void 0) {
                        CurrentRightPiece = rPcoord;
                        isRight = (possibles[0][0] === CurrentRightPiece[0] && possibles[0][1] === CurrentRightPiece[1]);
                        if (isRight) { objGA.PositionsOfDoublePieces[positionPieceName].r = c; }
                        else { objGA.PositionsOfDoublePieces[positionPieceName].l = c; }

                     }
                  }
                  // objGA.executeMove(c, possibles[0], false, multi, true, pieceNameToWorker);
                  objGA.executeMove([mouseUpX, mouseUpY], [mouseDownX, mouseDownY], false, multi, true, pieceNameToWorker, true);
               }
               resolve(true)
            } else { resolve(false) }
         },
         King: (mouseDownX, mouseDownY, mouseUpX, mouseUpY, multi, whatPiecesPosToChoose, resolve) => {
            let isPremoveLegal = false;
            if ((Math.abs(mouseDownX - mouseUpX) <= 1 && Math.abs(mouseDownY - mouseUpY) <= 1) || (mouseDownY === 1 && mouseUpY === 1 && ((mouseDownX === 5 && [1, 3, 7, 8].includes(mouseUpX)) || (mouseDownX === 4 && [1, 2, 6, 8].includes(mouseUpX))))) {
               isPremoveLegal = true;
               objGA.executeMove([mouseUpX, mouseUpY], [mouseDownX, mouseDownY], false, multi, true, "king", true);
               resolve(true)
            } else { resolve(false) }
         }
      },
      makemoves(l = void 0) {

         if (objGA.keys.length !== 0) {
            if (objGA.horiz < 9 && objGA.horiz > 0 && objGA.vertic < 9 && objGA.vertic > 0) {

               if (objGA.player === objGA.myCol) {
                  if (objGA.arrayOfPremoves.length === 0) {
                     objGA.PlayAMove(objGA.horiz, objGA.vertic)
                  } else if (objGA.multiPremKeyPressed && objGA.multiPremState === true) {
                     objGA.FixPremoves(objGA.horiz, objGA.vertic, true);
                  }
               }
               else {
                  if (objGA.multiPremKeyPressed && objGA.multiPremState === true) {
                     objGA.FixPremoves(objGA.horiz, objGA.vertic, true);
                  } else {
                     objGA.FixPremoves(objGA.horiz, objGA.vertic);
                  }
               }
            }
            // }, 0);
         }

      },
      checkIfTheBoardIsTheSameAtTheBeginning: true,
      ApplyData: (a, b, data = undefined) => {
         let ev = new MouseEvent("mousedown", {
            "view": window,
            "bubbles": true,
            "cancelable": false,
            "clientX": a
               + objGA.x0,
            "clientY": b
               + objGA.y0/* ,
            "detail": {data: 'd'} */
         });
         ev.data = data;
         objGA.board.dispatchEvent(ev);
      },
      DataTransition: (a, b, c = false, data = undefined) => {
         let ev = new MouseEvent("mouseup", {
            "view": window,
            "bubbles": true,
            "cancelable": false,
            "clientX": a
               + objGA.x0,
            "clientY": b
               + objGA.y0/* ,
            "data": data */
         });
         ev.data = data;
         objGA.board.dispatchEvent(ev);
      },
      MouseMoveEvent: (a, b) => {
         let ev = new MouseEvent("mousemove", {
            "view": window,
            "bubbles": true,
            "cancelable": false,
            "clientX": a
               + objGA.x0,
            "clientY": b
               + objGA.y0
         });
         objGA.board.dispatchEvent(ev);
      },
      DoubleData: (a, b) => {
         objGA.stillexecute = false;
         if (BothClickAndDrug === false) {
            objGA.ApplyData(a[0], a[1]);
            //objGA.DataTransition(a[0],a[1]);
            //objGA.ApplyData(b[0],b[1]);
            objGA.DataTransition(b[0], b[1]);
         } else {

            //setTimeout(function () {
            objGA.ApplyData(a[0], a[1]);
            objGA.DataTransition(a[0], a[1]);
            objGA.ApplyData(b[0], b[1]);
            objGA.DataTransition(b[0], b[1]/* , true */);
            //}, 0);
            objGA.Unselect.async()
         }

         /*  if (BothClickAndDrug === false) {
          objGA.DataTransition(b[0], b[1], true);
 } else {
    setTimeout(() => {
       objGA.DataTransition(b[0], b[1], true);
    }, 0);
 } */
         objGA.storeLastMoveX = Math.ceil(b[0] / objGA.sqsize);
         objGA.storeLastMoveY = 9 - Math.ceil(b[1] / objGA.sqsize);

         globalX = b[0]; globalY = b[1];
      },
      Unselect: (tx, ty) => {
         /* let ds = objGA.board.children;
         let length = ds.length;
         for (let i = 0; i < length; ++i) {
            if (ds[i].className.includes("selected")) {
               objGA.ApplyData(tx, ty);
               objGA.DataTransition(tx, ty);
               return;
               break;
            }
         } */
         let selected = objGA.board.getElementsByClassName('selected')[0];
         if (selected !== undefined) {
            let transform = selected.style.transform;
            let extraction = transform.split(',');
            extraction[0] = Number(extraction[0].replace(/\D/g, '')) + objGA.sqsize / 2;
            extraction[1] = Number(extraction[1].replace(/\D/g, '')) + objGA.sqsize / 2;

            objGA.ApplyData(extraction[0], extraction[1]);
            objGA.DataTransition(extraction[0], extraction[1]);
         }
      },
      UnselectMultiSquare: () => {
         window.postMessage({
            type: 'selected', selected: false
         }, "*");
         objGA.isAPieceSelected = false;
      }
   }
}