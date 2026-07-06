import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { protect } from '../middleware/authMiddleware.js';
import { analyzeDatasetFile } from '../services/pythonService.js';
import { openAsBlob } from 'fs';

const router = express.Router();
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

/**
 * @route   POST /api/imputation/smart
 * @desc    Execute Machine Learning Smart AI Imputation on a dataset file (Stateless)
 * @access  Private
 */
router.post('/smart', protect, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded for smart imputation.' });
  }

  const { path: filePath, originalname: originalName } = req.file;

  try {
    console.log(`[Stateless Smart Impute] Starting ML pipeline for file: ${originalName}`);

    // 1. Prepare file blob & send to Python service
    const fileBlob = await openAsBlob(filePath);
    const formData = new FormData();
    formData.append('file', fileBlob, originalName);

    const pythonEndpoint = `${PYTHON_SERVICE_URL}/api/imputation/smart`;
    console.log(`[Stateless Smart Impute] Requesting Python service: ${pythonEndpoint}`);

    const response = await fetch(pythonEndpoint, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      console.error(`[Stateless Smart Impute] Python service error: ${errorMsg}`);
      return res.status(500).json({
        message: 'Python machine learning service failed.',
        error: errorMsg,
      });
    }

    const result = await response.json();
    const { cleanedData, report, beforeMissingCount, afterMissingCount, columnsProcessed, cleanedFileBase64, metrics } = result;

    if (!cleanedFileBase64) {
      throw new Error('Cleaned dataset file payload was not returned by the imputation service.');
    }

    // 2. Write the cleaned file momentarily to run post-clean analysis
    const buffer = Buffer.from(cleanedFileBase64, 'base64');
    const tempDir = path.dirname(filePath);
    const cleanedFilename = `imputed_${Date.now()}_${originalName}`;
    const cleanedFilePath = path.join(tempDir, cleanedFilename);

    await fs.promises.writeFile(cleanedFilePath, buffer);

    console.log(`[Stateless Smart Impute] Running post-clean analysis...`);
    const updatedEdaResults = await analyzeDatasetFile(cleanedFilePath, originalName);

    // Clean up temporary files
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (fs.existsSync(cleanedFilePath)) fs.unlinkSync(cleanedFilePath);

    return res.status(200).json({
      cleanedData,
      report,
      beforeMissingCount,
      afterMissingCount,
      columnsProcessed,
      cleanedFileBase64,
      metrics,
      edaResults: updatedEdaResults,
      rowCount: updatedEdaResults.dimensions?.rows || 0,
      columnCount: updatedEdaResults.dimensions?.columns || 0,
      columns: updatedEdaResults.columns || []
    });

  } catch (error) {
    console.error('[Stateless Smart Impute] Error:', error);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }
    return res.status(500).json({
      message: 'Failed to run Smart AI Imputation',
      error: error.message,
    });
  }
});

export default router;
