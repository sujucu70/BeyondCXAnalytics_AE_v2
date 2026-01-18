// components/DataInputRedesigned.tsx
// Interfaz de entrada de datos simplificada

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle, FileText, Database,
  UploadCloud, File, Loader2, Info, X,
  HardDrive, Trash2, RefreshCw, Server
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { checkServerCache, clearServerCache, ServerCacheMetadata } from '../utils/serverCache';
import { useAuth } from '../utils/AuthContext';

interface CacheInfo extends ServerCacheMetadata {
  // Using server cache metadata structure
}

interface DataInputRedesignedProps {
  onAnalyze: (config: {
    costPerHour: number;
    avgCsat: number;
    segmentMapping?: {
      high_value_queues: string[];
      medium_value_queues: string[];
      low_value_queues: string[];
    };
    file?: File;
    sheetUrl?: string;
    useSynthetic?: boolean;
    useCache?: boolean;
  }) => void;
  isAnalyzing: boolean;
}

const DataInputRedesigned: React.FC<DataInputRedesignedProps> = ({
  onAnalyze,
  isAnalyzing
}) => {
  const { authHeader } = useAuth();

  // Estados para datos manuales - valores vacíos por defecto
  const [costPerHour, setCostPerHour] = useState<string>('');
  const [avgCsat, setAvgCsat] = useState<string>('');

  // Estados para mapeo de segmentación
  const [highValueQueues, setHighValueQueues] = useState<string>('');
  const [mediumValueQueues, setMediumValueQueues] = useState<string>('');
  const [lowValueQueues, setLowValueQueues] = useState<string>('');

  // Estados para carga de datos
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Estado para caché del servidor
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
  const [checkingCache, setCheckingCache] = useState(true);

  // Verificar caché del servidor al cargar
  useEffect(() => {
    const checkCache = async () => {
      console.log('[DataInput] Checking server cache, authHeader:', authHeader ? 'present' : 'null');
      if (!authHeader) {
        console.log('[DataInput] No authHeader, skipping cache check');
        setCheckingCache(false);
        return;
      }

      try {
        setCheckingCache(true);
        console.log('[DataInput] Calling checkServerCache...');
        const { exists, metadata } = await checkServerCache(authHeader);
        console.log('[DataInput] Cache check result:', { exists, metadata });
        if (exists && metadata) {
          setCacheInfo(metadata);
          console.log('[DataInput] Cache info set:', metadata);
          // Auto-rellenar coste si hay en caché
          if (metadata.costPerHour > 0 && !costPerHour) {
            setCostPerHour(metadata.costPerHour.toString());
          }
        } else {
          console.log('[DataInput] No cache found on server');
        }
      } catch (error) {
        console.error('[DataInput] Error checking server cache:', error);
      } finally {
        setCheckingCache(false);
      }
    };
    checkCache();
  }, [authHeader]);

  const handleClearCache = async () => {
    if (!authHeader) return;

    try {
      const success = await clearServerCache(authHeader);
      if (success) {
        setCacheInfo(null);
        toast.success('Caché del servidor limpiada', { icon: '🗑️' });
      } else {
        toast.error('Error limpiando caché del servidor');
      }
    } catch (error) {
      toast.error('Error limpiando caché');
    }
  };

  const handleUseCache = () => {
    if (!cacheInfo) return;

    const segmentMapping = (highValueQueues || mediumValueQueues || lowValueQueues) ? {
      high_value_queues: (highValueQueues || '').split(',').map(q => q.trim()).filter(q => q),
      medium_value_queues: (mediumValueQueues || '').split(',').map(q => q.trim()).filter(q => q),
      low_value_queues: (lowValueQueues || '').split(',').map(q => q.trim()).filter(q => q)
    } : undefined;

    onAnalyze({
      costPerHour: parseFloat(costPerHour) || cacheInfo.costPerHour,
      avgCsat: parseFloat(avgCsat) || 0,
      segmentMapping,
      useCache: true
    });
  };

  const handleFileChange = (selectedFile: File | null) => {
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
        toast.success(`Archivo "${selectedFile.name}" cargado`, { icon: '📄' });
      } else {
        toast.error('Tipo de archivo no válido. Sube un CSV o Excel.', { icon: '❌' });
      }
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  const canAnalyze = file !== null && costPerHour !== '' && parseFloat(costPerHour) > 0;

  const handleSubmit = () => {
    // Preparar segment_mapping
    const segmentMapping = (highValueQueues || mediumValueQueues || lowValueQueues) ? {
      high_value_queues: (highValueQueues || '').split(',').map(q => q.trim()).filter(q => q),
      medium_value_queues: (mediumValueQueues || '').split(',').map(q => q.trim()).filter(q => q),
      low_value_queues: (lowValueQueues || '').split(',').map(q => q.trim()).filter(q => q)
    } : undefined;

    onAnalyze({
      costPerHour: parseFloat(costPerHour) || 0,
      avgCsat: parseFloat(avgCsat) || 0,
      segmentMapping,
      file: file || undefined,
      useSynthetic: false
    });
  };

  return (
    <div className="space-y-6">
      {/* Sección 1: Datos Manuales */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-slate-200"
      >
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-1 flex items-center gap-2">
            <Database size={20} className="text-[#6D84E3]" />
            Configuración Manual
          </h2>
          <p className="text-slate-500 text-sm">
            Introduce los parámetros de configuración para tu análisis
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Coste por Hora */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              Coste por Hora Agente (Fully Loaded)
              <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                <AlertCircle size={10} />
                Obligatorio
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">€</span>
              <input
                type="number"
                value={costPerHour}
                onChange={(e) => setCostPerHour(e.target.value)}
                min="0"
                step="0.5"
                className="w-full pl-8 pr-16 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#6D84E3] focus:border-[#6D84E3] transition"
                placeholder="Ej: 20"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">€/hora</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Incluye salario, cargas sociales, infraestructura, etc.
            </p>
          </div>

          {/* CSAT Promedio */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              CSAT Promedio
              <span className="text-xs text-slate-400">(Opcional)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={avgCsat}
                onChange={(e) => setAvgCsat(e.target.value)}
                min="0"
                max="100"
                step="1"
                className="w-full pr-12 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#6D84E3] focus:border-[#6D84E3] transition"
                placeholder="Ej: 85"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">/ 100</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Puntuación promedio de satisfacción del cliente
            </p>
          </div>

          {/* Segmentación por Cola/Skill */}
          <div className="col-span-1 md:col-span-2">
            <div className="mb-3">
              <h4 className="font-medium text-slate-700 mb-1 flex items-center gap-2">
                Segmentación de Clientes por Cola/Skill
                <span className="text-xs text-slate-400">(Opcional)</span>
              </h4>
              <p className="text-sm text-slate-500">
                Identifica qué colas corresponden a cada segmento. Separa múltiples colas con comas.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Alto Valor
                </label>
                <input
                  type="text"
                  value={highValueQueues}
                  onChange={(e) => setHighValueQueues(e.target.value)}
                  placeholder="VIP, Premium, Enterprise"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#6D84E3] focus:border-[#6D84E3] transition text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Valor Medio
                </label>
                <input
                  type="text"
                  value={mediumValueQueues}
                  onChange={(e) => setMediumValueQueues(e.target.value)}
                  placeholder="Soporte_General, Ventas"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#6D84E3] focus:border-[#6D84E3] transition text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Bajo Valor
                </label>
                <input
                  type="text"
                  value={lowValueQueues}
                  onChange={(e) => setLowValueQueues(e.target.value)}
                  placeholder="Basico, Trial, Freemium"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#6D84E3] focus:border-[#6D84E3] transition text-sm"
                />
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-2 flex items-start gap-1">
              <Info size={12} className="mt-0.5 flex-shrink-0" />
              Las colas no mapeadas se clasificarán como "Valor Medio" por defecto.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Sección 2: Datos en Caché del Servidor (si hay) */}
      {cacheInfo && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-emerald-50 rounded-lg shadow-sm p-4 sm:p-6 border-2 border-emerald-300"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-emerald-800 flex items-center gap-2">
                <Server size={20} className="text-emerald-600" />
                Datos en Caché
              </h2>
            </div>
            <button
              onClick={handleClearCache}
              className="p-2 text-emerald-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Limpiar caché"
            >
              <Trash2 size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4">
            <div className="bg-white rounded-lg p-3 border border-emerald-200">
              <p className="text-xs text-emerald-600 font-medium">Archivo</p>
              <p className="text-sm font-semibold text-slate-800 truncate" title={cacheInfo.fileName}>
                {cacheInfo.fileName}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-emerald-200">
              <p className="text-xs text-emerald-600 font-medium">Registros</p>
              <p className="text-sm font-semibold text-slate-800">
                {cacheInfo.recordCount.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-emerald-200">
              <p className="text-xs text-emerald-600 font-medium">Tamaño Original</p>
              <p className="text-sm font-semibold text-slate-800">
                {(cacheInfo.fileSize / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-emerald-200">
              <p className="text-xs text-emerald-600 font-medium">Guardado</p>
              <p className="text-sm font-semibold text-slate-800">
                {new Date(cacheInfo.cachedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <button
            onClick={handleUseCache}
            disabled={isAnalyzing || !costPerHour || parseFloat(costPerHour) <= 0}
            className={clsx(
              'w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all',
              (!isAnalyzing && costPerHour && parseFloat(costPerHour) > 0)
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            )}
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Analizando...
              </>
            ) : (
              <>
                <RefreshCw size={20} />
                Usar Datos en Caché
              </>
            )}
          </button>

          {(!costPerHour || parseFloat(costPerHour) <= 0) && (
            <p className="text-xs text-amber-600 mt-2 text-center">
              Introduce el coste por hora arriba para continuar
            </p>
          )}
        </motion.div>
      )}

      {/* Sección 3: Subir Archivo */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: cacheInfo ? 0.25 : 0.2 }}
        className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-slate-200"
      >
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-800 mb-1 flex items-center gap-2">
            <UploadCloud size={20} className="text-[#6D84E3]" />
            {cacheInfo ? 'Subir Nuevo Archivo' : 'Datos CSV'}
          </h2>
          <p className="text-slate-500 text-sm">
            {cacheInfo ? 'O sube un archivo diferente para analizar' : 'Sube el archivo exportado desde tu sistema ACD/CTI'}
          </p>
        </div>

        {/* Zona de subida */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={clsx(
            'border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer',
            isDragging ? 'border-[#6D84E3] bg-blue-50' : 'border-slate-300 bg-slate-50 hover:border-slate-400'
          )}
        >
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <File size={24} className="text-emerald-600" />
              <div className="text-left">
                <p className="font-medium text-slate-800">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="ml-4 p-1.5 hover:bg-slate-200 rounded-full transition"
              >
                <X size={18} className="text-slate-500" />
              </button>
            </div>
          ) : (
            <>
              <UploadCloud size={40} className="mx-auto text-slate-400 mb-3" />
              <p className="text-slate-600 mb-2">
                Arrastra tu archivo aquí o haz click para seleccionar
              </p>
              <p className="text-xs text-slate-400 mb-4">
                Formatos aceptados: CSV, Excel (.xlsx, .xls)
              </p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-block px-4 py-2 bg-[#6D84E3] text-white rounded-lg hover:bg-[#5a6fc9] transition cursor-pointer font-medium"
              >
                Seleccionar Archivo
              </label>
            </>
          )}
        </div>
      </motion.div>

      {/* Botón de análisis */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex justify-center"
      >
        <button
          onClick={handleSubmit}
          disabled={!canAnalyze || isAnalyzing}
          className={clsx(
            'px-8 py-3 rounded-lg font-semibold text-lg transition-all flex items-center gap-3',
            canAnalyze && !isAnalyzing
              ? 'bg-[#6D84E3] text-white hover:bg-[#5a6fc9] shadow-lg hover:shadow-xl'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          )}
        >
          {isAnalyzing ? (
            <>
              <Loader2 size={22} className="animate-spin" />
              Analizando...
            </>
          ) : (
            <>
              <FileText size={22} />
              Generar Análisis
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
};

export default DataInputRedesigned;
