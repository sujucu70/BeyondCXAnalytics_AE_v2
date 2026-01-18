/**
 * serverCache.ts - Server-side cache for CSV files
 *
 * Uses backend API to store/retrieve cached CSV files.
 * Works across browsers and computers (as long as they access the same server).
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface ServerCacheMetadata {
  fileName: string;
  fileSize: number;
  recordCount: number;
  cachedAt: string;
  costPerHour: number;
}

/**
 * Check if server has cached data
 */
export async function checkServerCache(authHeader: string): Promise<{
  exists: boolean;
  metadata: ServerCacheMetadata | null;
}> {
  const url = `${API_BASE_URL}/cache/check`;
  console.log('[ServerCache] Checking cache at:', url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
      },
    });

    console.log('[ServerCache] Response status:', response.status);

    if (!response.ok) {
      const text = await response.text();
      console.error('[ServerCache] Error checking cache:', response.status, text);
      return { exists: false, metadata: null };
    }

    const data = await response.json();
    console.log('[ServerCache] Response data:', data);
    return {
      exists: data.exists || false,
      metadata: data.metadata || null,
    };
  } catch (error) {
    console.error('[ServerCache] Error checking cache:', error);
    return { exists: false, metadata: null };
  }
}

/**
 * Save CSV file to server cache using FormData
 * This sends the actual file, not parsed JSON data
 */
export async function saveFileToServerCache(
  authHeader: string,
  file: File,
  costPerHour: number
): Promise<boolean> {
  const url = `${API_BASE_URL}/cache/file`;
  console.log(`[ServerCache] Saving file "${file.name}" (${(file.size / 1024 / 1024).toFixed(2)} MB) to server at:`, url);

  try {
    const formData = new FormData();
    formData.append('csv_file', file);
    formData.append('fileName', file.name);
    formData.append('fileSize', file.size.toString());
    formData.append('costPerHour', costPerHour.toString());

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        // Note: Don't set Content-Type - browser sets it automatically with boundary for FormData
      },
      body: formData,
    });

    console.log('[ServerCache] Save response status:', response.status);

    if (!response.ok) {
      const text = await response.text();
      console.error('[ServerCache] Error saving cache:', response.status, text);
      return false;
    }

    const data = await response.json();
    console.log('[ServerCache] Save success:', data);
    return true;
  } catch (error) {
    console.error('[ServerCache] Error saving cache:', error);
    return false;
  }
}

/**
 * Download the cached CSV file from the server
 * Returns a File object that can be parsed locally
 */
export async function downloadCachedFile(authHeader: string): Promise<File | null> {
  const url = `${API_BASE_URL}/cache/download`;
  console.log('[ServerCache] Downloading cached file from:', url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
      },
    });

    console.log('[ServerCache] Download response status:', response.status);

    if (response.status === 404) {
      console.error('[ServerCache] No cached file found');
      return null;
    }

    if (!response.ok) {
      const text = await response.text();
      console.error('[ServerCache] Error downloading cached file:', response.status, text);
      return null;
    }

    // Get the blob and create a File object
    const blob = await response.blob();
    const file = new File([blob], 'cached_data.csv', { type: 'text/csv' });
    console.log(`[ServerCache] Downloaded file: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    return file;
  } catch (error) {
    console.error('[ServerCache] Error downloading cached file:', error);
    return null;
  }
}

/**
 * Save drilldownData JSON to server cache
 * Called after calculating drilldown from uploaded file
 */
export async function saveDrilldownToServerCache(
  authHeader: string,
  drilldownData: any[]
): Promise<boolean> {
  const url = `${API_BASE_URL}/cache/drilldown`;
  console.log(`[ServerCache] Saving drilldownData (${drilldownData.length} skills) to server`);

  try {
    const formData = new FormData();
    formData.append('drilldown_json', JSON.stringify(drilldownData));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
      },
      body: formData,
    });

    console.log('[ServerCache] Save drilldown response status:', response.status);

    if (!response.ok) {
      const text = await response.text();
      console.error('[ServerCache] Error saving drilldown:', response.status, text);
      return false;
    }

    const data = await response.json();
    console.log('[ServerCache] Drilldown save success:', data);
    return true;
  } catch (error) {
    console.error('[ServerCache] Error saving drilldown:', error);
    return false;
  }
}

/**
 * Get cached drilldownData from server
 * Returns the pre-calculated drilldown data for fast cache usage
 */
export async function getCachedDrilldown(authHeader: string): Promise<any[] | null> {
  const url = `${API_BASE_URL}/cache/drilldown`;
  console.log('[ServerCache] Getting cached drilldown from:', url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
      },
    });

    console.log('[ServerCache] Get drilldown response status:', response.status);

    if (response.status === 404) {
      console.log('[ServerCache] No cached drilldown found');
      return null;
    }

    if (!response.ok) {
      const text = await response.text();
      console.error('[ServerCache] Error getting drilldown:', response.status, text);
      return null;
    }

    const data = await response.json();
    console.log(`[ServerCache] Got cached drilldown: ${data.drilldownData?.length || 0} skills`);
    return data.drilldownData || null;
  } catch (error) {
    console.error('[ServerCache] Error getting drilldown:', error);
    return null;
  }
}

/**
 * Clear server cache
 */
export async function clearServerCache(authHeader: string): Promise<boolean> {
  const url = `${API_BASE_URL}/cache/file`;
  console.log('[ServerCache] Clearing cache at:', url);

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: authHeader,
      },
    });

    console.log('[ServerCache] Clear response status:', response.status);

    if (!response.ok) {
      const text = await response.text();
      console.error('[ServerCache] Error clearing cache:', response.status, text);
      return false;
    }

    console.log('[ServerCache] Cache cleared');
    return true;
  } catch (error) {
    console.error('[ServerCache] Error clearing cache:', error);
    return false;
  }
}

// Legacy exports - kept for backwards compatibility during transition
// These will throw errors if called since the backend endpoints are deprecated
export async function saveServerCache(): Promise<boolean> {
  console.error('[ServerCache] saveServerCache is deprecated - use saveFileToServerCache instead');
  return false;
}

export async function getServerCachedInteractions(): Promise<null> {
  console.error('[ServerCache] getServerCachedInteractions is deprecated - use cached file analysis instead');
  return null;
}
