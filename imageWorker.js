// imageWorker.js
const { parentPort, workerData } = require('worker_threads');
const fsPromise = require('fs').promises;
const { applyFilter }=require('./utils/applyFilterUtil');

const { inputPath, outputPath, filter } = workerData;

async function processImage() {
  return new Promise((resolve) => {
    setTimeout(async () => {
      const filteredBuffer=await applyFilter(inputPath, filter);
      fsPromise.writeFile(outputPath, filteredBuffer);
      // fs.unlinkSync(inputPath);
      resolve();
    }, 500);
  });
}

// Process the image and send the result back to the main thread
async function run() {
  try {
    await processImage();
    parentPort.postMessage({ success: true });
  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message });
  }
}

run();