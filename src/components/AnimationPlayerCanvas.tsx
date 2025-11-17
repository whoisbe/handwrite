import { useRef, useEffect, useState } from 'react';
import { Stroke } from '../types/stroke';
import { getPointAtDistance } from '../utils/spline';
import { easings, EasingType } from '../utils/easing';

interface AnimationPlayerCanvasProps {
  text: string;
  fontFamily: string;
  strokes: Stroke[];
  isPlaying: boolean;
  onPlaybackComplete?: () => void;
  strokeDuration?: number; // Duration per stroke in ms
  strokeGap?: number; // Gap between strokes in ms
  easing?: EasingType;
  width?: number;
  height?: number;
}

export default function AnimationPlayerCanvas({
  text,
  fontFamily,
  strokes,
  isPlaying,
  onPlaybackComplete,
  strokeDuration = 800,
  strokeGap = 150,
  easing = 'easeInOut',
  width = 800,
  height = 400
}: AnimationPlayerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  // Calculate total animation duration
  const totalDuration = strokes.length > 0
    ? strokes.length * (strokeDuration + strokeGap) - strokeGap
    : 0;

  // Reset animation when strokes change
  useEffect(() => {
    setCurrentTime(0);
    startTimeRef.current = null;
  }, [strokes]);

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

  // Render animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background text outline (very faint)
    ctx.save();
    ctx.font = `128px '${fontFamily}', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillText(text || 'A', width / 2, height / 2);
    ctx.restore();

    // Create offscreen canvas for mask-based reveal
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    const offscreenCtx = offscreenCanvas.getContext('2d');
    if (!offscreenCtx) return;

    // Draw full text on offscreen canvas
    offscreenCtx.font = `128px '${fontFamily}', sans-serif`;
    offscreenCtx.textAlign = 'center';
    offscreenCtx.textBaseline = 'middle';
    offscreenCtx.fillStyle = 'rgba(0, 0, 0, 1)';
    offscreenCtx.fillText(text || 'A', width / 2, height / 2);

    // Create mask canvas
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    // Draw reveal mask based on current time
    const easingFn = easings[easing];

    strokes.forEach((stroke, strokeIndex) => {
      const strokeStartTime = strokeIndex * (strokeDuration + strokeGap);
      const strokeEndTime = strokeStartTime + strokeDuration;

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
        const t = localTime / strokeDuration;
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
            maskCtx.fillStyle = 'white';
            maskCtx.beginPath();
            maskCtx.arc(point.x, point.y, brushRadius, 0, Math.PI * 2);
            maskCtx.fill();
          }

          currentDistance += step;
        }
      }
    });

    // Apply mask to text
    offscreenCtx.globalCompositeOperation = 'destination-in';
    offscreenCtx.drawImage(maskCanvas, 0, 0);

    // Draw masked text to main canvas
    ctx.drawImage(offscreenCanvas, 0, 0);

  }, [text, fontFamily, strokes, currentTime, easing, strokeDuration, strokeGap, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}
