#include <emscripten.h>
#include <iostream>
#include <vector>

int calcMandel(double Real, double Img, int maxIt, double r2)
{
    int it = 0;
    double zr = 0, zi = 0, zr2, zi2, nzr, nzi;

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

extern "C" {
    EMSCRIPTEN_KEEPALIVE
    int calcMandel(
            int resolutionX,
            int resolutionY,
            double minR,
            double minI,
            double rangeX,
            int maxIteration,
            double radiusSquare,
            int* outputArray,
            int* frequencyArray)
    {
        std::vector<std::vector<int>> MBSMatrix(resolutionY, std::vector<int>(resolutionX, 0));
        std::vector<int> frequency(maxIteration);
        int numPoints = 0;

        double step = rangeX / resolutionX;

        for (int y = 0; y < resolutionY; y++) {
            double Img = minI + (0.5 + y)*step;
            for (int x = 0; x < resolutionX; x++) {
                double Real = minR + (0.5 + x)*step;
                MBSMatrix[y][x] = calcMandel(Real, Img, maxIteration, radiusSquare);
            }
        }

        for (int y = 0; y < resolutionY; y++) {
            for (int x = 0; x < resolutionX; x++) {
                if (MBSMatrix[y][x] < maxIteration) {
                    frequency[MBSMatrix[y][x]]++;
                    numPoints++;
                }
            }
        }

        return numPoints;
    }
}
