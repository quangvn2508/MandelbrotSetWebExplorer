const WORKER_WAIT_TIME = 10, REPAINT_WAIT_TIME = 1, SCROLL_FACTOR = 0.1;

var resolution = {x:0,y:0}, canvas, context, worker = undefined, isWorking = false, newMBSData, currentMBS, imageData;

init = function() {
    resolution = {x: window.innerWidth, y : window.innerHeight};

    canvas = document.getElementById("main-canvas");
    context = canvas.getContext('2d');

    context.canvas.width = resolution.x;
    context.canvas.height = resolution.y;

    if (window.Worker) {
        worker = new Worker("worker.js");
        worker.onmessage = receiveMBSData;
    }

    newMBSData = {
        minR : -1.5,
        minI : -1,
        rangeX : 3,
        maxIteration : 100,
        radiusSquare : 4
    };

    currentMBS = {
        resolution : {x:0, y:0},
        MBSData : {
            minR : -1.5,
            minI : 0,
            rangeX : 3,
            maxIteration : 1000,
            radiusSquare : 4
        },
        MBSMatrix : undefined
    };

    canvas.addEventListener('wheel', scroll, false);

    window.addEventListener("resize", () => {
        resolution = {x: window.innerWidth, y : window.innerHeight};
        context.canvas.width = resolution.x;
        context.canvas.height = resolution.y;
    });
    // imageData = context.createImageData(resolution.x, resolution.y);

    setInterval(draw, REPAINT_WAIT_TIME);
    setInterval(startPartialWorker, WORKER_WAIT_TIME);
    // setInterval(startWorker, WORKER_WAIT_TIME);
}();

async function scroll(e) {
    const zoomDirection =  (e.deltaY>0? 1 : -1);
    var splitX, splitY;
    splitX = newMBSData.rangeX * (e.pageX / resolution.x) + newMBSData.minR;
    splitY = newMBSData.rangeX * (e.pageY / resolution.x) + newMBSData.minI;

    newMBSData.rangeX *= (1 + zoomDirection * SCROLL_FACTOR);

    newMBSData.minR = splitX - (splitX - newMBSData.minR) * (1 + zoomDirection * SCROLL_FACTOR);
    newMBSData.minI = splitY - (splitY - newMBSData.minI) * (1 + zoomDirection * SCROLL_FACTOR);
}

function draw() {
    var image = currentMBS, x, y;
    if (image.MBSMatrix == undefined) return;
    
    x = ((image.MBSData.minR - newMBSData.minR) / newMBSData.rangeX * resolution.x) | 0;
    y = ((image.MBSData.minI - newMBSData.minI) / (newMBSData.rangeX) * resolution.x) | 0;

    context.canvas.style.width = (image.MBSData.rangeX/newMBSData.rangeX*100) + "%";
    context.canvas.style.height = (image.MBSData.rangeX/newMBSData.rangeX*100) + "%";

    imageData = context.createImageData(image.resolution.x, image.resolution.y);
    
    for (var i = 0; i < imageData.data.length/4; i++) {
        imageData.data[i*4] = (image.MBSMatrix[(i/image.resolution.x)|0][(i%image.resolution.x)]==image.MBSData.maxIteration?0:255);
        imageData.data[i*4+3] =  255;
    }
    canvas.style.transform = "translate(" + x + "px," + y + "px)";

    context.putImageData(imageData, 0, 0);
}
var start = 0;
function startWorker() {
    if (worker !== undefined && !isWorking && !upToDate(newMBSData, currentMBS)) {
        start = new Date();
        worker.postMessage({params: {
            Resolution: resolution,
            MBSData : newMBSData
        }});
        isWorking = true;
    }
}

function receiveMBSData(e){
    currentMBS.resolution = e.data.params.Resolution;
    currentMBS.MBSData = e.data.params.MBSData;
    currentMBS.MBSMatrix = e.data.MBSMatrix;
    console.log(new Date() - start);
    isWorking = false;
}
const BLOCK = 50;
var partialWorkerCount = 0, MBSMatrixPartial;

function startPartialWorker() {
    var y;
    if (!isWorking && !upToDate(newMBSData, currentMBS)) {
        MBSMatrixPartial = new Array(resolution.y);
        start = new Date();
        for (y = 0; y < resolution.y; y+=BLOCK) {
            worker = new Worker("partialWorker.js");
            worker.onmessage = receivePartialMBSData;
            worker.postMessage({params: {
                    Resolution : resolution,
                    MBSData : newMBSData,
                    minY : y,
                    maxY : Math.min(y + BLOCK - 1, resolution.y - 1)
            }});
            partialWorkerCount++;
        }
        isWorking = true;
    }
}

function receivePartialMBSData(e) {
    
    var y;
    for (y = e.data.params.minY; y <= e.data.params.maxY; y++) {
        MBSMatrixPartial[y] = e.data.MBSMatrix[y - e.data.params.minY];
    }
    partialWorkerCount--;
    if (partialWorkerCount <= 0) {
        currentMBS.resolution = e.data.params.Resolution;
        currentMBS.MBSData = e.data.params.MBSData;
        currentMBS.MBSMatrix = MBSMatrixPartial;
        isWorking = false;
        console.log(new Date() - start);
    }
}

function upToDate(newData, currentData) {
    return  newData.minR === currentData.MBSData.minR &&
            newData.minI === currentData.MBSData.minI && 
            newData.rangeX === currentData.MBSData.rangeX &&
            newData.maxIteration === currentData.MBSData.maxIteration && 
            newData.radiusSquare === currentData.MBSData.radiusSquare &&
            resolution.x === currentData.resolution.x &&
            resolution.y === currentData.resolution.y;
}