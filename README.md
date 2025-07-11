# MandelbrotSetWebExplorer [link](https://quangvn2508.github.io/MandelbrotSetWebExplorer/)

A responsive web page to explore and view Mandelbrot Set. ~~Since javascript is single threaded language, I have used web worker to run expensive computation in worker space seperated from the user-interface. There are several workers, each calculate part of the Mandelbrot set to speed up and utilise more CPU power.~~ Now I use WebAssembly with multi-threading and achieve a much better performance.

This project is similar with my previous project (Mandelbrot-set-explorer) which is programmed with Java. FYI, see my [Report](https://github.com/quangvn2508/Mandelbrot-Set-Explorer/blob/master/190006106_MP2_Report.pdf) for the explanation of the underline mechanism.

### Current functionalities:

* Zoom by scrolling
* Pan by dragging
* Display basic data (current zoom factor, real number range, top-left position, ellapsed time to compute a frame).


# Build wasm
- Require emsdk
- Require python3
- When serve the files, need to include `Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp` in the header.

```
source <PATH_TO_EMSDK>/emsdk_env.sh
emcc code.cpp -o code.js -sEXPORTED_FUNCTIONS=_calcMandel,_malloc,_free -sEXPORTED_RUNTIME_METHODS=ccall,cwrap -sMODULARIZE=1 -sEXPORT_NAME=CustomModule -sASSERTIONS -sALLOW_MEMORY_GROWTH=0 -O3 -sUSE_PTHREADS=1 -sPTHREAD_POOL_SIZE=<pool_size>
```

`pool_size` is the number of threads used, can be calculated by max `window.innerHeight` devided by `BLOCK_SIZE` (i.e. 50).

# Just run
Serve the files and open on browser that supports SharedArrayBuffer.
```
python3 serve.py
```