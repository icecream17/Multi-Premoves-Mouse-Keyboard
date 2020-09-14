'use strict';
(function () {


   let consoleNew = console.log;
   console.log = () => { }

   let downEvent = 'mousedown', upEvent = 'mouseup', keyDownEvent = "keydown", keyUpEvent = "keyup";
   let doStopPropagation = false;
   let premoveKey = 'b';
   let timeStampLatest = 0;
   let arrayDownUp = [];
   let timeStampToMeasureWebSocket = 0;
   let sentMove; /* not a premove */
   let whoseMove;
   let isMyMove;
   let currentPieceSet, currentFEN;
   let lastMoveMadeUCI;
   let currentPremovedPieceSet;


   Function.prototype.async = function () {
      setTimeout.bind(null, this, 0).apply(null, arguments);
   }; //https://stackoverflow.com/a/14103116/10364842



   function isEmpty(obj) {
      for (var key in obj) {
         if (obj.hasOwnProperty(key))
            return false;
      }
      return true;
   }

   (function () { //to get the move that has been sent by the client
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
         if (data !== null) {
            workWithAnOutcomingMove.async(data)
         }
         return wsSend(this, arguments);
      };
   })();


   const workWithAnOutcomingMove = (data) => {
      let parsed = JSON.parse(data);
      if (parsed.t === 'move') {
         console.log(parsed, performance.now() - timeStampToMeasureWebSocket, 'this is sent')
         sentMove = parsed;
         whoseMove = whoseMove === 'white' ? 'black' : 'white';
         isMyMove = false;
         lastMoveMadeUCI = parsed.d.u;
         currentPieceSet = PiecesObject(currentPieceSet, parsed.d.u);

         consoleNew(currentPieceSet)
      }
   }

   let PiecesObject = (chessBoardObj, move) => {
      let toFromCoord = [];
      toFromCoord[0] = move.substr(0, 2)
      toFromCoord[1] = move.substr(2, 4)
      let objectToWorkWith = Object.assign({}, chessBoardObj);
      objectToWorkWith[toFromCoord[1]] = objectToWorkWith[toFromCoord[0]];
      delete objectToWorkWith[toFromCoord[0]];
      return objectToWorkWith
   }




   setTimeout(() => {

      $(document).ready(() => {

         let startingPositionFEN;
         let startingPieceSet;
         let board = document.getElementsByTagName("cg-board")[0];
         let rect = board.getBoundingClientRect();
         let boardX = rect.x;
         let boardY = rect.y;
         let boardWidth = Math.round(rect.width);
         let boardWidthUnrounded = rect.width;
         let sqSize = Math.round(boardWidth / 8);
         let sqSizeUnrounded = boardWidth / 8;

         console.log(boardWidthUnrounded, sqSizeUnrounded)


         //from Vempele's code https://gist.github.com/Vempele/46333e85e33b6d488c3ffb131942272d
         let bparent = $(".cg-wrap")[0];
         let wclock, bclock;
         let myColor;
         let oppColor;
         wclock = $("div.clock_white");
         wclock = wclock.length ? wclock[0] : null;
         function isFlipped() {
            return bparent.className.includes("orientation-black");
         }
         function get_color() {
            let mycolor = isFlipped() ? "black" : "white";
            let fen_els = $("input.copyable");
            if (fen_els.length > 0)
               mycolor = fen_els[0].value.split(" ")[1] === "w" ? "white" : "black";
            if (wclock) mycolor = wclock.className.includes("clock_bottom") ? "white" : "black";
            return mycolor;
         }
         myColor = get_color();
         oppColor = myColor === 'white' ? 'black' : 'white';

         console.log(myColor, oppColor)
         //end from Vempele's code https://gist.github.com/Vempele/46333e85e33b6d488c3ffb131942272d


         let scriptCollection = document.getElementsByTagName('script');
         let scriptTagWithInfo;/*  = document.getElementsByTagName('script')[2] */
         for (let i = 0; i < scriptCollection.length; i++) {
            if (scriptCollection[i].text.includes('fen')) { scriptTagWithInfo = scriptCollection[i].text }
         }

         let indexOfBoot = scriptTagWithInfo.indexOf('boot(') + 5;
         let parsableGameInfo = scriptTagWithInfo
            .substr(indexOfBoot, scriptTagWithInfo.length-1-indexOfBoot );
         let gameInfo;
         try {
            gameInfo = JSON.parse(parsableGameInfo);
            console.log(gameInfo)
         } catch (e) { console.log(e) };
         startingPositionFEN = gameInfo.data.game.fen;
         startingPieceSet = Chessboard.fenToObj(startingPositionFEN)
         currentPieceSet = startingPieceSet;
         whoseMove = gameInfo.data.game.player;
         isMyMove = myColor === whoseMove ? true : false
         console.log(startingPieceSet, whoseMove, isMyMove)





         window.lichess.pubsub.on('socket.in.move', d => {
            let playerColor = d.ply % 2 == 0 ? "white" : "black";
            if (currentPieceSet === undefined) {
               currentPieceSet = Chessboard.fenToObj(d.fen)
            } else if (lastMoveMadeUCI !== d.uci) {
               currentPieceSet = PiecesObject(currentPieceSet, d.uci);
               consoleNew(currentPieceSet)
            }
            console.log('move', d, playerColor);
            whoseMove = playerColor;
            isMyMove = true;

            //consoleNew(currentPieceSet)
            //console.log(performance.now()-lastPerformanceNow,'socket.in.difference')
         });

         /* window.lichess.pubsub.on('socket.in.crowd', d => {
             console.log('position', d);
         }); */

         /* window.lichess.pubsub.on("socket.send", d => {
             console.log('sent', argguments);
         }) */

         let previousMoveIsClickMove = false;
         const checkIfMoveWasMade = (e) => {
            consoleNew(e)
            console.log(doStopPropagation)
            if (doStopPropagation) { /* e.preventDefault(); */ e.stopPropagation(); }
            if (e.type === downEvent /* 'mousedown' */) {
               timeStampLatest = e.timeStamp;
               if (arrayDownUp.length === 0) {
                  arrayDownUp.push(e) /* down */
               }
               else if (arrayDownUp.length === 2) {
                  arrayDownUp = []; arrayDownUp.push(e)
               }
               /* storeCoordIfSameSquare = {
                      c: [coordObj.dX, coordObj.dY],
                      piece: getPieceFromCoord([coordObj.dX, coordObj.dY])
               } */

               /* resolve({ sameSquare: true, coordObj }); */
               if (isEmpty(storeCoordIfSameSquare === false)) {
                  checkIfPossibleClickMoveWasMade(storeCoordIfSameSquare, e).then(
                     (objResult) => {
                        if (objResult.sameSquare === false) {
                           // previousMoveIsClickMove = false; ?checking if the premove is legal
                           window.postMessage({ type: 'move', objResult }, "*");
                        }
                        else {

                        }
                     }
                  )
               }

            } else {
               console.log(e.timeStamp - timeStampLatest)

               if (arrayDownUp.length === 1) {
                  arrayDownUp.push(e); /* up */
                  getCoordinatesOfDragMove(arrayDownUp).then((objResult) => {

                     // consoleNew(objResult,'from page')
                     if (objResult.same === false) {
                        window.postMessage({ type: 'move', objResult }, "*");
                     }

                  });
               }

               timeStampToMeasureWebSocket = performance.now();
            }
            //  console.log(e, e.type, e.isTrusted, e.offsetX, e.offsetY, e.target.tagName === 'CG-BOARD');
            console.log(arrayDownUp)
         }

         /* storeCoordIfSameSquare = {
               c: [coordObj.dX, coordObj.dY],
               piece: getPieceFromCoord([coordObj.dX, coordObj.dY])
         } */
         const checkIfPossibleClickMoveWasMade = (storeCoordIfSameSquare, e) => {
            return new Promise((resolve, reject) => {
               let coordObj = {
                  dX: storeCoordIfSameSquare.c[0],
                  dY: storeCoordIfSameSquare.c[1],
                  uX: convertOffsetToSquareNumber(e.offsetX),
                  uY: convertOffsetToSquareNumber(e.offsetY),
               }
               if (coordObj.dX === coordObj.uX && coordObj.dY === coordObj.uY) {
                  resolve({ sameSquare: true, coordObj });
               } else {
                  resolve({ sameSquare: false, coordObj });
               }
            })
         }

         const keyEventFunction = (e) => {
            let key = e.key.toLowerCase();

            if (key === premoveKey && e.type === keyDownEvent) {
               doStopPropagation = true;
            }
            else if (key === premoveKey /* keyup */) {
               doStopPropagation = false;
            }
         }


         const getPieceFromCoord = (coordArr) => {
            return false
         }
         const convertOffsetToSquareNumber = (offset) => {
            return Math.floor(offset / sqSizeUnrounded) + 1
         }

         const makeObjectOfCoordinates = (coordArr) => {
            let coordObj = {
               dX: convertOffsetToSquareNumber(coordArr[0].offsetX),
               dY: convertOffsetToSquareNumber(coordArr[0].offsetY),
               uX: convertOffsetToSquareNumber(coordArr[1].offsetX),
               uY: convertOffsetToSquareNumber(coordArr[1].offsetY),
            }
            return coordObj
         }

         let storeCoordIfSameSquare = {};
         const getCoordinatesOfDragMove = (coordArr) => {

            return new Promise((resolve, reject) => {
               let coordObj = makeObjectOfCoordinates(coordArr)
               if (coordObj.dX === coordObj.uX && coordObj.dY === coordObj.uY) {
                  storeCoordIfSameSquare = {
                     c: [coordObj.dX, coordObj.dY],
                     piece: getPieceFromCoord([coordObj.dX, coordObj.dY])
                  }
                  //add a check to see if a piece is present
                  resolve({ same: true, coordObj })
               }
               else {
                  storeCoordIfSameSquare = {}
                  resolve({ same: false, coordObj })
               }

               //console.log(coordObj)

            })

         }

         document.addEventListener(downEvent, checkIfMoveWasMade, true)
         document.addEventListener(upEvent, checkIfMoveWasMade, true)
         setTimeout(() => {
            document.removeEventListener(downEvent, checkIfMoveWasMade, true)
            document.removeEventListener(upEvent, checkIfMoveWasMade, true)
            board = document.getElementsByTagName("cg-board")[0];
            board.addEventListener(downEvent, checkIfMoveWasMade, true)
            board.addEventListener(upEvent, checkIfMoveWasMade, true)
         }, 100);


         document.addEventListener(keyDownEvent, keyEventFunction)
         document.addEventListener(keyUpEvent, keyEventFunction)



         let eventCanvas = document.createEvent("CustomEvent");
         eventCanvas.initCustomEvent("canvas", true, true, { type: 'start', boardWidthUnrounded, boardX, boardY, sqSizeUnrounded });
         document.dispatchEvent(eventCanvas);

         /* let now;
         setTimeout(() => {
             now = performance.now();
             window.postMessage(1, "*");
         }, 2000);
         window.addEventListener("message", function (event) {
             if (event.data === 2) {
                 consoleNew(performance.now() - now)
             }
         }); */

         /* let now;
         setTimeout(() => {
             now = performance.now();
             var eventTest = document.createEvent("CustomEvent");
             eventTest.initCustomEvent("eventTest", true, true, 1);
             document.dispatchEvent(eventTest);
         }, 2000);
         window.addEventListener("eventTest", function (event) {
             if (event.detail === 2) {
                 consoleNew(performance.now() - now)
             }
         }); */


      })
   }, 300);




})();




