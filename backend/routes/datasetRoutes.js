import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { protect } from '../middleware/authMiddleware.js';
import {
  uploadDataset,
  cleanDataset,
  getAIInsights,
  getDatasets,
  getDatasetById,
  updateDataset,
  deleteDataset
} from '../controllers/datasetController.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage for temporary processing
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExts = ['.csv', '.xlsx', '.xls', '.json'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV, Excel (XLSX/XLS), and JSON files are supported!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// State-based REST Protected routes
router.post('/upload', protect, upload.single('file'), uploadDataset);
router.post('/clean', protect, upload.single('file'), cleanDataset);
router.post('/insights', protect, getAIInsights);
router.post('/persist', protect, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  return res.status(200).json({ fileUrl });
});

router.route('/')
  .get(protect, getDatasets);

router.route('/:id')
  .get(protect, getDatasetById)
  .put(protect, updateDataset)
  .delete(protect, deleteDataset);

export default router;
