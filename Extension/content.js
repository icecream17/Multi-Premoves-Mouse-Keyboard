if (settingsObject.createUI === true) {
    const multiPremoveSettingsString = localStorage.getItem('multiPremoveSettings');
    let multiPremoveSettings = JSON.parse(multiPremoveSettingsString)
    for (const key in multiPremoveSettings) {
        if (!['inMoveDelay', 'outMoveDelay', 'sendToBackgroundToProduceSound', 'createUI', 'downEvent', 'upEvent', 'moveEvent', 'handleTouchscreens', 'detectPrevKB'].includes(key)) {
            settingsObject[key] = multiPremoveSettings[key]
        }
        //settingsObject[key] = multiPremoveSettings[key]
    }
}

let useUltrabulletTheme = settingsObject.useUltrabulletTheme;
let animateMultipremoves = settingsObject.animateMultipremoves

if (useUltrabulletTheme === true) {
    let documentBodyObserver;
    let configBoard = {
        childList: true
    };
    let disableDrags = ``
    if (animateMultipremoves === false) {
        disableDrags = `piece.dragging {
            display: none; 
            pointer-events: none;
         }`
    }
    documentBodyObserver = new MutationObserver((mutations, observer) => {
        //console.log(mutations)
        if (document.body) {
            let head = document.head || document.getElementsByTagName('head')[0],
                style = document.createElement('style');
            head.appendChild(style);
            style.type = 'text/css';
            style.appendChild(document.createTextNode(ultraCss + disableDrags));
            observer.disconnect();
        }
    });
    documentBodyObserver.observe(document.getElementsByTagName('html')[0], configBoard);
}


let isGame = /^https:\/\/(lichess\.org|lichess\.dev|mskchess\.ru)\/(\w{8}|\w{12})(\/white|\/black)?$/.test(window.location.href);

if (settingsObject.createUI === true) {
    chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
            if (request.type === "requireSettings") {
                let settings = JSON.stringify(settingsObject)
                sendResponse({ settings: settings });
            } else if (request.type === "returnSettings") {
                let multiPremoveSettings = JSON.parse(request.object)
                for (const key in multiPremoveSettings) {
                    settingsObject[key] = multiPremoveSettings[key]
                }
                localStorage.setItem('multiPremoveSettings', JSON.stringify(settingsObject));
                window.postMessage({
                    type: 'settings', object: settingsObject
                }, "*");
            }
        });
}

