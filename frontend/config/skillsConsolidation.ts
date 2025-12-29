/**
 * Skills Consolidation Configuration
 * Mapea 22 skills originales a 12 categorías consolidadas
 * Reduce scroll 45% mientras mantiene información crítica
 */

export type SkillCategory =
  | 'consultas_informacion'
  | 'gestion_cuenta'
  | 'contratos_cambios'
  | 'facturacion_pagos'
  | 'soporte_tecnico'
  | 'automatizacion'
  | 'reclamos'
  | 'back_office'
  | 'productos'
  | 'compliance'
  | 'otras_operaciones';

export interface SkillConsolidationMap {
  originalSkills: string[];
  category: SkillCategory;
  displayName: string;
  description: string;
  roiPotential: number; // en miles de euros
  volumeRange: 'high' | 'medium' | 'low';
  priority: number; // 1-11, donde 1 es más importante
  color: string; // para diferenciación visual
}

/**
 * Mapeo completo: Original Skills → Categorías Consolidadas
 */
export const skillsConsolidationConfig: Record<string, SkillConsolidationMap> = {
  consultas_informacion: {
    originalSkills: [
      'Información Facturación',
      'Información general',
      'Información Cobros',
      'Información Cedulación',
      'Información Póliza'
    ],
    category: 'consultas_informacion',
    displayName: 'Consultas de Información',
    description: 'Solicitudes de información sobre facturas, cobros, pólizas y datos administrativos',
    roiPotential: 800,
    volumeRange: 'high',
    priority: 1,
    color: 'bg-blue-50 border-blue-200'
  },

  gestion_cuenta: {
    originalSkills: [
      'Cambio Titular',
      'Cambio Titular (ROBOT 2007)',
      'Copia'
    ],
    category: 'gestion_cuenta',
    displayName: 'Gestión de Cuenta',
    description: 'Cambios de titularidad, actualizaciones de datos y copias de documentos',
    roiPotential: 400,
    volumeRange: 'medium',
    priority: 4,
    color: 'bg-purple-50 border-purple-200'
  },

  contratos_cambios: {
    originalSkills: [
      'Baja de contrato',
      'CONTRATACION',
      'Contrafación'
    ],
    category: 'contratos_cambios',
    displayName: 'Contratos & Cambios',
    description: 'Altas, bajas, modificaciones y gestión de contratos',
    roiPotential: 300,
    volumeRange: 'medium',
    priority: 5,
    color: 'bg-indigo-50 border-indigo-200'
  },

  facturacion_pagos: {
    originalSkills: [
      'FACTURACION',
      'Facturación (variante)',
      'Cobro'
    ],
    category: 'facturacion_pagos',
    displayName: 'Facturación & Pagos',
    description: 'Gestión de facturas, cobros, pagos y ajustes de facturación',
    roiPotential: 500,
    volumeRange: 'high',
    priority: 2,
    color: 'bg-green-50 border-green-200'
  },

  soporte_tecnico: {
    originalSkills: [
      'Conocer el estado de algún solicitud',
      'Envíar Inspecciones',
      'AVERÍA',
      'Distribución'
    ],
    category: 'soporte_tecnico',
    displayName: 'Soporte Técnico',
    description: 'Consultas de estado, inspecciones técnicas, averías y distribuciones',
    roiPotential: 1300,
    volumeRange: 'high',
    priority: 1,
    color: 'bg-red-50 border-red-200'
  },

  automatizacion: {
    originalSkills: [
      'Consulta Bono Social',
      'Consulta Bono Social (ROBOT 2007)',
      'Consulta Comercial'
    ],
    category: 'automatizacion',
    displayName: 'Automatización (Bot/RPA)',
    description: 'Procesos altamente automatizables mediante chatbots o RPA',
    roiPotential: 1500,
    volumeRange: 'medium',
    priority: 1,
    color: 'bg-yellow-50 border-yellow-200'
  },

  reclamos: {
    originalSkills: [
      'Gestión-administrativa-infra'  // Asumiendo que es gestión de reclamos
    ],
    category: 'reclamos',
    displayName: 'Reclamos & Quejas',
    description: 'Gestión de reclamos, quejas y compensaciones de clientes',
    roiPotential: 200,
    volumeRange: 'low',
    priority: 7,
    color: 'bg-orange-50 border-orange-200'
  },

  back_office: {
    originalSkills: [
      'Gestión de órdenes',
      'Gestión EC'
    ],
    category: 'back_office',
    displayName: 'Back Office',
    description: 'Operaciones internas, gestión de órdenes y procesos administrativos',
    roiPotential: 150,
    volumeRange: 'low',
    priority: 8,
    color: 'bg-gray-50 border-gray-200'
  },

  productos: {
    originalSkills: [
      'Productos (genérico)'  // Placeholder para futuras consultas de productos
    ],
    category: 'productos',
    displayName: 'Consultas de Productos',
    description: 'Información y consultas sobre productos y servicios disponibles',
    roiPotential: 100,
    volumeRange: 'low',
    priority: 9,
    color: 'bg-cyan-50 border-cyan-200'
  },

  compliance: {
    originalSkills: [
      'Compliance (genérico)'  // Placeholder para temas de normativa/legal
    ],
    category: 'compliance',
    displayName: 'Legal & Compliance',
    description: 'Asuntos legales, normativos y de cumplimiento',
    roiPotential: 50,
    volumeRange: 'low',
    priority: 10,
    color: 'bg-amber-50 border-amber-200'
  },

  otras_operaciones: {
    originalSkills: [
      'Otras operaciones',
      'Diversos'
    ],
    category: 'otras_operaciones',
    displayName: 'Otras Operaciones',
    description: 'Procesos diversos y operaciones que no encajan en otras categorías',
    roiPotential: 100,
    volumeRange: 'low',
    priority: 11,
    color: 'bg-slate-50 border-slate-200'
  }
};

