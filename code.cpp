#include <emscripten.h>
#include <iostream>
#include <vector>

extern "C" {
    EMSCRIPTEN_KEEPALIVE
    void calcMandel(
            int resolutionX,
            int resolutionY,
            double minR,
            double minI,
            double rangeX,
            int maxIteration,
            double radiusSquare,
            int* outputArray) 
    {

        std::cout << "Hello World!" << std::endl
            << "resolutionX: " << resolutionX << std::endl
            << "resolutionY: " << resolutionY << std::endl
            << "minR: " << minR << std::endl
            << "minI: " << minI << std::endl
            << "rangeX: " << rangeX << std::endl
            << "maxIteration: " << maxIteration << std::endl
            << "radiusSquare: " << radiusSquare << std::endl;

        outputArray[0] = 1;
        outputArray[1] = 2;
        outputArray[2] = 3;
        outputArray[3] = 4;
    }
}
