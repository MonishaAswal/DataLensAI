import { openAsBlob } from 'fs';
import path from 'path';

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000';

/**
 * Sends a file to the Python service for full EDA analysis.
 */
export const analyzeDatasetFile = async (filePath, filename) => {
  try {
    const fileBlob = await openAsBlob(filePath);
    const formData = new FormData();
    formData.append('file', fileBlob, filename);

    const response = await fetch(`${PYTHON_SERVICE_URL}/analyze`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(`Python service analysis failed: ${errorMsg}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error in pythonService/analyze:', error.message);
    if (error.message.includes('fetch failed')) {
      throw new Error('Python analytics service is currently offline. Please start the python service first.');
    }
    throw error;
  }
};

/**
 * Sends a file to the Python service with cleaning configurations and receives the cleaned stream.
 */
export const cleanDatasetFile = async (filePath, filename, options) => {
  try {
    const fileBlob = await openAsBlob(filePath);
    const formData = new FormData();
    
    formData.append('file', fileBlob, filename);
    formData.append('remove_duplicates', String(options.removeDuplicates === true));
    formData.append('impute_numeric', options.imputeNumeric || 'none');
    formData.append('impute_categorical', options.imputeCategorical || 'none');
    formData.append('remove_empty_cols', String(options.removeEmptyCols === true));
    formData.append('standardize_dates', String(options.standardizeDates === true));

    const response = await fetch(`${PYTHON_SERVICE_URL}/clean-stream`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(`Python service cleaning failed: ${errorMsg}`);
    }

    const responseData = await response.json();
    const buffer = Buffer.from(responseData.cleaned_file_b64, 'base64');
    const cleaningReport = responseData.report || {};
    const cleanSummary = cleaningReport.automated_fixes || [];
    
    return {
      buffer,
      cleanSummary,
      cleaningReport
    };
  } catch (error) {
    console.error('Error in pythonService/clean:', error.message);
    if (error.message.includes('fetch failed')) {
      throw new Error('Python analytics service is currently offline. Please start the python service first.');
    }
    throw error;
  }
};

/**
 * Sends EDA stats to Python service to invoke LangChain and Gemini.
 */
export const generateAIReport = async (datasetName, edaStats, apiKey) => {
  try {
    const response = await fetch(`${PYTHON_SERVICE_URL}/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataset_name: datasetName,
        eda_stats: edaStats,
        api_key: apiKey || null,
      }),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(`Python service report generation failed: ${errorMsg}`);
    }

    const data = await response.json();
    return data.report;
  } catch (error) {
    console.error('Error in pythonService/report:', error.message);
    if (error.message.includes('fetch failed')) {
      throw new Error('Python analytics service is currently offline. Please start the python service first.');
    }
    throw error;
  }
};

/**
 * Converts file between CSV and Excel formats.
 */
export const convertDatasetFile = async (filePath, filename, targetFormat) => {
  try {
    const fileBlob = await openAsBlob(filePath);
    const formData = new FormData();
    formData.append('file', fileBlob, filename);

    const response = await fetch(`${PYTHON_SERVICE_URL}/convert?format=${targetFormat}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(`Python service conversion failed: ${errorMsg}`);
    }

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  } catch (error) {
    console.error('Error in pythonService/convert:', error.message);
    throw error;
  }
};
