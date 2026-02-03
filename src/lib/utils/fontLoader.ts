/**
 * Font loading utilities to ensure fonts are loaded before rendering
 */

/**
 * Wait for a specific font to be loaded
 */
export async function waitForFont(fontFamily: string, fontSize: string = '128px'): Promise<void> {
  if (!document.fonts || !document.fonts.check) {
    // Fallback for browsers without Font Loading API
    await new Promise(resolve => setTimeout(resolve, 100));
    return;
  }

  const fontSpec = `${fontSize} '${fontFamily}', sans-serif`;
  
  // Check if font is already loaded
  if (document.fonts.check(fontSpec)) {
    return;
  }

  // Wait for fonts to load
  try {
    await document.fonts.ready;
    
    // Double check the specific font
    if (!document.fonts.check(fontSpec)) {
      // Font might not be available, wait a bit more
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  } catch (error) {
    console.warn('Font loading check failed:', error);
    // Continue anyway after a short delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * Get a normalized font string for consistent rendering
 */
export function getFontString(fontFamily: string, fontSize: number = 128): string {
  return `${fontSize}px '${fontFamily}', sans-serif`;
}