if (isGame === true) {

    //variables from settings 
    /* let useKeyboard = settingsObject.useKeyboard;
    let useMouse = settingsObject.useMouse;
    let rightButtonMulti = settingsObject.rightButton === 'multipremove';
    let useLeftButton = (!!settingsObject.leftButton && !useMouse); */
    let drawTimeRatio = settingsObject.drawTimeRatio;
    let sendToBackgroundToProduceSound = settingsObject.sendToBackgroundToProduceSound;
    let useMouse = settingsObject.useMouse;
    let experimentalArrows = settingsObject.experimentalArrows;

    /* if (experimentalArrows === true) {
window.expArrowFunction = () => {
} 
    }
    */

    // end of variables from settings


    (() => {
        let settingsjs = document.createElement('script');
        let script = document.createElement('script');
        let chessjs = document.createElement('script');
        /* let jquery = document.createElement('script'); */

        settingsjs.src = chrome.runtime.getURL('settings.js');
        settingsjs.onload = function () {
            this.remove();
        };
        script.src = chrome.runtime.getURL('script.js');
        script.onload = function () {
            this.remove();
        };
        chessjs.src = chrome.runtime.getURL('chess.js');
        chessjs.onload = function () {
            this.remove();
        };


        /* jquery.src = chrome.runtime.getURL('jquery-3.5.1.slim.min.js');
        jquery.onload = function () {
            this.remove();
        }; */
        /* (document.head || document.documentElement).appendChild(jquery); */
        (document.head || document.documentElement).appendChild(settingsjs);
        (document.head || document.documentElement).appendChild(chessjs);
        (document.head || document.documentElement).appendChild(script);

        /* let sendToBackgroundToProduceSound = true;
        let drawTimeRatio = true; */
        var lastMoveIndicator, lastMoveIndicator2;

        var ConvertToDigits = {
            a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8
        };

        var bW, bX, bY, sqS;



        /* let sendToBackgroundToProduceSound = false;
        let drawTimeRatio = false; */

        let worker; var useWorkerGlobal = false; let workerFallback;
        let canvas = document.createElement('canvas');

        let canvasRatio;
        if (drawTimeRatio === true) {
            canvasRatio = document.createElement('canvas');
        }

        const getTimeFromClocks = (clock) => {  //code from https://github.com/pukhrajbal/lichess-clock
            let timer = clock.getElementsByClassName("time")[0];
            if (timer) {
                let textInfo = timer.textContent;
                let parts = textInfo.trim().split(':');
                let m = parseInt(parts[0]);
                let secParts = parts[1].split('.');
                let s = parseInt(secParts[0]);
                let h = secParts.length > 1 ? parseInt(secParts[1].substr(0, 1)) : 0;
                let val = m * 60 + s + h / 10;
                return val;
            } else { return 0; }
        }



        /* if (useUltrabulletTheme === true) {
            chrome.runtime.sendMessage({ type: "theme" });
        } */



        if (drawTimeRatio === true) {
            let myClock, opClock;
            let configClock = {
                childList: true
            };
            let clockObserver = new MutationObserver((mutations, observer) => {
                //console.log(mutations)
                let myTime = getTimeFromClocks(myClock),
                    opTime = getTimeFromClocks(opClock);
                if (useWorkerGlobal === true) {
                    worker.postMessage({ type: 'clock', data: { myTime, opTime } });
                } else {
                    workerFallback.clock(myTime, opTime)
                }
            });

            setTimeout(() => {

                //sendToBackgroundToProduceSound

                myClock = document.getElementsByClassName('rclock rclock-bottom')[0],
                    opClock = document.getElementsByClassName('rclock rclock-top')[0];
                let myTimeEl = myClock.getElementsByClassName("time")[0];
                let oppTimeEl = opClock.getElementsByClassName("time")[0];
                clockObserver.observe(myTimeEl, configClock);
                clockObserver.observe(oppTimeEl, configClock);
                /*  setInterval(function () {
                     let myTime = getTimeFromClocks(myClock),
                         opTime = getTimeFromClocks(opClock);
                     if (useWorkerGlobal === true) {
                         worker.postMessage({ type: 'clock', data: { myTime, opTime } });
                     } else {
                         workerFallback.clock(myTime, opTime)
                     }
                 }, 100) */
            }, 600);
        }








        const createCanvasForOffscreenPainting = (boardWidthUnrounded, boardX, boardY, sqSizeUnrounded, useWorker, myColor) => {

            boardWidthUnrounded = bW = Math.round(boardWidthUnrounded), boardX = bX = Math.round(boardX), boardY = bY = Math.round(boardY), sqSizeUnrounded = sqS = Math.round(sqSizeUnrounded)
            /* bW, bX, bY, sqS; */
            let lichessElement = document.body;
            let shadowHost = document.createElement('div')
            shadowHost.id = "shadowHostId"
            lichessElement.appendChild(shadowHost)
            let shadowDom = shadowHost.attachShadow({ mode: "open" });
            canvas.id = 'canvasId';
            shadowDom.appendChild(canvas);
            canvas.width = boardWidthUnrounded;
            canvas.height = boardWidthUnrounded;
            canvas.style.position = 'absolute';
            canvas.style.left = boardX + "px";
            canvas.style.top = boardY + "px";
            canvas.style.zIndex = 100;
            canvas.style.pointerEvents = 'none';


            if (sendToBackgroundToProduceSound === true) {
                //setTimeout(() => {
                lastMoveIndicator = document.createElement('div');
                lastMoveIndicator.style.height = '10px'
                lastMoveIndicator.style.width = sqSizeUnrounded + 'px'
                lastMoveIndicator.style.backgroundColor = "#ff2ac2"
                lastMoveIndicator.style.position = 'absolute'
                lastMoveIndicator.style.pointerEvents = 'none'
                lastMoveIndicator.style.zIndex = '110'
                lastMoveIndicator.style.display = 'none'
                //document.body.appendChild(lastMoveIndicator)
                shadowDom.appendChild(lastMoveIndicator);

                lastMoveIndicator2 = document.createElement('div');
                lastMoveIndicator2.style.height = '10px'
                lastMoveIndicator2.style.width = sqSizeUnrounded + 'px'
                lastMoveIndicator2.style.backgroundColor = "#79145C"
                lastMoveIndicator2.style.position = 'absolute'
                lastMoveIndicator2.style.pointerEvents = 'none'
                lastMoveIndicator2.style.zIndex = '110'
                lastMoveIndicator2.style.display = 'none'
                //document.body.appendChild(lastMoveIndicator2)
                shadowDom.appendChild(lastMoveIndicator2);
                //}, 300);
            }

            if (useWorker === true) {
                createWorker();
                useWorkerGlobal = true;
                const offscreenCanvas = canvas.transferControlToOffscreen();
                worker.postMessage({
                    type: 'init', canvas: offscreenCanvas,
                    size: { boardWidthUnrounded, boardX, boardY, sqSizeUnrounded }
                }, [offscreenCanvas]);
            } else {
                window.context = canvas.getContext('2d');
                window.boardWidthUnrounded = boardWidthUnrounded,
                    window.halfBoard = boardWidthUnrounded / 2;
                window.boardX = boardX,
                    window.boardY = boardY,
                    window.sqSizeUnrounded = sqSizeUnrounded,
                    window.halfSquare = sqSizeUnrounded / 2;
                window.arrayOfArrows = [];

                let opacity = 0.6;
                canvas.style.opacity = 0.7;
                if (useUltrabulletTheme === true) {
                    canvas.style.opacity = 1;
                    //if (experimentalArrows === false) {
                    opacity = 0.8;
                    //}
                    window.pieceColors = {
                        pawn: "180, 180, 180",
                        knight: "71, 159, 25",
                        bishop: "231, 241, 35",
                        rook: "148, 21, 177",
                        queen: "22, 239, 239",
                        king: "0, 0, 0"
                    }

                } else {
                    window.pieceColors = {
                        pawn: "180, 180, 180",
                        knight: "5, 58, 0",
                        bishop: "105, 100, 1",
                        rook: "50, 0, 49",
                        queen: "34, 120, 122",
                        king: "0, 0, 0"
                    }
                    if (experimentalArrows === false) {
                        opacity = 0.5;
                        canvas.style.opacity = 1;
                    }
                }
                window.turnCoordIntoPixels = (n) => {
                    return (n * 2 - 1) * halfSquare
                }

                window.drawArrow = (fromX, fromY, toX, toY, color) => {
                    if (experimentalArrows === false) {
                        context.strokeStyle = `rgba(${color}, ${opacity})`;
                        context.fillStyle = `rgba(${color}, 1)`;
                        let headLen = 14;
                        let angle = Math.atan2(toY - fromY, toX - fromX);
                        context.beginPath();
                        context.moveTo(fromX, fromY);
                        context.lineTo(toX, toY);
                        context.lineWidth = 7;
                        context.stroke();
                        context.beginPath();
                        context.moveTo(toX, toY);

                        let divider = 7;
                        let secondPoint = [toX - headLen * Math.cos(angle - Math.PI / divider), toY - headLen * Math.sin(angle - Math.PI / divider)]
                        let thirdPoint = [toX - headLen * Math.cos(angle + Math.PI / divider), toY - headLen * Math.sin(angle + Math.PI / divider)]
                        context.lineTo(secondPoint[0], secondPoint[1]);
                        context.lineTo(thirdPoint[0], thirdPoint[1]);
                        context.lineTo(toX, toY);
                        context.lineTo(secondPoint[0], secondPoint[1]);
                        context.lineWidth = 7;
                        /* context.lineTo(toX - headLen * Math.cos(angle - Math.PI / 7), toY - headLen * Math.sin(angle - Math.PI / 7));
                        context.lineTo(toX - headLen * Math.cos(angle + Math.PI / 7), toY - headLen * Math.sin(angle + Math.PI / 7));
                        context.lineTo(toX, toY);
                        context.lineTo(toX - headLen * Math.cos(angle - Math.PI / 7), toY - headLen * Math.sin(angle - Math.PI / 7));
                        context.lineWidth = 7; */
                        context.strokeStyle = `rgba(${color}, 1)`;
                        context.stroke();
                        context.fill();
                        context.closePath();
                    } else {
                        //context.strokeStyle = `rgba(${color}, ${opacity})`;
                        context.fillStyle = `rgba(${color}, 1)`;
                        context.beginPath();
                        context.arrow(fromX, fromY, toX, toY, [-20, -5, -20, 5, -20, 15]);
                        //context.arrow(fromX, fromY, toX, toY, [0, 5, -20, 5, -20, 15]);

                        context.fill();
                        context.closePath();
                    }
                }


                if (experimentalArrows === true) { //https://github.com/frogcat/canvas-arrow
                    (function (target) {
                        if (!target || !target.prototype)
                            return;
                        target.prototype.arrow = function (startX, startY, endX, endY, controlPoints) {
                            var dx = endX - startX;
                            var dy = endY - startY;
                            var len = Math.sqrt(dx * dx + dy * dy)/*  - 20 */;
                            //console.log(len)
                            var sin = dy / len;
                            var cos = dx / len;
                            var a = [];
                            a.push(0, 0);
                            for (var i = 0; i < controlPoints.length; i += 2) {
                                var x = controlPoints[i];
                                var y = controlPoints[i + 1];
                                a.push(x < 0 ? len + x : x, y);
                            }
                            a.push(len, 0);
                            for (var i = controlPoints.length; i > 0; i -= 2) {
                                var x = controlPoints[i - 2];
                                var y = controlPoints[i - 1];
                                a.push(x < 0 ? len + x : x, -y);
                            }
                            a.push(0, 0);
                            for (var i = 0; i < a.length; i += 2) {
                                var x = a[i] * cos - a[i + 1] * sin + startX;
                                var y = a[i] * sin + a[i + 1] * cos + startY;
                                if (i === 0) this.moveTo(x, y);
                                else this.lineTo(x, y);
                            }
                        };
                    })(CanvasRenderingContext2D);
                }


            }

            if (drawTimeRatio === true) {
                /* let sqsize = Math.round(sqSizeUnrounded)
                let boardWidth = Math.round(boardWidthUnrounded)
                let x0 = Math.round(boardX);
                let y0 = Math.round(boardY); */
                let sqsize = sqSizeUnrounded
                let boardWidth = boardWidthUnrounded
                let x0 = boardX;
                let y0 = boardY;
                canvasRatio.id = 'canvasRatioId';
                shadowDom.appendChild(canvasRatio);
                canvasRatio.width = sqsize * 2;
                canvasRatio.height = boardWidth;
                canvasRatio.style.position = 'absolute';
                canvasRatio.style.left = x0 + sqsize * 3 + "px";
                canvasRatio.style.top = y0 + "px";
                canvasRatio.style.zIndex = 101;
                canvasRatio.style.pointerEvents = 'none';

                if (useWorker === true) {
                    const offscreenCanvasRatio = canvasRatio.transferControlToOffscreen();
                    worker.postMessage({
                        type: 'initRatio', canvas: offscreenCanvasRatio,
                        size: { boardWidth, x0, y0, sqsize }
                    }, [offscreenCanvasRatio]);
                } else {
                    window.contextRatio = canvasRatio.getContext('2d');
                    window.boardWidthRatio = boardWidth,
                        window.sqSize = sqsize;
                    window.drawClockRatio = (myTime, opTime) => {
                        let myBurner, opBurner;
                        if (myTime === opTime) {
                            myBurner = 0;
                            opBurner = 0;
                        } else if (myTime > opTime) {
                            myBurner = ((myTime - opTime) / myTime);
                            opBurner = 0;
                        } else {
                            opBurner = ((opTime - myTime) / opTime);
                            myBurner = 0;
                        }
                        contextRatio.clearRect(0, 0, canvasRatio.width, canvasRatio.height);
                        contextRatio.beginPath();
                        contextRatio.rect(0, boardWidthRatio / 2 - 6, sqSize * 2 * ((myTime) / 15), 6);
                        contextRatio.fillStyle = '#800045';
                        contextRatio.fill();
                        contextRatio.beginPath();
                        contextRatio.rect(0, boardWidthRatio / 2, sqSize * 2 * ((myTime) / 15), 12);
                        contextRatio.fillStyle = '#5B0070';
                        contextRatio.fill();
                        contextRatio.closePath();
                        contextRatio.beginPath();
                        contextRatio.rect(sqSize - 8, (boardWidthRatio / 2) * (1 - myBurner), 12, boardWidthRatio / 2 * myBurner);
                        contextRatio.fillStyle = 'blue';
                        contextRatio.fill();
                        contextRatio.beginPath();
                        contextRatio.rect(sqSize + 4, (boardWidthRatio / 2) * (1 - myBurner), 12, boardWidthRatio / 2 * myBurner);
                        contextRatio.fillStyle = '#35FF00';
                        contextRatio.fill();
                        contextRatio.closePath();
                        contextRatio.beginPath();
                        contextRatio.rect(sqSize - 8, boardWidthRatio / 2, 12, boardWidthRatio / 2 * opBurner);
                        contextRatio.fillStyle = 'red';
                        contextRatio.fill();
                        contextRatio.beginPath();
                        contextRatio.rect(sqSize + 4, boardWidthRatio / 2, 12, boardWidthRatio / 2 * opBurner);
                        contextRatio.fillStyle = '#D900FF';
                        contextRatio.fill();
                        contextRatio.closePath();
                    }
                }
            }

            if (animateMultipremoves === true) {

                let canvasMoves = document.createElement('canvas');
                canvasMoves.id = 'canvasMovesId';
                shadowDom.appendChild(canvasMoves);
                canvasMoves.width = boardWidthUnrounded;
                canvasMoves.height = boardWidthUnrounded;
                canvasMoves.style.position = 'absolute';
                canvasMoves.style.left = boardX + "px";
                canvasMoves.style.top = boardY + "px";
                canvasMoves.style.top = boardY + "px";
                canvasMoves.style.zIndex = 100;
                canvasMoves.style.pointerEvents = 'none';
                let arrOfPieceNames = ['pawn', 'knight', 'knight', 'bishop', 'rook', 'rook', 'queen', 'king']
                let pieceImages = {}
                let n = 0; let previousPieceName, number = "";
                for (let i = 0; i < arrOfPieceNames.length; i++) {
                    if (previousPieceName === arrOfPieceNames[i]) {
                        n = n === 1 ? 0 : 1;
                        number = number === 'second' ? '' : 'second'
                    }
                    else {
                        if (myColor === 'white') {
                            n = 0;
                            number = "";
                        } else if (arrOfPieceNames[i] === 'knight' || arrOfPieceNames[i] === 'rook') {
                            n = 1;
                            number = "";
                        } else {
                            n = 0;
                            number = "";
                        }
                    }
                    let el = document.getElementsByClassName(`${myColor} ${arrOfPieceNames[i]}`)[n];
                    if (el === undefined && n === 1) {
                        el = document.getElementsByClassName(`${myColor} ${arrOfPieceNames[i]}`)[0];
                    }
                    if (el) {
                        let key = number + (number !== "" ? arrOfPieceNames[i].substr(0, 1).toUpperCase() : arrOfPieceNames[i].substr(0, 1)) + arrOfPieceNames[i].substr(1)
                        pieceImages[key] = new Image();
                        pieceImages[key].src = window.getComputedStyle(el, false).backgroundImage.slice(4, -1).replace(/"/g, "")
                    }
                    previousPieceName = arrOfPieceNames[i];
                    //n = 0; 
                    //number = "";
                }
                // console.log(pieceImages)
                window.contextMoves = canvasMoves.getContext('2d');
                contextMoves.globalAlpha = 0.8;
                window.previousPieceToDeleteLater = [];

                window.drawDragAnimation = (fromX, fromY, toX, toY, piece) => {
                    if (previousPieceToDeleteLater.length !== 0) {
                        contextMoves.clearRect(previousPieceToDeleteLater[0], previousPieceToDeleteLater[1], sqS, sqS);
                    }
                    previousPieceToDeleteLater.length = 0;
                    previousPieceToDeleteLater.push(toX - sqS / 2, toY - sqS / 2)
                    // console.log(pieceImages[piece], Math.round(previousPieceToDeleteLater[0]), Math.round(previousPieceToDeleteLater[1]))
                    contextMoves.drawImage(pieceImages[piece], Math.round(previousPieceToDeleteLater[0]), Math.round(previousPieceToDeleteLater[1]), sqS, sqS);
                    // console.log(previousPieceToDeleteLater)
                }

                // reading mousemove and drag inside content to maybe increase performance (otherwise the animation seems a bit laggy). Not sure if it's better.
                window.isDraggingNow = false;
                document.addEventListener('mousemove', (e) => {
                    if (window.isDraggingNow === true) {
                        let cx = e.clientX;
                        let cy = e.clientY;
                        let boardx = cx - boardX;
                        let boardy = cy - boardY;
                        requestAnimationFrame(() => {
                            drawDragAnimation(undefined, undefined, boardx, boardy, window.draggedPiece);
                        })
                    }
                })
                //
            }



            if (useMouse === true) {
                let selectedSquareEl = document.createElement('div')
                selectedSquareEl.style.height = sqS + 'px'
                selectedSquareEl.style.width = sqS + 'px'
                selectedSquareEl.style.backgroundColor = "rgba(20,85,30,0.5)"
                selectedSquareEl.style.position = 'absolute'
                selectedSquareEl.style.pointerEvents = 'none'
                selectedSquareEl.style.zIndex = 'auto'
                selectedSquareEl.style.display = 'none'
                //document.body.appendChild(selectedSquareEl)
                shadowDom.appendChild(selectedSquareEl);

                window.showSelected = (x, y) => {
                    selectedSquareEl.style.left = String(bX + (x - 1) * sqS) + 'px'
                    selectedSquareEl.style.top = String(bY + (8 - y) * sqS) + 'px'
                    selectedSquareEl.style.display = 'block'
                }
                window.hideSelected = () => {
                    selectedSquareEl.style.display = 'none'
                }
            }

        }

        window.addEventListener("message", function (event) {
            switch (event.data.type) {
                case "start":
                    let data = event.data.data;
                    createCanvasForOffscreenPainting(data.boardWidthUnrounded, data.boardX, data.boardY, data.sqSizeUnrounded, data.useWorker, data.myColor)
                    break;
                case "move":
                    let objResult = event.data.coordObj;
                    if (useWorkerGlobal === true) {
                        worker.postMessage({ type: 'move', objResult });
                    } else {
                        workerFallback.move(objResult)
                    }
                    break;
                case "delete":
                    if (useWorkerGlobal === true) {
                        worker.postMessage({ type: 'delete' });
                    } else { workerFallback.delete() }
                    break;
                case "deleteAll":
                    if (useWorkerGlobal === true) {
                        worker.postMessage({ type: 'deleteAll' });
                    }
                    else { workerFallback.deleteAll() }
                    break;
                case "out":
                    if (sendToBackgroundToProduceSound === true) {
                        chrome.runtime.sendMessage({ beep: "do1" });
                        lastMoveIndicator.style.display = 'none'
                        lastMoveIndicator2.style.display = 'none'
                    }
                    break;
                case "in":
                    if (sendToBackgroundToProduceSound === true) {
                        chrome.runtime.sendMessage({ beep: "do" });

                        let move = [event.data.move.substr(0, 2), event.data.move.substr(2, 4)]
                        let position1 = [ConvertToDigits[move[1][0]], Number(move[1][1])]
                        let position2 = [ConvertToDigits[move[0][0]], Number(move[0][1])]
                        if (event.data.myColor === 'white') {
                            position1[1] = 9 - position1[1]
                            position2[1] = 9 - position2[1]
                        } else {
                            position1[0] = 9 - position1[0]
                            position2[0] = 9 - position2[0]
                        }
                        lastMoveIndicator.style.left = String(bX + (position1[0] - 1) * sqS) + 'px'
                        lastMoveIndicator.style.top = String(bY + position1[1] * sqS - 10) + 'px'
                        lastMoveIndicator.style.display = 'block'

                        lastMoveIndicator2.style.left = String(bX + (position2[0] - 1) * sqS) + 'px'
                        lastMoveIndicator2.style.top = String(bY + position2[1] * sqS - 10) + 'px'
                        lastMoveIndicator2.style.display = 'block'
                        setTimeout(() => {
                            lastMoveIndicator.style.display = 'none'
                            lastMoveIndicator2.style.display = 'none'
                        }, 150);
                    }
                    break;
                case "clock":
                    if (drawTimeRatio === true) {


                    }
                    break;
                case "drag":
                    if (animateMultipremoves === true) {
                        if (event.data.phase === 'drag') {
                            let coordinates = event.data.coordinates
                            window.isDraggingNow = true;
                            window.draggedPiece = event.data.piece;
                            requestAnimationFrame(() => {
                                drawDragAnimation(undefined, undefined, coordinates[0], coordinates[1], event.data.piece);
                            })
                        } else {
                            window.isDraggingNow = false;
                            requestAnimationFrame(() => {
                                contextMoves.clearRect(previousPieceToDeleteLater[0], previousPieceToDeleteLater[1], sqS, sqS);
                            })
                        }
                    }
                    break;
                case "selected":
                    if (useMouse === true) {
                        if (event.data.selected === true) {
                            showSelected(event.data.x, 9 - event.data.y)
                        } else {
                            hideSelected()
                        }

                    }
                    break;

                default:
                    break;
            }

        });


        workerFallback = {
            move: (objResult) => {
                let c = objResult;
                let coordArr =
                    [turnCoordIntoPixels(c.dX),
                    turnCoordIntoPixels(c.dY),
                    turnCoordIntoPixels(c.uX),
                    turnCoordIntoPixels(c.uY)]
                requestAnimationFrame(() => {
                    drawArrow(coordArr[0], coordArr[1], coordArr[2], coordArr[3], pieceColors[c.piece])
                });

                arrayOfArrows.push(c);

            },
            delete: () => {
                arrayOfArrows.splice(0, 1)
                requestAnimationFrame(() => {
                    context.clearRect(0, 0, canvas.width, halfBoard);
                    context.clearRect(0, halfBoard, canvas.width, boardWidthUnrounded);

                    for (let i = 0; i < arrayOfArrows.length; i++) {

                        let c = arrayOfArrows[i];
                        let coordArr =
                            [turnCoordIntoPixels(c.dX),
                            turnCoordIntoPixels(c.dY),
                            turnCoordIntoPixels(c.uX),
                            turnCoordIntoPixels(c.uY)]
                        drawArrow(coordArr[0], coordArr[1], coordArr[2], coordArr[3], pieceColors[c.piece])
                    }
                })
            },
            deleteAll: () => {
                arrayOfArrows = []
                requestAnimationFrame(() => {
                    context.clearRect(0, 0, canvas.width, halfBoard);
                    context.clearRect(0, halfBoard, canvas.width, boardWidthUnrounded);
                })
            },
            clock: (myTime, opTime) => {
                if (window.drawClockRatio !== undefined) {
                    requestAnimationFrame(() => {
                        drawClockRatio(myTime, opTime)
                    })
                }
            },

        }

        let workerCode = () => {
            let canvas;
            let canvasRatio, contextRatio;
            let context;
            let boardWidthUnrounded, boardX, boardY, sqSizeUnrounded, halfSquare;
            let boardWidthRatio, ratioX, ratioY, sqSize;
            let arrayOfArrows = [];
            let pieceColors = {
                pawn: "180, 180, 180",
                knight: "71, 159, 25",
                bishop: "231, 241, 35",
                rook: "148, 21, 177",
                queen: "22, 239, 239",
                king: "0, 0, 0"

            }
            this.onmessage = function (e) {
                switch (e.data.type) {
                    case 'init':
                        canvas = e.data.canvas;
                        context = canvas.getContext('2d');
                        boardWidthUnrounded = e.data.size.boardWidthUnrounded,
                            halfBoard = boardWidthUnrounded / 2;
                        boardX = e.data.size.boardX,
                            boardY = e.data.size.boardY,
                            sqSizeUnrounded = e.data.size.sqSizeUnrounded,
                            halfSquare = sqSizeUnrounded / 2;
                        break;
                    case 'move':
                        let objResult = e.data.objResult
                        let c = objResult;
                        //requestAnimationFrame(() => {
                        drawArrow(
                            turnCoordIntoPixels(c.dX),
                            turnCoordIntoPixels(c.dY),
                            turnCoordIntoPixels(c.uX),
                            turnCoordIntoPixels(c.uY),
                            pieceColors[c.piece])
                        arrayOfArrows.push(c);
                        break;
                    case 'delete':
                        arrayOfArrows.splice(0, 1)
                        context.clearRect(0, 0, canvas.width, halfBoard);
                        context.clearRect(0, halfBoard, canvas.width, boardWidthUnrounded);
                        for (let i = 0; i < arrayOfArrows.length; i++) {
                            let c = arrayOfArrows[i];
                            drawArrow(
                                turnCoordIntoPixels(c.dX),
                                turnCoordIntoPixels(c.dY),
                                turnCoordIntoPixels(c.uX),
                                turnCoordIntoPixels(c.uY),
                                pieceColors[c.piece])
                        }
                        break;
                    case 'deleteAll':
                        arrayOfArrows = []
                        context.clearRect(0, 0, canvas.width, halfBoard);
                        context.clearRect(0, halfBoard, canvas.width, boardWidthUnrounded);
                        break;
                    case 'initRatio':
                        canvasRatio = e.data.canvas; //canvasRatio, contextRatio
                        contextRatio = canvasRatio.getContext('2d');
                        boardWidthRatio = e.data.size.boardWidth,
                            ratioX = e.data.size.x0,
                            ratioY = e.data.size.y0,
                            sqSize = e.data.size.sqsize;
                        break;
                    case 'clock':
                        drawClockRatio(e.data.data.myTime, e.data.data.opTime)
                        break;
                    default:
                        break;
                }

            };

            const drawClockRatio = (myTime, opTime) => {
                if (myTime === opTime) {
                    myBurner = 0;
                    opBurner = 0;
                } else if (myTime > opTime) {
                    myBurner = ((myTime - opTime) / myTime);
                    opBurner = 0;
                } else {
                    opBurner = ((opTime - myTime) / opTime);
                    myBurner = 0;
                }

                contextRatio.clearRect(0, 0, canvasRatio.width, canvasRatio.height);
                contextRatio.beginPath();
                contextRatio.rect(0, boardWidthRatio / 2 - 6, sqSize * 2 * ((myTime) / 15), 6);
                contextRatio.fillStyle = '#800045';
                contextRatio.fill();
                contextRatio.beginPath();
                contextRatio.rect(0, boardWidthRatio / 2, sqSize * 2 * ((myTime) / 15), 12);
                contextRatio.fillStyle = '#5B0070';
                contextRatio.fill();
                contextRatio.closePath();
                contextRatio.beginPath();
                contextRatio.rect(sqSize - 8, (boardWidthRatio / 2) * (1 - myBurner), 12, boardWidthRatio / 2 * myBurner);
                contextRatio.fillStyle = 'blue';
                contextRatio.fill();
                contextRatio.beginPath();
                contextRatio.rect(sqSize + 4, (boardWidthRatio / 2) * (1 - myBurner), 12, boardWidthRatio / 2 * myBurner);
                contextRatio.fillStyle = '#35FF00';
                contextRatio.fill();
                contextRatio.closePath();
                contextRatio.beginPath();
                contextRatio.rect(sqSize - 8, boardWidthRatio / 2, 12, boardWidthRatio / 2 * opBurner);
                contextRatio.fillStyle = 'red';
                contextRatio.fill();
                contextRatio.beginPath();
                contextRatio.rect(sqSize + 4, boardWidthRatio / 2, 12, boardWidthRatio / 2 * opBurner);
                contextRatio.fillStyle = '#D900FF';
                contextRatio.fill();
                contextRatio.closePath();
            }

            const turnCoordIntoPixels = (n) => {
                return (n * 2 - 1) * halfSquare
            }

            const drawArrow = (fromX, fromY, toX, toY, color) => {
                context.strokeStyle = `rgba(${color}, 0.8)`;
                context.fillStyle = `rgba(${color}, 1)`;
                let headLen = 14;
                let angle = Math.atan2(toY - fromY, toX - fromX);
                context.beginPath();
                context.moveTo(fromX, fromY);
                context.lineTo(toX, toY);
                context.lineWidth = 7;
                context.stroke();
                context.beginPath();
                context.moveTo(toX, toY);
                context.lineTo(toX - headLen * Math.cos(angle - Math.PI / 7), toY - headLen * Math.sin(angle - Math.PI / 7));
                context.lineTo(toX - headLen * Math.cos(angle + Math.PI / 7), toY - headLen * Math.sin(angle + Math.PI / 7));
                context.lineTo(toX, toY);
                context.lineTo(toX - headLen * Math.cos(angle - Math.PI / 7), toY - headLen * Math.sin(angle - Math.PI / 7));
                context.lineWidth = 7;
                context.strokeStyle = `rgba(${color}, 1)`;
                context.stroke();
                context.fill();
            }

        }


        const createWorker = () => {
            worker = new Worker('data:application/javascript,' +
                encodeURIComponent(`(${workerCode.toString()})()`));
            worker.onmessage = (e) => {
            }
            //worker.postMessage("hello");
        }
    })()

}

var ultraCss =
    `
.rclock .time {
    background: #000000;
 }
 
 .rclock-bottom {
 
    z-index: -4 !important;
    border-radius: 0 0 27px 2px;
    width: 900px;
    margin-top: 80px;
 }
 
 .rclock .time {
    display: inline-block;
    border: -0px solid #000;
    margin-left: -300px;
    margin-top: -95px;
    z-index: -4 !important;
    padding: -0 0px;
    font-size: 170px;
    font-family: 'Roboto Mono', 'Roboto' !important;
    font-weight: bolder !important;
    height: 154px;
    line-height: 170px;
    width: 900px;
 }
 
 
 .rclock-top {
    border-top: 100;
    z-index: -4 !important;
    border-radius: 0 0 27px 2px;
    width: 900px;
    margin-top: 56px;
 }
 
 .rmoves {
    display: none;
 }
 
 /*
 #div1 {
    z-index: 100;
    margin-top: 100px;
 }*/
 
 .material {
    display: none;
 }
 
 
 
 
 
 
 .is2d piece.bishop.white {
     background-image: url(data:image/png;base64,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);
 }
 
 .is2d piece.queen.white {
     background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNDUgNDUiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDQ1IDQ1OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PHN0eWxlIHR5cGU9InRleHQvY3NzIj4uc3Qwe2Rpc3BsYXk6bm9uZTt9LnN0MXtkaXNwbGF5OmlubGluZTtmaWxsOiNGRkZGRkY7c3Ryb2tlOiMwMDAwMDA7c3Ryb2tlLXdpZHRoOjEuNTtzdHJva2UtbGluZWNhcDpyb3VuZDtzdHJva2UtbGluZWpvaW46cm91bmQ7fS5zdDJ7ZGlzcGxheTppbmxpbmU7ZmlsbDojRkZGRkZGO3N0cm9rZTojMDAwMDAwO3N0cm9rZS13aWR0aDoxLjU7c3Ryb2tlLWxpbmVqb2luOnJvdW5kO30uc3Qze2Rpc3BsYXk6aW5saW5lO2ZpbGw6bm9uZTtzdHJva2U6IzAwMDAwMDtzdHJva2Utd2lkdGg6MS41O3N0cm9rZS1saW5lY2FwOnJvdW5kO3N0cm9rZS1saW5lam9pbjpyb3VuZDt9LnN0NHtmaWxsOiNGRkZGRkY7c3Ryb2tlOiMwMDVBNUU7c3Ryb2tlLXdpZHRoOjEuNDE5ODtzdHJva2UtbWl0ZXJsaW1pdDoxMDt9LnN0NXtmaWxsOiNGRkZGRkY7c3Ryb2tlOiMwMEUxRkY7c3Ryb2tlLXdpZHRoOjIuMzc2O3N0cm9rZS1taXRlcmxpbWl0OjEwO308L3N0eWxlPjxnIGNsYXNzPSJzdDAiPjxwYXRoIGNsYXNzPSJzdDEiIGQ9Ik04LDEyYzAsMS4xLTAuOSwyLTIsMnMtMi0wLjktMi0yczAuOS0yLDItMlM4LDEwLjksOCwxMnogTTI0LjUsNy41YzAsMS4xLTAuOSwyLTIsMnMtMi0wLjktMi0yczAuOS0yLDItMlMyNC41LDYuNCwyNC41LDcuNXogTTQxLDEyYzAsMS4xLTAuOSwyLTIsMnMtMi0wLjktMi0yczAuOS0yLDItMlM0MSwxMC45LDQxLDEyeiBNMTYsOC41YzAsMS4xLTAuOSwyLTIsMnMtMi0wLjktMi0yczAuOS0yLDItMlMxNiw3LjQsMTYsOC41eiBNMzMsOWMwLDEuMS0wLjksMi0yLDJjLTEuMSwwLTItMC45LTItMnMwLjktMiwyLTJDMzIuMSw3LDMzLDcuOSwzMyw5eiIvPjxwYXRoIGNsYXNzPSJzdDIiIGQ9Ik05LDI2YzguNS0xLjUsMjEtMS41LDI3LDBsMi0xMmwtNywxMVYxMWwtNS41LDEzLjVsLTMtMTVsLTMsMTVsLTUuNS0xNFYyNUw3LDE0TDksMjZ6Ii8+PHBhdGggY2xhc3M9InN0MiIgZD0iTTksMjZjMCwyLDEuNSwyLDIuNSw0YzEsMS41LDEsMSwwLjUsMy41Yy0xLjUsMS0xLjUsMi41LTEuNSwyLjVDOSwzNy41LDExLDM4LjUsMTEsMzguNWM2LjUsMSwxNi41LDEsMjMsMGMwLDAsMS41LTEsMC0yLjVjMCwwLDAuNS0xLjUtMS0yLjVjLTAuNS0yLjUtMC41LTIsMC41LTMuNWMxLTIsMi41LTIsMi41LTRDMjcuNSwyNC41LDE3LjUsMjQuNSw5LDI2eiIvPjxwYXRoIGNsYXNzPSJzdDMiIGQ9Ik0xMS41LDMwYzMuNS0xLDE4LjUtMSwyMiwwIE0xMiwzMy41YzYtMSwxNS0xLDIxLDAiLz48L2c+PHBvbHlnb24gY2xhc3M9InN0NCIgcG9pbnRzPSIzNC45LDM3LjkgMjYsMzEuNSAyMi45LDQxLjcgMTkuNiwzMS41IDEwLjksMzguMiAxNC41LDI4LjEgMy4zLDI4LjUgMTIuNSwyMi4zIDMuMywxNi40IDE0LjQsMTYuNiAxMC42LDYuNiAxOS41LDEzIDIyLjYsMi43IDI1LjksMTMgMzQuNiw2LjQgMzEsMTYuNCA0Mi4yLDE2LjEgMzMsMjIuMiA0Mi4zLDI4LjEgMzEuMSwyNy45ICIvPjxwb2x5Z29uIGNsYXNzPSJzdDUiIHBvaW50cz0iMjkuNiwzMS4xIDI0LjYsMjcuNSAyMi45LDMzLjIgMjEsMjcuNSAxNi4xLDMxLjIgMTguMSwyNS41IDExLjgsMjUuNyAxNywyMi4zIDExLjgsMTguOSAxOC4xLDE5LjEgMTUuOSwxMy40IDIwLjksMTcgMjIuNywxMS4yIDI0LjUsMTcgMjkuNSwxMy4zIDI3LjQsMTguOSAzMy43LDE4LjcgMjguNSwyMi4yIDMzLjgsMjUuNSAyNy41LDI1LjQgIi8+PC9zdmc+);
 }
 
 
 
 
 .is2d piece.rook.white {
     background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNDUgNDUiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDQ1IDQ1OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PHN0eWxlIHR5cGU9InRleHQvY3NzIj4uc3Qwe2Rpc3BsYXk6bm9uZTt9LnN0MXtkaXNwbGF5OmlubGluZTtmaWxsOiNGRkZGRkY7c3Ryb2tlOiMwMDAwMDA7c3Ryb2tlLXdpZHRoOjEuNTtzdHJva2UtbGluZWpvaW46cm91bmQ7fS5zdDJ7ZGlzcGxheTppbmxpbmU7ZmlsbDojRkZGRkZGO3N0cm9rZTojMDAwMDAwO3N0cm9rZS13aWR0aDoxLjU7c3Ryb2tlLWxpbmVjYXA6cm91bmQ7c3Ryb2tlLWxpbmVqb2luOnJvdW5kO30uc3Qze2Rpc3BsYXk6aW5saW5lO2ZpbGw6I0ZGRkZGRjtzdHJva2U6IzAwMDAwMDtzdHJva2Utd2lkdGg6MS41O30uc3Q0e2Rpc3BsYXk6aW5saW5lO2ZpbGw6bm9uZTtzdHJva2U6IzAwMDAwMDtzdHJva2Utd2lkdGg6MS41O3N0cm9rZS1saW5lY2FwOnJvdW5kO30uc3Q1e2Rpc3BsYXk6bm9uZTtmaWxsOiNGRkZGRkY7c3Ryb2tlOiNGQzAwMDA7c3Ryb2tlLXdpZHRoOjI7c3Ryb2tlLW1pdGVybGltaXQ6MTA7fS5zdDZ7ZmlsbDojRkZGRkZGO3N0cm9rZTojOUUwRUMxO3N0cm9rZS13aWR0aDo1O308L3N0eWxlPjxnIGNsYXNzPSJzdDAiPjxwYXRoIGNsYXNzPSJzdDEiIGQ9Ik05LDM5aDI3di0zSDlWMzl6IE0xMiwzNnYtNGgyMXY0SDEyeiBNMTEsMTRWOWg0djJoNVY5aDV2Mmg1VjloNHY1Ii8+PHBhdGggY2xhc3M9InN0MiIgZD0iTTM0LDE0bC0zLDNIMTRsLTMtMyIvPjxwYXRoIGNsYXNzPSJzdDMiIGQ9Ik0zMSwxN3YxMi41SDE0VjE3Ii8+PHBhdGggY2xhc3M9InN0MiIgZD0iTTMxLDI5LjVsMS41LDIuNWgtMjBsMS41LTIuNSIvPjxwYXRoIGNsYXNzPSJzdDQiIGQ9Ik0xMSwxNGgyMyIvPjwvZz48cG9seWdvbiBjbGFzcz0ic3Q1IiBwb2ludHM9IjIyLjUsNC4zIDUuMywzOS41IDM5LjgsMzkuNSAiLz48cmVjdCB4PSI5IiB5PSI1LjUiIGNsYXNzPSJzdDYiIHdpZHRoPSIyNyIgaGVpZ2h0PSIzNSIvPjwvc3ZnPg==);
 }
 
 
 .is2d piece.king.white {
     background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNDUgNDUiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDQ1IDQ1OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PHN0eWxlIHR5cGU9InRleHQvY3NzIj4uc3Qwe2Rpc3BsYXk6bm9uZTt9LnN0MXtkaXNwbGF5OmlubGluZTtmaWxsOm5vbmU7c3Ryb2tlOiMwMDAwMDA7c3Ryb2tlLXdpZHRoOjEuNTtzdHJva2UtbGluZWNhcDpyb3VuZDt9LnN0MntkaXNwbGF5OmlubGluZTtmaWxsOiNGRkZGRkY7c3Ryb2tlOiMwMDAwMDA7c3Ryb2tlLXdpZHRoOjEuNTt9LnN0M3tkaXNwbGF5OmlubGluZTtmaWxsOiNGRkZGRkY7c3Ryb2tlOiMwMDAwMDA7c3Ryb2tlLXdpZHRoOjEuNTtzdHJva2UtbGluZWNhcDpyb3VuZDtzdHJva2UtbGluZWpvaW46cm91bmQ7fS5zdDR7ZGlzcGxheTppbmxpbmU7ZmlsbDpub25lO3N0cm9rZTojMDAwMDAwO3N0cm9rZS13aWR0aDoxLjU7c3Ryb2tlLWxpbmVjYXA6cm91bmQ7c3Ryb2tlLWxpbmVqb2luOnJvdW5kO30uc3Q1e2Rpc3BsYXk6bm9uZTtmaWxsOiNGRkZGRkY7c3Ryb2tlOiMwMDAwMDA7c3Ryb2tlLXdpZHRoOjEuNzM2ODtzdHJva2UtbWl0ZXJsaW1pdDoxMDt9LnN0NntmaWxsOiNGRkZGRkY7c3Ryb2tlOiM0RjRGNEY7c3Ryb2tlLXdpZHRoOjM7c3Ryb2tlLW1pdGVybGltaXQ6MTA7fTwvc3R5bGU+PGcgY2xhc3M9InN0MCI+PHBhdGggY2xhc3M9InN0MSIgZD0iTTIyLjUsMTEuNlY2IE0yMCw4aDUiLz48cGF0aCBjbGFzcz0ic3QyIiBkPSJNMjIuNSwyNWMwLDAsNC41LTcuNSwzLTEwLjVjMCwwLTEtMi41LTMtMi41cy0zLDIuNS0zLDIuNUMxOCwxNy41LDIyLjUsMjUsMjIuNSwyNSIvPjxwYXRoIGNsYXNzPSJzdDMiIGQ9Ik0xMS41LDM3YzUuNSwzLjUsMTUuNSwzLjUsMjEsMHYtN2MwLDAsOS00LjUsNi0xMC41Yy00LTYuNS0xMy41LTMuNS0xNiw0VjI3di0zLjVjLTMuNS03LjUtMTMtMTAuNS0xNi00Yy0zLDYsNSwxMCw1LDEwVjM3eiIvPjxwYXRoIGNsYXNzPSJzdDQiIGQ9Ik0xMS41LDMwYzUuNS0zLDE1LjUtMywyMSwwIE0xMS41LDMzLjVjNS41LTMsMTUuNS0zLDIxLDAgTTExLjUsMzdjNS41LTMsMTUuNS0zLDIxLDAiLz48L2c+PHBvbHlnb24gY2xhc3M9InN0NSIgcG9pbnRzPSIzMywzNS41IDI1LjUsMzAuMSAyMi45LDM4LjcgMjAuMSwzMC4xIDEyLjcsMzUuNyAxNS44LDI3LjIgNi4zLDI3LjUgMTQuMSwyMi4zIDYuMywxNy4zIDE1LjcsMTcuNSAxMi41LDkgMjAsMTQuNCAyMi42LDUuNyAyNS40LDE0LjQgMzIuOCw4LjggMjkuNywxNy4zIDM5LjIsMTcgMzEuNCwyMi4yIDM5LjMsMjcuMiAyOS44LDI3ICIvPjxjaXJjbGUgY2xhc3M9InN0NiIgY3g9IjIyLjgiIGN5PSIyMi4yIiByPSIxNy4zIi8+PC9zdmc+);
 }
 
 
 
 
 .is2d piece.knight.white {
     background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNDUgNDUiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDQ1IDQ1OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PHN0eWxlIHR5cGU9InRleHQvY3NzIj4uc3Qwe2Rpc3BsYXk6bm9uZTt9LnN0MXtkaXNwbGF5OmlubGluZTtzdHJva2U6IzAwMDAwMDtzdHJva2Utd2lkdGg6MS41O3N0cm9rZS1saW5lY2FwOnJvdW5kO3N0cm9rZS1saW5lam9pbjpyb3VuZDt9LnN0MntkaXNwbGF5OmlubGluZTtmaWxsOiNFQ0VDRUM7c3Ryb2tlOiNFQ0VDRUM7c3Ryb2tlLXdpZHRoOjEuNTtzdHJva2UtbGluZWNhcDpyb3VuZDtzdHJva2UtbGluZWpvaW46cm91bmQ7fS5zdDN7ZGlzcGxheTppbmxpbmU7ZmlsbDojRUNFQ0VDO30uc3Q0e2Rpc3BsYXk6bm9uZTtzdHJva2U6I0ZGRkZGRjtzdHJva2Utd2lkdGg6MjtzdHJva2UtbWl0ZXJsaW1pdDoxMDt9LnN0NXtmaWxsOiNGRkZGRkY7c3Ryb2tlOiMzMUE4MDA7c3Ryb2tlLXdpZHRoOjMuMjA3NTtzdHJva2UtbWl0ZXJsaW1pdDoxMDt9LnN0NntkaXNwbGF5Om5vbmU7ZmlsbDojRkYwMDAwO30uc3Q3e2ZpbGw6I0ZGRkZGRjtzdHJva2U6IzBEMjYwMDtzdHJva2Utd2lkdGg6MS4wNzA5O3N0cm9rZS1taXRlcmxpbWl0OjEwO30uc3Q4e2ZpbGw6I0ZGRkZGRjtzdHJva2U6IzNCQUEwMDtzdHJva2Utd2lkdGg6MS44NzU7c3Ryb2tlLW1pdGVybGltaXQ6MTA7fTwvc3R5bGU+PGcgY2xhc3M9InN0MCI+PHBhdGggY2xhc3M9InN0MSIgZD0iTTIyLDEwYzEwLjUsMSwxNi41LDgsMTYsMjlIMTVjMC05LDEwLTYuNSw4LTIxIi8+PHBhdGggY2xhc3M9InN0MSIgZD0iTTI0LDE4YzAuNCwyLjktNS41LDcuNC04LDljLTMsMi0yLjgsNC4zLTUsNGMtMS0wLjksMS40LTMsMC0zYy0xLDAsMC4yLDEuMi0xLDJjLTEsMC00LDEtNC00YzAtMiw2LTEyLDYtMTJzMS45LTEuOSwyLTMuNWMtMC43LTEtMC41LTItMC41LTNjMS0xLDMsMi41LDMsMi41aDJjMCwwLDAuOC0yLDIuNS0zYzEsMCwxLDMsMSwzIi8+PHBhdGggY2xhc3M9InN0MiIgZD0iTTkuNSwyNS41QzkuNSwyNS44LDkuMywyNiw5LDI2cy0wLjUtMC4yLTAuNS0wLjVTOC43LDI1LDksMjVTOS41LDI1LjIsOS41LDI1LjV6IE0xNC45LDE1LjdjLTAuNCwwLjctMC45LDEuMi0xLjIsMS4xYy0wLjItMC4xLTAuMS0wLjgsMC4zLTEuNWwwLDBjMC40LTAuNywwLjktMS4yLDEuMi0xLjFDMTUuNSwxNC4zLDE1LjQsMTUsMTQuOSwxNS43TDE0LjksMTUuN3oiLz48cGF0aCBjbGFzcz0ic3QzIiBkPSJNMjQuNSwxMC40TDI0LDExLjhsMC41LDAuMWMzLjEsMSw1LjYsMi41LDcuOSw2LjhzMy4zLDEwLjMsMi44LDIwLjJ2MC41aDIuM3YtMC41YzAuNS0xMC4xLTAuOS0xNi44LTMuMy0yMS4zUzI4LjQsMTEsMjUsMTAuNEMyNS4xLDEwLjUsMjQuNiwxMC40LDI0LjUsMTAuNHoiLz48L2c+PHBvbHlnb24gY2xhc3M9InN0NCIgcG9pbnRzPSI3LjIsOC45IDM4LjUsOC45IDM4LjUsNDAuNCAyMi4xLDQwLjQgMjIuMSwyNCA3LjIsMjQgIi8+PHBvbHlnb24gY2xhc3M9InN0NSIgcG9pbnRzPSIyNS45LDQxLjIgMzguMiw0MS4yIDM4LjIsNS4yIDQuMiw1LjIgNC4yLDIxIDEwLjMsMjEgMTAuMywxNS42IDIzLjYsMTUuNiAyMy42LDQxLjIgIi8+PGNpcmNsZSBjbGFzcz0ic3Q2IiBjeD0iMzQuMSIgY3k9IjMxLjUiIHI9IjguNCIvPjxwb2x5Z29uIGNsYXNzPSJzdDciIHBvaW50cz0iMjUuOSw0MCAzOC4yLDQwIDM4LjIsNiA0LjIsNiA0LjIsMjAuOSAxMC4zLDIwLjkgMTAuMywxNS44IDIzLjYsMTUuOCAyMy42LDQwICIvPjxwb2x5Z29uIGNsYXNzPSJzdDgiIHBvaW50cz0iNS40LDcuMyA1LjQsMTkuNSA5LjEsMTkuNSA5LjEsMTQuNyAyNC45LDE0LjcgMjQuOSwzOC44IDM3LjIsMzguOCAzNy4yLDguOSAzNy4yLDcuMyAiLz48L3N2Zz4=);
 }
 
 
 
 
 .is2d .bishop.black {
     background-image: url(data:image/png;base64,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);
 }
 
 
 .is2d piece.knight.black {
     background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNDUgNDUiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDQ1IDQ1OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PHN0eWxlIHR5cGU9InRleHQvY3NzIj4uc3Qwe2Rpc3BsYXk6bm9uZTt9LnN0MXtkaXNwbGF5OmlubGluZTtzdHJva2U6IzAwMDAwMDtzdHJva2Utd2lkdGg6MS41O3N0cm9rZS1saW5lY2FwOnJvdW5kO3N0cm9rZS1saW5lam9pbjpyb3VuZDt9LnN0MntkaXNwbGF5OmlubGluZTtmaWxsOiNFQ0VDRUM7c3Ryb2tlOiNFQ0VDRUM7c3Ryb2tlLXdpZHRoOjEuNTtzdHJva2UtbGluZWNhcDpyb3VuZDtzdHJva2UtbGluZWpvaW46cm91bmQ7fS5zdDN7ZGlzcGxheTppbmxpbmU7ZmlsbDojRUNFQ0VDO30uc3Q0e2Rpc3BsYXk6bm9uZTtzdHJva2U6I0ZGRkZGRjtzdHJva2Utd2lkdGg6MjtzdHJva2UtbWl0ZXJsaW1pdDoxMDt9LnN0NXtzdHJva2U6IzMxQTgwMDtzdHJva2Utd2lkdGg6My4yMDc1O3N0cm9rZS1taXRlcmxpbWl0OjEwO30uc3Q2e2ZpbGw6I0ZGRkZGRjtzdHJva2U6IzBEMjYwMDtzdHJva2Utd2lkdGg6MS4wNzA5O3N0cm9rZS1taXRlcmxpbWl0OjEwO30uc3Q3e3N0cm9rZTojM0JBQTAwO3N0cm9rZS13aWR0aDoxLjg3NTtzdHJva2UtbWl0ZXJsaW1pdDoxMDt9LnN0OHtkaXNwbGF5Om5vbmU7ZmlsbDojRkYwMDAwO308L3N0eWxlPjxnIGNsYXNzPSJzdDAiPjxwYXRoIGNsYXNzPSJzdDEiIGQ9Ik0yMi40LDM2LjFjLTEwLjUtMS0xNi41LTgtMTYtMjloMjNjMCw5LTEwLDYuNS04LDIxIi8+PHBhdGggY2xhc3M9InN0MSIgZD0iTTIwLjQsMjguMWMtMC40LTIuOSw1LjUtNy40LDgtOWMzLTIsMi44LTQuMyw1LTRjMSwwLjktMS40LDMsMCwzYzEsMC0wLjItMS4yLDEtMmMxLDAsNC0xLDQsNGMwLDItNiwxMi02LDEycy0xLjksMS45LTIsMy41YzAuNywxLDAuNSwyLDAuNSwzYy0xLDEtMy0yLjUtMy0yLjVoLTJjMCwwLTAuOCwyLTIuNSwzYy0xLDAtMS0zLTEtMyIvPjxwYXRoIGNsYXNzPSJzdDIiIGQ9Ik0zNC44LDIwLjZjMC0wLjMsMC4yLTAuNSwwLjUtMC41YzAuMywwLDAuNSwwLjIsMC41LDAuNXMtMC4yLDAuNS0wLjUsMC41QzM1LDIxLjEsMzQuOCwyMC45LDM0LjgsMjAuNnogTTI5LjUsMzAuNGMwLjQtMC43LDAuOS0xLjIsMS4yLTEuMWMwLjIsMC4xLDAuMSwwLjgtMC4zLDEuNWwwLDBjLTAuNCwwLjctMC45LDEuMi0xLjIsMS4xQzI4LjksMzEuOCwyOSwzMS4xLDI5LjUsMzAuNEwyOS41LDMwLjR6Ii8+PHBhdGggY2xhc3M9InN0MyIgZD0iTTE5LjksMzUuN2wwLjUtMS40bC0wLjUtMC4xYy0zLjEtMS01LjYtMi41LTcuOS02LjhTOC42LDE3LjEsOS4xLDcuMlY2LjdINi44djAuNUM2LjMsMTcuMyw3LjgsMjQsMTAuMSwyOC41czUuOCw2LjYsOS4yLDcuMkMxOS4zLDM1LjYsMTkuOCwzNS43LDE5LjksMzUuN3oiLz48L2c+PHBvbHlnb24gY2xhc3M9InN0NCIgcG9pbnRzPSIzNy4yLDM3LjIgNS44LDM3LjIgNS44LDUuNyAyMi4zLDUuNyAyMi4zLDIyLjEgMzcuMiwyMi4xICIvPjxwb2x5Z29uIGNsYXNzPSJzdDUiIHBvaW50cz0iMTguNSw0LjkgNi4xLDQuOSA2LjEsNDAuOSA0MC4yLDQwLjkgNDAuMiwyNS4xIDM0LDI1LjEgMzQsMzAuNSAyMC44LDMwLjUgMjAuOCw0LjkgIi8+PHBvbHlnb24gY2xhc3M9InN0NiIgcG9pbnRzPSIxOC41LDYuMSA2LjEsNi4xIDYuMSw0MC4xIDQwLjEsNDAuMSA0MC4xLDI1LjIgMzQsMjUuMiAzNCwzMC4zIDIwLjgsMzAuMyAyMC44LDYuMSAiLz48cG9seWdvbiBjbGFzcz0ic3Q3IiBwb2ludHM9IjM4LjksMzguOCAzOC45LDI2LjYgMzUuMywyNi42IDM1LjMsMzEuNCAxOS40LDMxLjQgMTkuNCw3LjMgNy4yLDcuMyA3LjIsMzcuMiA3LjIsMzguOCAiLz48Y2lyY2xlIGNsYXNzPSJzdDgiIGN4PSI4LjQiIGN5PSIxMS42IiByPSI4LjUiLz48L3N2Zz4=);
 }
 
 .is2d piece.rook.black {
     background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNDUgNDUiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDQ1IDQ1OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PHN0eWxlIHR5cGU9InRleHQvY3NzIj4uc3Qwe2Rpc3BsYXk6bm9uZTt9LnN0MXtkaXNwbGF5OmlubGluZTtmaWxsOiNGRkZGRkY7c3Ryb2tlOiMwMDAwMDA7c3Ryb2tlLXdpZHRoOjEuNTtzdHJva2UtbGluZWpvaW46cm91bmQ7fS5zdDJ7ZGlzcGxheTppbmxpbmU7ZmlsbDojRkZGRkZGO3N0cm9rZTojMDAwMDAwO3N0cm9rZS13aWR0aDoxLjU7c3Ryb2tlLWxpbmVjYXA6cm91bmQ7c3Ryb2tlLWxpbmVqb2luOnJvdW5kO30uc3Qze2Rpc3BsYXk6aW5saW5lO2ZpbGw6I0ZGRkZGRjtzdHJva2U6IzAwMDAwMDtzdHJva2Utd2lkdGg6MS41O30uc3Q0e2Rpc3BsYXk6aW5saW5lO2ZpbGw6bm9uZTtzdHJva2U6IzAwMDAwMDtzdHJva2Utd2lkdGg6MS41O3N0cm9rZS1saW5lY2FwOnJvdW5kO30uc3Q1e2Rpc3BsYXk6bm9uZTtmaWxsOiNGRkZGRkY7c3Ryb2tlOiNGQzAwMDA7c3Ryb2tlLXdpZHRoOjI7c3Ryb2tlLW1pdGVybGltaXQ6MTA7fS5zdDZ7c3Ryb2tlOiNDRDAwRkY7c3Ryb2tlLXdpZHRoOjIuMTE4O308L3N0eWxlPjxnIGNsYXNzPSJzdDAiPjxwYXRoIGNsYXNzPSJzdDEiIGQ9Ik0zNy44LDM2VjloLTN2MjdIMzcuOHogTTM0LjgsMzNoLTRWMTJoNFYzM3ogTTEyLjgsMzRoLTV2LTRoMnYtNWgtMnYtNWgydi01aC0ydi00aDUiLz48cGF0aCBjbGFzcz0ic3QyIiBkPSJNMTIuOCwxMWwzLDN2MTdsLTMsMyIvPjxwYXRoIGNsYXNzPSJzdDMiIGQ9Ik0xNS44LDE0aDEyLjV2MTdIMTUuOCIvPjxwYXRoIGNsYXNzPSJzdDIiIGQ9Ik0yOC4zLDE0bDIuNS0xLjV2MjBMMjguMywzMSIvPjxwYXRoIGNsYXNzPSJzdDQiIGQ9Ik0xMi44LDM0VjExIi8+PC9nPjxwb2x5Z29uIGNsYXNzPSJzdDUiIHBvaW50cz0iMy4xLDIyLjUgMzguMywzOS44IDM4LjMsNS4zICIvPjxyZWN0IHg9IjQuNiIgeT0iMTEiIGNsYXNzPSJzdDYiIHdpZHRoPSIzNiIgaGVpZ2h0PSIyMyIvPjwvc3ZnPg==);
 }
 
 .is2d piece.king.black {
     background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNDUgNDUiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDQ1IDQ1OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PHN0eWxlIHR5cGU9InRleHQvY3NzIj4uc3Qwe2Rpc3BsYXk6bm9uZTt9LnN0MXtkaXNwbGF5OmlubGluZTtmaWxsOm5vbmU7c3Ryb2tlOiMwMDAwMDA7c3Ryb2tlLXdpZHRoOjEuNTtzdHJva2UtbGluZWNhcDpyb3VuZDt9LnN0MntkaXNwbGF5OmlubGluZTtmaWxsOiNGRkZGRkY7c3Ryb2tlOiMwMDAwMDA7c3Ryb2tlLXdpZHRoOjEuNTt9LnN0M3tkaXNwbGF5OmlubGluZTtmaWxsOiNGRkZGRkY7c3Ryb2tlOiMwMDAwMDA7c3Ryb2tlLXdpZHRoOjEuNTtzdHJva2UtbGluZWNhcDpyb3VuZDtzdHJva2UtbGluZWpvaW46cm91bmQ7fS5zdDR7ZGlzcGxheTppbmxpbmU7ZmlsbDpub25lO3N0cm9rZTojMDAwMDAwO3N0cm9rZS13aWR0aDoxLjU7c3Ryb2tlLWxpbmVjYXA6cm91bmQ7c3Ryb2tlLWxpbmVqb2luOnJvdW5kO30uc3Q1e2Rpc3BsYXk6bm9uZTtmaWxsOiNGRkZGRkY7c3Ryb2tlOiMwMDAwMDA7c3Ryb2tlLXdpZHRoOjEuNzM2ODtzdHJva2UtbWl0ZXJsaW1pdDoxMDt9LnN0NntzdHJva2U6I0ZGRkZGRjtzdHJva2Utd2lkdGg6MztzdHJva2UtbWl0ZXJsaW1pdDoxMDt9PC9zdHlsZT48ZyBjbGFzcz0ic3QwIj48cGF0aCBjbGFzcz0ic3QxIiBkPSJNMjIuNSwxMS42VjYgTTIwLDhoNSIvPjxwYXRoIGNsYXNzPSJzdDIiIGQ9Ik0yMi41LDI1YzAsMCw0LjUtNy41LDMtMTAuNWMwLDAtMS0yLjUtMy0yLjVzLTMsMi41LTMsMi41QzE4LDE3LjUsMjIuNSwyNSwyMi41LDI1Ii8+PHBhdGggY2xhc3M9InN0MyIgZD0iTTExLjUsMzdjNS41LDMuNSwxNS41LDMuNSwyMSwwdi03YzAsMCw5LTQuNSw2LTEwLjVjLTQtNi41LTEzLjUtMy41LTE2LDRWMjd2LTMuNWMtMy41LTcuNS0xMy0xMC41LTE2LTRjLTMsNiw1LDEwLDUsMTBWMzd6Ii8+PHBhdGggY2xhc3M9InN0NCIgZD0iTTExLjUsMzBjNS41LTMsMTUuNS0zLDIxLDAgTTExLjUsMzMuNWM1LjUtMywxNS41LTMsMjEsMCBNMTEuNSwzN2M1LjUtMywxNS41LTMsMjEsMCIvPjwvZz48cG9seWdvbiBjbGFzcz0ic3Q1IiBwb2ludHM9IjMzLDM1LjUgMjUuNSwzMC4xIDIyLjksMzguNyAyMC4xLDMwLjEgMTIuNywzNS43IDE1LjgsMjcuMiA2LjMsMjcuNSAxNC4xLDIyLjMgNi4zLDE3LjMgMTUuNywxNy41IDEyLjUsOSAyMCwxNC40IDIyLjYsNS43IDI1LjQsMTQuNCAzMi44LDguOCAyOS43LDE3LjMgMzkuMiwxNyAzMS40LDIyLjIgMzkuMywyNy4yIDI5LjgsMjcgIi8+PGNpcmNsZSBjbGFzcz0ic3Q2IiBjeD0iMjIuOCIgY3k9IjIyLjIiIHI9IjE3LjMiLz48cmVjdCB4PSI3LjQiIHk9IjEwLjMiIHRyYW5zZm9ybT0ibWF0cml4KDAuNzMxNyAwLjY4MTcgLTAuNjgxNyAwLjczMTcgMTAuODg5MyAtNC44MDY5KSIgd2lkdGg9IjguNCIgaGVpZ2h0PSIyLjMiLz48cmVjdCB4PSI3LjkiIHk9IjMyLjUiIHRyYW5zZm9ybT0ibWF0cml4KDAuNjgxNyAtMC43MzE3IDAuNzMxNyAwLjY4MTcgLTIwLjczIDE5LjUxNTIpIiB3aWR0aD0iOC40IiBoZWlnaHQ9IjIuMyIvPjxyZWN0IHg9IjI5LjQiIHk9IjkuNCIgdHJhbnNmb3JtPSJtYXRyaXgoMC42ODE3IC0wLjczMTcgMC43MzE3IDAuNjgxNyAzLjAwNzkgMjcuOTAzNykiIHdpZHRoPSI4LjQiIGhlaWdodD0iMi4zIi8+PHJlY3QgeD0iMjkuOSIgeT0iMzIuNSIgdHJhbnNmb3JtPSJtYXRyaXgoMC43MzE3IDAuNjgxNyAtMC42ODE3IDAuNzMxNyAzMi4wMzMyIC0xNC4yMTA3KSIgd2lkdGg9IjguNCIgaGVpZ2h0PSIyLjMiLz48L3N2Zz4=);
 }
 
 
 
 
 
 .is2d piece.queen.black {
     background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNDUgNDUiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDQ1IDQ1OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PHN0eWxlIHR5cGU9InRleHQvY3NzIj4uc3Qwe2Rpc3BsYXk6bm9uZTt9LnN0MXtkaXNwbGF5OmlubGluZTt9LnN0MntkaXNwbGF5OmlubGluZTtzdHJva2U6IzAwMDAwMDtzdHJva2Utd2lkdGg6MS41O3N0cm9rZS1saW5lam9pbjpyb3VuZDt9LnN0M3tkaXNwbGF5OmlubGluZTtmaWxsOm5vbmU7c3Ryb2tlOiMwMDAwMDA7c3Ryb2tlLXdpZHRoOjEuNTtzdHJva2UtbGluZWpvaW46cm91bmQ7fS5zdDR7ZGlzcGxheTppbmxpbmU7ZmlsbDpub25lO3N0cm9rZTojRUNFQ0VDO3N0cm9rZS13aWR0aDoxLjU7c3Ryb2tlLWxpbmVjYXA6cm91bmQ7c3Ryb2tlLWxpbmVqb2luOnJvdW5kO30uc3Q1e2Rpc3BsYXk6bm9uZTtzdHJva2U6IzAwMDAwMDtzdHJva2Utd2lkdGg6MC40MzI0O3N0cm9rZS1taXRlcmxpbWl0OjEwO30uc3Q2e2Rpc3BsYXk6bm9uZTtzdHJva2U6IzAwMDAwMDtzdHJva2Utd2lkdGg6MC4zNDkzO3N0cm9rZS1taXRlcmxpbWl0OjEwO30uc3Q3e3N0cm9rZTojMDBGOUZGO3N0cm9rZS13aWR0aDoxLjk0NzQ7c3Ryb2tlLW1pdGVybGltaXQ6MTA7fS5zdDh7c3Ryb2tlOiMwMDAwMDA7c3Ryb2tlLXdpZHRoOjI7c3Ryb2tlLW1pdGVybGltaXQ6MTA7fTwvc3R5bGU+PGcgY2xhc3M9InN0MCI+PGcgY2xhc3M9InN0MSI+PGNpcmNsZSBjeD0iNiIgY3k9IjEyIiByPSIyLjgiLz48Y2lyY2xlIGN4PSIxNCIgY3k9IjkiIHI9IjIuOCIvPjxjaXJjbGUgY3g9IjIyLjUiIGN5PSI4IiByPSIyLjgiLz48Y2lyY2xlIGN4PSIzMSIgY3k9IjkiIHI9IjIuOCIvPjxjaXJjbGUgY3g9IjM5IiBjeT0iMTIiIHI9IjIuOCIvPjwvZz48cGF0aCBjbGFzcz0ic3QyIiBkPSJNOSwyNmM4LjUtMS41LDIxLTEuNSwyNywwbDIuNS0xMi41TDMxLDI1bC0wLjMtMTQuMWwtNS4yLDEzLjZsLTMtMTQuNWwtMywxNC41bC01LjItMTMuNkwxNCwyNUw2LjUsMTMuNUw5LDI2eiIvPjxwYXRoIGNsYXNzPSJzdDIiIGQ9Ik05LDI2YzAsMiwxLjUsMiwyLjUsNGMxLDEuNSwxLDEsMC41LDMuNWMtMS41LDEtMS41LDIuNS0xLjUsMi41QzksMzcuNSwxMSwzOC41LDExLDM4LjVjNi41LDEsMTYuNSwxLDIzLDBjMCwwLDEuNS0xLDAtMi41YzAsMCwwLjUtMS41LTEtMi41Yy0wLjUtMi41LTAuNS0yLDAuNS0zLjVjMS0yLDIuNS0yLDIuNS00QzI3LjUsMjQuNSwxNy41LDI0LjUsOSwyNnoiLz48cGF0aCBjbGFzcz0ic3QzIiBkPSJNMTEsMzguNWM3LjQsMi42LDE1LjYsMi42LDIzLDAiLz48cGF0aCBjbGFzcz0ic3Q0IiBkPSJNMTEsMjljNy40LTIuNiwxNS42LTIuNiwyMywwIE0xMi41LDMxLjVoMjAgTTExLjUsMzQuNWM3LjEsMi40LDE0LjksMi40LDIyLDAgTTEwLjUsMzcuNWM3LjcsMi44LDE2LjMsMi44LDI0LDAiLz48L2c+PHBvbHlnb24gY2xhc3M9InN0NSIgcG9pbnRzPSIyMi41LDQuMyA1LjMsMzkuNSAzOS44LDM5LjUgIi8+PHBvbHlnb24gY2xhc3M9InN0NiIgcG9pbnRzPSIzNCwzOS41IDIyLjUsMzMuNiAxMC45LDM5LjUgMTMuMiwyNi45IDMuOSwxOCAxNi43LDE2LjIgMjIuNSw0LjggMjguMywxNi4yIDQxLjIsMTguMSAzMS44LDI2LjkgIi8+PHBvbHlnb24gY2xhc3M9InN0NiIgcG9pbnRzPSIxOS44LDQyLjggMTUsMzAuNyAyLjQsMjcuNyAxMi4zLDE5LjYgMTEuMSw2LjggMjIsMTMuOSAzMy45LDkgMzAuNywyMS40IDM5LjMsMzEuMyAyNi40LDMxLjkgIi8+PHBvbHlnb24gY2xhc3M9InN0NyIgcG9pbnRzPSIzNC4zLDM3LjEgMjUuOCwzMS4xIDIyLjksNDAuNyAxOS44LDMxLjEgMTEuNSwzNy4zIDE0LjksMjcuNyA0LjQsMjguMSAxMy4xLDIyLjMgNC4zLDE2LjYgMTQuOCwxNi44IDExLjIsNy40IDE5LjcsMTMuNCAyMi42LDMuNyAyNS43LDEzLjQgMzQsNy4yIDMwLjYsMTYuNyA0MS4xLDE2LjQgMzIuNCwyMi4yIDQxLjMsMjcuOCAzMC43LDI3LjcgIi8+PGNpcmNsZSBjbGFzcz0ic3Q4IiBjeD0iMS45IiBjeT0iMTYiIHI9IjAuOSIvPjxjaXJjbGUgY2xhc3M9InN0OCIgY3g9IjQzLjQiIGN5PSIyOC41IiByPSIwLjkiLz48Y2lyY2xlIGNsYXNzPSJzdDgiIGN4PSIzNS45IiBjeT0iMzkuMSIgcj0iMC45Ii8+PGNpcmNsZSBjbGFzcz0ic3Q4IiBjeD0iNDMuMSIgY3k9IjE1LjciIHI9IjAuOSIvPjxjaXJjbGUgY2xhc3M9InN0OCIgY3g9IjM1LjkiIGN5PSI0LjYiIHI9IjAuOSIvPjxjaXJjbGUgY2xhc3M9InN0OCIgY3g9IjIyLjkiIGN5PSI0My4zIiByPSIwLjkiLz48Y2lyY2xlIGNsYXNzPSJzdDgiIGN4PSI5LjgiIGN5PSIzOS42IiByPSIwLjkiLz48Y2lyY2xlIGNsYXNzPSJzdDgiIGN4PSIxLjkiIGN5PSIyOSIgcj0iMC45Ii8+PGNpcmNsZSBjbGFzcz0ic3Q4IiBjeD0iMjIuNyIgY3k9IjEuOSIgcj0iMC45Ii8+PGNpcmNsZSBjbGFzcz0ic3Q4IiBjeD0iOS41IiBjeT0iNS41IiByPSIwLjkiLz48L3N2Zz4=);
 }
 
 
 
 
 
 .is2d piece.pawn.white {
         background-image: url(data:image/png;base64,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);
 
 }
 
 .is2d piece.pawn.black {
     background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNDUgNDUiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDQ1IDQ1OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PHN0eWxlIHR5cGU9InRleHQvY3NzIj4uc3Qwe2Rpc3BsYXk6bm9uZTtzdHJva2U6IzAwMDAwMDtzdHJva2Utd2lkdGg6MS41O3N0cm9rZS1saW5lY2FwOnJvdW5kO30uc3Qxe3N0cm9rZTojNUQ5QkQ5O3N0cm9rZS13aWR0aDoxLjg0NTI7c3Ryb2tlLW1pdGVybGltaXQ6MTA7fS5zdDJ7c3Ryb2tlOiM1RDlCRDk7c3Ryb2tlLW1pdGVybGltaXQ6MTA7fTwvc3R5bGU+PHBhdGggY2xhc3M9InN0MCIgZD0iTTIyLjUsOWMtMi4yLDAtNCwxLjgtNCw0YzAsMC45LDAuMywxLjcsMC44LDIuNGMtMiwxLjEtMy4zLDMuMi0zLjMsNS42YzAsMiwwLjksMy44LDIuNCw1Yy0zLDEuMS03LjQsNS42LTcuNCwxMy41aDIzYzAtNy45LTQuNC0xMi40LTcuNC0xMy41YzEuNS0xLjIsMi40LTMsMi40LTVjMC0yLjQtMS4zLTQuNS0zLjMtNS42YzAuNS0wLjcsMC44LTEuNSwwLjgtMi40QzI2LjUsMTAuOCwyNC43LDksMjIuNSw5eiIvPjxwb2x5Z29uIGNsYXNzPSJzdDEiIHBvaW50cz0iMzYsNDEuNyAzMC4zLDQyLjkgMTMsMTAuNSAxOC43LDkuNCAiLz48ZWxsaXBzZSBjbGFzcz0ic3QyIiBjeD0iMTMiIGN5PSI0LjIiIHJ4PSI0LjEiIHJ5PSIzLjQiLz48L3N2Zz4=);
 }
 
 square.check {
    background: radial-gradient(ellipse at center, rgb(255, 0, 0) 0%, rgb(255, 0, 0) 100%, rgba(107, 58, 58, 0) 100%, rgba(158, 0, 0, 0) 100%);
    border-style: solid;
    border-color: #bf0000;
    border-width: 10px;
    width: 15.5%;
    height: 15.5%;
    margin-top: -1.4%;
    margin-left: -1.4%;
    z-index: 2;
 }
 
 piece.ghost {
    will-change: transform;
    opacity: 1;
 }
 
 square.selected {
    background-color: rgba(200, 85, 30, .0);
 }
 
 body.dark .areplay,
 body.dark .explorer_box tr:nth-child(even),
 body.dark div.mchat .messages,
 body.dark div.side_box,
 body.dark .box,
 body.dark div.table,
 body.dark div.table_wrap > div.clock > div.time,
 body.dark #friend_box .content a:hover,
 body.dark div.undertable_inner,
 body.dark .donation a,
 body.dark div.mchat .chat_tabs .tab.active {
    background: #000000;
 }
 
 body.dark {
    background-color: #916d6d;
    background-image: linear-gradient(to bottom, #000000, #000000 116px);
    color: #ffffff;
 }
 
 .rclock-top.running .time {
    color: rgb(0, 0, 0)!important;
    background: rgb(255, 0, 238)!important;
 }
 
 .rclock-bottom.running .time {
    color: rgb(0, 0, 0)!important;
    background: rgba(0, 255, 0)!important;
 }
 
 .rclock-bottom.emerg.running .time {
    color: rgb(0, 0, 0)!important;
    background: rgba(0, 255, 0)!important;
 }
 
 .rclock-top.emerg.running .time {
    color: rgb(0, 0, 0)!important;
    background: rgba(255, 0, 238)!important;
 }
 
 .rclock.emerg .time,
 .rclock.outoftime .time {
    background-color: #000!important;
    color: #fff!important;
 }
 
 .rclock-top {
    color: rgb(255, 255, 255)!important;
    background: rgb(0, 0, 0)!important;
 }
 
 .brown .is2d cg-board {
    background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA4LjAxIDguMTkiPjxkZWZzPjxzdHlsZT4uY2xzLTF7ZmlsbDojMjEyMTIxO30uY2xzLTJ7ZmlsbDojNjM2MzYzO30uY2xzLTN7ZmlsbDpub25lO3N0cm9rZTojY2M5MTkxO3N0cm9rZS1taXRlcmxpbWl0OjEwO3N0cm9rZS13aWR0aDowLjAxcHg7fTwvc3R5bGU+PC9kZWZzPjx0aXRsZT5icm93bjU8L3RpdGxlPjxnIGlkPSJMYXllcl8yIiBkYXRhLW5hbWU9IkxheWVyIDIiPjxyZWN0IGNsYXNzPSJjbHMtMSIgd2lkdGg9IjgiIGhlaWdodD0iOCIvPjwvZz48ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIj48ZyBpZD0iYSI+PGcgaWQ9ImIiPjxnIGlkPSJjIj48ZyBpZD0iZCI+PHJlY3QgaWQ9ImUiIGNsYXNzPSJjbHMtMiIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjxyZWN0IGlkPSJlLTIiIGRhdGEtbmFtZT0iZSIgY2xhc3M9ImNscy0yIiB4PSIxIiB5PSIxIiB3aWR0aD0iMSIgaGVpZ2h0PSIxIi8+PHJlY3QgaWQ9ImYiIGNsYXNzPSJjbHMtMSIgeT0iMSIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjxyZWN0IGlkPSJmLTIiIGRhdGEtbmFtZT0iZiIgY2xhc3M9ImNscy0xIiB4PSIxIiB3aWR0aD0iMSIgaGVpZ2h0PSIxIi8+PC9nPjxnIGlkPSJkLTIiIGRhdGEtbmFtZT0iZCI+PHJlY3QgaWQ9ImUtMyIgZGF0YS1uYW1lPSJlIiBjbGFzcz0iY2xzLTIiIHg9IjIiIHdpZHRoPSIxIiBoZWlnaHQ9IjEiLz48cmVjdCBpZD0iZS00IiBkYXRhLW5hbWU9ImUiIGNsYXNzPSJjbHMtMiIgeD0iMyIgeT0iMSIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjxyZWN0IGlkPSJmLTMiIGRhdGEtbmFtZT0iZiIgY2xhc3M9ImNscy0xIiB4PSIyIiB5PSIxIiB3aWR0aD0iMSIgaGVpZ2h0PSIxIi8+PHJlY3QgaWQ9ImYtNCIgZGF0YS1uYW1lPSJmIiBjbGFzcz0iY2xzLTEiIHg9IjMiIHdpZHRoPSIxIiBoZWlnaHQ9IjEiLz48L2c+PC9nPjxnIGlkPSJjLTIiIGRhdGEtbmFtZT0iYyI+PGcgaWQ9ImQtMyIgZGF0YS1uYW1lPSJkIj48cmVjdCBpZD0iZS01IiBkYXRhLW5hbWU9ImUiIGNsYXNzPSJjbHMtMiIgeD0iNCIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjxyZWN0IGlkPSJlLTYiIGRhdGEtbmFtZT0iZSIgY2xhc3M9ImNscy0yIiB4PSI1IiB5PSIxIiB3aWR0aD0iMSIgaGVpZ2h0PSIxIi8+PHJlY3QgaWQ9ImYtNSIgZGF0YS1uYW1lPSJmIiBjbGFzcz0iY2xzLTEiIHg9IjQiIHk9IjEiIHdpZHRoPSIxIiBoZWlnaHQ9IjEiLz48cmVjdCBpZD0iZi02IiBkYXRhLW5hbWU9ImYiIGNsYXNzPSJjbHMtMSIgeD0iNSIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjwvZz48ZyBpZD0iZC00IiBkYXRhLW5hbWU9ImQiPjxyZWN0IGlkPSJlLTciIGRhdGEtbmFtZT0iZSIgY2xhc3M9ImNscy0yIiB4PSI2IiB3aWR0aD0iMSIgaGVpZ2h0PSIxIi8+PHJlY3QgaWQ9ImUtOCIgZGF0YS1uYW1lPSJlIiBjbGFzcz0iY2xzLTIiIHg9IjciIHk9IjEiIHdpZHRoPSIxIiBoZWlnaHQ9IjEiLz48cmVjdCBpZD0iZi03IiBkYXRhLW5hbWU9ImYiIGNsYXNzPSJjbHMtMSIgeD0iNiIgeT0iMSIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjxyZWN0IGlkPSJmLTgiIGRhdGEtbmFtZT0iZiIgY2xhc3M9ImNscy0xIiB4PSI3IiB3aWR0aD0iMSIgaGVpZ2h0PSIxIi8+PC9nPjwvZz48L2c+PGcgaWQ9ImItMiIgZGF0YS1uYW1lPSJiIj48ZyBpZD0iYy0zIiBkYXRhLW5hbWU9ImMiPjxnIGlkPSJkLTUiIGRhdGEtbmFtZT0iZCI+PHJlY3QgaWQ9ImUtOSIgZGF0YS1uYW1lPSJlIiBjbGFzcz0iY2xzLTIiIHk9IjIiIHdpZHRoPSIxIiBoZWlnaHQ9IjEiLz48cmVjdCBpZD0iZS0xMCIgZGF0YS1uYW1lPSJlIiBjbGFzcz0iY2xzLTIiIHg9IjEiIHk9IjMiIHdpZHRoPSIxIiBoZWlnaHQ9IjEiLz48cmVjdCBpZD0iZi05IiBkYXRhLW5hbWU9ImYiIGNsYXNzPSJjbHMtMSIgeT0iMyIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjxyZWN0IGlkPSJmLTEwIiBkYXRhLW5hbWU9ImYiIGNsYXNzPSJjbHMtMSIgeD0iMSIgeT0iMiIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjwvZz48ZyBpZD0iZC02IiBkYXRhLW5hbWU9ImQiPjxyZWN0IGlkPSJlLTExIiBkYXRhLW5hbWU9ImUiIGNsYXNzPSJjbHMtMiIgeD0iMiIgeT0iMiIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjxyZWN0IGlkPSJlLTEyIiBkYXRhLW5hbWU9ImUiIGNsYXNzPSJjbHMtMiIgeD0iMyIgeT0iMyIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjxyZWN0IGlkPSJmLTExIiBkYXRhLW5hbWU9ImYiIGNsYXNzPSJjbHMtMSIgeD0iMiIgeT0iMyIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjxyZWN0IGlkPSJmLTEyIiBkYXRhLW5hbWU9ImYiIGNsYXNzPSJjbHMtMSIgeD0iMyIgeT0iMiIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjwvZz48L2c+PGcgaWQ9ImMtNCIgZGF0YS1uYW1lPSJjIj48ZyBpZD0iZC03IiBkYXRhLW5hbWU9ImQiPjxyZWN0IGlkPSJlLTEzIiBkYXRhLW5hbWU9ImUiIGNsYXNzPSJjbHMtMiIgeD0iNCIgeT0iMiIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjxyZWN0IGlkPSJlLTE0IiBkYXRhLW5hbWU9ImUiIGNsYXNzPSJjbHMtMiIgeD0iNSIgeT0iMyIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjxyZWN0IGlkPSJmLTEzIiBkYXRhLW5hbWU9ImYiIGNsYXNzPSJjbHMtMSIgeD0iNCIgeT0iMyIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjxyZWN0IGlkPSJmLTE0IiBkYXRhLW5hbWU9ImYiIGNsYXNzPSJjbHMtMSIgeD0iNSIgeT0iMiIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjwvZz48ZyBpZD0iZC04IiBkYXRhLW5hbWU9ImQiPjxyZWN0IGlkPSJlLTE1IiBkYXRhLW5hbWU9ImUiIGNsYXNzPSJjbHMtMiIgeD0iNiIgeT0iMiIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjxyZWN0IGlkPSJlLTE2IiBkYXRhLW5hbWU9ImUiIGNsYXNzPSJjbHMtMiIgeD0iNyIgeT0iMyIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjxyZWN0IGlkPSJmLTE1IiBkYXRhLW5hbWU9ImYiIGNsYXNzPSJjbHMtMSIgeD0iNiIgeT0iMyIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjxyZWN0IGlkPSJmLTE2IiBkYXRhLW5hbWU9ImYiIGNsYXNzPSJjbHMtMSIgeD0iNyIgeT0iMiIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjwvZz48L2c+PC9nPjwvZz48ZyBpZD0iYS0yIiBkYXRhLW5hbWU9ImEiPjxnIGlkPSJiLTMiIGRhdGEtbmFtZT0iYiI+PGcgaWQ9ImMtNSIgZGF0YS1uYW1lPSJjIj48ZyBpZD0iZC05IiBkYXRhLW5hbWU9ImQiPjxyZWN0IGlkPSJlLTE3IiBkYXRhLW5hbWU9ImUiIGNsYXNzPSJjbHMtMiIgeT0iNCIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjxyZWN0IGlkPSJlLTE4IiBkYXRhLW5hbWU9ImUiIGNsYXNzPSJjbHMtMiIgeD0iMSIgeT0iNSIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjxyZWN0IGlkPSJmLTE3IiBkYXRhLW5hbWU9ImYiIGNsYXNzPSJjbHMtMSIgeT0iNSIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjxyZWN0IGlkPSJmLTE4IiBkYXRhLW5hbWU9ImYiIGNsYXNzPSJjbHMtMSIgeD0iMSIgeT0iNCIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjwvZz48ZyBpZD0iZC0xMCIgZGF0YS1uYW1lPSJkIj48cmVjdCBpZD0iZS0xOSIgZGF0YS1uYW1lPSJlIiBjbGFzcz0iY2xzLTIiIHg9IjIiIHk9IjQiIHdpZHRoPSIxIiBoZWlnaHQ9IjEiLz48cmVjdCBpZD0iZS0yMCIgZGF0YS1uYW1lPSJlIiBjbGFzcz0iY2xzLTIiIHg9IjMiIHk9IjUiIHdpZHRoPSIxIiBoZWlnaHQ9IjEiLz48cmVjdCBpZD0iZi0xOSIgZGF0YS1uYW1lPSJmIiBjbGFzcz0iY2xzLTEiIHg9IjIiIHk9IjUiIHdpZHRoPSIxIiBoZWlnaHQ9IjEiLz48cmVjdCBpZD0iZi0yMCIgZGF0YS1uYW1lPSJmIiBjbGFzcz0iY2xzLTEiIHg9IjMiIHk9IjQiIHdpZHRoPSIxIiBoZWlnaHQ9IjEiLz48L2c+PC9nPjxnIGlkPSJjLTYiIGRhdGEtbmFtZT0iYyI+PGcgaWQ9ImQtMTEiIGRhdGEtbmFtZT0iZCI+PHJlY3QgaWQ9ImUtMjEiIGRhdGEtbmFtZT0iZSIgY2xhc3M9ImNscy0yIiB4PSI0IiB5PSI0IiB3aWR0aD0iMSIgaGVpZ2h0PSIxIi8+PHJlY3QgaWQ9ImUtMjIiIGRhdGEtbmFtZT0iZSIgY2xhc3M9ImNscy0yIiB4PSI1IiB5PSI1IiB3aWR0aD0iMSIgaGVpZ2h0PSIxIi8+PHJlY3QgaWQ9ImYtMjEiIGRhdGEtbmFtZT0iZiIgY2xhc3M9ImNscy0xIiB4PSI0IiB5PSI1IiB3aWR0aD0iMSIgaGVpZ2h0PSIxIi8+PHJlY3QgaWQ9ImYtMjIiIGRhdGEtbmFtZT0iZiIgY2xhc3M9ImNscy0xIiB4PSI1IiB5PSI0IiB3aWR0aD0iMSIgaGVpZ2h0PSIxIi8+PC9nPjxnIGlkPSJkLTEyIiBkYXRhLW5hbWU9ImQiPjxyZWN0IGlkPSJlLTIzIiBkYXRhLW5hbWU9ImUiIGNsYXNzPSJjbHMtMiIgeD0iNiIgeT0iNCIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjxyZWN0IGlkPSJlLTI0IiBkYXRhLW5hbWU9ImUiIGNsYXNzPSJjbHMtMiIgeD0iNyIgeT0iNSIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjxyZWN0IGlkPSJmLTIzIiBkYXRhLW5hbWU9ImYiIGNsYXNzPSJjbHMtMSIgeD0iNiIgeT0iNSIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjxyZWN0IGlkPSJmLTI0IiBkYXRhLW5hbWU9ImYiIGNsYXNzPSJjbHMtMSIgeD0iNyIgeT0iNCIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjwvZz48L2c+PC9nPjxnIGlkPSJiLTQiIGRhdGEtbmFtZT0iYiI+PGcgaWQ9ImMtNyIgZGF0YS1uYW1lPSJjIj48ZyBpZD0iZC0xMyIgZGF0YS1uYW1lPSJkIj48cmVjdCBpZD0iZS0yNSIgZGF0YS1uYW1lPSJlIiBjbGFzcz0iY2xzLTIiIHk9IjYiIHdpZHRoPSIxIiBoZWlnaHQ9IjEiLz48cmVjdCBpZD0iZS0yNiIgZGF0YS1uYW1lPSJlIiBjbGFzcz0iY2xzLTIiIHg9IjEiIHk9IjciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiLz48cmVjdCBpZD0iZi0yNSIgZGF0YS1uYW1lPSJmIiBjbGFzcz0iY2xzLTEiIHk9IjciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiLz48cmVjdCBpZD0iZi0yNiIgZGF0YS1uYW1lPSJmIiBjbGFzcz0iY2xzLTEiIHg9IjEiIHk9IjYiIHdpZHRoPSIxIiBoZWlnaHQ9IjEiLz48L2c+PGcgaWQ9ImQtMTQiIGRhdGEtbmFtZT0iZCI+PHJlY3QgaWQ9ImUtMjciIGRhdGEtbmFtZT0iZSIgY2xhc3M9ImNscy0yIiB4PSIyIiB5PSI2IiB3aWR0aD0iMSIgaGVpZ2h0PSIxIi8+PHJlY3QgaWQ9ImUtMjgiIGRhdGEtbmFtZT0iZSIgY2xhc3M9ImNscy0yIiB4PSIzIiB5PSI3IiB3aWR0aD0iMSIgaGVpZ2h0PSIxIi8+PHJlY3QgaWQ9ImYtMjciIGRhdGEtbmFtZT0iZiIgY2xhc3M9ImNscy0xIiB4PSIyIiB5PSI3IiB3aWR0aD0iMSIgaGVpZ2h0PSIxIi8+PHJlY3QgaWQ9ImYtMjgiIGRhdGEtbmFtZT0iZiIgY2xhc3M9ImNscy0xIiB4PSIzIiB5PSI2IiB3aWR0aD0iMSIgaGVpZ2h0PSIxIi8+PC9nPjwvZz48ZyBpZD0iYy04IiBkYXRhLW5hbWU9ImMiPjxnIGlkPSJkLTE1IiBkYXRhLW5hbWU9ImQiPjxyZWN0IGlkPSJlLTI5IiBkYXRhLW5hbWU9ImUiIGNsYXNzPSJjbHMtMiIgeD0iNCIgeT0iNiIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjxyZWN0IGlkPSJlLTMwIiBkYXRhLW5hbWU9ImUiIGNsYXNzPSJjbHMtMiIgeD0iNSIgeT0iNyIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjxyZWN0IGlkPSJmLTI5IiBkYXRhLW5hbWU9ImYiIGNsYXNzPSJjbHMtMSIgeD0iNCIgeT0iNyIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjxyZWN0IGlkPSJmLTMwIiBkYXRhLW5hbWU9ImYiIGNsYXNzPSJjbHMtMSIgeD0iNSIgeT0iNiIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjwvZz48ZyBpZD0iZC0xNiIgZGF0YS1uYW1lPSJkIj48cmVjdCBpZD0iZS0zMSIgZGF0YS1uYW1lPSJlIiBjbGFzcz0iY2xzLTIiIHg9IjYiIHk9IjYiIHdpZHRoPSIxIiBoZWlnaHQ9IjEiLz48cmVjdCBpZD0iZS0zMiIgZGF0YS1uYW1lPSJlIiBjbGFzcz0iY2xzLTIiIHg9IjciIHk9IjciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiLz48cmVjdCBpZD0iZi0zMSIgZGF0YS1uYW1lPSJmIiBjbGFzcz0iY2xzLTEiIHg9IjYiIHk9IjciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiLz48cmVjdCBpZD0iZi0zMiIgZGF0YS1uYW1lPSJmIiBjbGFzcz0iY2xzLTEiIHg9IjciIHk9IjYiIHdpZHRoPSIxIiBoZWlnaHQ9IjEiLz48L2c+PC9nPjwvZz48L2c+PGxpbmUgY2xhc3M9ImNscy0zIiB5MT0iNiIgeDI9IjIuMDIiIHkyPSI4Ii8+PGxpbmUgY2xhc3M9ImNscy0zIiB4MT0iMi4wNSIgeTE9IjguMTkiIHgyPSIyLjA1IiB5Mj0iOC4xOCIvPjxsaW5lIGNsYXNzPSJjbHMtMyIgeTE9IjQiIHgyPSI0IiB5Mj0iOCIvPjxsaW5lIGNsYXNzPSJjbHMtMyIgeTE9IjIiIHgyPSI2IiB5Mj0iOCIvPjxsaW5lIGNsYXNzPSJjbHMtMyIgeDI9IjgiIHkyPSI4Ii8+PGxpbmUgY2xhc3M9ImNscy0zIiB4MT0iMiIgeDI9IjgiIHkyPSI2Ii8+PGxpbmUgY2xhc3M9ImNscy0zIiB4MT0iNCIgeDI9IjgiIHkyPSI0Ii8+PGxpbmUgY2xhc3M9ImNscy0zIiB4MT0iNiIgeDI9IjgiIHkyPSIyIi8+PGxpbmUgY2xhc3M9ImNscy0zIiB5MT0iMSIgeDI9IjEiLz48bGluZSBjbGFzcz0iY2xzLTMiIHkxPSIzIiB4Mj0iMyIvPjxsaW5lIGNsYXNzPSJjbHMtMyIgeTE9IjUiIHgyPSI1Ii8+PGxpbmUgY2xhc3M9ImNscy0zIiB5MT0iNyIgeDI9IjciLz48bGluZSBjbGFzcz0iY2xzLTMiIHgxPSIxIiB5MT0iOCIgeDI9IjgiIHkyPSIxIi8+PGxpbmUgY2xhc3M9ImNscy0zIiB4MT0iMyIgeTE9IjgiIHgyPSI4IiB5Mj0iMyIvPjxsaW5lIGNsYXNzPSJjbHMtMyIgeDE9IjUiIHkxPSI4IiB4Mj0iOCIgeTI9IjUiLz48bGluZSBjbGFzcz0iY2xzLTMiIHgxPSI3IiB5MT0iOCIgeDI9IjgiIHkyPSI3Ii8+PC9nPjwvc3ZnPg==);
 }
 
 square.current-premove {
    background-color: rgba(87, 123, 87, .8) !important;
 }
 
 square.premove-dest {
   /* background-color: rgba(87, 123, 87, .8) !important;
    background-color: rgba(87, 123, 87, .0) !important;
    pointer-events: auto;
    display: none; */
 }
 
 square.last-move,
 .mini_board .cg-board square.last-move {
    will-change: transform;
    background-color: rgba(57, 147, 166, .0);
 }
 
 square.last-move.current-premove {
    background-color: rgba(87, 123, 87, .8) !important;
 }
 
 piece.white {
    filter: contrast(1.5);
    border: dashed 1px#fff;
 }
 
 piece.black {
    border: dashed 1px #f00;
 }
 
 .bar {
    display: none !important;
 }
 
 .mchat__messages {
    flex: 1 1 auto;
    max-height: 50vh;
    overflow-y: auto;
    overflow-x: hidden;
    cursor: initial;
    font-size: 1.2em;
 }
 
 html *
 {
  -webkit-transition: none !important;
  -moz-transition: none !important;
  -o-transition: none !important;
  transition: none !important;
 }
  
`