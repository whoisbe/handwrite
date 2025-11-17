import { useRef, useEffect, useState, useCallback } from 'react';
import { Point } from '../utils/spline';
import { generateCatmullRomSpline, getCumulativeDistances } from '../utils/spline';
import { Stroke } from '../types/stroke';

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

  // Draw the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw text outline (semi-transparent)
    ctx.save();
    ctx.font = `128px '${fontFamily}', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillText(text || 'A', width / 2, height / 2);
    ctx.restore();

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
      ctx.fillStyle = 'rgba(79, 55, 138, 0.3)';
      ctx.beginPath();
      ctx.arc(hoveredPoint.x, hoveredPoint.y, 8, 0, Math.PI * 2);
      ctx.fill();
    }
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
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on an existing dot in current stroke
    const dotIndex = findClickedDot(x, y);
    if (dotIndex !== null) {
      onDotClick(dotIndex);
      return;
    }

    // Otherwise add new dot
    onAddDot({ x, y });
  }, [onAddDot, onDotClick, findClickedDot]);

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
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if hovering over a dot
    const dotIndex = findClickedDot(x, y);
    setHoveredDotIndex(dotIndex);

    setHoveredPoint({ x, y });
  }, [findClickedDot]);

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null);
    setHoveredDotIndex(null);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={handleCanvasClick}
      onDoubleClick={handleDoubleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={hoveredDotIndex !== null ? "cursor-pointer" : "cursor-crosshair"}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}
