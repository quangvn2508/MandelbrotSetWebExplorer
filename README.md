# MandelbrotSetWebExplorer [link](https://quangvn2508.github.io/MandelbrotSetWebExplorer/)

A responsive web page to explore and view Mandelbrot Set. Since javascript is single threaded language, I have used web worker to run expensive computation in worker space seperated from the user-interface. There are several workers, each calculate part of the Mandelbrot set to speed up and utilise more CPU power.

This project is similar with my previous project (Mandelbrot-set-explorer) which is programmed with Java. [Report](https://github.com/quangvn2508/Mandelbrot-Set-Explorer/blob/master/190006106_MP2_Report.pdf)

### Current functionalities:

* Zoom by scrolling
* Pan by dragging
* Display basic data (current zoom factor, real number range, top-left position, ellapsed time to compute a frame).
* To be continue...
