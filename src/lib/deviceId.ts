const DEVICE_ID_KEY = "handwrite-device-id";

const isBrowser = typeof window !== "undefined";

/**
 * Generates a UUID v4
 */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for browsers without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Gets or creates a device ID. The ID is generated on first visit
 * and persisted in localStorage.
 */
export function getDeviceId(): string {
  if (!isBrowser) {
    // Server-side fallback (shouldn't happen in this app)
    return "server-device-id";
  }

  try {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY);
    if (existing) {
      return existing;
    }

    // Generate new UUID
    const newId = generateUUID();
    window.localStorage.setItem(DEVICE_ID_KEY, newId);
    console.log(`Generated new device ID: ${newId}`);
    return newId;
  } catch (error) {
    console.error("Failed to get or create device ID", error);
    // Return a temporary ID if localStorage fails
    return `temp-${Date.now()}`;
  }
}

