// utils/apiClient.ts
import type { TierKey } from '../types';

type SegmentMapping = {
  high_value_queues: string[];
  medium_value_queues: string[];
  low_value_queues: string[];
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function getAuthHeader(): Record<string, string> {
  const user = import.meta.env.VITE_API_USERNAME;
  const pass = import.meta.env.VITE_API_PASSWORD;

  if (!user || !pass) {
    return {};
  }

  const token = btoa(`${user}:${pass}`);
  return {
    Authorization: `Basic ${token}`,
  };
}

// JSON exactamente como lo devuelve el backend en `results`
export type BackendRawResults = any;

/**
 * Llama al endpoint /analysis y devuelve `results` tal cual.
 */
export async function callAnalysisApiRaw(params: {
  tier: TierKey;
  costPerHour: number;
  avgCsat: number;
  segmentMapping?: SegmentMapping;
  file: File;
  authHeaderOverride?: string;
}): Promise<BackendRawResults> {
  const { costPerHour, segmentMapping, file, authHeaderOverride } = params;

  if (!file) {
    throw new Error('No se ha proporcionado ningún archivo CSV');
  }

  const economyData: any = {
    labor_cost_per_hour: costPerHour,
  };

  if (segmentMapping) {
    const customer_segments: Record<string, string> = {};

    for (const q of segmentMapping.high_value_queues || []) {
      customer_segments[q] = 'high';
    }
    for (const q of segmentMapping.medium_value_queues || []) {
      customer_segments[q] = 'medium';
    }
    for (const q of segmentMapping.low_value_queues || []) {
      customer_segments[q] = 'low';
    }

    if (Object.keys(customer_segments).length > 0) {
      economyData.customer_segments = customer_segments;
    }
  }

  const formData = new FormData();
  formData.append('csv_file', file);
  formData.append('analysis', 'premium');

  if (Object.keys(economyData).length > 0) {
    formData.append('economy_json', JSON.stringify(economyData));
  }

  // Si nos pasan un Authorization desde el login, lo usamos.
  // Si no, caemos al getAuthHeader() basado en variables de entorno (útil en dev).
  const authHeaders: Record<string, string> = authHeaderOverride
    ? { Authorization: authHeaderOverride }
    : getAuthHeader();

  const response = await fetch(`${API_BASE_URL}/analysis`, {
    method: 'POST',
    body: formData,
    headers: {
      ...authHeaders,
    },
  });

  if (!response.ok) {
    const error = new Error(
      `Error en API /analysis: ${response.status} ${response.statusText}`
    );
    (error as any).status = response.status;
    throw error;
  }

  // ⬇️ IMPORTANTE: nos quedamos solo con `results`
  const json = await response.json();
  const results = (json as any)?.results ?? json;

  return results as BackendRawResults;
}

