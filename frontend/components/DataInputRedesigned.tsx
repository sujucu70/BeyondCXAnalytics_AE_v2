// components/DataInputRedesigned.tsx
// Interfaz de entrada de datos rediseñada y organizada

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, CheckCircle, AlertCircle, FileText, Database, 
  UploadCloud, File, Sheet, Loader2, Sparkles, Table, 
  Info, ExternalLink, X 
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

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
  }) => void;
  isAnalyzing: boolean;
}

const DataInputRedesigned: React.FC<DataInputRedesignedProps> = ({ 
  onAnalyze, 
  isAnalyzing 
}) => {
  // Estados para datos manuales
  const [costPerHour, setCostPerHour] = useState<number>(20);
  const [avgCsat, setAvgCsat] = useState<number>(85);
  
  // Estados para mapeo de segmentación
  const [highValueQueues, setHighValueQueues] = useState<string>('');
  const [mediumValueQueues, setMediumValueQueues] = useState<string>('');
  const [lowValueQueues, setLowValueQueues] = useState<string>('');
  
  // Estados para carga de datos
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url' | 'synthetic' | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Campos CSV requeridos
  const csvFields = [
    { name: 'interaction_id', type: 'String único', example: 'call_8842910', required: true },
    { name: 'datetime_start', type: 'DateTime', example: '2024-10-01 09:15:22', required: true },
    { name: 'queue_skill', type: 'String', example: 'Soporte_Nivel1, Ventas', required: true },
    { name: 'channel', type: 'String', example: 'Voice, Chat, WhatsApp', required: true },
    { name: 'duration_talk', type: 'Segundos', example: '345', required: true },
    { name: 'hold_time', type: 'Segundos', example: '45', required: true },
    { name: 'wrap_up_time', type: 'Segundos', example: '30', required: true },
    { name: 'agent_id', type: 'String', example: 'Agente_045', required: true },
    { name: 'transfer_flag', type: 'Boolean', example: 'TRUE / FALSE', required: true },
    { name: 'caller_id', type: 'String (hash)', example: 'Hash_99283', required: false }
  ];
  
  const handleDownloadTemplate = () => {
    const headers = csvFields.map(f => f.name).join(',');
    const exampleRow = csvFields.map(f => f.example).join(',');
    const csvContent = `${headers}\n${exampleRow}\n`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'plantilla_beyond_diagnostic.csv';
    link.click();
    
    toast.success('Plantilla CSV descargada', { icon: '📥' });
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
        setUploadMethod('file');
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
  
  const handleGenerateSynthetic = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setUploadMethod('synthetic');
      setIsGenerating(false);
      toast.success('Datos sintéticos generados para demo', { icon: '✨' });
    }, 1500);
  };
  
  const handleSheetUrlSubmit = () => {
    if (sheetUrl.trim()) {
      setUploadMethod('url');
      toast.success('URL de Google Sheets conectada', { icon: '🔗' });
    } else {
      toast.error('Introduce una URL válida', { icon: '❌' });
    }
  };
  
  const canAnalyze = uploadMethod !== null && costPerHour > 0;
  
  return (
    <div className="space-y-8">
      {/* Sección 1: Datos Manuales */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-lg p-8 border-2 border-slate-200"
      >
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Database size={24} className="text-[#6D84E3]" />
            1. Datos Manuales
          </h2>
          <p className="text-slate-600 text-sm">
            Introduce los parámetros de configuración para tu análisis
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Coste por Hora */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              Coste por Hora Agente (Fully Loaded)
              <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                <AlertCircle size={10} />
                Obligatorio
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-lg">€</span>
              <input
                type="number"
                value={costPerHour}
                onChange={(e) => setCostPerHour(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.5"
                className="w-full pl-10 pr-20 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-[#6D84E3] focus:border-[#6D84E3] transition text-lg font-semibold"
                placeholder="20"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium">€/hora</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-start gap-1">
              <Info size={12} className="mt-0.5 flex-shrink-0" />
              <span>Tipo: <strong>Número (decimal)</strong> | Ejemplo: <code className="bg-slate-100 px-1 rounded">20</code></span>
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Incluye salario, cargas sociales, infraestructura, etc.
            </p>
          </div>
          
          {/* CSAT Promedio */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              CSAT Promedio
              <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                <CheckCircle size={10} />
                Opcional
              </span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={avgCsat}
                onChange={(e) => setAvgCsat(parseFloat(e.target.value) || 0)}
                min="0"
                max="100"
                step="1"
                className="w-full pr-16 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-[#6D84E3] focus:border-[#6D84E3] transition text-lg font-semibold"
                placeholder="85"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium">/ 100</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-start gap-1">
              <Info size={12} className="mt-0.5 flex-shrink-0" />
              <span>Tipo: <strong>Número (0-100)</strong> | Ejemplo: <code className="bg-slate-100 px-1 rounded">85</code></span>
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Puntuación promedio de satisfacción del cliente
            </p>
          </div>
          
          {/* Segmentación por Cola/Skill */}
          <div className="col-span-2">
            <div className="mb-4">
              <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <Database size={18} className="text-[#6D84E3]" />
                Segmentación de Clientes por Cola/Skill
                <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                  <CheckCircle size={10} />
                  Opcional
                </span>
              </h4>
              <p className="text-sm text-slate-600">
                Identifica qué colas/skills corresponden a cada segmento de cliente. Separa múltiples colas con comas.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* High Value */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  🟢 Clientes Alto Valor (High)
                </label>
                <input
                  type="text"
                  value={highValueQueues}
                  onChange={(e) => setHighValueQueues(e.target.value)}
                  placeholder="VIP, Premium, Enterprise"
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-[#6D84E3] focus:border-[#6D84E3] transition"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Colas para clientes de alto valor
                </p>
              </div>
              
              {/* Medium Value */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  🟡 Clientes Valor Medio (Medium)
                </label>
                <input
                  type="text"
                  value={mediumValueQueues}
                  onChange={(e) => setMediumValueQueues(e.target.value)}
                  placeholder="Soporte_General, Ventas"
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-[#6D84E3] focus:border-[#6D84E3] transition"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Colas para clientes estándar
                </p>
              </div>
              
              {/* Low Value */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  🔴 Clientes Bajo Valor (Low)
                </label>
                <input
                  type="text"
                  value={lowValueQueues}
                  onChange={(e) => setLowValueQueues(e.target.value)}
                  placeholder="Basico, Trial, Freemium"
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-[#6D84E3] focus:border-[#6D84E3] transition"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Colas para clientes de bajo valor
                </p>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800 flex items-start gap-2">
                <Info size={14} className="mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Nota:</strong> Las colas no mapeadas se clasificarán automáticamente como "Medium". 
                  El matching es flexible (no distingue mayúsculas y permite coincidencias parciales).
                </span>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Sección 2: Datos CSV */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-lg p-8 border-2 border-slate-200"
      >
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Table size={24} className="text-[#6D84E3]" />
            2. Datos CSV (Raw Data de ACD)
          </h2>
          <p className="text-slate-600 text-sm">
            Exporta estos campos desde tu sistema ACD/CTI (Genesys, Avaya, Talkdesk, Zendesk, etc.)
          </p>
        </div>
        
        {/* Tabla de campos requeridos */}
        <div className="mb-6 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-left font-semibold text-slate-700 border-b-2 border-slate-300">Campo</th>
                <th className="p-3 text-left font-semibold text-slate-700 border-b-2 border-slate-300">Tipo</th>
                <th className="p-3 text-left font-semibold text-slate-700 border-b-2 border-slate-300">Ejemplo</th>
                <th className="p-3 text-center font-semibold text-slate-700 border-b-2 border-slate-300">Obligatorio</th>
              </tr>
            </thead>
            <tbody>
              {csvFields.map((field, index) => (
                <tr key={field.name} className={clsx(
                  'border-b border-slate-200',
                  index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                )}>
                  <td className="p-3 font-mono text-sm font-semibold text-slate-900">{field.name}</td>
                  <td className="p-3 text-slate-700">{field.type}</td>
                  <td className="p-3 font-mono text-xs text-slate-600">{field.example}</td>
                  <td className="p-3 text-center">
                    {field.required ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">
                        <AlertCircle size={10} />
                        Sí
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                        <CheckCircle size={10} />
                        No
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Botón de descarga de plantilla */}
        <div className="mb-6">
          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#6D84E3] text-white rounded-lg hover:bg-[#5a6fc9] transition font-semibold"
          >
            <Download size={18} />
            Descargar Plantilla CSV
          </button>
          <p className="text-xs text-slate-500 mt-2">
            Descarga una plantilla con la estructura exacta de campos requeridos
          </p>
        </div>
        
        {/* Opciones de carga */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-900 mb-3">Elige cómo proporcionar tus datos:</h3>
          
          {/* Opción 1: Subir archivo */}
          <div className={clsx(
            'border-2 rounded-lg p-4 transition-all',
            uploadMethod === 'file' ? 'border-[#6D84E3] bg-blue-50' : 'border-slate-300'
          )}>
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="uploadMethod"
                checked={uploadMethod === 'file'}
                onChange={() => setUploadMethod('file')}
                className="mt-1"
              />
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <UploadCloud size={18} className="text-[#6D84E3]" />
                  Subir Archivo CSV/Excel
                </h4>
                
                {uploadMethod === 'file' && (
                  <div
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    className={clsx(
                      'border-2 border-dashed rounded-lg p-6 text-center transition-all',
                      isDragging ? 'border-[#6D84E3] bg-blue-100' : 'border-slate-300 bg-slate-50'
                    )}
                  >
                    {file ? (
                      <div className="flex items-center justify-center gap-3">
                        <File size={24} className="text-green-600" />
                        <div className="text-left">
                          <p className="font-semibold text-slate-900">{file.name}</p>
                          <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                          onClick={() => setFile(null)}
                          className="ml-auto p-1 hover:bg-slate-200 rounded"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <UploadCloud size={32} className="mx-auto text-slate-400 mb-2" />
                        <p className="text-sm text-slate-600 mb-2">
                          Arrastra tu archivo aquí o haz click para seleccionar
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
                          className="inline-block px-4 py-2 bg-[#6D84E3] text-white rounded-lg hover:bg-[#5a6fc9] transition cursor-pointer"
                        >
                          Seleccionar Archivo
                        </label>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Opción 2: URL Google Sheets */}
          <div className={clsx(
            'border-2 rounded-lg p-4 transition-all',
            uploadMethod === 'url' ? 'border-[#6D84E3] bg-blue-50' : 'border-slate-300'
          )}>
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="uploadMethod"
                checked={uploadMethod === 'url'}
                onChange={() => setUploadMethod('url')}
                className="mt-1"
              />
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <Sheet size={18} className="text-[#6D84E3]" />
                  Conectar Google Sheets
                </h4>
                
                {uploadMethod === 'url' && (
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      className="flex-1 px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-[#6D84E3] focus:border-[#6D84E3] transition"
                    />
                    <button
                      onClick={handleSheetUrlSubmit}
                      className="px-4 py-2 bg-[#6D84E3] text-white rounded-lg hover:bg-[#5a6fc9] transition font-semibold"
                    >
                      <ExternalLink size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Opción 3: Datos sintéticos */}
          <div className={clsx(
            'border-2 rounded-lg p-4 transition-all',
            uploadMethod === 'synthetic' ? 'border-[#6D84E3] bg-blue-50' : 'border-slate-300'
          )}>
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="uploadMethod"
                checked={uploadMethod === 'synthetic'}
                onChange={() => setUploadMethod('synthetic')}
                className="mt-1"
              />
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <Sparkles size={18} className="text-[#6D84E3]" />
                  Generar Datos Sintéticos (Demo)
                </h4>
                
                {uploadMethod === 'synthetic' && (
                  <button
                    onClick={handleGenerateSynthetic}
                    disabled={isGenerating}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition font-semibold disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        Generar Datos de Prueba
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
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
          onClick={() => {
            // Preparar segment_mapping
            const segmentMapping = (highValueQueues || mediumValueQueues || lowValueQueues) ? {
              high_value_queues: (highValueQueues || '').split(',').map(q => q.trim()).filter(q => q),
              medium_value_queues: (mediumValueQueues || '').split(',').map(q => q.trim()).filter(q => q),
              low_value_queues: (lowValueQueues || '').split(',').map(q => q.trim()).filter(q => q)
            } : undefined;
            
            // Llamar a onAnalyze con todos los datos
            onAnalyze({
              costPerHour,
              avgCsat,
              segmentMapping,
              file: uploadMethod === 'file' ? file || undefined : undefined,
              sheetUrl: uploadMethod === 'url' ? sheetUrl : undefined,
              useSynthetic: uploadMethod === 'synthetic'
            });
          }}
          disabled={!canAnalyze || isAnalyzing}
          className={clsx(
            'px-8 py-4 rounded-xl font-bold text-lg transition-all flex items-center gap-3',
            canAnalyze && !isAnalyzing
              ? 'bg-gradient-to-r from-[#6D84E3] to-[#5a6fc9] text-white hover:scale-105 shadow-lg'
              : 'bg-slate-300 text-slate-500 cursor-not-allowed'
          )}
        >
          {isAnalyzing ? (
            <>
              <Loader2 size={24} className="animate-spin" />
              Analizando...
            </>
          ) : (
            <>
              <FileText size={24} />
              Generar Análisis
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
};

export default DataInputRedesigned;
