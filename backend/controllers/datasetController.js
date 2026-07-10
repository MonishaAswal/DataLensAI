import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Dataset from '../models/Dataset.js';
import AnalysisHistory from '../models/AnalysisHistory.js';
import {
  analyzeDatasetFile,
  cleanDatasetFile,
  generateAIReport
} from '../services/pythonService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', 'uploads');

/**
 * @desc    Upload dataset, run initial EDA analysis, and save to MongoDB
 * @route   POST /api/dataset/upload
 * @access  Private
 */
export const uploadDataset = async (req, res) => {
  let filePath, originalName, size, storageUrl, filename;

  if (req.file) {
    filePath = req.file.path;
    originalName = req.file.originalname;
    size = req.file.size;
    filename = req.file.filename;
    storageUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
  } else if (req.body.storageUrl) {
    storageUrl = req.body.storageUrl;
    originalName = req.body.originalName || 'dataset.csv';
    size = req.body.size || 0;
    
    // Download file locally for analysis & caching
    try {
      console.log(`[MongoDB Upload] Downloading dataset from cloud storage: ${storageUrl}`);
      const response = await fetch(storageUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      filename = `cloud-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(originalName)}`;
      filePath = path.join(uploadDir, filename);
      await fs.promises.writeFile(filePath, buffer);
      console.log(`[MongoDB Upload] Cloud dataset downloaded locally to: ${filePath}`);
    } catch (err) {
      console.error('[MongoDB Upload] Download failed:', err);
      return res.status(500).json({ 
        message: 'Failed to download cloud dataset for analysis.', 
        error: err.message 
      });
    }
  } else {
    return res.status(400).json({ message: 'No file uploaded and no storageUrl provided.' });
  }

  try {
    console.log(`[MongoDB Upload] Starting analysis for: ${originalName}`);
    const edaResults = await analyzeDatasetFile(filePath, originalName);

    const rowCount = edaResults.dimensions?.rows || 0;
    const columnCount = edaResults.dimensions?.columns || 0;
    const columns = edaResults.columns || [];

    // Save dataset details in MongoDB
    const dataset = await Dataset.create({
      userId: req.user._id,
      originalName,
      datasetName: originalName,
      filename,
      filePath: filePath,
      size,
      rowCount,
      columnCount,
      columns,
      edaResults,
      status: 'analyzed',
      storageUrl,
      cleaningActions: []
    });

    console.log(`[MongoDB Upload] Dataset successfully saved to DB with ID: ${dataset._id}`);
    return res.status(201).json(dataset);
  } catch (error) {
    console.error('Error during upload/analysis:', error);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }
    return res.status(500).json({
      message: 'Failed to analyze dataset',
      error: error.message,
    });
  }
};

/**
 * @desc    Apply sanitizer cleaning configurations, save cleaned file, and update MongoDB
 * @route   POST /api/dataset/clean
 * @access  Private
 */
