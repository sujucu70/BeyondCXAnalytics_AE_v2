import { DATA_REQUIREMENTS } from '../constants';
import { TierKey, Field } from '../types';

// Helper functions for randomness
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFromList = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomDate = (start: Date, end: Date): Date => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

const generateFieldValue = (field: Field, rowData: Map<string, any>): string | number | boolean => {
  const name = field.name.toLowerCase();

  if (name.includes('id') || name.includes('unique')) {
    return `${randomFromList(['INT', 'TR', 'SES', 'CUST'])}-${randomInt(100000, 999999)}-${randomInt(1000, 9999)}`;
  }
  if (name.includes('timestamp_start')) {
    const date = randomDate(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), new Date());
    rowData.set('timestamp_start', date);
    return date.toISOString().replace('T', ' ').substring(0, 19);
  }
  if (name.includes('fecha')) {
     const date = randomDate(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), new Date());
     return date.toISOString().substring(0, 10);
  }
  if (name.includes('timestamp_end')) {
    const startDate = rowData.get('timestamp_start') || new Date();
    const durationSeconds = randomInt(60, 1200);
    const endDate = new Date(startDate.getTime() + durationSeconds * 1000);
    return endDate.toISOString().replace('T', ' ').substring(0, 19);
  }
  if (name.includes('hora')) {
      return `${String(randomInt(8,19)).padStart(2,'0')}:${String(randomInt(0,59)).padStart(2,'0')}`;
  }
  if (name.includes('channel') || name.includes('canal')) {
    return randomFromList(['voice', 'chat', 'email', 'whatsapp']);
  }
  if (name.includes('skill') || name.includes('queue') || name.includes('tipo')) {
    return randomFromList(['soporte_tecnico', 'facturacion', 'ventas', 'renovaciones', 'informacion']);
  }
  if (name.includes('aht')) return randomInt(180, 600);
  if (name.includes('talk_time')) return randomInt(120, 450);
  if (name.includes('hold_time')) return randomInt(10, 90);
  if (name.includes('acw')) return randomInt(15, 120);
  if (name.includes('speed_of_answer')) return randomInt(5, 60);
  if (name.includes('duracion_minutos')) {
    return (randomInt(2, 20) + Math.random()).toFixed(2);
  }
  if (name.includes('resolved') || name.includes('transferred') || name.includes('abandoned') || name.includes('exception_flag')) {
    return randomFromList([true, false]);
  }
  if (name.includes('reason') || name.includes('disposition')) {
    return randomFromList(['consulta_saldo', 'reclamacion', 'soporte_producto', 'duda_factura', 'compra_exitosa', 'baja_servicio']);
  }
  if (name.includes('score')) {
    if (name.includes('nps')) return randomInt(-100, 100);
    if (name.includes('ces')) return randomInt(1, 7);
    return randomInt(1, 10);
  }
  if (name.includes('coste_hora_agente') || name.includes('labor_cost_per_hour')) {
      return (18 + Math.random() * 15).toFixed(2);
  }
  if (name.includes('overhead_rate') || name.includes('structured_fields_pct')) {
      return Math.random().toFixed(2);
  }
  if (name.includes('tech_licenses_annual')) {
      return randomInt(25000, 100000);
  }
  if (name.includes('num_agentes_promedio')) {
      return randomInt(20, 50);
  }

  // Fallback for any other type
  return 'N/A';
};

export const generateSyntheticCsv = (tier: TierKey): string => {
  const requirements = DATA_REQUIREMENTS[tier];
  if (!requirements) {
    return '';
  }
  const allFields = requirements.mandatory.flatMap(cat => cat.fields);
  const headers = allFields.map(field => field.name).join(',');

  const rows: string[] = [];
  const numRows = randomInt(250, 500);

  for (let i = 0; i < numRows; i++) {
    const rowData = new Map<string, any>();
    const row = allFields.map(field => {
      let value = generateFieldValue(field, rowData);
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return value;
    }).join(',');
    rows.push(row);
  }

  return `${headers}\n${rows.join('\n')}`;
};
