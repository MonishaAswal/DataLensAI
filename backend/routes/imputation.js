import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { protect } from '../middleware/authMiddleware.js';
import { analyzeDatasetFile } from '../services/pythonService.js';
import { openAsBlob } from 'fs';
import Dataset from '../models/Dataset.js';

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
  let filePath, originalName, isTempFile;
  let dbDataset = null;
  
  if (req.file) {
    filePath = req.file.path;
    originalName = req.file.originalname;
    isTempFile = true;
  } else {
    const { datasetId } = req.body;
    if (!datasetId) {
      return res.status(400).json({ message: 'No file uploaded and no datasetId provided.' });
    }
    try {
      dbDataset = await Dataset.findOne({ _id: datasetId, userId: req.user._id });
      if (!dbDataset) {
        return res.status(404).json({ message: 'Dataset not found or unauthorized.' });
      }
      filePath = dbDataset.filePath;
      originalName = dbDataset.originalName;
      isTempFile = false;
    } catch (err) {
      return res.status(500).json({ message: 'Error retrieving dataset from database.', error: err.message });
    }
  }

  console.log(`[Smart Imputation] Resolved source file. Name: ${originalName}, Path: ${filePath}, isTempFile: ${isTempFile}`);
  if (dbDataset) {
    console.log(`[Smart Imputation] Loaded initial storageUrl from DB: ${dbDataset.storageUrl}`);
  }

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

    // Save cleaned file permanently in the uploads folder
    const permanentCleanedFilename = `cleaned-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(originalName)}`;
    const permanentCleanedFilePath = path.join(uploadDir, permanentCleanedFilename);
    await fs.promises.writeFile(permanentCleanedFilePath, buffer);
    const cleanedUrl = `${req.protocol}://${req.get('host')}/uploads/${permanentCleanedFilename}`;
    console.log(`[Smart Imputation] Generated new imputed storageUrl: ${cleanedUrl}`);

    // Clean up temporary files
    if (isTempFile && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (fs.existsSync(cleanedFilePath)) fs.unlinkSync(cleanedFilePath);

    const { datasetId } = req.body;
    let dataset = null;
    if (datasetId) {
      const initialRows = updatedEdaResults.dimensions?.rows || 0;
      const initialCols = updatedEdaResults.dimensions?.columns || 0;
      const initialScore = updatedEdaResults.quality_score || 85;

      const actions = report.map(r => `Smart imputed column ${r.column} using ${r.method}`);

      dataset = await Dataset.findOneAndUpdate(
        { _id: datasetId, userId: req.user._id },
        {
          $set: {
            cleanedFilePath: permanentCleanedFilePath,
            storageUrl: cleanedUrl,
            status: 'cleaned',
            rowCount: initialRows,
            columnCount: initialCols,
            columns: updatedEdaResults.columns || [],
            edaResults: updatedEdaResults,
            cleaningReport: {
              profiling: {
                initial_rows: initialRows,
                initial_cols: initialCols,
                initial_quality_score: initialScore,
                duplicate_rows_before: 0,
                missing_cells_before: beforeMissingCount
              },
              issue_detection: report.map(r => ({
                column: r.column,
                issue: "Missing Values",
                severity: "medium",
                description: `Imputed ${r.missingBefore} missing values`
              })),
              automated_fixes: actions,
              validation_pass: {
                checks_run: ["Confirm missing values imputation"],
                status: "Success",
                remaining_issues: afterMissingCount
              },
              final_assessment: {
                final_rows: initialRows,
                final_cols: initialCols,
                final_quality_score: initialScore,
                duplicate_rows_after: 0,
                missing_cells_after: afterMissingCount,
                quality_gain: 0
              }
            }
          },
          $push: {
            cleaningActions: { $each: actions }
          }
        },
        { new: true }
      );
      console.log(`[Smart Imputation] Dataset updated in DB. ID: ${datasetId}. New storageUrl saved: ${dataset?.storageUrl}`);
    }

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
      columns: updatedEdaResults.columns || [],
      dataset
    });

  } catch (error) {
    console.error('[Stateless Smart Impute] Error:', error);
    if (isTempFile && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }
    return res.status(500).json({
      message: 'Failed to run Smart AI Imputation',
      error: error.message,
    });
  }
});

export default router;