export const cleanDataset = async (req, res) => {
  let filePath, originalName, isTempFile;
  let dbDataset = null;
  const targetId = req.params.id || req.body.datasetId;

  if (req.file) {
    filePath = req.file.path;
    originalName = req.file.originalname;
    isTempFile = true;
  } else {
    if (!targetId) {
      return res.status(400).json({ message: 'No file uploaded and no datasetId provided.' });
    }
    try {
      dbDataset = await Dataset.findOne({ _id: targetId, userId: req.user._id });
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

  console.log(`[MongoDB Clean] Resolved source file. Name: ${originalName}, Path: ${filePath}, isTempFile: ${isTempFile}`);
  if (dbDataset) {
    console.log(`[MongoDB Clean] Loaded initial storageUrl from DB: ${dbDataset.storageUrl}`);
  }

  // Convert inputs from FormData string representation or JSON to appropriate types
  const removeDuplicates = req.body.removeDuplicates === 'true' || req.body.removeDuplicates === true;
  const imputeNumeric = req.body.imputeNumeric || 'none';
  const imputeCategorical = req.body.imputeCategorical || 'none';
  const removeEmptyCols = req.body.removeEmptyCols === 'true' || req.body.removeEmptyCols === true;
  const standardizeDates = req.body.standardizeDates === 'true' || req.body.standardizeDates === true;
  const datasetId = targetId || req.body.datasetId;

  try {
    console.log(`[MongoDB Clean] Cleaning dataset: ${originalName}`);
    
    // Call Python cleaning service
    const { buffer, cleanSummary, cleaningReport } = await cleanDatasetFile(filePath, originalName, {
      removeDuplicates,
      imputeNumeric,
      imputeCategorical,
      removeEmptyCols,
      standardizeDates
    });

    // Write cleaned buffer to a permanent output path
    const cleanedFilename = `cleaned-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(originalName)}`;
    const cleanedFilePath = path.join(uploadDir, cleanedFilename);
    
    await fs.promises.writeFile(cleanedFilePath, buffer);

    // Call Python analyze service on the cleaned file to compile post-cleaning distributions & stats
    console.log(`[MongoDB Clean] Running post-clean analysis...`);
    const updatedEdaResults = await analyzeDatasetFile(cleanedFilePath, originalName);

    // Clean up temporary upload file immediately
    if (isTempFile && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }

    const cleanedUrl = `${req.protocol}://${req.get('host')}/uploads/${cleanedFilename}`;
    console.log(`[MongoDB Clean] Generated new cleaned storageUrl: ${cleanedUrl}`);

    // Update dataset record in MongoDB if datasetId was provided
    let dataset = null;
    if (datasetId) {
      dataset = await Dataset.findOneAndUpdate(
        { _id: datasetId, userId: req.user._id },
        {
          $set: {
            cleanedFilePath: cleanedFilePath,
            storageUrl: cleanedUrl,
            status: 'cleaned',
            rowCount: updatedEdaResults.dimensions?.rows || 0,
            columnCount: updatedEdaResults.dimensions?.columns || 0,
            columns: updatedEdaResults.columns || [],
            edaResults: updatedEdaResults,
            cleaningReport: cleaningReport,
          },
          $push: {
            cleaningActions: { $each: cleanSummary }
          }
        },
        { new: true }
      );
      console.log(`[MongoDB Clean] Dataset updated in DB. ID: ${datasetId}. New storageUrl saved: ${dataset?.storageUrl}`);
    }

    return res.status(200).json({
      cleanedFileBase64: buffer.toString('base64'),
      cleanSummary,
      cleaningReport,
      edaResults: updatedEdaResults,
      rowCount: updatedEdaResults.dimensions?.rows || 0,
      columnCount: updatedEdaResults.dimensions?.columns || 0,
      columns: updatedEdaResults.columns || [],
      status: 'cleaned',
      dataset // returns the full updated dataset record
    });
  } catch (error) {
    console.error('Error during data cleaning:', error);
    if (isTempFile && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }
    return res.status(500).json({
      message: 'Failed to clean dataset',
      error: error.message,
    });
  }
};

/**
 * @desc    Get AI-generated report using LangChain & Gemini (Stateless)
 * @route   POST /api/dataset/insights
 * @access  Private
 */
export const getAIInsights = async (req, res) => {
  const { datasetName, edaResults, datasetId } = req.body;

  if (!datasetName || !edaResults) {
    return res.status(400).json({ message: 'datasetName and edaResults are required in request body.' });
  }

  try {
    console.log(`[LLM Insights] Invoking LLM report generator for: ${datasetName}`);
    const apiKey = process.env.GROQ_API_KEY;
    
    const reportMarkdown = await generateAIReport(
      datasetName,
      edaResults,
      apiKey
    );

    // Save AI Report to MongoDB if datasetId is provided
    if (datasetId) {
      await Dataset.findOneAndUpdate(
        { _id: datasetId, userId: req.user._id },
        { $set: { aiReport: reportMarkdown } }
      );
      console.log(`[LLM Insights] AI Report saved to DB for dataset ID: ${datasetId}`);
    }

    return res.status(200).json({ 
      report: reportMarkdown
    });
  } catch (error) {
    console.error('[LLM Insights] Exception:', error);
    return res.status(500).json({ 
      message: 'Failed to generate AI insights', 
      error: error.message,
    });
  }
};

/**
 * @desc    Get all datasets for authenticated user
 * @route   GET /api/dataset
 * @access  Private
 */
export const getDatasets = async (req, res) => {
  try {
    const datasets = await Dataset.find({ userId: req.user._id }).sort({ createdAt: -1 });
    const host = req.get('host');
    const protocol = req.protocol;
    const mapped = datasets.map(d => {
      const doc = d.toObject ? d.toObject() : d;
      if (!doc.storageUrl && doc.filename) {
        doc.storageUrl = `${protocol}://${host}/uploads/${doc.filename}`;
        console.log(`[MongoDB getDatasets] Auto-synthesized missing storageUrl for ${doc.originalName}: ${doc.storageUrl}`);
      } else {
        console.log(`[MongoDB getDatasets] Loaded storageUrl for ${doc.originalName}: ${doc.storageUrl}`);
      }
      return doc;
    });
    return res.status(200).json(mapped);
  } catch (error) {
    console.error('Error getting datasets:', error);
    return res.status(500).json({ message: 'Server error retrieving datasets list' });
  }
};

/**
 * @desc    Get single dataset by ID
 * @route   GET /api/dataset/:id
 * @access  Private
 */
export const getDatasetById = async (req, res) => {
  try {
    const dataset = await Dataset.findOne({ _id: req.params.id, userId: req.user._id });
    if (!dataset) {
      return res.status(404).json({ message: 'Dataset not found or unauthorized' });
    }
    const doc = dataset.toObject ? dataset.toObject() : dataset;
    if (!doc.storageUrl && doc.filename) {
      doc.storageUrl = `${req.protocol}://${req.get('host')}/uploads/${doc.filename}`;
      console.log(`[MongoDB getDatasetById] Auto-synthesized missing storageUrl for single doc: ${doc.storageUrl}`);
    } else {
      console.log(`[MongoDB getDatasetById] Loaded storageUrl for single doc: ${doc.storageUrl}`);
    }
    return res.status(200).json(doc);
  } catch (error) {
    console.error('Error getting dataset details:', error);
    return res.status(500).json({ message: 'Server error retrieving dataset details' });
  }
};

/**
 * @desc    Update dataset details
 * @route   PUT /api/dataset/:id
 * @access  Private
 */
export const updateDataset = async (req, res) => {
  try {
    const dataset = await Dataset.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: req.body },
      { new: true }
    );
    if (!dataset) {
      return res.status(404).json({ message: 'Dataset not found or unauthorized' });
    }
    const doc = dataset.toObject ? dataset.toObject() : dataset;
    if (!doc.storageUrl && doc.filename) {
      doc.storageUrl = `${req.protocol}://${req.get('host')}/uploads/${doc.filename}`;
      console.log(`[MongoDB updateDataset] Auto-synthesized missing storageUrl for updated doc: ${doc.storageUrl}`);
    } else {
      console.log(`[MongoDB updateDataset] Loaded storageUrl for updated doc: ${doc.storageUrl}`);
    }
    return res.status(200).json(doc);
  } catch (error) {
    console.error('Error updating dataset:', error);
    return res.status(500).json({ message: 'Server error updating dataset details' });
  }
};

