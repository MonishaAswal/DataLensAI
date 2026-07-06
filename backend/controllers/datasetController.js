import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Dataset from '../models/Dataset.js';
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
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const { path: filePath, originalname: originalName, size } = req.file;

  try {
    console.log(`[MongoDB Upload] Starting analysis for: ${originalName}`);
    const edaResults = await analyzeDatasetFile(filePath, originalName);

    const rowCount = edaResults.dimensions?.rows || 0;
    const columnCount = edaResults.dimensions?.columns || 0;
    const columns = edaResults.columns || [];

    // Construct local file URL for serving via static uploads folder
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    // Save dataset details in MongoDB
    const dataset = await Dataset.create({
      userId: req.user._id,
      originalName,
      datasetName: originalName,
      filename: req.file.filename,
      filePath: filePath,
      size,
      rowCount,
      columnCount,
      columns,
      edaResults,
      status: 'analyzed',
      storageUrl: fileUrl, // mapped to storageUrl for frontend consistency
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
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded for cleaning.' });
  }

  const { path: filePath, originalname: originalName } = req.file;

  // Convert inputs from FormData string representation to appropriate types
  const removeDuplicates = req.body.removeDuplicates === 'true' || req.body.removeDuplicates === true;
  const imputeNumeric = req.body.imputeNumeric || 'none';
  const imputeCategorical = req.body.imputeCategorical || 'none';
  const removeEmptyCols = req.body.removeEmptyCols === 'true' || req.body.removeEmptyCols === true;
  const standardizeDates = req.body.standardizeDates === 'true' || req.body.standardizeDates === true;
  const { datasetId } = req.body;

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
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }

    const cleanedUrl = `${req.protocol}://${req.get('host')}/uploads/${cleanedFilename}`;

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
      console.log(`[MongoDB Clean] Dataset updated in DB. ID: ${datasetId}`);
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
    if (fs.existsSync(filePath)) {
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
    return res.status(200).json(datasets);
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
    return res.status(200).json(dataset);
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
    return res.status(200).json(dataset);
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

    // Unlink local physical files
    if (dataset.filePath && fs.existsSync(dataset.filePath)) {
      try { fs.unlinkSync(dataset.filePath); } catch (e) {}
    }
    if (dataset.cleanedFilePath && fs.existsSync(dataset.cleanedFilePath)) {
      try { fs.unlinkSync(dataset.cleanedFilePath); } catch (e) {}
    }

    await Dataset.deleteOne({ _id: req.params.id });
    return res.status(200).json({ message: 'Dataset deleted successfully' });
  } catch (error) {
    console.error('Error deleting dataset:', error);
    return res.status(500).json({ message: 'Server error deleting dataset' });
  }
};