/**
 * Función auxiliar para obtener la categoría consolidada de un skill
 */
export function getConsolidatedCategory(originalSkillName: string): SkillConsolidationMap | null {
  const normalized = originalSkillName.toLowerCase().trim();

  for (const config of Object.values(skillsConsolidationConfig)) {
    if (config.originalSkills.some(skill =>
      skill.toLowerCase().includes(normalized) ||
      normalized.includes(skill.toLowerCase())
    )) {
      return config;
    }
  }

  return null;
}

/**
 * Función para consolidar un array de skills en categorías únicas
 */
export function consolidateSkills(skills: string[]): Map<SkillCategory, SkillConsolidationMap> {
  const consolidated = new Map<SkillCategory, SkillConsolidationMap>();

  skills.forEach(skill => {
    const category = getConsolidatedCategory(skill);
    if (category && !consolidated.has(category.category)) {
      consolidated.set(category.category, category);
    }
  });

  // Ordenar por prioridad
  const sorted = Array.from(consolidated.values()).sort((a, b) => a.priority - b.priority);

  const result = new Map<SkillCategory, SkillConsolidationMap>();
  sorted.forEach(item => {
    result.set(item.category, item);
  });

  return result;
}

/**
 * Volumen de interacciones por categoría
 * Estos son estimados basados en patrones de industria
 */
export const volumeEstimates: Record<string, { min: number; max: number; typical: number }> = {
  consultas_informacion: { min: 5000, max: 12000, typical: 8000 },
  soporte_tecnico: { min: 1500, max: 3000, typical: 2000 },
  facturacion_pagos: { min: 3000, max: 8000, typical: 5000 },
  automatizacion: { min: 2000, max: 5000, typical: 3000 },
  gestion_cuenta: { min: 800, max: 2000, typical: 1200 },
  contratos_cambios: { min: 600, max: 1500, typical: 1000 },
  reclamos: { min: 300, max: 800, typical: 500 },
  back_office: { min: 200, max: 600, typical: 400 },
  productos: { min: 100, max: 400, typical: 200 },
  compliance: { min: 50, max: 200, typical: 100 },
  otras_operaciones: { min: 100, max: 400, typical: 200 }
};

/**
 * Función para obtener indicador visual de volumen
 */
export function getVolumeIndicator(volumeRange: 'high' | 'medium' | 'low'): string {
  switch (volumeRange) {
    case 'high':
      return '⭐⭐⭐'; // > 5K/mes
    case 'medium':
      return '⭐⭐';   // 1K-5K/mes
    case 'low':
      return '⭐';     // < 1K/mes
    default:
      return '⭐';
  }
}
