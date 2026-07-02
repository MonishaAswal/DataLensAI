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
      // Call backend stateful upload & analysis endpoint
      const savedDataset = await datasetService.upload(file);
      setUploadProgress(80);

      // Inject document ID as BOTH _id (for backend compatibility) and id
      const activeDatasetPayload = {
        id: savedDataset._id,
        _id: savedDataset._id,
        ...savedDataset
      };

      setActiveDataset(activeDatasetPayload);
      setUploadProgress(100);
      
      // Delay slightly for visual effect
      await new Promise(resolve => setTimeout(resolve, 800));
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
      <div className="max-w-3xl mx-auto mt-6">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">Upload Dataset</h2>
          <p className="text-slate-400 text-sm mt-1">
            Analyze, clean, and generate AI-driven insights for your tabular datasets instantly.
          </p>
        </div>

        {isProcessing ? (
          /* High Fidelity Processing loader screen */
          <div className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center border border-indigo-500/20 text-center min-h-[380px] shadow-lg shadow-indigo-500/5">
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-indigo-400">
                <RefreshCw size={24} className="animate-pulse" />
              </div>
            </div>
            
            <h3 className="text-lg font-extrabold text-slate-200">{processingStatus}</h3>
            
            {/* Progress indicators */}
            <div className="w-full max-w-sm bg-slate-900 rounded-full h-1.5 mt-6 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-cyan-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            
            <p className="text-xs text-slate-500 font-bold mt-2.5 uppercase tracking-widest font-mono">
              {uploadProgress > 0 && uploadProgress < 100 ? `Progress: ${uploadProgress}%` : 'Cloud Analytics Stage'}
            </p>
            
            <div className="mt-8 text-xs text-slate-500 max-w-md">
              <span className="font-semibold text-indigo-400">DataLens Engine</span> uploads your dataset securely to Cloud Storage, compiles descriptive statistics, performs outlier bounds audits, and formats correlations.
            </div>
          </div>
        ) : (
          /* Normal drag drop dashboard upload zone */
          <div className="space-y-6">
            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-450 rounded-xl text-xs font-semibold flex items-start gap-3">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Drag drop board container */}
            <div
              className={`glass-card rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[320px] ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-500/5'
                  : 'border-slate-800 hover:border-slate-700/80 hover:bg-slate-900/10'
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
              
              <div className="bg-slate-900/60 p-4 rounded-full text-indigo-400 mb-4 border border-slate-800 shadow-md">
                <UploadCloud size={32} />
              </div>

              <h3 className="text-base font-extrabold text-slate-200">
                Drag & drop your dataset here
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 font-medium">
                Support for CSV, XLSX, XLS, and JSON files up to 10MB.
              </p>
              
              <button
                type="button"
                className="mt-6 px-5 py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-335 rounded-xl text-xs font-bold uppercase tracking-wider border border-slate-800 transition-all active:scale-[0.98]"
              >
                Select File
              </button>
            </div>

            {/* Display Selected File Preview info card */}
            {file && (
              <div className="glass-card rounded-xl p-4 border border-indigo-500/10 flex items-center justify-between animate-slide-up">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <File size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200 truncate max-w-[280px]">{file.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {(file.size / 1024).toFixed(1)} KB • {file.name.substring(file.name.lastIndexOf('.')).toUpperCase()}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={handleUploadSubmit}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md shadow-indigo-600/10 active:scale-[0.98] transition-all"
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
