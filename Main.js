const WORKER_WAIT_TIME = 10, REPAINT_WAIT_TIME = 10, SCROLL_FACTOR = 0.1, BLOCK = 50;
var canvas, context, newMBS, currentMBS = {}, imageData = undefined;

init = function() {
    canvas = document.getElementById("main-canvas");
    context = canvas.getContext('2d');

    newMBS = {
        resolution : {},
        MBSData : {
            minR : -1.5,
            minI : -1,
            rangeX : 3,
            maxIteration : 1000,
            radiusSquare : 4
        }
    };

    resizeWindow();

    canvas.addEventListener('wheel', scroll, false);
    window.addEventListener("resize", resizeWindow);

    setInterval(draw, REPAINT_WAIT_TIME);

    if (window.Worker) setInterval(startPartialWorker, WORKER_WAIT_TIME);
    else alert("Your browser do not support web worker");
}();

function resizeWindow() {
    newMBS.resolution = {x: window.innerWidth, y : window.innerHeight};
    context.canvas.width = newMBS.resolution.x;
    context.canvas.height = newMBS.resolution.y;
}

function draw() {
    var image = currentMBS, x, y;
    if (imageData === undefined) return;
    x = ((image.MBSData.minR - newMBS.MBSData.minR) / newMBS.MBSData.rangeX * newMBS.resolution.x) | 0;
    y = ((image.MBSData.minI - newMBS.MBSData.minI) / (newMBS.MBSData.rangeX) * newMBS.resolution.x) | 0;

    context.canvas.style.width = (image.MBSData.rangeX/newMBS.MBSData.rangeX*100) + "%";
    context.canvas.style.height = (image.MBSData.rangeX/newMBS.MBSData.rangeX*100) + "%";

    canvas.style.transform = "translate(" + x + "px," + y + "px)";
    context.putImageData(imageData, 0, 0);
}

function upToDate() {
    return  JSON.stringify(newMBS) === JSON.stringify(currentMBS);
}

// ***************** WORKER ***********************
// variable used in workers
var partialWorkerCount = 0, MBSMatrixPartial, frequency, numPoints, timer = 0, worker = undefined, isWorking = false, y, i, minPixelsPerColorPoint, curPixelsStack, curColorPoint, colorCode;
function startPartialWorker() {
    var y;
    if (!isWorking && !upToDate()) {
        timer = new Date(); // Ellapsed timer

        MBSMatrixPartial = new Array(newMBS.resolution.y);
        frequency = new Array(newMBS.MBSData.maxIteration).fill(0);
        numPoints = 0;
        
        for (y = 0; y < newMBS.resolution.y; y+=BLOCK) {
            startAWorker(y);
            partialWorkerCount++;
        }
        isWorking = true;
    }
}

function startAWorker(y) {
    worker = new Worker("worker.js");
    worker.onmessage = receivePartialMBSData;
    worker.postMessage({params: {
            Resolution : newMBS.resolution,
            MBSData : newMBS.MBSData,
            minY : y,
            maxY : Math.min(y + BLOCK - 1, newMBS.resolution.y - 1)
    }});
}

function generateColorCode() {
    minPixelsPerColorPoint = Math.max((numPoints / 255) | 0, 1);
    curPixelsStack = 0;
    curColorPoint = 0;
    
    colorCode = new Array(currentMBS.MBSData.maxIteration).fill(0);

    for (i = 0; i < currentMBS.MBSData.maxIteration; i++) {
        curPixelsStack += frequency[i];
        // cumulative frequency large enough to move to next color value.
        if (curPixelsStack >= minPixelsPerColorPoint) {
            colorRange = 0;
            // If the frequency too high and occupy more than one color value.
            while (curPixelsStack >= minPixelsPerColorPoint) {
                curPixelsStack -= minPixelsPerColorPoint;
                colorRange++; // find the range of color value occupied
            }
            
            colorCode[i] = curColorPoint + colorRange/2; // get middle color value from range
            curColorPoint += colorRange; // increase to next color value
        }else {
            colorCode[i] = curColorPoint; // if cumulative frequency not enough to move to next color value then use current color value.
        }
    }
}

function setDataFromWorker(data) {
    var y;
    for (y = data.params.minY; y <= data.params.maxY; y++) {
        MBSMatrixPartial[y] = data.MBSMatrix[y - data.params.minY];
    }
    for (i = 0; i < data.params.MBSData.maxIteration; i++) {
        frequency[i] += data.FrequencyData.Frequency[i];
    }
    numPoints += data.FrequencyData.Count;
}

function makeImage() {
    imageData = context.createImageData(currentMBS.resolution.x, currentMBS.resolution.y);
    
    for (i = 0; i < imageData.data.length/4; i++) {
        if (MBSMatrixPartial[(i/currentMBS.resolution.x)|0][(i%currentMBS.resolution.x)] === currentMBS.MBSData.maxIteration) {
            imageData.data[i*4] = 0;
        } else {
            imageData.data[i*4] = colorCode[MBSMatrixPartial[(i/currentMBS.resolution.x)|0][(i%currentMBS.resolution.x)]];
        }
        imageData.data[i*4+3] =  255;
    }
}

function receivePartialMBSData(e) {
    setDataFromWorker(e.data);
    partialWorkerCount--;

    if (partialWorkerCount === 0) {
        currentMBS.resolution = e.data.params.Resolution;
        currentMBS.MBSData = e.data.params.MBSData;

        generateColorCode();
        makeImage();

        isWorking = false;
        console.log((new Date() - timer) + " ms");
    }
}

// Mandelbrot Set functionalities
async function scroll(e) {
    const zoomFactor =  1 + (e.deltaY>0? 1 : -1)*SCROLL_FACTOR;
    var splitX, splitY;
    splitX = newMBS.MBSData.rangeX * (e.pageX / newMBS.resolution.x) + newMBS.MBSData.minR;
    splitY = newMBS.MBSData.rangeX * (e.pageY / newMBS.resolution.x) + newMBS.MBSData.minI;

    // Update params
    newMBS.MBSData.rangeX *= zoomFactor;
    newMBS.MBSData.minR = splitX - (splitX - newMBS.MBSData.minR) * zoomFactor;
    newMBS.MBSData.minI = splitY - (splitY - newMBS.MBSData.minI) * zoomFactor;
}