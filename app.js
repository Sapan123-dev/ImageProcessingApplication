// Main application file: app.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const { Worker } = require('worker_threads');
const fs = require('fs');
const { applyFilter }=require('./utils/applyFilterUtil');

const app = express();
const PORT = process.env.PORT || 3000;

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Set up storage for processed files
const processedDir = path.join(__dirname, 'processed');
if (!fs.existsSync(processedDir)) {
  fs.mkdirSync(processedDir);
}

// Serve static files from the 'public' directory
app.use(express.static('public'));
app.use('/processed', express.static('processed'));
app.use(express.json());

const fsPromise = require('fs').promises;

async function processSingleThreaded(files, filter) {
    const startTime = Date.now();
    const results = [];

    for (const file of files) {
        try {
            const inputPath = file.path;
            const outputPath = path.join(processedDir, `${filter}-${path.basename(file.path)}`);
            
            // Apply filter
            const filteredBuffer = await applyFilter(inputPath, filter);
            await fsPromise.writeFile(outputPath, filteredBuffer);
            await fsPromise.unlink(inputPath); // Non-blocking delete
            
            results.push({
                originalName: file.originalname,
                processedPath: `/processed/${filter}-${path.basename(file.path)}`
            });
        } catch (err) {
            console.error(`Error processing ${file.originalname}:`, err);
        }
    }

    return {
        results,
        processingTime: Date.now() - startTime
    };
}


// Multi-threaded image processing
async function processMultiThreaded(files, filter) {
  const startTime = Date.now();
  const workerPromises = [];

  // Create a worker for each file
  for (const file of files) {
    const outputPath = path.join(processedDir, `${filter}-${path.basename(file.path)}`);
    
    const workerPromise = new Promise((resolve, reject) => {
      const worker = new Worker('./imageWorker.js', {
        workerData: {
          inputPath: file.path,
          outputPath,
          filter
        }
      });

      worker.on('message', result => {
        resolve({
          originalName: file.originalname,
          processedPath: `/processed/${filter}-${path.basename(file.path)}`
        });
      });

      worker.on('error', reject);
      worker.on('exit', code => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });

    workerPromises.push(workerPromise);
  }

  const results = await Promise.all(workerPromises);
  console.log(results);

  return {
    results,
    processingTime: Date.now() - startTime
  };
}

// Upload endpoint that processes images
app.post('/upload', upload.array('images', 10), async (req, res) => {
  try {
    const { filter, useMultiThreading } = req.body;
    console.log(filter);
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    let result;
    if (useMultiThreading === 'true') {
      result = await processMultiThreaded(files, filter);
    } else {
      result = await processSingleThreaded(files, filter);
    }

    res.json(result);
  } catch (error) {
    console.error('Error processing images:', error);
    res.status(500).json({ error: 'Failed to process images' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});