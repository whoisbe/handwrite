import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Point } from '../utils/spline';
import { generateCatmullRomSpline, getCumulativeDistances } from '../utils/spline';
import { Stroke } from '../types/stroke';
import { waitForFont, getFontString } from '../utils/fontLoader';
import { BASELINE_OFFSET_RATIO } from '../utils/layout';

interface StrokeEditorCanvasProps {
  text: string;
  fontFamily: string;
  strokes: Stroke[];
  currentStroke: Point[];
  onAddDot: (point: Point) => void;
  onDotClick: (dotIndex: number) => void;
  onUndo: () => void;
  onClear: () => void;
  onCompleteStroke: () => void;
  width?: number;
  height?: number;
}

export default function StrokeEditorCanvas({
  text,
  fontFamily,
  strokes,
  currentStroke,
  onAddDot,
  onDotClick,
  width = 800,
  height = 400
}: StrokeEditorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<Point | null>(null);
  const [hoveredDotIndex, setHoveredDotIndex] = useState<number | null>(null);

  // Setup canvas with proper device pixel ratio - runs once on mount and when dimensions change
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

  // Draw the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = async () => {
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
      // This ensures strokes saved in logical coords render correctly at any display size
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
    
    ctx.restore(); // Restore scale transform
    };

    void draw();
  }, [text, fontFamily, strokes, currentStroke, hoveredPoint, hoveredDotIndex, width, height]);

  // Check if click is near a dot in current stroke
  const findClickedDot = useCallback((x: number, y: number): number | null => {
    const clickRadius = 10;
    for (let i = 0; i < currentStroke.length; i++) {
      const dot = currentStroke[i];
      const distance = Math.sqrt((x - dot.x) ** 2 + (y - dot.y) ** 2);
      if (distance <= clickRadius) {
        return i;
      }
    }
    return null;
  }, [currentStroke]);

  // Handle canvas click
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Transform from display coordinates to logical coordinates (800x400)
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const y = ((e.clientY - rect.top) / rect.height) * height;

    // Check if clicking on an existing dot in current stroke
    const dotIndex = findClickedDot(x, y);
    if (dotIndex !== null) {
      onDotClick(dotIndex);
      return;
    }

    // Otherwise add new dot
    onAddDot({ x, y });
  }, [onAddDot, onDotClick, findClickedDot, width, height]);

  // Handle double click to complete stroke
  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentStroke.length >= 2) {
      onDotClick(0); // Trigger completion
    }
  }, [currentStroke.length, onDotClick]);

  // Handle mouse move for hover preview
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Transform from display coordinates to logical coordinates (800x400)
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const y = ((e.clientY - rect.top) / rect.height) * height;

    // Check if hovering over a dot
    const dotIndex = findClickedDot(x, y);
    setHoveredDotIndex(dotIndex);

    setHoveredPoint({ x, y });
  }, [findClickedDot, width, height]);

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null);
    setHoveredDotIndex(null);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleCanvasClick}
      onDoubleClick={handleDoubleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={hoveredDotIndex !== null ? "cursor-pointer" : "cursor-crosshair"}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}
