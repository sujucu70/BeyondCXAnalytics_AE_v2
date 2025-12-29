import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, File, Sheet, Loader2, CheckCircle, Sparkles, Wand2, BarChart3, X, AlertCircle } from 'lucide-react';
import { generateSyntheticCsv } from '../utils/syntheticDataGenerator';
import { TierKey } from '../types';
import toast, { Toaster } from 'react-hot-toast';
import clsx from 'clsx';

interface DataUploaderEnhancedProps {
  selectedTier: TierKey;
  onAnalysisReady: () => void;
  isAnalyzing: boolean;
}

type UploadStatus = 'idle' | 'generating' | 'uploading' | 'success';

const formatFileSize = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const DataUploaderEnhanced: React.FC<DataUploaderEnhancedProps> = ({ 
  selectedTier, 
  onAnalysisReady, 
  isAnalyzing 
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [sheetUrl, setSheetUrl] = useState('');
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [isDragging, setIsDragging] = useState(false);

  const isActionInProgress = status === 'generating' || status === 'uploading' || isAnalyzing;

  const resetState = (clearAll: boolean = true) => {
    setStatus('idle');
    if (clearAll) {
      setFile(null);
      setSheetUrl('');
    }
  };

  const handleDataReady = (message: string) => {
    setStatus('success');
    toast.success(message, {
      icon: '✅',
      duration: 3000,
    });
  };
  
  const handleFileChange = (selectedFile: File | null) => {
    resetState();
    if (selectedFile) {
      const allowedTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];
      if (allowedTypes.includes(selectedFile.type) || 
          selectedFile.name.endsWith('.csv') || 
          selectedFile.name.endsWith('.xlsx') || 
          selectedFile.name.endsWith('.xls')) {
        setFile(selectedFile);
        setSheetUrl('');
        toast.success(`Archivo "${selectedFile.name}" cargado correctamente`, {
          icon: '📄',
        });
      } else {
        toast.error('Tipo de archivo no válido. Sube un CSV o Excel.', {
          icon: '❌',
        });
        setFile(null);
      }
    }
  };
  
  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isActionInProgress) setIsDragging(true);
  }, [isActionInProgress]);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isActionInProgress) return;
    const droppedFile = e.dataTransfer.files && e.dataTransfer.files[0];
    handleFileChange(droppedFile);
  }, [isActionInProgress]);

  const handleGenerateSyntheticData = () => {
    resetState();
    setStatus('generating');
    toast.loading('Generando datos sintéticos...', { id: 'generating' });
    
    setTimeout(() => {
      const csvData = generateSyntheticCsv(selectedTier);
      toast.dismiss('generating');
      handleDataReady('¡Datos Sintéticos Generados!');
    }, 2000);
  };

  const handleSubmit = () => {
    if (!file && !sheetUrl) {
      toast.error('Por favor, sube un archivo o introduce una URL de Google Sheet.', {
        icon: '⚠️',
      });
      return;
    }
    resetState(false);
    setStatus('uploading');
    toast.loading('Procesando datos...', { id: 'uploading' });
    
    setTimeout(() => {
      toast.dismiss('uploading');
      handleDataReady('¡Datos Recibidos!');
    }, 2000);
  };
  
  const renderMainButton = () => {
    if (status === 'success') {
      return (
        <motion.button
          onClick={onAnalysisReady}
          disabled={isAnalyzing}
          whileHover={{ scale: isAnalyzing ? 1 : 1.02 }}
          whileTap={{ scale: isAnalyzing ? 1 : 0.98 }}
          className="w-full flex items-center justify-center gap-2 text-white px-6 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-75 disabled:cursor-not-allowed font-semibold text-lg"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="animate-spin" size={24} />
              Analizando...
            </>
          ) : (
            <>
              <BarChart3 size={24} />
              Ver Dashboard de Diagnóstico
            </>
          )}
        </motion.button>
      );
    }

    return (
      <motion.button
        onClick={handleSubmit}
        disabled={isActionInProgress || (!file && !sheetUrl)}
        whileHover={{ scale: isActionInProgress || (!file && !sheetUrl) ? 1 : 1.02 }}
        whileTap={{ scale: isActionInProgress || (!file && !sheetUrl) ? 1 : 0.98 }}
        className="w-full flex items-center justify-center gap-2 text-white px-6 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
      >
        {status === 'uploading' ? (
          <>
            <Loader2 className="animate-spin" size={24} />
            Procesando...
          </>
        ) : (
          <>
            <Wand2 size={24} />
            Generar Análisis
          </>
        )}
      </motion.button>
    );
  };

  return (
    <>
      <Toaster position="top-right" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg p-8"
      >
        <div className="mb-8">
          <motion.span
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-blue-600 font-semibold mb-1 block"
          >
            Paso 2
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold text-slate-900"
          >
            Sube tus Datos y Ejecuta el Análisis
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-600 mt-2"
          >
            Usa una de las siguientes opciones para enviarnos tus datos para el análisis.
          </motion.p>
        </div>

        <div className="space-y-6">
          {/* Drag & Drop Area */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={clsx(
              'relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300',
              isDragging && 'border-blue-500 bg-blue-50 scale-105 shadow-lg',
              !isDragging && 'border-slate-300 bg-slate-50 hover:border-slate-400',
              isActionInProgress && 'opacity-50 cursor-not-allowed'
            )}
          >
            <input
              type="file"
              id="file-upload"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
              disabled={isActionInProgress}
            />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center">
              <motion.div
                animate={isDragging ? { scale: 1.2, rotate: 5 } : { scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <UploadCloud className={clsx(
                  "w-16 h-16 mb-4",
                  isDragging ? "text-blue-500" : "text-slate-400"
                )} />
              </motion.div>
              <span className="font-semibold text-lg text-blue-600 mb-1">
                Haz clic para subir un fichero
              </span>
              <span className="text-slate-500">o arrástralo aquí</span>
              <p className="text-sm text-slate-400 mt-3 bg-white px-4 py-2 rounded-full">
                CSV, XLSX, o XLS
              </p>
            </label>
          </motion.div>

          {/* File Preview */}
          <AnimatePresence>
            {status !== 'uploading' && status !== 'success' && file && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-between gap-3 p-4 bg-blue-50 border-2 border-blue-200 text-slate-800 rounded-xl"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <File className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-sm truncate">{file.name}</span>
                    <span className="text-xs text-slate-500">{formatFileSize(file.size)}</span>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setFile(null);
                    toast('Archivo eliminado', { icon: '🗑️' });
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-colors flex-shrink-0"
                >
                  <X size={18} />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Uploading Progress */}
          <AnimatePresence>
            {status === 'uploading' && file && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-6 bg-blue-50 border-2 border-blue-200 rounded-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <File className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-sm text-blue-900 truncate">{file.name}</span>
                      <span className="text-xs text-blue-700">{formatFileSize(file.size)}</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-blue-600 to-blue-500 rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 2, ease: 'easeInOut' }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center text-slate-400">
            <hr className="w-full border-slate-300" />
            <span className="px-4 font-medium text-sm">O</span>
            <hr className="w-full border-slate-300" />
          </div>

          {/* Generate Synthetic Data - DESTACADO */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="relative overflow-hidden rounded-xl bg-gradient-to-br from-fuchsia-500 via-purple-500 to-indigo-600 p-1"
          >
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <Sparkles className="text-fuchsia-600 w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                🎭 Prueba con Datos de Demo
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Explora el diagnóstico sin necesidad de datos reales. Generamos un dataset completo para ti.
              </p>
              <motion.button
                onClick={handleGenerateSyntheticData}
                disabled={isActionInProgress}
                whileHover={{ scale: isActionInProgress ? 1 : 1.05 }}
                whileTap={{ scale: isActionInProgress ? 1 : 0.95 }}
                className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white px-6 py-4 rounded-lg hover:from-fuchsia-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-75 disabled:cursor-not-allowed font-semibold text-lg"
              >
                {status === 'generating' ? (
                  <>
                    <Loader2 className="animate-spin" size={24} />
                    Generando...
                  </>
                ) : (
                  <>
                    <Sparkles size={24} />
                    Generar Datos Sintéticos
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>

          <div className="flex items-center text-slate-400">
            <hr className="w-full border-slate-300" />
            <span className="px-4 font-medium text-sm">O</span>
            <hr className="w-full border-slate-300" />
          </div>

          {/* Google Sheets URL */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative"
          >
            <Sheet className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="url"
              placeholder="Pega la URL de tu Google Sheet aquí"
              value={sheetUrl}
              onChange={(e) => {
                resetState();
                setSheetUrl(e.target.value);
                setFile(null);
              }}
              disabled={isActionInProgress}
              className="w-full pl-12 pr-4 py-4 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-slate-100 text-sm"
            />
          </motion.div>
          
          {/* Google Sheets Preview */}
          <AnimatePresence>
            {status !== 'uploading' && status !== 'success' && sheetUrl && !file && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-between gap-3 p-4 bg-green-50 border-2 border-green-200 text-green-800 rounded-xl"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Sheet className="w-6 h-6 flex-shrink-0" />
                  <span className="font-medium text-sm truncate">{sheetUrl}</span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setSheetUrl('');
                    toast('URL eliminada', { icon: '🗑️' });
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-colors flex-shrink-0"
                >
                  <X size={18} />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Success Message */}
          <AnimatePresence>
            {status === 'success' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center justify-center gap-3 p-6 bg-green-50 border-2 border-green-200 text-green-800 rounded-xl"
              >
                <CheckCircle className="w-8 h-8 flex-shrink-0" />
                <span className="font-bold text-lg">¡Listo para analizar!</span>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Main Action Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {renderMainButton()}
          </motion.div>
        </div>
      </motion.div>
    </>
  );
};

export default DataUploaderEnhanced;
