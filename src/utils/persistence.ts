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

function readStore(): TraceStore {
  if (!isBrowser) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) as TraceStore;
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
  if (!font || !character || strokes.length === 0) {
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
  writeStore(store);
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
 * Reads and parses JSON file from user upload
 * Returns a promise that resolves with parsed JSON data
 */
export function uploadJSON(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        resolve(data);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
