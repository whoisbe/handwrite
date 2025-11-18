import { Stroke } from "../types/stroke";
import { saveGlyphStrokes as saveToSupabase, fetchGlyphStrokes } from "./tracesRepository";

const STORAGE_KEY = "handwrite-traces-v1";
const SYNC_QUEUE_KEY = "handwrite-sync-queue";
const SYNC_STATUS_KEY = "handwrite-sync-status";

interface TraceStore {
  [font: string]: {
    [char: string]: {
      strokes: Stroke[];
      lastModified: number;
      syncedToSupabase: boolean;
    };
  };
}

interface SyncQueueItem {
  font: string;
  char: string;
  strokes: Stroke[];
  timestamp: number;
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

// Read sync queue
function readSyncQueue(): SyncQueueItem[] {
  if (!isBrowser) return [];
  
  try {
    const raw = window.localStorage.getItem(SYNC_QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SyncQueueItem[];
  } catch (error) {
    console.error("Failed to read sync queue", error);
    return [];
  }
}

// Write sync queue
function writeSyncQueue(queue: SyncQueueItem[]) {
  if (!isBrowser) return;
  
  try {
    window.localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("Failed to write sync queue", error);
  }
}

// Get sync status
export function getSyncStatus(): { pending: number; lastSync: number | null } {
  if (!isBrowser) return { pending: 0, lastSync: null };
  
  try {
    const queue = readSyncQueue();
    const statusRaw = window.localStorage.getItem(SYNC_STATUS_KEY);
    const status = statusRaw ? JSON.parse(statusRaw) : { lastSync: null };
    return {
      pending: queue.length,
      lastSync: status.lastSync,
    };
  } catch (error) {
    console.error("Failed to get sync status", error);
    return { pending: 0, lastSync: null };
  }
}

// Save to localStorage immediately
export function saveGlyphStrokesLocal(font: string, char: string, strokes: Stroke[]): boolean {
  if (!font || !char || strokes.length === 0) {
    return false;
  }

  try {
    const store = readStore();
    
    if (!store[font]) {
      store[font] = {};
    }
    
    store[font][char] = {
      strokes: JSON.parse(JSON.stringify(strokes)), // Deep clone
      lastModified: Date.now(),
      syncedToSupabase: false,
    };
    
    writeStore(store);
    
    // Add to sync queue
    const queue = readSyncQueue();
    // Remove any existing entry for this font+char combination
    const filtered = queue.filter(item => !(item.font === font && item.char === char));
    filtered.push({
      font,
      char,
      strokes: JSON.parse(JSON.stringify(strokes)),
      timestamp: Date.now(),
    });
    writeSyncQueue(filtered);
    
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

// Process sync queue (upload to Supabase)
let syncInProgress = false;

export async function processSyncQueue(): Promise<{ success: number; failed: number }> {
  if (syncInProgress) {
    console.log("Sync already in progress, skipping");
    return { success: 0, failed: 0 };
  }
  
  syncInProgress = true;
  const queue = readSyncQueue();
  
  if (queue.length === 0) {
    syncInProgress = false;
    return { success: 0, failed: 0 };
  }
  
  console.log(`⟳ Syncing ${queue.length} item(s) to Supabase...`);
  
  let successCount = 0;
  let failedCount = 0;
  const remainingQueue: SyncQueueItem[] = [];
  
  for (const item of queue) {
    try {
      console.log(`Attempting to sync: ${item.font} "${item.char}" (${item.strokes.length} strokes)`);
      await saveToSupabase(item.font, item.char, item.strokes);
      
      // Mark as synced in local store
      const store = readStore();
      if (store[item.font]?.[item.char]) {
        store[item.font][item.char].syncedToSupabase = true;
        writeStore(store);
      }
      
      successCount++;
      console.log(`✓ Synced to Supabase: ${item.font} "${item.char}"`);
    } catch (error) {
      console.error(`✗ Failed to sync ${item.font} "${item.char}":`, error);
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          stack: error.stack
        });
      }
      failedCount++;
      // Keep failed items in queue for retry
      remainingQueue.push(item);
    }
  }
  
  // Update queue (remove successful, keep failed)
  writeSyncQueue(remainingQueue);
  
  // Update last sync timestamp
  if (successCount > 0) {
    try {
      window.localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify({ lastSync: Date.now() }));
    } catch (error) {
      console.error("Failed to update sync status", error);
    }
  }
  
  syncInProgress = false;
  console.log(`✓ Sync complete: ${successCount} succeeded, ${failedCount} failed`);
  
  return { success: successCount, failed: failedCount };
}

// Fetch from Supabase if not in localStorage
export async function fetchAndHydrateStrokes(font: string, char: string): Promise<Stroke[] | undefined> {
  // Check localStorage first
  const local = loadGlyphStrokesLocal(font, char);
  if (local) {
    return local;
  }
  
  // Fetch from Supabase
  try {
    const remote = await fetchGlyphStrokes(font, char);
    if (remote?.length) {
      // Save to localStorage for offline access
      const store = readStore();
      if (!store[font]) {
        store[font] = {};
      }
      store[font][char] = {
        strokes: JSON.parse(JSON.stringify(remote)),
        lastModified: Date.now(),
        syncedToSupabase: true,
      };
      writeStore(store);
      
      console.log(`✓ Fetched from Supabase and cached: ${font} "${char}"`);
      return remote;
    }
  } catch (error) {
    console.error(`Failed to fetch from Supabase: ${font} "${char}"`, error);
  }
  
  return undefined;
}

// Auto-sync on interval
let syncIntervalId: number | null = null;

export function startAutoSync(intervalMs: number = 30000) {
  if (syncIntervalId !== null) {
    return; // Already started
  }
  
  console.log(`Starting auto-sync every ${intervalMs}ms`);
  
  // Do an initial sync
  void processSyncQueue();
  
  // Set up interval
  if (isBrowser) {
    syncIntervalId = window.setInterval(() => {
      void processSyncQueue();
    }, intervalMs) as unknown as number;
  }
}

export function stopAutoSync() {
  if (syncIntervalId !== null && isBrowser) {
    window.clearInterval(syncIntervalId);
    syncIntervalId = null;
    console.log("Stopped auto-sync");
  }
}

// Sync on visibility change (when user returns to tab)
if (isBrowser) {
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      void processSyncQueue();
    }
  });
  
  // Sync before unload
  window.addEventListener("beforeunload", () => {
    const status = getSyncStatus();
    if (status.pending > 0) {
      // Note: We can't await async operations in beforeunload
      // Just trigger it and hope it completes
      void processSyncQueue();
    }
  });
}
