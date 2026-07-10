let base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
if (base && !base.endsWith('/api') && !base.endsWith('/api/')) {
  base = base.replace(/\/+$/, '') + '/api';
}
const API_BASE_URL = base;

const fetchStorageFile = async (storageUrl) => {
  let url = storageUrl;
  if (storageUrl && storageUrl.includes('/uploads/')) {
    const filename = storageUrl.split('/').pop().split('?')[0] || 'dataset.csv';
    const backendRoot = API_BASE_URL.replace(/\/api\/?$/, '');
    url = `${backendRoot}/uploads/${filename}`;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file from storage: ${response.statusText}`);
  }
  return response;
};

// Custom fetch wrapper matching the Axios interface to avoid memory/resource leaks
export const api = {
  getClerkToken: null,

  request: async (url, options = {}) => {
    const fullUrl = `${API_BASE_URL}${url}`;
    const headers = options.headers || {};
    
    // Auto-detect JSON payloads
    if (options.data && !(options.data instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    // Attach Authorization header (Clerk first, then standard JWT fallback)
    if (api.getClerkToken) {
      try {
        const token = await api.getClerkToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (err) {
        console.error('[Clerk Fetch Interceptor] Failed to fetch token:', err);
      }
    } else {
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const fetchOptions = {
      method: options.method || 'GET',
      headers,
    };

    if (options.data) {
      if (options.data instanceof FormData) {
        fetchOptions.body = options.data;
        // Do NOT set Content-Type header manually for FormData so browser computes boundary
        delete headers['Content-Type'];
      } else {
        fetchOptions.body = JSON.stringify(options.data);
      }
    }

    const response = await fetch(fullUrl, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      const error = new Error(errorData.message || `HTTP error! status: ${response.status}`);
      error.response = { status: response.status, data: errorData };
      throw error;
    }

    const contentType = response.headers.get('Content-Type');
    let parsedData = null;
    if (contentType && contentType.includes('application/json')) {
      parsedData = await response.json();
    } else {
      parsedData = await response.text();
    }

    return { data: parsedData };
  },

  get: (url, options = {}) => api.request(url, { ...options, method: 'GET' }),
  post: (url, data, options = {}) => api.request(url, { ...options, data, method: 'POST' }),
  put: (url, data, options = {}) => api.request(url, { ...options, data, method: 'PUT' }),
  delete: (url, options = {}) => api.request(url, { ...options, method: 'DELETE' }),
};

// Auth Services
export const authService = {
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
    
    const response = await api.post('/dataset/upload', formData);
    return response.data;
  },

  uploadCloud: async ({ storageUrl, originalName, size }) => {
    const response = await api.post('/dataset/upload', {
      storageUrl,
      originalName,
      size
    });
    return response.data;
  },

  persist: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/dataset/persist', formData);
    return response.data;
  },

  getOverview: async (datasetId) => {
    try {
      const response = await api.get(`/dataset/${datasetId}`);
      const data = response.data;
      const eda = data.edaResults || {};
      return {
        id: data._id || data.id,
        _id: data._id || data.id,
        originalName: data.originalName || data.fileName || 'Dataset',
        datasetName: data.datasetName || data.originalName || data.fileName || 'Dataset',
        rowCount: data.rowCount || eda.dimensions?.rows || 0,
        columnCount: data.columnCount || eda.dimensions?.columns || 0,
        size: data.size || 0,
        duplicateCount: eda.duplicateCount || eda.duplicate_count || 0,
        missingValueCount: data.missingValueCount || (eda.missing_analysis ? Object.values(eda.missing_analysis).reduce((acc, curr) => acc + (curr.count || 0), 0) : 0),
        qualityScore: eda.quality_score || data.qualityScore || 85,
        qualityScoreBreakdown: eda.quality_score_breakdown || data.qualityScoreBreakdown || {},
        columns: data.columns || eda.columns || [],
        previewRows: eda.previewRows || eda.preview_rows || [],
        cleaningActions: data.cleaningActions || [],
        createdAt: data.createdAt || data.uploadDate || new Date().toISOString(),
        data_quality_issues: eda.data_quality_issues || []
      };
    } catch (err) {
      console.warn('[api] Failed to fetch overview from backend, checking fallback:', err.message);
      if (err.response && err.response.status === 404) {
        throw err;
      }
    }
    
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
            datasetName: data.datasetName || data.originalName || data.fileName || 'Dataset',
            rowCount: data.rowCount || eda.dimensions?.rows || 0,
            columnCount: data.columnCount || eda.dimensions?.columns || 0,
            size: data.size || 0,
            duplicateCount: eda.duplicate_count || 0,
            missingValueCount: eda.missing_analysis ? Object.values(eda.missing_analysis).reduce((acc, curr) => acc + (curr.count || 0), 0) : 0,
            qualityScore: eda.quality_score || data.qualityScore || 85,
            qualityScoreBreakdown: eda.quality_score_breakdown || data.qualityScoreBreakdown || {},
            columns: data.columns || eda.columns || [],
            previewRows: eda.preview_rows || eda.previewRows || [],
            cleaningActions: data.cleaningActions || [],
            createdAt: data.uploadDate || data.createdAt || new Date().toISOString(),
            data_quality_issues: eda.data_quality_issues || []
          };
        }
      } catch (e) {
        console.error('Failed to parse active dataset for fallback:', e);
      }
    }

    throw new Error('Dataset overview could not be loaded.');
  },

  clean: async (storageUrl, options) => {
    const fileRes = await fetchStorageFile(storageUrl);
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

    const response = await api.post('/dataset/clean', formData);
    return response.data;
  },

  smartImpute: async (storageUrl, datasetId) => {
    const fileRes = await fetchStorageFile(storageUrl);
    const fileBlob = await fileRes.blob();
    const filename = storageUrl.split('/').pop().split('?')[0] || 'dataset.csv';

    const formData = new FormData();
    formData.append('file', fileBlob, filename);
    if (datasetId) {
      formData.append('datasetId', datasetId);
    }

    const response = await api.post('/imputation/smart', formData);
    return response.data;
  },

  getInsights: async (datasetName, edaResults, datasetId) => {
    const response = await api.post('/dataset/insights', { datasetName, edaResults, datasetId });
    return response.data;
  },

  export: async (storageUrl) => {
    const response = await fetchStorageFile(storageUrl);
    return await response.blob();
  },

  getDatasets: async () => {
    const response = await api.get('/dataset');
    return response.data;
  },

  deleteDataset: async (id) => {
    const response = await api.delete(`/dataset/${id}`);
    return response.data;
  },

  updateDataset: async (id, data) => {
    const response = await api.put(`/dataset/${id}`, data);
    return response.data;
  },
};

// Analysis History Service (MongoDB logs)
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
