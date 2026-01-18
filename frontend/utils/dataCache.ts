/**
 * dataCache.ts - Sistema de caché para datos de análisis
 *
 * Usa IndexedDB para persistir los datos parseados entre rebuilds.
 * El CSV de 500MB parseado a JSON es mucho más pequeño (~10-50MB).
 */

import { RawInteraction, AnalysisData } from '../types';

const DB_NAME = 'BeyondDiagnosisCache';
const DB_VERSION = 1;
const STORE_RAW = 'rawInteractions';
const STORE_ANALYSIS = 'analysisData';
const STORE_META = 'metadata';

interface CacheMetadata {
  id: string;
  fileName: string;
  fileSize: number;
  recordCount: number;
  cachedAt: string;
  costPerHour: number;
}

// Abrir conexión a IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Store para interacciones raw
      if (!db.objectStoreNames.contains(STORE_RAW)) {
        db.createObjectStore(STORE_RAW, { keyPath: 'id' });
      }

      // Store para datos de análisis
      if (!db.objectStoreNames.contains(STORE_ANALYSIS)) {
        db.createObjectStore(STORE_ANALYSIS, { keyPath: 'id' });
      }

      // Store para metadata
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Guardar interacciones parseadas en caché
 */
export async function cacheRawInteractions(
  interactions: RawInteraction[],
  fileName: string,
  fileSize: number,
  costPerHour: number
): Promise<void> {
  try {
    // Validar que es un array antes de cachear
    if (!Array.isArray(interactions)) {
      console.error('[Cache] No se puede cachear: interactions no es un array');
      return;
    }

    if (interactions.length === 0) {
      console.warn('[Cache] No se cachea: array vacío');
      return;
    }

    const db = await openDB();

    // Guardar metadata
    const metadata: CacheMetadata = {
      id: 'current',
      fileName,
      fileSize,
      recordCount: interactions.length,
      cachedAt: new Date().toISOString(),
      costPerHour
    };

    const metaTx = db.transaction(STORE_META, 'readwrite');
    metaTx.objectStore(STORE_META).put(metadata);

    // Guardar interacciones (en chunks para archivos grandes)
    const rawTx = db.transaction(STORE_RAW, 'readwrite');
    const store = rawTx.objectStore(STORE_RAW);

    // Limpiar datos anteriores
    store.clear();

    // Guardar como un solo objeto (más eficiente para lectura)
    // Aseguramos que guardamos el array directamente
    const dataToStore = { id: 'interactions', data: [...interactions] };
    store.put(dataToStore);

    await new Promise((resolve, reject) => {
      rawTx.oncomplete = resolve;
      rawTx.onerror = () => reject(rawTx.error);
    });

    console.log(`[Cache] Guardadas ${interactions.length} interacciones en caché (verificado: Array)`);
  } catch (error) {
    console.error('[Cache] Error guardando en caché:', error);
  }
}

/**
 * Guardar resultado de análisis en caché
 */
export async function cacheAnalysisData(data: AnalysisData): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_ANALYSIS, 'readwrite');
    tx.objectStore(STORE_ANALYSIS).put({ id: 'analysis', data });

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });

    console.log('[Cache] Análisis guardado en caché');
  } catch (error) {
    console.error('[Cache] Error guardando análisis:', error);
  }
}

/**
 * Obtener metadata de caché (para mostrar info al usuario)
 */
export async function getCacheMetadata(): Promise<CacheMetadata | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_META, 'readonly');
    const request = tx.objectStore(STORE_META).get('current');

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[Cache] Error leyendo metadata:', error);
    return null;
  }
}

/**
 * Obtener interacciones cacheadas
 */
export async function getCachedInteractions(): Promise<RawInteraction[] | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_RAW, 'readonly');
    const request = tx.objectStore(STORE_RAW).get('interactions');

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result;
        const data = result?.data;

        // Validar que es un array
        if (!data) {
          console.log('[Cache] No hay datos en caché');
          resolve(null);
          return;
        }

        if (!Array.isArray(data)) {
          console.error('[Cache] Datos en caché no son un array:', typeof data);
          resolve(null);
          return;
        }

        console.log(`[Cache] Recuperadas ${data.length} interacciones`);
        resolve(data);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[Cache] Error leyendo interacciones:', error);
    return null;
  }
}

/**
 * Obtener análisis cacheado
 */
export async function getCachedAnalysis(): Promise<AnalysisData | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_ANALYSIS, 'readonly');
    const request = tx.objectStore(STORE_ANALYSIS).get('analysis');

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result;
        resolve(result?.data || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[Cache] Error leyendo análisis:', error);
    return null;
  }
}

/**
 * Limpiar toda la caché
 */
export async function clearCache(): Promise<void> {
  try {
    const db = await openDB();

    const tx = db.transaction([STORE_RAW, STORE_ANALYSIS, STORE_META], 'readwrite');
    tx.objectStore(STORE_RAW).clear();
    tx.objectStore(STORE_ANALYSIS).clear();
    tx.objectStore(STORE_META).clear();

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });

    console.log('[Cache] Caché limpiada');
  } catch (error) {
    console.error('[Cache] Error limpiando caché:', error);
  }
}

/**
 * Verificar si hay datos en caché
 */
export async function hasCachedData(): Promise<boolean> {
  const metadata = await getCacheMetadata();
  return metadata !== null;
}
