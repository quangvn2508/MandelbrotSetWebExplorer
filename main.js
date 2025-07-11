const REGENERATE_INTERVAL = 1000, REPAINT_WAIT_TIME = 10, SCROLL_FACTOR = 0.1, BLOCK = 50;
const INITIAL_RANGE_X = 3;
var canvas, context, newMBS, currentMBS = {}, imageData = undefined, info;
var Module = null;
const initialParams = {
    rangeX : 3
};
var outputArrayPointer, frequencyArrayPointer;
var outputArray, frequencyArray;

init = async function() {
    Module = await CustomModule();
    canvas = document.getElementById("main-canvas");
    context = canvas.getContext('2d');
    info = {
        zoom_ele : document.getElementById("zoom-info"),
        position_ele : document.getElementById("position-info"),
        range_ele : document.getElementById("range-info"),
        time_ele : document.getElementById("time-info")
    };

    newMBS = {
        resolution : {},
        MBSData : {
            minR : -1.5,
            minI : -1,
            rangeX : INITIAL_RANGE_X,
            maxIteration : 1000,
            radiusSquare : 4
        }
    };
    
    frequencyArrayPointer = Module._malloc(1000 * Int32Array.BYTES_PER_ELEMENT);
    frequencyArray = new Int32Array(Module.HEAP32.buffer, frequencyArrayPointer, 300);

    resizeWindow();

    canvas.addEventListener('wheel', zoom, false);
    canvas.addEventListener('mousedown', click, false);
    canvas.addEventListener('mouseup', release, false);
    window.addEventListener("resize", resizeWindow);

    setInterval(regenerate, REGENERATE_INTERVAL); 
    setInterval(draw, REPAINT_WAIT_TIME);
}();


function draw() {
    let image = currentMBS, x, y;
    if (imageData === undefined) return;
    x = ((image.MBSData.minR - newMBS.MBSData.minR) / newMBS.MBSData.rangeX * newMBS.resolution.x) | 0;
    y = ((image.MBSData.minI - newMBS.MBSData.minI) / (newMBS.MBSData.rangeX) * newMBS.resolution.x) | 0;

    context.canvas.style.width = (image.MBSData.rangeX/newMBS.MBSData.rangeX*100) + "%";
    context.canvas.style.height = (image.MBSData.rangeX/newMBS.MBSData.rangeX*100) + "%";

    info.zoom_ele.innerHTML = "x" + ((initialParams.rangeX / image.MBSData.rangeX).toPrecision(3));
    info.position_ele.innerHTML = `(${image.MBSData.minR},${image.MBSData.minI})`;
    info.range_ele.innerHTML = `dx: ${newMBS.MBSData.rangeX.toPrecision(10)}`;

    canvas.style.transform = "translate(" + x + "px," + y + "px)";
    context.putImageData(imageData, 0, 0);
}

function upToDate() { return  JSON.stringify(newMBS) === JSON.stringify(currentMBS); }

// ***************** WORKER ***********************
// variable used in workers
var partialWorkerCount = 0, MBSMatrixPartial, frequency, numPoints, timer = 0, worker = undefined, isWorking = false, minPixelsPerColorPoint, curPixelsStack, curColorPoint, colorCode;
function regenerate() {
    if (!isWorking && !upToDate()) {
        timer = new Date();
        isWorking = true;

        const numElements = newMBS.resolution.x * newMBS.resolution.y;
        Module._free(outputArrayPointer);
        outputArrayPointer = Module._malloc(numElements * Int32Array.BYTES_PER_ELEMENT);
        outputArray = new Int32Array(Module.HEAP32.buffer, outputArrayPointer, numElements);

        numPoints = Module._calcMandel(
            newMBS.resolution.x, 
            newMBS.resolution.y, 
            newMBS.MBSData.minR, 
            newMBS.MBSData.minI, 
            newMBS.MBSData.rangeX, 
            newMBS.MBSData.maxIteration, 
            newMBS.MBSData.radiusSquare,
            outputArrayPointer,
            frequencyArrayPointer);
        
        currentMBS.resolution = { ...newMBS.resolution };
        currentMBS.MBSData = { ...newMBS.MBSData };

        generateColorCode();
        makeImage();

        isWorking = false;
        info.time_ele.innerHTML = `${(new Date() - timer)} ms`;
    }
}

// Mandelbrot Set functionalities
function zoom(e) {
    const zoomFactor =  1 + (e.deltaY>0? 1 : -1)*SCROLL_FACTOR;
    let splitX, splitY;
    splitX = newMBS.MBSData.rangeX * (e.pageX / newMBS.resolution.x) + newMBS.MBSData.minR;
    splitY = newMBS.MBSData.rangeX * (e.pageY / newMBS.resolution.x) + newMBS.MBSData.minI;

    // Update params
    newMBS.MBSData.rangeX *= zoomFactor;
    newMBS.MBSData.minR = splitX - (splitX - newMBS.MBSData.minR) * zoomFactor;
    newMBS.MBSData.minI = splitY - (splitY - newMBS.MBSData.minI) * zoomFactor;
}

var mouseposition;
function click(e) {
    mouseposition = {x : e.pageX, y : e.pageY};
}

function release(e) {
    dx = mouseposition.x - e.pageX;
    dy = mouseposition.y - e.pageY;

    newMBS.MBSData.minR += (dx/newMBS.resolution.x) * newMBS.MBSData.rangeX;
    newMBS.MBSData.minI += (dy/newMBS.resolution.x) * newMBS.MBSData.rangeX;
}

function generateColorCode() {
    minPixelsPerColorPoint = Math.max((numPoints / 255) | 0, 1);
    curPixelsStack = 0;
    curColorPoint = 0;
    
    colorCode = new Array(currentMBS.MBSData.maxIteration).fill(0);

    for (let i = 0; i < currentMBS.MBSData.maxIteration; i++) {
        curPixelsStack += frequencyArray[i];
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

function makeImage() {
    imageData = context.createImageData(currentMBS.resolution.x, currentMBS.resolution.y);
    
    for (let i = 0; i < imageData.data.length/4; i++) {
        y = (i/currentMBS.resolution.x)|0;
        x = i%currentMBS.resolution.x;
        if (outputArray[y * currentMBS.resolution.x + x] === currentMBS.MBSData.maxIteration) {
            imageData.data[i*4+3] = 255;
        } else {
            imageData.data[i*4+3] = 255 - colorCode[outputArray[y * currentMBS.resolution.x + x]];
        }
    }
}

function resizeWindow() {
    newMBS.resolution = {x: window.innerWidth, y : window.innerHeight};
    context.canvas.width = newMBS.resolution.x;
    context.canvas.height = newMBS.resolution.y;
}
