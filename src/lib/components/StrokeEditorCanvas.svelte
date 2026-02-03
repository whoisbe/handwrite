<script lang="ts">
  import { onMount } from 'svelte';
  import { generateCatmullRomSpline } from '../utils/spline';
  import { waitForFont, getFontString } from '../utils/fontLoader';
  import { BASELINE_OFFSET_RATIO } from '../utils/layout';
  import type { Point } from '../utils/spline';
  import type { Stroke } from '../types/stroke';

  let {
    text,
    fontFamily,
    strokes,
    currentStroke,
    width = 800,
    height = 400,
    onAddDot,
    onDotClick
  } = $props<{
    text: string;
    fontFamily: string;
    strokes: Stroke[];
    currentStroke: Point[];
    width?: number;
    height?: number;
    onAddDot: (point: Point) => void;
    onDotClick: (index: number) => void;
  }>();

  let canvas: HTMLCanvasElement;
  let hoveredPoint = $state<Point | null>(null);
  let hoveredDotIndex = $state<number | null>(null);

  async function draw() {
    if (!canvas) return;

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
      
    // Clear canvas using display coordinates (after DPR scale)
    ctx.clearRect(0, 0, displayWidth, displayHeight);
      
    // Scale context to map logical coordinates (800x400) to display coordinates
    const scaleX = displayWidth / width;
    const scaleY = displayHeight / height;
    ctx.save();
    ctx.scale(scaleX, scaleY);

    // Draw text outline (semi-transparent) using normalized font string
    ctx.font = getFontString(fontFamily, 128);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillText(text || 'A', width / 2, height / 2 + (128 * BASELINE_OFFSET_RATIO));

    // Draw completed strokes
    strokes.forEach((stroke, index) => {
      // Draw spline path
      if (stroke.splinePoints.length > 1) {
        ctx.strokeStyle = `hsl(${(index * 60) % 360}, 70%, 50%)`;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(stroke.splinePoints[0].x, stroke.splinePoints[0].y);
        for (let i = 1; i < stroke.splinePoints.length; i++) {
          ctx.lineTo(stroke.splinePoints[i].x, stroke.splinePoints[i].y);
        }
        ctx.stroke();
      }

      // Draw dots
      stroke.dots.forEach((dot, dotIndex) => {
        ctx.fillStyle = `hsl(${(index * 60) % 360}, 70%, 40%)`;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Draw order number
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${dotIndex + 1}`, dot.x, dot.y);
      });
    });

    // Draw current stroke being edited
    if (currentStroke.length > 0) {
      // Draw polyline
      ctx.strokeStyle = 'rgba(79, 55, 138, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
      for (let i = 1; i < currentStroke.length; i++) {
        ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw preview spline if we have enough dots
      if (currentStroke.length >= 2) {
        const previewSpline = generateCatmullRomSpline(currentStroke);
        ctx.strokeStyle = 'rgba(79, 55, 138, 0.8)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(previewSpline[0].x, previewSpline[0].y);
        for (let i = 1; i < previewSpline.length; i++) {
          ctx.lineTo(previewSpline[i].x, previewSpline[i].y);
        }
        ctx.stroke();
      }

      // Draw dots
      currentStroke.forEach((dot, index) => {
        const isHovered = hoveredDotIndex === index;
        ctx.fillStyle = isHovered ? '#6B4BAE' : '#4F378A';
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, isHovered ? 8 : 6, 0, Math.PI * 2);
        ctx.fill();

        // Draw order number
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${index + 1}`, dot.x, dot.y);
      });
    }

    // Draw hover preview (only if not hovering over a dot)
    if (hoveredPoint && hoveredDotIndex === null) {
      // Outer circle (border)
      ctx.fillStyle = 'rgba(79, 55, 138, 0.4)';
      ctx.beginPath();
      ctx.arc(hoveredPoint.x, hoveredPoint.y, 6, 0, Math.PI * 2);
      ctx.fill();
      
      // Inner circle (center)
      ctx.fillStyle = 'rgba(79, 55, 138, 0.8)';
      ctx.beginPath();
      ctx.arc(hoveredPoint.x, hoveredPoint.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }

  // Setup canvas with proper device pixel ratio
  function setupCanvas() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const displayWidth = rect.width || width;
    const displayHeight = rect.height || height;
    
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }
    draw();
  }

  $effect(() => {
    // Re-run draw when dependencies change
    // Svelte 5 tracks dependencies automatically
    // dependencies: text, fontFamily, strokes, currentStroke, hoveredPoint, hoveredDotIndex, width, height
    // But we need to make sure we call draw inside effect
    draw();
  });

  onMount(() => {
    setupCanvas();
    const resizeObserver = new ResizeObserver(() => {
       setupCanvas();
    });
    if (canvas) resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  });

  function findClickedDot(x: number, y: number): number | null {
    const clickRadius = 10;
    for (let i = 0; i < currentStroke.length; i++) {
      const dot = currentStroke[i];
      const distance = Math.sqrt((x - dot.x) ** 2 + (y - dot.y) ** 2);
      if (distance <= clickRadius) {
        return i;
      }
    }
    return null;
  }

  function handleCanvasClick(e: MouseEvent) {
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const y = ((e.clientY - rect.top) / rect.height) * height;

    const dotIndex = findClickedDot(x, y);
    if (dotIndex !== null) {
      onDotClick(dotIndex);
      return;
    }

    onAddDot({ x, y });
  }

  function handleDoubleClick(e: MouseEvent) {
    if (currentStroke.length >= 2) {
      onDotClick(0); // Trigger completion
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const y = ((e.clientY - rect.top) / rect.height) * height;

    const dotIndex = findClickedDot(x, y);
    hoveredDotIndex = dotIndex;
    hoveredPoint = { x, y };
  }

  function handleMouseLeave() {
    hoveredPoint = null;
    hoveredDotIndex = null;
  }
</script>

<canvas
  bind:this={canvas}
  onclick={handleCanvasClick}
  ondblclick={handleDoubleClick}
  onmousemove={handleMouseMove}
  onmouseleave={handleMouseLeave}
  class={hoveredDotIndex !== null ? "cursor-pointer" : "cursor-crosshair"}
  style="display: block; width: 100%; height: 100%;"
></canvas>
