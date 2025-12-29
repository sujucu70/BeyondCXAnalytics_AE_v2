/**
 * Utilidad para parsear archivos CSV y Excel
 * Convierte archivos a datos estructurados para análisis
 */

import { RawInteraction } from '../types';

/**
 * Parsear archivo CSV a array de objetos
 */
export async function parseCSV(file: File): Promise<RawInteraction[]> {
  const text = await file.text();
  const lines = text.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('El archivo CSV está vacío o no tiene datos');
  }
  
  // Parsear headers
  const headers = lines[0].split(',').map(h => h.trim());
  
  // Validar headers requeridos
  const requiredFields = [
    'interaction_id',
    'datetime_start',
    'queue_skill',
    'channel',
    'duration_talk',
    'hold_time',
    'wrap_up_time',
    'agent_id',
    'transfer_flag'
  ];
  
  const missingFields = requiredFields.filter(field => !headers.includes(field));
  if (missingFields.length > 0) {
    throw new Error(`Faltan campos requeridos: ${missingFields.join(', ')}`);
  }
  
  // Parsear filas
  const interactions: RawInteraction[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    
    if (values.length !== headers.length) {
      console.warn(`Fila ${i + 1} tiene número incorrecto de columnas, saltando...`);
      continue;
    }
    
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    
    try {
      const interaction: RawInteraction = {
        interaction_id: row.interaction_id,
        datetime_start: row.datetime_start,
        queue_skill: row.queue_skill,
        channel: row.channel,
        duration_talk: isNaN(parseFloat(row.duration_talk)) ? 0 : parseFloat(row.duration_talk),
        hold_time: isNaN(parseFloat(row.hold_time)) ? 0 : parseFloat(row.hold_time),
        wrap_up_time: isNaN(parseFloat(row.wrap_up_time)) ? 0 : parseFloat(row.wrap_up_time),
        agent_id: row.agent_id,
        transfer_flag: row.transfer_flag?.toLowerCase() === 'true' || row.transfer_flag === '1',
        caller_id: row.caller_id || undefined
      };
      
      interactions.push(interaction);
    } catch (error) {
      console.warn(`Error parseando fila ${i + 1}:`, error);
    }
  }
  
  return interactions;
}

/**
 * Parsear archivo Excel a array de objetos
 * Usa la librería xlsx que ya está instalada
 */
export async function parseExcel(file: File): Promise<RawInteraction[]> {
  // Importar xlsx dinámicamente
  const XLSX = await import('xlsx');
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Usar la primera hoja
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          reject(new Error('El archivo Excel está vacío'));
          return;
        }
        
        // Validar y transformar a RawInteraction[]
        const interactions: RawInteraction[] = [];
        
        for (let i = 0; i < jsonData.length; i++) {
          const row: any = jsonData[i];
          
          try {
            const durationStr = row.duration_talk || row.Duration_Talk || row['Duration Talk'] || '0';
            const holdStr = row.hold_time || row.Hold_Time || row['Hold Time'] || '0';
            const wrapStr = row.wrap_up_time || row.Wrap_Up_Time || row['Wrap Up Time'] || '0';

            const durationTalkVal = isNaN(parseFloat(durationStr)) ? 0 : parseFloat(durationStr);
            const holdTimeVal = isNaN(parseFloat(holdStr)) ? 0 : parseFloat(holdStr);
            const wrapUpTimeVal = isNaN(parseFloat(wrapStr)) ? 0 : parseFloat(wrapStr);

            const interaction: RawInteraction = {
              interaction_id: String(row.interaction_id || row.Interaction_ID || row['Interaction ID'] || ''),
              datetime_start: String(row.datetime_start || row.Datetime_Start || row['Datetime Start'] || row['Fecha/Hora de apertura'] || ''),
              queue_skill: String(row.queue_skill || row.Queue_Skill || row['Queue Skill'] || row.Subtipo || row.Tipo || ''),
              channel: String(row.channel || row.Channel || row['Origen del caso'] || 'Unknown'),
              duration_talk: isNaN(durationTalkVal) ? 0 : durationTalkVal,
              hold_time: isNaN(holdTimeVal) ? 0 : holdTimeVal,
              wrap_up_time: isNaN(wrapUpTimeVal) ? 0 : wrapUpTimeVal,
              agent_id: String(row.agent_id || row.Agent_ID || row['Agent ID'] || row['Propietario del caso'] || 'Unknown'),
              transfer_flag: Boolean(row.transfer_flag || row.Transfer_Flag || row['Transfer Flag'] || false),
              caller_id: row.caller_id || row.Caller_ID || row['Caller ID'] || undefined
            };
            
            // Validar que tiene datos mínimos
            if (interaction.interaction_id && interaction.queue_skill) {
              interactions.push(interaction);
            }
          } catch (error) {
            console.warn(`Error parseando fila ${i + 1}:`, error);
          }
        }
        
        if (interactions.length === 0) {
          reject(new Error('No se pudieron parsear datos válidos del Excel'));
          return;
        }
        
        resolve(interactions);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error leyendo el archivo'));
    };
    
    reader.readAsBinaryString(file);
  });
}

/**
 * Parsear archivo (detecta automáticamente CSV o Excel)
 */
export async function parseFile(file: File): Promise<RawInteraction[]> {
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.csv')) {
    return parseCSV(file);
  } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    return parseExcel(file);
  } else {
    throw new Error('Formato de archivo no soportado. Usa CSV o Excel (.xlsx, .xls)');
  }
}

/**
 * Validar datos parseados
 */
export function validateInteractions(interactions: RawInteraction[]): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    total: number;
    valid: number;
    invalid: number;
    skills: number;
    agents: number;
    dateRange: { min: string; max: string } | null;
  };
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (interactions.length === 0) {
    errors.push('No hay interacciones para validar');
    return {
      valid: false,
      errors,
      warnings,
      stats: { total: 0, valid: 0, invalid: 0, skills: 0, agents: 0, dateRange: null }
    };
  }
  
  // Validar período mínimo (3 meses recomendado)
  const dates = interactions
    .map(i => new Date(i.datetime_start))
    .filter(d => !isNaN(d.getTime()));
  
  if (dates.length > 0) {
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    const monthsDiff = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    if (monthsDiff < 3) {
      warnings.push(`Período de datos: ${monthsDiff.toFixed(1)} meses. Se recomiendan al menos 3 meses para análisis robusto.`);
    }
  }
  
  // Contar skills y agentes únicos
  const uniqueSkills = new Set(interactions.map(i => i.queue_skill)).size;
  const uniqueAgents = new Set(interactions.map(i => i.agent_id)).size;
  
  if (uniqueSkills < 3) {
    warnings.push(`Solo ${uniqueSkills} skills detectados. Se recomienda tener al menos 3 para análisis comparativo.`);
  }
  
  // Validar datos de tiempo
  const invalidTimes = interactions.filter(i => 
    i.duration_talk < 0 || i.hold_time < 0 || i.wrap_up_time < 0
  ).length;
  
  if (invalidTimes > 0) {
    warnings.push(`${invalidTimes} interacciones tienen tiempos negativos (serán filtradas).`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      total: interactions.length,
      valid: interactions.length - invalidTimes,
      invalid: invalidTimes,
      skills: uniqueSkills,
      agents: uniqueAgents,
      dateRange: dates.length > 0 ? {
        min: new Date(Math.min(...dates.map(d => d.getTime()))).toISOString().split('T')[0],
        max: new Date(Math.max(...dates.map(d => d.getTime()))).toISOString().split('T')[0]
      } : null
    }
  };
}
