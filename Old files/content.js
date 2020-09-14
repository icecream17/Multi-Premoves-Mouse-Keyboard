(() => {
    let tamper = document.createElement('script');
    let chessboard = document.createElement('script');
    let jquery = document.createElement('script');
    // TODO: add "script.js" to web_accessible_resources in manifest.json

    tamper.src = chrome.runtime.getURL('tamper.js');
    tamper.onload = function () {
        this.remove();
    };
    chessboard.src = chrome.runtime.getURL('chessboard-1.0.0.min.js');
    chessboard.onload = function () {
        this.remove();
    };
    jquery.src = chrome.runtime.getURL('jquery.min.js');
    jquery.onload = function () {
        this.remove();
    };
    (document.head || document.documentElement).appendChild(jquery);
    (document.head || document.documentElement).appendChild(chessboard);
    (document.head || document.documentElement).appendChild(tamper);


    let worker;
    let canvas = document.createElement('canvas');
    const createCanvasForOffscreenPainting = (boardWidthUnrounded, boardX, boardY, sqSizeUnrounded) => {
        let lichessElement = document.body;
        let shadowHost = document.createElement('div')
        shadowHost.id = "shadowHostId"
        lichessElement.appendChild(shadowHost)
        let shadowDom = shadowHost.attachShadow({ mode: "closed" });
        canvas.id = 'canvasId';
        shadowDom.appendChild(canvas);
        canvas.width = boardWidthUnrounded;
        canvas.height = boardWidthUnrounded;
        canvas.style.position = 'absolute';
        canvas.style.left = boardX + "px";
        canvas.style.top = boardY + "px";
        canvas.style.zIndex = 100;
        canvas.style.pointerEvents = 'none';
        const offscreenCanvas = canvas.transferControlToOffscreen();
        worker.postMessage({
            type: 'init', canvas: offscreenCanvas,
            size: { boardWidthUnrounded, boardX, boardY, sqSizeUnrounded }
        }, [offscreenCanvas]);


        /* var context = canvas.getContext('2d');
        context.fillStyle = "rgba(23,234,212,0.2)";
        context.fillRect(0, 0, boardWidthUnrounded, boardWidthUnrounded); */


    }


    document.addEventListener('canvas', function (e) {
        data = e.detail;
        console.log(data);

        if (data.type === 'start') {
            createCanvasForOffscreenPainting(data.boardWidthUnrounded, data.boardX, data.boardY, data.sqSizeUnrounded)
        }

    });

    window.addEventListener("message", function (event) {
        if (event.data.type === "move") {
            let objResult = event.data.objResult;
            // console.log(objResult,'from content')
            worker.postMessage({ type: 'move', objResult });
        }
    });

    /* window.addEventListener("eventTest", function(event) {
        if (event.detail===1) {
            var eventTest = document.createEvent("CustomEvent");
                eventTest.initCustomEvent("eventTest", true, true, 2);
                document.dispatchEvent(eventTest);
        }
    }); */



    let workerCode =
        () => {
            let canvas;
            let context;
            let boardWidthUnrounded, boardX, boardY, sqSizeUnrounded, halfSquare;
            let strokeColor = 'rgba(224, 148, 0, 1)'
            self.onmessage = function (e) {

                if (e.data === "hello") { self.postMessage('msg from worker'); }
                else
                    if (e.data.type === 'init') {
                        canvas = e.data.canvas;
                        context = canvas.getContext('2d');
                        boardWidthUnrounded = e.data.size.boardWidthUnrounded,
                        halfBoard = boardWidthUnrounded/2;
                            boardX = e.data.size.boardX,
                            boardY = e.data.size.boardY,
                            sqSizeUnrounded = e.data.size.sqSizeUnrounded,
                            halfSquare = sqSizeUnrounded/2;
                        // animate();
                    }
                    else
                        if (e.data.type === 'move') {
                            let objResult = e.data.objResult
                            let c = objResult.coordObj
                            console.log(objResult, 'from worker')
                           // drawMove(c);
                           drawArrow(
                           turnCoordIntoPixels(c.dX), 
                           turnCoordIntoPixels(c.dY), 
                           turnCoordIntoPixels(c.uX), 
                           turnCoordIntoPixels(c.uY), 
                           strokeColor)
                        }
            };

const turnCoordIntoPixels = (n) => {
    return (n*2-1)*halfSquare
}


const drawArrow = (fromX, fromY, toX, toY, color) => {
    context.strokeStyle = color;
    context.fillStyle = color;
    let headLen = 10;
    let angle = Math.atan2(toY - fromY, toX - fromX);
    context.beginPath();
    context.moveTo(fromX, fromY);
    context.lineTo(toX, toY);
    context.lineWidth = 4;
    context.stroke();
    context.beginPath();
    context.moveTo(toX, toY);
    context.lineTo(toX - headLen * Math.cos(angle - Math.PI / 7), toY - headLen * Math.sin(angle - Math.PI / 7));
    context.lineTo(toX - headLen * Math.cos(angle + Math.PI / 7), toY - headLen * Math.sin(angle + Math.PI / 7));
    context.lineTo(toX, toY);
    context.lineTo(toX - headLen * Math.cos(angle - Math.PI / 7), toY - headLen * Math.sin(angle - Math.PI / 7));
    context.lineWidth = 6;
    context.stroke();
    context.fill();
}



            const drawMove = (c) => {

                context.clearRect(0, 0, canvas.width, halfBoard);
                context.clearRect(0, halfBoard, canvas.width, boardWidthUnrounded);

                context.beginPath();
                context.strokeStyle = strokeColor;
                context.moveTo(turnCoordIntoPixels(c.dX),turnCoordIntoPixels(c.dY));
                context.lineTo(turnCoordIntoPixels(c.uX),turnCoordIntoPixels(c.uY));
                context.lineWidth = 5;
                context.stroke();
                context.closePath();


            }
            const animate = () => {

                /*   self.requestAnimationFrame(animate); */
                context.fillStyle = "rgba(23,234,212,0.2)";
                context.fillRect(0, 0, boardWidthUnrounded, boardWidthUnrounded);
            }
        }

    worker = new Worker('data:application/javascript,' +
        encodeURIComponent(`(${workerCode.toString()})()`));
    worker.onmessage = (e) => {
        console.log("Received from the worker: " + e.data);
    }
    worker.postMessage("hello");


})()