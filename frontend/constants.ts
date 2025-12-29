// constants.ts - v2.0 con especificación simplificada
import { TiersData, DataRequirementsData } from './types';

export const TIERS: TiersData = {
  gold: {
    name: 'Análisis GOLD',
    price: 4900,
    color: 'bg-yellow-500',
    description: '6 dimensiones completas con algoritmo Agentic Readiness avanzado',
    requirements: 'CCaaS moderno (Genesys, Five9, NICE, Talkdesk)',
    timeline: '3-4 semanas',
    features: [
      '6 dimensiones completas',
      'Algoritmo Agentic Readiness avanzado (6 sub-factores)',
      'Análisis de distribución horaria',
      'Segmentación de clientes (opcional)',
      'Benchmark con percentiles múltiples (P25, P50, P75, P90)',
      'Roadmap ejecutable con 3 waves',
      'Modelo económico con NPV y análisis de sensibilidad',
      'Sesión de presentación incluida'
    ]
  },
  silver: {
    name: 'Análisis SILVER',
    price: 3500,
    color: 'bg-gray-400',
    description: '4 dimensiones core con Agentic Readiness simplificado',
    requirements: 'Sistema ACD/PBX con reporting básico',
    timeline: '2-3 semanas',
    features: [
      '4 dimensiones (Volumetría, Rendimiento, Economía, Agentic Readiness)',
      'Algoritmo Agentic Readiness simplificado (3 sub-factores)',
      'Roadmap de implementación',
      'Opportunity Matrix',
      'Economic Model básico',
      'Dashboard interactivo'
    ]
  },
  bronze: {
    name: 'Análisis EXPRESS',
    price: 1950,
    color: 'bg-orange-600',
    description: '3 dimensiones fundamentales sin Agentic Readiness',
    requirements: 'Exportación básica de reportes',
    timeline: '1-2 semanas',
    features: [
      '3 dimensiones core (Volumetría, Rendimiento, Economía)',
      'Roadmap cualitativo',
      'Análisis básico',
      'Recomendaciones estratégicas',
      'Reporte ejecutivo'
    ]
  }
};

// v2.0: Requisitos de datos simplificados (raw data de ACD/CTI)
export const DATA_REQUIREMENTS: DataRequirementsData = {
  gold: {
    mandatory: [
      {
        category: '⚙️ Configuración Estática (Manual)',
        fields: [
          { name: 'cost_per_hour', type: 'Número', example: '20', critical: true },
          { name: 'avg_csat', type: 'Número (0-100)', example: '85', critical: false }
        ]
      },
      {
        category: '📊 Datos del CSV (Raw Data de ACD)',
        fields: [
          { name: 'interaction_id', type: 'String único', example: 'call_8842910', critical: true },
          { name: 'datetime_start', type: 'DateTime', example: '2024-10-01 09:15:22', critical: true },
          { name: 'queue_skill', type: 'String', example: 'Soporte_Nivel1, Ventas', critical: true },
          { name: 'channel', type: 'String', example: 'Voice, Chat, WhatsApp', critical: true },
          { name: 'duration_talk', type: 'Segundos', example: '345', critical: true },
          { name: 'hold_time', type: 'Segundos', example: '45', critical: true },
          { name: 'wrap_up_time', type: 'Segundos', example: '30', critical: true },
          { name: 'agent_id', type: 'String', example: 'Agente_045', critical: true },
          { name: 'transfer_flag', type: 'Boolean', example: 'TRUE / FALSE', critical: true },
          { name: 'caller_id', type: 'String (hash)', example: 'Hash_99283', critical: false }
        ]
      }
    ],
    format: 'CSV o Excel (.xlsx) exportado directamente del ACD/CTI',
    volumeMin: 'Mínimo 3 meses completos (ideal 6 meses para capturar estacionalidad)'
  },
  silver: {
    mandatory: [
      {
        category: '⚙️ Configuración Estática (Manual)',
        fields: [
          { name: 'cost_per_hour', type: 'Número', example: '20', critical: true },
          { name: 'avg_csat', type: 'Número (0-100)', example: '85', critical: false }
        ]
      },
      {
        category: '📊 Datos del CSV (Raw Data de ACD)',
        fields: [
          { name: 'interaction_id', type: 'String único', example: 'call_8842910', critical: true },
          { name: 'datetime_start', type: 'DateTime', example: '2024-10-01 09:15:22', critical: true },
          { name: 'queue_skill', type: 'String', example: 'Soporte_Nivel1', critical: true },
          { name: 'channel', type: 'String', example: 'Voice, Chat', critical: true },
          { name: 'duration_talk', type: 'Segundos', example: '345', critical: true },
          { name: 'hold_time', type: 'Segundos', example: '45', critical: true },
          { name: 'wrap_up_time', type: 'Segundos', example: '30', critical: true },
          { name: 'agent_id', type: 'String', example: 'Agente_045', critical: true },
          { name: 'transfer_flag', type: 'Boolean', example: 'TRUE / FALSE', critical: true }
        ]
      }
    ],
    format: 'CSV o Excel (.xlsx)',
    volumeMin: 'Mínimo 2 meses completos'
  },
  bronze: {
    mandatory: [
      {
        category: '⚙️ Configuración Estática (Manual)',
        fields: [
          { name: 'cost_per_hour', type: 'Número', example: '20', critical: true }
        ]
      },
      {
        category: '📊 Datos del CSV (Raw Data de ACD)',
        fields: [
          { name: 'interaction_id', type: 'String único', example: 'call_8842910', critical: true },
          { name: 'datetime_start', type: 'DateTime', example: '2024-10-01 09:15:22', critical: true },
          { name: 'queue_skill', type: 'String', example: 'Soporte', critical: true },
          { name: 'duration_talk', type: 'Segundos', example: '345', critical: true },
          { name: 'hold_time', type: 'Segundos', example: '45', critical: true },
          { name: 'wrap_up_time', type: 'Segundos', example: '30', critical: true },
          { name: 'transfer_flag', type: 'Boolean', example: 'TRUE / FALSE', critical: true }
        ]
      }
    ],
    format: 'CSV o Excel (.xlsx)',
    volumeMin: 'Mínimo 1 mes completo'
  }
};

