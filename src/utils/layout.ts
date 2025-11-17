/**
 * Character layout utilities for multi-character word animation
 */

export interface CharacterLayout {
  char: string;
  charIndex: number;
  xOffset: number;
  yOffset: number;
}

/**
 * Calculate horizontal character positions for rendering a word
 * @param text - The full text/word to layout
 * @param fontSize - Font size in pixels
 * @param canvasWidth - Canvas width for centering
 * @param canvasHeight - Canvas height for vertical centering
 * @param fontFamily - Font family for measurement
 * @returns Array of character positions with offsets
 */
export function calculateCharacterLayout(
  text: string,
  fontSize: number,
  canvasWidth: number,
  canvasHeight: number,
  fontFamily: string = 'sans-serif'
): CharacterLayout[] {
  if (!text) return [];

  // Create temporary canvas for text measurement
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  ctx.font = `${fontSize}px '${fontFamily}', sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // Measure total text width
  const totalWidth = ctx.measureText(text).width;

  // Calculate starting X position to center the entire word
  const startX = (canvasWidth - totalWidth) / 2;

  // Calculate Y position (vertical center)
  const centerY = canvasHeight / 2;

  // Calculate individual character positions
  const layouts: CharacterLayout[] = [];
  let currentX = startX;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    // Get character width
    const charWidth = ctx.measureText(char).width;
    
    // Character position is relative to canvas center for stroke transformation
    // We need to calculate offset from the "single character centered" position
    // When editing a single character, it's centered at (canvasWidth/2, canvasHeight/2)
    // So offset = (currentX + charWidth/2) - canvasWidth/2
    const charCenterX = currentX + charWidth / 2;
    const xOffset = charCenterX - (canvasWidth / 2);
    
    layouts.push({
      char,
      charIndex: i,
      xOffset,
      yOffset: 0 // Keep y-offset 0 since all characters are on same baseline
    });

    // Move to next character position
    currentX += charWidth;
  }

  return layouts;
}

/**
 * Transform a point by applying character offset
 * @param point - Original point coordinates
 * @param offset - Character offset to apply
 * @returns Transformed point
 */
export function transformPoint(
  point: { x: number; y: number },
  offset: { xOffset: number; yOffset: number }
): { x: number; y: number } {
  return {
    x: point.x + offset.xOffset,
    y: point.y + offset.yOffset
  };
}
