#include <emscripten.h>
#include <emscripten/threading.h>
#include <vector>
#include <thread>

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

void computeMandelRow(
        int startY, 
        int endY, 
        double minR, 
        double minI, 
        double step, 
        int maxIteration, 
        double radiusSquare, 
        int resolutionX, 
        int* outputArray) 
{   
    for (int y = startY; y <= endY; y++) {
        double Img = minI + (0.5 + y)*step;
        for (int x = 0; x < resolutionX; x++) {
            double Real = minR + (0.5 + x)*step;
            outputArray[y*resolutionX + x] = calcMandel(Real, Img, maxIteration, radiusSquare);
        }
    }
}

const int BLOCK = 50;

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
        std::vector<int> frequency(maxIteration, 0);
        int numPoints = 0;

        double step = rangeX / resolutionX;
        std::vector<std::thread> threads;

        for (int y = 0; y < resolutionY; y+=BLOCK) {
            threads.push_back(std::thread(computeMandelRow, y, std::min(y + BLOCK - 1, resolutionY - 1), minR, minI, step, maxIteration, radiusSquare, resolutionX, outputArray));
        }

        for (auto& thread : threads) {
            thread.join();
        }

        for (int y = 0; y < resolutionY; y++) {
            for (int x = 0; x < resolutionX; x++) {
                if (outputArray[y*resolutionX + x] < maxIteration) {
                    frequency[outputArray[y*resolutionX + x]]++;
                    numPoints++;
                }
            }
        }

        for (int i = 0; i < maxIteration; i++) {
            frequencyArray[i] = frequency[i];
        }

        return numPoints;
    }
}
