import { Stroke } from "../types/stroke";

const STORAGE_KEY = "handwrite-traces-v1";

// Compatible with previous hybridPersistence structure
interface TraceStore {
  [font: string]: {
    [char: string]: {
      strokes: Stroke[];
      // Metadata fields from hybrid persistence are ignored but preserved if present in JSON
      [key: string]: any;
    };
  };
}

const isBrowser = typeof window !== "undefined";

let storeCache: TraceStore | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 1000; // Cache for 1 second to handle burst reads

function readStore(): TraceStore {
  if (!isBrowser) {
    return {};
  }

  const now = Date.now();
  if (storeCache && (now - lastCacheTime < CACHE_TTL_MS)) {
    return storeCache;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      storeCache = {};
    } else {
      storeCache = JSON.parse(raw) as TraceStore;
    }
    lastCacheTime = now;
    return storeCache;
  } catch (error) {
    console.error("Failed to read trace store", error);
    return {};
  }
}

function writeStore(store: TraceStore) {
  if (!isBrowser) {
    return;
  }

  try {
    // Update cache immediately
    storeCache = store;
    lastCacheTime = Date.now();

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error("Failed to persist trace store", error);
  }
}

function cloneStroke(stroke: Stroke): Stroke {
  return {
    ...stroke,
    dots: stroke.dots.map((point) => ({ ...point })),
    splinePoints: stroke.splinePoints.map((point) => ({ ...point })),
    cumulativeDistances: [...stroke.cumulativeDistances],
  };
}

function cloneStrokes(strokes: Stroke[]): Stroke[] {
  return strokes.map(cloneStroke);
}

export function persistGlyphStrokes(font: string, character: string, strokes: Stroke[]) {
  console.log('persistGlyphStrokes called:', { font, character, strokeCount: strokes.length });

  if (!font || !character || strokes.length === 0) {
    console.warn('persistGlyphStrokes: Skipping due to invalid params', { font, character, strokeCount: strokes.length });
    return;
  }

  const charKey = character;
  const store = readStore();
  const fontBucket = store[font] ?? {};

  // Preserve existing metadata if any, or create new object
  const existingEntry = fontBucket[charKey] || {};

  fontBucket[charKey] = {
    ...existingEntry,
    strokes: cloneStrokes(strokes),
    // Update timestamp if checking for it later
    lastModified: Date.now(),
    isLocalEdit: true
  };

  store[font] = fontBucket;
  console.log('Writing to store. Font bucket now has', Object.keys(fontBucket).length, 'characters');
  writeStore(store);
  console.log('persistGlyphStrokes complete for', character);
}

export function loadStrokesForText(text: string, font: string): Record<number, Stroke[]> {
  if (!font || !text) {
    return {};
  }

  const store = readStore();
  const fontBucket = store[font];
  if (!fontBucket) {
    return {};
  }

  const hydrated: Record<number, Stroke[]> = {};
  Array.from(text).forEach((char, index) => {
    const charKey = char;
    const stored = fontBucket[charKey];
    if (stored?.strokes?.length) {
      hydrated[index] = cloneStrokes(stored.strokes);
    }
  });

  return hydrated;
}

export function loadStrokesForGlyph(font: string, character: string): Stroke[] | undefined {
  if (!font || !character) {
    return undefined;
  }

  const store = readStore();
  const charKey = character;
  const stored = store[font]?.[charKey];
  if (!stored?.strokes?.length) {
    return undefined;
  }

  return cloneStrokes(stored.strokes);
}

export function getFontCoverage(font: string): Record<string, boolean> {
  if (!font) return {};

  try {
    const store = readStore();
    const fontBucket = store[font];

    const coverage: Record<string, boolean> = {};

    if (!fontBucket) return coverage;

    // Check all keys in the bucket
    Object.keys(fontBucket).forEach(char => {
      if (fontBucket[char]?.strokes?.length) {
        coverage[char] = true;
      }
    });

    return coverage;
  } catch (error) {
    console.error("Failed to get font coverage", error);
    return {};
  }
}

/**
 * Gets all characters with strokes for a given font
 */
export function getAllStrokesForFont(font: string): Record<string, Stroke[]> {
  if (!font) {
    return {};
  }

  const store = readStore();
  const fontBucket = store[font];

  if (!fontBucket) {
    return {};
  }

  const result: Record<string, Stroke[]> = {};

  Object.keys(fontBucket).forEach(char => {
    const entry = fontBucket[char];
    if (entry?.strokes?.length) {
      result[char] = cloneStrokes(entry.strokes);
    }
  });

  return result;
}

/**
 * Clears all stroke data for a specific font
 */
export function clearStrokesForFont(font: string): void {
  if (!font) return;

  try {
    const store = readStore();
    if (store[font]) {
      delete store[font];
      writeStore(store);
      console.log(`Cleared all strokes for font: ${font}`);
    }
  } catch (error) {
    console.error(`Failed to clear strokes for font ${font}`, error);
  }
}

// File download/upload utilities for export/import functionality

/**
 * Downloads data as a JSON file
 */
export function downloadJSON(data: any, filename: string) {
  const dataStr = JSON.stringify(data, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Reads and parses JSON file from user upload using a Web Worker
 * Returns a promise that resolves with parsed JSON data
 */
export function uploadJSON(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    // Initialize worker
    const worker = new Worker(new URL('../workers/json.worker.ts', import.meta.url), {
      type: 'module'
    });

    worker.onmessage = (e) => {
      const { data, error } = e.data;
      if (error) {
        reject(new Error(error));
      } else {
        resolve(data);
      }
      worker.terminate();
    };

    worker.onerror = (e) => {
      reject(new Error('Worker error: ' + e.message));
      worker.terminate();
    };

    // Send file to worker
    worker.postMessage(file);
  });
}
