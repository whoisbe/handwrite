import { Stroke } from "../types/stroke";
import { getDeviceId } from "./deviceId";

const STORAGE_KEY = "handwrite-traces-v1";

export interface TraceMetadata {
  version: number;
  fontId: string;
  glyphId: string;
  timestamp: number;
  deviceId: string;
  isLocalEdit: boolean;
  syncedToSupabase: boolean; // Kept for compatibility, always false/irrelevant
}

interface TraceStore {
  [font: string]: {
    [char: string]: {
      strokes: Stroke[];
      lastModified: number;
      syncedToSupabase: boolean;
      version?: number;
      fontId?: string;
      glyphId?: string;
      timestamp?: number;
      deviceId?: string;
      isLocalEdit?: boolean;
    };
  };
}

const isBrowser = typeof window !== "undefined";

// Read from localStorage
function readStore(): TraceStore {
  if (!isBrowser) return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as TraceStore;
  } catch (error) {
    console.error("Failed to read trace store", error);
    return {};
  }
}

// Write to localStorage
function writeStore(store: TraceStore) {
  if (!isBrowser) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.error("Failed to persist trace store", error);
  }
}

// Get sync status (always "synced" since local is source of truth)
export function getSyncStatus(): { pending: number; lastSync: number | null } {
  return { pending: 0, lastSync: Date.now() };
}

// Save to localStorage
export function saveGlyphStrokesLocal(
  font: string,
  char: string,
  strokes: Stroke[],
  metadata?: {
    version?: number;
    fontId?: string;
    glyphId?: string;
    timestamp?: number;
    isLocalEdit?: boolean;
  }
): boolean {
  if (!font || !char || strokes.length === 0) {
    return false;
  }

  try {
    const store = readStore();

    if (!store[font]) {
      store[font] = {};
    }

    const deviceId = getDeviceId();

    store[font][char] = {
      strokes: JSON.parse(JSON.stringify(strokes)), // Deep clone
      lastModified: Date.now(),
      syncedToSupabase: true, // effectively "synced" to local
      version: metadata?.version,
      fontId: metadata?.fontId,
      glyphId: metadata?.glyphId,
      timestamp: metadata?.timestamp ?? Date.now(),
      deviceId: deviceId,
      isLocalEdit: metadata?.isLocalEdit ?? true,
    };

    writeStore(store);
    console.log(`✓ Saved to localStorage: ${font} "${char}" (${strokes.length} strokes)`);
    return true;
  } catch (error) {
    console.error("Failed to save to localStorage", error);
    return false;
  }
}

// Load from localStorage
export function loadGlyphStrokesLocal(font: string, char: string): Stroke[] | undefined {
  if (!font || !char) return undefined;

  try {
    const store = readStore();
    const data = store[font]?.[char];

    if (!data?.strokes?.length) {
      return undefined;
    }

    return JSON.parse(JSON.stringify(data.strokes)); // Deep clone
  } catch (error) {
    console.error("Failed to load from localStorage", error);
    return undefined;
  }
}

// Load with metadata from localStorage
export function loadGlyphStrokesWithMetadata(font: string, char: string): { strokes: Stroke[]; metadata?: TraceMetadata } | undefined {
  if (!font || !char) return undefined;

  try {
    const store = readStore();
    const data = store[font]?.[char];

    if (!data?.strokes?.length) {
      return undefined;
    }

    const strokes = JSON.parse(JSON.stringify(data.strokes));

    const metadata: TraceMetadata = {
      version: data.version || 1,
      fontId: data.fontId || "local",
      glyphId: data.glyphId || "local",
      timestamp: data.timestamp || Date.now(),
      deviceId: data.deviceId || getDeviceId(),
      isLocalEdit: data.isLocalEdit ?? true,
      syncedToSupabase: data.syncedToSupabase,
    };

    return { strokes, metadata };
  } catch (error) {
    console.error("Failed to load from localStorage with metadata", error);
    return undefined;
  }
}

// Load all strokes for a text string
export function loadStrokesForText(text: string, font: string): Record<number, Stroke[]> {
  if (!font || !text) return {};

  try {
    const store = readStore();
    const fontBucket = store[font];
    if (!fontBucket) return {};

    const hydrated: Record<number, Stroke[]> = {};
    Array.from(text).forEach((char, index) => {
      const data = fontBucket[char];
      if (data?.strokes?.length) {
        hydrated[index] = JSON.parse(JSON.stringify(data.strokes));
      }
    });

    return hydrated;
  } catch (error) {
    console.error("Failed to load strokes for text", error);
    return {};
  }
}

// Legacy/No-op functions for compatibility during refi
export async function processSyncQueue(): Promise<{ success: number; failed: number }> {
  return { success: 0, failed: 0 };
}

export async function fetchAndHydrateStrokes(font: string, char: string): Promise<Stroke[] | undefined> {
  return loadGlyphStrokesLocal(font, char);
}

export async function syncFontFromSupabase(fontName: string): Promise<number> {
  return 0; // No remote sync
}

export function markAsUsedAsIs(font: string, char: string): boolean {
  return true; // No-op
}

export function startAutoSync(intervalMs: number = 30000) {
  // No-op
}

export function stopAutoSync() {
  // No-op
}

// Get coverage for all alphanumeric characters
export function getFontCoverage(font: string): Record<string, boolean> {
  if (!font) return {};

  try {
    const store = readStore();
    const fontBucket = store[font];
    
    const coverage: Record<string, boolean> = {};
    
    // Check uppercase A-Z
    for (let i = 65; i <= 90; i++) {
      const char = String.fromCharCode(i);
      coverage[char] = !!(fontBucket?.[char]?.strokes?.length);
    }
    
    // Check lowercase a-z
    for (let i = 97; i <= 122; i++) {
      const char = String.fromCharCode(i);
      coverage[char] = !!(fontBucket?.[char]?.strokes?.length);
    }
    
    // Check numbers 0-9
    for (let i = 48; i <= 57; i++) {
      const char = String.fromCharCode(i);
      coverage[char] = !!(fontBucket?.[char]?.strokes?.length);
    }
    
    return coverage;
  } catch (error) {
    console.error("Failed to get font coverage", error);
    return {};
  }
}
