import React, { useState, useCallback } from 'react';
import { UploadCloud, File, Sheet, Loader2, CheckCircle, Sparkles, Wand2, BarChart3 } from 'lucide-react';
import { generateSyntheticCsv } from '../utils/syntheticDataGenerator';
import { TierKey } from '../types';

interface DataUploaderProps {
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

const DataUploader: React.FC<DataUploaderProps> = ({ selectedTier, onAnalysisReady, isAnalyzing }) => {
  const [file, setFile] = useState<File | null>(null);
  const [sheetUrl, setSheetUrl] = useState('');
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const isActionInProgress = status === 'generating' || status === 'uploading' || isAnalyzing;

  const resetState = (clearAll: boolean = true) => {
    setStatus('idle');
    setError('');
    setSuccessMessage('');
    if (clearAll) {
      setFile(null);
      setSheetUrl('');
    }
  };

  const handleDataReady = (message: string) => {
      setStatus('success');
      setSuccessMessage(message);
  };
  
  const handleFileChange = (selectedFile: File | null) => {
    resetState();
    if (selectedFile) {
      const allowedTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];
      if (allowedTypes.includes(selectedFile.type) || selectedFile.name.endsWith('.csv') || selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        setFile(selectedFile);
        setSheetUrl('');
      } else {
        setError('Tipo de archivo no válido. Sube un CSV o Excel.');
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
    setTimeout(() => {
      const csvData = generateSyntheticCsv(selectedTier);
      handleDataReady('Datos Sintéticos Generados!');
    }, 2000);
  };

  const handleSubmit = () => {
    if (!file && !sheetUrl) {
      setError('Por favor, sube un archivo o introduce una URL de Google Sheet.');
      return;
    }
    resetState(false);
    setStatus('uploading');
    setTimeout(() => {
      handleDataReady('Datos Recibidos!');
    }, 2000);
  };
  
  const renderMainButton = () => {
    if (status === 'success') {
      return (
        <button
          onClick={onAnalysisReady}
          disabled={isAnalyzing}
          className="w-full flex items-center justify-center gap-2 text-white px-6 py-3 rounded-lg transition-colors shadow-sm hover:shadow-md bg-green-600 hover:bg-green-700 disabled:opacity-75 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? <Loader2 className="animate-spin" size={20} /> : <BarChart3 size={20} />}
          {isAnalyzing ? 'Analizando...' : 'Ver Dashboard de Diagnóstico'}
        </button>
      );
    }

    return (
      <button
        onClick={handleSubmit}
        disabled={isActionInProgress || (!file && !sheetUrl)}
        className="w-full flex items-center justify-center gap-2 text-white px-6 py-3 rounded-lg transition-colors shadow-sm hover:shadow-md bg-blue-600 hover:bg-blue-700 disabled:opacity-75 disabled:cursor-not-allowed"
      >
        {status === 'uploading' ? <Loader2 className="animate-spin" size={20} /> : <Wand2 size={20} />}
        {status === 'uploading' ? 'Procesando...' : 'Generar Análisis'}
      </button>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="mb-6">
        <span className="text-blue-600 font-semibold mb-1 block">Paso 2</span>
        <h2 className="text-2xl font-bold text-slate-900">Sube tus Datos y Ejecuta el Análisis</h2>
        <p className="text-slate-600 mt-1">
            Usa una de las siguientes opciones para enviarnos tus datos para el análisis.
        </p>
      </div>

      <div className="space-y-6">
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-300 ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50'} ${isActionInProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
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
             <UploadCloud className="w-12 h-12 text-slate-400 mb-2" />
             <span className="font-semibold text-blue-600">Haz clic para subir un fichero</span>
             <span className="text-slate-500"> o arrástralo aquí</span>
             <p className="text-xs text-slate-400 mt-2">CSV, XLSX, o XLS</p>
          </label>
        </div>

        <div className="flex items-center text-slate-500">
            <hr className="w-full border-slate-300" />
            <span className="px-4 font-medium text-sm">O</span>
            <hr className="w-full border-slate-300" />
        </div>

        <div className="text-center p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600 mb-3">¿No tienes datos a mano? Genera un set de datos de ejemplo.</p>
            <button
              onClick={handleGenerateSyntheticData}
              disabled={isActionInProgress}
              className="flex items-center justify-center gap-2 w-full sm:w-auto mx-auto bg-fuchsia-100 text-fuchsia-700 px-6 py-3 rounded-lg hover:bg-fuchsia-200 hover:text-fuchsia-800 transition-colors shadow-sm hover:shadow-md disabled:opacity-75 disabled:cursor-not-allowed font-semibold"
            >
              {status === 'generating' ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
              {status === 'generating' ? 'Generando...' : 'Generar Datos Sintéticos'}
            </button>
        </div>

        <div className="flex items-center text-slate-500">
            <hr className="w-full border-slate-300" />
            <span className="px-4 font-medium text-sm">O</span>
            <hr className="w-full border-slate-300" />
        </div>

        <div className="relative">
          <Sheet className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
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
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-slate-100"
          />
        </div>
        
        {error && <p className="text-red-600 text-sm text-center">{error}</p>}
        
        {status !== 'uploading' && status !== 'success' && file && (
          <div className="flex items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                  <File className="w-5 h-5 flex-shrink-0 text-slate-500" />
                  <div className="flex flex-col min-w-0">
                      <span className="font-medium text-sm truncate">{file.name}</span>
                      <span className="text-xs text-slate-500">{formatFileSize(file.size)}</span>
                  </div>
              </div>
              <button onClick={() => setFile(null)} className="text-slate-500 hover:text-red-600 font-bold text-lg flex-shrink-0">&times;</button>
          </div>
        )}

        {status === 'uploading' && file && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                    <File className="w-8 h-8 flex-shrink-0 text-blue-500" />
                    <div className="flex-grow">
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-sm text-blue-800 truncate">{file.name}</span>
                            <span className="text-xs text-blue-700">{formatFileSize(file.size)}</span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden">
                            <div className="relative w-full h-full">
                               <div className="absolute h-full w-1/2 bg-blue-600 rounded-full animate-indeterminate-progress"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
        
        {status !== 'uploading' && status !== 'success' && sheetUrl && !file && (
            <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg">
                <Sheet className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm truncate">{sheetUrl}</span>
                <button onClick={() => setSheetUrl('')} className="text-blue-600 hover:text-blue-800 font-bold text-lg">&times;</button>
            </div>
        )}
        
        {status === 'success' && (
             <div className="flex items-center justify-center gap-2 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
                <CheckCircle className="w-6 h-6 flex-shrink-0" />
                <span className="font-semibold">{successMessage} ¡Listo para analizar!</span>
            </div>
        )}
        
        {renderMainButton()}
      </div>
    </div>
  );
};

export default DataUploader;