// v2.0: Dimensiones actualizadas (6 en lugar de 8)
export const DIMENSION_NAMES = {
  volumetry_distribution: 'Volumetría y Distribución Horaria',
  performance: 'Rendimiento',
  satisfaction: 'Satisfacción',
  economy: 'Economía',
  efficiency: 'Eficiencia',  // Fusiona Eficiencia + Efectividad
  benchmark: 'Benchmark'
};

// v2.0: Ponderaciones para Agentic Readiness Score
export const AGENTIC_READINESS_WEIGHTS = {
  repetitividad: 0.25,
  predictibilidad: 0.20,
  estructuracion: 0.15,
  complejidad_inversa: 0.15,
  estabilidad: 0.10,
  roi: 0.15
};

// v2.0: Thresholds para normalización
export const AGENTIC_READINESS_THRESHOLDS = {
  repetitividad: {
    k: 0.015,
    x0: 250  // 250 interacciones/mes = score 5
  },
  predictibilidad: {
    cv_aht_excellent: 0.3,
    cv_aht_poor: 0.6,
    escalation_excellent: 0.05,
    escalation_poor: 0.20
  },
  roi: {
    k: 0.00002,
    x0: 125000  // €125K ahorro anual = score 5
  }
};

// v2.0: Multiplicadores de segmentación para Opportunity Matrix
export const SEGMENT_MULTIPLIERS = {
  high: 1.5,
  medium: 1.0,
  low: 0.7
};

// v2.0: Configuración estática por defecto
export const DEFAULT_STATIC_CONFIG = {
  cost_per_hour: 20,        // €20/hora (fully loaded)
  avg_csat: 85              // 85/100 CSAT promedio
};

// v2.0: Validación de período mínimo (en días)
export const MIN_DATA_PERIOD_DAYS = {
  gold: 90,    // 3 meses
  silver: 60,  // 2 meses
  bronze: 30   // 1 mes
};

// v2.0: Scores de estructuración por canal (proxy sin reason codes)
export const CHANNEL_STRUCTURING_SCORES = {
  'Voice': 30,      // Bajo (no estructurado)
  'Chat': 60,       // Medio (semi-estructurado)
  'WhatsApp': 50,   // Medio-bajo
  'Email': 70,      // Medio-alto
  'API': 90,        // Alto (estructurado)
  'SMS': 40,        // Bajo-medio
  'default': 50     // Valor por defecto
};

// v2.0: Horario "fuera de horas" (off-hours)
export const OFF_HOURS_RANGE = {
  start: 19,  // 19:00
  end: 8      // 08:00
};

// v2.0: Percentiles de benchmark para heatmap
export const BENCHMARK_PERCENTILES = {
  fcr: { p25: 65, p50: 75, p75: 85, p90: 92 },
  aht: { p25: 420, p50: 360, p75: 300, p90: 240 },  // segundos
  hold_time: { p25: 60, p50: 45, p75: 30, p90: 15 },  // segundos
  transfer_rate: { p25: 25, p50: 15, p75: 8, p90: 3 },  // %
  csat: { p25: 75, p50: 82, p75: 88, p90: 93 }
};
