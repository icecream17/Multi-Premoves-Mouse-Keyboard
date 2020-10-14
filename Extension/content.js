

let workerCode = () => {
    let canvas;
    let canvasRatio, contextRatio;
    let context;
    let boardWidthUnrounded, boardX, boardY, sqSizeUnrounded, halfSquare;
    let boardWidthRatio, ratioX, ratioY, sqSize;
    let arrayOfArrows = [];
    let useUltrabulletTheme, experimentalArrows;
    let pieceColors, opacity;

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
                experimentalArrows = e.data.settings.experimentalArrows;
                useUltrabulletTheme = e.data.settings.useUltrabulletTheme;
                context.arrow = function (startX, startY, endX, endY, controlPoints) { //https://github.com/frogcat/canvas-arrow
                    var dx = endX - startX;
                    var dy = endY - startY;
                    var len = Math.sqrt(dx * dx + dy * dy);
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
                opacity = 0.6;
                if (useUltrabulletTheme === true) {
                    opacity = 0.8;
                    pieceColors = {
                        pawn: "180, 180, 180",
                        knight: "71, 159, 25",
                        bishop: "231, 241, 35",
                        rook: "148, 21, 177",
                        queen: "22, 239, 239",
                        king: "0, 0, 0"
                    }
                } else {
                    pieceColors = {
                        pawn: "180, 180, 180",
                        knight: "5, 58, 0",
                        bishop: "105, 100, 1",
                        rook: "50, 0, 49",
                        queen: "34, 120, 122",
                        king: "0, 0, 0"
                    }
                    if (experimentalArrows === false) {
                        opacity = 0.5;
                    }
                }
                console.log('init worker', performance.now())
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
            context.strokeStyle = `rgba(${color}, 1)`;
            context.stroke();
            context.fill();
            context.closePath();
        } else {
            context.fillStyle = `rgba(${color}, 1)`;
            context.beginPath();
            context.arrow(fromX, fromY, toX, toY, [-20, -5, -20, 5, -20, 15]);
            context.fill();
            context.closePath();
        }
    }
}

//createWorker();

if (settingsObject.createUI === true) {
    const multiPremoveSettingsString = localStorage.getItem('multiPremoveSettings');
    let multiPremoveSettings = JSON.parse(multiPremoveSettingsString)
    for (const key in multiPremoveSettings) {
        if (!unmodifiableSettings.includes(key)) {
            settingsObject[key] = multiPremoveSettings[key]
        }
    }
}

let useUltrabulletTheme = settingsObject.useUltrabulletTheme;
let animateMultipremoves = settingsObject.animateMultipremoves


const injectUltraTheme = () => {
    let disableDrags = ``
    if (animateMultipremoves === false) {
        disableDrags = `piece.dragging {
            display: none; 
            pointer-events: none;
         }`
    }

    let head = document.head || document.getElementsByTagName('head')[0],
        style = document.createElement('style');
    head.appendChild(style);
    style.type = 'text/css';
    style.appendChild(document.createTextNode(ultraCss + disableDrags));
}

if (useUltrabulletTheme === true) {
    if (document.body) { injectUltraTheme() } else {

        let documentBodyObserver;
        let configBoard = {
            childList: true
        };

        documentBodyObserver = new MutationObserver((mutations, observer) => {
            //console.log(mutations)
            if (document.body) {
                injectUltraTheme()
                observer.disconnect();
            }
        });
        documentBodyObserver.observe(document.getElementsByTagName('html')[0], configBoard);

    }
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
            } /* else if (request.type === "returnSettings") {
                
            } */
        });
}

