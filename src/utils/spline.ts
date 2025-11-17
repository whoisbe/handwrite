/**
 * Spline generation utilities for smooth path interpolation
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Generate Catmull-Rom spline points from control dots
 * This creates smooth curves that pass through each control point
 */
export function generateCatmullRomSpline(
  dots: Point[],
  segmentsPerDot: number = 20
): Point[] {
  if (dots.length < 2) return dots;
  if (dots.length === 2) return [dots[0], dots[1]];

  const splinePoints: Point[] = [];
  
  // For Catmull-Rom, we need to add ghost points at start and end
  const points = [
    dots[0], // Use first point as ghost
    ...dots,
    dots[dots.length - 1] // Use last point as ghost
  ];

  // Generate spline segments between each pair of interior points
  for (let i = 1; i < points.length - 2; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2];

    for (let t = 0; t < 1; t += 1 / segmentsPerDot) {
      const tt = t * t;
      const ttt = tt * t;

      // Catmull-Rom matrix calculation
      const q0 = -ttt + 2 * tt - t;
      const q1 = 3 * ttt - 5 * tt + 2;
      const q2 = -3 * ttt + 4 * tt + t;
      const q3 = ttt - tt;

      const x = 0.5 * (p0.x * q0 + p1.x * q1 + p2.x * q2 + p3.x * q3);
      const y = 0.5 * (p0.y * q0 + p1.y * q1 + p2.y * q2 + p3.y * q3);

      splinePoints.push({ x, y });
    }
  }

  // Add final point
  splinePoints.push(dots[dots.length - 1]);

  return splinePoints;
}

/**
 * Calculate arc length of a path
 */
export function calculateArcLength(points: Point[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    length += Math.sqrt(dx * dx + dy * dy);
  }
  return length;
}

/**
 * Get cumulative distances along a path for arc-length parameterization
 */
export function getCumulativeDistances(points: Point[]): number[] {
  const distances: number[] = [0];
  let cumulative = 0;
  
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    cumulative += Math.sqrt(dx * dx + dy * dy);
    distances.push(cumulative);
  }
  
  return distances;
}

/**
 * Get point at specific distance along path
 */
export function getPointAtDistance(
  points: Point[],
  distances: number[],
  targetDistance: number
): Point | null {
  if (points.length === 0) return null;
  if (targetDistance <= 0) return points[0];
  
  const totalLength = distances[distances.length - 1];
  if (targetDistance >= totalLength) return points[points.length - 1];

  // Binary search for the segment
  for (let i = 1; i < distances.length; i++) {
    if (distances[i] >= targetDistance) {
      // Interpolate between points[i-1] and points[i]
      const segmentStart = distances[i - 1];
      const segmentEnd = distances[i];
      const segmentLength = segmentEnd - segmentStart;
      
      if (segmentLength === 0) return points[i];
      
      const t = (targetDistance - segmentStart) / segmentLength;
      
      return {
        x: points[i - 1].x + t * (points[i].x - points[i - 1].x),
        y: points[i - 1].y + t * (points[i].y - points[i - 1].y)
      };
    }
  }
  
  return points[points.length - 1];
}
