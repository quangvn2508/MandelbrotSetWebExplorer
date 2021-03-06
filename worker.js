var MBSMatrix, frequency, numPoints;

this.onmessage = function(e) {
    if (e.data.params !== undefined) {
        calMandelbrotSet(e.data.params);
        getFrequency(e.data.params);
        this.postMessage({params: e.data.params, MBSMatrix : MBSMatrix, FrequencyData: {Frequency : frequency, Count: numPoints}});
    }
}

function getFrequency(params) {
    frequency = new Array(params.MBSData.maxIteration).fill(0);
    numPoints = 0;
    for (let y = params.minY; y <= params.maxY; y++) {
        for (let x = 0; x < params.Resolution.x; x++) {
            if (MBSMatrix[y-params.minY][x] < params.MBSData.maxIteration) {
                frequency[MBSMatrix[y-params.minY][x]]++;
                numPoints++;
            }
        }
    }
}

function calcMandel(Real, Img, maxIt, r2) {
    let it = 0, zr = 0, zi = 0, zr2, zi2, nzr, nzi;

    while (it < maxIt) {
        zr2 = zr * zr;
        zi2 = zi * zi;
        nzr = zr2 - zi2 + Real;
        nzi = 2 * zr * zi + Img;
        zr = nzr;
        zi = nzi;
        if ((zr2 + zi2) > r2)
            break;
        it++;
    }
    return it;
}

function calMandelbrotSet(params) {
    let step, Real, Img;

    MBSMatrix = new Array(params.maxY - params.minY + 1).fill(0)
    .map(() => new Array(params.Resolution.x).fill(0));

    step = params.MBSData.rangeX / params.Resolution.x;

    for (let y = params.minY; y <= params.maxY; y++) {
        Img = params.MBSData.minI + step*(0.5 + y);
        for (let x = 0; x < params.Resolution.x; x++) {
            Real = params.MBSData.minR + step*(0.5 + x);
            MBSMatrix[y-params.minY][x] = calcMandel(Real, Img, params.MBSData.maxIteration, params.MBSData.radiusSquare);
        }
    }
}