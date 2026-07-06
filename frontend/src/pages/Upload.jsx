import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { datasetService } from '../services/api';
import Layout from '../components/Layout';
import { UploadCloud, File, AlertCircle, RefreshCw } from 'lucide-react';

const Upload = () => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  
  const { setActiveDataset, user } = useAuth();
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const allowedExtensions = ['.csv', '.xlsx', '.xls', '.json'];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const validateFile = (selectedFile) => {
    setError('');
    if (!selectedFile) return false;

    const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    
    if (!allowedExtensions.includes(fileExt)) {
      setError(`Unsupported file type. Please upload a CSV, Excel (.xlsx/.xls), or JSON file.`);
      return false;
    }

    if (selectedFile.size > maxFileSize) {
      setError(`File is too large (${(selectedFile.size / (1024 * 1024)).toFixed(1)}MB). Max upload size is 10MB.`);
      return false;
    }

    return true;
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
      }
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
      }
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  const handleUploadSubmit = async () => {
    if (!file || !user) return;

    setIsProcessing(true);
    setProcessingStatus('Uploading and analyzing dataset...');
    setUploadProgress(35);

    try {
      // Call backend upload
      const savedDataset = await datasetService.upload(file);
      setUploadProgress(80);

      const activeDatasetPayload = {
        id: savedDataset._id,
        _id: savedDataset._id,
        ...savedDataset
      };

      setActiveDataset(activeDatasetPayload);
      setUploadProgress(100);
      
      await new Promise(resolve => setTimeout(resolve, 600));
      navigate('/overview');

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Dataset processing failed. Please verify file integrity.');
      setFile(null);
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
      setProcessingStatus('');
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto mt-4">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-extrabold text-slate-101 tracking-tight">Upload Dataset</h2>
          <p className="text-slate-450 text-xs mt-1 leading-relaxed">
            Upload CSV, Excel, or JSON datasets for full exploratory data analysis (EDA), automated sanitization, and AI reports.
          </p>
        </div>

        {isProcessing ? (
          /* Processing loader screen */
          <div className="glass-card rounded-xl p-12 flex flex-col items-center justify-center text-center min-h-[350px]">
            <div className="relative mb-6">
              <div className="w-12 h-12 rounded-full border-4 border-slate-900 border-t-indigo-500 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-indigo-400">
                <RefreshCw size={16} className="animate-pulse" />
              </div>
            </div>
            
            <h3 className="text-sm font-bold text-slate-205">{processingStatus}</h3>
            
            {/* Progress indicators */}
            <div className="w-full max-w-xs bg-slate-900 rounded-full h-1 mt-6 overflow-hidden">
              <div 
                className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            
            <p className="text-[9px] text-slate-450 font-bold mt-2.5 uppercase tracking-wider font-mono">
              {uploadProgress > 0 && uploadProgress < 100 ? `Progress: ${uploadProgress}%` : 'Cloud Analytics Stage'}
            </p>
            
            <div className="mt-8 text-xs text-slate-550 max-w-sm leading-relaxed">
              <span className="font-semibold text-indigo-400">DataLens Engine</span> uploads your dataset securely to Cloud Storage, compiles descriptive statistics, performs outlier bounds audits, and formats correlations.
            </div>
          </div>
        ) : (
          /* Normal drag drop dashboard upload zone */
          <div className="space-y-6">
            {error && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 text-rose-455 rounded-lg text-xs font-semibold flex items-start gap-3">
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Drag drop board container */}
            <div
              className={`glass-card rounded-xl border-2 border-dashed p-12 text-center transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[280px] ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-500/5'
                  : 'border-slate-850 hover:border-slate-800 hover:bg-slate-950/20'
              }`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={onButtonClick}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={allowedExtensions.join(',')}
                onChange={handleChange}
              />
              
              <div className="bg-slate-950 p-3 rounded-lg text-slate-450 mb-4 border border-slate-900 shadow-sm">
                <UploadCloud size={24} className="text-slate-400" />
              </div>

              <h3 className="text-sm font-bold text-slate-205">
                Drag & drop your dataset here
              </h3>
              <p className="text-[10px] text-slate-450 mt-1 font-medium">
                CSV, XLSX, XLS, and JSON files up to 10MB.
              </p>
              
              <button
                type="button"
                className="mt-6 px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-350 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-slate-800 transition-colors"
              >
                Select File
              </button>
            </div>

            {/* Display Selected File Preview info card */}
            {file && (
              <div className="glass-card rounded-lg p-4 border border-indigo-500/10 flex items-center justify-between animate-slide-up">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-md border border-indigo-500/15">
                    <File size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-202 truncate max-w-[240px]">{file.name}</p>
                    <p className="text-[9px] text-slate-450 font-mono mt-0.5">
                      {(file.size / 1024).toFixed(1)} KB • {file.name.substring(file.name.lastIndexOf('.')).toUpperCase()}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={handleUploadSubmit}
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors"
                >
                  Analyze Dataset
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Upload;