/**
 * @desc    Delete dataset and clean up local files
 * @route   DELETE /api/dataset/:id
 * @access  Private
 */
export const deleteDataset = async (req, res) => {
  try {
    const dataset = await Dataset.findOne({ _id: req.params.id, userId: req.user._id });
    if (!dataset) {
      return res.status(404).json({ message: 'Dataset not found or unauthorized' });
    }

    // 1. Clean up from Supabase Cloud Storage if uploaded to the cloud
    if (dataset.storageUrl && dataset.storageUrl.includes('/storage/v1/object/public/')) {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
      const bucketName = process.env.VITE_SUPABASE_BUCKET || 'Test_bucket';
      
      if (supabaseUrl && anonKey) {
        const marker = `/object/public/${bucketName}/`;
        const index = dataset.storageUrl.indexOf(marker);
        if (index !== -1) {
          const filePath = dataset.storageUrl.substring(index + marker.length);
          const deleteUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${filePath}`;
          
          try {
            console.log(`[Supabase Cleanup] Deleting cloud file: ${filePath}`);
            const response = await fetch(deleteUrl, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${anonKey}`,
                'apikey': anonKey
              }
            });
            
            if (!response.ok) {
              const text = await response.text();
              console.warn(`[Supabase Cleanup] Failed to delete cloud file. Status: ${response.status}. Response: ${text}`);
            } else {
              console.log(`[Supabase Cleanup] Cloud file deleted successfully.`);
            }
          } catch (err) {
            console.error('[Supabase Cleanup] Error deleting from storage:', err);
          }
        }
      }
    }

    // 2. Unlink local physical files
    if (dataset.filePath && fs.existsSync(dataset.filePath)) {
      try { fs.unlinkSync(dataset.filePath); } catch (e) {}
    }
    if (dataset.cleanedFilePath && fs.existsSync(dataset.cleanedFilePath)) {
      try { fs.unlinkSync(dataset.cleanedFilePath); } catch (e) {}
    }

    // 3. Cascade delete associated analysis history records
    try {
      await AnalysisHistory.deleteMany({ datasetId: req.params.id });
      console.log(`[Cascade Delete] Removed all history records for dataset ID: ${req.params.id}`);
    } catch (err) {
      console.warn(`[Cascade Delete] Failed to clear history logs for dataset ID: ${req.params.id}. Error:`, err.message);
    }

    await Dataset.deleteOne({ _id: req.params.id });
    return res.status(200).json({ message: 'Dataset deleted successfully' });
  } catch (error) {
    console.error('Error deleting dataset:', error);
    return res.status(500).json({ message: 'Server error deleting dataset' });
  }
};
