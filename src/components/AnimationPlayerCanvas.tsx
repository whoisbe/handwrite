import { useRef, useEffect, useState } from 'react';
import { Stroke } from '../types/stroke';
import { getPointAtDistance } from '../utils/spline';
import { easings, EasingType } from '../utils/easing';
import { calculateCharacterLayout, transformPoint, BASELINE_OFFSET_RATIO } from '../utils/layout';
import { waitForFont, getFontString } from '../utils/fontLoader';

interface AnimationPlayerCanvasProps {
  text: string;
  fontFamily: string;
  strokes: Stroke[]; // Strokes for current character only (editor view)
  characterStrokes?: Record<number, Stroke[]>; // All strokes for all characters (full word animation)
  isPlaying: boolean;
  onPlaybackComplete?: () => void;
  strokeDuration?: number; // Duration per stroke in ms
  strokeGap?: number; // Gap between strokes in ms
  characterGap?: number; // Gap between characters in ms
  speedMultiplier?: number; // Speed multiplier (1x to 4x)
  easing?: EasingType;
  width?: number;
  height?: number;
}

export default function AnimationPlayerCanvas({
  text,
  fontFamily,
  strokes,
  characterStrokes,
  isPlaying,
  onPlaybackComplete,
  strokeDuration = 800,
  strokeGap = 150,
  characterGap = 200,
  speedMultiplier = 1,
  easing = 'easeInOut',
  width = 800,
  height = 400
}: AnimationPlayerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  // Build complete stroke timeline for full word animation
  interface StrokeWithOffset {
    stroke: Stroke;
    charIndex: number;
    xOffset: number;
    yOffset: number;
  }

  // Memoize timeline strokes to prevent infinite render loop
  const timelineStrokes = useRef<StrokeWithOffset[]>([]);
  
  useEffect(() => {
    const allStrokes: StrokeWithOffset[] = [];
    
    if (characterStrokes && Object.keys(characterStrokes).length > 0) {
      // Full word mode: combine all character strokes with offsets
      const fontSize = 128;
      const charLayouts = calculateCharacterLayout(text, fontSize, width, height, fontFamily);
      
      // Build timeline: char0 strokes, gap, char1 strokes, gap, etc.
      Object.keys(characterStrokes)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach(charIndex => {
          const charStrokes = characterStrokes[charIndex] || [];
          const layout = charLayouts[charIndex];
          
          if (layout && charStrokes.length > 0) {
            charStrokes.forEach(stroke => {
              allStrokes.push({
                stroke,
                charIndex,
                xOffset: layout.xOffset,
                yOffset: layout.yOffset
              });
            });
          }
        });
    }

    // Use either full word strokes or current character strokes
    timelineStrokes.current = allStrokes.length > 0 
      ? allStrokes 
      : strokes.map(s => ({ stroke: s, charIndex: 0, xOffset: 0, yOffset: 0 }));
  }, [text, fontFamily, strokes, characterStrokes, width, height]);

  // Calculate total animation duration with speed multiplier
  // Add character gaps between different characters
  let totalDuration = 0;
  let lastCharIndex = -1;
  
  timelineStrokes.current.forEach((item, index) => {
    // Add character gap if this is a new character (but not the first)
    if (item.charIndex !== lastCharIndex && lastCharIndex !== -1) {
      totalDuration += characterGap / speedMultiplier;
    }
    lastCharIndex = item.charIndex;
    
    // Add stroke duration
    totalDuration += strokeDuration / speedMultiplier;
    
    // Add stroke gap if not the last stroke
    if (index < timelineStrokes.current.length - 1) {
      totalDuration += strokeGap / speedMultiplier;
    }
  });

  // Reset animation when strokes or speed changes
  useEffect(() => {
    setCurrentTime(0);
    startTimeRef.current = null;
  }, [strokes, characterStrokes, speedMultiplier]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      startTimeRef.current = null;
      return;
    }

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      setCurrentTime(elapsed);

      if (elapsed >= totalDuration) {
        setCurrentTime(totalDuration);
        startTimeRef.current = null;
        if (onPlaybackComplete) {
          onPlaybackComplete();
        }
        return;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, totalDuration, onPlaybackComplete]);

  // Setup canvas with proper device pixel ratio
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setupCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      // Use actual displayed size for internal canvas resolution
      const displayWidth = rect.width || width;
      const displayHeight = rect.height || height;
      
      // Set actual canvas size accounting for DPR
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      
      // Scale context to account for DPR
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    // Initial setup
    setupCanvas();

    // Re-setup on resize
    const resizeObserver = new ResizeObserver(setupCanvas);
    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
    };
  }, [width, height]);

  // Render animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const render = async () => {
      // Wait for font to load before rendering
      await waitForFont(fontFamily, '128px');

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const displayWidth = rect.width || width;
      const displayHeight = rect.height || height;
      
      // Ensure canvas is properly sized
      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
      }
      
      // Fill canvas with white background using display coordinates (after DPR scale)
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, displayWidth, displayHeight);
      
      // Scale context to map logical coordinates (800x400) to display coordinates
      // This ensures strokes saved in logical coords render correctly at any display size
      const scaleX = displayWidth / width;
      const scaleY = displayHeight / height;
      ctx.save();
      ctx.scale(scaleX, scaleY);

      // Background text outline is now transparent (removed for cleaner animation view)

      // Create offscreen canvas for mask-based reveal (use logical size)
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = width;
      offscreenCanvas.height = height;
      const offscreenCtx = offscreenCanvas.getContext('2d');
      if (!offscreenCtx) return;

      // Draw full text on offscreen canvas (logical coordinates) using normalized font string
      offscreenCtx.font = getFontString(fontFamily, 128);
      offscreenCtx.textAlign = 'center';
      offscreenCtx.textBaseline = 'alphabetic';
      offscreenCtx.fillStyle = 'rgba(0, 0, 0, 1)';
      offscreenCtx.fillText(text || 'A', width / 2, height / 2 + (128 * BASELINE_OFFSET_RATIO));

    // Calculate total duration for completion check
    let totalDuration = 0;
    let lastCharIndex = -1;
    
    timelineStrokes.current.forEach((item, index) => {
      if (item.charIndex !== lastCharIndex && lastCharIndex !== -1) {
        totalDuration += characterGap / speedMultiplier;
      }
      lastCharIndex = item.charIndex;
      totalDuration += strokeDuration / speedMultiplier;
      if (index < timelineStrokes.current.length - 1) {
        totalDuration += strokeGap / speedMultiplier;
      }
    });

    const animationCompleted = currentTime >= totalDuration && totalDuration > 0;
    const shouldShowText = isPlaying || animationCompleted;

    // Create mask canvas (use logical size)
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    // Draw reveal mask when animation is playing or has completed
    if (shouldShowText) {
      // Draw reveal mask based on current time with proper timeline
      const easingFn = easings[easing];

      // Calculate timing for each stroke including character gaps with speed multiplier
      let accumulatedTime = 0;
      let previousCharIndex = -1;

      timelineStrokes.current.forEach((item) => {
      const { stroke, charIndex, xOffset, yOffset } = item;

      // Add character gap if switching to new character
      if (charIndex !== previousCharIndex && previousCharIndex !== -1) {
        accumulatedTime += characterGap / speedMultiplier;
      }
      previousCharIndex = charIndex;

      const strokeStartTime = accumulatedTime;
      const strokeEndTime = strokeStartTime + strokeDuration / speedMultiplier;
      // Move to next stroke's start time for next iteration
      accumulatedTime = strokeEndTime + strokeGap / speedMultiplier;

      if (currentTime < strokeStartTime) {
        // Stroke hasn't started yet
        return;
      }

      let progress = 0;
      if (currentTime >= strokeEndTime) {
        // Stroke is complete
        progress = 1;
      } else {
        // Stroke is in progress
        const localTime = currentTime - strokeStartTime;
        const t = localTime / (strokeDuration / speedMultiplier);
        progress = easingFn(t);
      }

      // Calculate distance to reveal
      const totalLength = stroke.cumulativeDistances[stroke.cumulativeDistances.length - 1];
      const revealDistance = progress * totalLength;

      // Draw brush strokes along the path up to revealDistance
      const brushRadius = 8;
      let currentDistance = 0;
      const step = 2; // pixels between brush stamps

      for (let i = 1; i < stroke.splinePoints.length; i++) {
        const segmentStart = stroke.cumulativeDistances[i - 1];
        const segmentEnd = stroke.cumulativeDistances[i];

        if (segmentStart > revealDistance) break;

        while (currentDistance <= Math.min(revealDistance, segmentEnd)) {
          const point = getPointAtDistance(
            stroke.splinePoints,
            stroke.cumulativeDistances,
            currentDistance
          );

          if (point) {
            // Transform point by character offset
            const transformedPoint = transformPoint(point, { xOffset, yOffset });
            
            maskCtx.fillStyle = 'white';
            maskCtx.beginPath();
            maskCtx.arc(transformedPoint.x, transformedPoint.y, brushRadius, 0, Math.PI * 2);
            maskCtx.fill();
          }

          currentDistance += step;
        }
      }
      });
    }

    // Apply mask to text (only if mask was drawn)
    if (shouldShowText) {
      offscreenCtx.globalCompositeOperation = 'destination-in';
      offscreenCtx.drawImage(maskCanvas, 0, 0);
    }

      // Draw masked text to main canvas (when playing or animation completed)
      // The context is already scaled to map logical to display, so draw at logical size
      if (shouldShowText) {
        ctx.drawImage(offscreenCanvas, 0, 0, width, height);
      }
      ctx.restore(); // Restore scale transform
    };

    void render();
  }, [text, fontFamily, strokes, characterStrokes, currentTime, isPlaying, easing, strokeDuration, strokeGap, characterGap, speedMultiplier, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}
