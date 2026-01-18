/**
 * Utilidad para parsear archivos CSV y Excel
 * Convierte archivos a datos estructurados para análisis
 */

import { RawInteraction } from '../types';

/**
 * Helper: Parsear valor booleano de CSV (TRUE/FALSE, true/false, 1/0, yes/no, etc.)
 */
function parseBoolean(value: any): boolean {
  if (value === undefined || value === null || value === '') {
    return false;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  const strVal = String(value).toLowerCase().trim();
  return strVal === 'true' || strVal === '1' || strVal === 'yes' || strVal === 'si' || strVal === 'sí' || strVal === 'y' || strVal === 's';
}

/**
 * Helper: Obtener valor de columna buscando múltiples variaciones del nombre
 */
function getColumnValue(row: any, ...columnNames: string[]): string {
  for (const name of columnNames) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
      return String(row[name]);
    }
  }
  return '';
}

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
  console.log('📋 Todos los headers del CSV:', headers);

  // Verificar campos clave
  const keyFields = ['is_abandoned', 'fcr_real_flag', 'repeat_call_7d', 'transfer_flag', 'record_status'];
  const foundKeyFields = keyFields.filter(f => headers.includes(f));
  const missingKeyFields = keyFields.filter(f => !headers.includes(f));
  console.log('✅ Campos clave encontrados:', foundKeyFields);
  console.log('⚠️ Campos clave NO encontrados:', missingKeyFields.length > 0 ? missingKeyFields : 'TODOS PRESENTES');

  // Debug: Mostrar las primeras 5 filas con valores crudos de campos booleanos
  console.log('📋 VALORES CRUDOS DE CAMPOS BOOLEANOS (primeras 5 filas):');
  for (let rowNum = 1; rowNum <= Math.min(5, lines.length - 1); rowNum++) {
    const rawValues = lines[rowNum].split(',').map(v => v.trim());
    const rowData: Record<string, string> = {};
    headers.forEach((header, idx) => {
      rowData[header] = rawValues[idx] || '';
    });
    console.log(`  Fila ${rowNum}:`, {
      is_abandoned: rowData.is_abandoned,
      fcr_real_flag: rowData.fcr_real_flag,
      repeat_call_7d: rowData.repeat_call_7d,
      transfer_flag: rowData.transfer_flag,
      record_status: rowData.record_status
    });
  }

  // Validar headers requeridos (con variantes aceptadas)
  // v3.1: queue_skill (estratégico) y original_queue_id (operativo) son campos separados
  const requiredFieldsWithVariants: { field: string; variants: string[] }[] = [
    { field: 'interaction_id', variants: ['interaction_id', 'Interaction_ID', 'Interaction ID'] },
    { field: 'datetime_start', variants: ['datetime_start', 'Datetime_Start', 'Datetime Start'] },
    { field: 'queue_skill', variants: ['queue_skill', 'Queue_Skill', 'Queue Skill', 'Skill'] },
    { field: 'original_queue_id', variants: ['original_queue_id', 'Original_Queue_ID', 'Original Queue ID', 'Cola'] },
    { field: 'channel', variants: ['channel', 'Channel'] },
    { field: 'duration_talk', variants: ['duration_talk', 'Duration_Talk', 'Duration Talk'] },
    { field: 'hold_time', variants: ['hold_time', 'Hold_Time', 'Hold Time'] },
    { field: 'wrap_up_time', variants: ['wrap_up_time', 'Wrap_Up_Time', 'Wrap Up Time'] },
    { field: 'agent_id', variants: ['agent_id', 'Agent_ID', 'Agent ID'] },
    { field: 'transfer_flag', variants: ['transfer_flag', 'Transfer_Flag', 'Transfer Flag'] }
  ];

  const missingFields = requiredFieldsWithVariants
    .filter(({ variants }) => !variants.some(v => headers.includes(v)))
    .map(({ field }) => field);

  if (missingFields.length > 0) {
    throw new Error(`Faltan campos requeridos: ${missingFields.join(', ')}`);
  }

  // Parsear filas
  const interactions: RawInteraction[] = [];

  // Contadores para debug
  let abandonedTrueCount = 0;
  let abandonedFalseCount = 0;
  let fcrTrueCount = 0;
  let fcrFalseCount = 0;
  let repeatTrueCount = 0;
  let repeatFalseCount = 0;
  let transferTrueCount = 0;
  let transferFalseCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());

    if (values.length !== headers.length) {
      console.warn(`Fila ${i + 1} tiene ${values.length} columnas, esperado ${headers.length}, saltando...`);
      continue;
    }

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });

    try {
      // === PARSING SIMPLE Y DIRECTO ===

      // is_abandoned: valor directo del CSV
      const isAbandonedRaw = getColumnValue(row, 'is_abandoned', 'Is_Abandoned', 'Is Abandoned', 'abandoned');
      const isAbandoned = parseBoolean(isAbandonedRaw);
      if (isAbandoned) abandonedTrueCount++; else abandonedFalseCount++;

      // fcr_real_flag: valor directo del CSV
      const fcrRealRaw = getColumnValue(row, 'fcr_real_flag', 'FCR_Real_Flag', 'FCR Real Flag', 'fcr_flag', 'fcr');
      const fcrRealFlag = parseBoolean(fcrRealRaw);
      if (fcrRealFlag) fcrTrueCount++; else fcrFalseCount++;

      // repeat_call_7d: valor directo del CSV
      const repeatRaw = getColumnValue(row, 'repeat_call_7d', 'Repeat_Call_7d', 'Repeat Call 7d', 'repeat_call', 'rellamada', 'Rellamada');
      const repeatCall7d = parseBoolean(repeatRaw);
      if (repeatCall7d) repeatTrueCount++; else repeatFalseCount++;

      // transfer_flag: valor directo del CSV
      const transferRaw = getColumnValue(row, 'transfer_flag', 'Transfer_Flag', 'Transfer Flag');
      const transferFlag = parseBoolean(transferRaw);
      if (transferFlag) transferTrueCount++; else transferFalseCount++;

      // record_status: valor directo, normalizado a lowercase
      const recordStatusRaw = getColumnValue(row, 'record_status', 'Record_Status', 'Record Status').toLowerCase().trim();
      const validStatuses = ['valid', 'noise', 'zombie', 'abandon'];
      const recordStatus = validStatuses.includes(recordStatusRaw)
        ? recordStatusRaw as 'valid' | 'noise' | 'zombie' | 'abandon'
        : undefined;

      // v3.0: Parsear campos para drill-down
      // business_unit = Línea de Negocio (9 categorías C-Level)
      // queue_skill ya se usa como skill técnico (980 skills granulares)
      const lineaNegocio = getColumnValue(row, 'business_unit', 'Business_Unit', 'BusinessUnit', 'linea_negocio', 'Linea_Negocio', 'business_line');

      // v3.1: Parsear ambos niveles de jerarquía
      const queueSkill = getColumnValue(row, 'queue_skill', 'Queue_Skill', 'Queue Skill', 'Skill');
      const originalQueueId = getColumnValue(row, 'original_queue_id', 'Original_Queue_ID', 'Original Queue ID', 'Cola');

      const interaction: RawInteraction = {
        interaction_id: row.interaction_id,
        datetime_start: row.datetime_start,
        queue_skill: queueSkill,
        original_queue_id: originalQueueId || undefined,
        channel: row.channel,
        duration_talk: isNaN(parseFloat(row.duration_talk)) ? 0 : parseFloat(row.duration_talk),
        hold_time: isNaN(parseFloat(row.hold_time)) ? 0 : parseFloat(row.hold_time),
        wrap_up_time: isNaN(parseFloat(row.wrap_up_time)) ? 0 : parseFloat(row.wrap_up_time),
        agent_id: row.agent_id,
        transfer_flag: transferFlag,
        repeat_call_7d: repeatCall7d,
        caller_id: row.caller_id || undefined,
        is_abandoned: isAbandoned,
        record_status: recordStatus,
        fcr_real_flag: fcrRealFlag,
        linea_negocio: lineaNegocio || undefined
      };

      interactions.push(interaction);
    } catch (error) {
      console.warn(`Error parseando fila ${i + 1}:`, error);
    }
  }

  // === DEBUG SUMMARY ===
  const total = interactions.length;
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 RESUMEN DE PARSING CSV - VALORES BOOLEANOS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Total registros parseados: ${total}`);
  console.log('');
  console.log(`is_abandoned:`);
  console.log(`  TRUE:  ${abandonedTrueCount} (${((abandonedTrueCount/total)*100).toFixed(1)}%)`);
  console.log(`  FALSE: ${abandonedFalseCount} (${((abandonedFalseCount/total)*100).toFixed(1)}%)`);
  console.log('');
  console.log(`fcr_real_flag:`);
  console.log(`  TRUE:  ${fcrTrueCount} (${((fcrTrueCount/total)*100).toFixed(1)}%)`);
  console.log(`  FALSE: ${fcrFalseCount} (${((fcrFalseCount/total)*100).toFixed(1)}%)`);
  console.log('');
  console.log(`repeat_call_7d:`);
  console.log(`  TRUE:  ${repeatTrueCount} (${((repeatTrueCount/total)*100).toFixed(1)}%)`);
  console.log(`  FALSE: ${repeatFalseCount} (${((repeatFalseCount/total)*100).toFixed(1)}%)`);
  console.log('');
  console.log(`transfer_flag:`);
  console.log(`  TRUE:  ${transferTrueCount} (${((transferTrueCount/total)*100).toFixed(1)}%)`);
  console.log(`  FALSE: ${transferFalseCount} (${((transferFalseCount/total)*100).toFixed(1)}%)`);
  console.log('');

  // Calcular métricas esperadas
  const expectedAbandonRate = (abandonedTrueCount / total) * 100;
  const expectedFCR_fromFlag = (fcrTrueCount / total) * 100;
  const expectedFCR_calculated = ((total - transferTrueCount - repeatTrueCount +
    interactions.filter(i => i.transfer_flag && i.repeat_call_7d).length) / total) * 100;

  console.log('📈 MÉTRICAS ESPERADAS:');
  console.log(`  Abandonment Rate (is_abandoned=TRUE): ${expectedAbandonRate.toFixed(1)}%`);
  console.log(`  FCR (fcr_real_flag=TRUE): ${expectedFCR_fromFlag.toFixed(1)}%`);
  console.log(`  FCR calculado (no transfer AND no repeat): ~${expectedFCR_calculated.toFixed(1)}%`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  return interactions;
}

/**
 * Parsear archivo Excel a array de objetos
 */
export async function parseExcel(file: File): Promise<RawInteraction[]> {
  const XLSX = await import('xlsx');

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          reject(new Error('El archivo Excel está vacío'));
          return;
        }

        const interactions: RawInteraction[] = [];

        // Contadores para debug
        let abandonedTrueCount = 0;
        let fcrTrueCount = 0;
        let repeatTrueCount = 0;
        let transferTrueCount = 0;

        for (let i = 0; i < jsonData.length; i++) {
          const row: any = jsonData[i];

          try {
            // === PARSING SIMPLE Y DIRECTO ===

            // is_abandoned
            const isAbandonedRaw = getColumnValue(row, 'is_abandoned', 'Is_Abandoned', 'Is Abandoned', 'abandoned');
            const isAbandoned = parseBoolean(isAbandonedRaw);
            if (isAbandoned) abandonedTrueCount++;

            // fcr_real_flag
            const fcrRealRaw = getColumnValue(row, 'fcr_real_flag', 'FCR_Real_Flag', 'FCR Real Flag', 'fcr_flag', 'fcr');
            const fcrRealFlag = parseBoolean(fcrRealRaw);
            if (fcrRealFlag) fcrTrueCount++;

            // repeat_call_7d
            const repeatRaw = getColumnValue(row, 'repeat_call_7d', 'Repeat_Call_7d', 'Repeat Call 7d', 'repeat_call', 'rellamada');
            const repeatCall7d = parseBoolean(repeatRaw);
            if (repeatCall7d) repeatTrueCount++;

            // transfer_flag
            const transferRaw = getColumnValue(row, 'transfer_flag', 'Transfer_Flag', 'Transfer Flag');
            const transferFlag = parseBoolean(transferRaw);
            if (transferFlag) transferTrueCount++;

            // record_status
            const recordStatusRaw = getColumnValue(row, 'record_status', 'Record_Status', 'Record Status').toLowerCase().trim();
            const validStatuses = ['valid', 'noise', 'zombie', 'abandon'];
            const recordStatus = validStatuses.includes(recordStatusRaw)
              ? recordStatusRaw as 'valid' | 'noise' | 'zombie' | 'abandon'
              : undefined;

            const durationTalkVal = parseFloat(getColumnValue(row, 'duration_talk', 'Duration_Talk', 'Duration Talk') || '0');
            const holdTimeVal = parseFloat(getColumnValue(row, 'hold_time', 'Hold_Time', 'Hold Time') || '0');
            const wrapUpTimeVal = parseFloat(getColumnValue(row, 'wrap_up_time', 'Wrap_Up_Time', 'Wrap Up Time') || '0');

            // v3.0: Parsear campos para drill-down
            // business_unit = Línea de Negocio (9 categorías C-Level)
            const lineaNegocio = getColumnValue(row, 'business_unit', 'Business_Unit', 'BusinessUnit', 'linea_negocio', 'Linea_Negocio', 'business_line');

            const interaction: RawInteraction = {
              interaction_id: String(getColumnValue(row, 'interaction_id', 'Interaction_ID', 'Interaction ID') || ''),
              datetime_start: String(getColumnValue(row, 'datetime_start', 'Datetime_Start', 'Datetime Start', 'Fecha/Hora de apertura') || ''),
              queue_skill: String(getColumnValue(row, 'queue_skill', 'Queue_Skill', 'Queue Skill', 'Skill', 'Subtipo', 'Tipo') || ''),
              original_queue_id: String(getColumnValue(row, 'original_queue_id', 'Original_Queue_ID', 'Original Queue ID', 'Cola') || '') || undefined,
              channel: String(getColumnValue(row, 'channel', 'Channel', 'Origen del caso') || 'Unknown'),
              duration_talk: isNaN(durationTalkVal) ? 0 : durationTalkVal,
              hold_time: isNaN(holdTimeVal) ? 0 : holdTimeVal,
              wrap_up_time: isNaN(wrapUpTimeVal) ? 0 : wrapUpTimeVal,
              agent_id: String(getColumnValue(row, 'agent_id', 'Agent_ID', 'Agent ID', 'Propietario del caso') || 'Unknown'),
              transfer_flag: transferFlag,
              repeat_call_7d: repeatCall7d,
              caller_id: getColumnValue(row, 'caller_id', 'Caller_ID', 'Caller ID') || undefined,
              is_abandoned: isAbandoned,
              record_status: recordStatus,
              fcr_real_flag: fcrRealFlag,
              linea_negocio: lineaNegocio || undefined
            };

            if (interaction.interaction_id && interaction.queue_skill) {
              interactions.push(interaction);
            }
          } catch (error) {
            console.warn(`Error parseando fila ${i + 1}:`, error);
          }
        }

        // Debug summary
        const total = interactions.length;
        console.log('📊 Excel Parsing Summary:', {
          total,
          is_abandoned_TRUE: `${abandonedTrueCount} (${((abandonedTrueCount/total)*100).toFixed(1)}%)`,
          fcr_real_flag_TRUE: `${fcrTrueCount} (${((fcrTrueCount/total)*100).toFixed(1)}%)`,
          repeat_call_7d_TRUE: `${repeatTrueCount} (${((repeatTrueCount/total)*100).toFixed(1)}%)`,
          transfer_flag_TRUE: `${transferTrueCount} (${((transferTrueCount/total)*100).toFixed(1)}%)`
        });

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
  let minTime = Infinity;
  let maxTime = -Infinity;
  let validDatesCount = 0;

  for (const interaction of interactions) {
    const date = new Date(interaction.datetime_start);
    const time = date.getTime();
    if (!isNaN(time)) {
      validDatesCount++;
      if (time < minTime) minTime = time;
      if (time > maxTime) maxTime = time;
    }
  }

  if (validDatesCount > 0) {
    const monthsDiff = (maxTime - minTime) / (1000 * 60 * 60 * 24 * 30);

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
      dateRange: validDatesCount > 0 ? {
        min: new Date(minTime).toISOString().split('T')[0],
        max: new Date(maxTime).toISOString().split('T')[0]
      } : null
    }
  };
}