if (isGame === true) {

    let drawTimeRatio = settingsObject.drawTimeRatio;
    let sendToBackgroundToProduceSound = settingsObject.sendToBackgroundToProduceSound;
    let useMouse = settingsObject.useMouse;
    let experimentalArrows = settingsObject.experimentalArrows;

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

        chessjs.src = chrome.runtime.getURL('chess.js');
        chessjs.onload = function () {
            this.remove();
        };


        (document.head || document.documentElement).appendChild(settingsjs);
        (document.head || document.documentElement).appendChild(chessjs);

        chrome.storage.local.get(['script'], function (result) {
            if (Object.keys(result).length === 0) {
                script.src = chrome.runtime.getURL('script.js');
                script.onload = function () {
                    this.remove();
                };

                (document.head || document.documentElement).appendChild(script);

            } else {
                script.textContent = result.script;
                script.onload = function () {
                    this.remove();
                };

                settingsjs.onload = function () {
                    (document.head || document.documentElement).appendChild(script);
                    this.remove();
                };


            }

        })




        /* let testJs = document.createElement('script');
        testJs.innerText = `console.log('test')`
        document.documentElement.appendChild(testJs); */


        var lastMoveIndicator, lastMoveIndicator2;

        var ConvertToDigits = {
            a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8
        };
        var bW, bX, bY, sqS;

        let worker;

        const createWorker = () => {
            worker = new Worker('data:application/javascript,' +
                encodeURIComponent(`(${workerCode.toString()})()`));
            worker.onmessage = (e) => {
            }
        }

        if (settingsObject.useWorkerFromTheBeginning === true && settingsObject.useWorkerActually === true) {
            createWorker();
        }

        var useWorkerGlobal = false; let workerFallback;
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


        if (drawTimeRatio === true) {
            let myClock, opClock;
            let configClock = {
                childList: true
            };
            let timeBetweenClockMutations = undefined;
            let clockObserver = new MutationObserver((mutations, observer) => {
                //console.log(mutations)
                let myTime = getTimeFromClocks(myClock),
                    opTime = getTimeFromClocks(opClock);

                //an attempt to measure common lag
                /* if (timeBetweenClockMutations !== undefined) {
                    console.log(performance.now() - timeBetweenClockMutations)
                }
                timeBetweenClockMutations = performance.now() */
                //

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
            }, 600);
        }



        const createCanvasForOffscreenPainting = (boardWidthUnrounded, boardX, boardY, sqSizeUnrounded, useWorker, myColor) => {

            boardWidthUnrounded = bW = Math.round(boardWidthUnrounded), boardX = bX = Math.round(boardX), boardY = bY = Math.round(boardY), sqSizeUnrounded = sqS = Math.round(sqSizeUnrounded)

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
                if (settingsObject.useWorkerFromTheBeginning === false) {
                    createWorker();
                }
                useWorkerGlobal = true;
                canvas.style.opacity = 0.7;
                if (useUltrabulletTheme === true) {
                    canvas.style.opacity = 1;
                } else {
                    if (experimentalArrows === false) {
                        canvas.style.opacity = 1;
                    }
                }
                const offscreenCanvas = canvas.transferControlToOffscreen();
                console.log('content postMessage to worker init', performance.now())
                worker.postMessage({
                    type: 'init', canvas: offscreenCanvas,
                    size: { boardWidthUnrounded, boardX, boardY, sqSizeUnrounded },
                    settings: { useUltrabulletTheme, experimentalArrows }
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
                    opacity = 0.8;
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
                        context.strokeStyle = `rgba(${color}, 1)`;
                        context.stroke();
                        context.fill();
                        context.closePath();
                    } else {
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
                    createCanvasForOffscreenPainting(data.boardWidthUnrounded, data.boardX, data.boardY, data.sqSizeUnrounded, data.useWorker /* false */, data.myColor)
                    console.log('content start message', performance.now())
                    break;
                case "move":
                    let objResult = event.data.coordObj;
                    if (useWorkerGlobal === true) {
                        worker.postMessage({ type: 'move', objResult });
                        console.log('move content', performance.now())
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




    })()

}

/* }
contentCode(); */

const modify = () => {
    //|mskchess\.ru
    if (/^https:\/\/(lichess\.org|lichess\.dev)\/(\w{8}|\w{12})(\/white|\/black)?$/.test(window.location.href)) {
        let nonce, src, text;
        /*   let meta = document.createElement('meta')
          meta.setAttribute('http-equiv', "Content-Security-Policy")
          meta.setAttribute('content', `worker-src 'self' data:`);
          document.documentElement.appendChild(meta) */
        const observer = new MutationObserver((mutations, observer) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes[0] && mutation.addedNodes[0].tagName && mutation.addedNodes[0].tagName.toLowerCase() === 'script') {
                    let script = mutation.addedNodes[0];
                    if (script.src.indexOf('round') !== -1) {
                        src = script.src;
                        script.parentElement.removeChild(script)
                    } else if (script.innerText.indexOf('lichess.load.then(()=>{LichessRound') !== -1) {
                        nonce = script.getAttribute('nonce');
                        text = script.innerText;
                        script.parentElement.removeChild(script)
                        observer.disconnect();
                        finishLoading();
                    }
                } /* else if (false && mutation.addedNodes[0] && mutation.addedNodes[0].tagName && mutation.addedNodes[0].tagName.toLowerCase() === 'meta') {
                let tag = mutation.addedNodes[0];
                let type = tag.getAttribute('http-equiv')
                if (type && type.toLowerCase() === 'content-security-policy') {
                    let content = tag.getAttribute('content');
                    if (content.indexOf(`worker-src 'self' data:`) === -1) {
                        console.log('first removed')
                        if (tag && tag.parentElement) {
                            
                        }
                    }
                }
                let charset = tag.getAttribute('charset')
                if (charset) {
                    
                    console.log('adding')
                    let initialContent;
                    let firstMeta;
                    let metas = document.getElementsByTagName('meta');
                    for (let i = 0; i < metas.length; i++) {
                        const el = metas[i];
                        if (el.getAttribute('http-equiv')) {
                            console.log(el)
                            initialContent = el.getAttribute('content')
                            el.parentElement.removeChild(el);
                            if (initialContent.indexOf('default-src') !== -1) {
                                firstMeta = el;
                            }

                        }
                    }
                    let meta = document.createElement('meta');
                    meta.setAttribute('http-equiv', "Content-Security-Policy")
                    initialContent = initialContent.replace(`worker-src 'self'`, `worker-src 'self' data:`)
                    meta.setAttribute('content', initialContent);
                    document.head.appendChild(meta)
                }
            } */
            })
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });

        const finishLoading = () => {
            Promise.all([src].map(u => fetch(u))).then(responses =>
                Promise.all(responses.map(res => res.text()))
            ).then(info => {
                let completed;
                let tIndex = info[0].search(/!\w{1}\.isT/);
                if (tIndex !== -1) {
                    let dIndex = info[0].search(/\.isT/);
                    let numberOfLetters = dIndex - tIndex - 1;
                    completed = info[0].replace(/!\w\.isT\w{6}/, `(${info[0].substr(tIndex, numberOfLetters + 11)} && (!${info[0].substr(tIndex + 1, numberOfLetters)}.data || ${info[0].substr(tIndex + 1, numberOfLetters)}.data[5] !== '-'))`);
                } else {
                    completed = info[0];
                }

                let stateMatch = completed.match(/const ([a-zA-Z]+) ?= ?([a-zA-Z0-9_]+)\.defaults\(\);/)[0];
                let localConst = stateMatch.match(/const ([a-zA-Z]+) ?=/)[0].substr(6).replace(/ ?=/, '');
                completed = completed.replace(stateMatch, `const ${localConst} = globalStateReference = ${stateMatch.match(/([a-zA-Z]+)\.defaults\(\);/)[0]}`);

                let boardMatch = completed.match(/[a-zA-Z]+=[a-zA-Z]+\(\(function\([a-zA-Z]+,[a-zA-Z]+\){function [a-zA-Z]+\([a-zA-Z]+,\.\.\.[a-zA-Z]+\)/)[0];
                let replaceWith = boardMatch.replace('=', '=globalBoardReference=')
                completed = completed.replace(boardMatch, replaceWith);

                let firstOne = document.createElement('script');
                let secondOne = document.createElement('script');
                firstOne.innerHTML = `
            var globalStateReference;
            var globalBoardReference;
            ${completed}`;
                secondOne.innerHTML = `console.log(3);${text}`;
                firstOne.setAttribute('nonce', nonce)
                firstOne.setAttribute('defer', 'defer')
                secondOne.setAttribute('nonce', nonce)
                document.body.appendChild(firstOne);
                document.body.appendChild(secondOne);
                /*  let windowScript = document.createElement('script');
                 windowScript.setAttribute('nonce', nonce)
                 windowScript.innerHTML = `(${innerContent.toString()})()`
                 document.body.appendChild(windowScript); */
            });
        }
    }
}

modify()