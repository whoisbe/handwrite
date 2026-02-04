<script lang="ts">
  import { onMount } from 'svelte';
  import type { Stroke } from '../types/stroke';
  import { getPointAtDistance } from '../utils/spline';
  import { easings, type EasingType } from '../utils/easing';
  import { calculateCharacterLayout, transformPoint, BASELINE_OFFSET_RATIO } from '../utils/layout';
  import { waitForFont, getFontString } from '../utils/fontLoader';

  let {
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
    height = 400,
    invertColors = false,
    textColor = null
  } = $props<{
    text: string;
    fontFamily: string;
    strokes: Stroke[];
    characterStrokes?: Record<number, Stroke[]>;
    isPlaying: boolean;
    onPlaybackComplete?: () => void;
    strokeDuration?: number;
    strokeGap?: number;
    characterGap?: number;
    speedMultiplier?: number;
    easing?: EasingType;
    width?: number;
    height?: number;
    invertColors?: boolean;
    textColor?: string | null;
  }>();

  let canvas: HTMLCanvasElement;
  let currentTime = $state(0);
  let startTime: number | null = null;
  let rafId: number | null = null;

  interface StrokeWithOffset {
    stroke: Stroke;
    charIndex: number;
    xOffset: number;
    yOffset: number;
  }

  let timelineStrokes = $state<StrokeWithOffset[]>([]);

  // Calculate timeline strokes
  $effect(() => {
    const allStrokes: StrokeWithOffset[] = [];
    
    // Check for document presence (client-side)
    if (characterStrokes && Object.keys(characterStrokes).length > 0 && typeof document !== 'undefined') {
      const fontSize = 128;
      const charLayouts = calculateCharacterLayout(text, fontSize, width, height, fontFamily);
      
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

    timelineStrokes = allStrokes.length > 0 
      ? allStrokes 
      : strokes.map(s => ({ stroke: s, charIndex: 0, xOffset: 0, yOffset: 0 }));
  });

  let totalDuration = $derived.by(() => {
    let duration = 0;
    let lastCharIndex = -1;
    
    timelineStrokes.forEach((item, index) => {
      if (item.charIndex !== lastCharIndex && lastCharIndex !== -1) {
        duration += characterGap / speedMultiplier;
      }
      lastCharIndex = item.charIndex;
      
      duration += strokeDuration / speedMultiplier;
      
      if (index < timelineStrokes.length - 1) {
        duration += strokeGap / speedMultiplier;
      }
    });
    return duration;
  });

  $effect(() => {
    // Reset on relevant data change
    const _ = {strokes, characterStrokes, speedMultiplier};
    currentTime = 0;
    startTime = null;
  });

  $effect(() => {
    if (!isPlaying) {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      startTime = null;
      return;
    }

    const animate = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;
      currentTime = elapsed;

      if (elapsed >= totalDuration) {
        currentTime = totalDuration;
        startTime = null;
        if (onPlaybackComplete) {
          onPlaybackComplete();
        }
        return;
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  });

  async function render() {
      if (!canvas) return;
      
      // Wait for font
      await waitForFont(fontFamily, '128px');

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const displayWidth = rect.width || width;
      const displayHeight = rect.height || height;
      
      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
      }
      
      ctx.fillStyle = invertColors ? 'black' : 'white';
      ctx.fillRect(0, 0, displayWidth, displayHeight);
      
      const scaleX = displayWidth / width;
      const scaleY = displayHeight / height;
      ctx.save();
      ctx.scale(scaleX, scaleY);

      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = width;
      offscreenCanvas.height = height;
      const offscreenCtx = offscreenCanvas.getContext('2d');
      if (!offscreenCtx) return;

      offscreenCtx.font = getFontString(fontFamily, 128);
      offscreenCtx.textAlign = 'center';
      offscreenCtx.textBaseline = 'alphabetic';
      if (textColor) {
        offscreenCtx.fillStyle = textColor;
      } else {
        offscreenCtx.fillStyle = invertColors ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)';
      }
      offscreenCtx.fillText(text || 'A', width / 2, height / 2 + (128 * BASELINE_OFFSET_RATIO));

      const animationCompleted = currentTime >= totalDuration && totalDuration > 0;
      const shouldShowText = isPlaying || animationCompleted;

      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = width;
      maskCanvas.height = height;
      const maskCtx = maskCanvas.getContext('2d');
      if (!maskCtx) return;

      if (shouldShowText) {
        const easingFn = easings[easing];
        let accumulatedTime = 0;
        let previousCharIndex = -1;

        timelineStrokes.forEach((item) => {
          const { stroke, charIndex, xOffset, yOffset } = item;

          if (charIndex !== previousCharIndex && previousCharIndex !== -1) {
            accumulatedTime += characterGap / speedMultiplier;
          }
          previousCharIndex = charIndex;

          const strokeStartTime = accumulatedTime;
          const strokeEndTime = strokeStartTime + strokeDuration / speedMultiplier;
          accumulatedTime = strokeEndTime + strokeGap / speedMultiplier;

          if (currentTime < strokeStartTime) return;

          let progress = 0;
          if (currentTime >= strokeEndTime) {
            progress = 1;
          } else {
            const localTime = currentTime - strokeStartTime;
            const t = localTime / (strokeDuration / speedMultiplier);
            progress = easingFn(t);
          }

          const totalLength = stroke.cumulativeDistances[stroke.cumulativeDistances.length - 1];
          const revealDistance = progress * totalLength;

          const brushRadius = 8;
          let currentDistance = 0;
          const step = 2; 

          for (let i = 1; i < stroke.splinePoints.length; i++) {
            const segmentStart = stroke.cumulativeDistances[i - 1];
            if (segmentStart > revealDistance) break;

            const segmentEnd = stroke.cumulativeDistances[i];
            
            while (currentDistance <= Math.min(revealDistance, segmentEnd)) {
               const point = getPointAtDistance(
                stroke.splinePoints,
                stroke.cumulativeDistances,
                currentDistance
              );

              if (point) {
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

      if (shouldShowText) {
        offscreenCtx.globalCompositeOperation = 'destination-in';
        offscreenCtx.drawImage(maskCanvas, 0, 0);
      }

      if (shouldShowText) {
        ctx.drawImage(offscreenCanvas, 0, 0, width, height);
      }
      ctx.restore();
  }

  $effect(() => {
    // Explicitly depend on state for Svelte 5 reactivity
    const _deps = {
      text,
      fontFamily,
      strokes,
      characterStrokes,
      isPlaying,
      currentTime,
      totalDuration,
      timelineStrokes,
      invertColors,
      textColor,
      width,
      height
    };
    render();
  });

  onMount(() => {
    // Re-render on resize
    const resizeObserver = new ResizeObserver(() => {
      render();
    });
    if (canvas) resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  });
</script>

<canvas
  bind:this={canvas}
  style="display: block; width: 100%; height: 100%;"
></canvas>
