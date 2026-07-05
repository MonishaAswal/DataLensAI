import axios from 'axios';

let base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
if (base && !base.endsWith('/api') && !base.endsWith('/api/')) {
  base = base.replace(/\/+$/, '') + '/api';
}
const API_BASE_URL = base;

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request Interceptor: Attach token if logged in
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth Services
export const authService = {
  // Legacy MongoDB auth methods (deprecated in favor of Firebase, but kept to prevent build imports breaking)
  register: async (name, email, password) => {
    const response = await api.post('/auth/register', { name, email, password });
    return response.data;
  },
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('token');
  },
};

// Dataset Services
export const datasetService = {
  upload: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/dataset/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    return response.data;
  },

  /**
   * Persists a file/blob on the backend server and returns the local download URL.
   */
  persist: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/dataset/persist', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    return response.data;
  },

  /**
   * Fetches metadata & statistical calculations of the active dataset.
   * If backend fails, falls back to locally cached sessionStorage active dataset details.
   */
  getOverview: async (datasetId) => {
    try {
      const response = await api.get(`/dataset/${datasetId}`);
      const data = response.data;
      const eda = data.edaResults || {};
      return {
        id: data._id || data.id,
        _id: data._id || data.id,
        originalName: data.originalName || data.fileName || 'Dataset',
        rowCount: data.rowCount || eda.dimensions?.rows || 0,
        columnCount: data.columnCount || eda.dimensions?.columns || 0,
        size: data.size || 0,
        duplicateCount: eda.duplicateCount || eda.duplicate_count || 0,
        missingValueCount: data.missingValueCount || (eda.missing_analysis ? Object.values(eda.missing_analysis).reduce((acc, curr) => acc + (curr.count || 0), 0) : 0),
        qualityScore: eda.quality_score || 85,
        columns: data.columns || eda.columns || [],
        previewRows: eda.previewRows || eda.preview_rows || [],
        cleaningActions: data.cleaningActions || [],
        createdAt: data.createdAt || data.uploadDate || new Date().toISOString()
      };
    } catch (err) {
      console.warn('[api] Failed to fetch overview from backend, checking fallback:', err.message);
    }
    
    // Offline / Error fallback
    const savedActiveDataset = sessionStorage.getItem('activeDataset');
    if (savedActiveDataset) {
      try {
        const data = JSON.parse(savedActiveDataset);
        if (data._id === datasetId || data.id === datasetId) {
          const eda = data.edaResults || {};
          return {
            id: data.id || datasetId,
            _id: data._id || datasetId,
            originalName: data.fileName || data.originalName || 'Dataset',
            rowCount: data.rowCount || eda.dimensions?.rows || 0,
            columnCount: data.columnCount || eda.dimensions?.columns || 0,
            size: data.size || 0,
            duplicateCount: eda.duplicate_count || 0,
            missingValueCount: eda.missing_analysis ? Object.values(eda.missing_analysis).reduce((acc, curr) => acc + (curr.count || 0), 0) : 0,
            qualityScore: eda.quality_score || 85,
            columns: data.columns || eda.columns || [],
            previewRows: eda.preview_rows || eda.previewRows || [],
            cleaningActions: data.cleaningActions || [],
            createdAt: data.uploadDate || data.createdAt || new Date().toISOString()
          };
        }
      } catch (e) {
        console.error('Failed to parse active dataset for fallback:', e);
      }
    }

    throw new Error('Dataset overview could not be loaded.');
  },

  /**
   * Fetches the file blob from Storage, packages it with parameters, and triggers rules-based cleaning.
   */
  clean: async (storageUrl, options) => {
    const fileRes = await fetch(storageUrl);
    const fileBlob = await fileRes.blob();
    const filename = storageUrl.split('/').pop().split('?')[0] || 'dataset.csv';

    const formData = new FormData();
    formData.append('file', fileBlob, filename);
    formData.append('removeDuplicates', String(options.removeDuplicates));
    formData.append('imputeNumeric', options.imputeNumeric);
    formData.append('imputeCategorical', options.imputeCategorical);
    formData.append('removeEmptyCols', String(options.removeEmptyCols));
    formData.append('standardizeDates', String(options.standardizeDates));
    if (options.datasetId) {
      formData.append('datasetId', options.datasetId);
    }

    const response = await api.post('/dataset/clean', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    return response.data;
  },

  /**
   * Fetches the file blob from Storage and triggers ML-based Smart AI Imputation.
   */
  smartImpute: async (storageUrl) => {
    const fileRes = await fetch(storageUrl);
    const fileBlob = await fileRes.blob();
    const filename = storageUrl.split('/').pop().split('?')[0] || 'dataset.csv';

    const formData = new FormData();
    formData.append('file', fileBlob, filename);

    const response = await api.post('/imputation/smart', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    return response.data;
  },

  /**
   * Statelessly posts dataset statistics to trigger report generation via Groq/Gemini.
   */
  getInsights: async (datasetName, edaResults, datasetId) => {
    const response = await api.post('/dataset/insights', { datasetName, edaResults, datasetId });
    return response.data;
  },

  /**
   * Directly downloads the file blob.
   */
  export: async (storageUrl) => {
    const response = await fetch(storageUrl);
    return await response.blob();
  },

  /**
   * MongoDB REST CRUD: get all datasets for current user
   */
  getDatasets: async () => {
    const response = await api.get('/dataset');
    return response.data;
  },

  /**
   * MongoDB REST CRUD: delete dataset by ID
   */
  deleteDataset: async (id) => {
    const response = await api.delete(`/dataset/${id}`);
    return response.data;
  },

  /**
   * MongoDB REST CRUD: update dataset by ID
   */
  updateDataset: async (id, data) => {
    const response = await api.put(`/dataset/${id}`, data);
    return response.data;
  },
};

/**
 * Analysis History Service (MongoDB logs)
 */
export const historyService = {
  getHistory: async () => {
    const response = await api.get('/history');
    return response.data;
  },
  createHistory: async (logData) => {
    const response = await api.post('/history', logData);
    return response.data;
  },
  deleteHistory: async (id) => {
    const response = await api.delete(`/history/${id}`);
    return response.data;
  },
};

export default api;
