/**
 * Data models for stroke and animation system
 */

import { Point } from '../utils/spline';

export interface Stroke {
  id: string;
  dots: Point[];
  splinePoints: Point[];
  cumulativeDistances: number[];
  order: number;
}

export interface StrokeAnimation {
  strokeId: string;
  startTime: number;
  duration: number;
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

export interface GlyphData {
  char: string;
  fontFamily: string;
  strokes: Stroke[];
  animations: StrokeAnimation[];
}
